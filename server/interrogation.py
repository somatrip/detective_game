"""Interrogation engine: archetypes, delta computation, band mapping, prompt builder.

All logic is deterministic (no LLM calls). The classifier module handles the
LLM-based turn classification; this module applies the mechanical results.
"""

from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from enum import StrEnum
from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from .cases import DiscoveryEntry

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Typed return shape
# ---------------------------------------------------------------------------


class TurnResult(TypedDict):
    pressure: int
    rapport: int
    pressure_band: str
    rapport_band: str
    archetype_id: str
    delta_pressure: int
    delta_rapport: int
    peak_pressure: int


class GateCondition(TypedDict, total=False):
    """A single gate condition — all present keys must be satisfied (AND logic)."""

    min_pressure: int
    min_rapport: int
    requires_evidence: list[str]
    requires_discovery: list[str]


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class PressureBand(StrEnum):
    CALM = "calm"  # 0-24
    TENSE = "tense"  # 25-49
    SHAKEN = "shaken"  # 50-74
    CORNERED = "cornered"  # 75-100


class RapportBand(StrEnum):
    COLD = "cold"  # 0-24
    NEUTRAL = "neutral"  # 25-49
    OPEN = "open"  # 50-74
    TRUSTING = "trusting"  # 75-100


# ---------------------------------------------------------------------------
# Archetype profiles
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ArchetypeProfile:
    archetype_id: str
    label: str
    pressure_scale: float
    rapport_scale: float
    pressure_decay: float
    rapport_decay: float
    contradiction_bonus: float
    empathy_bonus: float


ARCHETYPES: dict[str, ArchetypeProfile] = {
    "proud_executive": ArchetypeProfile(
        archetype_id="proud_executive",
        label="Proud Executive",
        pressure_scale=0.8,
        rapport_scale=0.7,
        pressure_decay=1.5,
        rapport_decay=0.5,
        contradiction_bonus=8.0,
        empathy_bonus=3.0,
    ),
    "anxious_insider": ArchetypeProfile(
        archetype_id="anxious_insider",
        label="Anxious Insider",
        pressure_scale=1.3,
        rapport_scale=1.2,
        pressure_decay=0.5,
        rapport_decay=1.0,
        contradiction_bonus=5.0,
        empathy_bonus=10.0,
    ),
    "professional_fixer": ArchetypeProfile(
        archetype_id="professional_fixer",
        label="Professional Fixer",
        pressure_scale=0.9,
        rapport_scale=0.8,
        pressure_decay=2.0,
        rapport_decay=0.5,
        contradiction_bonus=10.0,
        empathy_bonus=4.0,
    ),
}


# ---------------------------------------------------------------------------
# Base deltas and multipliers
# ---------------------------------------------------------------------------

#: (pressure_delta, rapport_delta) for each tactic type.
BASE_DELTAS: dict[str, tuple[int, int]] = {
    "open_ended": (+3, +5),
    "specific_factual": (+8, +2),
    "empathy": (-6, +15),
    "present_evidence": (+15, +0),
    "point_out_contradiction": (+22, -7),
    "direct_accusation": (+28, -12),
    "repeat_pressure": (+12, -4),
    "topic_change": (-10, +4),
}

#: Evidence-strength multiplier applied to the pressure delta.
EVIDENCE_MULTIPLIERS: dict[str, float] = {
    "none": 1.0,
    "weak": 1.4,
    "strong": 2.0,
    "smoking_gun": 3.0,
}

#: Multiplier applied to pressure_decay when accelerated decay is active.
#: Triggers when: (a) NPC was never cornered (peak < 75), AND
#: (b) the current turn's effective pressure delta is <= 0.
ACCELERATED_DECAY_MULTIPLIER: float = 4.0


# ---------------------------------------------------------------------------
# Band mapping
# ---------------------------------------------------------------------------


def pressure_band(value: int) -> PressureBand:
    if value < 25:
        return PressureBand.CALM
    if value < 50:
        return PressureBand.TENSE
    if value < 75:
        return PressureBand.SHAKEN
    return PressureBand.CORNERED


def rapport_band(value: int) -> RapportBand:
    if value < 25:
        return RapportBand.COLD
    if value < 50:
        return RapportBand.NEUTRAL
    if value < 75:
        return RapportBand.OPEN
    return RapportBand.TRUSTING


# ---------------------------------------------------------------------------
# Delta computation
# ---------------------------------------------------------------------------


def compute_deltas(
    tactic_type: str,
    evidence_strength: str,
    archetype: ArchetypeProfile,
) -> tuple[int, int]:
    """Compute (pressure_delta, rapport_delta) for this turn."""
    base_p, base_r = BASE_DELTAS.get(tactic_type, (2, 3))
    evidence_mult = EVIDENCE_MULTIPLIERS.get(evidence_strength, 1.0)

    scaled_p = base_p * evidence_mult * archetype.pressure_scale
    scaled_r = base_r * archetype.rapport_scale

    if tactic_type == "point_out_contradiction":
        scaled_p += archetype.contradiction_bonus
    if tactic_type == "empathy":
        scaled_r += archetype.empathy_bonus

    return round(scaled_p), round(scaled_r)


def apply_update(
    current_pressure: int,
    current_rapport: int,
    delta_p: int,
    delta_r: int,
    archetype: ArchetypeProfile,
    peak_pressure: int = 0,
) -> tuple[int, int, int]:
    """Apply deltas (with decay) and clamp to 0-100.

    Returns ``(new_pressure, new_rapport, new_peak_pressure)``.

    Accelerated decay kicks in when the NPC has never been cornered
    (peak_pressure < 75) and the current turn is not applying pressure
    (delta_p <= 0).  This makes pressure bleed away quickly if the
    player backs off before truly breaking the NPC.

    Rapport erodes faster when the NPC is under pressure -- the factor
    scales linearly from 1x (calm, pressure 0) to 3x (cornered,
    pressure 100).  This forces the player to choose between pushing
    hard and maintaining trust.
    """
    was_cornered = peak_pressure >= 75
    if not was_cornered and delta_p <= 0:
        effective_decay = archetype.pressure_decay * ACCELERATED_DECAY_MULTIPLIER
    else:
        effective_decay = archetype.pressure_decay

    # Rapport erodes faster under pressure (1x at 0 -> 3x at 100)
    pressure_rapport_factor = 1.0 + (current_pressure / 100.0) * 2.0
    effective_rapport_decay = archetype.rapport_decay * pressure_rapport_factor

    p = current_pressure - effective_decay + delta_p
    r = current_rapport - effective_rapport_decay + delta_r
    new_p = max(0, min(100, round(p)))
    new_r = max(0, min(100, round(r)))
    return new_p, new_r, max(peak_pressure, new_p)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def process_turn(
    tactic_type: str,
    evidence_strength: str,
    npc_id: str,
    current_pressure: int,
    current_rapport: int,
    peak_pressure: int = 0,
    archetype_id: str = "professional_fixer",
) -> TurnResult:
    """Process one interrogation turn and return updated state.

    Parameters
    ----------
    archetype_id : str
        Archetype to use.  Must be a key in ``ARCHETYPES``; unknown values fall
        back to ``"professional_fixer"`` mechanics while preserving the given ID
        in the result.
    """
    archetype = ARCHETYPES.get(archetype_id)
    if archetype is None:
        archetype = ARCHETYPES["professional_fixer"]

    delta_p, delta_r = compute_deltas(tactic_type, evidence_strength, archetype)
    new_p, new_r, new_peak = apply_update(
        current_pressure,
        current_rapport,
        delta_p,
        delta_r,
        archetype,
        peak_pressure=peak_pressure,
    )

    return TurnResult(
        pressure=new_p,
        rapport=new_r,
        pressure_band=pressure_band(new_p).value,
        rapport_band=rapport_band(new_r).value,
        archetype_id=archetype_id,
        delta_pressure=delta_p,
        delta_rapport=delta_r,
        peak_pressure=new_peak,
    )


# ---------------------------------------------------------------------------
# Prompt builder -- injected into the main LLM context each turn
# ---------------------------------------------------------------------------

_BAND_GUIDANCE: dict[str, str] = {
    "calm": "You're relaxed. Answer easily, maybe even a little dismissive — this doesn't faze you.",
    "tense": "You're getting uncomfortable. Keep it together but let cracks show — shorter answers, a deflection here and there.",
    "shaken": "You're rattled. Trip over words, lose your train of thought, maybe say something you didn't mean to.",
    "cornered": "You're desperate. Snap at the detective, blurt things out, start giving ground you wouldn't normally give.",
}

_RAPPORT_GUIDANCE: dict[str, str] = {
    "cold": "You don't trust this detective at all. Give as little as possible. One-word answers are fine.",
    "neutral": "You're cooperating, barely. Answer what's asked but don't offer anything extra.",
    "open": "You're warming up to this detective. You'll share more freely — still careful, but willing to talk.",
    "trusting": "You trust this detective. You'll say things you'd normally keep to yourself.",
}

# ---------------------------------------------------------------------------
# Rapport-driven helpfulness -- controls how proactively NPCs share non-self-
# incriminating information at higher rapport levels.
# ---------------------------------------------------------------------------

_HIGH_RAPPORT_HELPFULNESS: dict[str, str] = {
    "open": (
        "RAPPORT-DRIVEN HELPFULNESS (OPEN level):\n"
        "You genuinely want to help the detective make progress. When answering "
        "questions, volunteer relevant details you have observed — things like "
        "who you saw in the hallways, odd behavior you noticed from other people, "
        "timeline details, or background context about relationships and tensions "
        "at the gala. Share your honest impressions and theories about other "
        "suspects when it feels natural.\n"
        "HOWEVER: Never volunteer information that would incriminate YOU, expose "
        "YOUR secrets, or put you at legal or personal risk. You are helpful "
        "about others, not confessional about yourself. Your own hidden truths "
        "still require evidence or direct confrontation to surface.\n"
        "Keep your helpfulness natural and conversational — you are someone who "
        "has warmed up to the detective, not someone dumping an encyclopedia. "
        "Weave useful observations into your answers rather than listing them."
    ),
    "trusting": (
        "RAPPORT-DRIVEN HELPFULNESS (TRUSTING level):\n"
        "You trust this detective and actively want to help solve the case. Go "
        "beyond just answering questions — proactively bring up things that have "
        "been weighing on your mind: suspicious moments you witnessed, rumors "
        "you heard, connections between people that struck you as odd, or details "
        "you previously held back because you were not sure they mattered. Offer "
        "your own theories about what might have happened and who had motive.\n"
        "You might say things like 'I was not going to mention this, but...' or "
        "'There is something that has been bothering me...' to signal you are "
        "sharing things you would not tell just anyone.\n"
        "CRITICAL LIMIT: Even at this trust level, you still protect yourself. "
        "Never volunteer your own secrets, hidden actions, or anything that could "
        "incriminate you or cause you direct personal harm. Those admissions "
        "still require the detective to confront you with evidence or catch you "
        "in a contradiction. Self-preservation is instinctive, even with someone "
        "you trust.\n"
        "Your helpfulness should feel like a genuine ally who wants justice — not "
        "a mechanical info source. Let your personality shape how you help."
    ),
}


def check_gate(
    conditions: list[GateCondition],
    pressure: int,
    rapport: int,
    player_evidence: list[str],
    player_discoveries: list[str],
) -> bool:
    """Return True if ANY condition in the gate is fully satisfied (OR logic).

    Within each condition dict, ALL requirements must be met (AND logic).
    """
    for condition in conditions:
        satisfied = True
        if "min_pressure" in condition and pressure < condition["min_pressure"]:
            satisfied = False
        if "min_rapport" in condition and rapport < condition["min_rapport"]:
            satisfied = False
        if "requires_evidence" in condition and not all(
            e in player_evidence for e in condition["requires_evidence"]
        ):
            satisfied = False
        if "requires_discovery" in condition and not all(
            d in player_discoveries for d in condition["requires_discovery"]
        ):
            satisfied = False
        if satisfied:
            return True
    return False


def filter_gated_discoveries(
    discovery_ids: list[str],
    gates_map: dict[str, list[GateCondition]],
    pressure: int,
    rapport: int,
    player_evidence: list[str],
    player_discoveries: list[str],
) -> tuple[list[str], list[str]]:
    """Apply mechanical gates to detected discoveries.

    Returns ``(passed_ids, blocked_ids)``.
    """
    passed: list[str] = []
    blocked: list[str] = []
    for did in discovery_ids:
        gates = gates_map.get(did)
        if gates is None:
            passed.append(did)
            continue
        if check_gate(gates, pressure, rapport, player_evidence, player_discoveries):
            passed.append(did)
        else:
            blocked.append(did)
            log.info(
                "[gate] Blocked discovery %s (pressure=%d, rapport=%d)",
                did,
                pressure,
                rapport,
            )
    return passed, blocked


def get_locked_secret_descriptions(
    npc_id: str,
    pressure: int,
    rapport: int,
    player_evidence: list[str],
    player_discoveries: list[str],
) -> list[str]:
    """Return locked-secret prompt lines for this NPC's unmet gates."""
    from .cases import get_active_case

    case = get_active_case()

    # Use CaseData.locked_secret_descriptions (populated from DB or Python module)
    locked_descs = case.locked_secret_descriptions

    locked: list[str] = []
    for discovery_id, gate_conditions in case.discovery_gates.items():
        # Only include gates that belong to this NPC
        if case.discovery_catalog.get(discovery_id, {}).get("npc_id") != npc_id:
            continue
        # If the gate is NOT satisfied, the secret is locked
        if not check_gate(gate_conditions, pressure, rapport, player_evidence, player_discoveries):
            desc = locked_descs.get(discovery_id)
            if desc:
                locked.append(desc)
    return locked


def build_interrogation_context(
    npc_id: str,
    current_pressure: int,
    current_rapport: int,
    tactic_type: str,
    evidence_strength: str,
    archetype_id: str = "professional_fixer",
    player_evidence: list[str] | None = None,
    player_discoveries: list[str] | None = None,
    locked_secret_descriptions: list[str] | None = None,
) -> str:
    """Build the system-prompt paragraph injected per turn.

    Parameters
    ----------
    archetype_id : str
        Archetype identifier — must be a key in ``ARCHETYPES``; unknown values
        fall back to ``"professional_fixer"`` mechanics.
    player_evidence : list[str] | None
        Evidence IDs the player currently holds (for gate awareness).
    player_discoveries : list[str] | None
        Discovery IDs the player has already collected (for gate awareness).
    locked_secret_descriptions : list[str] | None
        Pre-computed locked-secret description strings.  When provided, skips
        the internal ``get_locked_secret_descriptions`` lookup.  When ``None``,
        the lookup is performed automatically.
    """
    p_band = pressure_band(current_pressure)
    r_band = rapport_band(current_rapport)

    archetype = ARCHETYPES.get(archetype_id, ARCHETYPES["professional_fixer"])

    lines = [
        "INTERROGATION STATE (internal — do NOT mention these mechanics to the detective):",
        f"- Your archetype: {archetype.label}",
        f"- Emotional pressure level: {p_band.value.upper()}",
        f"- Rapport with the detective: {r_band.value.upper()}",
        f"- The detective's approach this turn: {tactic_type.replace('_', ' ')}",
        f"- Evidence weight presented: {evidence_strength}",
        "",
        "BEHAVIORAL GUIDANCE based on current state:",
        f"- {_BAND_GUIDANCE.get(p_band.value, '')}",
        f"- {_RAPPORT_GUIDANCE.get(r_band.value, '')}",
    ]

    if evidence_strength == "smoking_gun":
        lines.append(
            "- CRITICAL: The detective has presented undeniable evidence. "
            "Within this exchange or the next, you MUST begin conceding the "
            "relevant point. You may still try to minimize or reframe, but "
            "you cannot flatly deny what the evidence proves."
        )
    elif evidence_strength == "strong":
        lines.append(
            "- The detective has presented compelling evidence. You should "
            "show visible discomfort and avoid outright denial. Deflecting "
            "or partial admission is appropriate."
        )

    # Append rapport-driven helpfulness guidance at high rapport levels
    helpfulness = _HIGH_RAPPORT_HELPFULNESS.get(r_band.value)
    if helpfulness:
        lines.append("")
        lines.append(helpfulness)

    # Inject locked-secret awareness so the LLM avoids revealing gated secrets
    if locked_secret_descriptions is not None:
        locked_secrets = locked_secret_descriptions
    else:
        locked_secrets = get_locked_secret_descriptions(
            npc_id,
            current_pressure,
            current_rapport,
            player_evidence or [],
            player_discoveries or [],
        )
    if locked_secrets:
        lines.append("")
        lines.append(
            "LOCKED INFORMATION (do NOT reveal, hint at, or allude to these — "
            "the detective has not earned access yet):"
        )
        for desc in locked_secrets:
            lines.append(f"- {desc}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Detective's Intuition — trigger detection
# ---------------------------------------------------------------------------

_ATMOSPHERIC_CHANCE = 0.15  # ~15% random chance per turn


def should_show_intuition(
    *,
    npc_id: str,
    evidence_strength: str,
    discovery_ids: list[str],
    player_discovery_ids: list[str],
    discovery_catalog: dict[str, DiscoveryEntry],
) -> tuple[bool, str | None]:
    """Decide whether to show an intuition line and what kind.

    Returns ``(should_fire, moment_type)`` where *moment_type* is ``None``
    for atmospheric flavor text, or one of ``"dead_end"``,
    ``"breakthrough"``, ``"smoking_gun"`` for major-moment nudges.
    """
    # --- Major moment triggers (checked first, always shown) ---

    # Smoking-gun evidence presented
    if evidence_strength == "smoking_gun":
        return True, "smoking_gun"

    # First discovery with this NPC (breakthrough)
    if discovery_ids:
        prior_npc_discoveries = {
            did
            for did in player_discovery_ids
            if discovery_catalog.get(did, {}).get("npc_id") == npc_id
            and did not in discovery_ids  # exclude what was just found
        }
        if not prior_npc_discoveries:
            return True, "breakthrough"

    # All discoveries exhausted for this NPC (dead end)
    npc_total = {did for did, info in discovery_catalog.items() if info.get("npc_id") == npc_id}
    if npc_total:
        player_npc = npc_total & (set(player_discovery_ids) | set(discovery_ids))
        if player_npc == npc_total:
            return True, "dead_end"

    # --- Atmospheric trigger (random, no gameplay signal) ---
    if random.random() < _ATMOSPHERIC_CHANCE:
        return True, None

    return False, None


__all__ = [
    "check_gate",
    "filter_gated_discoveries",
    "process_turn",
    "build_interrogation_context",
    "pressure_band",
    "rapport_band",
    "GateCondition",
    "TurnResult",
    "ARCHETYPES",
    "should_show_intuition",
    "get_locked_secret_descriptions",
]
