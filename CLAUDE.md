# Project: Echoes in the Atrium

LLM-powered detective mystery game. Players interrogate nine AI-driven suspects at a luxury hotel gala to solve a murder. Vanilla ES6 frontend served by a FastAPI backend.

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
  cases/              # Case data packages (NPCs, evidence, prompts)
  auth_routes.py      # Supabase auth endpoints
  config.py           # Environment config
web/
  js/
    main.js           # Orchestrator — boot sequence, state, wiring
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
tests/                # Backend test suite (pytest)
```

## Conventions

- **Module wiring:** Modules export `initXxx(callbacks)`. The orchestrator (`main.js`) wires them together by passing callbacks, avoiding circular imports.
- **State:** Module-level variables hold runtime state. Shared state accessed via getter/setter callbacks from `main.js`.
- **Case data:** All case-specific content loaded from `window.CASE`, set by `web/cases/echoes-in-atrium/case.js`.
- **i18n:** `t(key)` resolves translations (exported from `utils.js`, backed by `window.t`). Language files in `web/cases/echoes-in-atrium/i18n-*.js`.
- **Named exports only** in frontend modules — no default exports.
- **No build system** — plain ES6 modules, `<script type="module">` in HTML.

## Important Rules

- IMPORTANT: `store.js` and `events.js` exist but are **not yet wired** as canonical state sources. All runtime state currently lives in module-level variables. Don't assume modules read from `store.js`.
- IMPORTANT: Frontend modules must not import each other in circles. Use the callback injection pattern via `main.js` to break circular dependencies.
- All new backend endpoints need tests in `tests/`.
- The `server/cases/` directory is case-agnostic — case content lives in `web/cases/` and is loaded client-side.

## Git Workflow

- Feature branches off `main`, PRs for review.
- Commit messages: `type: description` (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`).

## Reference Docs (read on demand)

- `docs/plans/2026-03-21-frontend-modularization.md` - Read when: understanding the module extraction rationale or planning further modularization.
