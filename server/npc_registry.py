"""NPC persona registry — engine-level profile dataclass.

The actual NPC profile data lives in the active case package.  This module
provides the ``NPCProfile`` dataclass used by the interrogation engine and
case loader.  Callers access NPC data directly via
``get_active_case().npc_profiles``.
"""

from __future__ import annotations

from dataclasses import dataclass


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


__all__ = ["NPCProfile"]
