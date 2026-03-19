"""Admin API routes for case content management."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

try:
    from postgrest.exceptions import APIError
except ImportError:
    # Fallback: if postgrest not available, use a base Exception subclass
    # so the except clauses still work (they just won't match anything specific).
    APIError = type("APIError", (Exception,), {})  # type: ignore[misc,assignment]

from .admin_auth import require_admin
from .supabase_helpers import require_supabase

log = logging.getLogger(__name__)


def _handle_supabase_error(exc: APIError, entity: str = "resource") -> HTTPException:
    """Convert Supabase APIError to an appropriate HTTPException."""
    msg = str(exc)
    # .single() with 0 rows → PGRST116
    if "PGRST116" in msg or "0 rows" in msg:
        return HTTPException(status_code=404, detail=f"{entity} not found")
    # Unique constraint violation
    if "duplicate key" in msg or "23505" in msg:
        return HTTPException(
            status_code=409, detail=f"{entity} already exists (duplicate slug or key)"
        )
    # FK constraint violation
    if "violates foreign key" in msg or "23503" in msg:
        return HTTPException(status_code=400, detail=f"Referenced {entity} does not exist")
    log.warning("Supabase error on %s: %s", entity, msg)
    return HTTPException(status_code=500, detail=f"Database error on {entity}")


router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Pydantic models ─────────────────────────────────────────────────────


class CaseUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    world_context_prompt: str | None = None
    intuition_prompt: str | None = None
    partner_npc_slug: str | None = None
    culprit_npc_slug: str | None = None


class CaseCreate(BaseModel):
    title: str
    slug: str
    world_context_prompt: str = ""
    intuition_prompt: str = ""


class NPCUpdate(BaseModel):
    display_name: str | None = None
    system_prompt: str | None = None
    timeline: str | None = None
    archetype_id: str | None = None
    voice: str | None = None
    voice_instruction: str | None = None
    gender: str | None = None
    sort_order: int | None = None


class NPCCreate(BaseModel):
    npc_slug: str
    display_name: str
    system_prompt: str = ""
    timeline: str = ""
    archetype_id: str | None = None
    voice: str = "alloy"
    voice_instruction: str = ""
    gender: str = "male"
    sort_order: int = 0


class EvidenceUpdate(BaseModel):
    label: str | None = None
    description: str | None = None
    evidence_group: str | None = None
    sort_order: int | None = None


class EvidenceCreate(BaseModel):
    evidence_slug: str
    label: str = ""
    description: str = ""
    evidence_group: str = "physical"
    sort_order: int = 0


class DiscoveryUpdate(BaseModel):
    npc_id: str | None = None
    evidence_id: str | None = None
    description: str | None = None


class DiscoveryCreate(BaseModel):
    discovery_slug: str
    npc_id: str
    evidence_id: str
    description: str = ""


class GateCreate(BaseModel):
    gate_index: int = 0
    min_pressure: int | None = None
    min_rapport: int | None = None
    required_evidence_slugs: list[str] | None = None
    required_discovery_slugs: list[str] | None = None


class GateUpdate(BaseModel):
    gate_index: int | None = None
    min_pressure: int | None = None
    min_rapport: int | None = None
    required_evidence_slugs: list[str] | None = None
    required_discovery_slugs: list[str] | None = None


class LockedSecretUpdate(BaseModel):
    description: str


class RelevanceUpdate(BaseModel):
    npc_id: str
    evidence_id: str
    is_smoking_gun: bool = False


# ── Cases ────────────────────────────────────────────────────────────────


@router.get("/cases")
async def list_cases(user_id: str = Depends(require_admin)):
    result = require_supabase().table("cases").select("*").order("created_at").execute()
    return result.data


@router.get("/cases/{case_id}")
async def get_case(case_id: UUID, user_id: str = Depends(require_admin)):
    sb = require_supabase()
    try:
        case = sb.table("cases").select("*").eq("id", str(case_id)).single().execute()
    except APIError as exc:
        raise _handle_supabase_error(exc, "Case") from exc
    cid = str(case_id)
    npcs = (
        sb.table("npcs")
        .select("*, archetypes(name, label)")
        .eq("case_id", cid)
        .order("sort_order")
        .execute()
    )
    evidence = sb.table("evidence").select("*").eq("case_id", cid).order("sort_order").execute()
    discoveries = (
        sb.table("discoveries")
        .select("*, npcs(npc_slug, display_name), evidence(evidence_slug, label)")
        .eq("case_id", cid)
        .execute()
    )

    # Fetch gates and locked secrets for all discoveries in this case
    disc_ids = [d["id"] for d in discoveries.data]
    gates = []
    locked_secrets = []
    if disc_ids:
        gates = (
            sb.table("discovery_gates")
            .select("*")
            .in_("discovery_id", disc_ids)
            .order("gate_index")
            .execute()
            .data
        )
        locked_secrets = (
            sb.table("locked_secret_descriptions")
            .select("*")
            .in_("discovery_id", disc_ids)
            .execute()
            .data
        )

    # NPC evidence relevance
    npc_ids = [n["id"] for n in npcs.data]
    relevance = []
    if npc_ids:
        relevance = (
            sb.table("npc_evidence_relevance")
            .select("*, evidence(evidence_slug, label)")
            .in_("npc_id", npc_ids)
            .execute()
            .data
        )

    return {
        "case": case.data,
        "npcs": npcs.data,
        "evidence": evidence.data,
        "discoveries": discoveries.data,
        "gates": gates,
        "locked_secrets": locked_secrets,
        "relevance": relevance,
    }


@router.post("/cases")
async def create_case(body: CaseCreate, user_id: str = Depends(require_admin)):
    try:
        result = require_supabase().table("cases").insert(body.model_dump()).execute()
    except APIError as exc:
        raise _handle_supabase_error(exc, "Case") from exc
    return result.data[0]


@router.put("/cases/{case_id}")
async def update_case(case_id: UUID, body: CaseUpdate, user_id: str = Depends(require_admin)):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = require_supabase().table("cases").update(data).eq("id", str(case_id)).execute()
    return result.data[0] if result.data else {"ok": True}


@router.delete("/cases/{case_id}")
async def delete_case(case_id: UUID, confirm: bool = False, user_id: str = Depends(require_admin)):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Deleting a case cascades to all NPCs, evidence, discoveries, gates, and locked secrets. "
            "Pass ?confirm=true to proceed.",
        )
    require_supabase().table("cases").delete().eq("id", str(case_id)).execute()
    return {"ok": True}


# ── NPCs ─────────────────────────────────────────────────────────────────


@router.post("/cases/{case_id}/npcs")
async def create_npc(case_id: UUID, body: NPCCreate, user_id: str = Depends(require_admin)):
    data = body.model_dump()
    data["case_id"] = str(case_id)
    try:
        result = require_supabase().table("npcs").insert(data).execute()
    except APIError as exc:
        raise _handle_supabase_error(exc, "NPC") from exc
    return result.data[0]


@router.put("/npcs/{npc_id}")
async def update_npc(npc_id: UUID, body: NPCUpdate, user_id: str = Depends(require_admin)):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = require_supabase().table("npcs").update(data).eq("id", str(npc_id)).execute()
    return result.data[0] if result.data else {"ok": True}


@router.delete("/npcs/{npc_id}")
async def delete_npc(npc_id: UUID, confirm: bool = False, user_id: str = Depends(require_admin)):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Deleting an NPC cascades to its discoveries, gates, and relevance entries. "
            "Pass ?confirm=true to proceed.",
        )
    require_supabase().table("npcs").delete().eq("id", str(npc_id)).execute()
    return {"ok": True}


# ── Evidence ─────────────────────────────────────────────────────────────


@router.post("/cases/{case_id}/evidence")
async def create_evidence(
    case_id: UUID, body: EvidenceCreate, user_id: str = Depends(require_admin)
):
    data = body.model_dump()
    data["case_id"] = str(case_id)
    try:
        result = require_supabase().table("evidence").insert(data).execute()
    except APIError as exc:
        raise _handle_supabase_error(exc, "Evidence") from exc
    return result.data[0]


@router.put("/evidence/{evidence_id}")
async def update_evidence(
    evidence_id: UUID, body: EvidenceUpdate, user_id: str = Depends(require_admin)
):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = require_supabase().table("evidence").update(data).eq("id", str(evidence_id)).execute()
    return result.data[0] if result.data else {"ok": True}


@router.delete("/evidence/{evidence_id}")
async def delete_evidence(
    evidence_id: UUID, confirm: bool = False, user_id: str = Depends(require_admin)
):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Deleting evidence cascades to discoveries and relevance entries that reference it. "
            "Pass ?confirm=true to proceed.",
        )
    require_supabase().table("evidence").delete().eq("id", str(evidence_id)).execute()
    return {"ok": True}


# ── Discoveries ──────────────────────────────────────────────────────────


@router.post("/cases/{case_id}/discoveries")
async def create_discovery(
    case_id: UUID, body: DiscoveryCreate, user_id: str = Depends(require_admin)
):
    data = body.model_dump()
    data["case_id"] = str(case_id)
    try:
        result = require_supabase().table("discoveries").insert(data).execute()
    except APIError as exc:
        raise _handle_supabase_error(exc, "Discovery") from exc
    return result.data[0]


@router.put("/discoveries/{discovery_id}")
async def update_discovery(
    discovery_id: UUID, body: DiscoveryUpdate, user_id: str = Depends(require_admin)
):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = (
        require_supabase().table("discoveries").update(data).eq("id", str(discovery_id)).execute()
    )
    return result.data[0] if result.data else {"ok": True}


@router.delete("/discoveries/{discovery_id}")
async def delete_discovery(
    discovery_id: UUID, confirm: bool = False, user_id: str = Depends(require_admin)
):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Deleting a discovery cascades to its gates and locked secret. "
            "Pass ?confirm=true to proceed.",
        )
    require_supabase().table("discoveries").delete().eq("id", str(discovery_id)).execute()
    return {"ok": True}


# ── Discovery Gates ──────────────────────────────────────────────────────


@router.post("/discoveries/{discovery_id}/gates")
async def create_gate(discovery_id: UUID, body: GateCreate, user_id: str = Depends(require_admin)):
    data = body.model_dump()
    data["discovery_id"] = str(discovery_id)
    try:
        result = require_supabase().table("discovery_gates").insert(data).execute()
    except APIError as exc:
        raise _handle_supabase_error(exc, "Gate") from exc
    return result.data[0]


@router.put("/gates/{gate_id}")
async def update_gate(gate_id: UUID, body: GateUpdate, user_id: str = Depends(require_admin)):
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = (
        require_supabase().table("discovery_gates").update(data).eq("id", str(gate_id)).execute()
    )
    return result.data[0] if result.data else {"ok": True}


@router.delete("/gates/{gate_id}")
async def delete_gate(gate_id: UUID, user_id: str = Depends(require_admin)):
    require_supabase().table("discovery_gates").delete().eq("id", str(gate_id)).execute()
    return {"ok": True}


# ── Locked Secret Descriptions ──────────────────────────────────────────


@router.put("/discoveries/{discovery_id}/locked-secret")
async def upsert_locked_secret(
    discovery_id: UUID, body: LockedSecretUpdate, user_id: str = Depends(require_admin)
):
    sb = require_supabase()
    data = {"discovery_id": str(discovery_id), "description": body.description}
    try:
        result = (
            sb.table("locked_secret_descriptions")
            .upsert(data, on_conflict="discovery_id")
            .execute()
        )
    except APIError as exc:
        raise _handle_supabase_error(exc, "Locked secret") from exc
    return result.data[0] if result.data else {"ok": True}


@router.delete("/discoveries/{discovery_id}/locked-secret")
async def delete_locked_secret(discovery_id: UUID, user_id: str = Depends(require_admin)):
    require_supabase().table("locked_secret_descriptions").delete().eq(
        "discovery_id", str(discovery_id)
    ).execute()
    return {"ok": True}


# ── NPC Evidence Relevance ───────────────────────────────────────────────


@router.post("/relevance")
async def create_relevance(body: RelevanceUpdate, user_id: str = Depends(require_admin)):
    try:
        result = (
            require_supabase()
            .table("npc_evidence_relevance")
            .upsert(body.model_dump(), on_conflict="npc_id,evidence_id")
            .execute()
        )
    except APIError as exc:
        raise _handle_supabase_error(exc, "Relevance") from exc
    return result.data[0] if result.data else {"ok": True}


@router.delete("/relevance/{relevance_id}")
async def delete_relevance(relevance_id: UUID, user_id: str = Depends(require_admin)):
    require_supabase().table("npc_evidence_relevance").delete().eq(
        "id", str(relevance_id)
    ).execute()
    return {"ok": True}


# ── Archetypes ───────────────────────────────────────────────────────────


@router.get("/archetypes")
async def list_archetypes(user_id: str = Depends(require_admin)):
    result = require_supabase().table("archetypes").select("*").order("name").execute()
    return result.data


# ── Dependency Graph ─────────────────────────────────────────────────────


@router.get("/cases/{case_id}/dependency-graph")
async def dependency_graph(case_id: UUID, user_id: str = Depends(require_admin)):
    """Return discovery dependency graph as nodes and edges for visualization."""
    sb = require_supabase()

    discoveries = (
        sb.table("discoveries")
        .select(
            "id, discovery_slug, description, npc_id, evidence_id, npcs(npc_slug, display_name)"
        )
        .eq("case_id", str(case_id))
        .execute()
    )

    disc_ids = [d["id"] for d in discoveries.data]
    gates = []
    if disc_ids:
        gates = sb.table("discovery_gates").select("*").in_("discovery_id", disc_ids).execute().data

    # Build slug→id lookup
    slug_to_id = {d["discovery_slug"]: d["id"] for d in discoveries.data}

    nodes = []
    for d in discoveries.data:
        npc_info = d.get("npcs") or {}
        nodes.append(
            {
                "id": d["id"],
                "slug": d["discovery_slug"],
                "label": d["discovery_slug"],
                "npc": npc_info.get("display_name", ""),
                "npc_slug": npc_info.get("npc_slug", ""),
                "description": d["description"],
            }
        )

    edges = []
    for gate in gates:
        target_id = gate["discovery_id"]
        req_discs = gate.get("required_discovery_slugs") or []
        for req_slug in req_discs:
            source_id = slug_to_id.get(req_slug)
            if source_id:
                edges.append(
                    {
                        "source": source_id,
                        "target": target_id,
                        "gate_index": gate["gate_index"],
                        "min_pressure": gate.get("min_pressure"),
                        "min_rapport": gate.get("min_rapport"),
                    }
                )

    return {"nodes": nodes, "edges": edges}


__all__ = ["router"]
