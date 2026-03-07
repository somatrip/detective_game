# Game Mechanics Reference

Everything a new team member needs to understand how Echoes in the Atrium works — from architecture to individual subsystems.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Game Flow](#game-flow)
3. [Chat Pipeline](#chat-pipeline)
4. [Interrogation Engine](#interrogation-engine)
5. [Turn Classification](#turn-classification)
6. [Evidence & Discovery System](#evidence--discovery-system)
7. [Secret Gates](#secret-gates)
8. [Detective's Intuition](#detectives-intuition)
9. [NPC Prompt Architecture](#npc-prompt-architecture)
10. [Arrest & Endgame Grading](#arrest--endgame-grading)
11. [String Board](#string-board)
12. [Voice I/O](#voice-io)
13. [NPC Portraits & Expressions](#npc-portraits--expressions)
14. [Hint System](#hint-system)
15. [Player Notes](#player-notes)
16. [Save System](#save-system)
17. [Internationalization (i18n)](#internationalization-i18n)
18. [Keycard Log Viewer](#keycard-log-viewer)
19. [Tutorial System](#tutorial-system)
20. [Analytics & Tracking](#analytics--tracking)
21. [API Endpoints](#api-endpoints)
22. [Configuration](#configuration)
23. [Deployment](#deployment)

---

## Architecture Overview

The game is a single-page web application backed by a FastAPI server. The frontend consists of `web/index.html` (structure), `web/css/main.css` (styles), and `web/js/main.js` (all game logic). The server brokers communication between the browser and an LLM provider.

```
Browser
  ├── web/index.html           — Page structure (single-screen layout)
  ├── web/css/main.css         — All styles
  ├── web/js/main.js           — All game logic, state, UI
  ├── Loads case.js + i18n-*.js at startup
  ├── Manages all UI state in-memory
  └── Calls server API for chat, voice, auth, saves

Server (FastAPI)
  ├── server/app.py            — Main app, routes, chat pipeline
  ├── server/interrogation.py  — Deterministic pressure/rapport engine + gates + intuition
  ├── server/llm/              — LLM provider abstraction
  │   ├── factory.py           — Provider factory
  │   ├── classifier.py        — Turn classification + discovery detection
  │   ├── openai_client.py     — OpenAI implementation
  │   ├── anthropic_client.py  — Anthropic implementation
  │   └── local_stub.py        — Echo bot for offline testing
  ├── server/cases/            — Case data packages (Python)
  ├── server/auth_routes.py    — Supabase auth + cloud saves
  └── server/tracking_routes.py — Gameplay analytics
```

### Key Design Decisions

- **No frontend framework** — vanilla JS for zero build step and minimal dependencies.
- **State lives on the client** — the server is stateless per request. The frontend sends pressure, rapport, evidence, and history with every chat request.
- **Deterministic mechanics** — pressure/rapport computation is pure math (no LLM involvement). Only the NPC dialogue and turn classification use the LLM.
- **Case-agnostic engine** — the engine reads all case-specific data from a case package. No case-specific logic is hard-coded in the engine.

---

## Game Flow

```
Title Card → Hub (single screen, tab navigation) → Arrest → Outcome
```

1. **Title Card** — shown once per session. After dismissal, goes straight to the Hub on revisit.
2. **Hub Screen** — a single unified screen with manila folder tab navigation. All panels live under one `#hub-screen` container:
   - **Persons of Interest** — NPC portrait grid. Click an NPC to start interrogation.
   - **Case Board** — evidence board, case briefing, keycard logs.
   - **Notes** — free-form investigation notepad.
   - **String Board** — deduction board with draggable cards and string connections.
   - **Chat** (dynamic) — interrogation view, activated when an NPC is selected.
3. **Chat** — when the player clicks an NPC, a dynamic sub-tab with the NPC's name appears in the tab bar and the chat panel activates. The player can switch to Case Board, Notes, or String Board mid-chat without losing context — the NPC tab persists until the player returns to Persons of Interest.
4. **Arrest** — triggered when all canonical evidence types are collected. Player picks a suspect. A modal confirms the accusation.
5. **Outcome** — graded result (slam dunk / plea deal / released) based on which culprit-specific discoveries were found.

### Unified Tab Navigation

There is no separate "chat screen" — everything is a tab within the hub. The `activateTab(tabName)` function handles all panel switching:

- Deactivates all tabs and panels, then activates the requested one.
- Triggers side effects per tab (e.g., `renderStringBoard()` for String Board, `renderEvidence()` for Case Board).
- Shows/hides the audio toggle (only visible during chat).

When an NPC is selected, `addNpcTab(npcId)` dynamically injects a smaller sub-tab next to "Persons of Interest". This sub-tab:
- Is shorter and smaller-font than main tabs (`.manila-tab-npc` class)
- Slightly overlaps the preceding tab for visual hierarchy
- Points to the chat panel (`data-hub-tab="chat"`)
- Is removed by `removeNpcTab()` when the player returns to the suspect grid

Clicking "Persons of Interest" while chatting calls `leaveChat()`, removes the NPC tab, and shows the suspect grid.

---

## Chat Pipeline

Every player message goes through a multi-step server pipeline:

### Step 1 — Classify Player Turn (Secondary LLM)

The player's message is sent to a cheaper LLM (e.g., `gpt-4o-mini` or `claude-haiku-4-5-20251001`) which returns two values:

- **tactic_type** — one of 8 interrogation tactics (see [Turn Classification](#turn-classification))
- **evidence_strength** — `none`, `weak`, `strong`, or `smoking_gun`

The classifier receives the NPC's relevant evidence list, smoking-gun evidence, the player's collected evidence, and recent conversation context.

### Step 2 — Compute Deltas (Deterministic)

The interrogation engine applies the classified tactic and evidence strength against the NPC's archetype to compute pressure/rapport deltas. No LLM involved — pure arithmetic (see [Interrogation Engine](#interrogation-engine)).

### Step 3 — Build Interrogation Context (Deterministic)

A behavioral guidance prompt is assembled based on the NPC's current pressure band, rapport band, tactic used, and evidence strength. This is injected as a system message alongside the NPC's profile.

### Step 4 — Generate NPC Response (Main LLM)

The full system prompt stack is assembled and sent to the primary LLM:

```
[system] world_context_prompt     — shared case facts, character list, rules
[system] timeline                 — NPC's first-person movement log (story bible)
[system] system_prompt            — NPC personality, secrets, conversation rules
[system] interrogation_context    — current turn's behavioral guidance
[system] language instruction     — (Serbian only) gender-correct grammar rules
[user/assistant] ...              — full conversation history
[user] latest message
```

The response is cleaned of any stray tags the LLM may produce.

### Step 5 — Detect Discoveries & Expression (Secondary LLM)

The NPC's response is sent back to the classifier with:
- The discovery catalog filtered to this NPC
- Already-collected discovery IDs
- The player's message for context

Returns:
- **discovery_ids** — new secrets revealed (very conservatively tagged)
- **evidence_ids** — derived from discoveries (each discovery maps to an evidence type)
- **expression** — NPC's emotional state (`neutral`, `guarded`, `distressed`, `angry`, `contemplative`, `smirking`)
- **discovery_summaries** — LLM-generated 1-sentence summaries of what was revealed

### Step 5b — Mechanical Gate Enforcement (Deterministic)

Before accepting discovered secrets, each discovery is checked against **secret gates** (see [Secret Gates](#secret-gates)). A gate defines conditions (pressure threshold, rapport threshold, required evidence/discoveries) that must be met before a secret can be revealed.

- **No gate defined** → discovery passes unconditionally.
- **Gate conditions met** → discovery is accepted and returned to the client.
- **Gate conditions not met** → discovery is blocked. The NPC said something close, but the game withholds the discovery. Blocked discoveries are tracked separately and can trigger a Detective's Intuition line.

### Step 5c — Detective's Intuition (Optional LLM)

If this turn was significant (see [Detective's Intuition](#detectives-intuition)), a short noir-flavored internal monologue line is generated. The NPC's response is also checked for an `[INTUITION]` tag injected by prompt engineering — if found, it's extracted and stripped from the visible response.

The intuition line is returned in the `intuition_line` field of the response.

### Response to Client

All results are bundled into a `ChatResponse` and returned. The frontend updates conversation history, pressure/rapport gauges, portrait expression, evidence board, fires discovery toasts, and optionally appends a Detective's Intuition message bubble.

---

## Interrogation Engine

Located in `server/interrogation.py`. All logic is deterministic.

### Pressure & Rapport

Two hidden numeric values per NPC, both ranging 0–100:
- **Pressure** starts at 0. Represents how cornered the NPC feels.
- **Rapport** starts at 25 (neutral). Represents trust in the detective.

### Bands

Values map to qualitative bands that guide NPC behavior:

| Band | Pressure Range | Rapport Range |
|------|---------------|---------------|
| Calm / Cold | 0–24 | 0–24 |
| Tense / Neutral | 25–49 | 25–49 |
| Shaken / Open | 50–74 | 50–74 |
| Cornered / Trusting | 75–100 | 75–100 |

### Archetypes

Each NPC is assigned one of three archetypes that modify how pressure and rapport scale:

| Archetype | Pressure Scale | Rapport Scale | Key Trait |
|-----------|---------------|---------------|-----------|
| **Proud Executive** | 0.8× | 0.7× | Hard to rattle; big contradiction bonus (+8) |
| **Anxious Insider** | 1.3× | 1.2× | Cracks fast under pressure; huge empathy bonus (+10) |
| **Professional Fixer** | 0.9× | 0.8× | Steady composure; biggest contradiction bonus (+10) |

### Base Deltas

Each tactic type has a base (pressure, rapport) delta:

| Tactic | Pressure | Rapport |
|--------|----------|---------|
| open_ended | +3 | +5 |
| specific_factual | +8 | +2 |
| empathy | -6 | +15 |
| present_evidence | +15 | +0 |
| point_out_contradiction | +22 | -7 |
| direct_accusation | +28 | -12 |
| repeat_pressure | +12 | -4 |
| topic_change | -10 | +4 |

### Evidence Multipliers

Evidence strength multiplies the pressure delta:

| Strength | Multiplier |
|----------|-----------|
| none | 1.0× |
| weak | 1.4× |
| strong | 2.0× |
| smoking_gun | 3.0× |

### Decay Mechanics

Both pressure and rapport decay each turn. This creates a "use it or lose it" dynamic:

- **Pressure decay** — per-archetype base rate (0.5–2.0 per turn). If the NPC has never been cornered (peak < 75) AND the player isn't pushing this turn (delta ≤ 0), **accelerated decay** kicks in at 4× the normal rate. This punishes half-hearted interrogations.
- **Rapport decay** — base rate modified by current pressure level. At pressure 0, rapport decays at 1× rate; at pressure 100, it decays at 3×. This forces a strategic choice: pushing hard erodes trust.

### Peak Pressure Tracking

The system tracks the highest pressure each NPC has ever reached. Once the NPC has been cornered (peak ≥ 75), accelerated decay no longer applies — the player has "broken through" permanently.

### Behavioral Guidance

Each band combination produces a behavioral instruction injected into the NPC's context:
- **Calm**: "You're relaxed. Answer easily, maybe a little dismissive."
- **Cornered**: "You're desperate. Snap, blurt things out, start giving ground."
- **Cold**: "Give as little as possible. One-word answers are fine."
- **Trusting**: "You'll say things you'd normally keep to yourself."

### High-Rapport Helpfulness

At **Open** rapport, NPCs proactively share observations about others (not self-incriminating). At **Trusting**, they actively bring up suspicious things they witnessed and offer theories — but still protect their own secrets.

---

## Turn Classification

Located in `server/llm/classifier.py`. Uses the cheaper model from the active provider.

### Tactic Types

| Tactic | Description |
|--------|-------------|
| `open_ended` | General, exploratory question |
| `specific_factual` | Targeted who/what/when/where question |
| `empathy` | Building rapport, showing understanding |
| `present_evidence` | Explicitly referencing evidence |
| `point_out_contradiction` | Highlighting inconsistencies |
| `direct_accusation` | Directly accusing of wrongdoing |
| `repeat_pressure` | Rephrasing a deflected question |
| `topic_change` | Shifting to a different subject |

### Evidence Strength

Classified relative to the specific NPC being questioned:
- **none** — no evidence referenced
- **weak** — tangentially relevant evidence
- **strong** — directly relevant to this NPC's secrets
- **smoking_gun** — the most damning physical evidence against this NPC

The classifier receives:
- The NPC's `npc_relevant_evidence` list (what evidence matters to them)
- The NPC's `smoking_gun_map` entries (what evidence is devastating)
- The player's currently collected evidence IDs

### Discovery Detection

After the NPC responds, a second classifier call checks whether the NPC revealed any secrets. It receives:
- The full discovery catalog filtered to the current NPC
- Already-collected discovery IDs (to avoid duplicates)
- Both the player's message and NPC's response

The classifier is instructed to be very conservative — merely mentioning a topic is not enough. The NPC must explicitly reveal the specific secret described in the discovery entry.

### Expression Detection

The same classifier call also infers the NPC's emotional expression from their response. Valid expressions: `neutral`, `guarded`, `distressed`, `angry`, `contemplative`, `smirking`. These drive portrait changes in the UI.

---

## Evidence & Discovery System

Evidence is hierarchical: **discoveries** roll up into **evidence types**.

### Structure

```
Evidence Type (e.g., "motive_noah")
  ├── Discovery: "noah-board-ouster" — Noah reveals Mercer planned to oust him
  ├── Discovery: "noah-equity-threat" — Noah reveals Mercer was diluting his shares
  └── Discovery: "noah-ipo-desperation" — Noah reveals the IPO was his lifeline
```

### Data Sources

- **`evidence.py`** (server) — `EVIDENCE_CATALOG` (evidence types with display names), `DISCOVERY_CATALOG` (individual discoveries with NPC, evidence_id, description), `NPC_RELEVANT_EVIDENCE` (per-NPC evidence relevance), `SMOKING_GUN_MAP` (devastating evidence per NPC)
- **`case.js`** (frontend) — `discoveryEvidenceMap` (discovery → evidence_id mapping), `culpritMotiveDiscoveries`, `culpritOpportunityDiscoveries`, `CANONICAL_EVIDENCE` list

### Frontend Flow

1. Server returns `discovery_ids` and `evidence_ids` in the chat response
2. `detectNewDiscoveries()` processes them: creates discovery entries, fires toasts, updates evidence board
3. Evidence board groups discoveries by evidence type under collapsible sections
4. Each NPC with unseen discoveries gets a badge in the Hub grid
5. Discovery toasts slide in from the top-right with a golden animation

### Discovery Summaries

The classifier generates a 1-sentence summary of what the NPC actually revealed. This is preferred over pre-written i18n text because it matches the specific conversation context. The i18n text serves as a fallback.

---

## Secret Gates

A mechanical system that prevents NPCs from revealing certain secrets until the player has earned them through gameplay. Located in `server/interrogation.py` and configured in `server/cases/echoes_in_the_atrium/evidence.py`.

### How Gates Work

Each gated discovery has a list of **condition sets** (OR logic between sets, AND logic within a set):

```python
DISCOVERY_GATES = {
    "noah-embezzlement": [
        {"min_pressure": 70},                                      # Condition 1 (OR)
        {"requires_evidence": ["financial-misconduct"]},           # Condition 2 (OR)
        {"requires_evidence": ["encrypted-schedule"], "min_pressure": 35},  # Condition 3 (OR)
    ],
}
```

The gate opens if **any single condition set** is fully satisfied. Within a condition set, **all requirements** must be met.

### Condition Types

| Key | Type | Description |
|-----|------|-------------|
| `min_pressure` | int (0–100) | Current pressure must be ≥ this value |
| `min_rapport` | int (0–100) | Current rapport must be ≥ this value |
| `requires_evidence` | list[str] | Player must have collected all listed evidence types |
| `requires_discovery` | list[str] | Player must have already unlocked all listed discoveries |

### Gate Enforcement

In Step 5b of the chat pipeline (`_check_gate()` in `server/interrogation.py`):

1. The classifier detects discoveries in the NPC's response.
2. Each discovery is checked against `DISCOVERY_GATES`.
3. If no gate exists → discovery passes unconditionally.
4. If gate conditions are met → discovery accepted.
5. If gate conditions are NOT met → discovery blocked. Added to `blocked_discovery_ids`.

Blocked discoveries are invisible to the player but can trigger a Detective's Intuition line ("You sense there's more to pull on here...").

### Locked Secret Prompts

To prevent the LLM from revealing gated secrets even without being asked, `get_locked_secret_descriptions()` injects behavioral guidance into the NPC's system prompt. Each gated discovery has a corresponding `LOCKED_SECRET_DESCRIPTIONS` entry:

```python
LOCKED_SECRET_DESCRIPTIONS = {
    "noah-murder": (
        "Do NOT confess to or hint at killing Mercer. If the detective accuses "
        "you directly, deny it or demand a lawyer. You will only break when the "
        "detective has proven your motive, opportunity, and access — and then "
        "applies real pressure."
    ),
}
```

These instructions are removed from the prompt once the gate conditions are met.

---

## Detective's Intuition

A noir-flavored internal monologue system that gives the player subtle feedback on significant interrogation moments. Appears as a styled message bubble in the chat.

### Trigger Conditions

`should_show_intuition()` in `server/interrogation.py` returns true when **any** of these occur:

1. **Band transition** — pressure or rapport crossed a band boundary (e.g., calm → tense)
2. **Strong evidence** — player presented `strong` or `smoking_gun` evidence
3. **Discovery registered** — a new secret was revealed this turn
4. **Gated discovery blocked** — the NPC almost revealed something but the gate held
5. **High-impact tactic** — player used `direct_accusation` or `point_out_contradiction`

### Generation

Two methods are used, with the best result selected:

1. **Injection method** — an `[INTUITION]` prompt is appended to the NPC's system prompt asking the LLM to write a detective thought after its in-character response. The `_extract_intuition()` function strips this tag from the visible NPC reply.

2. **Dedicated LLM call** — a separate call to the primary LLM with a focused system prompt:
   > "You are the inner voice of a noir detective. Write ONE brief sentence (max 15 words) about what just happened."

   The user message provides context: NPC name, archetype, recent discoveries, blocked discoveries, and recent conversation excerpt.

### Frontend Display

Intuition messages are rendered as a styled `.msg.intuition` bubble:
- Left-aligned, max 78% width
- Dark gradient background with gold left-border accent
- Dimmed opacity (0.75) for a "thought" appearance
- Header: "✧ A Detective's Intuition"
- Content in italics
- Fade-in animation
- Only shown for suspect chats (not for the partner NPC Lila)

---

## NPC Prompt Architecture

Each NPC receives a layered system prompt:

### Layer 1 — World Context (`world_context.py`)

Shared by all NPCs. Contains:
- Setting description (Lyric Atrium Hotel, fundraiser gala)
- Victim and crime summary
- Character list (8 suspects + partner)
- Case facts everyone knows (death, blackout, lockdown)
- Glossary of key terms
- Response rules (no questions to detective, short answers, no body language narration, physical evidence refusal)

### Layer 2 — Timeline (`timelines.py`)

Per-NPC first-person movement log. Includes:
- Minute-by-minute account of the NPC's evening
- What they saw, heard, and did
- "WHAT YOU ARE HIDING" section — secrets they will only reveal under pressure or with evidence
- "WHAT YOU DO NOT KNOW" section — prevents the NPC from fabricating information

### Layer 3 — System Prompt (`npc_profiles.py`)

Per-NPC personality and conversation rules:
- Character background and personality traits
- Specific conversation rules (how they talk, what they deflect)
- Conspiracy rules (if part of a conspiracy — when to protect co-conspirators, when to crack)
- Knowledge boundaries

### Layer 4 — Interrogation Context (per-turn)

Generated fresh each turn by `build_interrogation_context()`:
- Current archetype, pressure band, rapport band
- Detective's approach and evidence strength
- Behavioral guidance matching the current state
- Special rules for smoking-gun or strong evidence
- High-rapport helpfulness instructions
- **Locked secret instructions** — injected by `get_locked_secret_descriptions()` for any gated discoveries whose conditions are not yet met (see [Secret Gates](#secret-gates))
- **Intuition injection** — when the turn triggers intuition, an `[INTUITION]` prompt is appended asking the NPC to include a detective thought line (see [Detective's Intuition](#detectives-intuition))

### Layer 5 — Language (Serbian only)

When the player selects Serbian, a final system message instructs the NPC to respond in Serbian with correct grammatical gender.

---

## Arrest & Endgame Grading

### Trigger

The `checkEndgameTrigger()` function fires after every discovery. When all entries in `CANONICAL_EVIDENCE` (a list of evidence type IDs) are collected, a modal announces the case is ready for arrest.

### Accusation Flow

1. Player clicks "Make Arrest" in the Hub
2. Modal shows all suspects with portraits
3. Player selects one and confirms
4. `gradeArrest()` evaluates the result

### Grading

```javascript
function gradeArrest() {
  const found = Object.values(discoveries).flat().map(d => d.id);
  const hasMotive = CASE.culpritMotiveDiscoveries.some(d => found.includes(d));
  const hasOpportunity = CASE.culpritOpportunityDiscoveries.some(d => found.includes(d));
  if (hasMotive && hasOpportunity) return "slam_dunk";
  if (hasMotive || hasOpportunity) return "plea_deal";
  return "released";
}
```

Three outcomes:
- **Slam Dunk** — player found at least one motive AND one opportunity discovery for the true culprit
- **Plea Deal** — player found motive OR opportunity, but not both
- **Released** — insufficient evidence against the true culprit (even if they guessed correctly)

The outcome screen displays a themed result with the player's grade and collected evidence summary.

---

## String Board

An interactive deduction board where the player can visually organize suspects and evidence, drag cards around, and draw string connections between related items. Inspired by classic detective "crazy wall" corkboards.

### Data Structure

```javascript
let stringBoard = {
  cardPositions: {},  // cardId → {x, y}
  links: [],          // [{from, to}] — undirected connections
};
```

Card IDs use a prefix format: `"suspect:amelia-reyes"` for suspects, raw evidence IDs for evidence (e.g., `"burned-notebook"`).

### Cards

Two types of cards are rendered:

- **Suspect cards** — one per suspect. Shows portrait image, display name, and a pin circle at the top. Card ID: `"suspect:{npc-id}"`.
- **Evidence cards** — one per collected evidence type. Shows evidence label and linked discovery sub-bullets. Card ID: evidence type ID.

Cards are positioned absolutely within a large board container. Default layout places suspects in a 4-column grid with evidence below.

### Pin Circles & Click-to-Select

Each card has a `.string-board-pin` circle at the top (gold dot). Both the pin **and the card body** can be clicked to select:

1. **First click** — selects the card for linking. The card gets a red border glow (`.selected` class) and the pin turns red (`.active` class).
2. **Click a different card** — toggles a string connection between the two cards, then deselects both.
3. **Click the same card** — deselects it.
4. **Click empty board area** — cancels selection.

Card clicks are distinguished from drags via a 5px movement threshold — if the pointer moves less than 5px between pointerdown and pointerup, it's treated as a click.

### String Connections

`sbToggleLink(fromId, toId)` adds or removes a link. Links are undirected — `{from: A, to: B}` is the same as `{from: B, to: A}`.

Links are rendered as red SVG quadratic bezier curves with 30px sag. Each link line has a click handler for deletion (removes the link on click).

### Drag & Drop

Cards can be dragged to reposition them. The `initStringBoard()` function handles pointer events:
- `pointerdown` on a card starts drag tracking
- `pointermove` updates card position in real-time using board-local coordinates via `sbClientToBoard()`
- `pointerup` saves the new position to `stringBoard.cardPositions` and redraws links

### Pan & Zoom

The board supports viewport navigation:

- **Pan** — drag on empty board area. Tracked via `sbPan` offset applied as CSS `translate()`.
- **Zoom** — scroll wheel (±0.1 per tick) or +/- buttons (±0.15). Range: 0.3× to 2.0×. Zooms toward cursor position. Applied as CSS `scale()`.
- **Transform** — `sbApplyTransform()` sets `transform: translate(${sbPan.x}px, ${sbPan.y}px) scale(${sbZoom})` on the inner container.

### Auto-Positioning

`sbEnsurePositions()` runs on every render and places any cards that don't yet have a position:
- Suspects: 4 columns × N rows, 200px horizontal / 180px vertical spacing
- Evidence: positioned below suspects using `sbFindOpenSlot()` which scans a 6×20 grid for the first unoccupied slot

### State Persistence

String board state is saved both locally (via `saveState()` to localStorage) and to the server:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state/stringboard` | POST | Save card positions and links |
| `/api/state/stringboard` | GET | Load saved state |

Saves are **debounced** — `sbScheduleSave()` waits 2 seconds after the last change before POSTing. On load, `sbLoadFromServer()` compares server state with local state and uses whichever has more card positions.

---

## Voice I/O

Voice is an optional input/output mode using OpenAI's audio APIs.

### Speech-to-Text (Input)

- Uses the browser's MediaRecorder API to capture audio (WebM/Opus)
- Audio is sent to `POST /api/transcribe` which forwards to OpenAI Whisper (`whisper-1`)
- Supports English and Serbian language codes
- 25 MB max file size
- **Auto-silence detection**: When voice mode is active, an `AnalyserNode` monitors the microphone. After ~2 seconds of silence, recording auto-stops and submits.

### Text-to-Speech (Output)

- NPC responses are sent to `POST /api/speak` with the NPC's assigned voice
- Uses `gpt-4o-mini-tts` model with per-NPC voice instructions
- Returns audio/mpeg streamed to the browser
- Audio is cached in-memory (`audioCache` Map) to avoid re-synthesizing repeated text

### Voice Mode

When voice mode is toggled on:
1. The text input is replaced with a pulsing microphone button
2. Recording starts on button press
3. Auto-silence detection stops recording
4. Transcribed text is sent as a chat message
5. NPC response is auto-spoken
6. After TTS playback ends, recording auto-restarts (conversation loop)

### Per-NPC Voices

Each NPC has an assigned OpenAI TTS voice and optional voice styling instruction defined in `npc_profiles.py`. Examples: `alloy`, `coral`, `sage`, `echo`, etc.

---

## NPC Portraits & Expressions

### Portrait Assets

Located in `web/cases/echoes-in-atrium/portraits/{npc-id}/`:
- `neutral.webp` — default expression
- `guarded.webp` — defensive, closed off
- `distressed.webp` — upset, vulnerable
- `angry.webp` — hostile, aggressive
- `contemplative.webp` — thoughtful, reflective
- `smirking.webp` — knowing, sardonic

### Expression Updates

The expression detected in Step 5 of the chat pipeline drives portrait changes. The `setHeaderExpression()` function swaps the portrait image when the expression changes. Expressions are persisted per NPC so they carry across screen transitions.

### Fallback

If a portrait image fails to load, the UI falls back to displaying the NPC's initials in a colored circle.

---

## Hint System

### How It Works

When chatting with Lila Chen (the partner NPC), a "Case Hint" button appears in place of the pressure/rapport gauges.

Clicking the button:
1. Picks a random display key from `CASE.hintDisplayKeys`
2. Sends a hidden system prompt (`t("chat.hint_prompt")`) as the player's message
3. Displays the translated hint key as the visible message
4. Lila responds with guidance based on her timeline's "INVESTIGATIVE NOTES" section

The hint button uses pre-defined display keys so the player sees a natural prompt like "What should I look into next?" while the actual message sent to the LLM may include context about current evidence.

### One-Time Tutorial

The first time a player visits Lila's chat, a tutorial highlights the hint button. After clicking, a `localStorage` flag (`LILA_HINT_STORAGE_KEY`) prevents re-showing the tutorial.

---

## Player Notes

A simple textarea in the Hub's "Notes" tab (`#hub-notes` panel) where the player can type free-form investigation notes. Accessible from any tab including mid-interrogation (the NPC chat persists when switching tabs). Notes are:
- Stored in the `playerNotes` variable
- Persisted to `localStorage` and cloud saves as part of game state
- Restored on page load
- Cleared on game restart

---

## Save System

### Local Storage (Offline-First)

Every state change calls `saveState()` which writes a JSON blob to `localStorage` under `echoes_state_v2`. Includes:

```
conversations, evidence, discoveries, npcInterrogation,
discoveryMessageIndices, playerNotes, activeNpcId,
caseReadyPromptShown, lilaHintSeen, audioEnabled,
language, gameId, savedAt, stringBoard
```

### String Board State (Server-Side)

String board positions and links are additionally saved to a dedicated server endpoint (`/api/state/stringboard`), debounced at 2 seconds. On load, the client compares server vs. local state and uses the richer one.

### Cloud Saves (Supabase)

When logged in, saves are also pushed to a `game_saves` table in Supabase:
- **Debounced** — cloud saves are batched, not fired on every keystroke
- **Single slot** — one save per user (upsert on `user_id`)
- **sendBeacon** — on page unload, a final save is sent via `navigator.sendBeacon()` with the auth token as a query parameter (since beacons can't set headers)

### Cloud Load & Merge

On login, the cloud save is fetched and compared with local state. The richer state wins (based on timestamp and content richness). This handles scenarios where the player played offline and then logs in.

### Auth Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/status` | GET | Check if Supabase is configured |
| `/api/auth/signup` | POST | Create account |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/logout` | POST | Sign out |
| `/api/auth/session` | GET | Validate current token |
| `/api/state/save` | POST | Upsert game state |
| `/api/state/load` | GET | Fetch saved game state |
| `/api/state/delete` | DELETE | Wipe saved state (for restart) |

---

## Internationalization (i18n)

### Setup

Two language files per case:
- `web/cases/echoes-in-atrium/i18n-en.js` — English strings
- `web/cases/echoes-in-atrium/i18n-sr.js` — Serbian strings

Each exports to `window.I18N.en` or `window.I18N.sr` — flat key-value maps.

### Translation Function

```javascript
function t(key) {
  return (window.I18N[currentLang] && window.I18N[currentLang][key])
      || (window.I18N.en && window.I18N.en[key])
      || key;
}
```

Fallback chain: current language → English → raw key.

### HTML Integration

Static elements use `data-i18n` attributes:
```html
<span data-i18n="hub.tab_notes">Notes</span>
```

The `applyTranslations()` function sweeps all `[data-i18n]` elements and replaces their text content. Placeholders use `data-i18n-placeholder`.

### Language Switching

A language toggle in the Hub Settings tab calls `switchLanguage()`, which:
1. Updates `window.currentLang`
2. Re-applies all `data-i18n` translations
3. Persists the choice in game state
4. Adds a system message to the LLM for Serbian gender-correct grammar

---

## Keycard Log Viewer

An interactive evidence viewer in the Case Board that displays hotel keycard access records.

### Data

`web/cases/echoes-in-atrium/data/keycard_logs.json` — an array of entries:
```json
{
  "timestamp": "2024-11-15T21:34:50",
  "zone": "ROOF-OBS",
  "zone_label": "Rooftop Observatory",
  "card_id": "VIP-0001",
  "card_holder": "J. Mercer",
  "card_type": "vip",
  "access": "granted",
  "direction": "entry"
}
```

### UI

Rendered as a scrollable log table with:
- Sortable/filterable columns
- Color-coded card types (VIP, staff, service, security, guest)
- System events highlighted (power failure/restore)
- Key narrative detail: logs prove a card was swiped, but tailgating means they don't prove the cardholder was alone

---

## Tutorial System

A lightweight step-by-step tutorial that highlights UI elements for first-time players.

### Tutorials

- **`chat`** — first visit to any suspect's chat. Highlights the input field, pressure/rapport gauges, and evidence board.
- **`chat_short`** — subsequent suspect visits (shorter version).
- **`lila`** — first visit to Lila's chat. Highlights the hint button.

### Mechanics

Each tutorial is a sequence of steps. Each step highlights a DOM element with a tooltip. Steps advance on click. A localStorage flag tracks which tutorials have been seen.

---

## Analytics & Tracking

Located in `server/tracking_routes.py`. Fire-and-forget analytics from the frontend.

### Tracked Events

| Endpoint | Event | Data |
|----------|-------|------|
| `/api/track/session` | Game session start | session_id, case_id, language |
| `/api/track/chat` | Each chat turn | session_id, npc_id, tactic, evidence, pressure/rapport |
| `/api/track/discovery` | Discovery revealed | session_id, evidence_id, discovery_id, npc_id |
| `/api/track/arrest` | Accusation made | session_id, suspect, grade |

The frontend sends these via `fetch()` with no error handling (fire-and-forget). The server logs them; no database storage is currently implemented.

---

## API Endpoints

### Core Gameplay

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/npcs` | GET | List available NPCs (id, name, voice) |
| `/api/chat` | POST | Full chat pipeline (classify → deltas → context → gates → intuition → LLM → detect) |
| `/api/transcribe` | POST | Speech-to-text via Whisper |
| `/api/speak` | POST | Text-to-speech via gpt-4o-mini-tts |
| `/api/state/stringboard` | POST | Save string board state (card positions + links) |
| `/api/state/stringboard` | GET | Load string board state |
| `/health` | GET | Health check (returns LLM provider) |

### Chat Request Schema

```json
{
  "npc_id": "amelia-reyes",
  "message": "Where were you during the blackout?",
  "history": [{"role": "user", "content": "..."}, ...],
  "language": "en",
  "pressure": 0,
  "rapport": 25,
  "player_evidence_ids": ["motive_noah", "blackout"],
  "player_discovery_ids": ["noah-board-ouster"],
  "peak_pressure": 0,
  "session_id": "uuid-here"
}
```

### Chat Response Schema

```json
{
  "reply": "I was in the maintenance level...",
  "npc_id": "amelia-reyes",
  "history": [...],
  "evidence_ids": ["blackout"],
  "discovery_ids": ["amelia-breaker"],
  "discovery_summaries": {"amelia-breaker": "Amelia admits she pulled the breaker..."},
  "expression": "distressed",
  "pressure": 35,
  "rapport": 20,
  "pressure_band": "tense",
  "rapport_band": "cold",
  "tactic_type": "present_evidence",
  "evidence_strength": "strong",
  "peak_pressure": 35,
  "intuition_line": "She's rattled — the breaker room detail hit close to home."
}
```

---

## Configuration

All configuration is via environment variables (with `.env` file support). Defined in `server/config.py`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `ECHO_LLM_PROVIDER` | `openai` | LLM provider: `openai`, `anthropic`, or `local` |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `ECHO_OPENAI_MODEL` | `gpt-3.5-turbo` | Primary chat model (OpenAI) |
| `ECHO_OPENAI_CLASSIFIER_MODEL` | `gpt-4o-mini` | Classifier model (OpenAI) |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `ECHO_ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Primary chat model (Anthropic) |
| `ECHO_ANTHROPIC_CLASSIFIER_MODEL` | `claude-haiku-4-5-20251001` | Classifier model (Anthropic) |
| `ECHO_OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | TTS model |
| `ECHO_OPENAI_STT_MODEL` | `whisper-1` | STT model |
| `ECHO_CASE_ID` | `echoes_in_the_atrium` | Active case package |
| `SUPABASE_URL` | — | Supabase project URL (for auth/saves) |
| `SUPABASE_KEY` | — | Supabase anon key |

### LLM Providers

| Provider | Primary Model | Classifier Model | Notes |
|----------|--------------|-------------------|-------|
| **OpenAI** | gpt-3.5-turbo | gpt-4o-mini | Default. Voice always uses OpenAI. |
| **Anthropic** | claude-sonnet-4-20250514 | claude-haiku-4-5-20251001 | Better NPC roleplay quality. |
| **Local** | — | — | Echo stub for testing without API keys. |

Note: Voice (TTS/STT) always requires an OpenAI API key, regardless of the primary LLM provider.

---

## Deployment

### Vercel

The project deploys to Vercel as a Python serverless function:
- `vercel.json` routes all traffic through the FastAPI app
- Static assets in `web/` are served by FastAPI's `StaticFiles` mount
- Environment variables are set in the Vercel dashboard

### Local Development

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
uvicorn server.app:app --port 8000 --reload
# Open http://localhost:8000
```

### Dependencies

**Python** (server): `fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `openai`, `anthropic`, `supabase` (optional)

**JavaScript** (frontend): No npm dependencies. Pure vanilla JS.
