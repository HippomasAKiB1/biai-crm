from __future__ import annotations

from datetime import datetime
from sqlmodel import Field, SQLModel


class Contact(SQLModel, table=True):
    __tablename__ = "contacts"

    id: int | None = Field(default=None, primary_key=True)
    name: str | None = None
    phone_normalized: str | None = Field(default=None, index=True, unique=True)
    # null is allowed and common (missing phone). SQLite treats each
    # NULL as distinct, so many phone-missing contacts coexist.
    phone_missing: bool = False
    first_seen: datetime = Field(default_factory=datetime.utcnow)


class Enquiry(SQLModel, table=True):
    __tablename__ = "enquiries"

    id: int | None = Field(default=None, primary_key=True)
    contact_id: int = Field(foreign_key="contacts.id", index=True)
    channel: str  # raw value from CSV ("WhatsApp", "Facebook Messenger", "Website form", "Facebook comment", "Phone call note")
    received_at: datetime
    raw_message: str
    interest: str = "Unknown"  # Bootcamp | Fellowship | Corporate Training | Unknown
    category: str | None = None  # sales_lead | pre_sales_question | support | refund | spam | job_seeker | minor | other
    language: str | None = None  # bangla | banglish | english
    urgency: str | None = None  # low | normal | high
    priority: str = "normal"  # low | normal | high | urgent | none
    status: str = "New"  # New | Contacted | Interested | Paid | Lost
    summary: str | None = None
    confidence: float | None = None
    needs_review: bool = False
    review_reason: str | None = None
    follow_up_due: datetime | None = None
    reply_draft: str | None = None
    company: str | None = None
    headcount: int | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Activity(SQLModel, table=True):
    __tablename__ = "activity"

    id: int | None = Field(default=None, primary_key=True)
    enquiry_id: int = Field(foreign_key="enquiries.id", index=True)
    type: str  # "created" | "status_change" | "note" | "reply_edited"
    from_value: str | None = None
    to_value: str | None = None
    at: datetime = Field(default_factory=datetime.utcnow)
