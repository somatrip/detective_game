"""Case data container and loader.

Each detective case is a self-contained sub-package under ``server.cases``
that exports a ``case_data`` attribute of type :class:`CaseData`.  The engine
loads one case at startup via :func:`load_case` and every module accesses it
through :func:`get_active_case`.
"""

from __future__ import annotations

import importlib
import logging
from collections import defaultdict
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
    locked_secret_descriptions: Dict[str, str] = field(default_factory=dict)  # discovery_id → locked prompt text
    intuition_prompt: str | None = None  # per-case system prompt for detective intuition; None disables intuition

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


def _load_case_from_db(case_slug: str) -> CaseData | None:
    """Try to load a CaseData from Supabase tables.

    Returns None if Supabase is not configured or the case doesn't exist in
    the DB, allowing the caller to fall back to Python modules.
    """
    from ..npc_registry import NPCProfile
    from ..supabase_client import get_supabase

    sb = get_supabase()
    if sb is None:
        return None

    # Fetch the case row by slug
    try:
        case_row = sb.table("cases").select("*").eq("slug", case_slug).maybe_single().execute()
    except Exception:
        log.debug("DB case lookup failed for '%s', falling back to modules", case_slug)
        return None

    if not case_row or not case_row.data:
        return None

    case = case_row.data
    case_id_db = case["id"]

    log.info("[load-case-db] Loading case '%s' (id=%s) from database", case_slug, case_id_db)

    try:
        # Fetch NPCs with their archetype (include id for relevance lookup later)
        npcs_rows = sb.table("npcs").select(
            "id, npc_slug, display_name, system_prompt, timeline, voice, voice_instruction, gender, archetype_id, archetypes(name)"
        ).eq("case_id", case_id_db).order("sort_order").execute().data

        npc_profiles: Dict[str, NPCProfile] = {}
        npc_archetype_map: Dict[str, str] = {}
        npc_db_id_to_slug: Dict[str, str] = {}
        for row in npcs_rows:
            slug = row["npc_slug"]
            npc_db_id_to_slug[row["id"]] = slug
            npc_profiles[slug] = NPCProfile(
                npc_id=slug,
                display_name=row["display_name"],
                system_prompt=row["system_prompt"] or "",
                timeline=row["timeline"] or "",
                voice=row["voice"] or "alloy",
                voice_instruction=row["voice_instruction"] or "",
                gender=row["gender"] or "male",
            )
            arch = row.get("archetypes") or {}
            arch_name = arch.get("name")
            if arch_name:
                npc_archetype_map[slug] = arch_name

        # Fetch evidence
        ev_rows = sb.table("evidence").select("evidence_slug, description").eq("case_id", case_id_db).execute().data
        evidence_catalog: Dict[str, str] = {
            row["evidence_slug"]: row["description"] or "" for row in ev_rows
        }

        # Fetch discoveries
        disc_rows = sb.table("discoveries").select(
            "id, discovery_slug, description, npc_id, evidence_id, npcs(npc_slug), evidence(evidence_slug)"
        ).eq("case_id", case_id_db).execute().data

        discovery_catalog: Dict[str, Dict[str, Any]] = {}
        disc_id_to_slug: Dict[str, str] = {}
        for row in disc_rows:
            slug = row["discovery_slug"]
            disc_id_to_slug[row["id"]] = slug
            npc_info = row.get("npcs") or {}
            ev_info = row.get("evidence") or {}
            discovery_catalog[slug] = {
                "npc_id": npc_info.get("npc_slug", ""),
                "evidence_id": ev_info.get("evidence_slug", ""),
                "description": row["description"] or "",
            }

        # Fetch discovery gates
        disc_ids = [row["id"] for row in disc_rows]
        gates_rows = []
        if disc_ids:
            gates_rows = sb.table("discovery_gates").select("*").in_(
                "discovery_id", disc_ids
            ).order("gate_index").execute().data

        discovery_gates: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for gate in gates_rows:
            disc_slug = disc_id_to_slug.get(gate["discovery_id"], "")
            if not disc_slug:
                continue
            condition: Dict[str, Any] = {}
            if gate.get("min_pressure") is not None:
                condition["min_pressure"] = gate["min_pressure"]
            if gate.get("min_rapport") is not None:
                condition["min_rapport"] = gate["min_rapport"]
            if gate.get("required_evidence_slugs"):
                condition["requires_evidence"] = gate["required_evidence_slugs"]
            if gate.get("required_discovery_slugs"):
                condition["requires_discovery"] = gate["required_discovery_slugs"]
            discovery_gates[disc_slug].append(condition)

        # Fetch locked secret descriptions
        locked_secrets_rows = []
        if disc_ids:
            locked_secrets_rows = sb.table("locked_secret_descriptions").select(
                "discovery_id, description"
            ).in_("discovery_id", disc_ids).execute().data

        locked_secret_descriptions: Dict[str, str] = {}
        for row in locked_secrets_rows:
            disc_slug = disc_id_to_slug.get(row["discovery_id"], "")
            if disc_slug:
                locked_secret_descriptions[disc_slug] = row["description"]

        # Fetch NPC evidence relevance and smoking gun map (reuse npcs_rows, no redundant query)
        npc_db_ids = list(npc_db_id_to_slug.keys())

        npc_relevant_evidence: Dict[str, List[str]] = defaultdict(list)
        smoking_gun_map: Dict[str, List[str]] = defaultdict(list)

        if npc_db_ids:
            rel_rows = sb.table("npc_evidence_relevance").select(
                "npc_id, is_smoking_gun, evidence(evidence_slug)"
            ).in_("npc_id", npc_db_ids).execute().data

            for row in rel_rows:
                npc_slug = npc_db_id_to_slug.get(row["npc_id"], "")
                ev_info = row.get("evidence") or {}
                ev_slug = ev_info.get("evidence_slug", "")
                if npc_slug and ev_slug:
                    npc_relevant_evidence[npc_slug].append(ev_slug)
                    if row.get("is_smoking_gun"):
                        smoking_gun_map[npc_slug].append(ev_slug)

        # Ensure all NPCs appear in relevance map (even with empty lists)
        for slug in npc_profiles:
            if slug not in npc_relevant_evidence:
                npc_relevant_evidence[slug] = []

    except Exception as exc:
        log.error("[load-case-db] Failed to load case '%s' from DB: %s", case_slug, exc)
        return None

    return CaseData(
        case_id=case_slug,
        title=case["title"],
        world_context_prompt=case.get("world_context_prompt") or "",
        npc_profiles=npc_profiles,
        npc_archetype_map=npc_archetype_map,
        npc_relevant_evidence=dict(npc_relevant_evidence),
        smoking_gun_map=dict(smoking_gun_map),
        evidence_catalog=evidence_catalog,
        discovery_catalog=discovery_catalog,
        discovery_gates=dict(discovery_gates),
        locked_secret_descriptions=locked_secret_descriptions,
        intuition_prompt=case.get("intuition_prompt") or None,
    )


def load_case(case_id: str) -> CaseData:
    """Load and return the CaseData for *case_id*.

    Tries to load from Supabase first.  If the case doesn't exist in the
    database (or Supabase is not configured), falls back to importing the
    Python sub-package under ``server.cases``.
    """
    global _active_case

    # Try database first
    db_case = _load_case_from_db(case_id)
    if db_case is not None:
        _active_case = db_case
        _active_case.validate()
        log.info("[load-case] Loaded '%s' from database", case_id)
        return _active_case

    # Fall back to Python module
    log.info("[load-case] Loading '%s' from Python modules (DB not available or case not found)", case_id)
    module = importlib.import_module(f".{case_id}", package=__name__)
    _active_case = module.case_data
    _active_case.validate()
    return _active_case


def get_active_case() -> CaseData:
    """Return the currently loaded case.  Raises if none loaded."""
    if _active_case is None:
        raise RuntimeError("No case loaded. Call load_case() at startup.")
    return _active_case
