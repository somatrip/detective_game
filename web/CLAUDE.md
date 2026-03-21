# Frontend: web/

Vanilla ES6 modules served as static files by FastAPI. No framework, no bundler.

## Running Tests

```bash
npm test          # vitest run (single pass)
npm run test:watch  # vitest in watch mode
```

## Module Architecture

`main.js` is the orchestrator (~560 lines). It imports all modules, calls their `initXxx()` functions with callbacks, and owns the boot sequence.

### Module dependency flow

```
main.js (orchestrator)
├── api.js         (fetch wrapper, API_BASE)
├── utils.js       (escapeHtml, npcDisplayName, t)
├── state.js       (serialize/deserialize)
├── auth.js        (login, cloud save, token refresh)
├── chat.js        (messages, portraits, send/receive)
├── evidence.js    (collection, discovery, rendering)
├── stringboard.js (deduction board)
├── voice.js       (TTS, STT, recording)
├── tutorial.js    (coach marks)
├── navigation.js  (tabs, NPC grid)
├── settings.js    (settings modal, feedback, language)
└── accusation.js  (arrest flow, outcome)
```

### Adding a new module

1. Create `web/js/mymodule.js` with `export function initMyModule(callbacks) { ... }`
2. Import and call `initMyModule({...})` in `main.js` boot section
3. Pass dependencies as callbacks — don't import other domain modules directly
4. Cache DOM refs at init time, not per-function-call

## Case Data

Case-specific content (NPCs, evidence, i18n strings, portraits) lives in `web/cases/echoes-in-atrium/`. The `case.js` file sets `window.CASE` before modules load.
