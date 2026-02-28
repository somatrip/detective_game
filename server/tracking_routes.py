"""Gameplay tracking endpoints for analytics (no auth required)."""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .supabase_client import get_supabase, is_supabase_configured

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/track", tags=["tracking"])


# ── Request schemas ──────────────────────────────────────────────────────

class TrackSessionRequest(BaseModel):
    session_id: str
    language: str = "en"


class TrackDiscoveryRequest(BaseModel):
    session_id: str
    evidence_id: str
    npc_id: Optional[str] = None


class TrackAccusationRequest(BaseModel):
    session_id: str
    target_npc_id: str
    correct: bool
    evidence_count: int = 0
    interview_count: int = 0


# ── Helpers ──────────────────────────────────────────────────────────────

def _get_sb():
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return sb


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/session")
async def track_session(body: TrackSessionRequest):
    sb = _get_sb()
    try:
        sb.table("game_sessions").insert({
            "session_id": body.session_id,
            "language": body.language,
        }).execute()
    except Exception as exc:
        log.warning("Failed to track session: %s", exc)
    return {"ok": True}


@router.post("/discovery")
async def track_discovery(body: TrackDiscoveryRequest):
    sb = _get_sb()
    try:
        sb.table("discovery_events").insert({
            "session_id": body.session_id,
            "evidence_id": body.evidence_id,
            "npc_id": body.npc_id,
        }).execute()
    except Exception as exc:
        log.warning("Failed to track discovery: %s", exc)
    return {"ok": True}


@router.post("/accusation")
async def track_accusation(body: TrackAccusationRequest):
    sb = _get_sb()
    try:
        sb.table("accusation_events").insert({
            "session_id": body.session_id,
            "target_npc_id": body.target_npc_id,
            "correct": body.correct,
            "evidence_count": body.evidence_count,
            "interview_count": body.interview_count,
        }).execute()
    except Exception as exc:
        log.warning("Failed to track accusation: %s", exc)
    return {"ok": True}


def log_chat_event(
    session_id: str,
    npc_id: str,
    player_message: str,
    npc_reply: str,
    tactic_type: str | None = None,
    evidence_strength: str | None = None,
    pressure: int | None = None,
    rapport: int | None = None,
    pressure_band: str | None = None,
    rapport_band: str | None = None,
    expression: str | None = None,
    evidence_ids: List[str] | None = None,
) -> None:
    """Insert a chat_events row. Called from the /api/chat endpoint."""
    sb = get_supabase()
    if sb is None:
        return
    try:
        sb.table("chat_events").insert({
            "session_id": session_id,
            "npc_id": npc_id,
            "player_message": player_message,
            "npc_reply": npc_reply,
            "tactic_type": tactic_type,
            "evidence_strength": evidence_strength,
            "pressure": pressure,
            "rapport": rapport,
            "pressure_band": pressure_band,
            "rapport_band": rapport_band,
            "expression": expression,
            "evidence_ids": evidence_ids or [],
        }).execute()
    except Exception as exc:
        log.warning("Failed to track chat event: %s", exc)
