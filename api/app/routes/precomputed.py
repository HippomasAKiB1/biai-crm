from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..db import get_session
from ..models import Contact
from ..services.precomputed_seed import SEED_PATH, seed_from_precomputed

router = APIRouter(tags=["precomputed"])


@router.get("/api/precomputed/status")
def precomputed_status(session: Session = Depends(get_session)) -> dict:
    """Used by the frontend empty-state button to decide visibility."""
    count = session.exec(select(Contact)).all()
    return {"empty": len(count) == 0, "seed_available": SEED_PATH.exists()}


@router.post("/api/import-precomputed")
def import_precomputed(
    reset: bool = True, session: Session = Depends(get_session)
) -> dict:
    try:
        return seed_from_precomputed(session, reset=reset)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
