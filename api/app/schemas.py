from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, ConfigDict


class ExtractResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sender_name: str | None = None
    phone: str | None = None
    channel_guess: Literal["WhatsApp", "Facebook", "Website", "Phone", "Unknown"] = "Unknown"
    interest: Literal["Bootcamp", "Fellowship", "Corporate Training", "Unknown"] = "Unknown"
    category: Literal[
        "sales_lead",
        "pre_sales_question",
        "support",
        "refund",
        "spam",
        "job_seeker",
        "minor",
        "other",
    ] = "other"
    language: Literal["bangla", "banglish", "english"]
    company: str | None = None
    headcount: int | None = None
    urgency: Literal["low", "normal", "high"] = "normal"
    suggested_status: Literal["New", "Contacted", "Interested", "Paid", "Lost"] = "New"
    follow_up_hint: str | None = None
    needs_human_review: bool = False
    review_reason: str | None = None
    confidence: float
    summary: str
    suggested_reply: str | None = None


class ExtractedEnquiry(ExtractResult):
    priority: Literal["low", "normal", "high", "urgent", "none"] = "normal"
