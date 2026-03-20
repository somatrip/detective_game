"""Unit tests for admin CRUD routes (server/admin_routes.py)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from server.admin_auth import require_admin
from server.app import app

CASE_ID = "00000000-0000-0000-0000-000000000001"
NPC_ID = "00000000-0000-0000-0000-000000000002"
EVIDENCE_ID = "00000000-0000-0000-0000-000000000003"
DISCOVERY_ID = "00000000-0000-0000-0000-000000000004"
GATE_ID = "00000000-0000-0000-0000-000000000005"
RELEVANCE_ID = "00000000-0000-0000-0000-000000000006"


@pytest.fixture()
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture()
def admin_client(client, mock_supabase):
    """Client with admin auth bypassed and supabase mock patched into admin_routes."""
    # Override the FastAPI Depends(require_admin) to skip real auth
    app.dependency_overrides[require_admin] = lambda: "admin-user-id"
    try:
        with patch("server.admin_routes.require_supabase", return_value=mock_supabase):
            yield client, mock_supabase
    finally:
        app.dependency_overrides.pop(require_admin, None)


# ── Helpers ───────────────────────────────────────────────────────────────


def _set_execute(mock_sb, data):
    """Set the return value for the next .execute() call on the table chain."""
    chain = mock_sb.table.return_value
    chain.execute.return_value = MagicMock(data=data)


def _set_in_(mock_sb):
    """Ensure .in_() is chainable (not in conftest by default)."""
    chain = mock_sb.table.return_value
    chain.in_.return_value = chain


# ── Cases: list ──────────────────────────────────────────────────────────


class TestListCases:
    def test_list_cases_returns_data(self, admin_client):
        client, sb = admin_client
        cases = [{"id": "c1", "title": "Case 1"}, {"id": "c2", "title": "Case 2"}]
        _set_execute(sb, cases)

        resp = client.get("/api/admin/cases")
        assert resp.status_code == 200
        assert resp.json() == cases

    def test_list_cases_with_pagination(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [])

        resp = client.get("/api/admin/cases?limit=10&offset=20")
        assert resp.status_code == 200
        sb.table.assert_called_with("cases")


# ── Cases: get single ────────────────────────────────────────────────────


class TestGetCase:
    def test_get_case_returns_full_bundle(self, admin_client):
        client, sb = admin_client
        _set_in_(sb)

        chain = sb.table.return_value
        chain.execute.return_value = MagicMock(
            data=[{"id": DISCOVERY_ID, "npc_id": NPC_ID}]
        )

        resp = client.get(f"/api/admin/cases/{CASE_ID}")
        assert resp.status_code == 200
        body = resp.json()
        assert "case" in body
        assert "npcs" in body
        assert "evidence" in body
        assert "discoveries" in body
        assert "gates" in body
        assert "locked_secrets" in body
        assert "relevance" in body


# ── Cases: create ────────────────────────────────────────────────────────


class TestCreateCase:
    def test_create_case_success(self, admin_client):
        client, sb = admin_client
        created = {"id": "new-id", "title": "New Case", "slug": "new-case"}
        _set_execute(sb, [created])

        resp = client.post(
            "/api/admin/cases",
            json={"title": "New Case", "slug": "new-case"},
        )
        assert resp.status_code == 200
        assert resp.json()["slug"] == "new-case"

    def test_create_case_missing_title_returns_422(self, admin_client):
        client, _sb = admin_client
        resp = client.post("/api/admin/cases", json={"slug": "no-title"})
        assert resp.status_code == 422

    def test_create_case_missing_slug_returns_422(self, admin_client):
        client, _sb = admin_client
        resp = client.post("/api/admin/cases", json={"title": "No Slug"})
        assert resp.status_code == 422


# ── Cases: update ────────────────────────────────────────────────────────


class TestUpdateCase:
    def test_update_case_success(self, admin_client):
        client, sb = admin_client
        updated = {"id": CASE_ID, "title": "Updated"}
        _set_execute(sb, [updated])

        resp = client.put(
            f"/api/admin/cases/{CASE_ID}",
            json={"title": "Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated"

    def test_update_case_empty_body_returns_400(self, admin_client):
        client, _sb = admin_client
        resp = client.put(f"/api/admin/cases/{CASE_ID}", json={})
        assert resp.status_code == 400
        assert "No fields" in resp.json()["detail"]


# ── Cases: delete ────────────────────────────────────────────────────────


class TestDeleteCase:
    def test_delete_case_without_confirm_returns_400(self, admin_client):
        client, _sb = admin_client
        resp = client.delete(f"/api/admin/cases/{CASE_ID}")
        assert resp.status_code == 400
        assert "confirm=true" in resp.json()["detail"]

    def test_delete_case_with_confirm_succeeds(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [])

        resp = client.delete(f"/api/admin/cases/{CASE_ID}?confirm=true")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


# ── NPCs: create ─────────────────────────────────────────────────────────


class TestCreateNPC:
    def test_create_npc_success(self, admin_client):
        client, sb = admin_client
        npc = {"id": NPC_ID, "npc_slug": "detective", "display_name": "Det. Holmes"}
        _set_execute(sb, [npc])

        resp = client.post(
            f"/api/admin/cases/{CASE_ID}/npcs",
            json={"npc_slug": "detective", "display_name": "Det. Holmes"},
        )
        assert resp.status_code == 200
        assert resp.json()["npc_slug"] == "detective"

    def test_create_npc_missing_slug_returns_422(self, admin_client):
        client, _sb = admin_client
        resp = client.post(
            f"/api/admin/cases/{CASE_ID}/npcs",
            json={"display_name": "No Slug"},
        )
        assert resp.status_code == 422

    def test_create_npc_missing_display_name_returns_422(self, admin_client):
        client, _sb = admin_client
        resp = client.post(
            f"/api/admin/cases/{CASE_ID}/npcs",
            json={"npc_slug": "no-name"},
        )
        assert resp.status_code == 422


# ── NPCs: update / delete ───────────────────────────────────────────────


class TestUpdateNPC:
    def test_update_npc_success(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [{"id": NPC_ID, "display_name": "Updated"}])

        resp = client.put(
            f"/api/admin/npcs/{NPC_ID}",
            json={"display_name": "Updated"},
        )
        assert resp.status_code == 200

    def test_update_npc_empty_body_returns_400(self, admin_client):
        client, _sb = admin_client
        resp = client.put(f"/api/admin/npcs/{NPC_ID}", json={})
        assert resp.status_code == 400


class TestDeleteNPC:
    def test_delete_npc_without_confirm_returns_400(self, admin_client):
        client, _sb = admin_client
        resp = client.delete(f"/api/admin/npcs/{NPC_ID}")
        assert resp.status_code == 400

    def test_delete_npc_with_confirm_succeeds(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [])
        resp = client.delete(f"/api/admin/npcs/{NPC_ID}?confirm=true")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


# ── Evidence: create / update / delete ───────────────────────────────────


class TestCreateEvidence:
    def test_create_evidence_success(self, admin_client):
        client, sb = admin_client
        ev = {"id": EVIDENCE_ID, "evidence_slug": "knife", "label": "Knife"}
        _set_execute(sb, [ev])

        resp = client.post(
            f"/api/admin/cases/{CASE_ID}/evidence",
            json={"evidence_slug": "knife", "label": "Knife"},
        )
        assert resp.status_code == 200
        assert resp.json()["evidence_slug"] == "knife"

    def test_create_evidence_missing_slug_returns_422(self, admin_client):
        client, _sb = admin_client
        resp = client.post(
            f"/api/admin/cases/{CASE_ID}/evidence",
            json={"label": "No slug"},
        )
        assert resp.status_code == 422


class TestUpdateEvidence:
    def test_update_evidence_success(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [{"id": EVIDENCE_ID, "label": "Updated"}])
        resp = client.put(
            f"/api/admin/evidence/{EVIDENCE_ID}",
            json={"label": "Updated"},
        )
        assert resp.status_code == 200

    def test_update_evidence_empty_body_returns_400(self, admin_client):
        client, _sb = admin_client
        resp = client.put(f"/api/admin/evidence/{EVIDENCE_ID}", json={})
        assert resp.status_code == 400


class TestDeleteEvidence:
    def test_delete_evidence_without_confirm_returns_400(self, admin_client):
        client, _sb = admin_client
        resp = client.delete(f"/api/admin/evidence/{EVIDENCE_ID}")
        assert resp.status_code == 400

    def test_delete_evidence_with_confirm_succeeds(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [])
        resp = client.delete(f"/api/admin/evidence/{EVIDENCE_ID}?confirm=true")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


# ── Discoveries: create / update / delete ────────────────────────────────


class TestCreateDiscovery:
    def test_create_discovery_success(self, admin_client):
        client, sb = admin_client
        disc = {
            "id": DISCOVERY_ID,
            "discovery_slug": "clue-1",
            "npc_id": NPC_ID,
            "evidence_id": EVIDENCE_ID,
        }
        _set_execute(sb, [disc])

        resp = client.post(
            f"/api/admin/cases/{CASE_ID}/discoveries",
            json={
                "discovery_slug": "clue-1",
                "npc_id": NPC_ID,
                "evidence_id": EVIDENCE_ID,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["discovery_slug"] == "clue-1"

    def test_create_discovery_missing_fields_returns_422(self, admin_client):
        client, _sb = admin_client
        resp = client.post(
            f"/api/admin/cases/{CASE_ID}/discoveries",
            json={"discovery_slug": "clue-1"},
        )
        assert resp.status_code == 422


class TestDeleteDiscovery:
    def test_delete_discovery_without_confirm_returns_400(self, admin_client):
        client, _sb = admin_client
        resp = client.delete(f"/api/admin/discoveries/{DISCOVERY_ID}")
        assert resp.status_code == 400

    def test_delete_discovery_with_confirm_succeeds(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [])
        resp = client.delete(f"/api/admin/discoveries/{DISCOVERY_ID}?confirm=true")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


# ── Discovery Gates: create / update / delete ────────────────────────────


class TestCreateGate:
    def test_create_gate_success(self, admin_client):
        client, sb = admin_client
        gate = {"id": GATE_ID, "gate_index": 0, "discovery_id": DISCOVERY_ID}
        _set_execute(sb, [gate])

        resp = client.post(
            f"/api/admin/discoveries/{DISCOVERY_ID}/gates",
            json={"gate_index": 0},
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == GATE_ID


class TestUpdateGate:
    def test_update_gate_success(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [{"id": GATE_ID, "min_pressure": 5}])
        resp = client.put(
            f"/api/admin/gates/{GATE_ID}",
            json={"min_pressure": 5},
        )
        assert resp.status_code == 200

    def test_update_gate_empty_body_returns_400(self, admin_client):
        client, _sb = admin_client
        resp = client.put(f"/api/admin/gates/{GATE_ID}", json={})
        assert resp.status_code == 400


class TestDeleteGate:
    def test_delete_gate_succeeds(self, admin_client):
        """Gates do not require ?confirm=true."""
        client, sb = admin_client
        _set_execute(sb, [])
        resp = client.delete(f"/api/admin/gates/{GATE_ID}")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


# ── Locked Secret Descriptions ──────────────────────────────────────────


class TestLockedSecret:
    def test_upsert_locked_secret_success(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [{"discovery_id": DISCOVERY_ID, "description": "secret"}])

        resp = client.put(
            f"/api/admin/discoveries/{DISCOVERY_ID}/locked-secret",
            json={"description": "secret"},
        )
        assert resp.status_code == 200

    def test_delete_locked_secret_succeeds(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [])
        resp = client.delete(
            f"/api/admin/discoveries/{DISCOVERY_ID}/locked-secret"
        )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


# ── NPC Evidence Relevance ──────────────────────────────────────────────


class TestRelevance:
    def test_create_relevance_success(self, admin_client):
        client, sb = admin_client
        rel = {"id": RELEVANCE_ID, "npc_id": NPC_ID, "evidence_id": EVIDENCE_ID}
        _set_execute(sb, [rel])

        resp = client.post(
            "/api/admin/relevance",
            json={"npc_id": NPC_ID, "evidence_id": EVIDENCE_ID},
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == RELEVANCE_ID

    def test_delete_relevance_succeeds(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [])
        resp = client.delete(f"/api/admin/relevance/{RELEVANCE_ID}")
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


# ── Archetypes ──────────────────────────────────────────────────────────


class TestListArchetypes:
    def test_list_archetypes_returns_data(self, admin_client):
        client, sb = admin_client
        archetypes = [{"id": "a1", "name": "Villain", "label": "The Villain"}]
        _set_execute(sb, archetypes)

        resp = client.get("/api/admin/archetypes")
        assert resp.status_code == 200
        assert resp.json() == archetypes

    def test_list_archetypes_with_pagination(self, admin_client):
        client, sb = admin_client
        _set_execute(sb, [])
        resp = client.get("/api/admin/archetypes?limit=5&offset=10")
        assert resp.status_code == 200
        sb.table.assert_called_with("archetypes")


# ── Dependency Graph ────────────────────────────────────────────────────


class TestDependencyGraph:
    def test_dependency_graph_returns_nodes_and_edges(self, admin_client):
        client, sb = admin_client
        _set_in_(sb)

        chain = sb.table.return_value
        # The route calls .execute() multiple times (discoveries, then gates).
        # Since the chain mock is shared, use side_effect to return different
        # data for successive calls.
        discoveries_result = MagicMock(
            data=[
                {
                    "id": DISCOVERY_ID,
                    "discovery_slug": "clue-1",
                    "description": "A clue",
                    "npc_id": NPC_ID,
                    "evidence_id": EVIDENCE_ID,
                    "npcs": {"npc_slug": "det", "display_name": "Detective"},
                }
            ]
        )
        gates_result = MagicMock(data=[])
        chain.execute.side_effect = [discoveries_result, gates_result]

        resp = client.get(f"/api/admin/cases/{CASE_ID}/dependency-graph")
        assert resp.status_code == 200
        body = resp.json()
        assert "nodes" in body
        assert "edges" in body
        assert len(body["nodes"]) == 1
        assert body["nodes"][0]["slug"] == "clue-1"
