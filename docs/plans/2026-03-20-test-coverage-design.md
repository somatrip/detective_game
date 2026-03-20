# Test Coverage Design: Bottom-Up Unit Tests

**Date:** 2026-03-20
**Goal:** Build a safety net of unit tests across all untested server modules so we can confidently refactor the frontend and backend later.
**Approach:** Bottom-up unit tests with full mocking of external dependencies (LLM, Supabase).

## Test Infrastructure

### `tests/conftest.py` — Shared Fixtures

- `mock_supabase` — patches `server.supabase_client` to return a `MagicMock`. Reusable across auth, admin, feedback, and tracking tests.
- `mock_llm_client` — patches the LLM factory to return a mock that yields canned responses. Used by classifier and any test that touches LLM calls.
- `api_client` — FastAPI `TestClient` wrapping the app, using mock fixtures. Moved from `test_api.py` to be shared.
- `sample_case_data` — loads the real `echoes_in_the_atrium` case for tests needing NPC/evidence data.

No new dependencies. Uses `unittest.mock` (stdlib) + `pytest` fixtures only.

## Module Priority & Test Plan

### Tier 1 — Core Game Logic

1. **`test_classifier.py`** — `server/llm/classifier.py`
   - Mock LLM call, verify parsing of evidence IDs and player tactics
   - Test malformed LLM responses
   - Test the silent `except → {}` failure mode explicitly
   - ~10-12 tests

2. **`test_factory.py`** — `server/llm/factory.py`
   - Verify correct client class returned per provider string
   - Test unknown provider raises
   - ~4-5 tests

3. **`test_npc_registry.py`** — `server/npc_registry.py`
   - Verify NPCs load from case data
   - Test error on missing NPC
   - ~4-5 tests

### Tier 2 — Auth & Admin

4. **`test_auth_routes.py`** — `server/auth_routes.py`
   - Mock Supabase client for signup, login, logout, session refresh
   - Test correct status codes and response shapes
   - Test error handling: invalid credentials, expired tokens, missing headers
   - ~12-15 tests

5. **`test_admin_auth.py`** — `server/admin_auth.py`
   - Mock Supabase user lookup
   - Test admin accepted, non-admin rejected
   - ~4-5 tests

6. **`test_admin_routes.py`** — `server/admin_routes.py`
   - Mock Supabase for CRUD operations
   - Test each endpoint happy path + error cases
   - ~12-15 tests

### Tier 3 — Supporting Modules

7. **`test_feedback_routes.py`** — `server/feedback_routes.py`
   - Mock Supabase insert, verify validation
   - ~4-5 tests

8. **`test_tracking_routes.py`** — `server/tracking_routes.py`
   - Mock Supabase, verify event shape
   - ~4-5 tests

9. **`test_schemas.py`** — `server/schemas.py`
   - Test invalid payloads raise `ValidationError`
   - Test valid payloads parse correctly
   - ~8-10 tests

10. **`test_config.py`** — `server/config.py`
    - Test alias fallbacks and defaults
    - Test validation errors for missing required values
    - ~5-6 tests

## Test Patterns

- **Naming:** `tests/test_<module>.py` mirrors the server module.
- **Mocking:** Patch at the module boundary (LLM calls, Supabase calls), never deep internals.
- **Assertions:** Test behavior, not implementation. Verify return values and side effects.
- **Error paths:** Every module gets at least one failure-mode test.
- **No new dependencies.** `unittest.mock.patch`, `MagicMock`, `pytest.raises`, FastAPI `TestClient`.

## Success Criteria

1. `tests/conftest.py` exists with shared fixtures
2. 10 new test files covering all untested server modules
3. ~80-100 new tests (total suite: 120-140)
4. All tests pass with `pytest` — no external services or API keys needed
5. Existing 40 tests still pass — no regressions

## Out of Scope

- Frontend tests (next project, after refactor)
- E2E/integration tests beyond existing `test_api.py`
- CI/CD pipeline setup
- Production code changes (unless a test reveals a bug that should be fixed)
