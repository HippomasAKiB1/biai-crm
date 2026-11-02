from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, desc

from ..db import get_session
from ..models import Enquiry, Contact, Activity
from ..schemas import (
    ExtractedEnquiry,
    EnquiryResponse,
    EnquiryListResponse,
    EnquiryDetailResponse,
)
from ..services.save_enquiry import save_enquiry
from ..settings import settings

router = APIRouter()


class CreateEnquiryRequest(BaseModel):
    raw_message: str
    channel: str
    received_at: datetime | None = None
    sender_name: str | None = None
    extracted: ExtractedEnquiry


class UpdateEnquiryRequest(BaseModel):
    status: str | None = None
    category: str | None = None
    notes: str | None = None
    reply_draft: str | None = None
    priority: str | None = None
    needs_review: bool | None = None


def build_enquiry_response(enquiry: Enquiry, contact: Contact | None = None) -> EnquiryResponse:
    demo_date = settings.demo_date.replace(tzinfo=None) if settings.demo_date.tzinfo else settings.demo_date
    rec_at = enquiry.received_at.replace(tzinfo=None) if enquiry.received_at.tzinfo else enquiry.received_at
    days_since = (demo_date - rec_at).days
    is_overdue = days_since >= 2 and enquiry.status in ("New", "Contacted")

    return EnquiryResponse(
        id=enquiry.id,
        contact_id=enquiry.contact_id,
        channel=enquiry.channel,
        received_at=enquiry.received_at,
        raw_message=enquiry.raw_message,
        interest=enquiry.interest,
        category=enquiry.category,
        language=enquiry.language,
        urgency=enquiry.urgency,
        priority=enquiry.priority,
        status=enquiry.status,
        summary=enquiry.summary,
        confidence=enquiry.confidence,
        needs_review=enquiry.needs_review,
        review_reason=enquiry.review_reason,
        follow_up_due=enquiry.follow_up_due,
        reply_draft=enquiry.reply_draft,
        company=enquiry.company,
        headcount=enquiry.headcount,
        created_at=enquiry.created_at,
        updated_at=enquiry.updated_at,
        contact_name=contact.name if contact else None,
        contact_phone=contact.phone_normalized if contact else None,
        days_since_last_touch=days_since,
        is_overdue=is_overdue,
    )


@router.post("/api/enquiries", response_model=EnquiryDetailResponse)
def create_enquiry(
    req: CreateEnquiryRequest,
    session: Session = Depends(get_session),
) -> EnquiryDetailResponse:
    enquiry, _ = save_enquiry(
        session=session,
        raw_message=req.raw_message,
        extracted=req.extracted,
        channel=req.channel,
        received_at=req.received_at,
        sender_name=req.sender_name,
    )
    contact = session.exec(select(Contact).where(Contact.id == enquiry.contact_id)).first()
    activities = session.exec(
        select(Activity).where(Activity.enquiry_id == enquiry.id).order_by(Activity.at.asc())
    ).all()
    return EnquiryDetailResponse(
        enquiry=build_enquiry_response(enquiry, contact),
        contact=contact,
        activities=activities,
    )


@router.get("/api/enquiries", response_model=EnquiryListResponse)
def list_enquiries(
    status: str | None = Query(default=None),
    status_in: str | None = Query(default=None),
    category: str | None = Query(default=None),
    category_in: str | None = Query(default=None),
    interest: str | None = Query(default=None),
    channel: str | None = Query(default=None),
    needs_review: bool | None = Query(default=None),
    exclude_outside: bool = Query(default=False),
    limit: int = Query(default=200, le=500),
    session: Session = Depends(get_session),
) -> EnquiryListResponse:
    query = select(Enquiry)
    if exclude_outside:
        query = query.where(Enquiry.status != "Outside")
    if status:
        query = query.where(Enquiry.status == status)
    if status_in:
        statuses = [s.strip() for s in status_in.split(",") if s.strip()]
        if statuses:
            query = query.where(Enquiry.status.in_(statuses))
    if category:
        query = query.where(Enquiry.category == category)
    if category_in:
        cats = [c.strip() for c in category_in.split(",") if c.strip()]
        if cats:
            query = query.where(Enquiry.category.in_(cats))
    if interest:
        query = query.where(Enquiry.interest == interest)
    if channel:
        query = query.where(Enquiry.channel == channel)
    if needs_review is not None:
        query = query.where(Enquiry.needs_review == needs_review)

    query = query.order_by(desc(Enquiry.received_at)).limit(limit)
    items = session.exec(query).all()

    count_query = select(Enquiry)
    if exclude_outside:
        count_query = count_query.where(Enquiry.status != "Outside")
    if status:
        count_query = count_query.where(Enquiry.status == status)
    if status_in:
        statuses = [s.strip() for s in status_in.split(",") if s.strip()]
        if statuses:
            count_query = count_query.where(Enquiry.status.in_(statuses))
    if category:
        count_query = count_query.where(Enquiry.category == category)
    if category_in:
        cats = [c.strip() for c in category_in.split(",") if c.strip()]
        if cats:
            count_query = count_query.where(Enquiry.category.in_(cats))
    if interest:
        count_query = count_query.where(Enquiry.interest == interest)
    if channel:
        count_query = count_query.where(Enquiry.channel == channel)
    if needs_review is not None:
        count_query = count_query.where(Enquiry.needs_review == needs_review)
    total = len(session.exec(count_query).all())

    contact_ids = {e.contact_id for e in items}
    contacts = {c.id: c for c in session.exec(select(Contact).where(Contact.id.in_(contact_ids))).all()} if contact_ids else {}

    response_items = [build_enquiry_response(e, contacts.get(e.contact_id)) for e in items]
    return EnquiryListResponse(items=response_items, total=total)


@router.get("/api/enquiries/{id}", response_model=EnquiryDetailResponse)
def get_enquiry_detail(
    id: int,
    session: Session = Depends(get_session),
) -> EnquiryDetailResponse:
    enquiry = session.exec(select(Enquiry).where(Enquiry.id == id)).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    contact = session.exec(select(Contact).where(Contact.id == enquiry.contact_id)).first()
    activities = session.exec(
        select(Activity).where(Activity.enquiry_id == enquiry.id).order_by(Activity.at.asc())
    ).all()
    return EnquiryDetailResponse(
        enquiry=build_enquiry_response(enquiry, contact),
        contact=contact,
        activities=activities,
    )


@router.patch("/api/enquiries/{id}", response_model=EnquiryResponse)
def patch_enquiry(
    id: int,
    req: UpdateEnquiryRequest,
    session: Session = Depends(get_session),
) -> EnquiryResponse:
    enquiry = session.exec(select(Enquiry).where(Enquiry.id == id)).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    old_status = enquiry.status
    if req.status is not None and req.status != old_status:
        enquiry.status = req.status
        activity = Activity(
            enquiry_id=enquiry.id,
            type="status_change",
            from_value=old_status,
            to_value=req.status,
            at=datetime.utcnow(),
        )
        session.add(activity)

    if req.category is not None and req.category != enquiry.category:
        old_cat = enquiry.category
        enquiry.category = req.category
        activity = Activity(
            enquiry_id=enquiry.id,
            type="category_change",
            from_value=old_cat,
            to_value=req.category,
            at=datetime.utcnow(),
        )
        session.add(activity)

    if req.notes is not None:
        note_preview = req.notes[:40]
        activity = Activity(
            enquiry_id=enquiry.id,
            type="note",
            from_value=None,
            to_value=note_preview,
            at=datetime.utcnow(),
        )
        session.add(activity)

    if req.reply_draft is not None:
        enquiry.reply_draft = req.reply_draft
        activity = Activity(
            enquiry_id=enquiry.id,
            type="reply_edited",
            from_value=None,
            to_value=req.reply_draft[:40],
            at=datetime.utcnow(),
        )
        session.add(activity)

    if req.priority is not None:
        enquiry.priority = req.priority

    if req.needs_review is not None:
        enquiry.needs_review = req.needs_review

    enquiry.updated_at = datetime.utcnow()
    session.add(enquiry)
    session.commit()
    session.refresh(enquiry)
    contact = session.exec(select(Contact).where(Contact.id == enquiry.contact_id)).first()
    return build_enquiry_response(enquiry, contact)


@router.post("/api/enquiries/{id}/unspam", response_model=EnquiryResponse)
def unspam_enquiry(id: int, session: Session = Depends(get_session)) -> EnquiryResponse:
    e = session.get(Enquiry, id)
    if not e:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if e.category != "spam":
        raise HTTPException(status_code=400, detail="not spam")

    e.category = "other"
    e.status = "New"
    e.priority = "normal"
    e.updated_at = datetime.utcnow()
    session.add(e)
    session.commit()
    session.refresh(e)

    session.add(
        Activity(
            enquiry_id=e.id,
            type="category_change",
            from_value="spam",
            to_value="other",
            at=datetime.utcnow(),
        )
    )
    session.add(
        Activity(
            enquiry_id=e.id,
            type="status_change",
            from_value="Outside",
            to_value="New",
            at=datetime.utcnow(),
        )
    )
    session.commit()
    contact = session.exec(select(Contact).where(Contact.id == e.contact_id)).first()
    return build_enquiry_response(e, contact)



