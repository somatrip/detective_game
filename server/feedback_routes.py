"""Feedback endpoint – saves user feedback to Supabase (no auth required)."""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from .supabase_client import get_supabase

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


# ── Request schemas ──────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    session_id: str
    feedback_text: str
    screenshot_url: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────

def _get_sb():
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return sb


BUCKET = "feedback-screenshots"


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("")
async def submit_feedback(body: FeedbackRequest):
    sb = _get_sb()
    try:
        sb.table("feedback").insert({
            "session_id": body.session_id,
            "feedback_text": body.feedback_text,
            "screenshot_url": body.screenshot_url,
        }).execute()
    except Exception as exc:
        log.warning("Failed to save feedback: %s", exc)
    return {"ok": True}


@router.post("/upload")
async def upload_screenshot(file: UploadFile = File(...)):
    sb = _get_sb()
    ext = (file.filename or "img.png").rsplit(".", 1)[-1] or "png"
    filename = f"{uuid.uuid4()}.{ext}"
    content = await file.read()
    try:
        sb.storage.from_(BUCKET).upload(
            filename,
            content,
            {"content-type": file.content_type or "image/png"},
        )
        public_url = sb.storage.from_(BUCKET).get_public_url(filename)
        return {"url": public_url}
    except Exception as exc:
        log.warning("Failed to upload screenshot: %s", exc)
        raise HTTPException(status_code=500, detail="Upload failed")
