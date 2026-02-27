"""Authentication and game-state persistence endpoints (Supabase-backed)."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

from .supabase_client import get_supabase, is_supabase_configured

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Request / Response schemas ────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

class AuthResponse(BaseModel):
    user_id: str
    email: str
    access_token: str
    refresh_token: str

class SaveStateRequest(BaseModel):
    state: Dict[str, Any] = Field(..., description="Full game state JSON blob")

class GameStateResponse(BaseModel):
    state: Optional[Dict[str, Any]] = None
    updated_at: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────

def _require_supabase():
    sb = get_supabase()
    if sb is None:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY in .env",
        )
    return sb


def _extract_token(authorization: str | None) -> str:
    """Pull the Bearer token from the Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    return parts[1]


# ── Status endpoint ──────────────────────────────────────────────────────

@router.get("/status")
async def auth_status():
    """Check whether Supabase auth is available."""
    return {"supabase_configured": is_supabase_configured()}


# ── Sign up ──────────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse)
async def signup(body: SignupRequest):
    sb = _require_supabase()
    try:
        result = sb.auth.sign_up({"email": body.email, "password": body.password})
    except Exception as exc:
        log.exception("Signup failed")
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user = result.user
    session = result.session
    if user is None:
        raise HTTPException(status_code=400, detail="Signup failed — no user returned")
    if session is None:
        # Supabase may require email confirmation
        return AuthResponse(
            user_id=str(user.id),
            email=user.email or body.email,
            access_token="",
            refresh_token="",
        )
    return AuthResponse(
        user_id=str(user.id),
        email=user.email or body.email,
        access_token=session.access_token,
        refresh_token=session.refresh_token,
    )


# ── Log in ───────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    sb = _require_supabase()
    try:
        result = sb.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        log.exception("Login failed")
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    user = result.user
    session = result.session
    if user is None or session is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return AuthResponse(
        user_id=str(user.id),
        email=user.email or body.email,
        access_token=session.access_token,
        refresh_token=session.refresh_token,
    )


# ── Refresh ──────────────────────────────────────────────────────────────

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=AuthResponse)
async def refresh(body: RefreshRequest):
    sb = _require_supabase()
    try:
        result = sb.auth._refresh_access_token(body.refresh_token)
    except Exception as exc:
        log.exception("Token refresh failed")
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    user = result.user
    session = result.session
    if user is None or session is None:
        raise HTTPException(status_code=401, detail="Refresh failed")
    return AuthResponse(
        user_id=str(user.id),
        email=user.email or "",
        access_token=session.access_token,
        refresh_token=session.refresh_token,
    )


# ── Log out ──────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(authorization: str | None = Header(default=None)):
    sb = _require_supabase()
    token = _extract_token(authorization)
    try:
        # Sign out on Supabase's side
        sb.auth.sign_out(token)
    except Exception:
        pass  # best-effort
    return {"ok": True}


# ── Validate session (check if token is still valid) ─────────────────────

@router.get("/session")
async def check_session(authorization: str | None = Header(default=None)):
    sb = _require_supabase()
    token = _extract_token(authorization)
    try:
        user = sb.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    if user is None or user.user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return {
        "user_id": str(user.user.id),
        "email": user.user.email,
    }


# ══════════════════════════════════════════════════════════════════════════
# Game State endpoints
# ══════════════════════════════════════════════════════════════════════════

state_router = APIRouter(prefix="/api/state", tags=["state"])


def _get_user_id_from_token(authorization: str | None) -> str:
    """Validate the Bearer token and return the user_id."""
    sb = _require_supabase()
    token = _extract_token(authorization)
    try:
        user_resp = sb.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    if user_resp is None or user_resp.user is None:
        raise HTTPException(status_code=401, detail="Invalid session")
    return str(user_resp.user.id)


@state_router.post("/save")
async def save_state(
    body: SaveStateRequest,
    authorization: str | None = Header(default=None),
):
    """Upsert the user's game state (single save slot per user)."""
    sb = _require_supabase()
    user_id = _get_user_id_from_token(authorization)

    try:
        result = (
            sb.table("game_saves")
            .upsert(
                {"user_id": user_id, "state": body.state},
                on_conflict="user_id",
            )
            .execute()
        )
    except Exception as exc:
        log.exception("Failed to save game state for user %s", user_id)
        raise HTTPException(status_code=500, detail=f"Save failed: {exc}") from exc

    return {"ok": True, "user_id": user_id}


@state_router.get("/load", response_model=GameStateResponse)
async def load_state(authorization: str | None = Header(default=None)):
    """Load the user's saved game state."""
    sb = _require_supabase()
    user_id = _get_user_id_from_token(authorization)

    try:
        result = (
            sb.table("game_saves")
            .select("state, updated_at")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        log.exception("Failed to load game state for user %s", user_id)
        raise HTTPException(status_code=500, detail=f"Load failed: {exc}") from exc

    if result.data is None:
        return GameStateResponse(state=None, updated_at=None)

    return GameStateResponse(
        state=result.data.get("state"),
        updated_at=result.data.get("updated_at"),
    )


@state_router.delete("/delete")
async def delete_state(authorization: str | None = Header(default=None)):
    """Delete the user's saved game state (for restart)."""
    sb = _require_supabase()
    user_id = _get_user_id_from_token(authorization)

    try:
        sb.table("game_saves").delete().eq("user_id", user_id).execute()
    except Exception as exc:
        log.exception("Failed to delete game state for user %s", user_id)
        raise HTTPException(status_code=500, detail=f"Delete failed: {exc}") from exc

    return {"ok": True}


__all__ = ["router", "state_router"]
