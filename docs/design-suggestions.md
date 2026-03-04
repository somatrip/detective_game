# Product Spec: Three Feature Additions

Three features to address the high-priority recommendations from the game design review: a deduction board for theory-building, tactical feedback during interrogations, and mechanical gates to prevent premature secret reveals.

**Implementation order:**
1. **Secret Gates** — smallest scope, highest impact on game fairness, server-only
2. **Detective's Intuition** — small scope, immediate player-facing improvement, validates classifier accuracy
3. **String Board** — largest scope, most visual, benefits from Features 1 and 2 already working

---

## 1. Mechanical Secret Gates

### Overview

Discovery registration currently relies entirely on (a) the LLM choosing to reveal a secret and (b) the classifier tagging it. Neither is deterministic. Gates add a **back-end filter on discovery registration** — the LLM still generates whatever it generates, but if gate conditions aren't met, the discovery is silently suppressed. The player doesn't get the toast, evidence card, or Case Board entry.

The NPC's words are already in the conversation history and can't be unsaid, but the game's mechanical state stays clean. To prevent leaks in the first place, **gate awareness is injected into the NPC prompt** — locked secrets are explicitly listed in the system prompt with instructions not to reveal them.

### Gate Types

| Gate Type | Description |
|-----------|-------------|
| `min_pressure` | NPC's current pressure must be ≥ threshold |
| `min_rapport` | NPC's current rapport must be ≥ threshold |
| `requires_evidence` | Player must possess specific evidence IDs |
| `requires_discovery` | Player must have collected specific prior discoveries |

Each gate is a list of **conditions** evaluated as **ANY condition passing = gate open** (OR). Each condition is a dict of requirements that must ALL be true (AND within a condition).

### Gate Definitions

**Starting evidence** the player always has: `burned-notebook`, `keycard-logs`. Gate conditions must never use these as standalone requirements — they would be always-true and render the gate meaningless.

**Hard-gated discoveries (9):**

| Discovery | NPC | Conditions (OR) | Rationale |
|-----------|-----|-----------------|-----------|
| `noah-embezzlement` | Noah | pressure ≥ 70 | Admitting to embezzlement under pure pressure requires extreme duress |
| | | evidence `financial-misconduct` | Having direct proof of the misconduct |
| | | evidence `encrypted-schedule` + pressure ≥ 35 | Schedule shows Mercer knew; combined with moderate pressure, Noah cracks |
| `noah-board-vote` | Noah | pressure ≥ 35 | Moderate pressure — less damning than embezzlement |
| | | evidence `encrypted-schedule` | Direct proof of the planned vote |
| `noah-key-access` | Noah | discovery `eddie-gave-noah-key` | Eddie already told you |
| | | evidence `key-trail` + pressure ≥ 50 | Key evidence + significant pressure |
| `eddie-gave-noah-key` | Eddie | pressure ≥ 30 | Eddie is anxious, moderate pressure works |
| | | rapport ≥ 50 | Eddie trusts you enough to confess |
| | | evidence `key-trail` | Confronting Eddie with key-trail evidence (contradiction: "we know the key was used on the rooftop, but you said you only used it for a toolkit") forces the admission |
| `celeste-rooftop-witness` | Celeste | rapport ≥ 45 | She trusts you enough to share what she saw |
| | | pressure ≥ 55 | Significant pressure overcomes her fear |
| `matthias-data-sales` | Matthias | pressure ≥ 50 | Significant pressure required |
| | | evidence `blackmail` | Proof that Mercer was blackmailing people — implies Mercer knew about the data sales |
| `mira-suite-search` | Mira | pressure ≥ 50 | Significant pressure |
| | | rapport ≥ 55 | High trust |
| | | discovery `amelia-breaker` | If you know Amelia pulled the breaker, confronting Mira about what she did during the blackout is natural |
| `amelia-conspiracy-admission` | Amelia | discovery `amelia-breaker` + pressure ≥ 60 | Must already know she pulled the breaker, plus high pressure |
| | | discovery `amelia-breaker` + rapport ≥ 65 | Must already know she pulled the breaker, plus very high trust |
| | | discovery `mira-suite-search` | Mira already told you about the conspiracy |
| `mira-conspiracy-admission` | Mira | discovery `mira-suite-search` + pressure ≥ 40 | Must already know she searched the suite, plus moderate pressure |
| | | discovery `amelia-conspiracy-admission` | Amelia already told you the full conspiracy |

**Soft-gated discoveries (20)** — no mechanical check, LLM decides based on conversation context:

| Discovery | NPC | Why soft-gated |
|-----------|-----|----------------|
| `amelia-key-loan` | Amelia | Factual, she has little reason to hide lending a key |
| `amelia-breaker` | Amelia | Important, but gating it creates too long a dependency chain for conspiracy admissions |
| `amelia-hotel-sale` | Amelia | She's passionate and vocal about the hotel sale |
| `amelia-lockpick` | Amelia | Observational — describes physical evidence |
| `noah-cctv-gap` | Noah | Circumstantial, based on footage the player can reference |
| `celeste-affair` | Celeste | Romantic revelation, flows naturally from emotional conversation |
| `celeste-recordings` | Celeste | She wants leverage — may share voluntarily |
| `matthias-blackmail` | Matthias | Mercer was blackmailing him — he has reason to share this grievance |
| `matthias-saw-noah` | Matthias | Observational — he's a security professional reporting what cameras showed |
| `matthias-noah-financial` | Matthias | Secondhand info Mercer mentioned during their confrontation |
| `mira-plagiarism` | Mira | Her core grievance, she's vocal about it |
| `mira-meeting` | Mira | She wanted to confront Mercer — not deeply incriminating |
| `eddie-key-loan` | Eddie | Factual, borrowing a key for a toolkit is innocent |
| `priya-saw-noah` | Priya | Journalist, shares freely |
| `priya-holt-argument` | Priya | Journalist, shares freely |
| `priya-board-vote` | Priya | Journalist, shares freely |
| `priya-mira-tip` | Priya | Journalist, shares freely |
| `matthew-noah-absence` | Matthew | Stage manager is observational and helpful |
| `matthew-celeste-break` | Matthew | Stage manager is observational and helpful |
| `matthew-amelia-direction` | Matthew | Stage manager is observational and helpful |

### Gate Check Logic

```python
DISCOVERY_GATES: Dict[str, List[Dict[str, Any]]] = {
    "noah-embezzlement": [
        {"min_pressure": 70},
        {"requires_evidence": ["financial-misconduct"]},
        {"requires_evidence": ["encrypted-schedule"], "min_pressure": 35},
    ],
    "noah-board-vote": [
        {"min_pressure": 35},
        {"requires_evidence": ["encrypted-schedule"]},
    ],
    "noah-key-access": [
        {"requires_discovery": ["eddie-gave-noah-key"]},
        {"requires_evidence": ["key-trail"], "min_pressure": 50},
    ],
    "eddie-gave-noah-key": [
        {"min_pressure": 30},
        {"min_rapport": 50},
        {"requires_evidence": ["key-trail"]},
    ],
    "celeste-rooftop-witness": [
        {"min_rapport": 45},
        {"min_pressure": 55},
    ],
    "matthias-data-sales": [
        {"min_pressure": 50},
        {"requires_evidence": ["blackmail"]},
    ],
    "mira-suite-search": [
        {"min_pressure": 50},
        {"min_rapport": 55},
        {"requires_discovery": ["amelia-breaker"]},
    ],
    "amelia-conspiracy-admission": [
        {"requires_discovery": ["amelia-breaker"], "min_pressure": 60},
        {"requires_discovery": ["amelia-breaker"], "min_rapport": 65},
        {"requires_discovery": ["mira-suite-search"]},
    ],
    "mira-conspiracy-admission": [
        {"requires_discovery": ["mira-suite-search"], "min_pressure": 40},
        {"requires_discovery": ["amelia-conspiracy-admission"]},
    ],
}
```

```python
def _check_gate(conditions: List[Dict], pressure: int, rapport: int,
                player_evidence: List[str], player_discoveries: List[str]) -> bool:
    """Return True if ANY condition in the gate is fully satisfied."""
    for condition in conditions:
        satisfied = True
        if "min_pressure" in condition and pressure < condition["min_pressure"]:
            satisfied = False
        if "min_rapport" in condition and rapport < condition["min_rapport"]:
            satisfied = False
        if "requires_evidence" in condition:
            if not any(e in player_evidence for e in condition["requires_evidence"]):
                satisfied = False
        if "requires_discovery" in condition:
            if not any(d in player_discoveries for d in condition["requires_discovery"]):
                satisfied = False
        if satisfied:
            return True
    return False
```

Insert the gate check in **server/app.py** between Step 5 (detection) and Step 6 (return):

```python
# ── Step 5b: Apply mechanical gates to detected discoveries ──
gated_discovery_ids = []
for did in discovery_ids:
    gates = case.discovery_gates.get(did)
    if gates is None:
        gated_discovery_ids.append(did)
        continue
    if _check_gate(gates,
                   pressure=interrogation_result["pressure"],
                   rapport=interrogation_result["rapport"],
                   player_evidence=request.player_evidence_ids,
                   player_discoveries=request.player_discovery_ids):
        gated_discovery_ids.append(did)
    else:
        log.info("[chat] Gate blocked discovery %s (pressure=%d, rapport=%d)",
                 did, interrogation_result["pressure"], interrogation_result["rapport"])

discovery_ids = gated_discovery_ids
evidence_ids = list({case.discovery_catalog[d]["evidence_id"] for d in discovery_ids})
```

### Gate Awareness Injection

The existing `build_interrogation_context()` in `server/interrogation.py` already injects pressure band, rapport band, and behavioral guidance into the NPC prompt each turn (see `interrogation.py:347-353`). Gate awareness extends this by adding a `LOCKED INFORMATION` block listing secrets the NPC must not reveal.

```python
# In build_interrogation_context(), after the BEHAVIORAL GUIDANCE section:
locked_secrets = get_locked_secret_descriptions(npc_id, pressure_val, rapport_val,
                                                  player_evidence, player_discoveries)
if locked_secrets:
    lines.append("")
    lines.append("LOCKED INFORMATION (do NOT reveal, hint at, or allude to these — "
                 "the detective has not earned access yet):")
    for desc in locked_secrets:
        lines.append(f"- {desc}")
```

### Locked Secret Descriptions

Each hard-gated discovery has a natural-language description injected into the NPC prompt when the gate is locked. These tell the NPC what NOT to say and how to deflect.

```python
LOCKED_SECRET_DESCRIPTIONS: Dict[str, str] = {
    "noah-embezzlement": (
        "Do NOT admit to or hint at embezzlement, skimming funds, financial misconduct, "
        "or gambling debts. If the detective accuses you of financial crimes, deny it firmly "
        "or deflect. You have not been confronted with proof yet."
    ),
    "noah-board-vote": (
        "Do NOT reveal that Mercer was planning a board vote to oust you. You are not aware "
        "the detective knows about this — act as if the vote is your private fear, not "
        "public knowledge."
    ),
    "noah-key-access": (
        "Do NOT admit to obtaining the maintenance key or engineering keycard from Eddie. "
        "If asked about keys or rooftop access, deny involvement or claim ignorance. "
        "The detective has not yet established the chain of custody."
    ),
    "eddie-gave-noah-key": (
        "Do NOT reveal that Noah pressured you into handing over the key and keycard. "
        "If asked about the key, you may mention borrowing it from Amelia for a toolkit, "
        "but do NOT mention giving it to Noah. You are scared and protecting yourself."
    ),
    "celeste-rooftop-witness": (
        "Do NOT reveal that you saw someone descending the atrium stairwell during the "
        "blackout. This is information you are withholding out of fear or self-preservation. "
        "The detective must earn your trust or apply significant pressure before you share this."
    ),
    "matthias-data-sales": (
        "Do NOT reveal your side business selling guest data. If the detective asks about "
        "your finances or side income, deflect or discuss your legitimate security work."
    ),
    "mira-suite-search": (
        "Do NOT reveal that you searched Suite 701 during the blackout. If asked about "
        "the blackout, say you stayed in or near the ballroom. The detective has not yet "
        "uncovered enough to confront you about this."
    ),
    "amelia-conspiracy-admission": (
        "Do NOT admit to the full conspiracy with Mira. You may acknowledge pulling the "
        "breaker if already discovered, but do NOT reveal that Mira searched Suite 701 "
        "or that you coordinated together. Protect Mira until the detective has enough leverage."
    ),
    "mira-conspiracy-admission": (
        "Do NOT admit to the full conspiracy with Amelia. You may discuss your plagiarism "
        "grievance freely, but do NOT reveal that Amelia pulled the breaker for you or that "
        "you coordinated together. The detective has not yet connected these events."
    ),
}
```

```python
def get_locked_secret_descriptions(
    npc_id: str,
    pressure: int,
    rapport: int,
    player_evidence: List[str],
    player_discoveries: List[str],
) -> List[str]:
    """Return locked-secret prompt lines for this NPC's unmet gates."""
    from .cases import get_active_case
    case = get_active_case()
    locked = []
    for discovery_id, gate_conditions in case.discovery_gates.items():
        if case.discovery_catalog.get(discovery_id, {}).get("npc_id") != npc_id:
            continue
        if not _check_gate(gate_conditions, pressure, rapport,
                           player_evidence, player_discoveries):
            desc = LOCKED_SECRET_DESCRIPTIONS.get(discovery_id)
            if desc:
                locked.append(desc)
    return locked
```

### Files Modified

| File | Change |
|------|--------|
| `server/cases/echoes_in_the_atrium/evidence.py` | Add `DISCOVERY_GATES` dict, `LOCKED_SECRET_DESCRIPTIONS` dict |
| `server/cases/__init__.py` | Add `discovery_gates` to `CaseData` dataclass |
| `server/app.py` | Insert gate check between Step 5 and Step 6; add `_check_gate()` |
| `server/interrogation.py` | Extend `build_interrogation_context()` with locked-secret injection; add `get_locked_secret_descriptions()` |

---

## 2. Detective's Intuition

### Overview

After key moments in interrogation, a subtle **"Intuition Line"** fades in below the player's message bubble. Styled as the detective's internal monologue — italic, muted gold, small font. It communicates what the detective did, how it landed, and what shifted. Lines are generated by the LLM (not templates) to match the natural, open-ended feel of the interrogations.

The intuition line does NOT appear every turn. It appears only at significant moments, and its absence is itself feedback — things are status quo.

### Trigger Conditions

Show the intuition line when **at least one** condition is met:

- A **band transition** occurred (pressure or rapport crossed a threshold, e.g., calm→tense, neutral→open)
- The player presented **strong or smoking_gun evidence**
- A **discovery was registered** this turn
- A **gated discovery was blocked** this turn (hint that the player is close without revealing the mechanic)
- The player used a **high-impact tactic** (`direct_accusation` or `point_out_contradiction`)

Do NOT show it when:

- Routine `open_ended` or `topic_change` turns with no band shift
- No trigger condition is met
- The only thing to say would be generic/uninformative

### Suppression Logic

The trigger conditions themselves act as a natural filter — band transitions don't happen every turn, discoveries are rare, strong evidence is a deliberate player choice. The only trigger that could fire frequently is `direct_accusation` / `point_out_contradiction`, so: if the same high-impact tactic is used on consecutive turns against the same NPC, suppress the second intuition line. This keeps pacing organic — during a tense sequence, lines might appear 3 turns in a row if each turn genuinely shifts something, but during routine questioning they naturally disappear.

### Archetype Communication

The intuition line uses qualitative NPC reactions instead of exposing mechanical labels like "proud_executive" or "anxious_insider":

- After empathy fails on a Proud Executive: *"Your sympathy didn't land. She seems more interested in respect than comfort."*
- After empathy succeeds on an Anxious Insider: *"He relaxed visibly. Kindness works here."*
- After direct_accusation on a Professional Fixer: *"She absorbed it without blinking. This one doesn't rattle easily."*

### LLM Generation

Intuition lines are generated by the LLM as part of the NPC response call:

1. When a trigger condition is met, add to the NPC system prompt: *"After your in-character response, on a new line starting with `[INTUITION]`, write one brief sentence (max 15 words) as the detective's internal thought about what just happened — what tactic the detective used and how the NPC reacted. Stay in-world, noir tone. Do not reference game mechanics."*
2. The server strips the `[INTUITION]` line from the NPC's visible response and returns it as a separate `intuition_line` field in the chat response JSON
3. The client renders it only when present — no field = no line shown

**Template fallback:** If the LLM fails to produce the `[INTUITION]` line, fall back to composable templates built from tactic labels, evidence labels, and band transition descriptions:

```javascript
const TACTIC_LABELS = {
  open_ended: "an open question",
  specific_factual: "a pointed question",
  empathy: "showing empathy",
  present_evidence: "presenting evidence",
  point_out_contradiction: "calling out a contradiction",
  direct_accusation: "a direct accusation",
  repeat_pressure: "pressing the same point",
  topic_change: "changing the subject",
};

const EVIDENCE_LABELS = {
  none: null,
  weak: "loosely relevant",
  strong: "directly relevant",
  smoking_gun: "damning",
};
```

### CSS

```css
.intuition-line {
  font-style: italic;
  font-size: 0.72rem;
  color: var(--gold);
  opacity: 0.6;
  padding: 0.25rem 0.75rem;
  animation: fadeIn 0.5s ease;
}
```

Optional: a settings toggle "Show detective's intuition" (default on).

### Files Modified

| File | Change |
|------|--------|
| `server/interrogation.py` | Trigger condition logic; add `[INTUITION]` prompt injection when conditions are met |
| `server/app.py` | Parse/strip `[INTUITION]` tag from NPC response; return `intuition_line` field |
| `web/js/main.js` | Render `intuition_line` when present; template fallback function; suppression state tracking |
| `web/css/main.css` | `.intuition-line` styling |

---

## 3. Deduction Board — "String Board"

### Overview

A new **"String Board"** tab alongside Suspects / Case Board / Notes. Cork-board metaphor: **suspect cards** (all 8 suspects — Lila is the player's partner, not a suspect) and **evidence cards** appear as pinned index cards. Players drag string between any two cards to create a link with a short annotation. The board is a thinking tool — the game never validates or scores links.

### Cards

**Suspect cards** (8) are present from the start, pre-arranged in a default layout. Each shows the NPC's name, portrait, and role.

**Evidence cards** appear as evidence is collected. Each shows the evidence title and discovery summaries as sub-bullets. **Starting evidence** (`burned-notebook` and `keycard-logs`) is prepopulated on the board alongside suspect cards at game start.

Players can link evidence-to-evidence, suspect-to-suspect, or evidence-to-suspect — no constraints on what can be connected.

### Data Structure

```javascript
// Persisted to localStorage AND synced to backend
let stringBoard = {
  cardPositions: {
    "burned-notebook": {x: 50, y: 400},      // starting evidence card
    "keycard-logs": {x: 200, y: 400},         // starting evidence card
    "suspect:noah-sterling": {x: 300, y: 200}, // suspect card (prefixed)
    ...
  },
  links: [
    { from: "key-trail", to: "suspect:noah-sterling", note: "Noah needed the key" },
    { from: "suspect:eddie-voss", to: "suspect:noah-sterling", note: "Eddie gave Noah the key" },
    ...
  ]
};
```

### Visual Design

- Cork-board background texture (`#3a2e20` with subtle noise), gold pins, red string (SVG lines with slight sag via quadratic bezier)
- Evidence cards: existing `.clue-item` styling (dark bg, gold border), positioned absolutely on a pannable canvas
- Cards are draggable. String connects from a pin circle on each card's edge
- Mobile: tap card A, tap card B to link (no drag — drag scrolls the canvas). Long-press a string to delete.

### Interactions

- `renderStringBoard()`: positions cards as absolute divs, draws SVG string lines between linked cards
- `onCardDragEnd()`: updates `cardPositions[cardId]`
- `onLinkCreate(fromId, toId)`: prompts for annotation (inline input), pushes to `links[]`
- `onLinkDelete(index)`: removes from `links[]`
- Auto-layout: new evidence with no saved position goes to the nearest open grid slot

### Backend Sync

String board state is stored server-side for cross-device sync.

- **Save endpoint**: `POST /api/state/stringboard` — accepts the full `stringBoard` object
- **Load endpoint**: `GET /api/state/stringboard` — returns the stored object (or empty default)
- **Sync strategy**: Save on every change (debounced ~2s) and on page unload. On load, server state wins for positions/links, but locally-collected evidence that hasn't synced yet gets auto-positioned
- **Storage**: Same backend store used for existing save state. `stringBoard` field added alongside existing save fields

### Files Modified

| File | Change |
|------|--------|
| `web/index.html` | Add fourth manila tab "String Board" (`data-hub-tab="stringboard"`), add board container div |
| `web/js/main.js` | Board rendering, drag/drop, link management, auto-layout, save/load integration |
| `web/css/main.css` | Cork board bg, card positioning, string line styling, pin circles, mobile touch targets |
| Server (save API) | New save/load endpoint for stringboard state |

---

## Verification

**Secret Gates:**
- Unit tests in `tests/test_interrogation.py` calling `_check_gate()` with various combinations of pressure, rapport, evidence, and discovery lists
- Verify blocked discoveries don't appear in ChatResponse
- Test edge case: discovery detected + gate blocked + same discovery detected again after gate conditions met = registers on second attempt
- Verify no gate uses starting evidence (`burned-notebook`, `keycard-logs`) as a standalone OR condition

**Detective's Intuition:**
- Manual play-test: verify intuition line appears only at trigger moments (band transitions, strong evidence, discoveries), NOT after every turn
- Check that lines feel unique and contextual (LLM-generated), not canned
- Verify repeated same-tactic turns suppress the line naturally
- Check that line doesn't appear for partner (Lila) conversations
- Test fallback: if LLM doesn't produce `[INTUITION]` tag, verify template fallback activates
- Test with classifier degraded=True (should show generic line or nothing)

**String Board:**
- Verify suspect cards (8) and starting evidence cards (2) appear on fresh game start
- Test evidence cards appear when new evidence is collected
- Test drag positioning, link creation/deletion with annotations
- Test persistence across page reload and cloud save/restore
- Test mobile touch interactions (tap-to-link, long-press-to-delete)
- Verify backend sync works across devices
