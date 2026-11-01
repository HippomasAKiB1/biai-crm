from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from config.categories import (
    is_spam,
    has_threat,
    mentions_refund,
    is_minor,
    is_job_seeker,
)
from .schemas import ExtractResult, ExtractedEnquiry
from .phone import extract_phone, normalize_phone

INJECTION_PATTERN = re.compile(r"ignore (all |previous |prior )?instructions", re.IGNORECASE)


def apply_rules(result: ExtractResult, raw_message: str) -> ExtractResult:
    res = result.model_copy(deep=True)

    # 1. Threat or refund
    if has_threat(raw_message) or mentions_refund(raw_message):
        res.needs_human_review = True
        addition = "Threat or refund request — escalate."
        res.review_reason = f"{res.review_reason} | {addition}" if res.review_reason else addition
        res.urgency = "high"

    # 2. Spam
    if is_spam(raw_message):
        res.category = "spam"
        res.suggested_status = "Lost"
        res.suggested_reply = None

    # 3. Minor
    if is_minor(raw_message):
        res.category = "minor"
        res.needs_human_review = True
        addition = "Minor signal detected."
        res.review_reason = f"{res.review_reason} | {addition}" if res.review_reason else addition

    # 4. Job seeker
    if is_job_seeker(raw_message):
        res.category = "job_seeker"

    # 5. Injection
    if INJECTION_PATTERN.search(raw_message):
        res.suggested_status = "New"

    return res


def compute_priority(result: ExtractResult, raw_message: str = "") -> str:
    # 1. spam, job_seeker -> none
    if result.category in {"spam", "job_seeker"}:
        return "none"

    # 2. has_threat or (mentions_refund and urgency=="high") -> urgent
    is_threat = (has_threat(raw_message) if raw_message else False) or (
        bool(result.review_reason and "Threat" in result.review_reason)
    )
    is_refund_urgent = (
        (mentions_refund(raw_message) if raw_message else False)
        or (result.category == "refund")
        or bool(result.review_reason and "refund" in result.review_reason.lower())
    ) and result.urgency == "high"

    if is_threat or is_refund_urgent:
        return "urgent"

    # 3. support, refund -> high
    if result.category in {"support", "refund"}:
        return "high"

    # 4. sales_lead with Corporate Training or headcount >= 20 -> high
    if result.category == "sales_lead" and (
        result.interest == "Corporate Training"
        or (result.headcount is not None and result.headcount >= 20)
    ):
        return "high"

    # 5. sales_lead -> high if confidence < 0.6 else normal
    if result.category == "sales_lead":
        return "high" if result.confidence < 0.6 else "normal"

    # 6. otherwise -> normal
    return "normal"


def build_enquiry(result: ExtractResult, raw_message: str) -> ExtractedEnquiry:
    phone = extract_phone(raw_message)
    if phone:
        result.phone = normalize_phone(phone)
    elif result.phone:
        result.phone = normalize_phone(result.phone)

    ruled = apply_rules(result, raw_message)
    priority = compute_priority(ruled, raw_message)

    data = ruled.model_dump()
    data["priority"] = priority
    return ExtractedEnquiry(**data)
