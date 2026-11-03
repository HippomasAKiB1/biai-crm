from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from ..db import get_session
from ..llm.client import ReplyError, generate_summary
from ..models import Enquiry
from ..schemas import SummaryResponse
from ..settings import settings

router = APIRouter(tags=["summary"])


@router.post("/api/summary/weekly", response_model=SummaryResponse)
def weekly_summary(session: Session = Depends(get_session)) -> SummaryResponse:
    # 1. Total & Active counts
    total_enquiries = session.exec(select(func.count(Enquiry.id))).one()
    active_leads = session.exec(
        select(func.count(Enquiry.id)).where(Enquiry.status != "Outside")
    ).one()

    # 2. Breakdowns
    status_rows = session.exec(
        select(Enquiry.status, func.count(Enquiry.id)).group_by(Enquiry.status)
    ).all()
    by_status = {row[0]: row[1] for row in status_rows}

    category_rows = session.exec(
        select(Enquiry.category, func.count(Enquiry.id)).group_by(Enquiry.category)
    ).all()
    by_category = {row[0] or "Unknown": row[1] for row in category_rows}

    channel_rows = session.exec(
        select(Enquiry.channel, func.count(Enquiry.id)).group_by(Enquiry.channel)
    ).all()
    by_channel = {row[0]: row[1] for row in channel_rows}

    # 3. Top companies
    company_rows = session.exec(
        select(Enquiry.company, Enquiry.headcount)
        .where(Enquiry.company != None)  # noqa: E711
        .order_by(Enquiry.headcount.desc())
    ).all()
    top_companies = [
        {"name": row[0], "headcount": row[1]} for row in company_rows[:5]
    ]

    # 4. Overdue count (New/Contacted with days_since >= 2)
    demo_date = (
        settings.demo_date.replace(tzinfo=None)
        if settings.demo_date.tzinfo
        else settings.demo_date
    )
    active_enquiries = session.exec(
        select(Enquiry).where(Enquiry.status.in_(["New", "Contacted"]))
    ).all()
    overdue_count = 0
    for e in active_enquiries:
        rec_at = (
            e.received_at.replace(tzinfo=None)
            if e.received_at.tzinfo
            else e.received_at
        )
        if (demo_date - rec_at).days >= 2:
            overdue_count += 1

    stats = {
        "total_enquiries": total_enquiries,
        "active_leads": active_leads,
        "by_status": by_status,
        "by_category": by_category,
        "by_channel": by_channel,
        "top_companies": top_companies,
        "overdue_count": overdue_count,
    }

    try:
        summary_text, source = generate_summary(stats)
    except ReplyError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary generation error: {e}")

    return SummaryResponse(summary=summary_text, stats=stats, source=source)
