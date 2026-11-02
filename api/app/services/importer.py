from __future__ import annotations

import csv
import io
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from sqlmodel import Session, select, delete

from ..models import Contact, Enquiry, Activity
from ..llm.client import extract, generate_reply
from ..rules import build_enquiry
from ..phone import normalize_phone

logger = logging.getLogger("biai.importer")


def delete_all_data(session: Session) -> None:
    session.exec(delete(Activity))
    session.exec(delete(Enquiry))
    session.exec(delete(Contact))
    session.commit()


def import_sample_data(session: Session, reset: bool = True) -> dict:
    """
    Reads data/sample-enquiries.csv, processes every row, saves to DB.
    If reset=True, deletes all Activity, Enquiry, Contact rows first.
    Returns a summary dict.
    """
    if reset:
        delete_all_data(session)

    csv_path = Path(__file__).resolve().parents[3] / "data" / "sample-enquiries.csv"
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    processed = 0
    errors = 0
    cached_extracts = 0
    cached_replies = 0

    for idx, row in enumerate(rows, start=1):
        raw_message = row["message"].strip()
        received_at = datetime.strptime(row["received at"].strip(), "%Y-%m-%d %H:%M")
        csv_phone = (row.get("phone") or "").strip() or None
        sender_name = row["sender name"].strip()
        row_id = row.get("id") or str(idx)

        # d. Extract with LLM wrapper (caching + backoff)
        try:
            extracted, src = extract(raw_message)
            if src == "cache":
                cached_extracts += 1
        except Exception as e:
            logger.error(f"Row {row_id} extract error: {e}")
            errors += 1
            continue

        # e. Rules layer
        enq = build_enquiry(extracted, raw_message)

        # f. Phone merge (CRITICAL):
        # If enq.phone was found in message/llm:
        if enq.phone:
            norm = normalize_phone(enq.phone) or enq.phone
        elif csv_phone:
            norm = normalize_phone(csv_phone)
        else:
            norm = None
        enq.phone = norm

        # g. Dedup — find existing contact by normalized phone or name if phone missing
        if norm:
            contact = session.exec(select(Contact).where(Contact.phone_normalized == norm)).first()
        else:
            contact = session.exec(
                select(Contact).where(
                    Contact.name == sender_name,
                    Contact.phone_missing == True,
                )
            ).first()

        repeat = False
        if contact is None:
            contact = Contact(
                name=sender_name,
                phone_normalized=norm,
                phone_missing=(norm is None),
                first_seen=received_at,
            )
            session.add(contact)
            session.commit()
            session.refresh(contact)
        else:
            # contact exists — check if this contact already has an
            # enquiry in the last 7 days with the same category and interest.
            # If yes, mark repeat=True and raise priority of matching prior enquiries.
            prev_enquiries = session.exec(
                select(Enquiry).where(Enquiry.contact_id == contact.id)
            ).all()
            for prev in prev_enquiries:
                days_diff = (received_at - prev.received_at).total_seconds() / 86400.0
                if 0 <= days_diff <= 7 and prev.category == enq.category and prev.interest == enq.interest:
                    repeat = True
                    if prev.priority != "urgent":
                        prev.priority = "high"
                        session.add(prev)
            session.commit()

        # h. Determine final status:
        if enq.category in ("spam", "support", "refund", "job_seeker"):
            status = "Outside"
        else:
            status = enq.suggested_status  # usually "New"

        # i. Handle priority: if repeat=True, force priority = "high".
        if repeat:
            priority = "high" if enq.priority != "urgent" else "urgent"
        else:
            priority = enq.priority

        # j. Create Enquiry:
        follow_up_due = (
            received_at + timedelta(hours=2)
            if priority == "urgent"
            else received_at + timedelta(hours=24)
        )
        enquiry = Enquiry(
            contact_id=contact.id,
            channel=row["channel"].strip(),
            received_at=received_at,
            raw_message=raw_message,
            interest=enq.interest,
            category=enq.category,
            language=enq.language,
            urgency=enq.urgency,
            priority=priority,
            status=status,
            summary=enq.summary,
            confidence=enq.confidence,
            needs_review=enq.needs_human_review,
            review_reason=enq.review_reason,
            follow_up_due=follow_up_due,
            company=enq.company,
            headcount=enq.headcount,
        )
        session.add(enquiry)
        session.commit()
        session.refresh(enquiry)

        # k. Generate reply — only if status != "Outside":
        if status != "Outside":
            try:
                reply, reply_src = generate_reply(raw_message, enq)
                if reply_src == "cache":
                    cached_replies += 1
                if reply:
                    enquiry.reply_draft = reply
                    session.commit()
            except Exception as e:
                logger.warning(f"Row {row_id} reply error: {e}")

        # l. Create Activity: type="created", to_value=status. Commit.
        activity = Activity(
            enquiry_id=enquiry.id,
            type="created",
            from_value=None,
            to_value=status,
            at=received_at,
        )
        session.add(activity)
        session.commit()

        processed += 1
        # m. Print a one-line progress: "[3/20] id=3 sales_lead Corporate Training New"
        print(f"[{idx}/20] id={row_id} {enq.category} {enq.interest} {status}", flush=True)

        # n. Sleep 1.5 seconds between rows (free-tier rate limit safety).
        time.sleep(1.5)

    total_contacts = len(session.exec(select(Contact)).all())
    total_enquiries = len(session.exec(select(Enquiry)).all())

    return {
        "processed": processed,
        "errors": errors,
        "contacts": total_contacts,
        "enquiries": total_enquiries,
        "cached_extracts": cached_extracts,
        "cached_replies": cached_replies,
    }

