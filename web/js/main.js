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
  initEvidence,
  seedStartingEvidence, checkEndgameTrigger,
  gradeArrest, detectEvidence, detectNewDiscoveries,
  renderEvidence, getDiscoveriesForEvidence,
  flashCaseBoardTab, clearCaseBoardBadges,
  showDiscoveryToast,
  getEvidence, setEvidence,
  getDiscoveries, setDiscoveries,
  getDiscoveryMessageIndices, setDiscoveryMessageIndices,
  getNpcsWithNewDiscoveries,
  isCaseReadyPromptShown, setCaseReadyPromptShown,
  getUnseenDiscoveryCount,
} from "./evidence.js";

const CASE = window.CASE;
const NPC_META = CASE.npcMeta;
// Evidence constants moved to evidence.js (reads from window.CASE directly)
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

// checkEndgameTrigger → evidence.js

/* ── State ──────────────────────────────────────────────── */
let npcs = [];
let activeNpcId = null;
let conversations = {};
// evidence, discoveries, discoveryMessageIndices → evidence.js (use getters/setters)
let npcInterrogation = {};   // npc_id → { pressure, rapport, pressure_band, rapport_band }
let playerNotes = "";
// caseReadyPromptShown → evidence.js (use getter/setter)
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

// Case Board (hub) — evidence list DOM refs moved to evidence.js

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
  setEvidence([]);
  setDiscoveries({});
  npcInterrogation = {};
  setDiscoveryMessageIndices({});
  playerNotes = "";
  setCaseReadyPromptShown(false);
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
// seedStartingEvidence → evidence.js

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
    getEvidence,
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
    if (getNpcsWithNewDiscoveries().has(npc.npc_id)) {
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
      && (getDiscoveryMessageIndices()[activeNpcId] || []).includes(messageIndex)) {
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
        player_evidence_ids: getEvidence().map(e => e.id),
        player_discovery_ids: Object.values(getDiscoveries()).flat().map(d => d.id),
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

// Evidence Detection, Discovery, and Rendering → evidence.js


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
      evidence_count: getEvidence().length,
      interview_count: interviewCount,
    });
    outcomeTitle.textContent = t("outcome." + grade + "_title");
    outcomeText.innerHTML = t("outcome." + grade + "_text", {
      name: escapeHtml(accusedName),
      evidenceCount: getEvidence().length,
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
      evidence_count: getEvidence().length,
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
initEvidence({
  getConversations: () => conversations,
  getNpcInterrogation: () => npcInterrogation,
  saveState,
  renderStringBoard,
  renderNpcGrid,
  getActiveNpcId: () => activeNpcId,
  getChatMessages: () => chatMessages,
  openAccusationModal,
  trackEvent,
  getGameId: () => gameId,
  getNpcs: () => npcs,
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
