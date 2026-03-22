"""Tests for Supabase client and helper utilities."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from server.supabase_client import get_supabase, is_supabase_configured
from server.supabase_helpers import require_supabase, safe_insert


class TestGetSupabase:
    """Tests for the get_supabase singleton."""

    def test_returns_none_when_not_configured(self):
        """get_supabase returns None when URL/key are missing."""
        # lru_cache means we need to clear it between tests
        get_supabase.cache_clear()
        with patch("server.supabase_client.settings") as mock_settings:
            mock_settings.supabase_url = ""
            mock_settings.supabase_key = ""
            with patch("server.supabase_client._supabase_available", True):
                result = get_supabase()
        get_supabase.cache_clear()
        assert result is None

    def test_returns_none_with_placeholder_key(self):
        """get_supabase returns None when key is the placeholder."""
        get_supabase.cache_clear()
        with patch("server.supabase_client.settings") as mock_settings:
            mock_settings.supabase_url = "https://example.supabase.co"
            mock_settings.supabase_key = "YOUR_SUPABASE_KEY_HERE"
            with patch("server.supabase_client._supabase_available", True):
                result = get_supabase()
        get_supabase.cache_clear()
        assert result is None

    def test_returns_none_when_library_unavailable(self):
        """get_supabase returns None when supabase-py is not installed."""
        get_supabase.cache_clear()
        with patch("server.supabase_client._supabase_available", False):
            result = get_supabase()
        get_supabase.cache_clear()
        assert result is None


class TestIsSupabaseConfigured:
    """Tests for is_supabase_configured."""

    def test_false_when_not_configured(self):
        with patch("server.supabase_client.get_supabase", return_value=None):
            assert is_supabase_configured() is False

    def test_true_when_configured(self):
        with patch("server.supabase_client.get_supabase", return_value=MagicMock()):
            assert is_supabase_configured() is True


class TestRequireSupabase:
    """Tests for require_supabase helper."""

    def test_raises_503_when_not_configured(self):
        with patch("server.supabase_helpers.get_supabase", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                require_supabase()
            assert exc_info.value.status_code == 503

    def test_returns_client_when_configured(self):
        mock_client = MagicMock()
        with patch("server.supabase_helpers.get_supabase", return_value=mock_client):
            result = require_supabase()
        assert result is mock_client


class TestSafeInsert:
    """Tests for safe_insert helper."""

    def test_noop_when_supabase_not_configured(self):
        with patch("server.supabase_helpers.get_supabase", return_value=None):
            # Should not raise
            safe_insert("test_table", {"key": "value"})

    def test_inserts_row(self):
        mock_client = MagicMock()
        with patch("server.supabase_helpers.get_supabase", return_value=mock_client):
            safe_insert("analytics", {"event": "test"})
        mock_client.table.assert_called_once_with("analytics")
        mock_client.table("analytics").insert.assert_called_once_with({"event": "test"})

    def test_swallows_exceptions(self):
        mock_client = MagicMock()
        mock_client.table.return_value.insert.return_value.execute.side_effect = RuntimeError("DB down")
        with patch("server.supabase_helpers.get_supabase", return_value=mock_client):
            # Should not raise
            safe_insert("analytics", {"event": "test"})
