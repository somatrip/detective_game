/* ================================================================
   SOLVED AFTER DARK — Game Frontend (Orchestrator)
   ================================================================
   This file wires together the game's ES modules and runs the
   boot sequence. Supports multiple cases with per-case state.

   Boot flow:
     1. initShell() — case-agnostic setup (auth, settings, case selector)
     2. User selects a case → loadCase(caseData) dynamically loads assets
     3. initGame() — case-specific setup (chat, evidence, stringboard, etc.)

   auth.js        — Authentication & cloud save
   chat.js        — NPC conversation UI & portrait management
   evidence.js    — Evidence collection & discovery tracking
   stringboard.js — Deduction board (drag, link, pan, zoom)
   voice.js       — Text-to-speech & speech-to-text
   tutorial.js    — Onboarding coach marks
   accusation.js  — Arrest flow & outcome grading
   settings.js    — Settings, feedback, language
   navigation.js  — Tab switching, NPC grid, screen transitions
   caseSelector.js — Case selection UI
   state.js       — State serialization for save/load
   api.js         — Authenticated fetch wrapper
   utils.js       — HTML escaping, display name, modal helper
   ================================================================ */
import { API_BASE } from "./api.js";
import {
  initAuth, initAuthUI, openAuthModal,
  getAuthUser, isSupabaseConfigured,
  checkSupabaseStatus, restoreAuthSession, mergeCloudState,
  scheduleCloudSave,
  cloudSaveBeacon, isCloudSavePending,
  getCloudMergePromise, setCloudMergePromise,
  cloudDeleteState,
} from "./auth.js";
import {
  buildStateObject as _buildStateObject,
  applyStateObject as _applyStateObject,
} from "./state.js";
import {
  initTutorial, startTutorial,
  isTutorialDone,
  getChatTutorialPending, setChatTutorialPending,
  TUTORIAL_STORAGE_KEY, LILA_HINT_STORAGE_KEY,
} from "./tutorial.js";
import {
  initVoice, speakText, stopAudio,
  isVoiceMode, exitVoiceMode,
  isAudioEnabled, setAudioEnabled, updateAudioToggle,
  setNpcVoice,
  getChatAbortController, setChatAbortController,
  clearAudioCache,
} from "./voice.js";
import {
  initStringBoard, renderStringBoard,
  sbLoadFromServer, sbEnsurePositions,
  getStringBoard, setStringBoard, resetStringBoard,
} from "./stringboard.js";
import {
  initSettings, closeSettings,
  initLanguage,
} from "./settings.js";
import {
  initAccusation, openAccusationModal,
} from "./accusation.js";
import {
  initNavigation, activateTab, addNpcTab, removeNpcTab,
  showHubOnCaseboard, renderNpcGrid,
} from "./navigation.js";
import {
  initEvidence,
  seedStartingEvidence, checkEndgameTrigger,
  gradeArrest, detectEvidence, detectNewDiscoveries,
  renderEvidence, getDiscoveriesForEvidence,
  flashCaseBoardTab,
  showDiscoveryToast,
  clearCaseBoardBadges, getNpcsWithNewDiscoveries,
  getEvidence, setEvidence,
  getDiscoveries, setDiscoveries,
  getDiscoveryMessageIndices, setDiscoveryMessageIndices,
  isCaseReadyPromptShown, setCaseReadyPromptShown,
} from "./evidence.js";
import {
  initChat,
  selectNpc, renderMessages, sendMessage, leaveChat,
  showCancelBtn, hideCancelBtn, autoResize, scrollToBottom,
  portraitUrl, buildPortraitImg, npcRole,
  getSending,
} from "./chat.js";
import {
  initCaseSelector, showCaseSelector, hideCaseSelector,
} from "./caseSelector.js";
import { t } from "./utils.js";

/* ── Active case refs (set after case loads) ──────────── */
let CASE = null;       // window.CASE — set dynamically
let NPC_META = null;
let PARTNER_NPC_ID = null;

/* ── State ──────────────────────────────────────────────── */
let npcs = [];
let activeNpcId = null;
let conversations = {};
let npcInterrogation = {};
let playerNotes = "";
let briefingOpen = true;
let gameInitialized = false; // tracks whether initGame() has run

/* ── Gameplay tracking ─────────────────────────────────── */
let gameId = "";

function stateKeyPrefix() {
  if (!CASE) return "sad_unknown";
  return `sad_${CASE.id}`;
}

function trackEvent(endpoint, payload) {
  fetch(`${API_BASE}/api/track/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/* ── DOM refs ───────────────────────────────────────────── */
const titleCard         = document.querySelector("#title-card");
const titleCardBtn      = document.querySelector("#title-card-btn");
const hubScreen         = document.querySelector("#hub-screen");
const chatMessagesEl    = document.querySelector("#chat-messages");
const TITLE_STORAGE_KEY = "sad_title_seen";

/* ── Helpers ────────────────────────────────────────────── */

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

function _stateOpts() {
  return {
    caseId: CASE.id,
    tutorialStorageKey: `${stateKeyPrefix()}_tutorial_done`,
    titleStorageKey: TITLE_STORAGE_KEY,
    lilaHintStorageKey: `${stateKeyPrefix()}_lila_hint_seen`,
  };
}

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

function applyStateObject(s) {
  const restored = _applyStateObject(s, _stateOpts());
  if (!restored) return;
  if ("conversations" in restored)           conversations = restored.conversations;
  if ("evidence" in restored) {
    // Filter out evidence from other cases that may have leaked into saved state
    const catalog = CASE.evidenceCatalog || {};
    const validEvidence = restored.evidence.filter(e => e.id in catalog);
    setEvidence(validEvidence);
  }
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
    localStorage.setItem(`${stateKeyPrefix()}_state_v2`, JSON.stringify(buildStateObject()));
  } catch (err) {
    console.error("[saveState] Failed to persist state:", err);
  }
  scheduleCloudSave();
}

function loadState() {
  try {
    const raw = localStorage.getItem(`${stateKeyPrefix()}_state_v2`);
    if (!raw) return;
    applyStateObject(JSON.parse(raw));
  } catch (err) {
    console.error("[loadState] Failed to parse saved state:", err);
  }
}

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
  localStorage.removeItem(`${stateKeyPrefix()}_state_v2`);
  localStorage.removeItem(`${stateKeyPrefix()}_game_id`);
  localStorage.removeItem(`${stateKeyPrefix()}_tutorial_done`);
  localStorage.removeItem(`${stateKeyPrefix()}_lila_hint_seen`);
}

async function clearState() {
  resetLocalState();
  localStorage.setItem(`${stateKeyPrefix()}_game_id`, gameId);
  trackEvent("session", { session_id: gameId, case_id: CASE.id, language: window.currentLang || "en" });
  if (getAuthUser()) {
    try { await cloudDeleteState(); }
    catch (err) { console.error("[cloud] Failed to delete:", err); }
  }
}

/* ── Theme Management ──────────────────────────────────── */

function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme)) {
    root.style.setProperty(prop, value);
  }
}

function clearTheme() {
  const root = document.documentElement;
  // Remove all inline style properties (reverts to CSS stylesheet defaults)
  root.removeAttribute("style");
}

/* ── Dynamic case asset loading ────────────────────────── */

async function loadCaseAssets(frontendDir) {
  const lang = window.currentLang || "en";
  const base = `cases/${frontendDir}/`;
  // case.js sets window.CASE, i18n script sets window.t overrides — independent, load in parallel
  await Promise.all([
    window.loadScript(base + "case.js"),
    window.loadScript(base + `i18n-${lang}.js`),
  ]);
  // Re-apply translations so data-i18n elements pick up case-specific overrides
  window.applyLanguage(lang);
}

/* ── localStorage migration from old echoes_* keys ─────── */

function migrateOldState() {
  const oldState = localStorage.getItem("echoes_state_v2");
  if (!oldState) return;

  // Migrate to the Atrium case's new key
  const newKey = "sad_echoes-in-atrium_state_v2";
  if (!localStorage.getItem(newKey)) {
    localStorage.setItem(newKey, oldState);
  }

  // Migrate other keys
  const migrations = [
    ["echoes_game_id",        "sad_echoes-in-atrium_game_id"],
    ["echoes_tutorial_done",  "sad_echoes-in-atrium_tutorial_done"],
    ["echoes_lila_hint_seen", "sad_echoes-in-atrium_lila_hint_seen"],
  ];
  for (const [oldKey, newK] of migrations) {
    const val = localStorage.getItem(oldKey);
    if (val && !localStorage.getItem(newK)) {
      localStorage.setItem(newK, val);
    }
  }

  // Migrate auth key
  const oldAuth = localStorage.getItem("echoes_auth");
  if (oldAuth && !localStorage.getItem("sad_auth")) {
    localStorage.setItem("sad_auth", oldAuth);
  }

  // Migrate title seen
  const oldTitle = localStorage.getItem("echoes_title_seen");
  if (oldTitle && !localStorage.getItem(TITLE_STORAGE_KEY)) {
    localStorage.setItem(TITLE_STORAGE_KEY, oldTitle);
  }

  // Migrate language
  const oldLang = localStorage.getItem("echoes_lang");
  if (oldLang && !localStorage.getItem("sad_lang")) {
    localStorage.setItem("sad_lang", oldLang);
  }

  // Mark migration done
  localStorage.setItem("sad_migrated", "1");
}

/* ── Case selection handler ────────────────────────────── */

async function onCaseSelected(caseData) {
  hideCaseSelector();

  // Load case assets dynamically
  await loadCaseAssets(caseData.frontend_dir);

  // Set case refs
  CASE = window.CASE;
  NPC_META = CASE.npcMeta;
  PARTNER_NPC_ID = CASE.partnerNpcId;

  // Apply case theme
  applyTheme(CASE.theme);

  // Load per-case state
  gameId = localStorage.getItem(`${stateKeyPrefix()}_game_id`) || crypto.randomUUID();
  localStorage.setItem(`${stateKeyPrefix()}_game_id`, gameId);

  // Auth prompt check (only for unauthenticated users on first play)
  if (isSupabaseConfigured() && !getAuthUser()) {
    document.getElementById("auth-prompt").classList.remove("hidden");
    // The auth prompt handlers will call enterGame() or skip
    return;
  }

  enterGame();
}

/* ── Enter Game (after case selected + auth resolved) ──── */

function enterGame() {
  document.getElementById("auth-prompt").classList.add("hidden");

  if (!gameInitialized) {
    initGameModules();
  }

  initGameState().then(() => {
    hubScreen.classList.add("active");

    if (activeNpcId) {
      selectNpc(activeNpcId);
    } else {
      showHubOnCaseboard();
    }

    if (!isTutorialDone()) {
      setChatTutorialPending(true);
      setTimeout(() => startTutorial("hub"), 500);
    }
  });
}

/* ── Back to Cases ─────────────────────────────────────── */

function backToCases() {
  // Save current state
  if (CASE) saveState();

  // Clear case theme
  clearTheme();

  // Hide game, show case selector
  hubScreen.classList.remove("active");
  showCaseSelector();

  // Reset game-level state for next case load
  gameInitialized = false;
}

/* ── Game State Init (per-case) ────────────────────────── */

async function initGameState() {
  resetStringBoard();
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
    const res = await fetch(`${API_BASE}/api/npcs?case_id=${encodeURIComponent(CASE.id.replace(/-/g, "_"))}`);
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
  const briefingBody = document.querySelector("#cb-briefing-body");
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
  const briefingToggle = document.querySelector("#cb-briefing-toggle");
  briefingToggle.setAttribute("aria-expanded", String(briefingOpen));
  if (briefingOpen) briefingBody.classList.add("open");
  else briefingBody.classList.remove("open");

  // Restore notes
  const notesTextarea = document.getElementById("player-notes");
  if (notesTextarea) notesTextarea.value = playerNotes;
}

/* ── Module Initialization (once per session) ──────────── */

function initGameModules() {
  gameInitialized = true;

  initChat({
    getActiveNpcId: () => activeNpcId,
    setActiveNpcId: (v) => { activeNpcId = v; },
    getConversations: () => conversations,
    setConversation: (npcId, arr) => { conversations[npcId] = arr; },
    getNpcInterrogation: () => npcInterrogation,
    setNpcInterrogation: (npcId, data) => { npcInterrogation[npcId] = data; },
    getNpcs: () => npcs,

    speakText, stopAudio, isVoiceMode, exitVoiceMode,
    isAudioEnabled,
    getChatAbortController, setChatAbortController,

    addNpcTab, activateTab, removeNpcTab,

    saveState,

    getEvidence, getDiscoveries, getDiscoveryMessageIndices,
    detectEvidence, detectNewDiscoveries, checkEndgameTrigger,
    renderEvidence, flashCaseBoardTab, renderStringBoard,
    showDiscoveryToast,

    getChatTutorialPending, setChatTutorialPending,
    startTutorial, LILA_HINT_STORAGE_KEY,

    trackEvent,
    getGameId: () => gameId,

    renderNpcGrid,
    openAccusationModal,
  });
  initEvidence({
    getConversations: () => conversations,
    getNpcInterrogation: () => npcInterrogation,
    saveState,
    renderStringBoard,
    renderNpcGrid,
    getActiveNpcId: () => activeNpcId,
    getChatMessages: () => chatMessagesEl,
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
    getChatMessages: () => chatMessagesEl,
    reinit: () => initGameState(),
    gradeArrest,
    getEvidence,
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
    renderEvidence,
    clearCaseBoardBadges,
    getNpcsWithNewDiscoveries,
    openAccusationModal,
  });
  initTutorial({
    activateTab,
    leaveChat,
    removeNpcTab,
    closeSettings,
    partnerNpcId: PARTNER_NPC_ID,
    getActiveNpcId: () => activeNpcId,
  });
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
}

/* ── Event Listeners (always active) ───────────────────── */

document.querySelector("#cb-briefing-toggle").addEventListener("click", () => {
  const toggle = document.querySelector("#cb-briefing-toggle");
  const body = document.querySelector("#cb-briefing-body");
  const expanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!expanded));
  body.classList.toggle("open");
  briefingOpen = !expanded;
  saveState();
});

const notesTextarea = document.getElementById("player-notes");
let _notesSaveTimer;
if (notesTextarea) {
  notesTextarea.addEventListener("input", () => {
    playerNotes = notesTextarea.value;
    clearTimeout(_notesSaveTimer);
    _notesSaveTimer = setTimeout(saveState, 500);
  });
}

/* ── Title Card → Case Selector ────────────────────────── */

titleCardBtn.addEventListener("click", () => {
  titleCard.classList.add("dismissed");
  localStorage.setItem(TITLE_STORAGE_KEY, "1");
  setTimeout(() => {
    titleCard.classList.add("hidden");
    showCaseSelector();
  }, 500);
});

/* ── Auth Prompt handlers ──────────────────────────────── */

document.getElementById("auth-prompt-skip").addEventListener("click", () => {
  enterGame();
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

/* ── Settings: Back to Cases ───────────────────────────── */

const backToCasesBtn = document.getElementById("settings-back-to-cases");
if (backToCasesBtn) {
  backToCasesBtn.addEventListener("click", () => {
    closeSettings();
    backToCases();
  });
}

/* ── Shell Boot (runs immediately) ─────────────────────── */

async function initShell() {
  // Migrate old localStorage keys (one-time)
  if (!localStorage.getItem("sad_migrated")) {
    migrateOldState();
  }

  // Init case-agnostic modules
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
    getChatMessages: () => chatMessagesEl,
    getPortraitRole: () => document.querySelector("#portrait-role"),
    getPortraitStatus: () => document.querySelector("#portrait-status"),
    setBriefingOpen: (v) => { briefingOpen = v; },
  });
  initLanguage();

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
    onAuthEnterGame: () => enterGame(),
  });
  initAuthUI();

  // Check Supabase and restore auth session
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

  // Init case selector
  await initCaseSelector({
    onCaseSelected,
  });

  // Decide what to show
  const titleSeen = localStorage.getItem(TITLE_STORAGE_KEY);

  if (!titleSeen) {
    // New player: show title card
    titleCard.classList.remove("hidden");
  } else {
    // Returning player: show case selector directly
    titleCard.classList.add("hidden");
    showCaseSelector();
  }
}

/* ── Cloud save on page hide/close ─────────────────────── */

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && getAuthUser() && isCloudSavePending()) {
    cloudSaveBeacon();
  }
});

window.addEventListener("beforeunload", () => {
  if (getAuthUser() && isCloudSavePending()) {
    cloudSaveBeacon();
  }
});

/* ── Start ─────────────────────────────────────────────── */
initShell();
