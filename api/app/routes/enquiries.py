from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, desc

from ..db import get_session
from ..models import Enquiry, Contact, Activity
from ..schemas import ExtractedEnquiry
from ..services.save_enquiry import save_enquiry

router = APIRouter()


class CreateEnquiryRequest(BaseModel):
    raw_message: str
    channel: str
    received_at: datetime | None = None
    sender_name: str | None = None
    extracted: ExtractedEnquiry


class UpdateEnquiryRequest(BaseModel):
    status: str | None = None
    notes: str | None = None
    reply_draft: str | None = None
    priority: str | None = None
    needs_review: bool | None = None


class EnquiryListResponse(BaseModel):
    items: list[Enquiry]
    total: int


class EnquiryDetailResponse(BaseModel):
    enquiry: Enquiry
    contact: Contact
    activities: list[Activity]


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
        enquiry=enquiry,
        contact=contact,
        activities=activities,
    )


@router.get("/api/enquiries", response_model=EnquiryListResponse)
def list_enquiries(
    status: str | None = Query(default=None),
    category: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    session: Session = Depends(get_session),
) -> EnquiryListResponse:
    query = select(Enquiry)
    if status:
        query = query.where(Enquiry.status == status)
    if category:
        query = query.where(Enquiry.category == category)
    query = query.order_by(desc(Enquiry.received_at)).limit(limit)
    items = session.exec(query).all()

    count_query = select(Enquiry)
    if status:
        count_query = count_query.where(Enquiry.status == status)
    if category:
        count_query = count_query.where(Enquiry.category == category)
    total = len(session.exec(count_query).all())

    return EnquiryListResponse(items=items, total=total)


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
        enquiry=enquiry,
        contact=contact,
        activities=activities,
    )


@router.patch("/api/enquiries/{id}", response_model=Enquiry)
def patch_enquiry(
    id: int,
    req: UpdateEnquiryRequest,
    session: Session = Depends(get_session),
) -> Enquiry:
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
    return enquiry

