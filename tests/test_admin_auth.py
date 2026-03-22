"""Unit tests for server.admin_auth.require_admin."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from server.admin_auth import require_admin


def _make_user(user_id: str = "user-123", is_admin: bool = True):
    """Build a fake Supabase user object."""
    metadata = {"is_admin": True} if is_admin else {}
    return SimpleNamespace(id=user_id, app_metadata=metadata)


def _make_user_resp(user_id: str = "user-123", is_admin: bool = True):
    """Build a fake Supabase get_user response."""
    return SimpleNamespace(user=_make_user(user_id, is_admin))


@patch("server.auth_routes.require_supabase")
class TestRequireAdmin:
    """Tests for require_admin()."""

    def test_valid_admin_token(self, mock_require_sb):
        sb = MagicMock()
        sb.auth.get_user.return_value = _make_user_resp("admin-42", is_admin=True)
        mock_require_sb.return_value = sb

        result = require_admin(authorization="Bearer good-token")
        assert result == "admin-42"
        sb.auth.get_user.assert_called_once_with("good-token")

    def test_non_admin_user_raises_403(self, mock_require_sb):
        sb = MagicMock()
        sb.auth.get_user.return_value = _make_user_resp("user-1", is_admin=False)
        mock_require_sb.return_value = sb

        with pytest.raises(HTTPException) as exc_info:
            require_admin(authorization="Bearer some-token")
        assert exc_info.value.status_code == 403

    def test_missing_authorization_header_raises_401(self, mock_require_sb):
        mock_require_sb.return_value = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            require_admin(authorization=None)
        assert exc_info.value.status_code == 401

    def test_malformed_header_raises_401(self, mock_require_sb):
        mock_require_sb.return_value = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            require_admin(authorization="NotBearer token")
        assert exc_info.value.status_code == 401

    def test_supabase_not_configured_raises_503(self, mock_require_sb):
        mock_require_sb.side_effect = HTTPException(status_code=503, detail="Supabase not configured")

        with pytest.raises(HTTPException) as exc_info:
            require_admin(authorization="Bearer token")
        assert exc_info.value.status_code == 503

    def test_invalid_token_get_user_raises_401(self, mock_require_sb):
        sb = MagicMock()
        sb.auth.get_user.side_effect = Exception("expired")
        mock_require_sb.return_value = sb

        with pytest.raises(HTTPException) as exc_info:
            require_admin(authorization="Bearer bad-token")
        assert exc_info.value.status_code == 401
