# Frontend Coding Rules

## Module Pattern

- Every module exports an `initXxx(callbacks)` function that wires up event listeners and accepts dependencies.
- Callbacks are used to avoid circular imports. Only `main.js` knows about all modules.
- DOM refs should be cached at init time, not re-queried on every function call.

## Shared Utilities

- `API_BASE` is exported from `api.js` — don't redefine `window.location.origin` in modules.
- `t(key)` is exported from `utils.js` — don't create local `const t = (...args) => window.t(...)` wrappers.
- `escapeHtml()` and `npcDisplayName()` are in `utils.js` — use them, don't hand-roll.

## State Management

- Runtime state lives in module-level variables, not in `store.js` (yet).
- Modules expose getters/setters for state that other modules need.
- `saveState()` serializes everything to localStorage + schedules cloud save. Debounce if calling from high-frequency events (e.g., input handlers).
- State is per-case: localStorage keys use `sad_<caseId>_state_v2` prefix. String board server state uses `case_id` query param.

## Theming

- CSS colors in chat, tooltips, and info elements use `var(--custom-prop, dark-fallback)` pattern.
- Each case's `case.js` defines a `theme` object with CSS variable overrides applied at case load.
- When adding new UI colors, always use CSS variables with dark noir fallback defaults so both themed and unthemed cases work.

## DOM & Performance

- Use `document.querySelector` — there is no jQuery or `$` alias.
- Cache DOM refs at init time for elements queried in hot paths (recording loops, render functions).
- Memoize expensive computations that don't change at runtime (e.g., default layout positions).

## Review Checklist

- [ ] No new `const API_BASE = ...` or `const t = ...` — use imports from `api.js` / `utils.js`
- [ ] DOM elements cached at init, not re-queried per call
- [ ] No circular imports between modules
- [ ] `saveState()` calls debounced if triggered by user input
- [ ] New module follows the `initXxx(callbacks)` pattern
- [ ] New hardcoded colors wrapped in `var(--prop, fallback)` for per-case theming
- [ ] Per-case state uses `stateKeyPrefix()` not bare localStorage keys
