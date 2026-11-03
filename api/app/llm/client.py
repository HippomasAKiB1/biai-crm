from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from openai import OpenAI
from ..settings import settings
from ..schemas import ExtractResult
from . import cache
from .. import reply_guard

logger = logging.getLogger("biai.llm")

REPO_ROOT = Path(__file__).resolve().parents[3]
EXTRACT_PROMPT = (REPO_ROOT / "prompts" / "extract.md").read_text(encoding="utf-8")

client = OpenAI(
    base_url=settings.llm_base_url,
    api_key=settings.llm_api_key,
    default_headers={
        "HTTP-Referer": "https://github.com/HippomasAKiB1/biai-crm",
        "X-Title": "BIAI CRM",
    },
)


class LLMValidationError(Exception):
    pass


def _is_rate_limit_error(exc: Exception) -> bool:
    if hasattr(exc, "status_code") and getattr(exc, "status_code") == 429:
        return True
    msg = str(exc).lower()
    return "429" in msg or "rate limit" in msg


def extract(raw_message: str) -> tuple[ExtractResult, str]:
    hit = cache.get("extract", settings.llm_model, EXTRACT_PROMPT, raw_message)
    if hit:
        return ExtractResult.model_validate(hit), "cache"

    messages = [
        {"role": "system", "content": EXTRACT_PROMPT},
        {"role": "user", "content": raw_message},
    ]

    def _call(msgs: list[dict[str, str]]):
        try:
            resp = client.chat.completions.create(
                model=settings.llm_model,
                messages=msgs,
                response_format={"type": "json_object"},
                temperature=0,
                timeout=30.0,
                max_tokens=2000,
            )
            logger.info(
                "llm_call step=%s model_served=%s source=%s",
                "extract",
                getattr(resp, "model", "unknown"),
                "llm",
            )
            return resp
        except Exception as e:
            if _is_rate_limit_error(e):
                logger.warning("Rate limit encountered in extract, sleeping 20s before retry")
                time.sleep(20)
                try:
                    resp = client.chat.completions.create(
                        model=settings.llm_model,
                        messages=msgs,
                        response_format={"type": "json_object"},
                        temperature=0,
                        timeout=30.0,
                        max_tokens=2000,
                    )
                    logger.info(
                        "llm_call step=%s model_served=%s source=%s",
                        "extract",
                        getattr(resp, "model", "unknown"),
                        "llm",
                    )
                    return resp
                except Exception as e2:
                    raise LLMValidationError("rate limited — try again later") from e2
            raise LLMValidationError(f"LLM API request failed: {e}") from e

    response = _call(messages)
    content = response.choices[0].message.content or ""

    try:
        result = ExtractResult.model_validate_json(content)
        result.suggested_reply = None
        cache.put("extract", settings.llm_model, EXTRACT_PROMPT, raw_message, result.model_dump())
        return (result, "llm")
    except Exception:
        retry_messages = list(messages) + [
            {
                "role": "system",
                "content": "Your previous reply was not valid JSON for the schema. Return ONLY a JSON object.",
            }
        ]
        retry_response = _call(retry_messages)
        retry_content = retry_response.choices[0].message.content or ""
        try:
            result = ExtractResult.model_validate_json(retry_content)
            result.suggested_reply = None
            cache.put("extract", settings.llm_model, EXTRACT_PROMPT, raw_message, result.model_dump())
            return (result, "llm")
        except Exception as second_err:
            raise LLMValidationError(
                f"Failed to validate LLM output after retry: {second_err}"
            ) from second_err


REPLY_PROMPT = (REPO_ROOT / "prompts" / "reply.md").read_text(encoding="utf-8")
KB_JSON = (REPO_ROOT / "data" / "knowledge_base.json").read_text(encoding="utf-8")
SUMMARY_PROMPT = (REPO_ROOT / "prompts" / "summary.md").read_text(encoding="utf-8")


class ReplyError(Exception):
    pass


def generate_reply(
    raw_message: str,
    extracted: "ExtractResult",
    force_language: str | None = None,
) -> tuple[str | None, str]:
    """
    Returns (reply, source), where source is 'cache' | 'llm' | 'guard' | 'spam'.
    Raises ReplyError only on provider failure.
    """

    # (a) Hard skip — spam never gets a reply
    if extracted.category == "spam":
        return None, "spam"

    # (b) Resolve effective reply language
    if force_language in ("english", "banglish"):
        effective = force_language
    elif extracted.language == "bangla":
        effective = "banglish"  # PRD: bangla → banglish by default
    else:
        effective = extracted.language

    # (c) Compose the user message — everything prompts/reply.md promises
    # to receive
    user_content = (
        "RAW MESSAGE:\n"
        + raw_message
        + "\n\n"
        + "EXTRACTED:\n"
        + f"- language: {extracted.language}\n"
        + f"- reply_language: {effective}\n"
        + f"- category: {extracted.category}\n"
        + f"- interest: {extracted.interest}\n"
        + f"- company: {extracted.company or 'n/a'}\n"
        + f"- headcount: {extracted.headcount if extracted.headcount is not None else 'n/a'}\n"
        + f"- sender_name: {extracted.sender_name or 'n/a'}\n\n"
        + "KNOWLEDGE BASE:\n"
        + KB_JSON
        + "\n\n"
        + f"Write ONE reply in {effective} per the system prompt. Reply text only."
    )

    # (d) Check cache
    hit = cache.get("reply", settings.llm_model, REPLY_PROMPT, user_content)
    if hit and "reply" in hit:
        return hit["reply"], "cache"

    # (e) Single call with 429 backoff
    try:
        resp = client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": REPLY_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            max_tokens=1500,
            timeout=30.0,
        )
    except Exception as e:
        if _is_rate_limit_error(e):
            logger.warning("Rate limit encountered in reply, sleeping 20s before retry")
            time.sleep(20)
            try:
                resp = client.chat.completions.create(
                    model=settings.llm_model,
                    messages=[
                        {"role": "system", "content": REPLY_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=0.3,
                    max_tokens=1500,
                    timeout=30.0,
                )
            except Exception as e2:
                raise ReplyError("rate limited — try again later") from e2
        else:
            raise ReplyError(f"reply generation failed: {str(e)[:200]}") from e

    logger.info(
        "llm_call step=%s model_served=%s source=%s",
        "reply",
        getattr(resp, "model", "unknown"),
        "llm",
    )

    text = (resp.choices[0].message.content or "").strip()
    if not text:
        raise ReplyError("empty reply from LLM")

    # (f) Put to cache
    cache.put("reply", settings.llm_model, REPLY_PROMPT, user_content, {"reply": text})

    # (g) Reply guard
    verdict = reply_guard.check(text, extracted.category)
    if not verdict.ok:
        logger.warning("reply_guard_blocked reason=%s", verdict.reason)
        return verdict.sanitized_reply, "guard"

    # (h) Return (text, "llm")
    return text, "llm"


def generate_summary(stats: dict) -> tuple[str, str]:
    """
    Returns (summary_text, source) where source is 'cache' or 'llm'.
    Raises ReplyError on failure or empty response.
    """
    user_content = json.dumps(stats, sort_keys=True)
    hit = cache.get("summary", settings.llm_model, SUMMARY_PROMPT, user_content)
    if hit and "summary" in hit:
        return hit["summary"], "cache"

    messages = [
        {"role": "system", "content": SUMMARY_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        resp = client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            temperature=0.4,
            max_tokens=1500,
            timeout=30.0,
            extra_body={"reasoning": {"max_tokens": 0}},
        )
    except Exception as e:
        if _is_rate_limit_error(e):
            logger.warning("Rate limit encountered in summary, sleeping 20s before retry")
            time.sleep(20)
            try:
                resp = client.chat.completions.create(
                    model=settings.llm_model,
                    messages=messages,
                    temperature=0.4,
                    max_tokens=1500,
                    timeout=30.0,
                    extra_body={"reasoning": {"max_tokens": 0}},
                )
            except Exception as e2:
                raise ReplyError("rate limited — try again later") from e2
        else:
            raise ReplyError(f"summary generation failed: {str(e)[:200]}") from e

    logger.info(
        "llm_call step=%s model_served=%s source=%s",
        "summary",
        getattr(resp, "model", "unknown"),
        "llm",
    )

    text = (resp.choices[0].message.content or "").strip()
    if not text:
        raise ReplyError("empty summary from LLM")

    cache.put("summary", settings.llm_model, SUMMARY_PROMPT, user_content, {"summary": text})
    return text, "llm"
