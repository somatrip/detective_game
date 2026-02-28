"""FastAPI application exposing the detective game's dialogue endpoints."""

from __future__ import annotations

import io
import logging
import pathlib
import re
from typing import List

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from openai import AsyncOpenAI

from .config import settings
from .interrogation import build_interrogation_context, process_turn
from .llm.classifier import classify_player_turn, detect_evidence
from .llm.factory import create_llm_client
from .llm.base import ChatMessage, LLMClient
from .npc_registry import WORLD_CONTEXT_PROMPT, get_npc_profile, list_npcs
from .schemas import ChatRequest, ChatResponse, ChatTurn, SpeakRequest
from .auth_routes import router as auth_router, state_router
from .tracking_routes import router as tracking_router, log_chat_event

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

_WEB_DIR = pathlib.Path(__file__).resolve().parent.parent / "web"

app = FastAPI(title="Echoes in the Atrium Backend", version="0.1.0")


@app.exception_handler(Exception)
async def _global_exception_handler(request: Request, exc: Exception):
    """Catch-all: ensure every error returns JSON so the client can parse it."""
    log.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}: {exc}"},
    )


if settings.llm_provider.lower() != "openai":  # allow running UI from file:// or another port
    allow_origins = ["*"]
else:
    allow_origins = ["http://localhost", "http://127.0.0.1", "http://localhost:5500", "http://127.0.0.1:5500"]

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


async def get_llm_client() -> LLMClient:
    """FastAPI dependency that returns the configured LLM client."""

    try:
        return create_llm_client()
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Shared OpenAI client for audio operations ────────────────────────────────

_openai_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    """Return a cached AsyncOpenAI client for TTS/STT operations."""
    global _openai_client
    if _openai_client is None:
        if not settings.openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


# ── Stray tag stripping (safety fallback) ────────────────────────────────────
# The main LLM no longer receives evidence-tagging instructions, but may still
# occasionally produce stray tags.  Strip them from the displayed response.

_STRAY_TAG_RE = re.compile(
    r'\[(?:EVIDENCE|EVIDENCIJA|DOKAZ|EXPRESSION|IZRAŽAJ|IZRAZAJ|IZRAZ):\s*[^\]]*\]',
    re.IGNORECASE,
)


def _strip_stray_tags(text: str) -> str:
    """Remove any leftover [EVIDENCE: ...] or [EXPRESSION: ...] tags."""
    return _STRAY_TAG_RE.sub("", text).strip()


# ── Endpoints ────────────────────────────────────────────────────────────────

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
            }
            for profile in registry.values()
        ]
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, llm: LLMClient = Depends(get_llm_client)) -> ChatResponse:
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
        raise HTTPException(status_code=502, detail=f"Classifier error: {exc}") from exc
    tactic_type = classification["tactic_type"]
    evidence_strength = classification["evidence_strength"]
    log.info("[chat] Step 1 result: tactic=%s evidence=%s", tactic_type, evidence_strength)

    # ── Step 2: Compute pressure/rapport deltas ─────────────────────────
    log.info("[chat] Step 2: computing deltas (pressure=%d, rapport=%d)", request.pressure, request.rapport)
    try:
        interrogation_result = process_turn(
            tactic_type=tactic_type,
            evidence_strength=evidence_strength,
            npc_id=request.npc_id,
            current_pressure=request.pressure,
            current_rapport=request.rapport,
        )
    except Exception as exc:
        log.exception("[chat] Step 2 FAILED: process_turn")
        raise HTTPException(status_code=500, detail=f"Interrogation engine error: {exc}") from exc
    log.info("[chat] Step 2 result: pressure=%d→%s, rapport=%d→%s",
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
        )
    except Exception as exc:
        log.exception("[chat] Step 3 FAILED: build_interrogation_context")
        raise HTTPException(status_code=500, detail=f"Context builder error: {exc}") from exc

    # ── Step 4: Generate NPC response (main LLM) ───────────────────────
    log.info("[chat] Step 4: generating NPC response via %s", settings.llm_provider)
    system_messages: List[ChatMessage] = [
        {"role": "system", "content": WORLD_CONTEXT_PROMPT},
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
        if "insufficient_quota" in detail or "exceeded" in detail.lower():
            detail = "OpenAI quota exceeded. Add credits at platform.openai.com/settings/organization/billing"
        elif "invalid_api_key" in detail or "Incorrect API key" in detail:
            detail = "Invalid API key. Check the key in your .env file."
        elif "authentication" in detail.lower():
            detail = f"Authentication failed: {detail}"
        raise HTTPException(status_code=502, detail=detail) from exc
    log.info("[chat] Step 4 done: reply length=%d chars", len(raw_reply))

    # Strip any stray tags the LLM may have produced out of habit
    clean_reply = _strip_stray_tags(raw_reply)

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
        raise HTTPException(status_code=502, detail=f"Evidence detector error: {exc}") from exc
    evidence_ids: List[str] = detection["evidence_ids"]
    discovery_ids: List[str] = detection["discovery_ids"]
    discovery_summaries: dict = detection.get("discovery_summaries", {})
    expression: str = detection["expression"]
    log.info("[chat] Step 5 result: discoveries=%s evidence=%s expression=%s",
             discovery_ids, evidence_ids, expression)

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
            detail = "Invalid API key for audio transcription."
        elif "insufficient_quota" in detail or "exceeded" in detail.lower():
            detail = "OpenAI quota exceeded. Add credits at platform.openai.com"
        raise HTTPException(status_code=502, detail=detail) from exc


@app.post("/api/speak")
async def speak(request: SpeakRequest):
    """Convert text to speech using OpenAI TTS and return audio/mpeg."""

    client = _get_openai_client()

    allowed_voices = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}
    voice = request.voice if request.voice in allowed_voices else "alloy"
    text = request.text[:4096]

    try:
        response = await client.audio.speech.create(
            model=settings.openai_tts_model,
            voice=voice,
            input=text,
            response_format="mp3",
        )
        return StreamingResponse(
            response.iter_bytes(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline"},
        )
    except Exception as exc:
        detail = str(exc)
        if "invalid_api_key" in detail or "Incorrect API key" in detail:
            detail = "Invalid API key for text-to-speech."
        elif "insufficient_quota" in detail or "exceeded" in detail.lower():
            detail = "OpenAI quota exceeded. Add credits at platform.openai.com"
        raise HTTPException(status_code=502, detail=detail) from exc


@app.get("/health")
async def healthcheck():
    """Simple health endpoint for monitoring."""

    return {"status": "ok", "llm_provider": settings.llm_provider}


# Serve the web frontend as static files (must be mounted last so API routes
# take priority over the catch-all static handler).
if _WEB_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(_WEB_DIR), html=True), name="static")
