from __future__ import annotations

from pathlib import Path
from openai import OpenAI
from ..settings import settings
from ..schemas import ExtractResult

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


def extract(raw_message: str) -> tuple[ExtractResult, str]:
    messages = [
        {"role": "system", "content": EXTRACT_PROMPT},
        {"role": "user", "content": raw_message},
    ]

    def _call(msgs: list[dict[str, str]]):
        try:
            return client.chat.completions.create(
                model=settings.llm_model,
                messages=msgs,
                response_format={"type": "json_object"},
                temperature=0,
                timeout=30.0,
                max_tokens=2000,
            )
        except Exception as e:
            raise LLMValidationError(f"LLM API request failed: {e}") from e

    response = _call(messages)
    content = response.choices[0].message.content or ""

    try:
        result = ExtractResult.model_validate_json(content)
        result.suggested_reply = None
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
            return (result, "llm")
        except Exception as second_err:
            raise LLMValidationError(
                f"Failed to validate LLM output after retry: {second_err}"
            ) from second_err


REPLY_PROMPT = (REPO_ROOT / "prompts" / "reply.md").read_text(encoding="utf-8")
KB_JSON = (REPO_ROOT / "data" / "knowledge_base.json").read_text(encoding="utf-8")


class ReplyError(Exception):
    pass


def generate_reply(
    raw_message: str,
    extracted: "ExtractResult",
    force_language: str | None = None,
) -> str | None:
    """
    Returns the reply string, or None if the message must not be replied to
    (spam). Raises ReplyError only on provider failure.
    """

    # (a) Hard skip — spam never gets a reply
    if extracted.category == "spam":
        return None

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

    # (d) Single call — text mode, no response_format
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
        raise ReplyError(f"reply generation failed: {str(e)[:200]}") from e

    text = (resp.choices[0].message.content or "").strip()
    if not text:
        raise ReplyError("empty reply from LLM")
    return text
