"""Feedback endpoint – saves user feedback to Supabase (no auth required)."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .supabase_client import get_supabase

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

_MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024  # 5 MB
_ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}


# ── Request schemas ──────────────────────────────────────────────────────


class FeedbackRequest(BaseModel):
    session_id: str
    feedback_text: str = Field(..., max_length=5000)
    screenshot_url: str | None = None


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
        sb.table("feedback").insert(
            {
                "session_id": body.session_id,
                "feedback_text": body.feedback_text,
                "screenshot_url": body.screenshot_url,
            }
        ).execute()
    except Exception as exc:
        log.warning("Failed to save feedback: %s", exc)
    return {"ok": True}


@router.post("/upload")
async def upload_screenshot(file: UploadFile = File(...)):  # noqa: B008
    sb = _get_sb()
    ext = (file.filename or "img.png").rsplit(".", 1)[-1].lower() or "png"
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{ext}' not allowed. Use: {', '.join(sorted(_ALLOWED_EXTENSIONS))}",
        )
    content = await file.read()
    if len(content) > _MAX_SCREENSHOT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Screenshot too large (max {_MAX_SCREENSHOT_BYTES // (1024 * 1024)} MB).",
        )
    filename = f"{uuid.uuid4()}.{ext}"
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
        raise HTTPException(status_code=500, detail="Upload failed") from exc
