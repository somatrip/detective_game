"""Echoes in the Atrium — case data assembly.

Imports all submodules and builds the :class:`~server.cases.CaseData` instance
that the engine loads at startup.
"""

from __future__ import annotations

from ..import CaseData
from .archetypes import NPC_ARCHETYPE_MAP
from .evidence import (
    DISCOVERY_CATALOG,
    EVIDENCE_CATALOG_DESCRIPTIONS,
    NPC_RELEVANT_EVIDENCE,
    SMOKING_GUN_MAP,
)
from .npc_profiles import NPC_PROFILES
from .world_context import WORLD_CONTEXT_PROMPT

case_data = CaseData(
    case_id="echoes_in_the_atrium",
    title="Echoes in the Atrium",
    world_context_prompt=WORLD_CONTEXT_PROMPT,
    npc_profiles=NPC_PROFILES,
    npc_archetype_map=NPC_ARCHETYPE_MAP,
    npc_relevant_evidence=NPC_RELEVANT_EVIDENCE,
    smoking_gun_map=SMOKING_GUN_MAP,
    evidence_catalog=EVIDENCE_CATALOG_DESCRIPTIONS,
    discovery_catalog=DISCOVERY_CATALOG,
)
