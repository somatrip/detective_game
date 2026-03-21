/* ================================================================
   ECHOES IN THE ATRIUM — Game Frontend
   ================================================================ */
import { escapeHtml, npcDisplayName, addModalCloseOnClickOutside } from "./utils.js";
import { apiFetch, apiPost } from "./api.js";
import {
  initAuth, initAuthUI, openAuthModal, closeAuthModal,
  updateAuthUI, getAuthUser, isSupabaseConfigured,
  checkSupabaseStatus, restoreAuthSession, mergeCloudState,
  scheduleCloudSave, flushCloudSave, cloudSaveState,
  cloudSaveBeacon, isCloudSavePending,
  getCloudMergePromise, setCloudMergePromise,
  cloudDeleteState,
} from "./auth.js";
import {
  buildStateObject as _buildStateObject,
  applyStateObject as _applyStateObject,
} from "./state.js";
import {
  initTutorial, startTutorial, endTutorial, skipTutorial,
  isTutorialDone, markTutorialDone,
  getChatTutorialPending, setChatTutorialPending,
  TUTORIAL_STORAGE_KEY, LILA_HINT_STORAGE_KEY,
} from "./tutorial.js";
import {
  initVoice, speakText, stopAudio,
  startRecording, stopRecording,
  enterVoiceMode, exitVoiceMode, isVoiceMode,
  isAudioEnabled, setAudioEnabled, updateAudioToggle,
  setNpcVoice, getIsRecording, getIsTranscribing,
  getChatAbortController, setChatAbortController,
  clearAudioCache, transcribeAudio,
} from "./voice.js";
import {
  initStringBoard, renderStringBoard,
  sbLoadFromServer, sbEnsurePositions,
  getStringBoard, setStringBoard, resetStringBoard,
} from "./stringboard.js";
import {
  initSettings, openSettings, closeSettings,
  openFeedback, closeFeedback,
  initLanguage, switchLanguage,
} from "./settings.js";
import {
  initAccusation, openAccusationModal,
} from "./accusation.js";
import {
  initNavigation, activateTab, addNpcTab, removeNpcTab,
  showHub, showChat, showHubOnCaseboard, renderNpcGrid,
} from "./navigation.js";
import {
  initEvidence,
  seedStartingEvidence, checkEndgameTrigger,
  gradeArrest, detectEvidence, detectNewDiscoveries,
  renderEvidence, getDiscoveriesForEvidence,
  flashCaseBoardTab, clearCaseBoardBadges,
  showDiscoveryToast,
  getEvidence, setEvidence,
  getDiscoveries, setDiscoveries,
  getDiscoveryMessageIndices, setDiscoveryMessageIndices,
  isCaseReadyPromptShown, setCaseReadyPromptShown,
  getUnseenDiscoveryCount,
} from "./evidence.js";
import {
  initChat,
  selectNpc, renderMessages, sendMessage, leaveChat, cancelResponse,
  showCancelBtn, hideCancelBtn, autoResize, scrollToBottom,
  portraitUrl, buildPortraitImg, npcRole,
  getSending, setSending,
} from "./chat.js";

const CASE = window.CASE;
const NPC_META = CASE.npcMeta;
const PARTNER_NPC_ID = CASE.partnerNpcId;

// Create toast container dynamically (avoids HTML parser issues)
const _toastContainer = document.createElement("div");
_toastContainer.id = "discovery-toast-container";
document.body.appendChild(_toastContainer);

const API_BASE = window.location.origin;

/* ── State ──────────────────────────────────────────────── */
let npcs = [];
let activeNpcId = null;
let conversations = {};
let npcInterrogation = {};   // npc_id → { pressure, rapport, pressure_band, rapport_band }
let playerNotes = "";

/* ── Gameplay tracking ─────────────────────────────────── */
let gameId = localStorage.getItem("echoes_game_id") || crypto.randomUUID();
localStorage.setItem("echoes_game_id", gameId);

function trackEvent(endpoint, payload) {
  fetch(`${API_BASE}/api/track/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});  // fire-and-forget
}

/* ── DOM refs ───────────────────────────────────────────── */
const $ = (s) => document.querySelector(s);

// Screens
const titleCard         = $("#title-card");
const titleCardBtn      = $("#title-card-btn");
const hubScreen         = $("#hub-screen");
const TITLE_STORAGE_KEY = "echoes_title_seen";

/* ── Helpers ────────────────────────────────────────────── */

/** Count total conversation messages + evidence items as a state richness proxy. */
function stateRichness(s) {
  if (!s) return 0;
  let count = 0;
  if (s.conversations) {
    for (const msgs of Object.values(s.conversations)) {
      count += Array.isArray(msgs) ? msgs.length : 0;
    }
  }
  if (Array.isArray(s.evidence)) count += s.evidence.length;
  return count;
}

/** Collect the storage-key constants needed by state serialization. */
function _stateOpts() {
  return {
    caseId: CASE.id,
    tutorialStorageKey: TUTORIAL_STORAGE_KEY,
    titleStorageKey: TITLE_STORAGE_KEY,
    lilaHintStorageKey: LILA_HINT_STORAGE_KEY,
  };
}

/** Snapshot the module-level state variables into a plain object. */
function _currentState() {
  return {
    conversations, evidence: getEvidence(), activeNpcId, discoveries: getDiscoveries(),
    npcInterrogation, discoveryMessageIndices: getDiscoveryMessageIndices(), playerNotes,
    caseReadyPromptShown: isCaseReadyPromptShown(), briefingOpen, stringBoard: getStringBoard(),
    audioEnabled: isAudioEnabled(), gameId,
  };
}

function buildStateObject() {
  return _buildStateObject(_currentState(), _stateOpts());
}

/** Apply a state object (from cloud or localStorage) to the running game variables. */
function applyStateObject(s) {
  const restored = _applyStateObject(s, _stateOpts());
  if (!restored) return;
  if ("conversations" in restored)           conversations = restored.conversations;
  if ("evidence" in restored)                setEvidence(restored.evidence);
  if ("activeNpcId" in restored)             activeNpcId = restored.activeNpcId;
  if ("discoveries" in restored)             setDiscoveries(restored.discoveries);
  if ("npcInterrogation" in restored)        npcInterrogation = restored.npcInterrogation;
  if ("discoveryMessageIndices" in restored) setDiscoveryMessageIndices(restored.discoveryMessageIndices);
  if ("playerNotes" in restored)             playerNotes = restored.playerNotes;
  if ("caseReadyPromptShown" in restored)    setCaseReadyPromptShown(restored.caseReadyPromptShown);
  if ("briefingOpen" in restored)            briefingOpen = restored.briefingOpen;
  if ("stringBoard" in restored) {
    setStringBoard({
      cardPositions: restored.stringBoard.cardPositions,
      links: restored.stringBoard.links,
    });
  }
  if ("gameId" in restored)       gameId = restored.gameId;
  if ("audioEnabled" in restored) setAudioEnabled(restored.audioEnabled);
}

function saveState() {
  try {
    localStorage.setItem("echoes_state_v2", JSON.stringify(buildStateObject()));
  } catch (err) {
    console.error("[saveState] Failed to persist state:", err);
  }
  scheduleCloudSave();
}

function loadState() {
  try {
    const raw = localStorage.getItem("echoes_state_v2");
    if (!raw) return;
    applyStateObject(JSON.parse(raw));
  } catch (err) {
    console.error("[loadState] Failed to parse saved state:", err);
  }
}

/** Wipe all local game state (memory + localStorage). Does NOT touch cloud. */
function resetLocalState() {
  if (isVoiceMode()) exitVoiceMode();
  conversations = {};
  setEvidence([]);
  setDiscoveries({});
  npcInterrogation = {};
  setDiscoveryMessageIndices({});
  playerNotes = "";
  setCaseReadyPromptShown(false);
  briefingOpen = true;
  activeNpcId = null;
  resetStringBoard();
  gameId = crypto.randomUUID();
  clearAudioCache();
  localStorage.removeItem("echoes_state_v2");
  localStorage.removeItem("echoes_game_id");
  localStorage.removeItem("echoes_tutorial_done");
  localStorage.removeItem("echoes_title_seen");
  localStorage.removeItem("echoes_lila_hint_seen");
}

/** Full restart: wipe local state, delete cloud save, start new game session. */
async function clearState() {
  resetLocalState();
  localStorage.setItem("echoes_game_id", gameId);
  trackEvent("session", { session_id: gameId, case_id: CASE.id, language: window.currentLang || "en" });
  if (getAuthUser()) {
    try { await cloudDeleteState(); }
    catch (err) { console.error("[cloud] Failed to delete:", err); }
  }
}

/* ── Initialize ─────────────────────────────────────────── */

let briefingOpen = true; // default: open on first visit

async function init() {
  loadState();
  seedStartingEvidence();
  if (getCloudMergePromise()) {
    await getCloudMergePromise().catch(() => {});
  }
  const isNewGame = !conversations || Object.keys(conversations).length === 0;
  if (isNewGame) {
    trackEvent("session", { session_id: gameId, case_id: CASE.id, language: window.currentLang || "en" });
  }
  try {
    const res = await fetch(`${API_BASE}/api/npcs`);
    const data = await res.json();
    npcs = data.npcs.sort((a, b) => {
      const oa = NPC_META[a.npc_id]?.order ?? 99;
      const ob = NPC_META[b.npc_id]?.order ?? 99;
      return oa - ob;
    });
    for (const npc of npcs) {
      setNpcVoice(npc.npc_id, npc.voice, npc.voice_instruction);
    }
  } catch {
    npcs = Object.entries(NPC_META).map(([id, m]) => ({
      npc_id: id,
      display_name: id.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
    }));
  }

  renderNpcGrid();
  renderEvidence();
  initStringBoard({
    getEvidence,
    getNpcs: () => npcs,
    portraitUrl,
    getDiscoveriesForEvidence,
    saveState,
  });

  sbLoadFromServer().then(() => {
    sbEnsurePositions();
  }).catch(() => {});

  // Populate briefing paragraphs from case data
  const briefingBody = $("#cb-briefing-body");
  briefingBody.innerHTML = "";
  for (const entry of CASE.briefingKeys) {
    const isObj = typeof entry === "object";
    const key = isObj ? entry.key : entry;
    const type = isObj ? entry.type : "paragraph";

    if (type === "heading") {
      const h4 = document.createElement("h4");
      h4.className = "briefing-section-heading";
      h4.setAttribute("data-i18n", key);
      h4.textContent = t(key);
      briefingBody.appendChild(h4);
    } else if (type === "highlight") {
      const div = document.createElement("div");
      div.className = "briefing-highlight";
      div.setAttribute("data-i18n", key);
      div.setAttribute("data-i18n-html", "");
      div.innerHTML = t(key);
      briefingBody.appendChild(div);
    } else if (type === "callout") {
      const div = document.createElement("div");
      div.className = "briefing-callout";
      div.setAttribute("data-i18n", key);
      div.setAttribute("data-i18n-html", "");
      div.innerHTML = t(key);
      briefingBody.appendChild(div);
    } else {
      const p = document.createElement("p");
      p.setAttribute("data-i18n", key);
      p.setAttribute("data-i18n-html", "");
      p.innerHTML = t(key);
      briefingBody.appendChild(p);
    }
  }

  // Restore briefing open/closed state
  const briefingToggle = $("#cb-briefing-toggle");
  briefingToggle.setAttribute("aria-expanded", String(briefingOpen));
  if (briefingOpen) briefingBody.classList.add("open");
  else briefingBody.classList.remove("open");

  const titleSeen = localStorage.getItem(TITLE_STORAGE_KEY);
  const hasConversations = Object.keys(conversations).length > 0;

  if (activeNpcId) {
    titleCard.classList.add("hidden");
    hubScreen.classList.add("active");
    selectNpc(activeNpcId);
  } else if (!titleSeen && !hasConversations) {
    titleCard.classList.remove("hidden");
  } else {
    titleCard.classList.add("hidden");
    showHubOnCaseboard();
  }
}

/* ── Event Listeners ────────────────────────────────────── */

// Case board briefing toggle (persists state)
$("#cb-briefing-toggle").addEventListener("click", () => {
  const toggle = $("#cb-briefing-toggle");
  const body = $("#cb-briefing-body");
  const expanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!expanded));
  body.classList.toggle("open");
  briefingOpen = !expanded;
  saveState();
});

// Notes textarea — auto-save on input
const notesTextarea = document.getElementById("player-notes");
if (notesTextarea) {
  notesTextarea.value = playerNotes;
  notesTextarea.addEventListener("input", () => {
    playerNotes = notesTextarea.value;
    saveState();
  });
}

/* ── Boot ───────────────────────────────────────────────── */
const t = (...args) => window.t(...args);

initChat({
  // State getters/setters
  getActiveNpcId: () => activeNpcId,
  setActiveNpcId: (v) => { activeNpcId = v; },
  getConversations: () => conversations,
  setConversation: (npcId, arr) => { conversations[npcId] = arr; },
  getNpcInterrogation: () => npcInterrogation,
  setNpcInterrogation: (npcId, data) => { npcInterrogation[npcId] = data; },
  getNpcs: () => npcs,

  // Voice module
  speakText, stopAudio, isVoiceMode, exitVoiceMode,
  isAudioEnabled,
  getChatAbortController, setChatAbortController,

  // Navigation module
  addNpcTab, activateTab, removeNpcTab,

  // State persistence
  saveState,

  // Evidence module
  getEvidence, getDiscoveries, getDiscoveryMessageIndices,
  detectEvidence, detectNewDiscoveries, checkEndgameTrigger,
  renderEvidence, flashCaseBoardTab, renderStringBoard,
  showDiscoveryToast,

  // Tutorial module
  getChatTutorialPending, setChatTutorialPending,
  startTutorial, LILA_HINT_STORAGE_KEY,

  // Tracking
  trackEvent,
  getGameId: () => gameId,

  // Navigation
  renderNpcGrid,
});
initEvidence({
  getConversations: () => conversations,
  getNpcInterrogation: () => npcInterrogation,
  saveState,
  renderStringBoard,
  renderNpcGrid,
  getActiveNpcId: () => activeNpcId,
  getChatMessages: () => document.querySelector("#chat-messages"),
  openAccusationModal,
  trackEvent,
  getGameId: () => gameId,
  getNpcs: () => npcs,
});
initAccusation({
  getNpcs: () => npcs,
  getConversations: () => conversations,
  getGameId: () => gameId,
  trackEvent,
  buildPortraitImg,
  clearState,
  setBriefingOpen: (v) => { briefingOpen = v; },
  removeNpcTab,
  getHubScreen: () => hubScreen,
  getChatMessages: () => document.querySelector("#chat-messages"),
  reinit: init,
});
initNavigation({
  getNpcs: () => npcs,
  getConversations: () => conversations,
  getActiveNpcId: () => activeNpcId,
  getHubScreen: () => hubScreen,
  leaveChat,
  selectNpc,
  portraitUrl,
  npcRole,
  renderStringBoard,
});
initSettings({
  clearState,
  seedStartingEvidence,
  removeNpcTab,
  renderEvidence,
  renderNpcGrid,
  renderMessages,
  activateTab,
  getActiveNpcId: () => activeNpcId,
  getSending: () => getSending(),
  getGameId: () => gameId,
  npcRole,
  getHubScreen: () => hubScreen,
  getChatMessages: () => document.querySelector("#chat-messages"),
  getPortraitRole: () => document.querySelector("#portrait-role"),
  getPortraitStatus: () => document.querySelector("#portrait-status"),
  setBriefingOpen: (v) => { briefingOpen = v; },
});
initTutorial({
  activateTab,
  leaveChat,
  removeNpcTab,
  closeSettings,
  partnerNpcId: PARTNER_NPC_ID,
  getActiveNpcId: () => activeNpcId,
});
initLanguage();
initVoice({
  getSending: () => getSending(),
  getActiveNpcId: () => activeNpcId,
  sendMessage,
  autoResize,
  showCancelBtn,
  hideCancelBtn,
  scrollToBottom,
});
updateAudioToggle();
initAuth({
  renderNpcGrid,
  renderEvidence,
  resetLocalState,
  removeNpcTab,
  leaveChat,
  showHubOnCaseboard,
  isTutorialDone,
  setChatTutorialPending,
  startTutorial,
  buildStateObject,
  applyStateObject,
  saveState,
  stateRichness,
  getHubScreen: () => hubScreen,
  getTitleCard: () => titleCard,
  getActiveNpcId: () => activeNpcId,
});
initAuthUI();

// Check Supabase availability and restore auth session
setCloudMergePromise(checkSupabaseStatus().then(async configured => {
  if (!configured) {
    const accountRow = document.getElementById("settings-account-row");
    if (accountRow) accountRow.style.display = "none";
    return;
  }
  const restored = await restoreAuthSession();
  if (restored) {
    console.log("[auth] Session restored for", getAuthUser().email);
    await mergeCloudState();
  }
}));

// Flush cloud save when tab becomes hidden
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && getAuthUser()?.access_token && isCloudSavePending()) {
    try {
      const stateObj = buildStateObject();
      apiFetch(`${API_BASE}/api/state/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: stateObj }),
        keepalive: true,
      }).then(() => {}).catch(() => {});
    } catch {}
  }
});
// beforeunload: use sendBeacon as last resort
window.addEventListener("beforeunload", () => {
  if (getAuthUser() && isCloudSavePending()) {
    cloudSaveBeacon();
  }
});

// Shared: enter the game (dismiss title card or auth prompt, show hub)
function enterGame() {
  titleCard.classList.add("dismissed");
  localStorage.setItem(TITLE_STORAGE_KEY, "1");
  document.getElementById("auth-prompt").classList.add("hidden");
  setTimeout(() => {
    titleCard.classList.add("hidden");
    showHubOnCaseboard();
    if (!isTutorialDone()) {
      setChatTutorialPending(true);
      setTimeout(() => startTutorial("hub"), 500);
    }
  }, 500);
}

// Title card "Open Case File" button
titleCardBtn.addEventListener("click", () => {
  if (isSupabaseConfigured() && !getAuthUser()) {
    titleCard.classList.add("dismissed");
    localStorage.setItem(TITLE_STORAGE_KEY, "1");
    setTimeout(() => {
      titleCard.classList.add("hidden");
      document.getElementById("auth-prompt").classList.remove("hidden");
    }, 500);
    return;
  }
  enterGame();
});

// Auth prompt buttons
document.getElementById("auth-prompt-skip").addEventListener("click", () => {
  document.getElementById("auth-prompt").classList.add("hidden");
  showHubOnCaseboard();
  if (!isTutorialDone()) {
    setChatTutorialPending(true);
    setTimeout(() => startTutorial("hub"), 500);
  }
});

function authPromptFlow(tab) {
  const tabBtns = document.querySelectorAll("[data-auth-tab]");
  tabBtns.forEach(b => b.classList.toggle("active", b.dataset.authTab === tab));
  const submitBtn = document.getElementById("auth-submit");
  if (submitBtn) submitBtn.textContent = tab === "signup" ? t("auth.signup") : t("auth.signin");
  window.__authFromTitleCard = true;
  openAuthModal();
}
document.getElementById("auth-prompt-signin").addEventListener("click", () => authPromptFlow("login"));
document.getElementById("auth-prompt-signup").addEventListener("click", () => authPromptFlow("signup"));

init().then(() => {
  const hasConversations = Object.keys(conversations).length > 0;
  const titleSeen = localStorage.getItem(TITLE_STORAGE_KEY);
  if (titleSeen && !isTutorialDone() && !hasConversations) {
    setChatTutorialPending(true);
    setTimeout(() => startTutorial("hub"), 600);
  }
});
