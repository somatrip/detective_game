# Design Suggestions for Review Points 1–3

These are design proposals to address the three high-priority recommendations from the game design review. Each is a self-contained suggestion with rationale, player experience description, data structures, implementation sketch, and tradeoffs. The goal is to commit these as a design document — not to implement them now.

---

## 1. Deduction Board — "String Board"

### Problem
Players must connect evidence across 9 NPCs and 17 evidence types in their head or a freeform textarea. There's no tool to form, test, or visualize theories.

### Player Experience
A new **"String Board"** tab appears alongside Suspects / Case Board / Notes. It presents a cork-board metaphor: evidence cards the player has collected appear as pinned index cards. Players drag string between two cards to create a **link**, then type a short annotation (e.g., "Eddie had the key before Noah"). Links persist and can be deleted.

The board is a thinking tool, not a puzzle mechanic — the game never validates or scores links. This preserves challenge: the player can be wrong, and the board won't correct them.

### Visual Design
- Cork-board background texture (`#3a2e20` with subtle noise), gold pins, red string (SVG lines with slight sag via quadratic bezier)
- Evidence cards: existing `.clue-item` styling (dark bg, gold border), but positioned absolutely on a pannable canvas
- Cards are draggable. String connects from a small pin circle on each card's edge
- On mobile: tap card A, tap card B to link (no drag — drag scrolls the canvas instead). Long-press a string to delete.

### Data Structure
```javascript
// New state field, persisted to localStorage + cloud
let stringBoard = {
  cardPositions: { "key-trail": {x: 120, y: 340}, ... },  // player-arranged positions
  links: [
    { from: "key-trail", to: "financial-misconduct", note: "Noah needed the key because he was desperate" },
    ...
  ]
};
```

### Implementation Sketch
- **web/index.html**: Add fourth manila tab "String Board" (`data-hub-tab="stringboard"`), add `<div id="hub-stringboard" class="hub-panel"><canvas id="sb-canvas"></canvas><div id="sb-cards"></div></div>`
- **web/js/main.js**:
  - `renderStringBoard()`: positions evidence cards as absolute divs over the canvas, draws SVG/canvas string lines between linked cards
  - `onCardDragEnd()`: updates `cardPositions[evidenceId]`
  - `onLinkCreate(fromId, toId)`: prompts for annotation (small inline input), pushes to `links[]`
  - `onLinkDelete(index)`: removes from `links[]`
  - Auto-layout: when a new evidence item is collected and has no saved position, place it in the first open grid slot
  - Save `stringBoard` alongside existing state in `saveState()`
- **web/css/main.css**: Cork board bg, card positioning, string line styling, pin circles, mobile touch targets

### Auto-Population
When evidence is first collected, its card appears on the board in an auto-grid position. Players can then rearrange freely. Discovery summaries appear as sub-bullets on the card (same as current case board rendering).

### Tradeoffs
- **Pro**: Gives players the "detective board" fantasy. Entirely optional — doesn't block progress.
- **Pro**: No server changes needed. Purely frontend.
- **Con**: Canvas/SVG string rendering adds visual complexity. Needs testing across screen sizes.
- **Con**: On mobile, the pannable canvas UX needs care to avoid conflicts with page scroll.
- **Alternative considered**: Simpler "tag and group" system where players assign colored labels to evidence. Less visually exciting, but much simpler to implement. Could be a good Phase 1 before full string board.

### Complexity: Medium-Large (frontend only)

---

## 2. Tactical Feedback — "Detective's Intuition"

### Problem
The server already returns `tactic_type` and `evidence_strength` every turn, but the player never sees them. The pressure/rapport system is invisible. Players can't learn what works because there's no feedback loop.

### Player Experience
After each NPC response, a subtle **"Intuition Line"** fades in below the player's message bubble (not the NPC's). It's styled as the detective's internal monologue — italic, muted gold, small font. It communicates three things:

1. **What you did** (tactic classification, in natural language)
2. **How it landed** (evidence strength + effectiveness signal)
3. **What shifted** (pressure/rapport direction, not numbers)

Example lines:
- *"A direct accusation — but without evidence to back it up, it bounced off."* (direct_accusation + none)
- *"Showing empathy. She's opening up a little."* (empathy + rapport moved from cold→neutral)
- *"You presented the keycard logs. He flinched."* (present_evidence + strong + pressure moved up)
- *"Pressing the same question again. He's getting agitated."* (repeat_pressure + pressure rising)

### Communicating Archetypes Without Breaking Immersion
Instead of revealing "proud_executive" or "anxious_insider", the intuition line uses **qualitative NPC reactions** that teach the same lesson:

- After empathy fails on a Proud Executive: *"Your sympathy didn't land. She seems more interested in respect than comfort."*
- After empathy succeeds on an Anxious Insider: *"He relaxed visibly. Kindness works here."*
- After direct_accusation on a Professional Fixer: *"She absorbed it without blinking. This one doesn't rattle easily."*

This teaches the player the same information (this NPC responds differently to empathy vs. pressure) without exposing the mechanical labels.

### Data Structure
No new persistent state needed. The intuition line is generated client-side from already-returned response fields.

```javascript
// Mapping tables (added to main.js or a new intuition.js)
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

### Implementation Sketch
- **web/js/main.js**:
  - New function `buildIntuitionLine(tacticType, evidenceStrength, prevPressureBand, newPressureBand, prevRapportBand, newRapportBand, npcId)` returns a string
  - In `sendMessage()`, after receiving the response and updating state (~line 1360), call `buildIntuitionLine()` and insert a small `<div class="intuition-line">` after the player's message bubble
  - Store previous pressure/rapport bands before updating so we can detect transitions
  - The line fades in with a 0.5s CSS animation after the NPC bubble appears
- **web/css/main.css**:
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
- **Optional enhancement**: A settings toggle "Show detective's intuition" (default on) for players who prefer a cleaner interface

### Template System
Rather than hundreds of hardcoded strings, use composable templates:

```javascript
function buildIntuitionLine(tactic, evidence, pBandOld, pBandNew, rBandOld, rBandNew) {
  let parts = [];

  // Part 1: What you did
  parts.push(TACTIC_LABELS[tactic]);

  // Part 2: Evidence modifier
  if (evidence !== "none") {
    parts[0] += `, backed by ${EVIDENCE_LABELS[evidence]} evidence`;
  }

  // Part 3: What shifted (band transitions)
  if (pBandNew !== pBandOld) {
    // pressure increased
    if (BAND_ORDER[pBandNew] > BAND_ORDER[pBandOld]) parts.push(PRESSURE_UP_LINES[pBandNew]);
    else parts.push(PRESSURE_DOWN_LINES[pBandNew]);
  }
  if (rBandNew !== rBandOld) {
    if (BAND_ORDER[rBandNew] > BAND_ORDER[rBandOld]) parts.push(RAPPORT_UP_LINES[rBandNew]);
    else parts.push(RAPPORT_DOWN_LINES[rBandNew]);
  }

  return capitalize(parts.join(". ")) + ".";
}
```

### Tradeoffs
- **Pro**: Closes the feedback loop with zero server changes. Uses data already returned.
- **Pro**: Teaches the system through narrative, not numbers. Maintains noir immersion.
- **Pro**: Small implementation surface — one function, one CSS class, one insertion point.
- **Con**: Classifier accuracy becomes more visible. If the classifier mis-classifies "empathy" as "open_ended", the intuition line will be wrong and confusing. This creates pressure to improve classifier quality.
- **Con**: Line generation needs enough variety to not feel repetitive after 30+ exchanges with one NPC. May need 3–4 variants per tactic×band combination.
- **Alternative considered**: A post-conversation summary ("Your approach with Amelia: mostly pressure-based, with 2 empathy attempts") shown when returning to the hub. Less immediate but avoids per-turn clutter. Could be Phase 2.

### Complexity: Small-Medium (frontend only)

---

## 3. Mechanical Secret Gates

### Problem
Discovery registration relies entirely on (a) the LLM choosing to reveal a secret and (b) the classifier choosing to tag it. Neither is deterministic. GPT-3.5-turbo in particular leaks secrets that should require evidence or high pressure. There's no safety net.

### Design Philosophy
Gates are a **back-end filter on discovery registration**, not a conversation blocker. The LLM still generates whatever it generates. But if the gate conditions aren't met, the discovery is **silently suppressed** — the classifier's tag is dropped before it reaches the client. This means:

- The NPC might hint at or even state the secret (LLM leak)
- But the player doesn't get the discovery toast, the evidence card, or the Case Board entry
- The information is "unverified" until the player meets the gate conditions and the NPC restates it

This is the right tradeoff because: (1) the NPC's words are already in the conversation history and can't be unsaid, (2) but the game's mechanical state stays clean, and (3) re-eliciting the secret is easier once the player actually has the required evidence/pressure.

### Gate Conditions (4 types)

| Gate Type | Description | Example |
|-----------|-------------|---------|
| `min_pressure` | NPC's current pressure must be ≥ threshold | Noah's embezzlement requires pressure ≥ 40 |
| `min_rapport` | NPC's current rapport must be ≥ threshold | Celeste's rooftop sighting requires rapport ≥ 50 |
| `requires_evidence` | Player must possess specific evidence IDs | Noah's key-access requires player having "key-trail" evidence |
| `requires_discovery` | Player must have collected specific prior discoveries | Amelia's conspiracy-admission requires "amelia-breaker" or "mira-suite-search" |

### Which Discoveries Get Hard Gates

**Hard-gated** (critical plot points that break the game if leaked early):
- `noah-embezzlement` — requires: min_pressure 40 OR requires_evidence ["financial-misconduct", "encrypted-schedule"]
- `noah-key-access` — requires: requires_discovery ["eddie-gave-noah-key"] OR requires_evidence ["key-trail"]
- `noah-board-vote` — requires: min_pressure 35 OR requires_evidence ["encrypted-schedule"]
- `amelia-conspiracy-admission` — requires: requires_discovery ["amelia-breaker"] AND (min_pressure 60 OR min_rapport 65)
- `mira-conspiracy-admission` — requires: requires_discovery ["mira-suite-search"] OR requires_discovery ["amelia-conspiracy-admission"]
- `matthias-data-sales` — requires: min_pressure 50 OR requires_evidence ["burned-notebook", "blackmail"]
- `celeste-rooftop-witness` — requires: min_rapport 45 OR min_pressure 55
- `eddie-gave-noah-key` — requires: min_pressure 30 OR min_rapport 50

**Soft-gated** (LLM-only, no mechanical check — low-stakes or observational):
- `celeste-affair` — romantic revelation, flows naturally from conversation
- `mira-plagiarism` — Mira's grievance, she's vocal about it
- `priya-saw-noah`, `priya-holt-argument`, `priya-mira-tip` — journalist shares freely
- `matthew-noah-absence`, `matthew-celeste-break`, `matthew-amelia-direction` — stage manager is observational
- `amelia-hotel-sale` — Amelia is passionate about this, reveals it easily

### Data Structure (case-level, in evidence.py)

Each gate is a list of **conditions**, evaluated as **ANY condition passing = gate open** (pure OR). Each condition is a dict of requirements that must ALL be true (AND within a condition). This gives full expressiveness: "Eddie told you" OR "you have key evidence AND high pressure" is two conditions, one simple and one compound.

```python
DISCOVERY_GATES: Dict[str, List[Dict[str, Any]]] = {
    "noah-embezzlement": [
        {"min_pressure": 40},                                    # high pressure alone works
        {"requires_evidence": ["financial-misconduct"]},         # or having the evidence
        {"requires_evidence": ["encrypted-schedule"]},           # or having the schedule
    ],
    "noah-key-access": [
        {"requires_discovery": ["eddie-gave-noah-key"]},         # Eddie told you
        {"requires_evidence": ["key-trail"], "min_pressure": 50},# or key evidence + pressure
    ],
    "amelia-conspiracy-admission": [
        {"requires_discovery": ["amelia-breaker"], "min_pressure": 60},  # breaker + pressure
        {"requires_discovery": ["amelia-breaker"], "min_rapport": 65},   # breaker + rapport
        {"requires_discovery": ["mira-suite-search"]},                    # Mira already told you
    ],
    "celeste-rooftop-witness": [
        {"min_rapport": 45},
        {"min_pressure": 55},
    ],
    "eddie-gave-noah-key": [
        {"min_pressure": 30},
        {"min_rapport": 50},
    ],
    "matthias-data-sales": [
        {"min_pressure": 50},
        {"requires_evidence": ["burned-notebook"]},
        {"requires_evidence": ["blackmail"]},
    ],
    # Discoveries not listed here have no gate (soft-gated, LLM-only)
}
```

### Implementation Sketch

**server/cases/echoes_in_the_atrium/evidence.py**: Add `DISCOVERY_GATES` dict as above.

**server/cases/__init__.py**: Add `discovery_gates` to `CaseData` dataclass.

**server/app.py** — insert gate check between Step 5 (detection) and Step 6 (return):

```python
# ── Step 5b: Apply mechanical gates to detected discoveries ──
gated_discovery_ids = []
for did in discovery_ids:
    gates = case.discovery_gates.get(did)
    if gates is None:
        # No gate defined — pass through (soft-gated)
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

# Replace discovery_ids with gated version
discovery_ids = gated_discovery_ids
evidence_ids = list({case.discovery_catalog[d]["evidence_id"] for d in discovery_ids})
```

**New helper function** `_check_gate()` in app.py or interrogation.py:

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

### The "LLM Said It But Gate Blocked It" Problem

This is the main UX risk. If Noah blurts out "Fine, I took money from the company!" but the gate blocks the discovery because pressure is only 25, the player heard the confession but gets no toast and no evidence card.

**Mitigation strategies (pick one or combine):**

1. **Accept it.** The information is "unverified" — the player heard it but can't use it formally. This mirrors real investigations where a suspect says something but it's not admissible. Players who push harder later will get the discovery registered. This is the simplest approach and arguably adds to the detective fantasy.

2. **Inject gate awareness into the NPC prompt.** In Step 3, when building the interrogation context, add a section: "The following secrets are currently LOCKED — do not reveal them even if pressured: [list]." This reduces the leak frequency but doesn't eliminate it (LLMs aren't reliable at negative instructions).

3. **Regeneration on violation.** If the classifier detects a gated discovery that the gate blocks, regenerate the NPC response with stronger "DO NOT REVEAL" instructions. Expensive (double LLM call), adds latency, and the regenerated response might be worse. Not recommended as primary strategy but could be a fallback for the most critical discoveries (noah-key-access, amelia-conspiracy-admission).

**Recommendation**: Use strategy 1 (accept it) as default, with strategy 2 (prompt injection) for the 3–4 most critical plot discoveries. Don't use strategy 3 unless leak rates are unacceptably high in testing.

### Tradeoffs
- **Pro**: Deterministic safety net. The game's mechanical state is always consistent regardless of LLM behavior.
- **Pro**: Case-data driven. New cases define their own gates without touching engine code.
- **Pro**: Small server-side change — one filter step, one helper function, one data dict.
- **Con**: The "heard it but didn't get credit" experience can be confusing. Needs to be rare (combine with prompt injection for critical secrets).
- **Con**: Gate thresholds need playtesting. Too high = frustrating. Too low = gates never trigger (pointless).
- **Con**: The `requires_discovery` gate creates dependency chains. A bug in one gate can cascade and block downstream discoveries.

### Complexity: Small-Medium (server only, plus case data)

---

## Files Modified Per Feature

| Feature | Files | Server? | Frontend? |
|---------|-------|---------|-----------|
| 1. String Board | `web/index.html`, `web/js/main.js`, `web/css/main.css` | No | Yes |
| 2. Intuition Line | `web/js/main.js`, `web/css/main.css` | No | Yes |
| 3. Secret Gates | `server/app.py`, `server/cases/echoes_in_the_atrium/evidence.py`, `server/cases/__init__.py` | Yes | No |

## Suggested Implementation Order

**Feature 3 (Secret Gates) first** — smallest scope, highest impact on game fairness, server-only. Can be tested with existing conversations.

**Feature 2 (Intuition Line) second** — small frontend scope, immediate player-facing improvement. Validates the classifier's accuracy under real play conditions (which informs whether classifier improvements are needed before Feature 1).

**Feature 1 (String Board) third** — largest scope, most visual, least mechanically critical. Benefits from having Features 2 and 3 already working so the full investigation loop is tighter.

## Verification

- **Secret Gates**: Write unit tests in `tests/test_interrogation.py` that call `_check_gate()` with various combinations of pressure, rapport, evidence, and discovery lists. Verify that blocked discoveries don't appear in the ChatResponse. Test edge case: discovery detected + gate blocked + same discovery detected again after gate conditions met = should register on second attempt.
- **Intuition Line**: Manual play-test. Verify intuition line appears after each exchange, content matches the tactic/evidence/band data returned by the server. Check that line doesn't appear for partner (Lila) conversations. Test with classifier degraded=True (should show generic line or nothing).
- **String Board**: Manual play-test. Verify cards appear when evidence is collected. Test drag positioning, link creation/deletion, persistence across page reload, and cloud save/restore. Test mobile touch interactions.
