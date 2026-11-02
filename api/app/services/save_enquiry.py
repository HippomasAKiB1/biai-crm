from __future__ import annotations

from datetime import datetime, timedelta
import logging
from sqlmodel import Session, select

from ..models import Contact, Enquiry, Activity
from ..schemas import ExtractedEnquiry
from ..llm.client import generate_reply

logger = logging.getLogger("biai.save_enquiry")


def save_enquiry(
    session: Session,
    raw_message: str,
    extracted: ExtractedEnquiry,
    channel: str,
    received_at: datetime | None = None,
    sender_name: str | None = None,
) -> tuple[Enquiry, bool]:
    """
    Returns (enquiry, is_duplicate).
    Handles contact dedup by phone, contact creation if new, enquiry
    creation, follow_up_due, reply draft, and activity logging.
    Shared across sample import and manual UI save.
    """
    if received_at is None:
        received_at = datetime.utcnow()

    # 1. Contact lookup by normalized phone, or approximate by name
    if extracted.phone:
        contact = session.exec(
            select(Contact).where(Contact.phone_normalized == extracted.phone)
        ).first()
    else:
        name = sender_name or extracted.sender_name or "Unknown"
        contact = session.exec(
            select(Contact).where(
                Contact.name == name,
                Contact.phone_missing == True,
            )
        ).first()

    is_duplicate = False
    if contact is None:
        name = sender_name or extracted.sender_name or "Unknown"
        contact = Contact(
            name=name,
            phone_normalized=extracted.phone,
            phone_missing=(extracted.phone is None),
            first_seen=received_at,
        )
        session.add(contact)
        session.commit()
        session.refresh(contact)
    else:
        # Check if contact already has existing enquiries
        prev_enquiries = session.exec(
            select(Enquiry).where(Enquiry.contact_id == contact.id)
        ).all()
        is_duplicate = len(prev_enquiries) > 0
        if is_duplicate:
            for prev in prev_enquiries:
                days_diff = (received_at - prev.received_at).total_seconds() / 86400.0
                if 0 <= days_diff <= 7 and prev.category == extracted.category and prev.interest == extracted.interest:
                    if prev.priority != "urgent":
                        prev.priority = "high"
                        session.add(prev)
            session.commit()

    # 2. Determine status
    if extracted.category in ("spam", "support", "refund", "job_seeker"):
        status = "Outside"
    else:
        status = extracted.suggested_status or "New"

    # 3. Determine priority: if duplicate/repeat, force high (unless urgent)
    if is_duplicate:
        priority = "high" if extracted.priority != "urgent" else "urgent"
    else:
        priority = extracted.priority

    # 4. follow_up_due
    follow_up_due = (
        received_at + timedelta(hours=2)
        if priority == "urgent"
        else received_at + timedelta(hours=24)
    )

    # 5. Create Enquiry
    enquiry = Enquiry(
        contact_id=contact.id,
        channel=channel,
        received_at=received_at,
        raw_message=raw_message,
        interest=extracted.interest,
        category=extracted.category,
        language=extracted.language,
        urgency=extracted.urgency,
        priority=priority,
        status=status,
        summary=extracted.summary,
        confidence=extracted.confidence,
        needs_review=extracted.needs_human_review,
        review_reason=extracted.review_reason,
        follow_up_due=follow_up_due,
        company=extracted.company,
        headcount=extracted.headcount,
    )
    session.add(enquiry)
    session.commit()
    session.refresh(enquiry)

    # 6. Generate reply if status != "Outside" and not already provided
    if status != "Outside":
        if extracted.suggested_reply:
            enquiry.reply_draft = extracted.suggested_reply
            session.add(enquiry)
            session.commit()
        else:
            try:
                reply, _ = generate_reply(raw_message, extracted)
                if reply:
                    enquiry.reply_draft = reply
                    session.add(enquiry)
                    session.commit()
            except Exception as e:
                logger.warning("Failed to generate reply for enquiry %s: %s", enquiry.id, e)

    # 7. Create Activity(type="created", to_value=status)
    activity = Activity(
        enquiry_id=enquiry.id,
        type="created",
        from_value=None,
        to_value=status,
        at=received_at,
    )
    session.add(activity)
    session.commit()

    return enquiry, is_duplicate

