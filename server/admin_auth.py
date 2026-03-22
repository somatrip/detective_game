"""Admin authentication middleware for the detective game.

NOTE ON AUTH ARCHITECTURE:
The server-side Supabase client uses the service role key, which bypasses RLS.
This means the RLS policies in admin_migration.sql are a defense-in-depth layer
for direct DB access (e.g. Supabase Dashboard, client-side JS), but the primary
auth gate for the admin API is this middleware (`require_admin`). All admin
routes depend on this function to validate the user's JWT and check is_admin.
"""

from __future__ import annotations

import logging

from fastapi import Header, HTTPException

from .auth_routes import _validate_token

log = logging.getLogger(__name__)


def require_admin(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency that validates the user is an admin.

    Returns the user_id on success. Raises 401/403 on failure.
    """
    user = _validate_token(authorization)

    # Use app_metadata (server-only) instead of user_metadata (user-writable)
    # to prevent privilege escalation via supabase.auth.updateUser()
    metadata = user.app_metadata or {}
    if not metadata.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")

    return str(user.id)


__all__ = ["require_admin"]
