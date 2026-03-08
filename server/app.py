"""FastAPI application exposing the detective game's dialogue endpoints."""

from __future__ import annotations

import io
import logging
import pathlib
import re
from contextlib import asynccontextmanager
from typing import Any, Dict, List

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from openai import AsyncOpenAI

from .cases import get_active_case, load_case
from .config import settings
from .interrogation import (
    build_interrogation_context,
    pressure_band as _pressure_band,
    rapport_band as _rapport_band,
    process_turn,
    should_show_intuition,
)
from .llm.classifier import classify_player_turn, detect_evidence
from .llm.factory import get_llm_client
from .llm.base import ChatMessage, LLMClient
from .npc_registry import get_npc_profile, list_npcs
from .schemas import ChatRequest, ChatResponse, ChatTurn, SpeakRequest
from .auth_routes import router as auth_router, state_router
from .tracking_routes import router as tracking_router, log_chat_event
from .feedback_routes import router as feedback_router
from .admin_routes import router as admin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

_WEB_DIR = pathlib.Path(__file__).resolve().parent.parent / "web"


# ── Lifespan: replaces deprecated @app.on_event("startup") ──────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load case data at startup; cleanup (if any) on shutdown."""
    case = load_case(settings.case_id)
    log.info("Loaded case '%s' (%s)", case.case_id, case.title)
    yield


app = FastAPI(title="Detective Game Backend", version="0.1.0", lifespan=lifespan)


@app.exception_handler(Exception)
async def _global_exception_handler(request: Request, exc: Exception):
    """Catch-all: ensure every error returns JSON so the client can parse it.

    Internal details are logged server-side but NOT sent to the client.
    """
    log.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ── CORS ─────────────────────────────────────────────────────────────────
# Configurable via ECHO_CORS_ORIGINS env var (comma-separated).
# Defaults to permissive "*" for development; set to specific origins
# in production (e.g. "https://yourdomain.com").

_cors_env = getattr(settings, "cors_origins", None)
if _cors_env:
    allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
else:
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Supabase auth & state routers ─────────────────────────────────────────
app.include_router(auth_router)
app.include_router(state_router)
app.include_router(tracking_router)
app.include_router(feedback_router)
app.include_router(admin_router)


async def _get_llm_client() -> LLMClient:
    """FastAPI dependency that returns the cached LLM client singleton."""
    try:
        return get_llm_client()
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Shared OpenAI client for audio operations ────────────────────────────

from functools import lru_cache as _lru_cache


@_lru_cache(maxsize=1)
def _get_openai_client() -> AsyncOpenAI:
    """Return a cached AsyncOpenAI client for TTS/STT operations."""
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    return AsyncOpenAI(api_key=settings.openai_api_key)


# ── Stray tag stripping (safety fallback) ────────────────────────────────
# The main LLM no longer receives evidence-tagging instructions, but may still
# occasionally produce stray tags.  Strip them from the displayed response.

_STRAY_TAG_RE = re.compile(
    r'\[(?:EVIDENCE|EVIDENCIJA|DOKAZ|EXPRESSION|IZRAŽAJ|IZRAZAJ|IZRAZ):\s*[^\]]*\]',
    re.IGNORECASE,
)


def _strip_stray_tags(text: str) -> str:
    """Remove any leftover [EVIDENCE: ...] or [EXPRESSION: ...] tags."""
    return _STRAY_TAG_RE.sub("", text).strip()


# ── Intuition tag parsing ─────────────────────────────────────────────────
_INTUITION_RE = re.compile(r'\n?\[INTUITION\]\s*(.+)', re.IGNORECASE)


def _extract_intuition(text: str) -> tuple[str, str | None]:
    """Strip the [INTUITION] line from the NPC response.

    Returns ``(clean_text, intuition_line_or_None)``.
    """
    m = _INTUITION_RE.search(text)
    if not m:
        return text, None
    intuition = m.group(1).strip()
    clean = text[:m.start()] + text[m.end():]
    return clean.strip(), intuition


def _check_gate(
    conditions: List[Dict[str, Any]],
    pressure: int,
    rapport: int,
    player_evidence: List[str],
    player_discoveries: List[str],
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
        if "requires_evidence" in condition:
            if not all(e in player_evidence for e in condition["requires_evidence"]):
                satisfied = False
        if "requires_discovery" in condition:
            if not all(d in player_discoveries for d in condition["requires_discovery"]):
                satisfied = False
        if satisfied:
            return True
    return False


# ── Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/npcs")
async def list_available_npcs():
    """Return the NPCs available for conversation."""

    registry = list_npcs()
    return {
        "npcs": [
            {
                "npc_id": profile.npc_id,
                "display_name": profile.display_name,
                "voice": profile.voice,
                "voice_instruction": profile.voice_instruction,
            }
            for profile in registry.values()
        ]
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, llm: LLMClient = Depends(_get_llm_client)) -> ChatResponse:
    """Send the player's message to the LLM and return the NPC's reply.

    Pipeline per turn:
    1. Classify the player's tactic & evidence strength  (secondary LLM)
    2. Compute pressure/rapport deltas                   (deterministic)
    3. Build interrogation context prompt                 (deterministic)
    4. Generate NPC response                              (main LLM)
    5. Detect evidence & expression from response         (secondary LLM)
    6. Return everything to the client
    """

    try:
        npc_profile = get_npc_profile(request.npc_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    case = get_active_case()
    archetype_id = case.npc_archetype_map.get(request.npc_id, "professional_fixer")

    history: List[ChatTurn] = list(request.history)
    history.append(ChatTurn(role="user", content=request.message))

    # ── Step 1: Classify the player's turn (secondary LLM) ──────────────
    log.info("[chat] Step 1: classifying turn for npc=%s", request.npc_id)
    try:
        classification = await classify_player_turn(
            message=request.message,
            npc_id=request.npc_id,
            player_evidence_ids=list(request.player_evidence_ids),
            conversation_history=[t.model_dump() for t in request.history],
        )
    except Exception as exc:
        log.exception("[chat] Step 1 FAILED: classify_player_turn")
        raise HTTPException(status_code=502, detail="Classifier unavailable") from exc
    tactic_type = classification["tactic_type"]
    evidence_strength = classification["evidence_strength"]
    classifier_degraded = classification.get("degraded", False)
    if classifier_degraded:
        log.warning("[chat] Step 1: classifier degraded — using defaults")
    log.info("[chat] Step 1 result: tactic=%s evidence=%s degraded=%s", tactic_type, evidence_strength, classifier_degraded)

    # ── Pre-Step 2: Capture old bands for intuition trigger detection ───
    old_p_band = _pressure_band(request.pressure).value
    old_r_band = _rapport_band(request.rapport).value

    # ── Step 2: Compute pressure/rapport deltas ─────────────────────────
    log.info("[chat] Step 2: computing deltas (pressure=%d, rapport=%d)", request.pressure, request.rapport)
    try:
        interrogation_result = process_turn(
            tactic_type=tactic_type,
            evidence_strength=evidence_strength,
            npc_id=request.npc_id,
            current_pressure=request.pressure,
            current_rapport=request.rapport,
            peak_pressure=request.peak_pressure,
            archetype_id=archetype_id,
        )
    except Exception as exc:
        log.exception("[chat] Step 2 FAILED: process_turn")
        raise HTTPException(status_code=500, detail="Interrogation engine error") from exc
    log.info("[chat] Step 2 result: pressure=%d->%s, rapport=%d->%s",
             interrogation_result["pressure"], interrogation_result["pressure_band"],
             interrogation_result["rapport"], interrogation_result["rapport_band"])

    # ── Step 3: Build interrogation context prompt ──────────────────────
    try:
        interrogation_prompt = build_interrogation_context(
            npc_id=request.npc_id,
            pressure_val=interrogation_result["pressure"],
            rapport_val=interrogation_result["rapport"],
            tactic_type=tactic_type,
            evidence_strength=evidence_strength,
            archetype_id=archetype_id,
            player_evidence=list(request.player_evidence_ids),
            player_discoveries=list(request.player_discovery_ids),
        )
    except Exception as exc:
        log.exception("[chat] Step 3 FAILED: build_interrogation_context")
        raise HTTPException(status_code=500, detail="Context builder error") from exc

    # ── Step 4: Generate NPC response (main LLM) ───────────────────────
    log.info("[chat] Step 4: generating NPC response via %s", settings.llm_provider)
    system_messages: List[ChatMessage] = [
        {"role": "system", "content": case.world_context_prompt},
    ]
    if npc_profile.timeline:
        system_messages.append({"role": "system", "content": npc_profile.timeline})
    system_messages += [
        {"role": "system", "content": npc_profile.system_prompt},
        {"role": "system", "content": interrogation_prompt},
    ]

    if request.language == "sr":
        gender_sr = "ženskog" if npc_profile.gender == "female" else "muškog"
        system_messages.append({
            "role": "system",
            "content": (
                f"IMPORTANT: The player has chosen Serbian as their language. "
                f"You MUST respond entirely in Serbian (Latin script). "
                f"Your character is {npc_profile.gender} — use correct {gender_sr} roda "
                f"grammatical forms (verb conjugations, adjective agreements, past tense). "
                f"For example, a female character says 'bila sam' not 'bio sam'. "
                f"Stay in character and maintain the same personality, secrets, "
                f"and conversational rules, but speak Serbian with proper gender grammar."
            ),
        })

    llm_messages: List[ChatMessage] = [
        *system_messages,
        *(_turn.model_dump() for _turn in history),
    ]

    try:
        raw_reply = await llm.generate(npc_id=request.npc_id, messages=llm_messages)
    except Exception as exc:
        detail = str(exc)
        log.error("[chat] Step 4 FAILED: LLM generate — %s", detail)
        # Surface only well-known, actionable errors to the client
        if "insufficient_quota" in detail or "exceeded" in detail.lower():
            client_detail = "OpenAI quota exceeded. Add credits at platform.openai.com/settings/organization/billing"
        elif "invalid_api_key" in detail or "Incorrect API key" in detail:
            client_detail = "Invalid API key. Check the key in your .env file."
        elif "authentication" in detail.lower():
            client_detail = "LLM authentication failed. Check your API key configuration."
        else:
            client_detail = "LLM service unavailable. Please try again."
        raise HTTPException(status_code=502, detail=client_detail) from exc
    log.info("[chat] Step 4 done: reply length=%d chars", len(raw_reply))

    # Strip any stray tags the LLM may have produced out of habit
    clean_reply = _strip_stray_tags(raw_reply)

    # Strip any stray [INTUITION] tag the LLM may produce out of habit
    clean_reply, _ = _extract_intuition(clean_reply)

    # ── Step 5: Detect discoveries & expression (secondary LLM) ────────
    log.info("[chat] Step 5: detecting discoveries & expression")
    try:
        detection = await detect_evidence(
            npc_response=clean_reply,
            npc_id=request.npc_id,
            already_collected=list(request.player_discovery_ids),
            player_message=request.message,
            language=request.language,
        )
    except Exception as exc:
        log.exception("[chat] Step 5 FAILED: detect_evidence")
        raise HTTPException(status_code=502, detail="Evidence detector unavailable") from exc
    evidence_ids: List[str] = detection["evidence_ids"]
    discovery_ids: List[str] = detection["discovery_ids"]
    discovery_summaries: dict = detection.get("discovery_summaries", {})
    expression: str = detection["expression"]
    detection_degraded = detection.get("degraded", False)
    if detection_degraded:
        log.warning("[chat] Step 5: evidence detection degraded — using defaults")
    log.info("[chat] Step 5 result: discoveries=%s evidence=%s expression=%s degraded=%s",
             discovery_ids, evidence_ids, expression, detection_degraded)

    # ── Step 5b: Apply mechanical gates to detected discoveries ────────
    gated_discovery_ids: List[str] = []
    blocked_discovery_ids: List[str] = []
    for did in discovery_ids:
        gates = case.discovery_gates.get(did)
        if gates is None:
            # No gate defined — discovery passes through unconditionally
            gated_discovery_ids.append(did)
            continue
        if _check_gate(gates,
                       pressure=interrogation_result["pressure"],
                       rapport=interrogation_result["rapport"],
                       player_evidence=request.player_evidence_ids,
                       player_discoveries=request.player_discovery_ids):
            gated_discovery_ids.append(did)
        else:
            blocked_discovery_ids.append(did)
            log.info("[chat] Gate blocked discovery %s (pressure=%d, rapport=%d)",
                     did, interrogation_result["pressure"], interrogation_result["rapport"])

    discovery_ids = gated_discovery_ids
    # Recompute evidence_ids from the surviving discoveries only
    evidence_ids = list({case.discovery_catalog[d]["evidence_id"] for d in discovery_ids})

    # ── Step 5c: Generate intuition line if triggers are met ─────────────
    _should_intuit, moment_type = should_show_intuition(
        npc_id=request.npc_id,
        evidence_strength=evidence_strength,
        discovery_ids=discovery_ids,
        player_discovery_ids=request.player_discovery_ids,
        discovery_catalog=case.discovery_catalog,
    )
    intuition_line = None
    if _should_intuit and case.intuition_prompt:
        try:
            npc_name = npc_profile.display_name.split(" — ")[0] if npc_profile.display_name else request.npc_id

            # Build a short conversation recap (fewer lines for atmospheric)
            convo_lines = []
            for turn in history:
                speaker = "Detective" if turn.role == "user" else npc_name
                convo_lines.append(f"{speaker}: {turn.content}")
            convo_lines.append(f"{npc_name}: {clean_reply}")

            if moment_type:
                # Major moment: NPC name + moment type + last 4 lines
                convo_recap = "\n".join(convo_lines[-4:])
                user_content = (
                    f"Interrogating: {npc_name}\n"
                    f"moment_type: {moment_type}\n\n"
                    f"Recent conversation:\n{convo_recap}"
                )
            else:
                # Atmospheric: NPC name + last 2 lines only, no gameplay state
                convo_recap = "\n".join(convo_lines[-2:])
                user_content = (
                    f"Interrogating: {npc_name}\n\n"
                    f"Recent conversation:\n{convo_recap}"
                )

            intuition_line = await llm.generate(
                npc_id="intuition",
                messages=[
                    {"role": "system", "content": case.intuition_prompt},
                    {"role": "user", "content": user_content},
                ],
            )
            intuition_line = intuition_line.strip().strip('"')
        except Exception:
            log.warning("[chat] Intuition generation failed, skipping")
            intuition_line = None

    history.append(ChatTurn(role="assistant", content=clean_reply))

    # ── Step 6: Track & return combined response ────────────────────────
    if request.session_id:
        log_chat_event(
            session_id=request.session_id,
            npc_id=request.npc_id,
            player_message=request.message,
            npc_reply=clean_reply,
            tactic_type=tactic_type,
            evidence_strength=evidence_strength,
            pressure=interrogation_result["pressure"],
            rapport=interrogation_result["rapport"],
            pressure_band=interrogation_result["pressure_band"],
            rapport_band=interrogation_result["rapport_band"],
            expression=expression,
            evidence_ids=evidence_ids,
        )

    log.info("[chat] Step 6: returning response for npc=%s", request.npc_id)
    return ChatResponse(
        reply=clean_reply,
        npc_id=request.npc_id,
        history=history,
        evidence_ids=evidence_ids,
        discovery_ids=discovery_ids,
        discovery_summaries=discovery_summaries,
        expression=expression,
        pressure=interrogation_result["pressure"],
        rapport=interrogation_result["rapport"],
        pressure_band=interrogation_result["pressure_band"],
        rapport_band=interrogation_result["rapport_band"],
        tactic_type=tactic_type,
        evidence_strength=evidence_strength,
        peak_pressure=interrogation_result["peak_pressure"],
        degraded=classifier_degraded or detection_degraded,
        intuition_line=intuition_line,
        blocked_discovery_ids=blocked_discovery_ids,
    )


@app.post("/api/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form(default="en"),
):
    """Transcribe an audio file to text using OpenAI Whisper."""

    client = _get_openai_client()
    lang_map = {"en": "en", "sr": "sr"}
    whisper_lang = lang_map.get(language, "en")

    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file too large (max 25 MB).")

    try:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = file.filename or "recording.webm"

        transcript = await client.audio.transcriptions.create(
            model=settings.openai_stt_model,
            file=audio_file,
            language=whisper_lang,
        )
        return {"text": transcript.text}
    except Exception as exc:
        detail = str(exc)
        if "invalid_api_key" in detail or "Incorrect API key" in detail:
            client_detail = "Invalid API key for audio transcription."
        elif "insufficient_quota" in detail or "exceeded" in detail.lower():
            client_detail = "OpenAI quota exceeded. Add credits at platform.openai.com"
        else:
            client_detail = "Transcription service unavailable."
        raise HTTPException(status_code=502, detail=client_detail) from exc


@app.post("/api/speak")
async def speak(request: SpeakRequest):
    """Convert text to speech using OpenAI TTS and return audio/mpeg."""

    client = _get_openai_client()

    allowed_voices = {
        "alloy", "ash", "ballad", "coral", "echo", "fable",
        "onyx", "nova", "sage", "shimmer", "verse",
    }
    voice = request.voice if request.voice in allowed_voices else "alloy"
    text = request.text[:4096]

    tts_kwargs: dict = {
        "model": settings.openai_tts_model,
        "voice": voice,
        "input": text,
        "response_format": "mp3",
    }
    if request.instructions:
        tts_kwargs["instructions"] = request.instructions

    try:
        response = await client.audio.speech.create(**tts_kwargs)
        return StreamingResponse(
            response.iter_bytes(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline"},
        )
    except Exception as exc:
        detail = str(exc)
        if "invalid_api_key" in detail or "Incorrect API key" in detail:
            client_detail = "Invalid API key for text-to-speech."
        elif "insufficient_quota" in detail or "exceeded" in detail.lower():
            client_detail = "OpenAI quota exceeded. Add credits at platform.openai.com"
        else:
            client_detail = "Text-to-speech service unavailable."
        raise HTTPException(status_code=502, detail=client_detail) from exc


## ── String Board state endpoints ──────────────────────────────────────────
# In-memory store keyed by a simple session concept.  For authenticated users
# the string board is also persisted inside the main cloud save blob; these
# endpoints provide a lightweight local-only fallback for unauthenticated play.

_stringboard_store: Dict[str, Any] = {}


@app.post("/api/state/stringboard")
async def save_stringboard(request: Request):
    """Save the string board state (card positions + links)."""
    body = await request.json()
    _stringboard_store["default"] = body
    return {"ok": True}


@app.get("/api/state/stringboard")
async def load_stringboard():
    """Load the string board state."""
    state = _stringboard_store.get("default")
    if state is None:
        return {"cardPositions": {}, "links": []}
    return state


@app.get("/health")
async def healthcheck():
    """Simple health endpoint for monitoring."""

    return {"status": "ok", "llm_provider": settings.llm_provider}


# ── Admin page ───────────────────────────────────────────────────────────
_ADMIN_DIR = pathlib.Path(__file__).resolve().parent.parent / "web" / "admin"

from fastapi.responses import FileResponse

@app.get("/admin")
@app.get("/admin/")
async def admin_page():
    """Serve the admin SPA."""
    admin_html = _ADMIN_DIR / "index.html"
    if not admin_html.is_file():
        raise HTTPException(status_code=404, detail="Admin page not found")
    return FileResponse(str(admin_html))


# Serve the web frontend as static files (must be mounted last so API routes
# take priority over the catch-all static handler).
if _WEB_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(_WEB_DIR), html=True), name="static")
