"""
Triage categories and deterministic guardrail rules.

The LLM proposes; these rules OVERRIDE it for the highest-risk cases:
spam, threats, refunds and minors. Add or edit keywords here — no other file
needs to change.
"""
from __future__ import annotations

import re
from typing import Literal

Category = Literal[
    "sales_lead",
    "pre_sales_question",
    "support",
    "refund",
    "spam",
    "job_seeker",
    "minor",
    "other",
]

Interest = Literal["Bootcamp", "Fellowship", "Corporate Training", "Unknown"]

# --- Spam ------------------------------------------------------------------
SPAM_URL_PATTERN = re.compile(r"(bit\.ly|tinyurl\.com|t\.me/|https?://\S+)", re.IGNORECASE)
SPAM_MONEY_CLAIM = re.compile(
    r"(earn\s+\$?\d+|make money|free crypto|crypto signals|100% guaranteed|gift card)",
    re.IGNORECASE,
)

# --- Threat / refund -------------------------------------------------------
THREAT_PATTERN = re.compile(
    r"(post (about it|this) on facebook|legal action|sue you|report you|scammer)",
    re.IGNORECASE,
)
REFUND_PATTERN = re.compile(
    r"\b(refund|cancel(?:lation)?|money back|taka ferot)\b",
    re.IGNORECASE,
)

# --- Minor -----------------------------------------------------------------
# Conservative on purpose — "student" alone must not flag an adult.
MINOR_PATTERN = re.compile(
    r"(class\s*\d+|ক্লাস\s*\d+|school student|high school|i am\s+\d{1,2}\s+years old|আমার বয়স\s*\d{1,2})",
    re.IGNORECASE,
)

# --- Job seeker ------------------------------------------------------------
JOB_SEEKER_PATTERN = re.compile(
    r"(looking for a job|apply for (a|an) (job|internship|role)|hiring|vacancy|career)",
    re.IGNORECASE,
)


def is_spam(text: str) -> bool:
    return bool(SPAM_URL_PATTERN.search(text) and SPAM_MONEY_CLAIM.search(text))


def has_threat(text: str) -> bool:
    return bool(THREAT_PATTERN.search(text))


def mentions_refund(text: str) -> bool:
    return bool(REFUND_PATTERN.search(text))


def is_minor(text: str) -> bool:
    return bool(MINOR_PATTERN.search(text))


def is_job_seeker(text: str) -> bool:
    return bool(JOB_SEEKER_PATTERN.search(text))
