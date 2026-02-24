"""FastAPI application exposing the detective game's dialogue endpoints."""

from __future__ import annotations

import io
import pathlib
import re
from typing import List, Tuple

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from openai import AsyncOpenAI

from .config import settings
from .llm.factory import create_llm_client
from .llm.base import ChatMessage, LLMClient
from .npc_registry import WORLD_CONTEXT_PROMPT, get_npc_profile, list_npcs
from .schemas import ChatRequest, ChatResponse, ChatTurn, SpeakRequest

_WEB_DIR = pathlib.Path(__file__).resolve().parent.parent / "web"

app = FastAPI(title="Echoes in the Atrium Backend", version="0.1.0")


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


# ── Evidence tag parsing ─────────────────────────────────────────────────────

_EVIDENCE_TAG_RE = re.compile(r'\[EVIDENCE:\s*([^\]]+)\]\s*$')
_EXPRESSION_TAG_RE = re.compile(r'\[EXPRESSION:\s*(\w+)\]\s*$')
_VALID_EXPRESSIONS = {"neutral", "guarded", "distressed", "angry", "contemplative", "smirking"}


def parse_evidence_tags(raw_reply: str) -> Tuple[str, List[str]]:
    """Strip ``[EVIDENCE: id1, id2]`` tag from the LLM reply.

    Returns a (clean_reply, evidence_ids) tuple.
    """
    match = _EVIDENCE_TAG_RE.search(raw_reply)
    if not match:
        return raw_reply.strip(), []
    evidence_str = match.group(1)
    evidence_ids = [eid.strip() for eid in evidence_str.split(",") if eid.strip()]
    clean_reply = raw_reply[: match.start()].strip()
    return clean_reply, evidence_ids


def parse_expression_tag(raw_reply: str) -> Tuple[str, str]:
    """Strip ``[EXPRESSION: mood]`` tag from the LLM reply.

    Returns a (clean_reply, expression) tuple.  Falls back to "neutral".
    """
    match = _EXPRESSION_TAG_RE.search(raw_reply)
    if not match:
        return raw_reply, "neutral"
    expression = match.group(1).lower().strip()
    if expression not in _VALID_EXPRESSIONS:
        expression = "neutral"
    clean_reply = raw_reply[: match.start()].strip()
    return clean_reply, expression


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
    """Send the player's message to the LLM and return the NPC's reply."""

    try:
        npc_profile = get_npc_profile(request.npc_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    history: List[ChatTurn] = list(request.history)
    history.append(ChatTurn(role="user", content=request.message))

    system_messages: List[ChatMessage] = [
        {"role": "system", "content": WORLD_CONTEXT_PROMPT},
        {"role": "system", "content": npc_profile.system_prompt},
    ]

    if request.language == "sr":
        system_messages.append({
            "role": "system",
            "content": (
                "IMPORTANT: The player has chosen Serbian as their language. "
                "You MUST respond entirely in Serbian (Latin script). "
                "Stay in character and maintain the same personality, secrets, "
                "and conversational rules, but speak Serbian."
            ),
        })

    llm_messages: List[ChatMessage] = [*system_messages, *(_turn.model_dump() for _turn in history)]

    try:
        reply = await llm.generate(npc_id=request.npc_id, messages=llm_messages)
    except Exception as exc:
        detail = str(exc)
        # Surface helpful messages for common API errors
        if "insufficient_quota" in detail or "exceeded" in detail.lower():
            detail = "OpenAI quota exceeded. Add credits at platform.openai.com/settings/organization/billing"
        elif "invalid_api_key" in detail or "Incorrect API key" in detail:
            detail = "Invalid API key. Check the key in your .env file."
        elif "authentication" in detail.lower():
            detail = f"Authentication failed: {detail}"
        raise HTTPException(status_code=502, detail=detail) from exc

    # Parse both tags from the raw LLM output (expression first since it
    # appears after the evidence tag).
    step1, expression = parse_expression_tag(reply)
    clean_reply, evidence_ids = parse_evidence_tags(step1)
    history.append(ChatTurn(role="assistant", content=clean_reply))

    return ChatResponse(
        reply=clean_reply,
        npc_id=request.npc_id,
        history=history,
        evidence_ids=evidence_ids,
        expression=expression,
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
