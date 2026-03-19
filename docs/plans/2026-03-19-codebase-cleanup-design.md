# Codebase Cleanup & Quality Improvement Plan

**Date:** 2026-03-19
**Goal:** Improve code organization, developer experience, and security without adding new features.
**Approach:** Incremental — 5 phases, each producing working code before the next begins.

---

## Phase 1 — Backend DX & Tooling

### Add `pyproject.toml`
- Ruff configuration (linting + formatting, replaces flake8/black/isort)
- Pytest configuration
- Project metadata

### Add `requirements.lock`
- `pip freeze` output for reproducible builds
- Keep `requirements.txt` for loose constraints, lock file for exact versions

### Add `.pre-commit-config.yaml`
- Ruff lint + format hooks
- Runs on every commit to catch issues early

### Consolidate duplicated backend patterns
- **Supabase helpers:** Extract unified `get_supabase_or_fail()` into `server/supabase_helpers.py`
  - Replaces `_sb()` in admin_routes.py and `_get_sb()` in tracking_routes.py
  - Single pattern, single error handling approach
- **Safe insert helper:** Extract `_safe_supabase_insert()` to eliminate 3x copy-pasted try/except in tracking_routes.py
- **Classifier timeout:** Move `_CLASSIFIER_TIMEOUT` from `llm/classifier.py` to `config.py`

### Run ruff fix
- Clean up unused imports and style issues across all Python files

---

## Phase 2 — Frontend Modularization

### Split `main.js` (~3,350 lines) into ES modules
| Module | Responsibility |
|--------|---------------|
| `state.js` | Centralized state, buildStateObject/applyStateObject, localStorage/cloud sync |
| `api.js` | Fetch wrapper with auth headers, token refresh, error handling |
| `chat.js` | Chat rendering, message sending, typing indicators |
| `stringboard.js` | String board rendering, link creation, drag interactions |
| `evidence.js` | Evidence rendering, discovery detection |
| `ui.js` | Modals, toasts, tabs, tutorials, settings |
| `audio.js` | Voice recording, TTS playback, audio cache |
| `utils.js` | escapeHtml, NPC name parsing, modal close pattern |
| `main.js` | App initialization, event wiring, imports |

### Split `main.css` (~2,400 lines)
| File | Scope |
|------|-------|
| `base.css` | Reset, CSS variables, typography |
| `layout.css` | Grid, panels, responsive breakpoints |
| `components.css` | Buttons, modals, toasts, tabs |
| `chat.css` | Chat bubbles, input area, typing indicator |
| `game.css` | NPC cards, portraits, gauges, string board, evidence |

### Extract admin panel styles
- Move inline CSS from `admin/index.html` to `admin/admin.css`

### Update `index.html`
- Use `<script type="module">` imports
- Use `<link>` tags for split CSS files

---

## Phase 3 — Backend Organization

### Unify dependency injection
- Audio endpoints (`/speak`, `/transcribe`) should use `Depends()` like `/chat`
- Enables consistent testing via dependency overrides

### Extract inline configuration
- Voice validation choices → `SpeakRequest` Pydantic model `Field(pattern=...)`
- Hardcoded timeouts → `config.py` settings

### Add request size limits
- FastAPI middleware for max request body size (10MB)
- Validate chat history length (cap at 50 turns)
- Validate game state blob size

### Improve health check
- `/health` verifies LLM and Supabase connectivity
- Returns 503 with dependency status if unavailable

### Add Pydantic model for stringboard state
- Currently accepts unvalidated JSON blobs
- Define schema to prevent malformed data

---

## Phase 4 — Testing & Types

### Backend typing
- Add mypy configuration to `pyproject.toml`
- Fix type errors across server modules

### Frontend documentation
- Add JSDoc `@param` / `@returns` to public functions in new modules
- Type-annotate state object shape

### Integration tests
- `/chat` endpoint with `local` LLM provider
- `/api/npcs` and `/api/case` endpoints
- Auth flow: signup → login → save → load
- Admin endpoints with mocked Supabase
- Goal: meaningful API surface coverage, not just unit tests

---

## Phase 5 — Security Hardening

### Rate limiting
- Add `slowapi` middleware
- `/chat`: 30/min per IP
- `/transcribe`: 10/min per IP
- `/feedback`: 5/min per IP
- Global: 100/min per IP

### CORS strictness
- Require explicit `ECHO_CORS_ORIGINS` env var
- Remove `"*"` as default — fail loudly if not set in production

### Input validation
- Use Pydantic `EmailStr` for auth email fields
- Add password complexity validation

### Admin pagination
- Add limit/offset to list endpoints (default limit=50)

### Error handling consistency
- tracking_routes.py: Document why silent failure is intentional (analytics non-critical)
  OR return appropriate error status on DB write failure
