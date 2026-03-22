"""Unit tests for server/tracking_routes.py (session, discovery, accusation, chat)."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from server.tracking_routes import ChatEventData, log_chat_event, router

# Build a minimal app that only includes the tracking router.
_app = FastAPI()
_app.include_router(router)


@pytest.fixture()
def client():
    return TestClient(_app, raise_server_exceptions=False)


PATCH_TARGET = "server.tracking_routes.safe_insert"


# ── POST /api/track/session ─────────────────────────────────────────────


class TestTrackSession:
    def test_returns_ok(self, client):
        with patch(PATCH_TARGET) as mock:
            resp = client.post(
                "/api/track/session",
                json={"session_id": "s1", "language": "fr"},
            )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}
        mock.assert_called_once_with(
            "game_sessions",
            {"session_id": "s1", "language": "fr"},
        )

    def test_default_language(self, client):
        with patch(PATCH_TARGET) as mock:
            resp = client.post(
                "/api/track/session",
                json={"session_id": "s2"},
            )
        assert resp.status_code == 200
        mock.assert_called_once_with(
            "game_sessions",
            {"session_id": "s2", "language": "en"},
        )


# ── POST /api/track/discovery ───────────────────────────────────────────


class TestTrackDiscovery:
    def test_with_npc(self, client):
        with patch(PATCH_TARGET) as mock:
            resp = client.post(
                "/api/track/discovery",
                json={"session_id": "s1", "evidence_id": "e1", "npc_id": "npc1"},
            )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}
        mock.assert_called_once_with(
            "discovery_events",
            {"session_id": "s1", "evidence_id": "e1", "npc_id": "npc1"},
        )

    def test_without_npc(self, client):
        with patch(PATCH_TARGET) as mock:
            resp = client.post(
                "/api/track/discovery",
                json={"session_id": "s1", "evidence_id": "e2"},
            )
        assert resp.status_code == 200
        mock.assert_called_once_with(
            "discovery_events",
            {"session_id": "s1", "evidence_id": "e2", "npc_id": None},
        )


# ── POST /api/track/accusation ──────────────────────────────────────────


class TestTrackAccusation:
    def test_full_fields(self, client):
        with patch(PATCH_TARGET) as mock:
            resp = client.post(
                "/api/track/accusation",
                json={
                    "session_id": "s1",
                    "target_npc_id": "npc3",
                    "correct": True,
                    "evidence_count": 5,
                    "interview_count": 3,
                },
            )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}
        mock.assert_called_once_with(
            "accusation_events",
            {
                "session_id": "s1",
                "target_npc_id": "npc3",
                "correct": True,
                "evidence_count": 5,
                "interview_count": 3,
            },
        )

    def test_minimal_fields_use_defaults(self, client):
        with patch(PATCH_TARGET) as mock:
            resp = client.post(
                "/api/track/accusation",
                json={
                    "session_id": "s1",
                    "target_npc_id": "npc2",
                    "correct": False,
                },
            )
        assert resp.status_code == 200
        mock.assert_called_once_with(
            "accusation_events",
            {
                "session_id": "s1",
                "target_npc_id": "npc2",
                "correct": False,
                "evidence_count": 0,
                "interview_count": 0,
            },
        )


# ── log_chat_event (non-route function) ─────────────────────────────────


class TestLogChatEvent:
    def test_inserts_with_all_fields(self):
        with patch(PATCH_TARGET) as mock:
            log_chat_event(ChatEventData(
                session_id="s1",
                npc_id="npc1",
                player_message="hello",
                npc_reply="hi there",
                tactic_type="friendly",
                evidence_strength="strong",
                pressure=3,
                rapport=5,
                pressure_band="medium",
                rapport_band="high",
                expression="smile",
                evidence_ids=["e1", "e2"],
            ))
        mock.assert_called_once_with(
            "chat_events",
            {
                "session_id": "s1",
                "npc_id": "npc1",
                "player_message": "hello",
                "npc_reply": "hi there",
                "tactic_type": "friendly",
                "evidence_strength": "strong",
                "pressure": 3,
                "rapport": 5,
                "pressure_band": "medium",
                "rapport_band": "high",
                "expression": "smile",
                "evidence_ids": ["e1", "e2"],
            },
        )

    def test_defaults_produce_none_and_empty_list(self):
        with patch(PATCH_TARGET) as mock:
            log_chat_event(ChatEventData(
                session_id="s1",
                npc_id="npc1",
                player_message="hey",
                npc_reply="yo",
            ))
        mock.assert_called_once_with(
            "chat_events",
            {
                "session_id": "s1",
                "npc_id": "npc1",
                "player_message": "hey",
                "npc_reply": "yo",
                "tactic_type": None,
                "evidence_strength": None,
                "pressure": None,
                "rapport": None,
                "pressure_band": None,
                "rapport_band": None,
                "expression": None,
                "evidence_ids": [],
            },
        )
