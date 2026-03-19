"""Shared Supabase helper utilities used across route modules."""

from __future__ import annotations

import logging

from fastapi import HTTPException

from .supabase_client import get_supabase

log = logging.getLogger(__name__)


def require_supabase():
    """Return the Supabase client or raise 503 if not configured."""
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return sb


def safe_insert(table: str, data: dict) -> None:
    """Insert a row into *table*, logging and swallowing any failure.

    Intended for best-effort analytics inserts where a failure should
    never break the caller's response.
    """
    sb = get_supabase()
    if sb is None:
        return
    try:
        sb.table(table).insert(data).execute()
    except Exception as exc:
        log.warning("Failed to insert into %s: %s", table, exc)


__all__ = ["require_supabase", "safe_insert"]
