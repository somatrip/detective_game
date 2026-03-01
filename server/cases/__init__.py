"""Case data container and loader.

Each detective case is a self-contained sub-package under ``server.cases``
that exports a ``case_data`` attribute of type :class:`CaseData`.  The engine
loads one case at startup via :func:`load_case` and every module accesses it
through :func:`get_active_case`.
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass(frozen=True)
class CaseData:
    """Complete data package for one detective case."""

    case_id: str
    title: str
    world_context_prompt: str
    npc_profiles: Dict[str, Any]         # npc_id → NPCProfile
    npc_archetype_map: Dict[str, str]    # npc_id → archetype_id
    npc_relevant_evidence: Dict[str, List[str]]
    smoking_gun_map: Dict[str, List[str]]
    evidence_catalog: Dict[str, str]     # evidence_id → description
    discovery_catalog: Dict[str, Dict[str, str]]  # discovery_id → {npc_id, evidence_id, description}


# Module-level singleton, set at startup
_active_case: CaseData | None = None


def load_case(case_id: str) -> CaseData:
    """Import and return the CaseData for *case_id*.

    The *case_id* must correspond to a sub-package under ``server.cases``,
    e.g. ``"echoes_in_the_atrium"`` → ``server.cases.echoes_in_the_atrium``.
    """
    global _active_case
    module = importlib.import_module(f".{case_id}", package=__name__)
    _active_case = module.case_data
    return _active_case


def get_active_case() -> CaseData:
    """Return the currently loaded case.  Raises if none loaded."""
    if _active_case is None:
        raise RuntimeError("No case loaded. Call load_case() at startup.")
    return _active_case
