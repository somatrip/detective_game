"""Core gameplay routes: chat, transcribe, speak, and stringboard state."""

from __future__ import annotations

import io
import logging
import re
from functools import lru_cache
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from slowapi import Limiter
from slowapi.util import get_remote_address

from .cases import get_active_case, get_case
from .config import settings
from .errors import ClassifierError, LLMServiceError
from .interrogation import (
    build_interrogation_context,
    filter_gated_discoveries,
    process_turn,
    should_show_intuition,
)
from .llm.base import ChatMessage, LLMClient
from .llm.classifier import classify_player_turn, detect_evidence
from .llm.factory import get_llm_client
from .schemas import ChatRequest, ChatResponse, ChatTurn, SpeakRequest, StringboardState
from .tracking_routes import ChatEventData, log_chat_event

log = logging.getLogger(__name__)

router = APIRouter(tags=["gameplay"])

limiter = Limiter(key_func=get_remote_address)

# ── Stray tag stripping (safety fallback) ────────────────────────────────
# The main LLM no longer receives evidence-tagging instructions, but may still
# occasionally produce stray tags.  Strip them from the displayed response.

_STRAY_TAG_RE = re.compile(
    r"\[(?:EVIDENCE|EVIDENCIJA|DOKAZ|EXPRESSION|IZRAŽAJ|IZRAZAJ|IZRAZ):\s*[^\]]*\]",
    re.IGNORECASE,
)

# ── Intuition tag parsing ─────────────────────────────────────────────────
_INTUITION_RE = re.compile(r"\n?\[INTUITION\]\s*(.+)", re.IGNORECASE)


def _strip_stray_tags(text: str) -> str:
    """Remove any leftover [EVIDENCE: ...] or [EXPRESSION: ...] tags."""
    return _STRAY_TAG_RE.sub("", text).strip()


def _extract_intuition(text: str) -> tuple[str, str | None]:
    """Strip the [INTUITION] line from the NPC response.

    Returns ``(clean_text, intuition_line_or_None)``.
    """
    m = _INTUITION_RE.search(text)
    if not m:
        return text, None
    intuition = m.group(1).strip()
    clean = text[: m.start()] + text[m.end() :]
    return clean.strip(), intuition


def _classify_openai_error(
    exc: Exception,
    fallback_message: str = "LLM service unavailable. Please try again.",
) -> HTTPException:
    """Classify an OpenAI / LLM exception and return an appropriate HTTPException.

    Sniffs the error message for well-known, actionable problems (quota,
    invalid key, auth) and returns a 502 with a user-friendly detail string.
    """
    detail = str(exc)
    if "insufficient_quota" in detail or "exceeded" in detail.lower():
        client_detail = "OpenAI quota exceeded. Add credits at platform.openai.com/settings/organization/billing"
    elif "invalid_api_key" in detail or "Incorrect API key" in detail:
        client_detail = "Invalid API key. Check the key in your .env file."
    elif "authentication" in detail.lower():
        client_detail = "LLM authentication failed. Check your API key configuration."
    else:
        client_detail = fallback_message
    return HTTPException(status_code=502, detail=client_detail)


async def _get_llm_client() -> LLMClient:
    """FastAPI dependency that returns the cached LLM client singleton."""
    try:
        return get_llm_client()
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@lru_cache(maxsize=1)
def _get_openai_client() -> AsyncOpenAI:
    """Return a cached AsyncOpenAI client for TTS/STT operations."""
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")
    return AsyncOpenAI(api_key=settings.openai_api_key)


# ── Chat pipeline helpers ─────────────────────────────────────────────────


async def _generate_intuition_line(
    llm: LLMClient,
    npc_profile: object,
    npc_id: str,
    history: list[ChatTurn],
    clean_reply: str,
    moment_type: str | None,
    intuition_prompt: str,
) -> str | None:
    """Generate a detective's intuition line, or None on failure."""
    try:
        npc_name = (
            npc_profile.display_name.split(" — ")[0]
            if npc_profile.display_name
            else npc_id
        )

        convo_lines = []
        for turn in history:
            speaker = "Detective" if turn.role == "user" else npc_name
            convo_lines.append(f"{speaker}: {turn.content}")
        convo_lines.append(f"{npc_name}: {clean_reply}")

        if moment_type:
            convo_recap = "\n".join(convo_lines[-4:])
            user_content = (
                f"Interrogating: {npc_name}\n"
                f"moment_type: {moment_type}\n\n"
                f"Recent conversation:\n{convo_recap}"
            )
        else:
            convo_recap = "\n".join(convo_lines[-2:])
            user_content = f"Interrogating: {npc_name}\n\nRecent conversation:\n{convo_recap}"

        result = await llm.generate(
            npc_id="intuition",
            messages=[
                {"role": "system", "content": intuition_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        return result.strip().strip('"')
    except Exception:
        log.warning("[chat] Intuition generation failed, skipping", exc_info=True)
        return None


# ── Chat endpoint ────────────────────────────────────────────────────────


@router.post("/api/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(
    request: Request, body: ChatRequest, llm: LLMClient = Depends(_get_llm_client)  # noqa: B008
) -> ChatResponse:
    """Send the player's message to the LLM and return the NPC's reply.

    Pipeline per turn:
    1. Classify the player's tactic & evidence strength  (secondary LLM)
    2. Compute pressure/rapport deltas                   (deterministic)
    3. Build interrogation context prompt                 (deterministic)
    4. Generate NPC response                              (main LLM)
    5. Detect evidence & expression from response         (secondary LLM)
    6. Return everything to the client
    """

    # Normalize case_id: frontend uses kebab-case, server stores underscore-format
    case_id_normalized = body.case_id.replace("-", "_") if body.case_id else None
    case = get_case(case_id_normalized) if case_id_normalized else get_active_case()
    npc_profile = case.npc_profiles.get(body.npc_id)
    if npc_profile is None:
        raise HTTPException(status_code=404, detail=f"Unknown NPC id '{body.npc_id}'.")
    archetype_id = case.npc_archetype_map.get(body.npc_id, "professional_fixer")

    history: list[ChatTurn] = list(body.history)
    history.append(ChatTurn(role="user", content=body.message))

    # ── Step 1: Classify the player's turn (secondary LLM) ──────────────
    log.info("[chat] npc=%s message_len=%d", body.npc_id, len(body.message))
    try:
        classification = await classify_player_turn(
            message=body.message,
            npc_id=body.npc_id,
            player_evidence_ids=list(body.player_evidence_ids),
            conversation_history=[t.model_dump() for t in body.history],
            npc_name=npc_profile.display_name,
            relevant_evidence=case.npc_relevant_evidence.get(body.npc_id, []),
            smoking_gun=case.smoking_gun_map.get(body.npc_id, []),
        )
    except Exception as exc:
        log.exception("[chat] Step 1 FAILED: classify_player_turn")
        raise HTTPException(status_code=502, detail="Classifier unavailable") from exc
    tactic_type = classification["tactic_type"]
    evidence_strength = classification["evidence_strength"]
    classifier_degraded = classification.get("degraded", False)
    if classifier_degraded:
        log.warning("[chat] Step 1: classifier degraded — using defaults")
    log.debug(
        "[chat] classified: tactic=%s evidence=%s degraded=%s",
        tactic_type,
        evidence_strength,
        classifier_degraded,
    )

    # ── Step 2: Compute pressure/rapport deltas ─────────────────────────
    try:
        interrogation_result = process_turn(
            tactic_type=tactic_type,
            evidence_strength=evidence_strength,
            npc_id=body.npc_id,
            current_pressure=body.pressure,
            current_rapport=body.rapport,
            peak_pressure=body.peak_pressure,
            archetype_id=archetype_id,
        )
    except Exception as exc:
        log.exception("[chat] Step 2 FAILED: process_turn")
        raise HTTPException(status_code=500, detail="Interrogation engine error") from exc
    log.debug(
        "[chat] deltas: pressure=%d(%s) rapport=%d(%s)",
        interrogation_result["pressure"],
        interrogation_result["pressure_band"],
        interrogation_result["rapport"],
        interrogation_result["rapport_band"],
    )

    # ── Step 3: Build interrogation context prompt ──────────────────────
    try:
        interrogation_prompt = build_interrogation_context(
            npc_id=body.npc_id,
            current_pressure=interrogation_result["pressure"],
            current_rapport=interrogation_result["rapport"],
            tactic_type=tactic_type,
            evidence_strength=evidence_strength,
            archetype_id=archetype_id,
            player_evidence=list(body.player_evidence_ids),
            player_discoveries=list(body.player_discovery_ids),
        )
    except Exception as exc:
        log.exception("[chat] Step 3 FAILED: build_interrogation_context")
        raise HTTPException(status_code=500, detail="Context builder error") from exc

    # ── Step 4: Generate NPC response (main LLM) ───────────────────────
    system_messages: list[ChatMessage] = [
        {"role": "system", "content": case.world_context_prompt},
    ]
    if npc_profile.timeline:
        system_messages.append({"role": "system", "content": npc_profile.timeline})
    system_messages += [
        {"role": "system", "content": npc_profile.system_prompt},
        {"role": "system", "content": interrogation_prompt},
    ]

    if body.language == "sr":
        gender_sr = "ženskog" if npc_profile.gender == "female" else "muškog"
        system_messages.append(
            {
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
            }
        )

    llm_messages: list[ChatMessage] = [
        *system_messages,
        *(_turn.model_dump() for _turn in history),
    ]

    try:
        raw_reply = await llm.generate(npc_id=body.npc_id, messages=llm_messages)
    except LLMServiceError as exc:
        log.error("[chat] Step 4 FAILED: LLM generate — %s", exc)
        raise _classify_openai_error(exc, "LLM service unavailable. Please try again.") from exc
    log.debug("[chat] reply length=%d chars", len(raw_reply))

    # Strip any stray tags the LLM may have produced out of habit
    clean_reply = _strip_stray_tags(raw_reply)

    # Strip any stray [INTUITION] tag the LLM may produce out of habit
    clean_reply, _ = _extract_intuition(clean_reply)

    # ── Step 5: Detect discoveries & expression (secondary LLM) ────────
    try:
        detection = await detect_evidence(
            npc_response=clean_reply,
            npc_id=body.npc_id,
            player_discovery_ids=list(body.player_discovery_ids),
            player_message=body.message,
            language=body.language,
            npc_name=npc_profile.display_name,
            discovery_catalog=case.discovery_catalog,
        )
    except Exception as exc:
        log.exception("[chat] Step 5 FAILED: detect_evidence")
        raise HTTPException(status_code=502, detail="Evidence detector unavailable") from exc
    evidence_ids: list[str] = detection["evidence_ids"]
    discovery_ids: list[str] = detection["discovery_ids"]
    discovery_summaries: dict = detection.get("discovery_summaries", {})
    expression: str = detection["expression"]
    detection_degraded = detection.get("degraded", False)
    if detection_degraded:
        log.warning("[chat] Step 5: evidence detection degraded — using defaults")
    log.debug(
        "[chat] detection: discoveries=%s evidence=%s expression=%s degraded=%s",
        discovery_ids,
        evidence_ids,
        expression,
        detection_degraded,
    )

    # ── Step 5b: Apply mechanical gates to detected discoveries ────────
    discovery_ids, blocked_discovery_ids = filter_gated_discoveries(
        discovery_ids=discovery_ids,
        gates_map=case.discovery_gates,
        pressure=interrogation_result["pressure"],
        rapport=interrogation_result["rapport"],
        player_evidence=list(body.player_evidence_ids),
        player_discoveries=list(body.player_discovery_ids),
    )
    # Recompute evidence_ids from the surviving discoveries only
    evidence_ids = list({case.discovery_catalog[d]["evidence_id"] for d in discovery_ids})

    # ── Step 5c: Generate intuition line if triggers are met ─────────────
    _should_intuit, moment_type = should_show_intuition(
        npc_id=body.npc_id,
        evidence_strength=evidence_strength,
        discovery_ids=discovery_ids,
        player_discovery_ids=body.player_discovery_ids,
        discovery_catalog=case.discovery_catalog,
    )
    intuition_line = None
    if _should_intuit and case.intuition_prompt:
        intuition_line = await _generate_intuition_line(
            llm, npc_profile, body.npc_id, history, clean_reply,
            moment_type, case.intuition_prompt,
        )

    history.append(ChatTurn(role="assistant", content=clean_reply))

    # ── Step 6: Track & return combined response ────────────────────────
    if body.session_id:
        log_chat_event(ChatEventData(
            session_id=body.session_id,
            npc_id=body.npc_id,
            player_message=body.message,
            npc_reply=clean_reply,
            tactic_type=tactic_type,
            evidence_strength=evidence_strength,
            pressure=interrogation_result["pressure"],
            rapport=interrogation_result["rapport"],
            pressure_band=interrogation_result["pressure_band"],
            rapport_band=interrogation_result["rapport_band"],
            expression=expression,
            evidence_ids=evidence_ids,
        ))

    log.info("[chat] Step 6: returning response for npc=%s", body.npc_id)
    return ChatResponse(
        reply=clean_reply,
        npc_id=body.npc_id,
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


# ── Transcribe endpoint ──────────────────────────────────────────────────


@router.post("/api/transcribe")
@limiter.limit("10/minute")
async def transcribe(
    request: Request,
    file: UploadFile = File(...),  # noqa: B008
    language: str = Form(default="en"),  # noqa: B008
    client: AsyncOpenAI = Depends(_get_openai_client),  # noqa: B008
):
    """Transcribe an audio file to text using OpenAI Whisper."""
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
        raise _classify_openai_error(exc, "Transcription service unavailable.") from exc


# ── Speak endpoint ────────────────────────────────────────────────────────


@router.post("/api/speak")
@limiter.limit("10/minute")
async def speak(
    request: Request,
    body: SpeakRequest,
    client: AsyncOpenAI = Depends(_get_openai_client),  # noqa: B008
):
    """Convert text to speech using OpenAI TTS and return audio/mpeg."""

    allowed_voices = {
        "alloy",
        "ash",
        "ballad",
        "coral",
        "echo",
        "fable",
        "onyx",
        "nova",
        "sage",
        "shimmer",
        "verse",
    }
    voice = body.voice if body.voice in allowed_voices else "alloy"
    text = body.text[:4096]

    tts_kwargs: dict = {
        "model": settings.openai_tts_model,
        "voice": voice,
        "input": text,
        "response_format": "mp3",
    }
    if body.instructions:
        tts_kwargs["instructions"] = body.instructions

    try:
        response = await client.audio.speech.create(**tts_kwargs)
        return StreamingResponse(
            response.iter_bytes(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline"},
        )
    except Exception as exc:
        raise _classify_openai_error(exc, "Text-to-speech service unavailable.") from exc


# ── Stringboard state endpoints ──────────────────────────────────────────
# In-memory store keyed by a simple session concept.  For authenticated users
# the string board is also persisted inside the main cloud save blob; these
# endpoints provide a lightweight local-only fallback for unauthenticated play.

_stringboard_store: dict[str, Any] = {}


@router.post("/api/state/stringboard")
async def save_stringboard(state: StringboardState, case_id: str = "default"):
    """Save the string board state (card positions + links)."""
    _stringboard_store[case_id] = state.model_dump(by_alias=True)
    return {"ok": True}


@router.get("/api/state/stringboard")
async def load_stringboard(case_id: str = "default"):
    """Load the string board state."""
    state = _stringboard_store.get(case_id)
    if state is None:
        return {"cardPositions": {}, "links": []}
    return state


__all__ = ["router", "limiter"]
