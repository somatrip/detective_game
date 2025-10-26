"""FastAPI application exposing the detective game's dialogue endpoints."""

from __future__ import annotations

from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .llm.factory import create_llm_client
from .llm.base import ChatMessage, LLMClient
from .npc_registry import WORLD_CONTEXT_PROMPT, get_npc_profile, list_npcs
from .schemas import ChatRequest, ChatResponse, ChatTurn


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


@app.get("/api/npcs")
async def list_available_npcs():
    """Return the NPCs available for conversation."""

    registry = list_npcs()
    return {
        "npcs": [
            {"npc_id": profile.npc_id, "display_name": profile.display_name}
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

    llm_messages: List[ChatMessage] = [*system_messages, *(_turn.dict() for _turn in history)]
    reply = await llm.generate(npc_id=request.npc_id, messages=llm_messages)

    history.append(ChatTurn(role="assistant", content=reply))

    return ChatResponse(reply=reply, npc_id=request.npc_id, history=history)


@app.get("/health")
async def healthcheck():
    """Simple health endpoint for monitoring."""

    return {"status": "ok", "llm_provider": settings.llm_provider}
