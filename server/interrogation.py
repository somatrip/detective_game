"""Interrogation engine: archetypes, delta computation, band mapping, prompt builder.

All logic is deterministic (no LLM calls). The classifier module handles the
LLM-based turn classification; this module applies the mechanical results.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Tuple


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class PressureBand(str, Enum):
    CALM = "calm"          # 0–24
    TENSE = "tense"        # 25–49
    SHAKEN = "shaken"      # 50–74
    CORNERED = "cornered"  # 75–100


class RapportBand(str, Enum):
    COLD = "cold"          # 0–24
    NEUTRAL = "neutral"    # 25–49
    OPEN = "open"          # 50–74
    TRUSTING = "trusting"  # 75–100


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


ARCHETYPES: Dict[str, ArchetypeProfile] = {
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

#: Maps each NPC to their archetype.
NPC_ARCHETYPE_MAP: Dict[str, str] = {
    "lila-chen":     "professional_fixer",
    "amelia-reyes":  "professional_fixer",
    "noah-sterling": "proud_executive",
    "celeste-ward":  "anxious_insider",
    "gideon-holt":   "professional_fixer",
    "mira-kline":    "proud_executive",
    "eddie-voss":    "anxious_insider",
    "priya-shah":    "professional_fixer",
    "marcus-vale":   "anxious_insider",
}

# ---------------------------------------------------------------------------
# Base deltas and multipliers
# ---------------------------------------------------------------------------

#: (pressure_delta, rapport_delta) for each tactic type.
BASE_DELTAS: Dict[str, Tuple[int, int]] = {
    "open_ended":              (+3,   +5),
    "specific_factual":        (+8,   +2),
    "empathy":                 (-6,  +15),
    "present_evidence":        (+15,   +0),
    "point_out_contradiction": (+22,   -7),
    "direct_accusation":       (+28,  -12),
    "repeat_pressure":         (+12,   -4),
    "topic_change":            (-10,   +4),
}

#: Evidence-strength multiplier applied to the pressure delta.
EVIDENCE_MULTIPLIERS: Dict[str, float] = {
    "none":        1.0,
    "weak":        1.4,
    "strong":      2.0,
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
) -> Tuple[int, int]:
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
) -> Tuple[int, int, int]:
    """Apply deltas (with decay) and clamp to 0–100.

    Returns ``(new_pressure, new_rapport, new_peak_pressure)``.

    Accelerated decay kicks in when the NPC has never been cornered
    (peak_pressure < 75) and the current turn is not applying pressure
    (delta_p <= 0).  This makes pressure bleed away quickly if the
    player backs off before truly breaking the NPC.
    """
    was_cornered = peak_pressure >= 75
    if not was_cornered and delta_p <= 0:
        effective_decay = archetype.pressure_decay * ACCELERATED_DECAY_MULTIPLIER
    else:
        effective_decay = archetype.pressure_decay

    p = current_pressure - effective_decay + delta_p
    r = current_rapport - archetype.rapport_decay + delta_r
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
) -> dict:
    """Process one interrogation turn and return updated state.

    Returns a dict with keys:
        pressure, rapport, pressure_band, rapport_band,
        archetype_id, delta_pressure, delta_rapport, peak_pressure
    """
    archetype_id = NPC_ARCHETYPE_MAP.get(npc_id, "professional_fixer")
    archetype = ARCHETYPES[archetype_id]

    delta_p, delta_r = compute_deltas(tactic_type, evidence_strength, archetype)
    new_p, new_r, new_peak = apply_update(
        current_pressure, current_rapport, delta_p, delta_r, archetype,
        peak_pressure=peak_pressure,
    )

    return {
        "pressure": new_p,
        "rapport": new_r,
        "pressure_band": pressure_band(new_p).value,
        "rapport_band": rapport_band(new_r).value,
        "archetype_id": archetype_id,
        "delta_pressure": delta_p,
        "delta_rapport": delta_r,
        "peak_pressure": new_peak,
    }


# ---------------------------------------------------------------------------
# Prompt builder — injected into the main LLM context each turn
# ---------------------------------------------------------------------------

_BAND_GUIDANCE: Dict[str, str] = {
    "calm": "You're relaxed. Answer easily, maybe even a little dismissive — this doesn't faze you.",
    "tense": "You're getting uncomfortable. Keep it together but let cracks show — shorter answers, a deflection here and there.",
    "shaken": "You're rattled. Trip over words, lose your train of thought, maybe say something you didn't mean to.",
    "cornered": "You're desperate. Snap at the detective, blurt things out, start giving ground you wouldn't normally give.",
}

_RAPPORT_GUIDANCE: Dict[str, str] = {
    "cold": "You don't trust this detective at all. Give as little as possible. One-word answers are fine.",
    "neutral": "You're cooperating, barely. Answer what's asked but don't offer anything extra.",
    "open": "You're warming up to this detective. You'll share more freely — still careful, but willing to talk.",
    "trusting": "You trust this detective. You'll say things you'd normally keep to yourself.",
}

# ---------------------------------------------------------------------------
# Rapport-driven helpfulness — controls how proactively NPCs share non-self-
# incriminating information at higher rapport levels.
# ---------------------------------------------------------------------------

_HIGH_RAPPORT_HELPFULNESS: Dict[str, str] = {
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


def build_interrogation_context(
    npc_id: str,
    pressure_val: int,
    rapport_val: int,
    tactic_type: str,
    evidence_strength: str,
) -> str:
    """Build the system-prompt paragraph injected per turn."""
    p_band = pressure_band(pressure_val)
    r_band = rapport_band(rapport_val)
    archetype_id = NPC_ARCHETYPE_MAP.get(npc_id, "professional_fixer")
    archetype = ARCHETYPES[archetype_id]

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

    return "\n".join(lines)


__all__ = [
    "process_turn",
    "build_interrogation_context",
    "pressure_band",
    "rapport_band",
    "NPC_ARCHETYPE_MAP",
    "ARCHETYPES",
]
