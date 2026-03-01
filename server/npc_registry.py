"""NPC persona registry — engine-level profile dataclass and accessors.

The actual NPC profile data lives in the active case package.  This module
provides the ``NPCProfile`` dataclass and thin accessor functions that
delegate to ``get_active_case()``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class NPCProfile:
    """Represents a single NPC persona definition."""

    npc_id: str
    display_name: str
    system_prompt: str
    timeline: str = ""  # Story-bible timeline injected as a separate system message
    voice: str = "alloy"  # OpenAI TTS voice identifier
    voice_instruction: str = ""  # gpt-4o-mini-tts voice styling instruction
    gender: str = "male"  # "male" or "female" — used for gendered language prompts


def get_npc_profile(npc_id: str) -> NPCProfile:
    """Retrieve an NPC profile by its identifier."""

    from .cases import get_active_case
    profiles = get_active_case().npc_profiles
    try:
        return profiles[npc_id]
    except KeyError as exc:  # pragma: no cover - defensive branch
        raise ValueError(f"Unknown NPC id '{npc_id}'.") from exc


def list_npcs() -> Dict[str, NPCProfile]:
    """Return a shallow copy of the NPC registry."""

    from .cases import get_active_case
    return dict(get_active_case().npc_profiles)


__all__ = ["NPCProfile", "get_npc_profile", "list_npcs"]
