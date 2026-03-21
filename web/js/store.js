/**
 * Shared game state store.
 *
 * All game state lives here as a plain mutable object. Modules import
 * `store` and read/write properties directly. This replaces the
 * module-level variables that were scattered throughout main.js.
 *
 * For cross-module reactivity, modules should use events.js to notify
 * others when important state changes (e.g., emit("evidence:collected")).
 */

function createDefaults() {
  return {
    // --- NPC & conversation ---
    npcs: [],
    activeNpcId: null,
    conversations: {},

    // --- Evidence & discoveries ---
    evidence: [],
    discoveries: {},
    npcInterrogation: {},
    discoveryMessageIndices: {},

    // --- Player ---
    playerNotes: "",
    caseReadyPromptShown: false,
    briefingOpen: true,

    // --- String board ---
    stringBoard: { cardPositions: {}, links: [] },

    // --- Audio ---
    audioEnabled: false,
    npcVoices: {},
    npcVoiceInstructions: {},

    // --- Session ---
    gameId: "",
    sending: false,

    // --- Auth ---
    authUser: null,
    supabaseConfigured: false,

    // --- UI ephemeral (not persisted) ---
    currentExpression: {},
    unseenDiscoveryCount: 0,
    npcsWithNewDiscoveries: new Set(),
    accusationTarget: null,
    subpoenaToastShown: false,
    keycardLogsCache: null,
    feedbackScreenshotFile: null,
  };
}

export const store = createDefaults();

/** Reset all state to defaults. Used on logout / restart. */
export function resetStore() {
  const defaults = createDefaults();
  for (const key of Object.keys(defaults)) {
    store[key] = defaults[key];
  }
}
