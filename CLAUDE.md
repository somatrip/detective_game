# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with this codebase.

## Project Overview

Echoes in the Atrium is an LLM-powered detective mystery game. Players interrogate nine AI-driven suspects at a luxury hotel gala to solve a murder. The frontend is vanilla ES6 modules served by a FastAPI backend.

## Common Commands

```bash
# Start the server
uvicorn server.app:app --port 8000

# Run frontend tests
cd web && npm test

# Run backend tests
pytest
```

## Architecture

### Backend

FastAPI application in `server/` with LLM provider abstraction (`server/llm/`), interrogation engine (`server/interrogation.py`), and case data packages (`server/cases/`).

### Frontend Modules

The frontend is vanilla ES6 modules (no build system) served by FastAPI:

| Module | Responsibility | ~Lines |
|--------|---------------|--------|
| `main.js` | Boot sequence, orchestrator, state management | ~565 |
| `chat.js` | NPC conversation, portraits, message rendering | ~645 |
| `auth.js` | Authentication, cloud save/load, token refresh | ~550 |
| `stringboard.js` | Deduction board (drag, link, pan, zoom) | ~530 |
| `tutorial.js` | Onboarding coach marks (multi-phase) | ~315 |
| `evidence.js` | Evidence collection, discovery tracking | ~310 |
| `voice.js` | Text-to-speech, speech-to-text, recording | ~360 |
| `settings.js` | Settings modal, feedback, language toggle | ~195 |
| `navigation.js` | Tab switching, NPC grid, screen transitions | ~165 |
| `accusation.js` | Arrest flow, outcome grading | ~145 |
| `state.js` | State serialization for save/load | ~115 |
| `store.js` | Shared game state defaults + reset | ~65 |
| `api.js` | Authenticated fetch wrapper | ~46 |
| `events.js` | Cross-module pub/sub event bus | ~42 |
| `utils.js` | HTML escaping, display name, modal helper | ~33 |

### Key Patterns

- **Callback injection**: Modules expose an `initXxx(callbacks)` function. The orchestrator (`main.js`) wires modules together by passing callbacks, avoiding circular imports.
- **State**: Module-level variables in `main.js` hold runtime state. `store.js` and `events.js` are extracted but not yet wired as the canonical source.
- **Case data**: All case-specific content (NPCs, evidence, strings) is loaded from `window.CASE`, set by `web/cases/echoes-in-atrium/case.js`.
- **i18n**: `window.t(key)` resolves translations. Language files are in `web/cases/echoes-in-atrium/i18n-*.js`.
