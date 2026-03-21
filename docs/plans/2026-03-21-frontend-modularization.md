# Frontend Modularization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the 3,297-line `web/js/main.js` monolith into well-structured ES modules while preserving identical user-facing behavior.

**Architecture:** Extract domain-specific modules behind a shared state store (`store.js`) and lightweight event bus (`events.js`). Each module owns its DOM manipulation, event listeners, and API calls. `main.js` becomes a thin orchestrator (~200 lines) that imports modules and runs the boot sequence. No build system — stays as plain ES6 modules served by FastAPI.

**Tech Stack:** Vanilla ES6 modules, no framework, no bundler. Vitest + jsdom for unit tests on pure-logic modules.

---

## Module Dependency Map

```
main.js (orchestrator — boot sequence, wiring)
├── store.js        (shared reactive state — all game variables)
├── events.js       (pub/sub event bus — cross-module communication)
├── api.js          (existing — fetch wrapper with auth)
├── state.js        (existing — serialize/deserialize for save/load)
├── utils.js        (existing — escapeHtml, npcDisplayName, modal helper)
├── auth.js         (auth UI, login/signup, cloud save/load, token refresh)
├── chat.js         (message rendering, sendMessage, chat input handling)
├── evidence.js     (evidence detection, discovery tracking, rendering)
├── stringboard.js  (deduction board — cards, links, drag, pan, zoom)
├── voice.js        (TTS, STT, recording, voice mode)
├── tutorial.js     (coach marks — multi-phase onboarding)
├── accusation.js   (arrest modal, outcome screen, grading)
├── settings.js     (settings modal, feedback modal, language toggle)
└── navigation.js   (tab switching, screen transitions, NPC grid)
```

## Extraction Order Rationale

We extract from **most independent** to **most connected**:
1. Infrastructure (store, events) — everything depends on these
2. Tutorial — reads DOM, writes localStorage, no game state mutation
3. Voice — self-contained audio I/O, only needs chat integration point
4. String board — self-contained canvas, only reads evidence list
5. Settings — modals + language, light dependencies
6. Auth — cloud save touches state but is otherwise self-contained
7. Evidence — discovery detection, used by chat
8. Accusation — small, depends on evidence + NPC state
9. Navigation — tab switching, screen transitions
10. Chat — most connected (uses evidence, voice, navigation, auth)
11. Main.js cleanup — wire everything together, thin orchestrator

---

### Task 1: Set Up Test Infrastructure

**Files:**
- Create: `web/package.json`
- Create: `web/vitest.config.js`
- Create: `web/js/__tests__/smoke.test.js`

**Step 1: Create package.json with vitest**

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "jsdom": "^26.0.0"
  }
}
```

**Step 2: Create vitest config**

```javascript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    root: ".",
    include: ["js/__tests__/**/*.test.js"],
  },
});
```

**Step 3: Write a smoke test to verify the setup works**

```javascript
// web/js/__tests__/smoke.test.js
import { describe, it, expect } from "vitest";
import { escapeHtml, npcDisplayName } from "../utils.js";

describe("utils", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("extracts NPC display name", () => {
    expect(npcDisplayName("Mira — Curator")).toBe("Mira");
    expect(npcDisplayName("Solo")).toBe("Solo");
    expect(npcDisplayName(null)).toBe("");
  });
});
```

**Step 4: Install dependencies and run tests**

Run: `cd web && npm install && npm test`
Expected: 2 tests pass

**Step 5: Commit**

```bash
git add web/package.json web/vitest.config.js web/js/__tests__/smoke.test.js
git commit -m "chore: add vitest test infrastructure for frontend modules"
```

---

### Task 2: Create the Event Bus (`events.js`)

**Files:**
- Create: `web/js/events.js`
- Create: `web/js/__tests__/events.test.js`

**Step 1: Write failing tests for the event bus**

```javascript
// web/js/__tests__/events.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { on, off, emit, once } from "../events.js";

describe("events", () => {
  beforeEach(() => {
    // Clean slate — off all listeners between tests
    // We'll test this works via absence of calls
  });

  it("calls subscriber when event is emitted", () => {
    const fn = vi.fn();
    on("test", fn);
    emit("test", { value: 42 });
    expect(fn).toHaveBeenCalledWith({ value: 42 });
    off("test", fn);
  });

  it("does not call unsubscribed listener", () => {
    const fn = vi.fn();
    on("test2", fn);
    off("test2", fn);
    emit("test2", {});
    expect(fn).not.toHaveBeenCalled();
  });

  it("once() fires only once", () => {
    const fn = vi.fn();
    once("test3", fn);
    emit("test3", "a");
    emit("test3", "b");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("supports multiple subscribers", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    on("multi", fn1);
    on("multi", fn2);
    emit("multi", "x");
    expect(fn1).toHaveBeenCalledWith("x");
    expect(fn2).toHaveBeenCalledWith("x");
    off("multi", fn1);
    off("multi", fn2);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd web && npm test`
Expected: FAIL — cannot resolve `../events.js`

**Step 3: Implement the event bus**

```javascript
// web/js/events.js
/**
 * Lightweight pub/sub event bus for cross-module communication.
 * Keeps modules decoupled — emitters don't need to know about subscribers.
 *
 * Usage:
 *   import { on, emit } from "./events.js";
 *   on("evidence:collected", (data) => { ... });
 *   emit("evidence:collected", { id: "keycard" });
 */

const _listeners = {};

/** Subscribe to an event. Returns an unsubscribe function. */
export function on(event, fn) {
  (_listeners[event] ||= []).push(fn);
  return () => off(event, fn);
}

/** Unsubscribe from an event. */
export function off(event, fn) {
  const list = _listeners[event];
  if (!list) return;
  const idx = list.indexOf(fn);
  if (idx >= 0) list.splice(idx, 1);
}

/** Emit an event to all subscribers. */
export function emit(event, data) {
  const list = _listeners[event];
  if (!list) return;
  // Iterate a copy so handlers can safely unsubscribe
  for (const fn of [...list]) fn(data);
}

/** Subscribe to an event, but only fire once. */
export function once(event, fn) {
  const wrapper = (data) => {
    off(event, wrapper);
    fn(data);
  };
  on(event, wrapper);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd web && npm test`
Expected: All pass

**Step 5: Commit**

```bash
git add web/js/events.js web/js/__tests__/events.test.js
git commit -m "feat: add lightweight event bus for cross-module communication"
```

---

### Task 3: Create the Shared State Store (`store.js`)

**Files:**
- Create: `web/js/store.js`
- Create: `web/js/__tests__/store.test.js`

**Step 1: Write failing tests**

```javascript
// web/js/__tests__/store.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import { store, resetStore } from "../store.js";
import * as events from "../events.js";

describe("store", () => {
  beforeEach(() => {
    resetStore();
  });

  it("has default values for all game state", () => {
    expect(store.npcs).toEqual([]);
    expect(store.activeNpcId).toBeNull();
    expect(store.conversations).toEqual({});
    expect(store.evidence).toEqual([]);
    expect(store.discoveries).toEqual({});
    expect(store.npcInterrogation).toEqual({});
    expect(store.discoveryMessageIndices).toEqual({});
    expect(store.playerNotes).toBe("");
    expect(store.caseReadyPromptShown).toBe(false);
    expect(store.briefingOpen).toBe(true);
    expect(store.stringBoard).toEqual({ cardPositions: {}, links: [] });
    expect(store.audioEnabled).toBe(false);
    expect(store.gameId).toBe("");
    expect(store.sending).toBe(false);
  });

  it("resetStore restores defaults", () => {
    store.playerNotes = "some notes";
    store.evidence = [{ id: "test" }];
    resetStore();
    expect(store.playerNotes).toBe("");
    expect(store.evidence).toEqual([]);
  });

  it("properties are directly mutable", () => {
    store.activeNpcId = "npc_mira";
    expect(store.activeNpcId).toBe("npc_mira");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd web && npm test`
Expected: FAIL — cannot resolve `../store.js`

**Step 3: Implement the store**

```javascript
// web/js/store.js
/**
 * Shared game state store.
 *
 * All game state lives here as a plain mutable object. Modules import
 * `store` and read/write properties directly. This replaces the
 * module-level variables that were scattered throughout main.js.
 *
 * For cross-module reactivity, modules should use events.js to notify
 * others when important state changes (e.g., emit("evidence:collected")).
 */

function createDefaults() {
  return {
    // --- NPC & conversation ---
    npcs: [],
    activeNpcId: null,
    conversations: {},

    // --- Evidence & discoveries ---
    evidence: [],
    discoveries: {},
    npcInterrogation: {},
    discoveryMessageIndices: {},

    // --- Player ---
    playerNotes: "",
    caseReadyPromptShown: false,
    briefingOpen: true,

    // --- String board ---
    stringBoard: { cardPositions: {}, links: [] },

    // --- Audio ---
    audioEnabled: false,
    npcVoices: {},
    npcVoiceInstructions: {},

    // --- Session ---
    gameId: "",
    sending: false,

    // --- Auth ---
    authUser: null,
    supabaseConfigured: false,

    // --- UI ephemeral (not persisted) ---
    currentExpression: {},
    unseenDiscoveryCount: 0,
    npcsWithNewDiscoveries: new Set(),
    accusationTarget: null,
    subpoenaToastShown: false,
    keycardLogsCache: null,
    feedbackScreenshotFile: null,
  };
}

export const store = createDefaults();

/** Reset all state to defaults. Used on logout / restart. */
export function resetStore() {
  const defaults = createDefaults();
  for (const key of Object.keys(defaults)) {
    store[key] = defaults[key];
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd web && npm test`
Expected: All pass

**Step 5: Commit**

```bash
git add web/js/store.js web/js/__tests__/store.test.js
git commit -m "feat: add shared state store to centralize game variables"
```

---

### Task 4: Extract Tutorial Module

**Files:**
- Create: `web/js/tutorial.js`
- Modify: `web/js/main.js` — remove tutorial code (lines ~2908-3195), import from tutorial.js

The tutorial module is the most self-contained: it reads DOM selectors, shows/hides an overlay, and persists flags to localStorage. No game state mutation.

**Step 1: Create `web/js/tutorial.js`**

Copy lines 2908–3195 from main.js into a new module. The module must export:
- `startTutorial(phase)` — begin a tutorial phase
- `showTutorialStep(idx)` — show a specific step
- `nextTutorialStep()` — advance
- `endTutorial()` — finish
- `skipTutorial()` — skip all steps
- `isTutorialActive()` — check if running
- `chatTutorialPending` getter/setter (flag for deferred chat tutorial)

Key refactoring:
- Move `tutorialSteps`, `tutorialCurrentStep`, `tutorialPhase`, `chatTutorialPending` into module-level variables within tutorial.js (NOT the store — these are UI-only ephemeral state)
- Import `t()` from the i18n system: since `t()` is on `window`, use `window.t` or pass it as a dependency
- The tutorial references `PARTNER_NPC_ID` — accept this as a config param in an `initTutorial(config)` call
- DOM references (`tutorial-overlay`, etc.) are queried at init time

**Step 2: In main.js, replace the tutorial section with imports**

Remove the ~287 lines of tutorial code. Add:
```javascript
import {
  startTutorial, endTutorial, skipTutorial,
  isTutorialActive, initTutorial,
  getChatTutorialPending, setChatTutorialPending,
} from "./tutorial.js";
```

Call `initTutorial({ partnerNpcId: PARTNER_NPC_ID })` during boot.

**Step 3: Verify the app works**

Run: Start the dev server (`python -m server.main` or equivalent), open the app in browser, verify:
- Title card tutorial works on first visit
- Chat tutorial triggers when entering first conversation
- Tutorial can be skipped
- Tutorial can be replayed from settings

**Step 4: Run existing tests (if any break)**

Run: `cd web && npm test`
Expected: All existing tests still pass (tutorial has no unit tests yet — that's fine, it's DOM-heavy)

**Step 5: Commit**

```bash
git add web/js/tutorial.js web/js/main.js
git commit -m "refactor: extract tutorial module from main.js (287 lines)"
```

---

### Task 5: Extract Voice I/O Module

**Files:**
- Create: `web/js/voice.js`
- Modify: `web/js/main.js` — remove voice code (~lines 2614-2827), import from voice.js

**Step 1: Create `web/js/voice.js`**

Move all voice/audio code into this module. Export:
- `initVoice(config)` — set up audio context, load saved preference
- `speakText(text, npcId, cacheKey)` — TTS fetch + playback
- `stopAudio()` — cancel current playback
- `startRecording()` / `stopRecording()` — STT via WebAudio
- `transcribeAudio(blob)` — POST to /api/transcribe
- `enterVoiceMode()` / `exitVoiceMode()` — toggle voice mode
- `isVoiceMode()` — getter
- `setAudioEnabled(enabled)` — toggle TTS

Module-internal state (stays in voice.js, not the store):
- `mediaRecorder`, `audioChunks`, `isRecording`, `isTranscribing`
- `audioCache` (LRU Map), `currentAudio`
- `audioContext`, `analyserNode`, `silenceCheckRAF`
- `voiceMode`, `chatAbortController`, `ttsAbortController`

Dependencies:
- `apiFetch` from `api.js` for authenticated requests
- `store.audioEnabled` from `store.js` for persistence
- Emits `voice:transcribed` event when STT completes (chat.js will subscribe)
- Emits `voice:recording-started`, `voice:recording-stopped` for UI updates

**Step 2: Wire voice.js into main.js**

Replace voice code in main.js with imports. Wire event listeners for mic button, audio toggle to voice module functions.

**Step 3: Verify the app works**

- Toggle audio on/off in chat
- Send a message with TTS enabled — audio plays
- (If mic available) test voice input
- Verify audio replay buttons on messages work

**Step 4: Commit**

```bash
git add web/js/voice.js web/js/main.js
git commit -m "refactor: extract voice I/O module from main.js (213 lines)"
```

---

### Task 6: Extract String Board Module

**Files:**
- Create: `web/js/stringboard.js`
- Modify: `web/js/main.js` — remove string board code (~lines 1663-2150), import from stringboard.js

**Step 1: Create `web/js/stringboard.js`**

This is the most self-contained UI module (487 lines). Move all string board logic. Export:
- `initStringBoard()` — set up drag/pan/zoom listeners
- `renderStringBoard()` — render cards + links
- `sbSaveToServer()` / `sbLoadFromServer()` — async persistence

Module-internal state:
- `sbLinkFrom`, `sbDragging`, `sbSaveTimer`, `sbPan`, `sbZoom`, `sbPanning`

Reads from store:
- `store.stringBoard` (cardPositions, links)
- `store.evidence`, `store.discoveries`, `store.npcs`

Dependencies:
- `apiFetch` / `apiPost` from `api.js`
- `store` from `store.js`
- `escapeHtml`, `npcDisplayName` from `utils.js`
- `emit("stringboard:saved")` after persist

**Step 2: Wire into main.js**

Replace string board code with imports.

**Step 3: Verify**

- Open string board tab
- Drag cards around
- Create links between suspect and evidence
- Delete links (right-click or long-press)
- Pan and zoom the canvas
- Reload page — positions persist

**Step 4: Commit**

```bash
git add web/js/stringboard.js web/js/main.js
git commit -m "refactor: extract string board module from main.js (487 lines)"
```

---

### Task 7: Extract Settings & Feedback Module

**Files:**
- Create: `web/js/settings.js`
- Modify: `web/js/main.js` — remove settings/feedback code (~lines 2156-2308), import

**Step 1: Create `web/js/settings.js`**

Export:
- `initSettings()` — wire up settings modal buttons
- `openSettings()` / `closeSettings()`
- `openFeedback()` / `closeFeedback()`
- `initLanguage()` — set initial language from localStorage
- `switchLanguage(lang)` — change language, emit event

Emits events:
- `settings:language-changed` — so other modules re-render with new language
- `settings:restart-requested` — triggers state reset
- `settings:tutorial-replay` — triggers tutorial restart

**Step 2: Wire into main.js**

**Step 3: Verify**

- Open settings modal
- Switch language EN ↔ SR — all UI text updates
- Submit feedback with screenshot
- Restart investigation from settings

**Step 4: Commit**

```bash
git add web/js/settings.js web/js/main.js
git commit -m "refactor: extract settings and feedback module from main.js (152 lines)"
```

---

### Task 8: Extract Auth & Cloud Save Module

**Files:**
- Create: `web/js/auth.js`
- Modify: `web/js/main.js` — remove auth code (~lines 28-556), import from auth.js

**Step 1: Create `web/js/auth.js`**

Largest extraction (528 lines). Export:
- `initAuthUI()` — wire up auth modal, form handlers
- `openAuthModal()` / `closeAuthModal()`
- `restoreAuthSession()` — validate token on page load
- `cloudSaveState(stateObj)` — persist to Supabase
- `cloudLoadState()` — load from Supabase
- `mergeCloudState(localState)` — smart merge
- `flushCloudSave()` — debounced persist
- `updateAuthUI()` — refresh login/logout button state
- `getAuthUser()` — returns current auth user (used by api.js)
- `logout()` — clear session

Reads/writes from store:
- `store.authUser`
- `store.supabaseConfigured`

Emits events:
- `auth:logged-in`, `auth:logged-out` — other modules react
- `auth:cloud-state-loaded` — triggers state merge

**Step 2: Wire into main.js**

Update `initApiClient()` call to use `getAuthUser` from auth.js.

**Step 3: Verify**

- Sign up / log in / log out
- Cloud save works (check network tab)
- Returning user sees merged state
- Token refresh works (wait for expiry or simulate)

**Step 4: Commit**

```bash
git add web/js/auth.js web/js/main.js
git commit -m "refactor: extract auth and cloud save module from main.js (528 lines)"
```

---

### Task 9: Extract Evidence & Discovery Module

**Files:**
- Create: `web/js/evidence.js`
- Modify: `web/js/main.js` — remove evidence code (~lines 1438-1661), import

**Step 1: Create `web/js/evidence.js`**

Export:
- `detectNewDiscoveries(discoveryIds, npcId, summaries)` — process server discoveries
- `detectEvidence(evidenceIds, npcId)` — add collected evidence
- `renderEvidence()` — evidence list on case board
- `checkEndgameTrigger()` — show "all evidence collected" modal
- `seedStartingEvidence()` — populate initial evidence
- `gradeArrest()` — evaluate correctness

Reads/writes store:
- `store.evidence`, `store.discoveries`, `store.discoveryMessageIndices`
- `store.npcInterrogation`, `store.caseReadyPromptShown`
- `store.unseenDiscoveryCount`, `store.npcsWithNewDiscoveries`

Emits:
- `evidence:collected` — for string board to re-render
- `evidence:discovery-found` — for NPC grid badges
- `evidence:endgame-reached` — for case-ready modal

**Step 2: Wire into main.js**

**Step 3: Verify**

- Chat with NPCs — evidence appears in case board
- Discovery toasts show up
- NPC grid badges update
- "All evidence collected" modal triggers correctly

**Step 4: Commit**

```bash
git add web/js/evidence.js web/js/main.js
git commit -m "refactor: extract evidence and discovery module from main.js (223 lines)"
```

---

### Task 10: Extract Accusation Module

**Files:**
- Create: `web/js/accusation.js`
- Modify: `web/js/main.js` — remove accusation code (~lines 2309-2383), import

**Step 1: Create `web/js/accusation.js`**

Export:
- `openAccusationModal()` — show suspect selection grid
- `closeAccusationModal()` — cancel
- `resolveAccusation()` — POST arrest, show outcome

Dependencies: `store`, `apiPost`, evidence module's `gradeArrest()`

**Step 2: Wire into main.js**

**Step 3: Verify**

- Click "Make Arrest" button
- Select a suspect
- Confirm — outcome screen shows correct result
- Restart button works from outcome screen

**Step 4: Commit**

```bash
git add web/js/accusation.js web/js/main.js
git commit -m "refactor: extract accusation flow from main.js (74 lines)"
```

---

### Task 11: Extract Navigation Module

**Files:**
- Create: `web/js/navigation.js`
- Modify: `web/js/main.js` — remove navigation code, import

**Step 1: Create `web/js/navigation.js`**

Export:
- `initNavigation()` — wire up tab click listeners
- `activateTab(tabName)` — switch hub tabs
- `addNpcTab(npcId)` / `removeNpcTab()` — dynamic chat tab
- `showHub()` / `showChat()` — screen transitions
- `renderNpcGrid()` — NPC cards with portrait + badges

Subscribes to events:
- `evidence:discovery-found` — update NPC grid badges

**Step 2: Wire into main.js**

**Step 3: Verify**

- All tabs switch correctly (Suspects, Case Board, Notes, String Board)
- Clicking an NPC opens chat with correct tab
- Back button returns to hub
- Discovery badges on NPC cards

**Step 4: Commit**

```bash
git add web/js/navigation.js web/js/main.js
git commit -m "refactor: extract navigation and NPC grid module from main.js (~200 lines)"
```

---

### Task 12: Extract Chat Module

**Files:**
- Create: `web/js/chat.js`
- Modify: `web/js/main.js` — remove chat code (~lines 1162-1436), import

**Step 1: Create `web/js/chat.js`**

The most connected module. Export:
- `initChat()` — wire send button, input, hint button, cancel button
- `renderMessages()` — display conversation history
- `sendMessage(overrideText, displayText)` — main chat flow
- `selectNpc(npcId)` — enter chat with NPC
- `appendMessageBubble(role, content, messageIndex)` — render one message

Dependencies:
- `store` — conversations, activeNpcId, sending, npcInterrogation
- `apiPost` — send chat messages
- `evidence.js` — `detectEvidence()`, `detectNewDiscoveries()`
- `voice.js` — `speakText()`, auto-play in voice mode
- `navigation.js` — `showChat()`, portrait updates
- `events.js` — subscribe to `voice:transcribed` to auto-send
- `utils.js` — `escapeHtml()`

**Step 2: Wire into main.js**

This is the critical extraction — chat touches everything. After this, main.js should be dramatically smaller.

**Step 3: Verify thoroughly**

- Send messages to multiple NPCs
- Messages render correctly (markdown formatting)
- Expression changes (portrait updates)
- Evidence/discovery detection from responses
- Hint button works
- Cancel button aborts in-flight request
- TTS auto-plays when audio is on
- Retry button appears on error
- Conversation persists across page reload

**Step 4: Commit**

```bash
git add web/js/chat.js web/js/main.js
git commit -m "refactor: extract chat module from main.js (274 lines)"
```

---

### Task 13: Clean Up main.js as Thin Orchestrator

**Files:**
- Modify: `web/js/main.js` — should now be ~150-250 lines

**Step 1: Audit remaining code in main.js**

After all extractions, main.js should only contain:
1. Imports from all modules
2. CASE constant setup (lines 11-19)
3. `init()` function that calls each module's init
4. Boot sequence (DOMContentLoaded or module-level)
5. `saveState()` / `loadState()` wiring (delegates to store + state.js)
6. Visibility change / beforeunload handlers

**Step 2: Remove any dead code, stale comments, unused variables**

Verify no functions remain that should have been extracted.

**Step 3: Add a header comment documenting the module architecture**

```javascript
/* ================================================================
   ECHOES IN THE ATRIUM — Game Frontend (Orchestrator)
   ================================================================
   This file wires together the game's ES modules and runs the
   boot sequence. All domain logic lives in dedicated modules:

   auth.js        — Authentication & cloud save
   chat.js        — NPC conversation UI
   evidence.js    — Evidence collection & discovery tracking
   stringboard.js — Deduction board (drag, link, pan, zoom)
   voice.js       — Text-to-speech & speech-to-text
   tutorial.js    — Onboarding coach marks
   accusation.js  — Arrest flow & outcome grading
   settings.js    — Settings, feedback, language
   navigation.js  — Tab switching, NPC grid, screen transitions
   store.js       — Shared game state
   events.js      — Cross-module event bus
   state.js       — State serialization for save/load
   api.js         — Authenticated fetch wrapper
   utils.js       — HTML escaping, display name, modal helper
   ================================================================ */
```

**Step 4: Full end-to-end verification**

Run through the complete game flow:
1. Fresh visit → title card → auth prompt → skip → hub
2. Tutorial plays through
3. Chat with 2-3 NPCs, collect evidence
4. Check case board — evidence and discoveries listed
5. Open string board — drag cards, create links
6. Write notes
7. Switch languages
8. Open settings, submit feedback
9. Reload page — all state persists
10. Make an arrest — outcome screen

**Step 5: Run all tests**

Run: `cd web && npm test`
Expected: All pass

**Step 6: Commit**

```bash
git add web/js/main.js
git commit -m "refactor: slim main.js to thin orchestrator (~200 lines)"
```

---

### Task 14: Update state.js for New Module Structure

**Files:**
- Modify: `web/js/state.js`
- Modify: `web/js/__tests__/store.test.js` — add serialization round-trip test

**Step 1: Update state.js to read from store**

The existing `buildStateObject` and `applyStateObject` accept explicit params. Update them (or add wrappers) to work directly with the store:

```javascript
import { store } from "./store.js";

export function buildStateFromStore(opts) {
  return buildStateObject(store, opts);
}

export function applyStateToStore(saved, opts) {
  const result = applyStateObject(saved, opts);
  if (!result) return null;
  Object.assign(store, result);
  return result;
}
```

**Step 2: Write a round-trip test**

```javascript
it("round-trips state through build/apply", () => {
  store.playerNotes = "test notes";
  store.evidence = [{ id: "ev1", label: "Test" }];
  const opts = {
    caseId: "test",
    tutorialStorageKey: "t",
    titleStorageKey: "ts",
    lilaHintStorageKey: "lh",
  };
  const serialized = buildStateFromStore(opts);
  resetStore();
  applyStateToStore(serialized, opts);
  expect(store.playerNotes).toBe("test notes");
  expect(store.evidence).toEqual([{ id: "ev1", label: "Test" }]);
});
```

**Step 3: Run tests**

Run: `cd web && npm test`
Expected: All pass

**Step 4: Commit**

```bash
git add web/js/state.js web/js/__tests__/store.test.js
git commit -m "feat: add store-aware state serialization helpers"
```

---

### Task 15: Final Review & Documentation

**Files:**
- Modify: `CLAUDE.md` — update architecture section

**Step 1: Update CLAUDE.md**

Add/update the frontend architecture section to reflect the new module structure:

```markdown
## Frontend Architecture

The frontend is vanilla ES6 modules (no build system) served by FastAPI:

| Module | Responsibility | Lines |
|--------|---------------|-------|
| `main.js` | Boot sequence, orchestrator | ~200 |
| `store.js` | Shared game state | ~60 |
| `events.js` | Cross-module pub/sub | ~40 |
| `auth.js` | Auth, cloud save | ~530 |
| `chat.js` | NPC conversation | ~280 |
| `evidence.js` | Evidence & discovery | ~225 |
| `stringboard.js` | Deduction board | ~490 |
| `voice.js` | TTS & STT | ~215 |
| `tutorial.js` | Onboarding | ~290 |
| `accusation.js` | Arrest flow | ~75 |
| `settings.js` | Settings & feedback | ~155 |
| `navigation.js` | Tabs & NPC grid | ~200 |
| `state.js` | Save/load serialization | ~120 |
| `api.js` | Authenticated fetch | ~47 |
| `utils.js` | HTML escape, helpers | ~34 |
```

**Step 2: Verify no regressions one final time**

Full end-to-end test in browser.

**Step 3: Run all tests**

Run: `cd web && npm test`

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with new frontend module architecture"
```

---

## Summary

| Task | Module | Lines Moved | Cumulative main.js |
|------|--------|------------|-------------------|
| 1 | Test infrastructure | 0 | 3,297 |
| 2 | events.js | 0 (new) | 3,297 |
| 3 | store.js | 0 (new) | 3,297 |
| 4 | tutorial.js | ~287 | ~3,010 |
| 5 | voice.js | ~213 | ~2,797 |
| 6 | stringboard.js | ~487 | ~2,310 |
| 7 | settings.js | ~152 | ~2,158 |
| 8 | auth.js | ~528 | ~1,630 |
| 9 | evidence.js | ~223 | ~1,407 |
| 10 | accusation.js | ~74 | ~1,333 |
| 11 | navigation.js | ~200 | ~1,133 |
| 12 | chat.js | ~274 | ~859 |
| 13 | main.js cleanup | ~650 (dead code/wiring) | **~200** |
| 14 | state.js update | 0 | ~200 |
| 15 | Documentation | 0 | ~200 |

**Result:** `main.js` goes from 3,297 → ~200 lines. 15 focused modules. Same user-facing UI. No framework. No build system.
