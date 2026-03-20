# Test Coverage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ~80-100 unit tests across all untested server modules as a safety net for future refactoring.

**Architecture:** Bottom-up unit tests mocking all external I/O (LLM APIs, Supabase). Shared fixtures in conftest.py. Each test file mirrors a server module.

**Tech Stack:** pytest, unittest.mock, FastAPI TestClient, Pydantic

---

### Task 1: Create conftest.py with shared fixtures

**Files:**
- Create: `tests/conftest.py`

**Step 1: Write the conftest.py**

```python
"""Shared test fixtures — mock Supabase, mock LLM, API client, sample case data."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Force local LLM provider before any server imports
os.environ["ECHO_LLM_PROVIDER"] = "local"
os.environ["ECHO_SUPABASE_URL"] = ""
os.environ["ECHO_SUPABASE_KEY"] = ""


@pytest.fixture()
def mock_supabase():
    """Patch get_supabase to return a MagicMock with chainable table/auth methods."""
    sb = MagicMock()
    # Chainable table interface: sb.table("x").select("*").execute()
    table_chain = MagicMock()
    sb.table.return_value = table_chain
    table_chain.select.return_value = table_chain
    table_chain.insert.return_value = table_chain
    table_chain.update.return_value = table_chain
    table_chain.upsert.return_value = table_chain
    table_chain.delete.return_value = table_chain
    table_chain.eq.return_value = table_chain
    table_chain.limit.return_value = table_chain
    table_chain.range.return_value = table_chain
    table_chain.order.return_value = table_chain
    table_chain.single.return_value = table_chain
    table_chain.execute.return_value = MagicMock(data=[{"id": "test-id"}])

    # Auth interface
    sb.auth = MagicMock()
    sb.auth.sign_up.return_value = MagicMock(
        user=MagicMock(id="user-123", email="test@example.com"),
        session=MagicMock(access_token="access-tok", refresh_token="refresh-tok"),
    )
    sb.auth.sign_in_with_password.return_value = MagicMock(
        user=MagicMock(id="user-123", email="test@example.com"),
        session=MagicMock(access_token="access-tok", refresh_token="refresh-tok"),
    )
    sb.auth.get_user.return_value = MagicMock(
        user=MagicMock(id="user-123", email="test@example.com", app_metadata={"is_admin": True}),
    )
    sb.auth._refresh_access_token.return_value = MagicMock(
        user=MagicMock(id="user-123", email="test@example.com"),
        session=MagicMock(access_token="new-access", refresh_token="new-refresh"),
    )

    # Storage interface
    storage_bucket = MagicMock()
    sb.storage.from_.return_value = storage_bucket
    storage_bucket.upload.return_value = None
    storage_bucket.get_public_url.return_value = "https://example.com/screenshot.png"

    with patch("server.supabase_client.get_supabase", return_value=sb):
        yield sb


@pytest.fixture()
def mock_supabase_unconfigured():
    """Patch get_supabase to return None (Supabase not configured)."""
    with patch("server.supabase_client.get_supabase", return_value=None):
        yield


@pytest.fixture()
def mock_llm_client():
    """Patch the LLM factory to return an AsyncMock."""
    client = AsyncMock()
    client.generate.return_value = "Mock LLM response."
    with patch("server.llm.factory.get_llm_client", return_value=client):
        yield client


@pytest.fixture()
def sample_case_data():
    """Load the real echoes_in_the_atrium case data."""
    from server.cases.echoes_in_the_atrium import case_data
    return case_data
```

**Step 2: Verify existing tests still pass**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/ -v`
Expected: All 40 existing tests PASS.

**Step 3: Commit**

```bash
git add tests/conftest.py
git commit -m "test: add conftest.py with shared fixtures for mock Supabase, LLM, and case data"
```

---

### Task 2: Test schemas.py (pure Pydantic validation)

**Files:**
- Create: `tests/test_schemas.py`

**Step 1: Write the tests**

```python
"""Tests for server/schemas.py — Pydantic model validation."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from server.schemas import (
    ChatRequest,
    ChatResponse,
    ChatTurn,
    SpeakRequest,
    StringboardCardPosition,
    StringboardLink,
    StringboardState,
)


class TestChatTurn:
    def test_valid_turn(self):
        turn = ChatTurn(role="user", content="hello")
        assert turn.role == "user"
        assert turn.content == "hello"

    def test_invalid_role(self):
        with pytest.raises(ValidationError):
            ChatTurn(role="system", content="hello")

    def test_empty_content_rejected(self):
        with pytest.raises(ValidationError):
            ChatTurn(role="user", content="")


class TestChatRequest:
    def test_minimal_valid(self):
        req = ChatRequest(npc_id="marcus", message="Tell me about the atrium")
        assert req.npc_id == "marcus"
        assert req.language == "en"
        assert req.pressure == 0
        assert req.rapport == 25
        assert req.history == []

    def test_empty_message_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest(npc_id="marcus", message="")

    def test_pressure_out_of_range(self):
        with pytest.raises(ValidationError):
            ChatRequest(npc_id="marcus", message="hi", pressure=101)

    def test_rapport_out_of_range(self):
        with pytest.raises(ValidationError):
            ChatRequest(npc_id="marcus", message="hi", rapport=-1)

    def test_history_limit(self):
        """History longer than 100 messages gets trimmed to last 100."""
        turns = [ChatTurn(role="user", content=f"msg-{i}") for i in range(120)]
        req = ChatRequest(npc_id="marcus", message="hi", history=turns)
        assert len(req.history) == 100
        # Should keep the LAST 100
        assert req.history[0].content == "msg-20"


class TestChatResponse:
    def test_defaults(self):
        resp = ChatResponse(reply="I don't know.", npc_id="marcus", history=[])
        assert resp.expression == "neutral"
        assert resp.pressure == 0
        assert resp.rapport == 25
        assert resp.degraded is False
        assert resp.tactic_type == "open_ended"


class TestSpeakRequest:
    def test_valid(self):
        req = SpeakRequest(text="Hello there")
        assert req.voice == "alloy"

    def test_empty_text_rejected(self):
        with pytest.raises(ValidationError):
            SpeakRequest(text="")

    def test_text_too_long(self):
        with pytest.raises(ValidationError):
            SpeakRequest(text="a" * 4097)


class TestStringboardModels:
    def test_card_position_defaults(self):
        pos = StringboardCardPosition()
        assert pos.x == 0.0
        assert pos.y == 0.0

    def test_link_alias(self):
        link = StringboardLink(**{"from": "card-a", "to": "card-b"})
        assert link.from_id == "card-a"
        assert link.to_id == "card-b"

    def test_state_defaults(self):
        state = StringboardState()
        assert state.cardPositions == {}
        assert state.links == []
```

**Step 2: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_schemas.py -v`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add tests/test_schemas.py
git commit -m "test: add unit tests for Pydantic schemas"
```

---

### Task 3: Test config.py (settings resolution)

**Files:**
- Create: `tests/test_config.py`

**Step 1: Write the tests**

```python
"""Tests for server/config.py — settings resolution and alias fallbacks."""

from __future__ import annotations

from server.config import Settings


class TestSettingsDefaults:
    def test_default_provider(self):
        s = Settings(
            _env_file=None,
            llm_provider="openai",
        )
        assert s.llm_provider == "openai"

    def test_default_model(self):
        s = Settings(_env_file=None)
        assert s.openai_model == "gpt-4o-mini"

    def test_default_case_id(self):
        s = Settings(_env_file=None)
        assert s.case_id == "echoes_in_the_atrium"

    def test_cors_origins_none_by_default(self):
        s = Settings(_env_file=None)
        assert s.cors_origins is None


class TestSettingsOverrides:
    def test_custom_provider(self):
        s = Settings(_env_file=None, llm_provider="anthropic")
        assert s.llm_provider == "anthropic"

    def test_custom_timeout(self):
        s = Settings(_env_file=None, classifier_timeout=15.0)
        assert s.classifier_timeout == 15.0
```

**Step 2: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_config.py -v`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add tests/test_config.py
git commit -m "test: add unit tests for config settings"
```

---

### Task 4: Test llm/factory.py (provider selection)

**Files:**
- Create: `tests/test_factory.py`

**Step 1: Write the tests**

```python
"""Tests for server/llm/factory.py — LLM provider selection."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from server.llm.local_stub import LocalEchoLLMClient


class TestGetLlmClient:
    def test_local_provider(self):
        with patch("server.llm.factory.settings") as mock_settings:
            mock_settings.llm_provider = "local"
            # Clear the lru_cache to force re-evaluation
            from server.llm.factory import get_llm_client
            get_llm_client.cache_clear()
            client = get_llm_client()
            assert isinstance(client, LocalEchoLLMClient)
            get_llm_client.cache_clear()

    def test_unknown_provider_raises(self):
        with patch("server.llm.factory.settings") as mock_settings:
            mock_settings.llm_provider = "nonexistent"
            from server.llm.factory import get_llm_client
            get_llm_client.cache_clear()
            with pytest.raises(ValueError, match="nonexistent"):
                get_llm_client()
            get_llm_client.cache_clear()

    def test_provider_case_insensitive(self):
        with patch("server.llm.factory.settings") as mock_settings:
            mock_settings.llm_provider = "LOCAL"
            from server.llm.factory import get_llm_client
            get_llm_client.cache_clear()
            client = get_llm_client()
            assert isinstance(client, LocalEchoLLMClient)
            get_llm_client.cache_clear()

    def test_legacy_alias_exists(self):
        from server.llm.factory import create_llm_client, get_llm_client
        assert create_llm_client is get_llm_client
```

**Step 2: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_factory.py -v`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add tests/test_factory.py
git commit -m "test: add unit tests for LLM factory provider selection"
```

---

### Task 5: Test npc_registry.py

**Files:**
- Create: `tests/test_npc_registry.py`

**Step 1: Write the tests**

```python
"""Tests for server/npc_registry.py — NPC lookup and listing."""

from __future__ import annotations

import pytest

from server.npc_registry import NPCProfile, get_npc_profile, list_npcs


class TestGetNpcProfile:
    def test_valid_npc(self, sample_case_data):
        """Known NPC from the real case data should return a profile."""
        npcs = sample_case_data.npc_profiles
        first_npc_id = next(iter(npcs))
        profile = get_npc_profile(first_npc_id)
        assert isinstance(profile, NPCProfile)
        assert profile.npc_id == first_npc_id
        assert len(profile.display_name) > 0

    def test_missing_npc_raises(self):
        with pytest.raises(ValueError, match="not found"):
            get_npc_profile("nonexistent_npc_id_xyz")


class TestListNpcs:
    def test_returns_dict(self):
        result = list_npcs()
        assert isinstance(result, dict)
        assert len(result) > 0

    def test_returns_copy(self):
        """Mutating the returned dict should not affect the registry."""
        copy1 = list_npcs()
        copy1["injected_npc"] = "bad"
        copy2 = list_npcs()
        assert "injected_npc" not in copy2

    def test_values_are_npc_profiles(self):
        for profile in list_npcs().values():
            assert isinstance(profile, NPCProfile)
            assert profile.npc_id
            assert profile.display_name
```

**Step 2: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_npc_registry.py -v`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add tests/test_npc_registry.py
git commit -m "test: add unit tests for NPC registry"
```

---

### Task 6: Test llm/classifier.py

**Files:**
- Create: `tests/test_classifier.py`

**Step 1: Write the tests**

```python
"""Tests for server/llm/classifier.py — tactic classification and evidence detection."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from server.llm.classifier import (
    VALID_EVIDENCE_STRENGTHS,
    VALID_EXPRESSIONS,
    VALID_TACTIC_TYPES,
    classify_player_turn,
    detect_evidence,
)


@pytest.fixture()
def _patch_classifier_provider():
    """Set classifier to use openai so we can mock the call."""
    with patch("server.llm.classifier.settings") as mock_settings:
        mock_settings.llm_provider = "openai"
        mock_settings.openai_classifier_model = "gpt-4o-mini"
        mock_settings.openai_api_key = "fake-key"
        mock_settings.classifier_timeout = 5.0
        mock_settings.classifier_connect_timeout = 2.0
        yield mock_settings


class TestClassifyPlayerTurn:
    @pytest.mark.asyncio
    async def test_valid_classification(self, _patch_classifier_provider):
        mock_response = json.dumps({"tactic_type": "empathy", "evidence_strength": "weak"})
        with patch(
            "server.llm.classifier._call_classifier_json",
            new_callable=AsyncMock,
            return_value={"tactic_type": "empathy", "evidence_strength": "weak"},
        ):
            result = await classify_player_turn(
                message="I understand how you feel",
                npc_id="marcus",
                player_evidence_ids=[],
                conversation_history=[],
            )
            assert result["tactic_type"] == "empathy"
            assert result["evidence_strength"] == "weak"
            assert result["degraded"] is False

    @pytest.mark.asyncio
    async def test_invalid_tactic_falls_back(self, _patch_classifier_provider):
        with patch(
            "server.llm.classifier._call_classifier_json",
            new_callable=AsyncMock,
            return_value={"tactic_type": "INVALID", "evidence_strength": "none"},
        ):
            result = await classify_player_turn(
                message="test",
                npc_id="marcus",
                player_evidence_ids=[],
                conversation_history=[],
            )
            assert result["tactic_type"] == "open_ended"

    @pytest.mark.asyncio
    async def test_invalid_evidence_strength_falls_back(self, _patch_classifier_provider):
        with patch(
            "server.llm.classifier._call_classifier_json",
            new_callable=AsyncMock,
            return_value={"tactic_type": "empathy", "evidence_strength": "BOGUS"},
        ):
            result = await classify_player_turn(
                message="test",
                npc_id="marcus",
                player_evidence_ids=[],
                conversation_history=[],
            )
            assert result["evidence_strength"] == "none"

    @pytest.mark.asyncio
    async def test_exception_returns_degraded(self, _patch_classifier_provider):
        with patch(
            "server.llm.classifier._call_classifier_json",
            new_callable=AsyncMock,
            side_effect=Exception("API down"),
        ):
            result = await classify_player_turn(
                message="test",
                npc_id="marcus",
                player_evidence_ids=[],
                conversation_history=[],
            )
            assert result["tactic_type"] == "open_ended"
            assert result["evidence_strength"] == "none"
            assert result["degraded"] is True

    @pytest.mark.asyncio
    async def test_empty_response_uses_defaults(self, _patch_classifier_provider):
        with patch(
            "server.llm.classifier._call_classifier_json",
            new_callable=AsyncMock,
            return_value={},
        ):
            result = await classify_player_turn(
                message="test",
                npc_id="marcus",
                player_evidence_ids=[],
                conversation_history=[],
            )
            assert result["tactic_type"] == "open_ended"
            assert result["evidence_strength"] == "none"

    def test_valid_tactic_types_not_empty(self):
        assert len(VALID_TACTIC_TYPES) >= 8

    def test_valid_evidence_strengths_not_empty(self):
        assert len(VALID_EVIDENCE_STRENGTHS) >= 4


class TestDetectEvidence:
    @pytest.mark.asyncio
    async def test_valid_detection(self, _patch_classifier_provider, sample_case_data):
        """Mock a valid discovery detection and verify filtering."""
        # Get a real discovery from the case data
        catalog = sample_case_data.discovery_catalog
        if not catalog:
            pytest.skip("No discoveries in case data")
        first_discovery = next(iter(catalog.values()))
        disc_id = first_discovery.discovery_id
        npc_id = first_discovery.npc_id

        with patch(
            "server.llm.classifier._call_classifier_json",
            new_callable=AsyncMock,
            return_value={
                "discovery_ids": [disc_id],
                "expression": "contemplative",
                "discovery_summaries": {disc_id: "A relevant clue was revealed."},
            },
        ):
            result = await detect_evidence(
                npc_response="I saw something that night...",
                npc_id=npc_id,
                already_collected=[],
            )
            assert disc_id in result["discovery_ids"]
            assert result["expression"] == "contemplative"
            assert result["degraded"] is False

    @pytest.mark.asyncio
    async def test_already_collected_filtered_out(self, _patch_classifier_provider, sample_case_data):
        catalog = sample_case_data.discovery_catalog
        if not catalog:
            pytest.skip("No discoveries in case data")
        first_discovery = next(iter(catalog.values()))
        disc_id = first_discovery.discovery_id
        npc_id = first_discovery.npc_id

        with patch(
            "server.llm.classifier._call_classifier_json",
            new_callable=AsyncMock,
            return_value={
                "discovery_ids": [disc_id],
                "expression": "neutral",
                "discovery_summaries": {disc_id: "Something already known."},
            },
        ):
            result = await detect_evidence(
                npc_response="I saw something...",
                npc_id=npc_id,
                already_collected=[disc_id],
            )
            assert disc_id not in result["discovery_ids"]

    @pytest.mark.asyncio
    async def test_exception_returns_degraded(self, _patch_classifier_provider):
        with patch(
            "server.llm.classifier._call_classifier_json",
            new_callable=AsyncMock,
            side_effect=Exception("Timeout"),
        ):
            result = await detect_evidence(
                npc_response="test",
                npc_id="marcus",
                already_collected=[],
            )
            assert result["discovery_ids"] == []
            assert result["degraded"] is True

    @pytest.mark.asyncio
    async def test_invalid_expression_falls_back(self, _patch_classifier_provider):
        with patch(
            "server.llm.classifier._call_classifier_json",
            new_callable=AsyncMock,
            return_value={
                "discovery_ids": [],
                "expression": "INVALID_EXPR",
                "discovery_summaries": {},
            },
        ):
            result = await detect_evidence(
                npc_response="test",
                npc_id="marcus",
                already_collected=[],
            )
            assert result["expression"] in VALID_EXPRESSIONS

    def test_valid_expressions_not_empty(self):
        assert len(VALID_EXPRESSIONS) >= 6
```

Note: This task requires `pytest-asyncio`. Check if it's already installed; if not, add it to requirements.txt.

**Step 2: Install pytest-asyncio if needed**

Run: `cd /Users/maxf/Documents/detective_game-main && pip install pytest-asyncio`
Add `pytest-asyncio` to requirements.txt if missing.
Add `asyncio_mode = "auto"` to `[tool.pytest.ini_options]` in pyproject.toml.

**Step 3: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_classifier.py -v`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add tests/test_classifier.py requirements.txt pyproject.toml
git commit -m "test: add unit tests for LLM classifier (tactic + evidence detection)"
```

---

### Task 7: Test auth_routes.py

**Files:**
- Create: `tests/test_auth_routes.py`

**Step 1: Write the tests**

```python
"""Tests for server/auth_routes.py — signup, login, logout, session, game state."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from server.app import app


@pytest.fixture()
def client(mock_supabase):
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestAuthStatus:
    def test_status_when_configured(self, client, mock_supabase):
        with patch("server.auth_routes.is_supabase_configured", return_value=True):
            resp = client.get("/api/auth/status")
            assert resp.status_code == 200
            assert resp.json()["supabase_configured"] is True

    def test_status_when_unconfigured(self, client):
        with patch("server.auth_routes.is_supabase_configured", return_value=False):
            resp = client.get("/api/auth/status")
            assert resp.status_code == 200
            assert resp.json()["supabase_configured"] is False


class TestSignup:
    def test_successful_signup(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post("/api/auth/signup", json={
                "email": "new@example.com",
                "password": "secret123",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert "access_token" in data
            assert data["email"] == "test@example.com"

    def test_short_password_rejected(self, client):
        resp = client.post("/api/auth/signup", json={
            "email": "new@example.com",
            "password": "short",
        })
        assert resp.status_code == 422

    def test_invalid_email_rejected(self, client):
        resp = client.post("/api/auth/signup", json={
            "email": "not-an-email",
            "password": "secret123",
        })
        assert resp.status_code == 422

    def test_supabase_unavailable(self, client, mock_supabase_unconfigured):
        with patch("server.auth_routes.require_supabase", side_effect=__import__("fastapi").HTTPException(status_code=503)):
            resp = client.post("/api/auth/signup", json={
                "email": "new@example.com",
                "password": "secret123",
            })
            assert resp.status_code == 503


class TestLogin:
    def test_successful_login(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post("/api/auth/login", json={
                "email": "user@example.com",
                "password": "secret123",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert "access_token" in data

    def test_invalid_credentials(self, client, mock_supabase):
        mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post("/api/auth/login", json={
                "email": "user@example.com",
                "password": "wrong",
            })
            assert resp.status_code in (401, 500)


class TestLogout:
    def test_logout_succeeds(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post("/api/auth/logout", headers={"Authorization": "Bearer valid-token"})
            assert resp.status_code == 200
            assert resp.json()["ok"] is True

    def test_logout_without_token(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post("/api/auth/logout")
            # Logout is best-effort, should still succeed
            assert resp.status_code == 200


class TestCheckSession:
    def test_valid_session(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get("/api/auth/session", headers={"Authorization": "Bearer valid-token"})
            assert resp.status_code == 200
            data = resp.json()
            assert "user_id" in data

    def test_missing_token(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get("/api/auth/session")
            assert resp.status_code == 401


class TestGameStateSave:
    def test_save_state(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/state/save",
                json={"state": {"progress": 50}},
                headers={"Authorization": "Bearer valid-token"},
            )
            assert resp.status_code == 200

    def test_save_without_auth(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.post("/api/state/save", json={"state": {"progress": 50}})
            assert resp.status_code == 401


class TestGameStateLoad:
    def test_load_state(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"state": {"progress": 50}, "updated_at": "2025-01-01T00:00:00Z"}
        )
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get("/api/state/load", headers={"Authorization": "Bearer valid-token"})
            assert resp.status_code == 200

    def test_load_without_auth(self, client, mock_supabase):
        with patch("server.auth_routes.require_supabase", return_value=mock_supabase):
            resp = client.get("/api/state/load")
            assert resp.status_code == 401
```

**Step 2: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_auth_routes.py -v`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add tests/test_auth_routes.py
git commit -m "test: add unit tests for auth routes (signup, login, logout, session, game state)"
```

---

### Task 8: Test admin_auth.py

**Files:**
- Create: `tests/test_admin_auth.py`

**Step 1: Write the tests**

```python
"""Tests for server/admin_auth.py — admin token verification."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from server.admin_auth import require_admin


class TestRequireAdmin:
    def test_valid_admin(self):
        mock_sb = MagicMock()
        mock_sb.auth.get_user.return_value = MagicMock(
            user=MagicMock(id="admin-1", app_metadata={"is_admin": True})
        )
        with patch("server.admin_auth.get_supabase", return_value=mock_sb):
            user_id = require_admin(authorization="Bearer valid-token")
            assert user_id == "admin-1"

    def test_non_admin_rejected(self):
        mock_sb = MagicMock()
        mock_sb.auth.get_user.return_value = MagicMock(
            user=MagicMock(id="user-1", app_metadata={})
        )
        with patch("server.admin_auth.get_supabase", return_value=mock_sb):
            with pytest.raises(HTTPException) as exc_info:
                require_admin(authorization="Bearer valid-token")
            assert exc_info.value.status_code == 403

    def test_missing_header(self):
        with patch("server.admin_auth.get_supabase", return_value=MagicMock()):
            with pytest.raises(HTTPException) as exc_info:
                require_admin(authorization=None)
            assert exc_info.value.status_code == 401

    def test_malformed_header(self):
        with patch("server.admin_auth.get_supabase", return_value=MagicMock()):
            with pytest.raises(HTTPException) as exc_info:
                require_admin(authorization="NotBearer token")
            assert exc_info.value.status_code == 401

    def test_supabase_not_configured(self):
        with patch("server.admin_auth.get_supabase", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                require_admin(authorization="Bearer valid-token")
            assert exc_info.value.status_code == 503

    def test_invalid_token(self):
        mock_sb = MagicMock()
        mock_sb.auth.get_user.side_effect = Exception("Invalid token")
        with patch("server.admin_auth.get_supabase", return_value=mock_sb):
            with pytest.raises(HTTPException) as exc_info:
                require_admin(authorization="Bearer bad-token")
            assert exc_info.value.status_code == 401
```

**Step 2: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_admin_auth.py -v`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add tests/test_admin_auth.py
git commit -m "test: add unit tests for admin auth (token verification, role checking)"
```

---

### Task 9: Test admin_routes.py

**Files:**
- Create: `tests/test_admin_routes.py`

**Step 1: Write the tests**

```python
"""Tests for server/admin_routes.py — admin CRUD endpoints."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from server.app import app


@pytest.fixture()
def admin_client(mock_supabase):
    """Client with admin auth bypassed."""
    with patch("server.admin_auth.require_admin", return_value="admin-user-id"):
        with patch("server.admin_routes.require_supabase", return_value=mock_supabase):
            with TestClient(app, raise_server_exceptions=False) as c:
                yield c, mock_supabase


class TestListCases:
    def test_list_cases(self, admin_client):
        client, sb = admin_client
        sb.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[{"id": "case-1", "title": "Test Case"}]
        )
        resp = client.get("/api/admin/cases")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_cases_with_pagination(self, admin_client):
        client, sb = admin_client
        sb.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[]
        )
        resp = client.get("/api/admin/cases?limit=10&offset=5")
        assert resp.status_code == 200


class TestGetCase:
    def test_get_case(self, admin_client):
        client, sb = admin_client
        # Mock the main case query and all sub-queries
        chain = sb.table.return_value.select.return_value
        chain.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"id": "case-1", "title": "Test Case"}
        )
        chain.eq.return_value.order.return_value.execute.return_value = MagicMock(data=[])
        chain.eq.return_value.execute.return_value = MagicMock(data=[])
        resp = client.get("/api/admin/cases/case-1")
        assert resp.status_code == 200


class TestCreateCase:
    def test_create_case(self, admin_client):
        client, sb = admin_client
        sb.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "new-case", "title": "New Case", "slug": "new-case"}]
        )
        resp = client.post("/api/admin/cases", json={
            "title": "New Case",
            "slug": "new-case",
        })
        assert resp.status_code == 200

    def test_create_case_missing_title(self, admin_client):
        client, sb = admin_client
        resp = client.post("/api/admin/cases", json={"slug": "no-title"})
        assert resp.status_code == 422


class TestDeleteCase:
    def test_delete_requires_confirm(self, admin_client):
        client, sb = admin_client
        resp = client.delete("/api/admin/cases/case-1")
        assert resp.status_code == 400

    def test_delete_with_confirm(self, admin_client):
        client, sb = admin_client
        sb.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        resp = client.delete("/api/admin/cases/case-1?confirm=true")
        assert resp.status_code == 200


class TestCreateNpc:
    def test_create_npc(self, admin_client):
        client, sb = admin_client
        sb.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "npc-1", "npc_slug": "marcus"}]
        )
        resp = client.post("/api/admin/cases/case-1/npcs", json={
            "npc_slug": "marcus",
            "display_name": "Marcus",
        })
        assert resp.status_code == 200


class TestListArchetypes:
    def test_list_archetypes(self, admin_client):
        client, sb = admin_client
        sb.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
            data=[{"id": "arch-1", "name": "Cooperative"}]
        )
        resp = client.get("/api/admin/archetypes")
        assert resp.status_code == 200
```

**Step 2: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_admin_routes.py -v`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add tests/test_admin_routes.py
git commit -m "test: add unit tests for admin routes (case/NPC/evidence CRUD)"
```

---

### Task 10: Test feedback_routes.py

**Files:**
- Create: `tests/test_feedback_routes.py`

**Step 1: Write the tests**

```python
"""Tests for server/feedback_routes.py — feedback submission and screenshot upload."""

from __future__ import annotations

from io import BytesIO
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from server.app import app


@pytest.fixture()
def client(mock_supabase):
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestSubmitFeedback:
    def test_submit_feedback(self, client, mock_supabase):
        with patch("server.feedback_routes.require_supabase", return_value=mock_supabase):
            resp = client.post("/api/feedback/", json={
                "session_id": "sess-123",
                "feedback_text": "Great game!",
            })
            assert resp.status_code == 200
            assert resp.json()["ok"] is True

    def test_feedback_too_long(self, client):
        resp = client.post("/api/feedback/", json={
            "session_id": "sess-123",
            "feedback_text": "x" * 5001,
        })
        assert resp.status_code == 422

    def test_feedback_swallows_db_error(self, client, mock_supabase):
        """Feedback submission should succeed even if DB insert fails."""
        mock_supabase.table.return_value.insert.return_value.execute.side_effect = Exception("DB error")
        with patch("server.feedback_routes.require_supabase", return_value=mock_supabase):
            resp = client.post("/api/feedback/", json={
                "session_id": "sess-123",
                "feedback_text": "Test",
            })
            assert resp.status_code == 200
            assert resp.json()["ok"] is True


class TestUploadScreenshot:
    def test_upload_valid_image(self, client, mock_supabase):
        with patch("server.feedback_routes.require_supabase", return_value=mock_supabase):
            file_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
            resp = client.post(
                "/api/feedback/upload",
                files={"file": ("screenshot.png", BytesIO(file_content), "image/png")},
            )
            assert resp.status_code == 200
            assert "url" in resp.json()

    def test_upload_invalid_extension(self, client, mock_supabase):
        with patch("server.feedback_routes.require_supabase", return_value=mock_supabase):
            resp = client.post(
                "/api/feedback/upload",
                files={"file": ("malware.exe", BytesIO(b"bad"), "application/octet-stream")},
            )
            assert resp.status_code == 400
```

**Step 2: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_feedback_routes.py -v`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add tests/test_feedback_routes.py
git commit -m "test: add unit tests for feedback routes (submission + screenshot upload)"
```

---

### Task 11: Test tracking_routes.py

**Files:**
- Create: `tests/test_tracking_routes.py`

**Step 1: Write the tests**

```python
"""Tests for server/tracking_routes.py — event logging endpoints."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from server.app import app


@pytest.fixture()
def client(mock_supabase):
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestTrackSession:
    def test_track_session(self, client, mock_supabase):
        with patch("server.tracking_routes.safe_insert") as mock_insert:
            resp = client.post("/api/track/session", json={
                "session_id": "sess-123",
                "language": "en",
            })
            assert resp.status_code == 200
            assert resp.json()["ok"] is True
            mock_insert.assert_called_once()

    def test_track_session_default_language(self, client, mock_supabase):
        with patch("server.tracking_routes.safe_insert"):
            resp = client.post("/api/track/session", json={
                "session_id": "sess-123",
            })
            assert resp.status_code == 200


class TestTrackDiscovery:
    def test_track_discovery(self, client, mock_supabase):
        with patch("server.tracking_routes.safe_insert") as mock_insert:
            resp = client.post("/api/track/discovery", json={
                "session_id": "sess-123",
                "evidence_id": "ev-001",
                "npc_id": "marcus",
            })
            assert resp.status_code == 200
            mock_insert.assert_called_once()


class TestTrackAccusation:
    def test_track_accusation(self, client, mock_supabase):
        with patch("server.tracking_routes.safe_insert") as mock_insert:
            resp = client.post("/api/track/accusation", json={
                "session_id": "sess-123",
                "target_npc_id": "marcus",
                "correct": True,
                "evidence_count": 5,
                "interview_count": 3,
            })
            assert resp.status_code == 200
            mock_insert.assert_called_once()

    def test_track_accusation_minimal(self, client, mock_supabase):
        with patch("server.tracking_routes.safe_insert"):
            resp = client.post("/api/track/accusation", json={
                "session_id": "sess-123",
                "target_npc_id": "marcus",
                "correct": False,
            })
            assert resp.status_code == 200


class TestLogChatEvent:
    def test_log_chat_event(self, mock_supabase):
        with patch("server.tracking_routes.safe_insert") as mock_insert:
            from server.tracking_routes import log_chat_event
            log_chat_event(
                session_id="sess-123",
                npc_id="marcus",
                player_message="hello",
                npc_reply="hi there",
                tactic_type="empathy",
            )
            mock_insert.assert_called_once()
            call_args = mock_insert.call_args
            assert call_args[0][0] == "chat_events"
            assert call_args[0][1]["npc_id"] == "marcus"
```

**Step 2: Run tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/test_tracking_routes.py -v`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add tests/test_tracking_routes.py
git commit -m "test: add unit tests for tracking routes (session, discovery, accusation events)"
```

---

### Task 12: Run full suite and verify no regressions

**Step 1: Run all tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/ -v --tb=short`
Expected: All ~120+ tests PASS. Zero failures.

**Step 2: Count tests**

Run: `cd /Users/maxf/Documents/detective_game-main && python -m pytest tests/ --co -q | tail -1`
Expected: Output shows 120+ tests collected.

**Step 3: Final commit if any fixups needed**

```bash
git add -A
git commit -m "test: finalize test coverage — all modules covered"
```
