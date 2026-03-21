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

const CASE = window.CASE;
const NPC_META = CASE.npcMeta;
const EVIDENCE_CATALOG = CASE.evidenceCatalog;
const DISCOVERY_EVIDENCE_MAP = CASE.discoveryEvidenceMap;
const EVIDENCE_GROUPS = CASE.evidenceGroups;
const STARTING_EVIDENCE = CASE.startingEvidence;
const CANONICAL_EVIDENCE = CASE.canonicalEvidence;
const PARTNER_NPC_ID = CASE.partnerNpcId;
const CULPRIT_ID = CASE.culpritNpcId;

// Create toast container dynamically (avoids HTML parser issues)
const _toastContainer = document.createElement("div");
_toastContainer.id = "discovery-toast-container";
document.body.appendChild(_toastContainer);

const API_BASE = window.location.origin;

/* Auth & Cloud Save module → see auth.js */

const VALID_EXPRESSIONS = ["neutral", "guarded", "distressed", "angry", "contemplative", "smirking"];
let currentExpression = {};  // npcId → last known expression

function portraitUrl(npcId, expression = "neutral") {
  return `${CASE.portraitBasePath}/${npcId}/${expression}.webp`;
}

/** Build an <img> element for a portrait, falling back to initials on error. */
function buildPortraitImg(npcId, expression = "neutral", size = 36) {
  const meta = NPC_META[npcId] || { initials: "?" };
  const img = new Image(size, size);
  img.src = portraitUrl(npcId, expression);
  img.alt = meta.initials;
  img.loading = "lazy";
  img.onerror = function() {
    this.parentElement.textContent = meta.initials;
  };
  return img;
}

/** Update the chat portrait to the given expression. */
function setHeaderExpression(npcId, expression) {
  if (!VALID_EXPRESSIONS.includes(expression)) expression = "neutral";
  currentExpression[npcId] = expression;
  if (npcId === activeNpcId && chatPortraitImg) {
    chatPortraitImg.src = portraitUrl(npcId, expression);
  }
}

function npcRole(npcId) {
  return t("role." + npcId);
}

/** Update the interrogation icon gauges for the active NPC. */
function updateInterrogationUI(npcId) {
  const gaugesContainer = document.getElementById("interrogation-gauges");
  const gaugeP = document.getElementById("gauge-pressure");
  const gaugeR = document.getElementById("gauge-rapport");
  const iconP  = document.getElementById("gauge-pressure-icon");
  const iconR  = document.getElementById("gauge-rapport-icon");
  if (!gaugeP || !gaugeR) return;

  // Partner: hide gauges, show hint button; suspects: show gauges, hide hint
  const hintBtn = document.getElementById("lila-hint-btn");
  if (npcId === PARTNER_NPC_ID) {
    gaugeP.style.display = "none";
    gaugeR.style.display = "none";
    if (hintBtn) hintBtn.classList.add("visible");
    return;
  }
  if (hintBtn) hintBtn.classList.remove("visible");
  gaugeP.style.display = "";
  gaugeR.style.display = "";

  const state = npcInterrogation[npcId] || { pressure_band: "calm", rapport_band: "neutral" };

  // Update wrapper classes for glow styling
  gaugeP.className = "gauge gauge-pressure " + state.pressure_band;
  gaugeR.className = "gauge gauge-rapport " + state.rapport_band;

  // Swap icon images with pulse animation on change
  const newPSrc = "icons/pressure-" + state.pressure_band + ".png";
  const newRSrc = "icons/rapport-" + state.rapport_band + ".png";
  if (!iconP.src.endsWith(newPSrc)) {
    iconP.src = newPSrc;
    iconP.classList.add("pulse");
    setTimeout(() => iconP.classList.remove("pulse"), 600);
  }
  if (!iconR.src.endsWith(newRSrc)) {
    iconR.src = newRSrc;
    iconR.classList.add("pulse");
    setTimeout(() => iconR.classList.remove("pulse"), 600);
  }
}

/** Check if all canonical evidence is collected and trigger endgame. */
function checkEndgameTrigger() {
  if (caseReadyPromptShown) return;
  const collectedIds = evidence.map(e => e.id);
  if (!CANONICAL_EVIDENCE.every(id => collectedIds.includes(id))) return;
  caseReadyPromptShown = true;
  saveState();
  document.getElementById("case-ready-modal").classList.add("visible");
}

/* ── State ──────────────────────────────────────────────── */
let npcs = [];
let activeNpcId = null;
let conversations = {};
let evidence = [];
let discoveries = {};
let npcInterrogation = {};   // npc_id → { pressure, rapport, pressure_band, rapport_band }
let discoveryMessageIndices = {};  // npc_id → [messageIndex, ...] — tracks which messages revealed discoveries
let playerNotes = "";
let caseReadyPromptShown = false;
let sending = false;
let accusationTarget = null;
let subpoenaToastShown = false;

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

/* ── Voice State — see voice.js ─────────────────── */

/* ── DOM refs ───────────────────────────────────────────── */
const $ = (s) => document.querySelector(s);

// Screens
const titleCard         = $("#title-card");
const titleCardBtn      = $("#title-card-btn");
const hubScreen         = $("#hub-screen");
const TITLE_STORAGE_KEY = "echoes_title_seen";

// Hub elements
const npcGridEl         = $("#npc-grid");
// Chat elements
const chatLayout        = document.querySelector("#hub-chat .chat-layout");
const chatPortraitImg   = $("#chat-portrait-img");
const portraitName      = $("#portrait-name");
const portraitRole      = $("#portrait-role");
const portraitStatus    = $("#portrait-status");
const chatMessages      = $("#chat-messages");
const typingIndicator   = $("#typing-indicator");
const chatInputBar      = $("#chat-input-bar");
const chatInput         = $("#chat-input");
const sendBtn           = $("#send-btn");
const cancelBtn         = $("#cancel-btn");

// Chat dossier

// Case Board (hub)
const cbEvidenceList    = $("#cb-evidence-list");
const cbEvidenceEmpty   = $("#cb-evidence-empty");

// Modals
const accusationModal   = $("#accusation-modal");
const suspectGrid       = $("#suspect-grid");
const cancelAccuse      = $("#cancel-accuse");
const confirmAccuse     = $("#confirm-accuse");
const outcomeScreen     = $("#outcome-screen");
const outcomeCard       = $("#outcome-card");
const outcomeTitle      = $("#outcome-title");
const outcomeText       = $("#outcome-text");
const restartBtn        = $("#restart-btn");

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
    conversations, evidence, activeNpcId, discoveries,
    npcInterrogation, discoveryMessageIndices, playerNotes,
    caseReadyPromptShown, briefingOpen, stringBoard: getStringBoard(),
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
  if ("evidence" in restored)                evidence = restored.evidence;
  if ("activeNpcId" in restored)             activeNpcId = restored.activeNpcId;
  if ("discoveries" in restored)             discoveries = restored.discoveries;
  if ("npcInterrogation" in restored)        npcInterrogation = restored.npcInterrogation;
  if ("discoveryMessageIndices" in restored) discoveryMessageIndices = restored.discoveryMessageIndices;
  if ("playerNotes" in restored)             playerNotes = restored.playerNotes;
  if ("caseReadyPromptShown" in restored)    caseReadyPromptShown = restored.caseReadyPromptShown;
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
  // Always save to localStorage (offline-first) — use buildStateObject for consistency
  try {
    localStorage.setItem("echoes_state_v2", JSON.stringify(buildStateObject()));
  } catch (err) {
    console.error("[saveState] Failed to persist state:", err);
  }
  // Schedule a debounced cloud save if logged in
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
  evidence = [];
  discoveries = {};
  npcInterrogation = {};
  discoveryMessageIndices = {};
  playerNotes = "";
  caseReadyPromptShown = false;
  subpoenaToastShown = false;
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
  // Keep echoes_audio (device preference)
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

// escapeHtml is now imported from utils.js

/* ── Unified Tab Navigation ──────────────────────────────── */
function activateTab(tabName) {
  document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));

  const tab = document.querySelector(`.manila-tab[data-hub-tab="${tabName}"]`);
  if (tab) tab.classList.add("active");
  const panel = document.getElementById(`hub-${tabName}`);
  if (panel) panel.classList.add("active");

  // Tab-specific side effects
  if (tabName === "caseboard") { renderEvidence(); clearCaseBoardBadges(); }
  if (tabName === "stringboard") renderStringBoard();
  if (tabName === "suspects") { renderNpcGrid(); renderEvidence(); }

  // Audio toggle only visible in chat
  const audioBtn = document.getElementById("audio-toggle");
  if (audioBtn) audioBtn.classList.toggle("hidden-icon", tabName !== "chat");
}

function addNpcTab(npcId) {
  removeNpcTab();
  const npc = npcs.find(n => n.npc_id === npcId);
  const name = (npc?.display_name || npcId).split(/\s[—\u2014-]{1,2}\s/)[0];
  const tab = document.createElement("button");
  tab.className = "manila-tab manila-tab-npc";
  tab.dataset.hubTab = "chat";
  tab.innerHTML = `<span class="manila-tab-label">${escapeHtml(name)}</span>`;
  tab.addEventListener("click", () => activateTab("chat"));
  // Insert right after "Persons of Interest" tab
  const suspectsTab = document.querySelector('.manila-tab[data-hub-tab="suspects"]');
  suspectsTab.parentNode.insertBefore(tab, suspectsTab.nextSibling);
}

function removeNpcTab() {
  document.querySelector(".manila-tab-npc")?.remove();
}

function showHub() {
  removeNpcTab();
  leaveChat();
  activateTab("suspects");
}

function showChat() {
  activateTab("chat");
}

/* ── Initialize ─────────────────────────────────────────── */
function seedStartingEvidence() {
  let added = false;
  for (const se of STARTING_EVIDENCE) {
    const existing = evidence.find(e => e.id === se.id);
    if (existing) {
      // Migration: ensure textKey is set on older saved evidence
      if (!existing.textKey) existing.textKey = se.textKey;
      continue;
    }
    const meta = EVIDENCE_CATALOG[se.id];
    if (!meta) continue;
    evidence.unshift({
      id: se.id,
      label: t("evidence." + se.id + "_label") || meta.label,
      text: t(se.textKey),
      textKey: se.textKey,
      source: "crime-scene",
    });
    added = true;
  }
  if (added) saveState();
}

let briefingOpen = true; // default: open on first visit

async function init() {
  loadState();
  seedStartingEvidence();
  // Wait for cloud merge to finish (if any) before first render
  // so we always render with the latest cloud state
  if (getCloudMergePromise()) {
    await getCloudMergePromise().catch(() => {});
  }
  // Check isNewGame AFTER cloud merge — a returning user on a new device
  // will have no localStorage but WILL have a cloud save, so this avoids
  // a false-positive "new game" analytics event.
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
    getEvidence: () => evidence,
    getNpcs: () => npcs,
    portraitUrl,
    getDiscoveriesForEvidence,
    saveState,
  });

  // Try loading string board state from server
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
    // Returning player with active chat — go directly there
    titleCard.classList.add("hidden");
    hubScreen.classList.add("active");
    selectNpc(activeNpcId);
  } else if (!titleSeen && !hasConversations) {
    // First-time player — show title card, hub stays hidden until dismissed
    titleCard.classList.remove("hidden");
  } else {
    // Returning player — skip title card, show hub
    titleCard.classList.add("hidden");
    showHubOnCaseboard();
  }
}

function showHubOnCaseboard() {
  hubScreen.classList.add("active");
  activateTab("caseboard");
}

/* ── Render NPC Grid (5 + 4 staggered rows) ────────────── */
function renderNpcGrid() {
  npcGridEl.innerHTML = "";

  const row1 = document.createElement("div");
  row1.className = "npc-row";
  const row2 = document.createElement("div");
  row2.className = "npc-row";

  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];
    const meta = NPC_META[npc.npc_id] || { initials: "?" };
    const card = document.createElement("div");
    card.className = "npc-card";
    if (npc.npc_id === PARTNER_NPC_ID) card.classList.add("npc-card-partner");
    if (conversations[npc.npc_id]?.length) card.classList.add("has-talked");
    card.dataset.npcId = npc.npc_id;

    const portraitDiv = document.createElement("div");
    portraitDiv.className = "npc-card-portrait";
    const img = new Image();
    img.src = portraitUrl(npc.npc_id, "neutral");
    img.alt = npcDisplayName(npc.display_name);
    img.loading = "lazy";
    img.onerror = function() {
      this.parentElement.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;color:var(--text-faint);">${meta.initials}</div>`;
    };
    portraitDiv.appendChild(img);

    const infoDiv = document.createElement("div");
    infoDiv.className = "npc-card-info";
    infoDiv.innerHTML = `
      <div class="npc-card-name">${escapeHtml(npcDisplayName(npc.display_name))}</div>
      <div class="npc-card-role">${escapeHtml(npcRole(npc.npc_id))}</div>
    `;

    card.appendChild(portraitDiv);
    card.appendChild(infoDiv);

    // Discovery badge — shows exclamation when this NPC yielded unseen discoveries
    if (npcsWithNewDiscoveries.has(npc.npc_id)) {
      const badge = document.createElement("div");
      badge.className = "npc-card-discovery-badge";
      badge.textContent = "!";
      card.appendChild(badge);
    }

    card.addEventListener("click", () => selectNpc(npc.npc_id));

    // First 5 go to row 1, rest to row 2
    if (i < 5) {
      row1.appendChild(card);
    } else {
      row2.appendChild(card);
    }
  }

  npcGridEl.appendChild(row1);
  if (row2.children.length > 0) {
    npcGridEl.appendChild(row2);
  }

  // Accusation button below the NPC grid
  const accuseSection = document.createElement("div");
  accuseSection.className = "accuse-section";
  accuseSection.innerHTML = `<button id="hub-accuse-btn" data-i18n="sidebar.accuse">${t("sidebar.accuse")}</button>`;
  npcGridEl.appendChild(accuseSection);
  $("#hub-accuse-btn").addEventListener("click", openAccusationModal);
}

/* ── Select NPC ─────────────────────────────────────────── */
function selectNpc(npcId) {
  stopAudio();
  if (isVoiceMode()) exitVoiceMode();
  activeNpcId = npcId;
  const npc = npcs.find(n => n.npc_id === npcId);
  const displayName = npcDisplayName(npc?.display_name) || npcId;

  // Update portrait
  const expr = currentExpression[npcId] || "neutral";
  chatPortraitImg.src = portraitUrl(npcId, expr);
  chatPortraitImg.alt = displayName;

  // Update nameplate and topbar
  portraitName.textContent = displayName;
  portraitRole.textContent = npcRole(npcId);
  portraitStatus.textContent = "";
  // NPC name/role shown in portrait panel only (topbar has nav buttons)

  // Render conversation and interrogation pills
  renderMessages();
  updateInterrogationUI(npcId);

  // Preload all expressions for smooth transitions
  for (const ex of VALID_EXPRESSIONS) {
    const preload = new Image();
    preload.src = portraitUrl(npcId, ex);
  }

  // Inject NPC sub-tab and switch to chat panel
  addNpcTab(npcId);
  activateTab("chat");
  chatInput.focus();
  saveState();

  // Trigger chat-phase tutorial if pending
  if (getChatTutorialPending()) {
    if (npcId === PARTNER_NPC_ID) {
      // Partner has no gauges/info — show hint btn + input tutorial instead
      // Keep chatTutorialPending alive so gauges/info tutorial fires for suspects
      setTimeout(() => startTutorial("lila_chat"), 600);
    } else {
      setChatTutorialPending(false);
      // If partner's chat already showed the input bar, only show gauges + info
      const lilaAlreadySeen = localStorage.getItem(LILA_HINT_STORAGE_KEY);
      setTimeout(() => startTutorial(lilaAlreadySeen ? "chat_short" : "chat"), 600);
    }
  }
  // Partner hint button tutorial — show once on first partner chat visit
  else if (npcId === PARTNER_NPC_ID
           && typeof LILA_HINT_STORAGE_KEY !== "undefined"
           && !localStorage.getItem(LILA_HINT_STORAGE_KEY)) {
    setTimeout(() => startTutorial("lila"), 600);
  }
}

/* ── Render Messages ────────────────────────────────────── */
function renderMessages() {
  chatMessages.innerHTML = "";
  const history = conversations[activeNpcId] || [];

  if (history.length === 0) {
    // NPC bio blurb (hidden once the player sends a message)
    const bioKey = `dossier.${activeNpcId}.bio`;
    const bioText = t(bioKey);
    if (bioText !== bioKey) {
      const bio = document.createElement("div");
      bio.className = "chat-npc-bio";
      bio.id = "chat-npc-bio";
      bio.textContent = bioText;
      chatMessages.appendChild(bio);
    }

    const hint = document.createElement("div");
    hint.id = "chat-empty-hint";
    hint.className = "chat-empty-hint";
    if (activeNpcId === PARTNER_NPC_ID) {
      hint.textContent = t("chat.hint_partner");
    } else {
      const npcName = npcDisplayName(npcs.find(n => n.npc_id === activeNpcId)?.display_name) || "this person";
      hint.textContent = t("chat.hint", { name: npcName });
    }
    chatMessages.appendChild(hint);

    // Conversation starter buttons
    const startersDiv = document.createElement("div");
    startersDiv.className = "chat-starters";
    for (let n = 1; n <= 3; n++) {
      const key = `starter.${activeNpcId}.${n}`;
      const text = t(key);
      if (text === key) continue;
      const btn = document.createElement("button");
      btn.className = "chat-starter-btn";
      btn.textContent = text;
      btn.addEventListener("click", () => sendMessage(text));
      startersDiv.appendChild(btn);
    }
    if (startersDiv.children.length > 0) {
      chatMessages.appendChild(startersDiv);
    }
  }

  for (let i = 0; i < history.length; i++) {
    appendMessageBubble(history[i].role, history[i].content, i);
  }
  if (history.length > 0) scrollToBottom();
  else chatMessages.scrollTop = 0;
}

// Strip system tags (EXPRESSION, EVIDENCE and their Serbian variants) from display text
function stripSystemTags(text) {
  return text.replace(/\[(?:EXPRESSION|EVIDENCE|IZRAŽAJ|IZRAZAJ|IZRAZ|EVIDENCIJA|DOKAZ):\s*[^\]]*\]/gi, "").trim();
}

function appendMessageBubble(role, content, messageIndex) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  const senderLabel = role === "user" ? t("chat.sender_you") :
    (npcDisplayName(npcs.find(n => n.npc_id === activeNpcId)?.display_name) || "Suspect");

  const displayContent = role === "assistant" ? stripSystemTags(content) : content;
  let senderHtml = senderLabel;

  if (role === "assistant" && activeNpcId && messageIndex !== undefined) {
    const cacheKey = `${activeNpcId}:${messageIndex}`;
    senderHtml += `<button class="msg-audio-btn" data-cache-key="${cacheKey}"
              data-npc-id="${activeNpcId}" data-msg-index="${messageIndex}"
              title="${t('voice.replay_title')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      </button>`;
  }

  let html = `<div class="msg-sender">${senderHtml}</div>${escapeHtml(displayContent)}`;

  div.innerHTML = html;

  const replayBtn = div.querySelector(".msg-audio-btn");
  if (replayBtn) {
    replayBtn.addEventListener("click", () => {
      const npcId = replayBtn.dataset.npcId;
      const idx = parseInt(replayBtn.dataset.msgIndex, 10);
      const msgContent = (conversations[npcId] || [])[idx]?.content;
      if (msgContent) speakText(msgContent, npcId, replayBtn.dataset.cacheKey);
    });
  }

  // Restore discovery icon if this message had one
  if (role === "assistant" && activeNpcId && messageIndex !== undefined
      && (discoveryMessageIndices[activeNpcId] || []).includes(messageIndex)) {
    div.classList.add("msg-has-discovery");
    const icon = document.createElement("span");
    icon.className = "msg-discovery-icon";
    icon.title = t("toast.new_discovery");
    icon.textContent = "!";
    div.appendChild(icon);
  }

  chatMessages.appendChild(div);
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

/* ── Send Message ───────────────────────────────────────── */
async function sendMessage(overrideText, displayText) {
  const text = overrideText || chatInput.value.trim();
  if (!text || !activeNpcId || sending) return;
  const shownText = displayText || text; // what appears in the chat bubble

  sending = true;
  sendBtn.disabled = true;
  showCancelBtn();
  setChatAbortController(new AbortController());
  if (!overrideText) { chatInput.value = ""; autoResize(); }

  if (!conversations[activeNpcId]) conversations[activeNpcId] = [];

  // Remove empty-state bio, hint and starters
  const bio = document.getElementById("chat-npc-bio");
  if (bio) bio.remove();
  const hint = document.getElementById("chat-empty-hint");
  if (hint) hint.remove();
  const starters = chatMessages.querySelector(".chat-starters");
  if (starters) starters.remove();

  // Add user bubble (show friendly display text, store API text in history)
  conversations[activeNpcId].push({ role: "user", content: text });
  const userIdx = conversations[activeNpcId].length - 1;
  appendMessageBubble("user", shownText, userIdx);
  scrollToBottom();

  // Show typing indicator
  typingIndicator.classList.add("visible");
  chatMessages.appendChild(typingIndicator);
  scrollToBottom();
  portraitStatus.textContent = t("chat.status_responding");

  try {
    const historyForApi = conversations[activeNpcId].slice(0, -1);
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        npc_id: activeNpcId,
        message: text,
        history: historyForApi,
        language: window.currentLang || "en",
        pressure: (npcInterrogation[activeNpcId] || {}).pressure || 0,
        rapport: (npcInterrogation[activeNpcId] || {}).rapport ?? 25,
        peak_pressure: (npcInterrogation[activeNpcId] || {}).peak_pressure ??
                       (npcInterrogation[activeNpcId] || {}).pressure ?? 0,
        player_evidence_ids: evidence.map(e => e.id),
        player_discovery_ids: Object.values(discoveries).flat().map(d => d.id),
        session_id: gameId,
      }),
      signal: getChatAbortController()?.signal,
    });

    if (!res.ok) {
      let detail;
      try {
        const errBody = await res.json();
        detail = errBody.detail || `HTTP ${res.status}`;
      } catch (_) {
        const text = await res.text().catch(() => "");
        detail = text ? `HTTP ${res.status}: ${text.slice(0, 200)}` : `HTTP ${res.status} (no response body)`;
      }
      console.error(`[chat] Server error: ${res.status}`, detail);
      throw new Error(detail);
    }

    const data = await res.json();
    conversations[activeNpcId].push({ role: "assistant", content: data.reply });

    typingIndicator.classList.remove("visible");
    const assistantIdx = conversations[activeNpcId].length - 1;
    appendMessageBubble("assistant", data.reply, assistantIdx);
    scrollToBottom();

    // Auto-play TTS only in voice mode
    if (isVoiceMode()) {
      const cacheKey = `${activeNpcId}:${assistantIdx}`;
      speakText(data.reply, activeNpcId, cacheKey);
    }

    // Process evidence and discoveries
    detectEvidence(data.evidence_ids || [], activeNpcId);
    detectNewDiscoveries(data.discovery_ids || [], activeNpcId, data.discovery_summaries || {});

    // Show one-time subpoena toast when a suspect mentions it
    if (activeNpcId !== PARTNER_NPC_ID && !subpoenaToastShown &&
        /subpoena|court order|lawyer|not at liberty/i.test(data.reply)) {
      subpoenaToastShown = true;
      showDiscoveryToast(t("toast.subpoena"));
    }

    // Update expression
    if (data.expression) {
      setHeaderExpression(activeNpcId, data.expression);
    }

    // ── Detective's Intuition line (LLM-generated, after NPC reply) ──
    if (activeNpcId !== PARTNER_NPC_ID && data.intuition_line) {
      const intuitionEl = document.createElement("div");
      intuitionEl.className = "msg intuition";
      intuitionEl.innerHTML =
        `<div class="msg-sender">A Detective's Intuition</div>` +
        `<em>${escapeHtml(data.intuition_line)}</em>`;
      chatMessages.appendChild(intuitionEl);
      scrollToBottom();
    }

    // Update interrogation state
    if (data.pressure !== undefined) {
      npcInterrogation[activeNpcId] = {
        pressure: data.pressure,
        rapport: data.rapport,
        pressure_band: data.pressure_band || "calm",
        rapport_band: data.rapport_band || "cold",
        peak_pressure: data.peak_pressure ?? data.pressure,
      };
      updateInterrogationUI(activeNpcId);
    }
    checkEndgameTrigger();

  } catch (err) {
    typingIndicator.classList.remove("visible");
    // Silently ignore user-initiated cancellation
    if (err.name === "AbortError") {
      // Remove the pending user message from conversation
      conversations[activeNpcId].pop();
    } else {
      // Distinguish network errors from server errors
      const isNetwork = err instanceof TypeError && err.message.includes("fetch");
      const displayMsg = isNetwork
        ? "Cannot reach server — please try again."
        : err.message;
      console.error("[chat] Request failed:", err);
      const failedText = text;
      const errDiv = document.createElement("div");
      errDiv.style.cssText = "text-align:center; color:var(--danger); font-size:0.82rem; padding:0.5rem;";
      errDiv.textContent = t("chat.error", { message: displayMsg });
      const retryBtn = document.createElement("button");
      retryBtn.textContent = t("chat.retry") || "Retry";
      retryBtn.style.cssText = "margin-top:4px; padding:4px 12px; cursor:pointer; border:1px solid var(--danger); background:transparent; color:var(--danger); border-radius:4px; font-size:0.8rem;";
      retryBtn.addEventListener("click", () => {
        errDiv.remove();
        sendMessage(failedText);
      });
      errDiv.appendChild(document.createElement("br"));
      errDiv.appendChild(retryBtn);
      chatMessages.appendChild(errDiv);
      scrollToBottom();
      conversations[activeNpcId].pop();
    }
  }

  setChatAbortController(null);
  portraitStatus.textContent = "";
  sending = false;
  sendBtn.disabled = !chatInput.value.trim();
  hideCancelBtn();
  saveState();
}

/* ── Evidence Detection ─────────────────────────────────── */
function gradeArrest() {
  const found = Object.values(discoveries).flat().map(d => d.id);
  const hasMotive = CASE.culpritMotiveDiscoveries.some(d => found.includes(d));
  const hasOpportunity = CASE.culpritOpportunityDiscoveries.some(d => found.includes(d));
  if (hasMotive && hasOpportunity) return "slam_dunk";
  if (hasMotive || hasOpportunity) return "plea_deal";
  return "released";
}

/**
 * Process new discoveries from the server's discovery-level detection.
 * Each discovery fires independently with an LLM-generated summary.
 */
function detectNewDiscoveries(discoveryIds, npcId, discoverySummaries) {
  const newTexts = [];

  for (const did of discoveryIds) {
    const evidenceId = DISCOVERY_EVIDENCE_MAP[did];
    if (!evidenceId) continue;
    if (!discoveries[npcId]) discoveries[npcId] = [];
    if (discoveries[npcId].find(d => d.id === did)) continue;

    // Use LLM summary if available; fall back to pre-written i18n text
    const summary = discoverySummaries[did];
    const fallbackKey = "discovery." + did;
    const displayText = summary || t(fallbackKey);

    discoveries[npcId].push({
      id: did,
      text: summary || fallbackKey,  // Store literal summary or i18n key as fallback
      evidenceId: evidenceId,
      timestamp: Date.now(),
      isNew: true,
    });
    newTexts.push(displayText);
    trackEvent("discovery", { session_id: gameId, case_id: CASE.id, evidence_id: evidenceId, npc_id: npcId, discovery_id: did });
  }

  if (newTexts.length > 0) {
    for (const txt of newTexts) showDiscoveryToast(txt);
    npcsWithNewDiscoveries.add(npcId);
    markLastAssistantMessage();
    renderEvidence();
    flashCaseBoardTab();
  }
}

function markLastAssistantMessage() {
  const msgs = chatMessages.querySelectorAll(".msg.assistant");
  const last = msgs[msgs.length - 1];
  if (!last || last.querySelector(".msg-discovery-icon")) return;
  const icon = document.createElement("span");
  icon.className = "msg-discovery-icon";
  icon.title = t("toast.new_discovery");
  icon.textContent = "!";
  last.appendChild(icon);
  last.classList.add("msg-has-discovery");
  // Persist discovery index so icons survive re-renders and reloads
  if (activeNpcId) {
    const convLen = (conversations[activeNpcId] || []).length;
    const idx = convLen - 1;
    if (!discoveryMessageIndices[activeNpcId]) discoveryMessageIndices[activeNpcId] = [];
    if (!discoveryMessageIndices[activeNpcId].includes(idx)) {
      discoveryMessageIndices[activeNpcId].push(idx);
    }
  }
}

let unseenDiscoveryCount = 0;

function flashCaseBoardTab() {
  unseenDiscoveryCount++;
  // Flash both the hub caseboard tab and the chat-nav caseboard tab
  const tabs = document.querySelectorAll('.manila-tab[data-hub-tab="caseboard"]');
  tabs.forEach(tab => {
    tab.classList.add("tab-flash");
    setTimeout(() => tab.classList.remove("tab-flash"), 4000);
    // Add or update badge
    let badge = tab.querySelector(".tab-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "tab-badge";
      tab.appendChild(badge);
    }
    badge.textContent = unseenDiscoveryCount;
  });
}

function clearCaseBoardBadges() {
  unseenDiscoveryCount = 0;
  document.querySelectorAll('.manila-tab .tab-badge').forEach(b => b.remove());
  if (npcsWithNewDiscoveries.size > 0) {
    npcsWithNewDiscoveries.clear();
    renderNpcGrid();
  }
}

function showDiscoveryToast(text) {
  const container = document.getElementById("discovery-toast-container");
  const toast = document.createElement("div");
  toast.className = "discovery-toast";
  toast.innerHTML = `
    <div class="discovery-toast-icon">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </div>
    <div class="discovery-toast-body">
      <div class="discovery-toast-heading">${escapeHtml(t("toast.new_discovery"))}</div>
      <div class="discovery-toast-text">${escapeHtml(text)}</div>
    </div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hiding");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
  }, 4500);
}

/* ── NPC Discovery Badges ──────────────────────────────── */
const npcsWithNewDiscoveries = new Set();

function detectEvidence(evidenceIds, npcId) {
  const npcName = npcDisplayName(npcs.find(n => n.npc_id === npcId)?.display_name) || npcId;
  let found = false;

  for (const id of evidenceIds) {
    const meta = EVIDENCE_CATALOG[id];
    if (!meta) continue;

    if (!evidence.find(e => e.id === id)) {
      evidence.push({
        id: id,
        label: t("evidence." + id + "_label") || meta.label,
        text: t(npcId === PARTNER_NPC_ID ? "evidence.mentioned_by_partner" : "evidence.mentioned_by", { name: npcName }),
        textKey: npcId === PARTNER_NPC_ID ? "evidence.mentioned_by_partner" : "evidence.mentioned_by",
        source: npcId,
      });
      found = true;
    }
  }

  if (found) {
    renderEvidence();
  }
}

/* ── Render Evidence (Case Board) ────────────────────────── */
/** Find collected discoveries linked to an evidence ID. */
function getDiscoveriesForEvidence(evidenceId) {
  const results = [];
  for (const [npcId, discs] of Object.entries(discoveries)) {
    for (const d of discs) {
      if (d.evidenceId === evidenceId) {
        results.push({ ...d, npcId });
      }
    }
  }
  return results;
}

/** Render a single evidence item with its linked discoveries. */
function renderEvidenceItem(e) {
  const div = document.createElement("div");
  div.className = "clue-item";
  // Re-translate at render time for current language
  const label = t("evidence." + e.id + "_label") || e.label;
  let text = e.text;
  if (e.textKey) {
    if (e.textKey === "evidence.mentioned_by" || e.textKey === "evidence.mentioned_by_partner") {
      const npcName = npcDisplayName(npcs.find(n => n.npc_id === e.source)?.display_name) || e.source;
      const key = e.source === PARTNER_NPC_ID ? "evidence.mentioned_by_partner" : "evidence.mentioned_by";
      text = t(key, { name: npcName }) || text;
    } else {
      text = t(e.textKey) || text;
    }
  }
  let html = `<div class="clue-label">${escapeHtml(label)}</div>
    <div class="clue-text">${escapeHtml(text)}</div>`;

  const linkedDisc = getDiscoveriesForEvidence(e.id);
  if (linkedDisc.length > 0) {
    html += `<div class="clue-discoveries">`;
    for (const d of linkedDisc) {
      // t() returns the key as-is when not found, so literal summaries pass through
      const displayText = t(d.text);
      html += `<div class="clue-discovery-item">${escapeHtml(displayText)}</div>`;
    }
    html += `</div>`;
  }
  if (e.id === "keycard-logs") {
    html += `<button class="clue-view-logs-btn" onclick="window.__openKeycardModal()">${t("keycard.view_logs")}</button>`;
  }
  div.innerHTML = html;
  return div;
}

function renderEvidence() {
  cbEvidenceList.innerHTML = "";
  cbEvidenceEmpty.style.display = evidence.length ? "none" : "block";

  if (caseReadyPromptShown && evidence.length > 0) {
    // Grouped view with section headers
    for (const [groupKey, ids] of Object.entries(EVIDENCE_GROUPS)) {
      const groupEvidence = evidence.filter(e => ids.includes(e.id));
      if (groupEvidence.length === 0) continue;
      const header = document.createElement("div");
      header.className = "evidence-group-header";
      header.textContent = t("evidence.group_" + groupKey);
      cbEvidenceList.appendChild(header);
      for (const e of groupEvidence) cbEvidenceList.appendChild(renderEvidenceItem(e));
    }
    // Accusation CTA
    const cta = document.createElement("button");
    cta.className = "evidence-accuse-cta";
    cta.textContent = t("endgame.accuse_cta");
    cta.addEventListener("click", openAccusationModal);
    cbEvidenceList.appendChild(cta);
  } else {
    for (const e of evidence) cbEvidenceList.appendChild(renderEvidenceItem(e));
  }
}


/* ── Auto-resize textarea ───────────────────────────────── */
function autoResize() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
}

/* ── Accusation System ──────────────────────────────────── */
function openAccusationModal() {
  accusationTarget = null;
  confirmAccuse.disabled = true;
  suspectGrid.innerHTML = "";

  const suspects = npcs.filter(n => n.npc_id !== PARTNER_NPC_ID);
  for (const s of suspects) {
    const btn = document.createElement("div");
    btn.className = "suspect-option";
    const img = buildPortraitImg(s.npc_id, "neutral", 48);
    img.className = "suspect-portrait";
    btn.appendChild(img);
    btn.appendChild(document.createTextNode(npcDisplayName(s.display_name)));
    btn.dataset.npcId = s.npc_id;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".suspect-option").forEach(el => el.classList.remove("selected"));
      btn.classList.add("selected");
      accusationTarget = s.npc_id;
      confirmAccuse.disabled = false;
    });
    suspectGrid.appendChild(btn);
  }
  accusationModal.classList.add("visible");
}

function closeAccusationModal() {
  accusationModal.classList.remove("visible");
  accusationTarget = null;
}

function resolveAccusation() {
  if (!accusationTarget) return;
  const target = accusationTarget;
  closeAccusationModal();

  const correct = target === CULPRIT_ID;
  const accusedName = npcDisplayName(npcs.find(n => n.npc_id === target)?.display_name) || target;

  const interviewCount = Object.keys(conversations).filter(k => conversations[k].length > 0).length;

  if (correct) {
    const grade = gradeArrest();
    outcomeCard.className = "outcome-card " + grade.replace(/_/g, "-");
    trackEvent("arrest", {
      session_id: gameId,
      case_id: CASE.id,
      target_npc_id: target,
      correct: true,
      grade,
      evidence_count: evidence.length,
      interview_count: interviewCount,
    });
    outcomeTitle.textContent = t("outcome." + grade + "_title");
    outcomeText.innerHTML = t("outcome." + grade + "_text", {
      name: escapeHtml(accusedName),
      evidenceCount: evidence.length,
      interviewCount: interviewCount,
    });
  } else {
    outcomeCard.className = "outcome-card wrong";
    trackEvent("arrest", {
      session_id: gameId,
      case_id: CASE.id,
      target_npc_id: target,
      correct: false,
      grade: "wrong",
      evidence_count: evidence.length,
      interview_count: interviewCount,
    });
    outcomeTitle.textContent = t("outcome.wrong_title");
    outcomeText.innerHTML = t("outcome.wrong_text", { name: escapeHtml(accusedName) });
  }
  outcomeScreen.classList.add("visible");
}

/* ── Event Listeners ────────────────────────────────────── */
// Intro screen removed — game starts on Case Board directly

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

/* ── Cancel button: show/hide + abort logic ──────────── */
function showCancelBtn() {
  chatInputBar.classList.add("cancellable");
}
function hideCancelBtn() {
  chatInputBar.classList.remove("cancellable");
}
function cancelResponse() {
  // Abort in-flight chat request
  const ctrl = getChatAbortController();
  if (ctrl) { ctrl.abort(); setChatAbortController(null); }
  // Abort in-flight TTS + stop any playing audio
  stopAudio();
  // Reset UI state
  typingIndicator.classList.remove("visible");
  portraitStatus.textContent = "";
  sending = false;
  sendBtn.disabled = !chatInput.value.trim();
  hideCancelBtn();
  // Exit voice-mode waiting state (don't auto-restart recording)
  if (isVoiceMode()) {
    document.querySelector("#mic-btn").classList.remove("waiting");
    exitVoiceMode();
  }
}
cancelBtn.addEventListener("click", cancelResponse);

function leaveChat() {
  cancelResponse();
  if (isVoiceMode()) exitVoiceMode();
  activeNpcId = null;
  saveState();
}

// Hub manila folder tabs — unified handler
document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(tab => {
  tab.addEventListener("click", () => {
    const name = tab.dataset.hubTab;
    // Clicking "Persons of Interest" while chatting leaves the chat
    if (activeNpcId && name === "suspects") {
      leaveChat();
      removeNpcTab();
    }
    activateTab(name);
  });
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

/* ── Portrait Info Button (bio tooltip) ──────────────── */
const portraitInfoBtn = $("#portrait-info-btn");
const bioTooltipEl = $("#portrait-bio-tooltip");
const portraitFrameEl = document.querySelector(".portrait-frame");

function showBioTooltip() {
  if (!activeNpcId) return;
  const bioKey = `dossier.${activeNpcId}.bio`;
  const bioText = t(bioKey);
  bioTooltipEl.textContent = bioText !== bioKey ? bioText : "";
  bioTooltipEl.classList.add("visible");
}
function hideBioTooltip() {
  bioTooltipEl.classList.remove("visible");
}

// Desktop: hover to show
portraitInfoBtn.addEventListener("mouseenter", showBioTooltip);
portraitFrameEl.addEventListener("mouseleave", hideBioTooltip);
// Mobile: tap to toggle
portraitInfoBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (bioTooltipEl.classList.contains("visible")) {
    hideBioTooltip();
  } else {
    showBioTooltip();
  }
});
// Tap tooltip to dismiss
bioTooltipEl.addEventListener("click", hideBioTooltip);

chatInput.addEventListener("input", () => {
  autoResize();
  sendBtn.disabled = !chatInput.value.trim() || sending;
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", () => sendMessage());

// Partner hint button — sends detailed prompt but shows a casual message in chat
document.getElementById("lila-hint-btn").addEventListener("click", () => {
  if (sending || activeNpcId !== PARTNER_NPC_ID) return;
  const displayKey = CASE.hintDisplayKeys[Math.floor(Math.random() * CASE.hintDisplayKeys.length)];
  sendMessage(t("chat.hint_prompt"), t(displayKey));
});

cancelAccuse.addEventListener("click", closeAccusationModal);
confirmAccuse.addEventListener("click", resolveAccusation);

restartBtn.addEventListener("click", async () => {
  restartBtn.disabled = true;
  await clearState();
  briefingOpen = true;
  outcomeScreen.classList.remove("visible");
  removeNpcTab();
  hubScreen.classList.remove("active");
  chatMessages.innerHTML = "";
  await init();
  restartBtn.disabled = false;
});

// Close modal on backdrop click
addModalCloseOnClickOutside(accusationModal, closeAccusationModal);

/* ── Case-Ready Modal (endgame trigger) ──────────────────── */
const caseReadyModal = $("#case-ready-modal");
$("#case-ready-review").addEventListener("click", () => {
  caseReadyModal.classList.remove("visible");
  leaveChat();
  removeNpcTab();
  activateTab("caseboard");
});
$("#case-ready-accuse").addEventListener("click", () => {
  caseReadyModal.classList.remove("visible");
  openAccusationModal();
});
$("#case-ready-continue").addEventListener("click", () => {
  caseReadyModal.classList.remove("visible");
});
addModalCloseOnClickOutside(caseReadyModal, () => caseReadyModal.classList.remove("visible"));

/* ── Keycard Logs Terminal Modal ────────────────────────── */
let keycardLogsCache = null;
const keycardModal = document.getElementById("keycard-modal");
const keycardBody  = document.getElementById("keycard-terminal-body");

function fmtTime(ts) {
  return ts.substring(11, 19);
}

function padEnd(s, len) {
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

function renderKeycardLogs(logs) {
  let html = `<div class="kc-header">
    <span>${t("keycard.col_time")}</span><span>${t("keycard.col_zone")}</span><span>${t("keycard.col_card")}</span><span>${t("keycard.col_holder")}</span><span>${t("keycard.col_dir")}</span><span>${t("keycard.col_status")}</span>
  </div>`;
  for (const l of logs) {
    if (l.card_id === "SYSTEM") {
      const isOff = l.access === "system_offline";
      const icon = isOff ? "⚠" : "✓";
      const cls = isOff ? "offline" : "restored";
      const sysText = isOff ? t("keycard.system_offline") : t("keycard.system_restored");
      html += `<div class="kc-system ${cls}">
        <span class="kc-system-icon">${icon}</span>
        <span class="kc-system-time">${fmtTime(l.timestamp)}</span>  ${sysText}
      </div>`;
    } else {
      const dirCls = l.direction === "entry" ? "entry" : "exit";
      const dirLabel = l.direction === "entry" ? t("keycard.entry") : t("keycard.exit");
      const statusLabel = t("keycard.granted");
      const zoneLabel = t("keycard.zone." + l.zone) || l.zone;
      html += `<div class="kc-row">
        <span class="kc-time">${fmtTime(l.timestamp)}</span>
        <span class="kc-zone">${zoneLabel}</span>
        <span class="kc-card">${l.card_id}</span>
        <span class="kc-holder">${l.card_holder}</span>
        <span class="kc-dir ${dirCls}">${dirLabel}</span>
        <span class="kc-access">${statusLabel}</span>
      </div>`;
    }
  }
  keycardBody.innerHTML = html;
}

window.__openKeycardModal = async function() {
  keycardModal.classList.add("visible");
  // Re-translate terminal header for current language
  document.querySelector(".keycard-terminal-title").textContent = t("keycard.title");
  document.querySelector(".keycard-terminal-info").textContent = t("keycard.subtitle");
  if (keycardLogsCache) {
    renderKeycardLogs(keycardLogsCache);
    return;
  }
  keycardBody.innerHTML = '<div style="padding:2rem;text-align:center;color:rgba(120,220,100,0.4);font-family:var(--font-mono);font-size:0.75rem;">' + t("keycard.loading") + '</div>';
  try {
    const resp = await fetch(CASE.keycardLogsPath);
    keycardLogsCache = await resp.json();
    renderKeycardLogs(keycardLogsCache);
  } catch (err) {
    keycardBody.innerHTML = '<div style="padding:2rem;text-align:center;color:rgba(220,60,40,0.8);font-family:var(--font-mono);font-size:0.75rem;">' + t("keycard.error") + '</div>';
  }
};

function closeKeycardModal() {
  keycardModal.classList.remove("visible");
}

document.getElementById("keycard-modal-close").addEventListener("click", closeKeycardModal);
addModalCloseOnClickOutside(keycardModal, closeKeycardModal);

/* ── Boot ───────────────────────────────────────────────── */
initSettings({
  clearState,
  seedStartingEvidence,
  removeNpcTab,
  renderEvidence,
  renderNpcGrid,
  renderMessages,
  activateTab,
  getActiveNpcId: () => activeNpcId,
  getSending: () => sending,
  getGameId: () => gameId,
  npcRole,
  getHubScreen: () => hubScreen,
  getChatMessages: () => chatMessages,
  getPortraitRole: () => portraitRole,
  getPortraitStatus: () => portraitStatus,
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
  getSending: () => sending,
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
// Store promise so init() can await it before first render
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

// Flush cloud save when tab becomes hidden — use keepalive fetch for reliability
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && getAuthUser()?.access_token && isCloudSavePending()) {
    try {
      const stateObj = buildStateObject();
      apiFetch(`${API_BASE}/api/state/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: stateObj }),
        keepalive: true, // survives page hide
      }).then(() => {}).catch(() => {});
    } catch {}
  }
});
// beforeunload: use sendBeacon as last resort (guaranteed to be queued)
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
  // If Supabase configured and user not logged in, show auth prompt
  if (isSupabaseConfigured() && !getAuthUser()) {
    titleCard.classList.add("dismissed");
    localStorage.setItem(TITLE_STORAGE_KEY, "1");
    setTimeout(() => {
      titleCard.classList.add("hidden");
      document.getElementById("auth-prompt").classList.remove("hidden");
    }, 500);
    return;
  }
  // Already logged in or no Supabase — go straight to game
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
  // Start tutorial on first visit (no existing conversations = new player)
  // Only if title card was already seen (returning player who hasn't done tutorial)
  const hasConversations = Object.keys(conversations).length > 0;
  const titleSeen = localStorage.getItem(TITLE_STORAGE_KEY);
  if (titleSeen && !isTutorialDone() && !hasConversations) {
    setChatTutorialPending(true); // will fire when NPC selected
    setTimeout(() => startTutorial("hub"), 600);
  }
});
