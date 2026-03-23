"""Case data container and loader.

Each detective case is a self-contained sub-package under ``server.cases``
that exports a ``case_data`` attribute of type :class:`CaseData`.  The engine
loads one case at startup via :func:`load_case` and every module accesses it
through :func:`get_active_case`.
"""

from __future__ import annotations

import importlib
import logging
import pathlib
from collections import defaultdict
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from ..interrogation import GateCondition
    from ..npc_registry import NPCProfile

log = logging.getLogger(__name__)


class DiscoveryEntry(TypedDict):
    """Shape of a single entry in ``discovery_catalog``."""

    npc_id: str
    evidence_id: str
    description: str


@dataclass(frozen=True)
class CaseData:
    """Complete data package for one detective case."""

    case_id: str
    title: str
    world_context_prompt: str
    npc_profiles: dict[str, NPCProfile]  # npc_id → NPCProfile
    npc_archetype_map: dict[str, str]  # npc_id → archetype_id
    npc_relevant_evidence: dict[str, list[str]]
    smoking_gun_map: dict[str, list[str]]
    evidence_catalog: dict[str, str]  # evidence_id → description
    discovery_catalog: dict[
        str, DiscoveryEntry
    ]  # discovery_id → {npc_id, evidence_id, description}
    discovery_gates: dict[str, list[GateCondition]] = field(
        default_factory=dict
    )  # discovery_id → list of gate conditions
    locked_secret_descriptions: dict[str, str] = field(
        default_factory=dict
    )  # discovery_id → locked prompt text
    expressions: tuple[str, ...] = (
        "neutral", "guarded", "distressed", "angry", "contemplative", "smirking",
    )  # valid NPC expression labels; order doesn't matter
    intuition_prompt: str | None = (
        None  # per-case system prompt for detective intuition; None disables intuition
    )
    frontend_dir: str | None = (
        None  # kebab-case directory name under web/cases/; defaults to case_id with _ → -
    )
    tagline: str = ""

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
                    errors.append(
                        f"npc_relevant_evidence['{npc_id}'] references unknown evidence '{eid}'"
                    )

        for npc_id in self.smoking_gun_map:
            if npc_id not in npc_ids:
                warnings.append(f"smoking_gun_map references unknown NPC '{npc_id}'")
            for eid in self.smoking_gun_map[npc_id]:
                if eid not in self.evidence_catalog:
                    errors.append(
                        f"smoking_gun_map['{npc_id}'] references unknown evidence '{eid}'"
                    )

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


# Module-level cache of loaded cases, keyed by case_id
_loaded_cases: dict[str, CaseData] = {}

def _discover_case_ids() -> list[str]:
    """Auto-discover case sub-packages by scanning for directories with __init__.py."""
    cases_dir = pathlib.Path(__file__).parent
    return sorted(
        d.name for d in cases_dir.iterdir()
        if d.is_dir() and (d / "__init__.py").exists() and not d.name.startswith("_")
    )


def _fetch_npcs(sb: object, case_id_db: str) -> tuple[
    dict[str, NPCProfile], dict[str, str], dict[str, str]
]:
    """Fetch NPC rows and return (profiles, archetype_map, db_id_to_slug)."""
    from ..npc_registry import NPCProfile

    rows = (
        sb.table("npcs")
        .select(
            "id, npc_slug, display_name, system_prompt, timeline, voice, "
            "voice_instruction, gender, archetype_id, archetypes(name)"
        )
        .eq("case_id", case_id_db)
        .order("sort_order")
        .execute()
        .data
    )

    profiles: dict[str, NPCProfile] = {}
    archetype_map: dict[str, str] = {}
    db_id_to_slug: dict[str, str] = {}
    for row in rows:
        slug = row["npc_slug"]
        db_id_to_slug[row["id"]] = slug
        profiles[slug] = NPCProfile(
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
            archetype_map[slug] = arch_name

    return profiles, archetype_map, db_id_to_slug


def _fetch_evidence(sb: object, case_id_db: str) -> dict[str, str]:
    """Fetch evidence catalog from DB."""
    rows = (
        sb.table("evidence")
        .select("evidence_slug, description")
        .eq("case_id", case_id_db)
        .execute()
        .data
    )
    return {row["evidence_slug"]: row["description"] or "" for row in rows}


def _fetch_discoveries(sb: object, case_id_db: str) -> tuple[
    dict[str, DiscoveryEntry], dict[str, str], list[str]
]:
    """Fetch discoveries and return (catalog, id_to_slug, disc_db_ids)."""
    rows = (
        sb.table("discoveries")
        .select(
            "id, discovery_slug, description, npc_id, evidence_id, "
            "npcs(npc_slug), evidence(evidence_slug)"
        )
        .eq("case_id", case_id_db)
        .execute()
        .data
    )

    catalog: dict[str, DiscoveryEntry] = {}
    id_to_slug: dict[str, str] = {}
    for row in rows:
        slug = row["discovery_slug"]
        id_to_slug[row["id"]] = slug
        npc_info = row.get("npcs") or {}
        ev_info = row.get("evidence") or {}
        catalog[slug] = {
            "npc_id": npc_info.get("npc_slug", ""),
            "evidence_id": ev_info.get("evidence_slug", ""),
            "description": row["description"] or "",
        }

    return catalog, id_to_slug, [row["id"] for row in rows]


def _fetch_gates(
    sb: object, disc_db_ids: list[str], disc_id_to_slug: dict[str, str]
) -> dict[str, list[GateCondition]]:
    """Fetch discovery gates from DB."""
    if not disc_db_ids:
        return {}

    rows = (
        sb.table("discovery_gates")
        .select("*")
        .in_("discovery_id", disc_db_ids)
        .order("gate_index")
        .execute()
        .data
    )

    gates: dict[str, list[GateCondition]] = defaultdict(list)
    for gate in rows:
        disc_slug = disc_id_to_slug.get(gate["discovery_id"], "")
        if not disc_slug:
            continue
        condition: GateCondition = {}
        if gate.get("min_pressure") is not None:
            condition["min_pressure"] = gate["min_pressure"]
        if gate.get("min_rapport") is not None:
            condition["min_rapport"] = gate["min_rapport"]
        if gate.get("required_evidence_slugs"):
            condition["requires_evidence"] = gate["required_evidence_slugs"]
        if gate.get("required_discovery_slugs"):
            condition["requires_discovery"] = gate["required_discovery_slugs"]
        gates[disc_slug].append(condition)

    return dict(gates)


def _fetch_locked_secrets(
    sb: object, disc_db_ids: list[str], disc_id_to_slug: dict[str, str]
) -> dict[str, str]:
    """Fetch locked secret descriptions from DB."""
    if not disc_db_ids:
        return {}

    rows = (
        sb.table("locked_secret_descriptions")
        .select("discovery_id, description")
        .in_("discovery_id", disc_db_ids)
        .execute()
        .data
    )

    return {
        disc_id_to_slug[row["discovery_id"]]: row["description"]
        for row in rows
        if row["discovery_id"] in disc_id_to_slug
    }


def _fetch_evidence_relevance(
    sb: object,
    npc_db_id_to_slug: dict[str, str],
    npc_profiles: dict[str, object],
) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Fetch NPC evidence relevance and smoking gun map from DB."""
    npc_db_ids = list(npc_db_id_to_slug.keys())
    relevant: dict[str, list[str]] = defaultdict(list)
    smoking: dict[str, list[str]] = defaultdict(list)

    if npc_db_ids:
        rows = (
            sb.table("npc_evidence_relevance")
            .select("npc_id, is_smoking_gun, evidence(evidence_slug)")
            .in_("npc_id", npc_db_ids)
            .execute()
            .data
        )
        for row in rows:
            npc_slug = npc_db_id_to_slug.get(row["npc_id"], "")
            ev_info = row.get("evidence") or {}
            ev_slug = ev_info.get("evidence_slug", "")
            if npc_slug and ev_slug:
                relevant[npc_slug].append(ev_slug)
                if row.get("is_smoking_gun"):
                    smoking[npc_slug].append(ev_slug)

    # Ensure all NPCs appear in relevance map
    for slug in npc_profiles:
        if slug not in relevant:
            relevant[slug] = []

    return dict(relevant), dict(smoking)


def _load_case_from_db(case_slug: str) -> CaseData | None:
    """Try to load a CaseData from Supabase tables.

    Returns None if Supabase is not configured or the case doesn't exist in
    the DB, allowing the caller to fall back to Python modules.
    """
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
        npc_profiles, npc_archetype_map, npc_db_id_to_slug = _fetch_npcs(sb, case_id_db)
        evidence_catalog = _fetch_evidence(sb, case_id_db)
        discovery_catalog, disc_id_to_slug, disc_db_ids = _fetch_discoveries(sb, case_id_db)
        discovery_gates = _fetch_gates(sb, disc_db_ids, disc_id_to_slug)
        locked_secret_descriptions = _fetch_locked_secrets(sb, disc_db_ids, disc_id_to_slug)
        npc_relevant_evidence, smoking_gun_map = _fetch_evidence_relevance(
            sb, npc_db_id_to_slug, npc_profiles
        )
    except Exception as exc:
        log.error("[load-case-db] Failed to load case '%s' from DB: %s", case_slug, exc)
        return None

    return CaseData(
        case_id=case_slug,
        title=case["title"],
        world_context_prompt=case.get("world_context_prompt") or "",
        npc_profiles=npc_profiles,
        npc_archetype_map=npc_archetype_map,
        npc_relevant_evidence=npc_relevant_evidence,
        smoking_gun_map=smoking_gun_map,
        evidence_catalog=evidence_catalog,
        discovery_catalog=discovery_catalog,
        discovery_gates=discovery_gates,
        locked_secret_descriptions=locked_secret_descriptions,
        intuition_prompt=case.get("intuition_prompt") or None,
        frontend_dir=case.get("frontend_dir") or None,
        tagline=case.get("tagline") or "",
    )


def load_case(case_id: str) -> CaseData:
    """Load and return the CaseData for *case_id*.

    Tries to load from Supabase first.  If the case doesn't exist in the
    database (or Supabase is not configured), falls back to importing the
    Python sub-package under ``server.cases``.

    Loaded cases are cached in ``_loaded_cases`` so repeated calls are free.
    """
    if case_id in _loaded_cases:
        return _loaded_cases[case_id]

    # Try database first
    db_case = _load_case_from_db(case_id)
    if db_case is not None:
        # Augment DB-loaded case with Python module metadata not stored in DB
        if not db_case.frontend_dir or not db_case.tagline:
            from dataclasses import replace
            module = importlib.import_module(f".{case_id}", package=__name__)
            py_case = module.case_data
            db_case = replace(
                db_case,
                frontend_dir=db_case.frontend_dir or py_case.frontend_dir,
                tagline=db_case.tagline or py_case.tagline,
            )
        db_case.validate()
        _loaded_cases[case_id] = db_case
        log.info("[load-case] Loaded '%s' from database", case_id)
        return db_case

    # Fall back to Python module
    log.info(
        "[load-case] Loading '%s' from Python modules (DB not available or case not found)", case_id
    )
    module = importlib.import_module(f".{case_id}", package=__name__)
    case = module.case_data
    case.validate()
    _loaded_cases[case_id] = case
    return case


def load_all_cases() -> dict[str, CaseData]:
    """Load all known cases and return the loaded cases dict."""
    for case_id in _discover_case_ids():
        try:
            load_case(case_id)
        except Exception:
            log.exception("[load-all-cases] Failed to load case '%s'", case_id)
    return _loaded_cases


def _normalize_case_id(case_id: str) -> str:
    """Normalize a case ID from kebab-case or mixed format to underscore format."""
    return case_id.replace("-", "_")


def get_case(case_id: str) -> CaseData:
    """Return a loaded case by ID.  Accepts both kebab and underscore formats."""
    normalized = _normalize_case_id(case_id)
    case = _loaded_cases.get(normalized)
    if case is None:
        raise RuntimeError(f"Case '{case_id}' not loaded. Call load_case('{normalized}') first.")
    return case


def get_all_cases() -> dict[str, CaseData]:
    """Return all loaded cases."""
    return _loaded_cases


def get_active_case() -> CaseData:
    """Return the first loaded case for backward compatibility.  Raises if none loaded."""
    if not _loaded_cases:
        raise RuntimeError("No case loaded. Call load_case() at startup.")
    return next(iter(_loaded_cases.values()))
