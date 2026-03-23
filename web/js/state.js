/* ================================================================
   State Serialization — buildStateObject / applyStateObject
   ================================================================
   These functions handle converting game state to/from a plain
   object for saving (localStorage / cloud).  The actual state
   variables remain in main.js; callers pass them in / receive
   restored values back.
   ================================================================ */

/**
 * Build a serializable state object from current game state.
 *
 * @param {object} state - Object containing all current state values
 * @param {object} opts  - Extra context (CASE id, storage keys, etc.)
 * @returns {object} A plain object safe to JSON-stringify
 */
export function buildStateObject(state, opts) {
  return {
    caseId:                  opts.caseId,
    conversations:           state.conversations,
    evidence:                state.evidence,
    activeNpcId:             state.activeNpcId,
    discoveries:             state.discoveries,
    npcInterrogation:        state.npcInterrogation,
    discoveryMessageIndices: state.discoveryMessageIndices,
    playerNotes:             state.playerNotes,
    caseReadyPromptShown:    state.caseReadyPromptShown,
    briefingOpen:            state.briefingOpen,
    stringBoard:             state.stringBoard,
    // Persist tutorial / UI flags for full cloud restore
    tutorialDone:            localStorage.getItem(opts.tutorialStorageKey) === "true",
    titleSeen:               !!localStorage.getItem(opts.titleStorageKey),
    lilaHintSeen:            !!localStorage.getItem(opts.lilaHintStorageKey),
    audioEnabled:            state.audioEnabled,
    language:                window.currentLang || "en",
    gameId:                  state.gameId,
    savedAt:                 new Date().toISOString(),
  };
}

/**
 * Apply a saved state object and return the restored values.
 *
 * Pure-data fields are returned in the result object so the caller
 * can assign them back to its module-level variables.  Side-effects
 * that touch the DOM or localStorage are performed here directly.
 *
 * @param {object} saved - Previously serialized state (may be null)
 * @param {object} opts  - Context: caseId, storage keys
 * @returns {object|null} Restored values, or null if nothing applied
 */
export function applyStateObject(saved, opts) {
  if (!saved) return null;
  // Skip state from a different case
  if (saved.caseId && saved.caseId !== opts.caseId) return null;

  const result = {};

  if (saved.conversations)              result.conversations = saved.conversations;
  if ("activeNpcId" in saved)           result.activeNpcId = saved.activeNpcId; // may be null (on hub)
  if (saved.evidence)                   result.evidence = saved.evidence;
  if (saved.discoveries)                result.discoveries = saved.discoveries;
  if (saved.npcInterrogation)           result.npcInterrogation = saved.npcInterrogation;
  if (saved.discoveryMessageIndices)    result.discoveryMessageIndices = saved.discoveryMessageIndices;
  if (saved.playerNotes !== undefined) {
    result.playerNotes = saved.playerNotes;
    const notesEl = document.getElementById("player-notes");
    if (notesEl) notesEl.value = saved.playerNotes;
  }
  if (saved.caseReadyPromptShown !== undefined) result.caseReadyPromptShown = saved.caseReadyPromptShown;
  if (saved.briefingOpen !== undefined)         result.briefingOpen = saved.briefingOpen;
  if (saved.stringBoard) {
    result.stringBoard = {
      cardPositions: saved.stringBoard.cardPositions || {},
      links:         saved.stringBoard.links || [],
    };
  }

  // Restore tutorial flags into localStorage
  if (saved.tutorialDone) localStorage.setItem(opts.tutorialStorageKey, "true");
  if (saved.titleSeen)    localStorage.setItem(opts.titleStorageKey, "1");
  if (saved.lilaHintSeen) localStorage.setItem(opts.lilaHintStorageKey, "1");

  if (saved.language && typeof switchLanguage === "function") {
    window.currentLang = saved.language;
  }

  if (saved.gameId) {
    result.gameId = saved.gameId;
    const prefix = opts.caseId ? `sad_${opts.caseId}` : "sad";
    localStorage.setItem(`${prefix}_game_id`, saved.gameId);
  }

  if (saved.audioEnabled !== undefined) {
    result.audioEnabled = saved.audioEnabled;
    localStorage.setItem("sad_audio", String(saved.audioEnabled));
  }

  return result;
}

/* ── Store-aware helpers ──────────────────────────────────────── */
import { store } from "./store.js";

export function buildStateFromStore(opts) {
  return buildStateObject(store, opts);
}

export function applyStateToStore(saved, opts) {
  const result = applyStateObject(saved, opts);
  if (!result) return null;
  Object.assign(store, result);
  return result;
}
