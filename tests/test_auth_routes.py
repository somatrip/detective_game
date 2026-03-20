"""Unit tests for auth and game-state routes (server/auth_routes.py)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from server.app import app


@pytest.fixture()
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# GET /api/auth/status
# ---------------------------------------------------------------------------


class TestAuthStatus:
    def test_status_configured(self, client):
        with patch("server.auth_routes.is_supabase_configured", return_value=True):
            resp = client.get("/api/auth/status")
        assert resp.status_code == 200
        assert resp.json() == {"supabase_configured": True}

    def test_status_not_configured(self, client):
        with patch("server.auth_routes.is_supabase_configured", return_value=False):
            resp = client.get("/api/auth/status")
        assert resp.status_code == 200
        assert resp.json() == {"supabase_configured": False}


# ---------------------------------------------------------------------------
# POST /api/auth/signup
# ---------------------------------------------------------------------------


class TestSignup:
    def test_signup_success(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/signup",
                json={"email": "new@example.com", "password": "secret123"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "user-123"
        assert data["access_token"] == "access-tok"
        assert data["refresh_token"] == "refresh-tok"

    def test_signup_no_session_returns_empty_tokens(self, client, mock_supabase):
        mock_supabase.auth.sign_up.return_value = MagicMock(
            user=MagicMock(id="user-456", email="new@example.com"),
            session=None,
        )
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/signup",
                json={"email": "new@example.com", "password": "secret123"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == ""
        assert data["refresh_token"] == ""

    def test_signup_no_user_returns_400(self, client, mock_supabase):
        mock_supabase.auth.sign_up.return_value = MagicMock(user=None, session=None)
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/signup",
                json={"email": "new@example.com", "password": "secret123"},
            )
        assert resp.status_code == 400

    def test_signup_exception_returns_400(self, client, mock_supabase):
        mock_supabase.auth.sign_up.side_effect = Exception("boom")
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/signup",
                json={"email": "bad@example.com", "password": "secret123"},
            )
        assert resp.status_code == 400

    def test_signup_supabase_not_configured(self, client, mock_supabase_unconfigured):
        resp = client.post(
            "/api/auth/signup",
            json={"email": "a@b.com", "password": "secret123"},
        )
        assert resp.status_code == 503

    def test_signup_invalid_email(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/signup",
                json={"email": "not-an-email", "password": "secret123"},
            )
        assert resp.status_code == 422

    def test_signup_short_password(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/signup",
                json={"email": "a@b.com", "password": "abc"},
            )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------


class TestLogin:
    def test_login_success(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "secret123"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "user-123"
        assert data["access_token"] == "access-tok"

    def test_login_exception_returns_401(self, client, mock_supabase):
        mock_supabase.auth.sign_in_with_password.side_effect = Exception("bad creds")
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "wrong123"},
            )
        assert resp.status_code == 401

    def test_login_no_user_returns_401(self, client, mock_supabase):
        mock_supabase.auth.sign_in_with_password.return_value = MagicMock(
            user=None, session=None
        )
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/login",
                json={"email": "test@example.com", "password": "secret123"},
            )
        assert resp.status_code == 401

    def test_login_supabase_not_configured(self, client, mock_supabase_unconfigured):
        resp = client.post(
            "/api/auth/login",
            json={"email": "a@b.com", "password": "secret123"},
        )
        assert resp.status_code == 503


# ---------------------------------------------------------------------------
# POST /api/auth/logout
# ---------------------------------------------------------------------------


class TestLogout:
    def test_logout_success(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/logout",
                headers={"Authorization": "Bearer some-token"},
            )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_logout_swallows_exception(self, client, mock_supabase):
        mock_supabase.auth.sign_out.side_effect = Exception("network error")
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/logout",
                headers={"Authorization": "Bearer some-token"},
            )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_logout_missing_header_returns_401(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post("/api/auth/logout")
        assert resp.status_code == 401

    def test_logout_bad_header_returns_401(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/auth/logout",
                headers={"Authorization": "Token abc"},
            )
        assert resp.status_code == 401

    def test_logout_supabase_not_configured(self, client, mock_supabase_unconfigured):
        resp = client.post(
            "/api/auth/logout",
            headers={"Authorization": "Bearer tok"},
        )
        assert resp.status_code == 503


# ---------------------------------------------------------------------------
# GET /api/auth/session
# ---------------------------------------------------------------------------


class TestSession:
    def test_session_success(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get(
                "/api/auth/session",
                headers={"Authorization": "Bearer valid-token"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "user-123"
        assert data["email"] == "test@example.com"

    def test_session_missing_header_returns_401(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get("/api/auth/session")
        assert resp.status_code == 401

    def test_session_invalid_token_returns_401(self, client, mock_supabase):
        mock_supabase.auth.get_user.side_effect = Exception("invalid token")
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get(
                "/api/auth/session",
                headers={"Authorization": "Bearer bad"},
            )
        assert resp.status_code == 401

    def test_session_supabase_not_configured(self, client, mock_supabase_unconfigured):
        resp = client.get(
            "/api/auth/session",
            headers={"Authorization": "Bearer tok"},
        )
        assert resp.status_code == 503


# ---------------------------------------------------------------------------
# POST /api/state/save
# ---------------------------------------------------------------------------


class TestSaveState:
    def test_save_success(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/state/save",
                json={"state": {"chapter": 1}},
                headers={"Authorization": "Bearer valid-token"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["user_id"] == "user-123"
        # Verify upsert was called
        mock_supabase.table.assert_called_with("game_saves")

    def test_save_with_query_token(self, client, mock_supabase):
        """sendBeacon fallback: token in query param instead of header."""
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/state/save?token=qt",
                json={"state": {"chapter": 2}},
            )
        assert resp.status_code == 200

    def test_save_missing_auth_returns_401(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/state/save",
                json={"state": {"chapter": 1}},
            )
        assert resp.status_code == 401

    def test_save_upsert_failure_returns_500(self, client, mock_supabase):
        table_chain = mock_supabase.table.return_value
        table_chain.upsert.return_value = table_chain
        table_chain.execute.side_effect = Exception("db error")
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/state/save",
                json={"state": {"chapter": 1}},
                headers={"Authorization": "Bearer valid-token"},
            )
        assert resp.status_code == 500

    def test_save_supabase_not_configured(self, client, mock_supabase_unconfigured):
        resp = client.post(
            "/api/state/save",
            json={"state": {}},
            headers={"Authorization": "Bearer tok"},
        )
        assert resp.status_code == 503


# ---------------------------------------------------------------------------
# GET /api/state/load
# ---------------------------------------------------------------------------


class TestLoadState:
    def test_load_success(self, client, mock_supabase):
        table_chain = mock_supabase.table.return_value
        table_chain.maybe_single.return_value = table_chain
        table_chain.execute.return_value = MagicMock(
            data={"state": {"chapter": 3}, "updated_at": "2026-01-01T00:00:00Z"}
        )
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get(
                "/api/state/load",
                headers={"Authorization": "Bearer valid-token"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["state"] == {"chapter": 3}
        assert data["updated_at"] == "2026-01-01T00:00:00Z"

    def test_load_no_saved_state(self, client, mock_supabase):
        table_chain = mock_supabase.table.return_value
        table_chain.maybe_single.return_value = table_chain
        table_chain.execute.return_value = MagicMock(data=None)
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get(
                "/api/state/load",
                headers={"Authorization": "Bearer valid-token"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["state"] is None
        assert data["updated_at"] is None

    def test_load_missing_auth_returns_401(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get("/api/state/load")
        assert resp.status_code == 401

    def test_load_db_failure_returns_500(self, client, mock_supabase):
        table_chain = mock_supabase.table.return_value
        table_chain.maybe_single.return_value = table_chain
        table_chain.execute.side_effect = Exception("db error")
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get(
                "/api/state/load",
                headers={"Authorization": "Bearer valid-token"},
            )
        assert resp.status_code == 500

    def test_load_supabase_not_configured(self, client, mock_supabase_unconfigured):
        resp = client.get(
            "/api/state/load",
            headers={"Authorization": "Bearer tok"},
        )
        assert resp.status_code == 503
