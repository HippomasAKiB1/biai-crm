from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session
from ..db import get_session
from ..services.importer import import_sample_data, delete_all_data

router = APIRouter()


@router.post("/api/import-sample")
def import_sample(reset: bool = True, session: Session = Depends(get_session)):
    summary = import_sample_data(session, reset=reset)
    return summary


@router.delete("/api/import-sample")
def clear_sample(session: Session = Depends(get_session)):
    delete_all_data(session)
    return {"cleared": True}
