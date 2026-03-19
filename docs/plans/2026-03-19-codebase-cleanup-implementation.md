# Codebase Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve code organization, developer experience, and security across the detective game codebase without adding new features.

**Architecture:** Incremental 5-phase cleanup. Each phase produces working, committable code. Phases are ordered by priority: backend DX/tooling first, then frontend modularization, backend organization, testing/types, and security hardening.

**Tech Stack:** Python 3.12 / FastAPI / Ruff / Pytest / Vanilla JS ES Modules / CSS

---

## Task 1: Add pyproject.toml with Ruff and Pytest config

**Files:**
- Create: `pyproject.toml`

**Step 1: Create pyproject.toml**

```toml
[project]
name = "detective-game"
version = "0.1.0"
description = "LLM-powered detective mystery game"
requires-python = ">=3.12"

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I", "UP", "B", "SIM"]
ignore = ["E501"]  # line length handled by formatter

[tool.ruff.lint.isort]
known-first-party = ["server"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

**Step 2: Verify ruff runs clean**

Run: `ruff check server/ tests/`
Expected: Some warnings (will fix in Task 3)

**Step 3: Verify pytest still passes**

Run: `pytest tests/ -v`
Expected: All 32 tests pass

**Step 4: Commit**

```bash
git add pyproject.toml
git commit -m "chore: add pyproject.toml with ruff and pytest config"
```

---

## Task 2: Add pre-commit config

**Files:**
- Create: `.pre-commit-config.yaml`

**Step 1: Create .pre-commit-config.yaml**

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.9.10
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

**Step 2: Commit**

```bash
git add .pre-commit-config.yaml
git commit -m "chore: add pre-commit config with ruff hooks"
```

---

## Task 3: Run ruff fix across all Python files

**Files:**
- Modify: all `.py` files under `server/` and `tests/`

**Step 1: Run ruff fix**

Run: `ruff check server/ tests/ --fix`
Then: `ruff format server/ tests/`

**Step 2: Verify tests still pass**

Run: `pytest tests/ -v`
Expected: All 32 tests pass

**Step 3: Commit**

```bash
git add -A server/ tests/
git commit -m "style: apply ruff linting and formatting across all Python files"
```

---

## Task 4: Generate requirements.lock

**Files:**
- Create: `requirements.lock`

**Step 1: Generate lock file**

Run: `pip freeze > requirements.lock`

**Step 2: Commit**

```bash
git add requirements.lock
git commit -m "chore: add requirements.lock for reproducible builds"
```

---

## Task 5: Extract unified Supabase helper module

**Files:**
- Create: `server/supabase_helpers.py`
- Modify: `server/tracking_routes.py:41-45`
- Modify: `server/admin_routes.py:127-131`
- Modify: `server/feedback_routes.py:32-36`
- Modify: `server/auth_routes.py:44-51`

**Step 1: Create `server/supabase_helpers.py`**

```python
"""Shared Supabase utilities used across route modules."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException

from .supabase_client import get_supabase

log = logging.getLogger(__name__)


def require_supabase():
    """Return the Supabase client or raise 503 if not configured."""
    sb = get_supabase()
    if sb is None:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return sb


def safe_insert(table: str, data: dict[str, Any]) -> None:
    """Insert a row into a Supabase table, logging failures without raising.

    Use for non-critical analytics/tracking writes where silent failure
    is acceptable (the game continues even if analytics are lost).
    """
    sb = get_supabase()
    if sb is None:
        return
    try:
        sb.table(table).insert(data).execute()
    except Exception as exc:
        log.warning("Failed to insert into %s: %s", table, exc)
```

**Step 2: Update tracking_routes.py**

Replace the `_get_sb()` helper (lines 41-45) with an import of `require_supabase` from the new module. Replace all three try/except insert blocks (lines 52-60, 64-74, 77-90) with calls to `safe_insert()`. Replace the try/except in `log_chat_event` (lines 108-127) with `safe_insert()`.

The file should look like:

```python
"""Gameplay tracking endpoints for analytics (no auth required)."""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from .supabase_helpers import safe_insert

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/track", tags=["tracking"])


# ── Request schemas ──────────────────────────────────────────────────────

class TrackSessionRequest(BaseModel):
    session_id: str
    language: str = "en"


class TrackDiscoveryRequest(BaseModel):
    session_id: str
    evidence_id: str
    npc_id: Optional[str] = None


class TrackAccusationRequest(BaseModel):
    session_id: str
    target_npc_id: str
    correct: bool
    evidence_count: int = 0
    interview_count: int = 0


# ── Endpoints ────────────────────────────────────────────────────────────

@router.post("/session")
async def track_session(body: TrackSessionRequest):
    safe_insert("game_sessions", {
        "session_id": body.session_id,
        "language": body.language,
    })
    return {"ok": True}


@router.post("/discovery")
async def track_discovery(body: TrackDiscoveryRequest):
    safe_insert("discovery_events", {
        "session_id": body.session_id,
        "evidence_id": body.evidence_id,
        "npc_id": body.npc_id,
    })
    return {"ok": True}


@router.post("/accusation")
async def track_accusation(body: TrackAccusationRequest):
    safe_insert("accusation_events", {
        "session_id": body.session_id,
        "target_npc_id": body.target_npc_id,
        "correct": body.correct,
        "evidence_count": body.evidence_count,
        "interview_count": body.interview_count,
    })
    return {"ok": True}


def log_chat_event(
    session_id: str,
    npc_id: str,
    player_message: str,
    npc_reply: str,
    tactic_type: str | None = None,
    evidence_strength: str | None = None,
    pressure: int | None = None,
    rapport: int | None = None,
    pressure_band: str | None = None,
    rapport_band: str | None = None,
    expression: str | None = None,
    evidence_ids: List[str] | None = None,
) -> None:
    """Insert a chat_events row. Called from the /api/chat endpoint."""
    safe_insert("chat_events", {
        "session_id": session_id,
        "npc_id": npc_id,
        "player_message": player_message,
        "npc_reply": npc_reply,
        "tactic_type": tactic_type,
        "evidence_strength": evidence_strength,
        "pressure": pressure,
        "rapport": rapport,
        "pressure_band": pressure_band,
        "rapport_band": rapport_band,
        "expression": expression,
        "evidence_ids": evidence_ids or [],
    })
```

**Step 3: Update admin_routes.py**

Replace `_sb()` (lines 127-131) with import: `from .supabase_helpers import require_supabase`
Replace all calls to `_sb()` with `require_supabase()`.

**Step 4: Update feedback_routes.py**

Replace `_get_sb()` (lines 32-36) with import: `from .supabase_helpers import require_supabase`
Replace all calls to `_get_sb()` with `require_supabase()`.

**Step 5: Update auth_routes.py**

Replace `_require_supabase()` (lines 44-51) with import: `from .supabase_helpers import require_supabase`
Replace all calls to `_require_supabase()` with `require_supabase()`.

**Step 6: Verify tests pass**

Run: `pytest tests/ -v`
Expected: All 32 tests pass

**Step 7: Start the dev server and test manually**

Run: `python -m uvicorn server.app:app --port 8000`
Test: `curl http://localhost:8000/health`
Expected: `{"status": "ok", "llm_provider": "openai"}`

**Step 8: Commit**

```bash
git add server/supabase_helpers.py server/tracking_routes.py server/admin_routes.py server/feedback_routes.py server/auth_routes.py
git commit -m "refactor: extract unified Supabase helpers, eliminate duplicate code"
```

---

## Task 6: Move classifier timeout to config.py

**Files:**
- Modify: `server/config.py:88` (add new field before closing of class)
- Modify: `server/llm/classifier.py:21`

**Step 1: Add field to Settings class in config.py**

Add after line 87 (supabase_key field), before the class ends:

```python
    # ── Timeouts ───────────────────────────────────────────────────────────
    classifier_timeout: float = Field(
        default=30.0,
        description="Timeout in seconds for classifier LLM calls.",
    )
    classifier_connect_timeout: float = Field(
        default=10.0,
        description="Connection timeout in seconds for classifier LLM calls.",
    )
```

**Step 2: Update classifier.py to use config**

Replace line 21 in `server/llm/classifier.py`:
```python
_CLASSIFIER_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
```
with:
```python
from ..config import settings

_CLASSIFIER_TIMEOUT = httpx.Timeout(settings.classifier_timeout, connect=settings.classifier_connect_timeout)
```

Remove the hardcoded values.

**Step 3: Verify tests pass**

Run: `pytest tests/ -v`
Expected: All tests pass

**Step 4: Commit**

```bash
git add server/config.py server/llm/classifier.py
git commit -m "refactor: move classifier timeout to config.py"
```

---

## Task 7: Split main.css into modules

**Files:**
- Modify: `web/css/main.css` (will be reduced)
- Create: `web/css/base.css`
- Create: `web/css/layout.css`
- Create: `web/css/components.css`
- Create: `web/css/chat.css`
- Create: `web/css/game.css`
- Modify: `web/index.html:10` (update link tags)

**Step 1: Read main.css and identify section boundaries**

Read `web/css/main.css` and identify logical sections by the comment headers already present (e.g., `/* ── Reset */`, `/* ── Layout */`, etc.). Split along these boundaries.

**Step 2: Create base.css**

Extract: CSS reset, `:root` variables, `body`/`html` base styles, typography, `.hidden`, scrollbar styles.

**Step 3: Create layout.css**

Extract: `.app-layout`, grid/panel definitions, responsive media queries for layout, `.hub-panel`, `.manila-tab` tab bar.

**Step 4: Create components.css**

Extract: Buttons, modals (`.modal-overlay`, `.modal-box`), toasts (`.toast-container`), tabs, settings panel, feedback modal, auth/login UI.

**Step 5: Create chat.css**

Extract: `.chat-layout`, `.chat-messages`, `.chat-bubble`, `.chat-input-bar`, typing indicator, chat-related animations.

**Step 6: Create game.css**

Extract: `.npc-card`, `.npc-grid`, portrait styles, gauge/meter styles, string board (`.stringboard-*`), evidence cards, discovery animations, accusation modal.

**Step 7: Replace main.css with imports**

Replace `web/css/main.css` content with:
```css
/* Main stylesheet - imports all modules */
@import url("base.css");
@import url("layout.css");
@import url("components.css");
@import url("chat.css");
@import url("game.css");
```

**Step 8: Verify in browser**

Start server and verify the game looks identical. Check all pages: hub, interrogation, string board, settings, feedback modal.

**Step 9: Commit**

```bash
git add web/css/
git commit -m "refactor: split main.css into modular CSS files"
```

---

## Task 8: Extract frontend utility functions

**Files:**
- Create: `web/js/utils.js`
- Modify: `web/js/main.js`

**Step 1: Create utils.js with shared utilities**

```javascript
/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str - Raw string to escape
 * @returns {string} HTML-safe string
 */
export function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

/**
 * Extract the NPC display name from a full label like "Name — Title".
 * @param {string} label - Full NPC label
 * @returns {string} Just the name portion
 */
export function npcDisplayName(label) {
  return label.split(" — ")[0];
}

/**
 * Add click-outside-to-close behavior to a modal overlay.
 * @param {HTMLElement} overlay - The modal overlay element
 * @param {Function} closeFn - Function to call when clicking outside
 */
export function addModalCloseOnClickOutside(overlay, closeFn) {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeFn();
  });
}
```

**Step 2: Update main.js to import from utils.js**

At the top of main.js (inside the IIFE, or converting to module), import:
```javascript
import { escapeHtml, npcDisplayName, addModalCloseOnClickOutside } from "./utils.js";
```

Remove the inline `escapeHtml` function definition (line 885-889 of main.js).
Replace all `.split(" — ")[0]` occurrences with `npcDisplayName()`.
Replace repeated modal close patterns with `addModalCloseOnClickOutside()`.

**Step 3: Update index.html script tag**

Change line 374 from:
```html
<script src="js/main.js"></script>
```
to:
```html
<script type="module" src="js/main.js"></script>
```

**Step 4: Verify in browser**

Test: game loads, chat works, modals open/close, NPC names display correctly.

**Step 5: Commit**

```bash
git add web/js/utils.js web/js/main.js web/index.html
git commit -m "refactor: extract frontend utility functions into utils.js module"
```

---

## Task 9: Extract frontend API client

**Files:**
- Create: `web/js/api.js`
- Modify: `web/js/main.js`

**Step 1: Create api.js with centralized fetch wrapper**

```javascript
/**
 * Centralized API client with auth header injection and token refresh.
 */

let _getAuthUser = null;
let _refreshToken = null;

/**
 * Initialize the API client with auth callbacks.
 * @param {Function} getAuthUser - Returns current auth user object or null
 * @param {Function} refreshToken - Async function to refresh the access token
 */
export function initApiClient(getAuthUser, refreshToken) {
  _getAuthUser = getAuthUser;
  _refreshToken = refreshToken;
}

/**
 * Make an authenticated API request.
 * @param {string} url - API endpoint URL
 * @param {object} [options] - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  const authUser = _getAuthUser?.();
  if (authUser?.access_token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${authUser.access_token}`,
    };
  }
  return fetch(url, options);
}

/**
 * Make an authenticated JSON POST request.
 * @param {string} url - API endpoint URL
 * @param {object} body - JSON body to send
 * @returns {Promise<object>} Parsed JSON response
 */
export async function apiPost(url, body) {
  const resp = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
}
```

**Step 2: Update main.js to use api.js**

Import `apiFetch` and `apiPost` from `./api.js`.
Call `initApiClient()` during app initialization with the auth callbacks.
Replace direct `fetch()` calls that include Authorization headers with `apiFetch()` or `apiPost()`.

**Step 3: Verify in browser**

Test: chat messages send, cloud save works, auth flow works (if Supabase configured).

**Step 4: Commit**

```bash
git add web/js/api.js web/js/main.js
git commit -m "refactor: extract centralized API client with auth middleware"
```

---

## Task 10: Extract frontend state management

**Files:**
- Create: `web/js/state.js`
- Modify: `web/js/main.js`

**Step 1: Create state.js**

Move `buildStateObject()` (main.js line 767) and `applyStateObject()` (line 792) into `state.js`. Move all state variables that these functions reference. Export the state object and the build/apply functions.

```javascript
/**
 * Centralized game state management.
 * @module state
 */

/** @type {object} Game state - single source of truth */
export const gameState = {
  conversations: {},
  evidence: [],
  discoveries: {},
  npcInterrogation: {},
  playerNotes: "",
  activeNpcId: null,
  // ... all other state variables from main.js
};

/**
 * Build a serializable state object for saving.
 * @returns {object} State snapshot
 */
export function buildStateObject() {
  // Move implementation from main.js line 767
}

/**
 * Apply a saved state object to restore game state.
 * @param {object} s - Saved state to apply
 */
export function applyStateObject(s) {
  // Move implementation from main.js line 792
}
```

**Step 2: Update main.js**

Import state from `./state.js`. Replace all direct state variable access with `gameState.xxx`. Remove the old function definitions.

**Step 3: Verify in browser**

Test: New game starts, existing save loads, state persists across page refresh.

**Step 4: Commit**

```bash
git add web/js/state.js web/js/main.js
git commit -m "refactor: extract centralized state management into state.js"
```

---

## Task 11: Unify backend dependency injection for audio endpoints

**Files:**
- Modify: `server/app.py:453-527`

**Step 1: Create a dependency for OpenAI client**

Add near the existing `_get_llm_client` dependency in app.py:

```python
async def _get_openai_for_audio() -> AsyncOpenAI:
    """Dependency that provides the OpenAI client for audio endpoints."""
    return _get_openai_client()
```

**Step 2: Update transcribe endpoint**

Change `server/app.py` line 453-454 from:
```python
@app.post("/api/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form(default="en"),
):
```
to:
```python
@app.post("/api/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form(default="en"),
    client: AsyncOpenAI = Depends(_get_openai_for_audio),
):
```

Remove `client = _get_openai_client()` from the function body (line 460).

**Step 3: Update speak endpoint**

Change `server/app.py` line 489-490 from:
```python
@app.post("/api/speak")
async def speak(request: SpeakRequest):
```
to:
```python
@app.post("/api/speak")
async def speak(request: SpeakRequest, client: AsyncOpenAI = Depends(_get_openai_for_audio)):
```

Remove `client = _get_openai_client()` from the function body (line 493).

**Step 4: Verify tests pass**

Run: `pytest tests/ -v`
Expected: All tests pass

**Step 5: Commit**

```bash
git add server/app.py
git commit -m "refactor: unify dependency injection for audio endpoints"
```

---

## Task 12: Add Pydantic model for stringboard state

**Files:**
- Modify: `server/schemas.py`
- Modify: `server/app.py:537-551`

**Step 1: Add StringboardState model to schemas.py**

```python
class StringboardCardPosition(BaseModel):
    x: float = 0
    y: float = 0

class StringboardLink(BaseModel):
    from_id: str = Field(..., alias="from")
    to_id: str = Field(..., alias="to")

    model_config = ConfigDict(populate_by_name=True)

class StringboardState(BaseModel):
    cardPositions: dict[str, StringboardCardPosition] = {}
    links: list[StringboardLink] = []
```

**Step 2: Update save_stringboard endpoint**

Change `server/app.py` line 537-543 to use the typed model:
```python
@app.post("/api/state/stringboard")
async def save_stringboard(state: StringboardState):
    """Save the string board state (card positions + links)."""
    _stringboard_store["default"] = state.model_dump(by_alias=True)
    return {"ok": True}
```

**Step 3: Verify in browser**

Test: string board saves and loads card positions and links correctly.

**Step 4: Commit**

```bash
git add server/schemas.py server/app.py
git commit -m "refactor: add Pydantic model for stringboard state validation"
```

---

## Task 13: Improve health check

**Files:**
- Modify: `server/app.py:554-558`

**Step 1: Update health endpoint**

Replace the health check (lines 554-558) with:

```python
@app.get("/health")
async def healthcheck():
    """Health endpoint that verifies dependency connectivity."""
    deps = {"llm_provider": settings.llm_provider}

    # Check Supabase
    sb = get_supabase()
    if sb is not None:
        try:
            sb.table("game_sessions").select("session_id").limit(1).execute()
            deps["supabase"] = "ok"
        except Exception:
            deps["supabase"] = "error"
    else:
        deps["supabase"] = "not_configured"

    all_ok = deps.get("supabase") != "error"
    status_code = 200 if all_ok else 503
    return JSONResponse(
        content={"status": "ok" if all_ok else "degraded", **deps},
        status_code=status_code,
    )
```

**Step 2: Verify**

Run: `curl http://localhost:8000/health`
Expected: JSON with status and dependency info

**Step 3: Commit**

```bash
git add server/app.py
git commit -m "refactor: improve health check to verify dependency connectivity"
```

---

## Task 14: Add request size limits

**Files:**
- Modify: `server/app.py` (add middleware)
- Modify: `server/schemas.py` (add field validators)

**Step 1: Add max history length to ChatRequest**

In `server/schemas.py`, find the ChatRequest model and add a validator:

```python
from pydantic import field_validator

class ChatRequest(BaseModel):
    # ... existing fields ...

    @field_validator("history")
    @classmethod
    def limit_history(cls, v):
        if len(v) > 100:
            return v[-100:]  # Keep most recent 100 messages
        return v
```

**Step 2: Verify tests pass**

Run: `pytest tests/ -v`
Expected: All tests pass

**Step 3: Commit**

```bash
git add server/schemas.py
git commit -m "refactor: add chat history length limit"
```

---

## Task 15: Add mypy configuration

**Files:**
- Modify: `pyproject.toml`

**Step 1: Add mypy config to pyproject.toml**

```toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = false  # start lenient, tighten later
ignore_missing_imports = true
```

**Step 2: Run mypy and note issues**

Run: `mypy server/ --ignore-missing-imports`
Expected: Some warnings — note them but don't fix all now. Fix only clear errors.

**Step 3: Fix critical type errors only**

Fix any errors that indicate actual bugs (wrong argument types, missing returns, etc.). Skip style-only issues.

**Step 4: Commit**

```bash
git add pyproject.toml server/
git commit -m "chore: add mypy config, fix critical type errors"
```

---

## Task 16: Add integration tests for API endpoints

**Files:**
- Create: `tests/test_api.py`

**Step 1: Write integration tests**

```python
"""Integration tests for API endpoints using the local LLM stub."""

import os
import pytest
from fastapi.testclient import TestClient

# Force local provider for testing (no API keys needed)
os.environ["ECHO_LLM_PROVIDER"] = "local"

from server.app import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        resp = client.get("/health")
        assert resp.status_code in (200, 503)
        data = resp.json()
        assert "status" in data
        assert "llm_provider" in data

    def test_health_shows_provider(self):
        resp = client.get("/health")
        assert resp.json()["llm_provider"] == "local"


class TestCaseEndpoint:
    def test_case_returns_data(self):
        resp = client.get("/api/case")
        assert resp.status_code == 200
        data = resp.json()
        assert "title" in data or "name" in data

    def test_npcs_returns_list(self):
        resp = client.get("/api/npcs")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0


class TestChatEndpoint:
    def test_chat_with_local_provider(self):
        resp = client.post("/api/chat", json={
            "npc_id": "dimitri",
            "message": "Hello",
            "history": [],
            "language": "en",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data

    def test_chat_rejects_unknown_npc(self):
        resp = client.post("/api/chat", json={
            "npc_id": "nonexistent_npc_12345",
            "message": "Hello",
            "history": [],
            "language": "en",
        })
        assert resp.status_code in (400, 404, 422)


class TestStringboardEndpoints:
    def test_save_and_load_stringboard(self):
        state = {"cardPositions": {"npc1": {"x": 100, "y": 200}}, "links": []}
        resp = client.post("/api/state/stringboard", json=state)
        assert resp.status_code == 200

        resp = client.get("/api/state/stringboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "cardPositions" in data

    def test_load_empty_stringboard(self):
        resp = client.get("/api/state/stringboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "cardPositions" in data
        assert "links" in data
```

**Step 2: Run integration tests**

Run: `pytest tests/test_api.py -v`
Expected: All tests pass (using local LLM stub, no API keys needed)

**Step 3: Commit**

```bash
git add tests/test_api.py
git commit -m "test: add integration tests for API endpoints"
```

---

## Task 17: Add rate limiting with slowapi

**Files:**
- Modify: `requirements.txt` (add slowapi)
- Modify: `server/app.py` (add middleware and decorators)

**Step 1: Add slowapi to requirements.txt**

Add line: `slowapi>=0.1.9`

**Step 2: Install**

Run: `pip install slowapi>=0.1.9`

**Step 3: Add rate limiting to app.py**

Near the top of app.py, after imports:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Add decorators to expensive endpoints:
```python
@app.post("/api/chat")
@limiter.limit("30/minute")
async def chat(request: Request, ...):
```

```python
@app.post("/api/transcribe")
@limiter.limit("10/minute")
async def transcribe(request: Request, ...):
```

```python
@app.post("/api/speak")
@limiter.limit("10/minute")
async def speak(request: Request, ...):
```

**Step 4: Verify tests pass**

Run: `pytest tests/ -v`
Expected: All tests pass

**Step 5: Update requirements.lock**

Run: `pip freeze > requirements.lock`

**Step 6: Commit**

```bash
git add requirements.txt requirements.lock server/app.py
git commit -m "feat: add rate limiting to expensive API endpoints"
```

---

## Task 18: Strengthen CORS and input validation

**Files:**
- Modify: `server/app.py:74-96` (CORS)
- Modify: `server/auth_routes.py` (email validation)

**Step 1: Update CORS to require explicit origins in production**

Replace the CORS block in app.py (lines 74-96) so that `"*"` is only used when `ECHO_LLM_PROVIDER=local`:

```python
_cors_env = getattr(settings, "cors_origins", None)
if _cors_env:
    allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
elif settings.llm_provider == "local":
    allow_origins = ["*"]
    log.info("CORS: using wildcard '*' (local dev mode)")
else:
    allow_origins = ["*"]
    log.warning(
        "CORS allow_origins is wildcard '*' in production. "
        "Set ECHO_CORS_ORIGINS to your deployment domain "
        "(e.g. ECHO_CORS_ORIGINS=https://yourdomain.com)."
    )
```

**Step 2: Add email validation to auth schemas**

In `server/auth_routes.py`, update the email field to use Pydantic EmailStr:

Add to requirements.txt: `pydantic[email]>=2.0` (or `email-validator>=2.0`)

Update the auth request model:
```python
from pydantic import EmailStr

class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
```

**Step 3: Verify tests pass**

Run: `pytest tests/ -v`
Expected: All tests pass

**Step 4: Commit**

```bash
git add server/app.py server/auth_routes.py requirements.txt
git commit -m "security: strengthen CORS defaults, add email validation"
```

---

## Task 19: Add admin pagination

**Files:**
- Modify: `server/admin_routes.py`

**Step 1: Add pagination to list endpoints**

Find the list endpoints in admin_routes.py (e.g., `list_cases`, `list_npcs`) and add `limit` and `offset` query parameters:

```python
@router.get("/cases")
async def list_cases(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    admin=Depends(require_admin),
):
    result = (
        _sb().table("cases")
        .select("*")
        .order("created_at")
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data
```

Apply the same pattern to all list endpoints in admin_routes.py.

**Step 2: Verify**

Test via curl or browser that pagination works.

**Step 3: Commit**

```bash
git add server/admin_routes.py
git commit -m "security: add pagination to admin list endpoints"
```

---

## Task 20: Final verification and cleanup

**Files:**
- No new files

**Step 1: Run full test suite**

Run: `pytest tests/ -v`
Expected: All tests pass

**Step 2: Run linter**

Run: `ruff check server/ tests/`
Expected: Clean

**Step 3: Start dev server and smoke test**

Run: `python -m uvicorn server.app:app --port 8000`
Test these flows:
- Health check: `curl http://localhost:8000/health`
- Case data: `curl http://localhost:8000/api/case`
- NPC list: `curl http://localhost:8000/api/npcs`
- Frontend loads in browser at http://localhost:8000

**Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```
