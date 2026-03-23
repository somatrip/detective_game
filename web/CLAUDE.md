# Frontend: web/

Vanilla ES6 modules served as static files by FastAPI. No framework, no bundler.

## Running Tests

```bash
npm test          # vitest run (single pass)
npm run test:watch  # vitest in watch mode
```

## Module Architecture

`main.js` is the orchestrator (~740 lines). It imports all modules, calls their `initXxx()` functions with callbacks, and owns the boot sequence. The boot has three phases: shell init (auth, case selector), case loading (dynamic script injection), and game init (per-case state, NPC grid).

### Module dependency flow

```
main.js (orchestrator)
├── api.js          (fetch wrapper, API_BASE)
├── utils.js        (escapeHtml, npcDisplayName, t)
├── state.js        (serialize/deserialize, per-case localStorage)
├── caseSelector.js (case picker, fetches /api/cases)
├── auth.js         (login, cloud save, token refresh)
├── chat.js         (messages, portraits, send/receive)
├── evidence.js     (collection, discovery, rendering)
├── stringboard.js  (deduction board, per-case server state)
├── voice.js        (TTS, STT, recording)
├── tutorial.js     (coach marks)
├── navigation.js   (tabs, NPC grid)
├── settings.js     (settings modal, feedback, language)
└── accusation.js   (arrest flow, outcome)
```

### Adding a new module

1. Create `web/js/mymodule.js` with `export function initMyModule(callbacks) { ... }`
2. Import and call `initMyModule({...})` in `main.js` boot section
3. Pass dependencies as callbacks — don't import other domain modules directly
4. Cache DOM refs at init time, not per-function-call

## Case Data

Case-specific content (NPCs, evidence, i18n strings, portraits) lives in `web/cases/<case-dir>/`. Each case's `case.js` sets `window.CASE` before modules load. Cases are loaded dynamically — `main.js` injects `<script>` tags for `case.js` and `i18n-*.js` after the player selects a case.

### Per-case theming

Each `case.js` exports a `theme` object with CSS variable overrides (e.g., `--noir-warm`, `--msg-user-bg`). Chat and UI elements use `var(--prop, dark-fallback)` so the default noir palette works without overrides, and new cases can supply light or custom themes.

### Per-case state isolation

State is stored under `sad_<caseId>_state_v2` in localStorage. The string board endpoint (`/api/state/stringboard`) accepts a `case_id` query param. `resetStringBoard()` is called on each case init to prevent cross-case data leaks.
