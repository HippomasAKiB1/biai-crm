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
