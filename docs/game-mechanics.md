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
7. [NPC Prompt Architecture](#npc-prompt-architecture)
8. [Arrest & Endgame Grading](#arrest--endgame-grading)
9. [Voice I/O](#voice-io)
10. [NPC Portraits & Expressions](#npc-portraits--expressions)
11. [Hint System](#hint-system)
12. [Player Notes](#player-notes)
13. [Save System](#save-system)
14. [Internationalization (i18n)](#internationalization-i18n)
15. [Keycard Log Viewer](#keycard-log-viewer)
16. [Tutorial System](#tutorial-system)
17. [Analytics & Tracking](#analytics--tracking)
18. [API Endpoints](#api-endpoints)
19. [Configuration](#configuration)
20. [Deployment](#deployment)

---

## Architecture Overview

The game is a single-page web application backed by a FastAPI server. The frontend is one monolithic HTML file (`web/index.html`, ~5000 lines) containing all CSS, HTML, and JavaScript. The server brokers communication between the browser and an LLM provider.

```
Browser (web/index.html)
  ├── Loads case.js + i18n-*.js at startup
  ├── Manages all UI state in-memory
  └── Calls server API for chat, voice, auth, saves

Server (FastAPI)
  ├── server/app.py          — Main app, routes, chat pipeline
  ├── server/interrogation.py — Deterministic pressure/rapport engine
  ├── server/llm/             — LLM provider abstraction
  │   ├── factory.py          — Provider factory
  │   ├── classifier.py       — Turn classification + discovery detection
  │   ├── openai_client.py    — OpenAI implementation
  │   ├── anthropic_client.py — Anthropic implementation
  │   └── local_stub.py       — Echo bot for offline testing
  ├── server/cases/           — Case data packages (Python)
  ├── server/auth_routes.py   — Supabase auth + cloud saves
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
Title Card → Hub Screen → Chat Screen → Arrest → Outcome
```

1. **Title Card** — shown once per session. After dismissal, goes straight to the Hub on revisit.
2. **Hub Screen** — grid of NPC portraits (manila folder tabs for Case Board, Dossier, Notes, Settings). Player selects an NPC to interrogate.
3. **Chat Screen** — full-screen interrogation view with text input, pressure/rapport gauges, portrait, and voice controls.
4. **Arrest** — triggered when all canonical evidence types are collected. Player picks a suspect. A modal confirms the accusation.
5. **Outcome** — graded result (slam dunk / plea deal / released) based on which culprit-specific discoveries were found.

### Screen Transitions

The Hub and Chat screens toggle via CSS `.active` class. The title card is a fixed overlay dismissed with a fade-out animation. The outcome screen overlays everything.

---

## Chat Pipeline

Every player message goes through a 5-step server pipeline:

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

### Response to Client

All results are bundled into a `ChatResponse` and returned. The frontend updates conversation history, pressure/rapport gauges, portrait expression, evidence board, and fires discovery toasts.

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

A simple textarea in the Hub's "Notes" tab where the player can type free-form investigation notes. Notes are:
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
language, gameId, savedAt
```

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
| `/api/chat` | POST | Full chat pipeline (classify → deltas → context → LLM → detect) |
| `/api/transcribe` | POST | Speech-to-text via Whisper |
| `/api/speak` | POST | Text-to-speech via gpt-4o-mini-tts |
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
  "peak_pressure": 35
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
pip install -r server/requirements.txt
cp .env.example .env  # Add your API keys
uvicorn server.app:app --port 8000 --reload
# Open http://localhost:8000
```

### Dependencies

**Python** (server): `fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `openai`, `anthropic`, `supabase` (optional)

**JavaScript** (frontend): No npm dependencies. Pure vanilla JS.
