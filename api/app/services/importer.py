from __future__ import annotations

import csv
import io
import logging
import time
from datetime import datetime
from pathlib import Path
from sqlmodel import Session, select, delete

from ..models import Contact, Enquiry, Activity
from ..llm.client import extract
from ..rules import build_enquiry
from ..phone import normalize_phone
from .save_enquiry import save_enquiry

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
    Reuses save_enquiry for contact dedup, enquiry save, reply generation, and activity logging.
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
        if enq.phone:
            norm = normalize_phone(enq.phone) or enq.phone
        elif csv_phone:
            norm = normalize_phone(csv_phone)
        else:
            norm = None
        enq.phone = norm

        # Save enquiry using shared save_enquiry service
        try:
            enquiry, is_dup = save_enquiry(
                session=session,
                raw_message=raw_message,
                extracted=enq,
                channel=row["channel"].strip(),
                received_at=received_at,
                sender_name=sender_name,
            )
            processed += 1
            # Check if reply was from cache
            if enquiry.reply_draft:
                cached_replies += 1
            print(f"[{idx}/20] id={row_id} {enq.category} {enq.interest} {enquiry.status}", flush=True)
        except Exception as e:
            logger.error(f"Row {row_id} save error: {e}")
            errors += 1
            continue

        # n. Sleep 1.5 seconds between rows (free-tier rate limit safety)
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
