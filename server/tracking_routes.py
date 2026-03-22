"""Gameplay tracking endpoints for analytics (no auth required)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from fastapi import APIRouter
from pydantic import BaseModel

from .supabase_helpers import safe_insert

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/track", tags=["tracking"])


# ── Request schemas ──────────────────────────────────────────────────────


class TrackSessionRequest(BaseModel):
    session_id: str
    language: str = "en"


class TrackDiscoveryRequest(BaseModel):
    session_id: str
    evidence_id: str
    npc_id: str | None = None


class TrackAccusationRequest(BaseModel):
    session_id: str
    target_npc_id: str
    correct: bool
    evidence_count: int = 0
    interview_count: int = 0


# ── Endpoints ────────────────────────────────────────────────────────────


@router.post("/session")
async def track_session(body: TrackSessionRequest):
    safe_insert(
        "game_sessions",
        {
            "session_id": body.session_id,
            "language": body.language,
        },
    )
    return {"ok": True}


@router.post("/discovery")
async def track_discovery(body: TrackDiscoveryRequest) -> dict:
    safe_insert(
        "discovery_events",
        {
            "session_id": body.session_id,
            "evidence_id": body.evidence_id,
            "npc_id": body.npc_id,
        },
    )
    return {"ok": True}


@router.post("/accusation")
async def track_accusation(body: TrackAccusationRequest) -> dict:
    safe_insert(
        "accusation_events",
        {
            "session_id": body.session_id,
            "target_npc_id": body.target_npc_id,
            "correct": body.correct,
            "evidence_count": body.evidence_count,
            "interview_count": body.interview_count,
        },
    )
    return {"ok": True}


@dataclass(frozen=True)
class ChatEventData:
    """Grouped parameters for a chat analytics event."""

    session_id: str
    npc_id: str
    player_message: str
    npc_reply: str
    tactic_type: str | None = None
    evidence_strength: str | None = None
    pressure: int | None = None
    rapport: int | None = None
    pressure_band: str | None = None
    rapport_band: str | None = None
    expression: str | None = None
    evidence_ids: list[str] = field(default_factory=list)


def log_chat_event(event: ChatEventData) -> None:
    """Insert a chat_events row. Called from the /api/chat endpoint."""
    safe_insert(
        "chat_events",
        {
            "session_id": event.session_id,
            "npc_id": event.npc_id,
            "player_message": event.player_message,
            "npc_reply": event.npc_reply,
            "tactic_type": event.tactic_type,
            "evidence_strength": event.evidence_strength,
            "pressure": event.pressure,
            "rapport": event.rapport,
            "pressure_band": event.pressure_band,
            "rapport_band": event.rapport_band,
            "expression": event.expression,
            "evidence_ids": event.evidence_ids,
        },
    )


__all__ = ["router", "log_chat_event", "ChatEventData"]
