"""Supabase client singleton for the detective game backend."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

log = logging.getLogger(__name__)

# Lazy import so the server still starts when supabase is not installed
_supabase_available = True
try:
    from supabase import create_client, Client as SupabaseClient
except ImportError:
    _supabase_available = False
    SupabaseClient = None  # type: ignore[misc]

from .config import settings


@lru_cache
def get_supabase() -> Optional["SupabaseClient"]:
    """Return a cached Supabase client, or None if not configured."""
    if not _supabase_available:
        log.warning("supabase-py is not installed — Supabase features disabled.")
        return None
    if not settings.supabase_url or not settings.supabase_key:
        log.warning("SUPABASE_URL or SUPABASE_KEY not set — Supabase features disabled.")
        return None
    if settings.supabase_key == "YOUR_SUPABASE_KEY_HERE":
        log.warning("SUPABASE_KEY is still the placeholder — Supabase features disabled.")
        return None
    try:
        client = create_client(settings.supabase_url, settings.supabase_key)
        log.info("Supabase client initialised for %s", settings.supabase_url)
        return client
    except Exception as exc:
        log.error("Failed to create Supabase client: %s", exc)
        return None


def is_supabase_configured() -> bool:
    """Return True when Supabase is available and configured."""
    return get_supabase() is not None


__all__ = ["get_supabase", "is_supabase_configured", "SupabaseClient"]
