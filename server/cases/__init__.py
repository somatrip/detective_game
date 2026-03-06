"""Case data container and loader.

Each detective case is a self-contained sub-package under ``server.cases``
that exports a ``case_data`` attribute of type :class:`CaseData`.  The engine
loads one case at startup via :func:`load_case` and every module accesses it
through :func:`get_active_case`.
"""

from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Dict, List

if TYPE_CHECKING:
    from ..npc_registry import NPCProfile

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class CaseData:
    """Complete data package for one detective case."""

    case_id: str
    title: str
    world_context_prompt: str
    npc_profiles: Dict[str, NPCProfile]    # npc_id → NPCProfile
    npc_archetype_map: Dict[str, str]      # npc_id → archetype_id
    npc_relevant_evidence: Dict[str, List[str]]
    smoking_gun_map: Dict[str, List[str]]
    evidence_catalog: Dict[str, str]       # evidence_id → description
    discovery_catalog: Dict[str, Dict[str, Any]]  # discovery_id → {npc_id, evidence_id, description}
    discovery_gates: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)  # discovery_id → list of gate conditions

    def validate(self) -> None:
        """Check referential integrity across all case data maps.

        Raises ``ValueError`` on the first hard error; logs warnings for
        non-fatal issues so the game can still start.
        """
        errors: list[str] = []
        warnings: list[str] = []
        npc_ids = set(self.npc_profiles.keys())

        # Every NPC in archetype_map must exist in npc_profiles
        for npc_id in self.npc_archetype_map:
            if npc_id not in npc_ids:
                warnings.append(f"archetype_map references unknown NPC '{npc_id}'")

        # Every NPC in relevant_evidence and smoking_gun_map must exist
        for npc_id in self.npc_relevant_evidence:
            if npc_id not in npc_ids:
                warnings.append(f"npc_relevant_evidence references unknown NPC '{npc_id}'")
            for eid in self.npc_relevant_evidence[npc_id]:
                if eid not in self.evidence_catalog:
                    errors.append(f"npc_relevant_evidence['{npc_id}'] references unknown evidence '{eid}'")

        for npc_id in self.smoking_gun_map:
            if npc_id not in npc_ids:
                warnings.append(f"smoking_gun_map references unknown NPC '{npc_id}'")
            for eid in self.smoking_gun_map[npc_id]:
                if eid not in self.evidence_catalog:
                    errors.append(f"smoking_gun_map['{npc_id}'] references unknown evidence '{eid}'")

        # Every discovery must reference a valid NPC and evidence
        for did, info in self.discovery_catalog.items():
            npc_id = info.get("npc_id")
            if npc_id and npc_id not in npc_ids:
                errors.append(f"discovery '{did}' references unknown NPC '{npc_id}'")
            eid = info.get("evidence_id")
            if eid and eid not in self.evidence_catalog:
                errors.append(f"discovery '{did}' references unknown evidence '{eid}'")

        # Every gated discovery must exist in the discovery catalog
        for did in self.discovery_gates:
            if did not in self.discovery_catalog:
                errors.append(f"discovery_gates references unknown discovery '{did}'")

        for w in warnings:
            log.warning("[case-validate] %s: %s", self.case_id, w)
        if errors:
            for e in errors:
                log.error("[case-validate] %s: %s", self.case_id, e)
            raise ValueError(
                f"Case '{self.case_id}' has {len(errors)} data integrity error(s): {errors[0]}"
            )

        log.info("[case-validate] %s: all references OK", self.case_id)


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
    _active_case.validate()
    return _active_case


def get_active_case() -> CaseData:
    """Return the currently loaded case.  Raises if none loaded."""
    if _active_case is None:
        raise RuntimeError("No case loaded. Call load_case() at startup.")
    return _active_case
