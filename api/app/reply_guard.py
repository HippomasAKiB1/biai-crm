from __future__ import annotations

import re
from pydantic import BaseModel


class GuardVerdict(BaseModel):
    ok: bool
    reason: str | None = None
    sanitized_reply: str | None = None


FORBIDDEN_PATTERNS: list[tuple[re.Pattern, str]] = [
    (
        re.compile(
            r"(৳|\bBDT\b|\bTk\.?\b|\btaka\b|\bTK\b|\$\s?\d|\d+\s?(k|K)\b)",
            re.IGNORECASE,
        ),
        "price",
    ),
    (
        re.compile(
            r"\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b",
            re.IGNORECASE,
        ),
        "date_en",
    ),
    (
        re.compile(r"\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b"),
        "date_num",
    ),
    (
        re.compile(
            r"\b(guaranteed|guarantee|confirmed your (seat|payment)|your seat is (booked|confirmed)|100% (job|placement))\b",
            re.IGNORECASE,
        ),
        "promise",
    ),
    (
        re.compile(
            r"\b(I have sent|we have sent|already sent|payment (has been|is) confirmed)\b",
            re.IGNORECASE,
        ),
        "sent",
    ),
]

SAFE_FALLBACK: dict[str, str] = {
    "sales_lead": "Thanks for reaching out — a team member will confirm the details [CONFIRM: details] and get back to you shortly.",
    "pre_sales_question": "Thanks for reaching out — a team member will confirm the details [CONFIRM: details] and get back to you shortly.",
    "support": "Sorry for the trouble. Could you share your transaction ID and the number you paid from so we can check this [CONFIRM: transaction]?",
    "refund": "I am sorry about this. I have escalated your request to our manager, who will contact you today. Could you confirm the number you enrolled with?",
    "minor": "Thanks for your message. Our team will confirm eligibility and get back to you [CONFIRM: eligibility].",
    "job_seeker": "Thanks for reaching out — our team will get back to you shortly.",
    "other": "Thanks for reaching out — our team will get back to you shortly.",
}


def check(reply: str | None, category: str) -> GuardVerdict:
    if category == "spam":
        return GuardVerdict(ok=False, reason="spam", sanitized_reply=None)
    if not reply or not reply.strip():
        return GuardVerdict(ok=False, reason="empty", sanitized_reply=None)

    # Strip [CONFIRM:[^\]]*] placeholders before matching
    clean = re.sub(r"\[CONFIRM:[^\]]*\]", "", reply)
    # Narrow exemption for KB duration strings "3 day", "3-day", "3 days"
    clean = re.sub(r"\b3[\s-]days?\b", "", clean, flags=re.IGNORECASE)

    for pattern, reason in FORBIDDEN_PATTERNS:
        if pattern.search(clean):
            fallback = SAFE_FALLBACK.get(category, SAFE_FALLBACK["other"])
            return GuardVerdict(ok=False, reason=reason, sanitized_reply=fallback)

    return GuardVerdict(ok=True, reason=None, sanitized_reply=None)


# Module-level assert at import time
for cat, fallback in SAFE_FALLBACK.items():
    verdict = check(fallback, cat)
    assert verdict.ok, f"SAFE_FALLBACK for {cat} triggered guard: {verdict.reason}"
