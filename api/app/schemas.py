from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict
from .models import Contact, Activity


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


class AnalyzeSaveRequest(BaseModel):
    raw_message: str
    channel: str
    sender_name: str | None = None
    extracted: ExtractedEnquiry


class AnalyzeSaveResponse(BaseModel):
    enquiry_id: int
    contact_id: int
    status: str
    is_duplicate: bool


class EnquiryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    contact_id: int
    channel: str
    received_at: datetime
    raw_message: str
    interest: str = "Unknown"
    category: str | None = None
    language: str | None = None
    urgency: str | None = None
    priority: str = "normal"
    status: str = "New"
    summary: str | None = None
    confidence: float | None = None
    needs_review: bool = False
    review_reason: str | None = None
    follow_up_due: datetime | None = None
    reply_draft: str | None = None
    company: str | None = None
    headcount: int | None = None
    created_at: datetime
    updated_at: datetime

    contact_name: str | None = None
    contact_phone: str | None = None
    contact_enquiry_count: int = 1
    days_since_last_touch: int = 0
    is_overdue: bool = False


class EnquiryListResponse(BaseModel):
    items: list[EnquiryResponse]
    total: int


class EnquiryDetailResponse(BaseModel):
    enquiry: EnquiryResponse
    contact: Contact
    activities: list[Activity]

