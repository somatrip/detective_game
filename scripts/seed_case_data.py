"""Seed Supabase case content tables from Python modules.

Seeds ALL auto-discovered cases into the database.

Usage:
    python -m scripts.seed_case_data          # seed all cases
    python -m scripts.seed_case_data case_id  # seed a specific case

Requires SUPABASE_URL and SUPABASE_KEY (service role key) in .env.
"""

from __future__ import annotations

import logging
import sys
from collections import defaultdict

import importlib

from server.cases import CaseData, _discover_case_ids
from server.interrogation import ARCHETYPES
from server.supabase_client import get_supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def _seed_archetypes(sb) -> dict[str, str]:
    """Seed shared archetypes table and return name→uuid map."""
    log.info("Seeding archetypes...")
    archetype_rows = []
    for arch in ARCHETYPES.values():
        archetype_rows.append(
            {
                "name": arch.archetype_id,
                "label": arch.label,
                "pressure_scale": arch.pressure_scale,
                "rapport_scale": arch.rapport_scale,
                "pressure_decay": arch.pressure_decay,
                "rapport_decay": arch.rapport_decay,
                "contradiction_bonus": arch.contradiction_bonus,
                "empathy_bonus": arch.empathy_bonus,
            }
        )
    sb.table("archetypes").upsert(archetype_rows, on_conflict="name").execute()
    arch_resp = sb.table("archetypes").select("id, name").execute()
    arch_map = {r["name"]: r["id"] for r in arch_resp.data}
    log.info("  %d archetypes seeded", len(arch_map))
    return arch_map


def _seed_case(sb, case: CaseData, arch_map: dict[str, str]) -> None:
    """Seed a single case and all its related data into Supabase."""
    log.info("Seeding case '%s' (%s)...", case.case_id, case.title)

    # ── Case row ──────────────────────────────────────────────────────
    case_row = {
        "slug": case.case_id,
        "title": case.title,
        "world_context_prompt": case.world_context_prompt,
        "intuition_prompt": case.intuition_prompt or "",
    }
    sb.table("cases").upsert(case_row, on_conflict="slug").execute()
    case_resp = sb.table("cases").select("id").eq("slug", case.case_id).single().execute()
    case_db_id = case_resp.data["id"]
    log.info("  Case DB ID: %s", case_db_id)

    # ── NPCs ──────────────────────────────────────────────────────────
    log.info("  Seeding NPCs...")
    npc_rows = []
    for i, (npc_slug, profile) in enumerate(case.npc_profiles.items()):
        arch_name = case.npc_archetype_map.get(npc_slug, "professional_fixer")
        npc_rows.append(
            {
                "case_id": case_db_id,
                "npc_slug": npc_slug,
                "display_name": profile.display_name,
                "system_prompt": profile.system_prompt,
                "timeline": profile.timeline or "",
                "archetype_id": arch_map.get(arch_name),
                "voice": profile.voice or "alloy",
                "voice_instruction": profile.voice_instruction or "",
                "gender": profile.gender or "male",
                "sort_order": i,
            }
        )
    sb.table("npcs").upsert(npc_rows, on_conflict="case_id,npc_slug").execute()

    npc_resp = sb.table("npcs").select("id, npc_slug").eq("case_id", case_db_id).execute()
    npc_map = {r["npc_slug"]: r["id"] for r in npc_resp.data}
    log.info("  %d NPCs seeded", len(npc_map))

    # ── Evidence ──────────────────────────────────────────────────────
    log.info("  Seeding evidence...")
    evidence_rows = []
    for i, (ev_slug, desc) in enumerate(case.evidence_catalog.items()):
        evidence_rows.append(
            {
                "case_id": case_db_id,
                "evidence_slug": ev_slug,
                "label": ev_slug.replace("-", " ").title(),
                "description": desc,
                "evidence_group": "physical",  # default; can be overridden in DB
                "sort_order": i,
            }
        )
    sb.table("evidence").upsert(evidence_rows, on_conflict="case_id,evidence_slug").execute()

    ev_resp = (
        sb.table("evidence").select("id, evidence_slug").eq("case_id", case_db_id).execute()
    )
    ev_map = {r["evidence_slug"]: r["id"] for r in ev_resp.data}
    log.info("  %d evidence items seeded", len(ev_map))

    # ── Discoveries ───────────────────────────────────────────────────
    log.info("  Seeding discoveries...")
    disc_rows = []
    for disc_slug, info in case.discovery_catalog.items():
        npc_uuid = npc_map.get(info["npc_id"])
        ev_uuid = ev_map.get(info["evidence_id"])
        if not npc_uuid or not ev_uuid:
            log.warning("  Skipping discovery %s: missing NPC or evidence", disc_slug)
            continue
        disc_rows.append(
            {
                "case_id": case_db_id,
                "discovery_slug": disc_slug,
                "npc_id": npc_uuid,
                "evidence_id": ev_uuid,
                "description": info["description"],
            }
        )
    sb.table("discoveries").upsert(disc_rows, on_conflict="case_id,discovery_slug").execute()

    disc_resp = (
        sb.table("discoveries").select("id, discovery_slug").eq("case_id", case_db_id).execute()
    )
    disc_map = {r["discovery_slug"]: r["id"] for r in disc_resp.data}
    log.info("  %d discoveries seeded", len(disc_map))

    # ── Discovery gates ───────────────────────────────────────────────
    log.info("  Seeding discovery gates...")
    # Delete existing gates for this case's discoveries, then re-insert
    disc_uuids = list(disc_map.values())
    if disc_uuids:
        sb.table("discovery_gates").delete().in_("discovery_id", disc_uuids).execute()
    gate_rows = []
    for disc_slug, conditions in case.discovery_gates.items():
        disc_uuid = disc_map.get(disc_slug)
        if not disc_uuid:
            log.warning("  Skipping gate for %s: discovery not found", disc_slug)
            continue
        for i, cond in enumerate(conditions):
            gate_rows.append(
                {
                    "discovery_id": disc_uuid,
                    "gate_index": i,
                    "min_pressure": cond.get("min_pressure"),
                    "min_rapport": cond.get("min_rapport"),
                    "required_evidence_slugs": cond.get("requires_evidence"),
                    "required_discovery_slugs": cond.get("requires_discovery"),
                }
            )
    if gate_rows:
        sb.table("discovery_gates").insert(gate_rows).execute()
    log.info("  %d gate conditions seeded", len(gate_rows))

    # ── Locked secret descriptions ────────────────────────────────────
    log.info("  Seeding locked secret descriptions...")
    # Delete existing, then re-insert
    if disc_uuids:
        sb.table("locked_secret_descriptions").delete().in_(
            "discovery_id", disc_uuids
        ).execute()
    lsd_rows = []
    for disc_slug, desc in case.locked_secret_descriptions.items():
        disc_uuid = disc_map.get(disc_slug)
        if not disc_uuid:
            continue
        lsd_rows.append({"discovery_id": disc_uuid, "description": desc})
    if lsd_rows:
        sb.table("locked_secret_descriptions").insert(lsd_rows).execute()
    log.info("  %d locked secret descriptions seeded", len(lsd_rows))

    # ── NPC evidence relevance ────────────────────────────────────────
    log.info("  Seeding NPC evidence relevance...")
    rel_rows = []
    for npc_slug, ev_slugs in case.npc_relevant_evidence.items():
        npc_uuid = npc_map.get(npc_slug)
        if not npc_uuid:
            continue
        smoking_guns = set(case.smoking_gun_map.get(npc_slug, []))
        for ev_slug in ev_slugs:
            ev_uuid = ev_map.get(ev_slug)
            if not ev_uuid:
                continue
            rel_rows.append(
                {
                    "npc_id": npc_uuid,
                    "evidence_id": ev_uuid,
                    "is_smoking_gun": ev_slug in smoking_guns,
                }
            )
    if rel_rows:
        sb.table("npc_evidence_relevance").upsert(
            rel_rows, on_conflict="npc_id,evidence_id"
        ).execute()
    log.info("  %d relevance entries seeded", len(rel_rows))

    log.info("  Case '%s' seeding complete!", case.case_id)


def seed(case_ids: list[str] | None = None):
    """Seed all (or specified) cases into Supabase."""
    sb = get_supabase()
    if sb is None:
        log.error("Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY.")
        sys.exit(1)

    # Seed shared archetypes first
    arch_map = _seed_archetypes(sb)

    # Determine which cases to seed
    all_ids = _discover_case_ids()
    target_ids = case_ids if case_ids else all_ids
    for cid in target_ids:
        if cid not in all_ids:
            log.error("Unknown case ID: '%s'. Available: %s", cid, all_ids)
            sys.exit(1)

    for case_id in target_ids:
        # Always load from Python modules for seeding (not DB)
        module = importlib.import_module(f"server.cases.{case_id}")
        case = module.case_data
        _seed_case(sb, case, arch_map)

    log.info("All done! Seeded %d case(s).", len(target_ids))


if __name__ == "__main__":
    # Accept optional case ID arguments
    args = sys.argv[1:]
    seed(args if args else None)
