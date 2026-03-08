"""Admin authentication middleware for the detective game."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import HTTPException, Header

from .supabase_client import get_supabase

log = logging.getLogger(__name__)


def require_admin(authorization: Optional[str] = Header(default=None)) -> str:
    """FastAPI dependency that validates the user is an admin.

    Returns the user_id on success. Raises 401/403 on failure.
    """
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    token = parts[1]
    try:
        user_resp = sb.auth.get_user(token)
    except Exception as exc:
        log.warning("Admin token validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired session") from exc

    if user_resp is None or user_resp.user is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = user_resp.user
    metadata = user.user_metadata or {}
    if not metadata.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    return str(user.id)


__all__ = ["require_admin"]
