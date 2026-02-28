"""Secondary LLM classifier for turn classification and evidence detection.

Uses a cheaper model (same provider) to classify player tactics, evidence
strength, detect revealed discoveries, and infer NPC expression — replacing
the regex-based tag parsing system.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

from ..config import settings

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Evidence knowledge base (used by tactic classifier for strength scoring)
# ---------------------------------------------------------------------------

#: Evidence relevant to each NPC (for evidence-strength scoring).
NPC_RELEVANT_EVIDENCE: Dict[str, List[str]] = {
    "noah-sterling": [
        "oil-cufflinks", "financial-misconduct", "encrypted-schedule",
        "key-trail", "surveillance", "burned-notebook",
    ],
    "amelia-reyes": ["key-trail", "lockpick-marks", "power-outage", "hotel-sale"],
    "eddie-voss": ["key-trail"],
    "celeste-ward": ["secret-affair", "audio-recording", "surveillance"],
    "gideon-holt": ["data-sales", "blackmail", "burned-notebook", "surveillance"],
    "mira-kline": ["plagiarism", "encrypted-schedule", "nda-ip"],
    "priya-shah": ["surveillance", "blackmail", "plagiarism"],
    "marcus-vale": ["stage-timing"],
    "lila-chen": [],
}

#: Evidence that constitutes a "smoking gun" for a specific NPC.
SMOKING_GUN_MAP: Dict[str, List[str]] = {
    "noah-sterling": ["oil-cufflinks"],
    "gideon-holt": ["data-sales"],
    "amelia-reyes": ["lockpick-marks"],
    "celeste-ward": ["audio-recording"],
}

#: Full evidence catalog with descriptions (still used by classify_player_turn
#: for evidence-strength scoring).
EVIDENCE_CATALOG_DESCRIPTIONS: Dict[str, str] = {
    "oil-trace": "Antique oil traces found at the crime scene or on the telescope mount",
    "burned-notebook": "A burned notebook fragment or threat list found in the incinerator",
    "keycard-logs": "Rooftop keycard access logs showing only four entry events after 10 PM: Holt (10:01), Tanaka (10:43), Mercer (11:08), Holt (11:44)",
    "key-trail": "The maintenance-room key and engineering keycard (ENGR-0001) were lent from Amelia to Eddie, then pressured from Eddie to Noah",
    "power-outage": "Someone DELIBERATELY pulled the breaker to cause the outage (not just mentioning lights went out)",
    "encrypted-schedule": "Mercer's encrypted schedule or a surprise board vote to oust Noah",
    "financial-misconduct": "Noah's embezzlement or gambling debts",
    "oil-cufflinks": "Antique oil was found on Noah Sterling's cufflinks",
    "surveillance": "Specific CCTV footage gaps or someone saw Noah near the freight elevator",
    "secret-affair": "The secret romantic relationship between Mercer and Celeste",
    "audio-recording": "Celeste possesses audio recordings of Mercer admitting illegal surveillance",
    "nda-ip": "An NDA draft implicating intellectual property theft",
    "blackmail": "Mercer was blackmailing someone using the burned notebook threat list",
    "data-sales": "Illegal selling of anonymized guest data from hotel systems",
    "plagiarism": "Mercer plagiarized Dr. Kline's research",
    "lockpick-marks": "Lockpick marks on the maintenance room door",
    "hotel-sale": "Mercer planned to sell the Lyric Atrium Hotel to a developer",
    "stage-timing": "Lighting console logs or cue sheet gaps showing someone's absence",
}

# ---------------------------------------------------------------------------
# Discovery catalog — used for discovery-level detection
# ---------------------------------------------------------------------------
# Each entry maps a discovery ID to the NPC that reveals it, the parent
# evidence category, and a specific description of what the NPC must
# EXPLICITLY reveal for this discovery to fire.

DISCOVERY_CATALOG: Dict[str, Dict[str, str]] = {
    # Amelia Reyes
    "amelia-key-loan": {
        "npc_id": "amelia-reyes",
        "evidence_id": "key-trail",
        "description": "Amelia admits she lent her maintenance-room key and engineering keycard to Eddie Voss",
    },
    "amelia-breaker": {
        "npc_id": "amelia-reyes",
        "evidence_id": "power-outage",
        "description": "Amelia deliberately pulled the breaker to cause the power outage and search Mercer's suite",
    },
    "amelia-hotel-sale": {
        "npc_id": "amelia-reyes",
        "evidence_id": "hotel-sale",
        "description": "Amelia learned that Mercer intended to sell the hotel to a developer, threatening the hotel's heritage",
    },
    "amelia-lockpick": {
        "npc_id": "amelia-reyes",
        "evidence_id": "lockpick-marks",
        "description": "Lockpick marks on the maintenance door suggest someone forced entry since Amelia's key was already with Eddie",
    },
    # Noah Sterling
    "noah-embezzlement": {
        "npc_id": "noah-sterling",
        "evidence_id": "financial-misconduct",
        "description": "Noah embezzled company funds to cover gambling debts and Mercer discovered this",
    },
    "noah-board-vote": {
        "npc_id": "noah-sterling",
        "evidence_id": "encrypted-schedule",
        "description": "Mercer planned a surprise board vote specifically to oust or remove Noah from the company",
    },
    "noah-oil-cufflinks": {
        "npc_id": "noah-sterling",
        "evidence_id": "oil-cufflinks",
        "description": "Antique oil residue was found on Noah's cufflinks, matching the telescope mount oil",
    },
    "noah-key-access": {
        "npc_id": "noah-sterling",
        "evidence_id": "key-trail",
        "description": "Noah obtained the maintenance-room key and engineering keycard (ENGR-0001) through Eddie Voss, giving him rooftop access",
    },
    "noah-cctv-gap": {
        "npc_id": "noah-sterling",
        "evidence_id": "surveillance",
        "description": "CCTV footage gaps or witness sightings place Noah near the freight elevator or on the B1 elevator lobby camera entering the service elevator lobby",
    },
    # Celeste Ward
    "celeste-affair": {
        "npc_id": "celeste-ward",
        "evidence_id": "secret-affair",
        "description": "Celeste and Julian Mercer had a secret romantic relationship",
    },
    "celeste-recordings": {
        "npc_id": "celeste-ward",
        "evidence_id": "audio-recording",
        "description": "Celeste possesses audio recordings of Mercer admitting to illegal surveillance tactics",
    },
    "celeste-rooftop-witness": {
        "npc_id": "celeste-ward",
        "evidence_id": "surveillance",
        "description": "Celeste saw a figure she recognized as Noah Sterling descending the atrium stairwell during the blackout",
    },
    # Gideon Holt
    "gideon-blackmail": {
        "npc_id": "gideon-holt",
        "evidence_id": "blackmail",
        "description": "Mercer was blackmailing Gideon — his name appears on the burned notebook threat list",
    },
    "gideon-data-sales": {
        "npc_id": "gideon-holt",
        "evidence_id": "data-sales",
        "description": "Gideon runs a side business selling anonymized guest data from the hotel's systems",
    },
    "gideon-notebook": {
        "npc_id": "gideon-holt",
        "evidence_id": "burned-notebook",
        "description": "The burned notebook fragment lists Gideon Holt as one of Mercer's blackmail targets",
    },
    "gideon-saw-noah": {
        "npc_id": "gideon-holt",
        "evidence_id": "surveillance",
        "description": "Gideon saw Noah Sterling on the B1 elevator lobby camera entering the service elevator lobby right before the blackout",
    },
    # Dr. Mira Kline
    "mira-plagiarism": {
        "npc_id": "mira-kline",
        "evidence_id": "plagiarism",
        "description": "Mercer plagiarized Dr. Kline's research for the Panopticon ethics framework",
    },
    "mira-meeting": {
        "npc_id": "mira-kline",
        "evidence_id": "encrypted-schedule",
        "description": "Mira scheduled a private meeting with Mercer at 11:30 PM to demand a public admission",
    },
    # Eddie Voss
    "eddie-key-loan": {
        "npc_id": "eddie-voss",
        "evidence_id": "key-trail",
        "description": "Eddie borrowed Amelia's maintenance-room key and engineering keycard to retrieve a toolkit",
    },
    "eddie-gave-noah-key": {
        "npc_id": "eddie-voss",
        "evidence_id": "key-trail",
        "description": "Noah Sterling pressured Eddie into handing over the maintenance-room key and engineering keycard",
    },
    # Priya Shah
    "priya-saw-noah": {
        "npc_id": "priya-shah",
        "evidence_id": "surveillance",
        "description": "Priya witnessed Noah Sterling near the freight elevator shortly before the lights went out",
    },
    "priya-holt-argument": {
        "npc_id": "priya-shah",
        "evidence_id": "blackmail",
        "description": "Priya recorded snippets of an argument between Mercer and Gideon Holt",
    },
    "priya-mira-tip": {
        "npc_id": "priya-shah",
        "evidence_id": "plagiarism",
        "description": "Dr. Mira Kline tipped off Priya about Mercer's ethics violations and arranged her gala attendance",
    },
    # Marcus Vale
    "marcus-noah-absence": {
        "npc_id": "marcus-vale",
        "evidence_id": "stage-timing",
        "description": "Marcus's cue sheet shows Noah Sterling was absent for a 5-minute cue-sheet gap before the blackout (11:05-11:10 PM), and roughly 30 minutes total before reappearing at ~11:35 PM",
    },
    "marcus-celeste-break": {
        "npc_id": "marcus-vale",
        "evidence_id": "stage-timing",
        "description": "Marcus noticed Celeste Ward took an unscheduled break during the blackout",
    },
}

VALID_TACTIC_TYPES = {
    "open_ended", "specific_factual", "empathy", "present_evidence",
    "point_out_contradiction", "direct_accusation", "repeat_pressure",
    "topic_change",
}

VALID_EVIDENCE_STRENGTHS = {"none", "weak", "strong", "smoking_gun"}

VALID_EXPRESSIONS = {
    "neutral", "guarded", "distressed", "angry", "contemplative", "smirking",
}

_LANGUAGE_NAMES: Dict[str, str] = {
    "en": "English",
    "sr": "Serbian (srpski, Latin script)",
}

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

_CLASSIFY_TURN_SYSTEM = """You are a game-mechanics classifier for an interrogation detective game.

Given the player's message to an NPC suspect, classify:

1. **tactic_type** — the interrogation tactic the player is using. Exactly one of:
   - open_ended: General, exploratory question or statement
   - specific_factual: Targeted factual question (who/what/when/where/how)
   - empathy: Building rapport, showing understanding, offering reassurance
   - present_evidence: Explicitly presenting or referencing evidence they possess
   - point_out_contradiction: Highlighting inconsistencies in the NPC's story
   - direct_accusation: Directly accusing the NPC of wrongdoing or the crime
   - repeat_pressure: Repeating or rephrasing a question the NPC already deflected
   - topic_change: Shifting to a completely different subject

2. **evidence_strength** — how strong the evidence referenced is, relative to THIS specific NPC. Exactly one of:
   - none: No evidence referenced
   - weak: References evidence but it's only tangentially relevant to this NPC
   - strong: References evidence directly relevant to this NPC's secrets
   - smoking_gun: References the most damning physical evidence against this NPC

Context for this NPC ({npc_id}):
- Evidence directly relevant to this NPC: {relevant_evidence}
- Smoking-gun evidence for this NPC: {smoking_gun}
- Evidence the player currently possesses: {player_evidence}

Respond with ONLY a JSON object: {{"tactic_type": "...", "evidence_strength": "..."}}"""

_CLASSIFY_TURN_USER = """Player's message to {npc_name}:
\"{message}\"

Recent conversation context (last few turns):
{recent_context}"""


_DETECT_EVIDENCE_SYSTEM = """You are analyzing an NPC's dialogue response in a detective mystery game to detect three things:

1. **discovery_ids** — List of discovery IDs for NEW secrets the NPC revealed in this response.

   CRITICAL RULES — be VERY conservative:
   - The NPC must have EXPLICITLY revealed the specific secret described in the discovery entry.
   - Merely MENTIONING a related topic is NOT enough. For example, mentioning "corporate tensions"
     is NOT the same as revealing "Mercer planned a board vote to oust Noah."
   - Vague references, general knowledge, or surface-level mentions do NOT count.
   - The NPC must provide NEW SPECIFIC INFORMATION that the player did not already know.
   - Do NOT include discoveries the player already collected (listed below).
   - Do NOT tag common knowledge (everyone knows about the gala, the blackout, Mercer's death).
   - When in doubt, do NOT tag it. The list should be EMPTY for most responses.
   - A typical conversation has 10+ exchanges before any discovery is revealed.

2. **expression** — The NPC's emotional state in this response. Exactly one of:
   neutral, guarded, distressed, angry, contemplative, smirking

3. **discovery_summaries** — For EACH discovery ID you tag, write a single sentence (max 30 words)
   summarizing ONLY what the NPC actually stated or revealed in this specific response.

   CRITICAL RULES for summaries:
   - Describe ONLY information the NPC explicitly communicated — nothing inferred or from background knowledge.
   - Use the NPC's name as subject (e.g., "Amelia admits...", "Eddie reveals...").
   - Do NOT reference evidence names, document titles, or items the NPC did not mention.
   - Keep it factual and concise — one sentence per discovery ID.
   - Write the summary in {language_name}.

The NPC speaking is: {npc_id} ({npc_name})

Discovery catalog for this NPC (tag ONLY when the SPECIFIC secret described is explicitly revealed — not just alluded to):
{discovery_catalog}

Discoveries the player has ALREADY collected (do NOT re-tag these): {already_collected}

Respond with ONLY a JSON object: {{"discovery_ids": [...], "expression": "...", "discovery_summaries": {{"<id>": "<summary>", ...}}}}"""

_DETECT_EVIDENCE_USER = """Player's message: \"{player_message}\"

NPC response: \"{response}\""""

# ---------------------------------------------------------------------------
# NPC display names for prompt context
# ---------------------------------------------------------------------------

_NPC_NAMES: Dict[str, str] = {
    "lila-chen": "Detective Lila Chen",
    "amelia-reyes": "Amelia Reyes (Head Engineer)",
    "noah-sterling": "Noah Sterling (Co-Founder, Panopticon)",
    "celeste-ward": "Celeste Ward (Jazz Vocalist)",
    "gideon-holt": "Gideon Holt (Security Director)",
    "mira-kline": "Dr. Mira Kline (Ethicist Consultant)",
    "eddie-voss": "Eddie Voss (Junior Engineer)",
    "priya-shah": "Priya Shah (Investigative Journalist)",
    "marcus-vale": "Marcus Vale (Stage Manager)",
}

# ---------------------------------------------------------------------------
# Provider-specific LLM calls
# ---------------------------------------------------------------------------

async def _call_openai_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    """Call OpenAI classifier model and parse JSON response."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key or "")
    response = await client.chat.completions.create(
        model=settings.openai_classifier_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=512,
    )
    text = response.choices[0].message.content or "{}"
    return json.loads(text)


async def _call_anthropic_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    """Call Anthropic classifier model and parse JSON response."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key or "")
    response = await client.messages.create(
        model=settings.anthropic_classifier_model,
        max_tokens=512,
        system=system_prompt + "\n\nRespond with ONLY valid JSON, no other text.",
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = response.content[0].text.strip()
    # Extract JSON from potential markdown fencing
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(
            l for l in lines if not l.startswith("```")
        ).strip()
    return json.loads(text)


async def _call_classifier_json(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    """Route to the correct provider for classifier calls."""
    provider = settings.llm_provider.lower()
    if provider == "openai":
        return await _call_openai_json(system_prompt, user_prompt)
    elif provider == "anthropic":
        return await _call_anthropic_json(system_prompt, user_prompt)
    else:
        # Local stub — return empty defaults
        return {}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def classify_player_turn(
    message: str,
    npc_id: str,
    player_evidence_ids: List[str],
    conversation_history: List[Dict[str, str]],
) -> Dict[str, str]:
    """Classify the player's interrogation tactic and evidence strength.

    Returns ``{"tactic_type": "...", "evidence_strength": "..."}``.
    """
    relevant = NPC_RELEVANT_EVIDENCE.get(npc_id, [])
    smoking = SMOKING_GUN_MAP.get(npc_id, [])
    npc_name = _NPC_NAMES.get(npc_id, npc_id)

    system_prompt = _CLASSIFY_TURN_SYSTEM.format(
        npc_id=npc_id,
        relevant_evidence=", ".join(relevant) if relevant else "(none)",
        smoking_gun=", ".join(smoking) if smoking else "(none)",
        player_evidence=", ".join(player_evidence_ids) if player_evidence_ids else "(none)",
    )

    # Build recent context (last 4 turns)
    recent = conversation_history[-4:] if conversation_history else []
    recent_lines = []
    for turn in recent:
        role = "Detective" if turn.get("role") == "user" else npc_name
        recent_lines.append(f"{role}: {turn.get('content', '')[:200]}")
    recent_context = "\n".join(recent_lines) if recent_lines else "(start of conversation)"

    user_prompt = _CLASSIFY_TURN_USER.format(
        npc_name=npc_name,
        message=message,
        recent_context=recent_context,
    )

    try:
        result = await _call_classifier_json(system_prompt, user_prompt)
    except Exception:
        log.exception("Classifier failed for classify_player_turn")
        result = {}

    # Validate and default
    tactic = result.get("tactic_type", "open_ended")
    if tactic not in VALID_TACTIC_TYPES:
        tactic = "open_ended"

    strength = result.get("evidence_strength", "none")
    if strength not in VALID_EVIDENCE_STRENGTHS:
        strength = "none"

    return {"tactic_type": tactic, "evidence_strength": strength}


async def detect_evidence(
    npc_response: str,
    npc_id: str,
    already_collected: List[str],
    player_message: str = "",
    language: str = "en",
) -> Dict[str, Any]:
    """Detect discoveries revealed and expression in the NPC's response.

    Uses discovery-level detection: checks against individual discovery
    descriptions for the current NPC, enabling progressive revelation.

    Parameters
    ----------
    already_collected : list[str]
        Discovery IDs (not evidence IDs) the player has already collected.
    language : str
        Language code for generating discovery summaries ('en' or 'sr').

    Returns ``{"discovery_ids": [...], "evidence_ids": [...],
               "expression": "...", "discovery_summaries": {...}}``.
    """
    npc_name = _NPC_NAMES.get(npc_id, npc_id)
    language_name = _LANGUAGE_NAMES.get(language, "English")

    # Filter discovery catalog to current NPC
    npc_discoveries = {
        did: info for did, info in DISCOVERY_CATALOG.items()
        if info["npc_id"] == npc_id
    }

    if not npc_discoveries:
        return {
            "discovery_ids": [],
            "evidence_ids": [],
            "expression": "neutral",
            "discovery_summaries": {},
        }

    catalog_lines = []
    for did, info in npc_discoveries.items():
        catalog_lines.append(f"- {did}: {info['description']}")
    catalog_text = "\n".join(catalog_lines)

    system_prompt = _DETECT_EVIDENCE_SYSTEM.format(
        npc_id=npc_id,
        npc_name=npc_name,
        discovery_catalog=catalog_text,
        already_collected=", ".join(already_collected) if already_collected else "(none)",
        language_name=language_name,
    )

    user_prompt = _DETECT_EVIDENCE_USER.format(
        player_message=player_message,
        response=npc_response,
    )

    try:
        result = await _call_classifier_json(system_prompt, user_prompt)
    except Exception:
        log.exception("Classifier failed for detect_evidence")
        result = {}

    # Validate discovery IDs
    raw_ids = result.get("discovery_ids", [])
    if not isinstance(raw_ids, list):
        raw_ids = []
    valid_ids = [
        did for did in raw_ids
        if isinstance(did, str) and did in npc_discoveries
        and did not in already_collected
    ]

    # Derive evidence IDs from discoveries
    evidence_ids = list({
        DISCOVERY_CATALOG[did]["evidence_id"]
        for did in valid_ids
    })

    # Validate discovery summaries
    raw_summaries = result.get("discovery_summaries", {})
    if not isinstance(raw_summaries, dict):
        raw_summaries = {}
    discovery_summaries = {}
    for did in valid_ids:
        s = raw_summaries.get(did, "")
        if isinstance(s, str) and 5 < len(s) < 300:
            discovery_summaries[did] = s

    # Validate expression
    expression = result.get("expression", "neutral")
    if expression not in VALID_EXPRESSIONS:
        expression = "neutral"

    return {
        "discovery_ids": valid_ids,
        "evidence_ids": evidence_ids,
        "expression": expression,
        "discovery_summaries": discovery_summaries,
    }


__all__ = ["classify_player_turn", "detect_evidence"]
