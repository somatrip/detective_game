# Case Creation Guide

How to build a new detective mystery for the engine. Uses *Echoes in the Atrium* as the reference implementation throughout.

---

## Architecture Overview

A case is split across server (Python) and frontend (JS). The engine is generic — it reads everything from the case package and never hard-codes case-specific values.

```
server/cases/your_case_id/          # Python package
├── __init__.py                     # Assembles CaseData
├── world_context.py                # Shared world knowledge (all NPCs receive this)
├── archetypes.py                   # NPC → archetype mapping
├── npc_profiles.py                 # NPCProfile per character
├── timelines.py                    # First-person movement logs per NPC
└── evidence.py                     # Evidence catalog, discoveries, scoring data

web/cases/your-case-slug/           # Frontend assets
├── case.js                         # Case manifest (window.CASE)
├── i18n-en.js                      # English text
├── i18n-sr.js                      # Serbian text
├── data/                           # Case-specific data files
│   └── keycard_logs.json           # (or equivalent interactive evidence)
└── portraits/                      # NPC portrait images
    ├── npc-id/
    │   ├── neutral.webp
    │   ├── guarded.webp
    │   ├── distressed.webp
    │   ├── angry.webp
    │   ├── contemplative.webp
    │   └── smirking.webp
    └── ...
```

### Data Flow

1. Server loads the case package at startup via `load_case(case_id)`
2. Frontend loads `case.js` + i18n files before the engine boots
3. On each player turn:
   - Frontend sends `ChatRequest` with message, NPC id, pressure/rapport state, collected evidence
   - Backend classifies the player's tactic and evidence strength (LLM call)
   - Interrogation engine computes pressure/rapport deltas based on archetype
   - Backend builds interrogation context (bands, guidance) and calls the LLM with: `world_context` → `timeline` → `system_prompt` → `interrogation_context` → `chat history`
   - A second LLM call detects any discoveries the NPC revealed
   - Response returns with updated state, discoveries, and expression

---

## Server-Side Files

### `__init__.py` — Case Assembly

Imports all submodules and builds the `CaseData` frozen dataclass. This is the only file the engine imports directly.

```python
from .. import CaseData
from .archetypes import NPC_ARCHETYPE_MAP
from .evidence import (
    DISCOVERY_CATALOG, EVIDENCE_CATALOG_DESCRIPTIONS,
    NPC_RELEVANT_EVIDENCE, SMOKING_GUN_MAP,
)
from .npc_profiles import NPC_PROFILES
from .world_context import WORLD_CONTEXT_PROMPT

case_data = CaseData(
    case_id="your_case_id",
    title="Your Case Title",
    world_context_prompt=WORLD_CONTEXT_PROMPT,
    npc_profiles=NPC_PROFILES,
    npc_archetype_map=NPC_ARCHETYPE_MAP,
    npc_relevant_evidence=NPC_RELEVANT_EVIDENCE,
    smoking_gun_map=SMOKING_GUN_MAP,
    evidence_catalog=EVIDENCE_CATALOG_DESCRIPTIONS,
    discovery_catalog=DISCOVERY_CATALOG,
)
```

**CaseData fields:**

| Field | Type | Description |
|-------|------|-------------|
| `case_id` | `str` | Python package name, underscore-separated |
| `title` | `str` | Display title |
| `world_context_prompt` | `str` | Shared context injected into every NPC's system messages |
| `npc_profiles` | `Dict[str, NPCProfile]` | NPC id → profile |
| `npc_archetype_map` | `Dict[str, str]` | NPC id → archetype id |
| `npc_relevant_evidence` | `Dict[str, List[str]]` | NPC id → evidence ids that affect them |
| `smoking_gun_map` | `Dict[str, List[str]]` | NPC id → most damning evidence |
| `evidence_catalog` | `Dict[str, str]` | Evidence id → description for classifier |
| `discovery_catalog` | `Dict[str, Dict]` | Discovery id → `{npc_id, evidence_id, description}` |

---

### `world_context.py` — Shared World Knowledge

A single string (`WORLD_CONTEXT_PROMPT`) injected as the first system message for every NPC. This is the ground truth that all characters share.

**Required sections:**

1. **Setting** — Location, event, victim identity, what happened
2. **Murder facts** — Time of death range, cause, key forensic details
3. **Player identity** — Establish the player as the lead detective; the partner NPC is not the player
4. **Character list** — Complete and EXCLUSIVE list of all NPCs with roles. Include a note that NPCs must not invent or reference anyone not on this list
5. **Shared knowledge** — Facts everyone at the scene would know (victim is dead, police are here, building is locked down)
6. **Glossary** — Define key terms, items, locations, and card IDs that NPCs will reference. Consistency matters — if two NPCs mention the same keycard, they must use the same ID
7. **Response rules** — These are critical for consistent NPC behavior:
   - No questions back to the detective (suspects answer, they don't interrogate)
   - Natural speech (contractions, fragments, filler words)
   - Short responses (2-4 sentences typical)
   - No narrated body language or italicized actions
   - No flowery/dramatic language
8. **Physical evidence handling** — NPCs must refuse to hand over physical items (require subpoena), but CAN and SHOULD talk about what they know verbally

**Example glossary entry:**
```
- ENGR-0001: Amelia Reyes's engineering keycard, grants staff-level access to the
  service elevator, freight elevator, rooftop stairwell, and restricted service areas.
```

---

### `archetypes.py` — Behavioral Archetypes

Maps each NPC to one of three engine-level archetypes that control how pressure and rapport mechanics work.

```python
NPC_ARCHETYPE_MAP: Dict[str, str] = {
    "npc-id": "proud_executive",
    ...
}
```

**Available archetypes:**

| Archetype | Pressure Scale | Rapport Scale | Best Tactic | Weakness |
|-----------|---------------|---------------|-------------|----------|
| `proud_executive` | 0.8 (resistant) | 0.7 | Contradictions (bonus 8.0) | Logical traps, evidence |
| `anxious_insider` | 1.3 (susceptible) | 1.2 | Empathy (bonus 10.0) | Emotional pressure, kindness |
| `professional_fixer` | 0.9 (balanced) | 0.8 | Contradictions (bonus 10.0) | Persistent contradiction |

**Assignment guidelines:**
- **proud_executive** — Authority figures, intellectuals, people with ego. Hard to pressure, but crumble when caught in logical contradictions
- **anxious_insider** — Nervous, guilty-feeling, low-status characters. Crack under pressure quickly but also respond well to empathy
- **professional_fixer** — Composed, practical, experienced. Hardest to rattle (highest pressure decay), but contradiction evidence is devastating

---

### `npc_profiles.py` — Character Definitions

Each NPC is an `NPCProfile` frozen dataclass:

```python
@dataclass(frozen=True)
class NPCProfile:
    npc_id: str              # "amelia-reyes" (kebab-case)
    display_name: str        # "Amelia Reyes — Head Engineer"
    system_prompt: str       # Personality + behavioral rules
    timeline: str            # From timelines.py
    voice: str               # OpenAI TTS voice id
    voice_instruction: str   # Voice style guidance
    gender: str              # "male" or "female"
```

**Available voices:** `alloy`, `ash`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`

#### System Prompt Structure

The system prompt defines personality and behavioral rules. Structure it with these sections:

1. **Personality paragraph** — Who they are, how they talk, their emotional register
2. **Conversation Rules** — Bullet list of when to reveal/conceal information, keyed to specific evidence
3. **Conspiracy/Alliance Rules** (if applicable) — How they protect co-conspirators, what breaks them
4. **What They Do NOT Know** — Critical for preventing hallucination. List everything other NPCs know that this character does not

**Key principles:**
- Tie revelations to specific evidence: "Admit X only if confronted with Y"
- Layer secrets by difficulty: some revealed easily, others only under combined pressure + evidence
- Include knowledge boundaries — what the NPC genuinely doesn't know prevents the LLM from inventing cross-contamination
- If NPCs are co-conspirators, define protection rules and break conditions symmetrically

**Example knowledge boundary:**
```
WHAT YOU DO NOT KNOW:
- You do NOT know that Eddie gave your lanyard to Noah (you think Eddie still has it).
- You do NOT know about the murder on the rooftop.
- You do NOT know about Noah's embezzlement or the board vote.
```

---

### `timelines.py` — The Story Bible

Each NPC gets a first-person timeline string — their complete movement log and knowledge for the night. This is injected as a separate system message between `world_context_prompt` and `system_prompt`.

**Required sections per timeline:**

1. **Chronological movements** — Specific times and locations. Use timestamps consistently
2. **Secrets** — Mark with `(SECRET: ...)` inline
3. **Conspiracy details** (if applicable) — What they planned, with whom, what they know vs. don't know
4. **Public Story** — What they initially tell the detective (their cover story)
5. **What They Are Hiding** — Bullet list of secrets, from least to most guarded
6. **Where Their Story Breaks** — What evidence contradicts their claims

**Special case — the killer:** Give them a COVER STORY instead of their real timeline. Structure it as:
- Claimed timeline (the lies)
- Specific lies and what evidence breaks each one
- How they respond as evidence mounts (escalating admissions)

**Timeline design principles:**
- Every NPC's timeline should contain at least one piece of information useful to the investigation
- Movements should create a web of corroboration and contradiction — NPC A's timeline places NPC B somewhere that contradicts B's story
- Include ambient detail (what they were doing, how they felt) to make the LLM's responses more natural
- Keep timestamps precise and internally consistent across all NPC timelines
- Mark the murder window clearly so every NPC has a verifiable (or unverifiable) alibi

**Conspiracy timelines** should define:
- When conspirators planned together
- What each person's role was
- What they do/don't know about each other's actions
- The agreed cover story if caught
- What makes the cover story fall apart

---

### `evidence.py` — Investigation Data

Four dictionaries that power the evidence and discovery system.

#### `NPC_RELEVANT_EVIDENCE`
Maps each NPC to evidence types that affect them during interrogation. Used by the classifier to score evidence strength when the player presents evidence to a specific NPC.

```python
NPC_RELEVANT_EVIDENCE: Dict[str, List[str]] = {
    "noah-sterling": ["financial-misconduct", "encrypted-schedule", "key-trail", "surveillance"],
    "amelia-reyes": ["key-trail", "lockpick-marks", "power-outage", "conspiracy"],
    ...
}
```

#### `SMOKING_GUN_MAP`
The most damning evidence for specific NPCs. When presented, triggers maximum pressure and special behavioral guidance.

```python
SMOKING_GUN_MAP: Dict[str, List[str]] = {
    "matthias-holt": ["data-sales"],
    "amelia-reyes": ["lockpick-marks"],
    ...
}
```

Not every NPC needs a smoking gun. The killer typically doesn't have one — their guilt is assembled from multiple evidence chains.

#### `EVIDENCE_CATALOG_DESCRIPTIONS`
Full descriptions of each evidence type. Used by the classifier to determine evidence strength. Write these as factual, specific statements.

```python
EVIDENCE_CATALOG_DESCRIPTIONS: Dict[str, str] = {
    "burned-notebook": "A burned notebook fragment or threat list found in the incinerator",
    "key-trail": "The maintenance-room key and engineering keycard were lent from Amelia to Eddie, then pressured from Eddie to Noah",
    ...
}
```

#### `DISCOVERY_CATALOG`
The core investigation data structure. Each entry defines a specific piece of information an NPC can reveal. The classifier checks NPC responses against these descriptions to detect when information has been disclosed.

```python
DISCOVERY_CATALOG: Dict[str, Dict[str, str]] = {
    "amelia-key-loan": {
        "npc_id": "amelia-reyes",        # Which NPC reveals this
        "evidence_id": "key-trail",       # Parent evidence category
        "description": "Amelia admits she lent her maintenance-room key and engineering keycard to Eddie Voss",
    },
    ...
}
```

**Discovery design principles:**
- Each discovery should be a specific, verifiable fact — not vague impressions
- Multiple discoveries can map to the same evidence type (e.g., three witnesses each contribute a `surveillance` discovery)
- The description is what the classifier matches against — make it precise enough that the LLM can reliably detect it
- Spread discoveries across NPCs so the player must talk to multiple characters
- Create chains: Discovery A from NPC X gives leverage to unlock Discovery B from NPC Y

---

## Frontend Files

### `case.js` — Case Manifest

Sets `window.CASE` with all case-specific constants. Loaded before the engine boots.

**Required fields:**

```javascript
window.CASE = {
  // ── Identity ──
  id: "your-case-slug",              // Kebab-case, matches folder name
  title: "Your Case Title",

  // ── Key NPCs ──
  partnerNpcId: "partner-npc-id",     // The detective's partner
  culpritNpcId: "killer-npc-id",      // The actual murderer

  // ── NPC metadata ──
  npcMeta: {
    "npc-id": { initials: "XX", order: 0 },  // For avatar fallback and grid ordering
    ...
  },

  // ── Evidence catalog ──
  evidenceCatalog: {
    "evidence-id": { label: "Display Label" },
    ...
  },

  // ── Discovery → evidence mapping ──
  // Must mirror DISCOVERY_CATALOG from evidence.py
  discoveryEvidenceMap: {
    "discovery-id": "evidence-id",
    ...
  },

  // ── Evidence grouping for case board ──
  evidenceGroups: {
    physical:    ["evidence-ids-here"],
    documentary: ["..."],
    testimony:   ["..."],
    access:      ["..."],
    motive:      ["..."],
  },

  // ── Starting evidence (given to player at game start) ──
  startingEvidence: [
    { id: "evidence-id", textKey: "evidence.evidence-id_desc" },
  ],

  // ── Canonical evidence (required before "ready to arrest" prompt) ──
  canonicalEvidence: [
    "evidence-id-1", "evidence-id-2", ...
  ],

  // ── Arrest grading ──
  culpritMotiveDiscoveries: [
    "discovery-ids-proving-motive",
  ],
  culpritOpportunityDiscoveries: [
    "discovery-ids-proving-opportunity",
  ],

  // ── Asset paths ──
  portraitBasePath: "cases/your-case-slug/portraits",
  keycardLogsPath: "cases/your-case-slug/data/keycard_logs.json",

  // ── Evidence-specific renderers (optional) ──
  evidenceRenderers: {
    "keycard-logs": "keycard-modal",    // Triggers special UI for this evidence
  },

  // ── i18n helper keys ──
  hintDisplayKeys: [
    "chat.hint_display.0", "chat.hint_display.1", ...  // 8-10 partner hint prompts
  ],
  briefingKeys: [
    "intro.victim", "intro.time_of_death", ...          // Case briefing card order
  ],
};
```

**Arrest grading logic:** When the player arrests the culprit, the grade depends on how many motive + opportunity discoveries they collected:
- **Slam dunk** — Sufficient motive AND opportunity evidence
- **Plea deal** — Some evidence but gaps
- **Released** — Arrested the right person but too little evidence
- **Wrong suspect** — Arrested the wrong NPC

---

### `i18n-en.js` / `i18n-sr.js` — Localization

Case-specific text in each supported language. Sets keys on `window.I18N.en` / `window.I18N.sr`.

**Required key groups:**

```javascript
// ── Case briefing ──
"intro.subtitle":           "A Murder Mystery Investigation",
"intro.briefing_label":     "Case Briefing",
"intro.victim":             "<strong>Victim:</strong> ...",
"intro.time_of_death":      "<strong>Estimated Time of Death:</strong> ...",
"intro.body_discovered":    "<strong>Body Discovered By:</strong> ...",
"intro.circumstances":      "<strong>Circumstances:</strong> ...",
"intro.starting_evidence":  "<strong>Starting Evidence:</strong> ...",
"intro.your_role":          "<strong>Your Role:</strong> ...",
"intro.your_partner":       "<strong>Your Partner:</strong> ...",
"intro.tip":                "<strong>Tip:</strong> ...",

// ── NPC roles (shown in NPC grid) ──
"role.npc-id":              "Their Role",

// ── NPC bios (shown in dossier and chat header) ──
"dossier.npc-id.bio":       "Short biography paragraph.",

// ── Conversation starters (3 per NPC, shown as suggestion chips) ──
"starter.npc-id.1":         "First suggested question",
"starter.npc-id.2":         "Second suggested question",
"starter.npc-id.3":         "Third suggested question",

// ── Evidence labels and descriptions ──
"evidence.evidence-id_label":  "Display Label",
"evidence.evidence-id_desc":   "What the player sees when this evidence is collected.",

// ── Discovery summaries (shown in dossier when unlocked) ──
"discovery.discovery-id":      "One-sentence summary of what was revealed.",

// ── Partner chat hints ──
"chat.hint_display.0":         "What do you think about this case so far?",
...

// ── Outcome text (arrest results) ──
"outcome.slam_dunk_title":     "Case Closed",
"outcome.slam_dunk_text":      "<p>Your arrest of <strong>{name}</strong> is airtight...</p>",
"outcome.plea_deal_title":     "Plea Deal",
"outcome.plea_deal_text":      "...",
"outcome.released_title":      "Suspect Released",
"outcome.released_text":       "...",
"outcome.wrong_title":         "Wrong Suspect",
"outcome.wrong_text":          "...",
"outcome.restart":             "New Investigation",

// ── Dossier UI ──
"dossier.discoveries_heading":  "Discoveries",
"dossier.no_discoveries":       "No new information uncovered yet.",
"dossier.new_badge":            "NEW",

// ── Custom evidence UI (if applicable) ──
"keycard.title":               "ACCESS CONTROL LOG",
"keycard.col_time":            "TIME",
...
```

**i18n principles:**
- Every key in `i18n-en.js` must exist in `i18n-sr.js` (and vice versa)
- Discovery texts should be concise (1-2 sentences) — they appear as dossier entries
- Briefing text can use `<strong>` tags for labels
- Outcome text can use `<p>` tags and `{name}` placeholder for the arrested suspect's name
- Evidence descriptions should help the player understand what they've learned, not just restate the label

---

### `data/keycard_logs.json` — Interactive Evidence

A JSON array of access log entries that the player can browse in a custom UI. Each entry:

```json
{
  "timestamp": "2024-11-15T17:31:09",
  "zone": "LOBBY-STAFF",
  "zone_label": "Staff Entrance (Side)",
  "card_id": "STAFF-0003",
  "card_holder": "A. Reyes",
  "card_type": "staff",
  "access": "granted",
  "direction": "entry"
}
```

**Special entries** for system events (power failure, restoration):
```json
{
  "timestamp": "2024-11-15T23:15:04",
  "zone": "ALL",
  "zone_label": "System Event",
  "card_id": "SYSTEM",
  "card_holder": "SYSTEM",
  "card_type": "service",
  "access": "system_offline",
  "direction": "entry",
  "note": "POWER FAILURE DETECTED — All keycard readers offline..."
}
```

**Design principles:**
- Include ambient entries (service staff, housekeeping) for realism — not just plot-relevant swipes
- The logs should contain clues the player can piece together (e.g., card X used at location Y contradicts NPC Z's alibi)
- Timestamps must be consistent with NPC timelines
- Remember: logs show the CARD, not the PERSON. If a card was handed off, the log still shows the original holder's name

---

### Portraits

Six expression variants per NPC in WebP format. The classifier returns an `expression` string each turn that selects the portrait.

| Expression | When Used |
|------------|-----------|
| `neutral` | Default, calm conversation |
| `guarded` | Deflecting, being careful |
| `distressed` | Emotional, upset, worried |
| `angry` | Hostile, defensive, confrontational |
| `contemplative` | Thinking, considering, weighing options |
| `smirking` | Confident, dismissive, smug |

If a portrait is missing, the UI falls back to the initials defined in `npcMeta`.

---

## Narrative Design Guidelines

### Map & Location Design

Define your locations in the world context glossary. Every location referenced in any timeline must be consistent. Consider:

- **Zone codes** for keycard logs (e.g., `LOBBY-MAIN`, `ROOF-OBS`, `MAINT-LVL`)
- **Physical adjacency** — How long does it take to get from A to B? This matters for alibi verification
- **Access control** — Which areas require keycards? Which use physical locks? Which are open?
- **CCTV coverage** — Which areas have cameras, which don't? This creates information gaps the player must fill with witness testimony
- **Shared vs. private spaces** — Public areas have more potential witnesses; private areas offer alibis that are harder to verify

### NPC Network Design

Aim for 8 persons of interest plus 1 partner detective. Each NPC should:

1. **Have a secret** — Something they're hiding, at minimum one discovery they can reveal
2. **Witness something** — Information about another NPC's movements or behavior
3. **Have a motive** (even if innocent) — Red herrings make the investigation interesting
4. **Connect to at least 2 other NPCs** — Through relationships, witnessed events, or shared locations

**Distribution of clue types across NPCs:**
- 2-3 NPCs should have information about the killer's movements/opportunity
- 2-3 NPCs should have information about the killer's motive
- 2-3 NPCs should have their own subplots that create red herrings
- The partner NPC provides strategic guidance, not new evidence

### Evidence Chain Design

Build evidence chains that require multiple NPCs to complete:

```
Eddie reveals key loan → leads player to ask Noah about the key →
Noah denies → player gets Priya's freight elevator sighting →
confronts Noah with combined evidence → Noah shifts to self-defense claim
```

**Canonical evidence** (the minimum for a case-ready arrest) should require visiting at least 4-5 different NPCs.

### Conspiracy Design (if applicable)

When two or more NPCs are co-conspirators:

1. **Define symmetric protection rules** — Each conspirator protects the other by default
2. **Create independent discovery paths** — The player shouldn't need Conspirator A's confession to catch Conspirator B
3. **Plant breadcrumbs** — Verbal slips, timing inconsistencies, third-party witnesses
4. **Define break conditions** for each conspirator independently:
   - Direct evidence
   - The other conspirator confessing
   - High pressure after a verbal slip
   - Maximum rapport (trust)
5. **Test the timing** — If the conspiracy involves being in two places, make sure the physical timeline actually works (or doesn't, for the player to catch)

### The Killer's Design

The killer gets special treatment:

- **Cover story timeline** instead of real timeline — structured as specific lies with break points
- **Escalating admissions** — Define 3-4 stages of cracking: full denial → partial admission → minimization → confession under overwhelming evidence
- **No smoking gun** — The killer's guilt is assembled from multiple evidence chains, not a single gotcha
- **Premeditation vs. passion** — This affects the narrative tone of the confession

---

## Configuration & Loading

### Server Configuration

Set the active case in `server/config.py` or via environment variable:

```
ECHO_CASE_ID=your_case_id
```

The case_id must match the Python package name under `server/cases/`.

### Frontend Loading

In `web/index.html`, load the case files before the engine scripts:

```html
<script src="cases/your-case-slug/case.js"></script>
<script src="cases/your-case-slug/i18n-en.js"></script>
<script src="cases/your-case-slug/i18n-sr.js"></script>
```

---

## Cross-Reference Validation

Before shipping a case, verify all cross-references are consistent. Run these checks:

### Backend (Python)

```python
# NPC count matches expectations
assert len(NPC_PROFILES) == expected_count

# All discovery evidence_ids exist in catalog
for did, d in DISCOVERY_CATALOG.items():
    assert d["evidence_id"] in EVIDENCE_CATALOG_DESCRIPTIONS
    assert d["npc_id"] in NPC_PROFILES

# All NPC_RELEVANT_EVIDENCE entries are valid
for npc_id, evids in NPC_RELEVANT_EVIDENCE.items():
    assert npc_id in NPC_PROFILES
    for eid in evids:
        assert eid in EVIDENCE_CATALOG_DESCRIPTIONS

# All SMOKING_GUN entries are valid
for npc_id, evids in SMOKING_GUN_MAP.items():
    assert npc_id in NPC_PROFILES
    for eid in evids:
        assert eid in EVIDENCE_CATALOG_DESCRIPTIONS
```

### Frontend (Node.js)

```javascript
// All discoveryEvidenceMap values exist in evidenceCatalog
for (const [did, eid] of Object.entries(CASE.discoveryEvidenceMap)) {
    assert(eid in CASE.evidenceCatalog);
}

// All discoveryEvidenceMap entries have i18n keys in both languages
for (const did of Object.keys(CASE.discoveryEvidenceMap)) {
    assert(("discovery." + did) in en);
    assert(("discovery." + did) in sr);
}

// EN and SR key parity
assert(Object.keys(en).length === Object.keys(sr).length);
```

### Timeline Consistency

Manual checks:
- Every timestamp in NPC timelines should be consistent with keycard_logs.json
- If NPC A says they saw NPC B at location X at time T, NPC B's timeline should place them there
- Cover story timelines should have plausible-sounding timestamps that are contradicted by physical evidence
- The murder window (time of death range) should be covered by every NPC's timeline

---

## Reference: Echoes in the Atrium Stats

| Metric | Count |
|--------|-------|
| NPCs (including partner) | 9 |
| Evidence types | 17 |
| Discoveries | 29 |
| i18n keys per language | 182 |
| Keycard log entries | 78 |
| Portrait expressions per NPC | 6 |
| Server-side Python lines | ~1,400 |
| Frontend JS lines | ~560 |
