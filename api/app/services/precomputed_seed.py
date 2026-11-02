from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from sqlmodel import Session, delete, select

from ..db import create_db_and_tables
from ..models import Activity, Contact, Enquiry

SEED_PATH = Path(__file__).resolve().parents[3] / "data" / "precomputed" / "seed.json"

C_FIELDS = {"id", "name", "phone_normalized", "phone_missing", "first_seen"}
E_FIELDS = {
    "id",
    "contact_id",
    "channel",
    "received_at",
    "raw_message",
    "interest",
    "category",
    "language",
    "urgency",
    "priority",
    "status",
    "summary",
    "confidence",
    "needs_review",
    "review_reason",
    "follow_up_due",
    "reply_draft",
    "company",
    "headcount",
    "created_at",
    "updated_at",
}
A_FIELDS = {"id", "enquiry_id", "type", "from_value", "to_value", "at"}


def _parse_dt(v: str | None) -> datetime | None:
    if v is None:
        return None
    return datetime.fromisoformat(v.replace("Z", ""))


def seed_from_precomputed(session: Session, reset: bool = True) -> dict:
    """
    Loads seed.json and populates DB. Idempotent if reset=True.
    Returns {"seeded": True, "contacts": N, "enquiries": 20, "activity": M}.
    """
    if not SEED_PATH.exists():
        raise FileNotFoundError(f"Seed file not found at {SEED_PATH}")

    create_db_and_tables()

    payload = json.loads(SEED_PATH.read_text(encoding="utf-8"))

    if reset:
        session.exec(delete(Activity))
        session.exec(delete(Enquiry))
        session.exec(delete(Contact))
        session.commit()

    contacts = payload.get("contacts", [])
    for c in contacts:
        kwargs = {}
        for k, v in c.items():
            if k in C_FIELDS:
                if k == "first_seen":
                    kwargs[k] = _parse_dt(v)
                else:
                    kwargs[k] = v
        session.add(Contact(**kwargs))
    session.commit()

    enquiries = payload.get("enquiries", [])
    for e in enquiries:
        kwargs = {}
        for k, v in e.items():
            if k in E_FIELDS:
                if k in ("received_at", "follow_up_due", "created_at", "updated_at"):
                    kwargs[k] = _parse_dt(v)
                else:
                    kwargs[k] = v
        session.add(Enquiry(**kwargs))
    session.commit()

    activity = payload.get("activity", [])
    for a in activity:
        kwargs = {}
        for k, v in a.items():
            if k in A_FIELDS:
                if k == "at":
                    kwargs[k] = _parse_dt(v)
                else:
                    kwargs[k] = v
        session.add(Activity(**kwargs))
    session.commit()

    return {
        "seeded": True,
        "contacts": len(contacts),
        "enquiries": len(enquiries),
        "activity": len(activity),
    }


def is_empty(session: Session) -> bool:
    return session.exec(select(Contact)).first() is None
