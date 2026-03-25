# Project: Solved After Dark

Multi-case LLM-powered detective mystery game. Players interrogate AI-driven suspects to solve mysteries. Ships with two cases: *Echoes in the Atrium* (noir murder mystery, 9 NPCs) and *Something Borrowed, Someone New* (wedding gossip investigation, 7 NPCs). Vanilla ES6 frontend served by a FastAPI backend.

## Tech Stack

- **Backend:** Python 3.11+, FastAPI, Supabase (auth + state persistence)
- **Frontend:** Vanilla ES6 modules (no framework, no bundler), served as static files by FastAPI
- **LLM:** Anthropic Claude / OpenAI (pluggable via `server/llm/` abstraction)
- **Tests:** pytest (backend), vitest + jsdom (frontend)

## Commands

```bash
uvicorn server.app:app --port 8000  # Start dev server
cd web && npm test                   # Run frontend tests (vitest)
pytest                               # Run backend tests
```

## Project Structure

```
server/
  app.py              # FastAPI application + static file serving
  interrogation.py    # Core chat engine (NPC personality + game logic)
  llm/                # LLM provider abstraction (Anthropic, OpenAI, local stub)
  cases/              # Case data packages (auto-discovered at startup)
    echoes_in_the_atrium/       # Noir murder mystery case
    something_borrowed_someone_new/  # Wedding gossip case
  auth_routes.py      # Supabase auth endpoints
  chat_routes.py      # Chat, voice, stringboard state endpoints
  config.py           # Environment config
web/
  js/
    main.js           # Orchestrator — boot sequence, state, wiring
    caseSelector.js   # Case selection UI (fetches /api/cases)
    chat.js           # NPC conversation, portraits, message rendering
    auth.js           # Authentication, cloud save/load
    evidence.js       # Evidence collection, discovery tracking
    stringboard.js    # Deduction board (drag, link, pan, zoom)
    voice.js          # TTS, STT, recording
    tutorial.js       # Onboarding coach marks
    navigation.js     # Tab switching, NPC grid
    settings.js       # Settings, feedback, language
    accusation.js     # Arrest flow, outcome grading
    state.js          # State serialization for save/load
    api.js            # Authenticated fetch wrapper + API_BASE
    utils.js          # escapeHtml, npcDisplayName, t() wrapper
    store.js          # Shared state defaults (not yet wired)
    events.js         # Pub/sub event bus (not yet wired)
  cases/              # Case-specific content (i18n, portraits, case.js)
    echoes-in-atrium/           # Noir case frontend assets
    something-borrowed-someone-new/  # Wedding case frontend assets
tests/                # Backend test suite (pytest)
```

## Conventions

- **Module wiring:** Modules export `initXxx(callbacks)`. The orchestrator (`main.js`) wires them together by passing callbacks, avoiding circular imports.
- **State:** Module-level variables hold runtime state. Shared state accessed via getter/setter callbacks from `main.js`.
- **Multi-case architecture:** The backend auto-discovers case sub-packages in `server/cases/`. The frontend fetches `/api/cases` to populate the case selector, then dynamically loads `case.js` + `i18n-*.js` from `web/cases/<frontend_dir>/`.
- **Case data loading (DB-first):** In production, case data loads from Supabase first (`_load_case_from_db` in `server/cases/__init__.py`), falling back to Python modules only if the case isn't in the DB. All cases must be seeded to Supabase via `python -m scripts.seed_case_data`. When updating Python module case data (prompts, evidence, NPCs), always re-seed with the script.
- **Case data:** All case-specific content loaded from `window.CASE`, set by each case's `case.js`. Per-case state is isolated in localStorage via `sad_<caseId>_state_v2` keys.
- **Case theming:** Each case defines a `theme` object in `case.js` with CSS variable overrides. Chat, tooltip, and UI colors use `var(--custom-prop, fallback)` so cases can override the default noir palette.
- **i18n:** `t(key)` resolves translations (exported from `utils.js`, backed by `window.t`). Language files in `web/cases/<case-dir>/i18n-*.js`.
- **Named exports only** in frontend modules — no default exports.
- **No build system** — plain ES6 modules, `<script type="module">` in HTML.

## Important Rules

- IMPORTANT: `store.js` and `events.js` exist but are **not yet wired** as canonical state sources. All runtime state currently lives in module-level variables. Don't assume modules read from `store.js`.
- IMPORTANT: Frontend modules must not import each other in circles. Use the callback injection pattern via `main.js` to break circular dependencies.
- IMPORTANT: On Vercel, ASGI `lifespan` events do not run. Case loading is handled lazily via `_ensure_all_loaded()` in `server/cases/__init__.py`. Any new startup-dependent code must also work without lifespan.
- IMPORTANT: Chat CSS uses `var(--prop, fallback)` pattern for themeable colors. When adding new hardcoded colors to chat/tooltip/info elements, always wrap them in CSS variables so cases can override them via their `theme` object.
- All new backend endpoints need tests in `tests/`.
- Backend case sub-packages are auto-discovered (any directory with `__init__.py` under `server/cases/`). No need to register new cases manually.
- IMPORTANT: After adding or modifying case data in Python modules, re-seed to Supabase: `python -m scripts.seed_case_data` (all cases) or `python -m scripts.seed_case_data <case_id>` (specific case). Production loads from DB, not Python modules.
- The `server/cases/` directory holds backend case data (Python modules = source of truth, DB = production runtime). Frontend case content lives in `web/cases/` and is loaded client-side.
- String board state is per-case: the `/api/state/stringboard` endpoint accepts a `case_id` query param, and `resetStringBoard()` is called on each case init.

## Git Workflow

- Feature branches off `main`, PRs for review.
- Commit messages: `type: description` (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).

## Reference Docs (read on demand)

- `docs/plans/2026-03-21-frontend-modularization.md` - Read when: understanding the module extraction rationale or planning further modularization.

After every correction, update CLAUDE.md so you don't make that mistake again.

When functionality is changed update CLAUDE.md or the files in the .claude folder as relevant.