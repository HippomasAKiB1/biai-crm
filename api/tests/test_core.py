from datetime import datetime, timedelta
import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session, create_engine, select

from app.phone import normalize_phone
from app.schemas import ExtractedEnquiry
from app.models import Contact, Enquiry
from app.services.save_enquiry import save_enquiry
from app.services.callback_parse import parse_callback_hint
from app.routes.enquiries import build_enquiry_response
from app.settings import settings


@pytest.fixture
def session():
    """In-memory SQLite session with StaticPool."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def test_phone_normalization():
    assert normalize_phone("+8801711000001") == "01711000001"
    assert normalize_phone("01711-000001") == "01711000001"
    assert normalize_phone("123") is None


def test_duplicate_phone_merges_contact(session: Session):
    ext1 = ExtractedEnquiry(
        sender_name="Rafi Ahmed",
        phone="01711000001",
        channel_guess="WhatsApp",
        interest="Bootcamp",
        category="sales_lead",
        language="banglish",
        priority="normal",
        suggested_status="New",
        confidence=0.95,
        summary="First enquiry about bootcamp",
        suggested_reply="Hello Rafi, thanks for reaching out!",
    )
    ext2 = ExtractedEnquiry(
        sender_name="Rafi Ahmed",
        phone="01711000001",
        channel_guess="WhatsApp",
        interest="Bootcamp",
        category="sales_lead",
        language="banglish",
        priority="normal",
        suggested_status="New",
        confidence=0.95,
        summary="Second enquiry asking again",
        suggested_reply="Hello Rafi, checking in again!",
    )

    t1 = datetime(2026, 10, 26, 10, 0, 0)
    t2 = datetime(2026, 10, 26, 14, 0, 0)

    enq1, is_dup1 = save_enquiry(session, "msg 1", ext1, "WhatsApp", received_at=t1)
    assert not is_dup1

    enq2, is_dup2 = save_enquiry(session, "msg 2", ext2, "WhatsApp", received_at=t2)
    assert is_dup2

    contacts = session.exec(select(Contact)).all()
    enquiries = session.exec(select(Enquiry)).all()

    assert len(contacts) == 1
    assert len(enquiries) == 2
    assert enq2.priority == "high"


def test_spam_gets_no_reply(session: Session):
    ext_spam = ExtractedEnquiry(
        sender_name="Promo Bot",
        phone=None,
        channel_guess="WhatsApp",
        interest="Unknown",
        category="spam",
        language="english",
        priority="none",
        suggested_status="New",
        confidence=0.99,
        summary="Commercial advertising",
        suggested_reply=None,
    )

    enquiry, _ = save_enquiry(
        session,
        "Cheap crypto investments click here",
        ext_spam,
        "WhatsApp",
        received_at=datetime(2026, 10, 26, 10, 0, 0),
    )

    assert enquiry.reply_draft is None
    assert enquiry.status == "Outside"


def test_callback_hint_parse():
    t_base = datetime(2026, 10, 26, 11, 0, 0)
    parsed = parse_callback_hint("call tomorrow after 5 PM", t_base)
    assert parsed == datetime(2026, 10, 27, 17, 0, 0)

    no_hint = parse_callback_hint("no callback here", t_base)
    assert no_hint is None


def test_followup_48h_rule(monkeypatch):
    now = datetime(2026, 11, 1, 12, 0, 0)
    monkeypatch.setattr(settings, "demo_date", now)

    t_49h = now - timedelta(hours=49)
    enquiry_49h = Enquiry(
        id=1,
        contact_id=1,
        channel="WhatsApp",
        received_at=t_49h,
        raw_message="Interested in course",
        status="New",
        priority="normal",
    )
    resp_49h = build_enquiry_response(enquiry_49h)
    assert resp_49h.is_overdue is True

    t_47h = now - timedelta(hours=47)
    enquiry_47h = Enquiry(
        id=2,
        contact_id=1,
        channel="WhatsApp",
        received_at=t_47h,
        raw_message="Interested in course",
        status="New",
        priority="normal",
    )
    resp_47h = build_enquiry_response(enquiry_47h)
    assert resp_47h.is_overdue is False
