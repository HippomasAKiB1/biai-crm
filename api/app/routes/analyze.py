from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..schemas import ExtractedEnquiry
from typing import Literal
from ..llm.client import extract, LLMValidationError, generate_reply, ReplyError
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


class AnalyzeReplyRequest(BaseModel):
    message: str
    extracted: ExtractedEnquiry
    force_language: Literal["banglish", "english"] | None = None


class AnalyzeReplyResponse(BaseModel):
    reply: str | None
    effective_language: Literal["banglish", "english"]


@router.post("/api/analyze/reply", response_model=AnalyzeReplyResponse)
def analyze_reply(req: AnalyzeReplyRequest) -> AnalyzeReplyResponse:
    if not req.message.strip():
        raise HTTPException(400, "message is required")
    try:
        reply = generate_reply(
            req.message, req.extracted, force_language=req.force_language
        )
    except ReplyError as e:
        raise HTTPException(502, detail=str(e))

    if req.force_language:
        eff = req.force_language
    elif req.extracted.language == "bangla":
        eff = "banglish"
    else:
        eff = req.extracted.language
    return AnalyzeReplyResponse(reply=reply, effective_language=eff)
