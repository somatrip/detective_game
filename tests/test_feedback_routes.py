"""Unit tests for feedback routes (server/feedback_routes.py)."""

from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from server.app import app


@pytest.fixture()
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def _patch_supabase(sb):
    """Context manager that makes require_supabase() return *sb*."""
    return patch("server.feedback_routes.require_supabase", return_value=sb)


# ---------------------------------------------------------------------------
# POST /api/feedback  — submit feedback
# ---------------------------------------------------------------------------


class TestSubmitFeedback:
    def test_submit_valid_feedback(self, client, mock_supabase):
        with _patch_supabase(mock_supabase):
            resp = client.post(
                "/api/feedback",
                json={
                    "session_id": "sess-1",
                    "feedback_text": "Great game!",
                    "screenshot_url": "https://example.com/img.png",
                },
            )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}
        mock_supabase.table.assert_called_with("feedback")

    def test_submit_without_screenshot(self, client, mock_supabase):
        with _patch_supabase(mock_supabase):
            resp = client.post(
                "/api/feedback",
                json={"session_id": "sess-2", "feedback_text": "Nice"},
            )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

    def test_feedback_text_too_long(self, client, mock_supabase):
        with _patch_supabase(mock_supabase):
            resp = client.post(
                "/api/feedback",
                json={"session_id": "sess-3", "feedback_text": "x" * 5001},
            )
        assert resp.status_code == 422

    def test_db_error_swallowed(self, client, mock_supabase):
        mock_supabase.table.return_value.insert.return_value.execute.side_effect = (
            RuntimeError("DB down")
        )
        with _patch_supabase(mock_supabase):
            resp = client.post(
                "/api/feedback",
                json={"session_id": "sess-4", "feedback_text": "Still works"},
            )
        assert resp.status_code == 500

    def test_supabase_unavailable(self, client):
        from fastapi import HTTPException

        def _raise():
            raise HTTPException(status_code=503, detail="Supabase not configured")

        with patch("server.feedback_routes.require_supabase", side_effect=_raise):
            resp = client.post(
                "/api/feedback",
                json={"session_id": "sess-5", "feedback_text": "hello"},
            )
        assert resp.status_code == 503


# ---------------------------------------------------------------------------
# POST /api/feedback/upload  — upload screenshot
# ---------------------------------------------------------------------------


class TestUploadScreenshot:
    def test_upload_valid_png(self, client, mock_supabase):
        with _patch_supabase(mock_supabase):
            resp = client.post(
                "/api/feedback/upload",
                files={"file": ("screenshot.png", BytesIO(b"fake-png-data"), "image/png")},
            )
        assert resp.status_code == 200
        assert "url" in resp.json()
        assert resp.json()["url"] == "https://example.com/screenshot.png"

    def test_upload_valid_jpg(self, client, mock_supabase):
        with _patch_supabase(mock_supabase):
            resp = client.post(
                "/api/feedback/upload",
                files={"file": ("photo.jpg", BytesIO(b"fake-jpg"), "image/jpeg")},
            )
        assert resp.status_code == 200
        assert "url" in resp.json()

    def test_upload_invalid_extension(self, client, mock_supabase):
        with _patch_supabase(mock_supabase):
            resp = client.post(
                "/api/feedback/upload",
                files={"file": ("malware.exe", BytesIO(b"bad"), "application/octet-stream")},
            )
        assert resp.status_code == 400
        assert "not allowed" in resp.json()["detail"]

    def test_upload_too_large(self, client, mock_supabase):
        big_content = b"x" * (5 * 1024 * 1024 + 1)
        with _patch_supabase(mock_supabase):
            resp = client.post(
                "/api/feedback/upload",
                files={"file": ("big.png", BytesIO(big_content), "image/png")},
            )
        assert resp.status_code == 413
        assert "too large" in resp.json()["detail"]

    def test_upload_storage_failure(self, client, mock_supabase):
        mock_supabase.storage.from_.return_value.upload.side_effect = RuntimeError(
            "Storage down"
        )
        with _patch_supabase(mock_supabase):
            resp = client.post(
                "/api/feedback/upload",
                files={"file": ("img.png", BytesIO(b"data"), "image/png")},
            )
        assert resp.status_code == 500
        assert "Upload failed" in resp.json()["detail"]

    def test_upload_supabase_unavailable(self, client):
        from fastapi import HTTPException

        def _raise():
            raise HTTPException(status_code=503, detail="Supabase not configured")

        with patch("server.feedback_routes.require_supabase", side_effect=_raise):
            resp = client.post(
                "/api/feedback/upload",
                files={"file": ("img.png", BytesIO(b"data"), "image/png")},
            )
        assert resp.status_code == 503
