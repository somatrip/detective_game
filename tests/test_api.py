"""Integration tests for API endpoints using the local LLM stub."""

import os

# Force local provider for testing (no API keys needed)
os.environ["ECHO_LLM_PROVIDER"] = "local"

import pytest
from fastapi.testclient import TestClient

from server.app import app


@pytest.fixture(scope="module")
def api_client():
    """Create a TestClient with lifespan so case data is loaded at startup."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestHealthEndpoint:
    def test_health_returns_status(self, api_client):
        resp = api_client.get("/health")
        assert resp.status_code in (200, 503)
        data = resp.json()
        assert "status" in data
        assert "llm_provider" in data

    def test_health_shows_provider(self, api_client):
        resp = api_client.get("/health")
        assert resp.json()["llm_provider"] == "local"


class TestNpcsEndpoint:
    def test_npcs_returns_data(self, api_client):
        resp = api_client.get("/api/npcs")
        assert resp.status_code == 200
        data = resp.json()
        assert "npcs" in data
        assert isinstance(data["npcs"], list)
        assert len(data["npcs"]) > 0

    def test_npcs_have_required_fields(self, api_client):
        resp = api_client.get("/api/npcs")
        data = resp.json()
        npc = data["npcs"][0]
        assert "npc_id" in npc
        assert "display_name" in npc


class TestChatEndpoint:
    def test_chat_with_local_provider(self, api_client):
        # Get a valid NPC ID from the registry
        npcs = api_client.get("/api/npcs").json()["npcs"]
        npc_id = npcs[0]["npc_id"]

        resp = api_client.post("/api/chat", json={
            "npc_id": npc_id,
            "message": "Hello",
            "history": [],
            "language": "en",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data
        assert data["npc_id"] == npc_id

    def test_chat_rejects_unknown_npc(self, api_client):
        resp = api_client.post("/api/chat", json={
            "npc_id": "nonexistent_npc_99999",
            "message": "Hello",
            "history": [],
            "language": "en",
        })
        assert resp.status_code == 404

    def test_chat_rejects_empty_message(self, api_client):
        npcs = api_client.get("/api/npcs").json()["npcs"]
        npc_id = npcs[0]["npc_id"]

        resp = api_client.post("/api/chat", json={
            "npc_id": npc_id,
            "message": "",
            "history": [],
            "language": "en",
        })
        assert resp.status_code == 422  # Pydantic validation error


class TestStringboardEndpoints:
    def test_load_empty_stringboard(self, api_client):
        resp = api_client.get("/api/state/stringboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "cardPositions" in data
        assert "links" in data

    def test_save_and_load_stringboard(self, api_client):
        state = {
            "cardPositions": {"npc1": {"x": 100, "y": 200}},
            "links": [{"from": "npc1", "to": "npc2"}],
        }
        resp = api_client.post("/api/state/stringboard", json=state)
        assert resp.status_code == 200

        resp = api_client.get("/api/state/stringboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "cardPositions" in data
        assert data["cardPositions"]["npc1"]["x"] == 100
