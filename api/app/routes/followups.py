from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import Enquiry, Contact
from ..schemas import EnquiryResponse
from .enquiries import build_enquiry_response
from ..settings import settings

router = APIRouter()


@router.get("/api/followups")
def get_followups(session: Session = Depends(get_session)) -> dict:
    """
    Returns the Today's follow-up list: all leads with
      status in ("New", "Contacted")
      AND (demo_date - follow_up_due) >= 0   (i.e. due or overdue)
    Sorted by priority (urgent > high > normal > low) then follow_up_due ascending.
    Includes is_overdue boolean (days_since_received >= 2).
    """
    demo_date = (
        settings.demo_date.replace(tzinfo=None)
        if settings.demo_date.tzinfo
        else settings.demo_date
    )

    query = select(Enquiry).where(Enquiry.status.in_(["New", "Contacted"]))
    all_enquiries = session.exec(query).all()

    due_enquiries = []
    for e in all_enquiries:
        if not e.follow_up_due:
            continue
        due_dt = (
            e.follow_up_due.replace(tzinfo=None)
            if e.follow_up_due.tzinfo
            else e.follow_up_due
        )
        if (demo_date - due_dt).total_seconds() >= 0:
            due_enquiries.append((e, due_dt))

    priority_rank = {"urgent": 0, "high": 1, "normal": 2, "low": 3, "none": 4}
    due_enquiries.sort(
        key=lambda item: (
            priority_rank.get((item[0].priority or "").lower(), 4),
            item[1],
        )
    )

    contact_ids = {e[0].contact_id for e in due_enquiries}
    contacts = (
        {
            c.id: c
            for c in session.exec(
                select(Contact).where(Contact.id.in_(contact_ids))
            ).all()
        }
        if contact_ids
        else {}
    )

    items: list[EnquiryResponse] = [
        build_enquiry_response(e[0], contacts.get(e[0].contact_id))
        for e in due_enquiries
    ]

    overdue_count = sum(1 for item in items if item.days_since_last_touch >= 2)
    due_today_count = sum(
        1
        for e, dt in due_enquiries
        if dt.date() == demo_date.date()
    )

    return {
        "items": items,
        "total": len(items),
        "overdue_count": overdue_count,
        "due_today_count": due_today_count,
    }
