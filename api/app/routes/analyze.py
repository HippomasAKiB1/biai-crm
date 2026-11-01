from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..schemas import ExtractedEnquiry
from ..llm.client import extract, LLMValidationError
from ..rules import build_enquiry

router = APIRouter()


class AnalyzeExtractRequest(BaseModel):
    message: str  # required, 1..4000 chars
    received_at: datetime | None = None


@router.post("/api/analyze/extract", response_model=ExtractedEnquiry)
def analyze_extract(req: AnalyzeExtractRequest) -> ExtractedEnquiry:
    if not req.message or not req.message.strip():
        raise HTTPException(400, "message is required")
    if len(req.message) > 4000:
        raise HTTPException(400, "message too long (max 4000 chars)")
    try:
        result, _ = extract(req.message)
    except LLMValidationError as e:
        raise HTTPException(502, detail=f"LLM returned invalid JSON after retry: {e}")
    return build_enquiry(result, req.message)
