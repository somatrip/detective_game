/* ================================================================
   Chat Module
   Extracted from main.js — manages NPC chat UI, message rendering,
   send/receive flow, portrait expressions, keycard logs modal,
   and case-ready modal.
   ================================================================ */
import { escapeHtml, npcDisplayName, addModalCloseOnClickOutside } from "./utils.js";
import { openAccusationModal } from "./accusation.js";

const API_BASE = window.location.origin;
const t = (...args) => window.t(...args);

// ── CASE constants (from window.CASE) ───────────────────────────
function _case() { return window.CASE; }

// ── Module state ────────────────────────────────────────────────
const VALID_EXPRESSIONS = ["neutral", "guarded", "distressed", "angry", "contemplative", "smirking"];
let currentExpression = {};  // npcId → last known expression
let sending = false;
let subpoenaToastShown = false;
let keycardLogsCache = null;

// ── DOM refs (resolved lazily or at init time) ──────────────────
let chatLayout, chatPortraitImg, portraitName, portraitRole, portraitStatus;
let chatMessages, typingIndicator, chatInputBar, chatInput, sendBtn, cancelBtn;

// ── Callbacks (set via initChat) ────────────────────────────────
let _cb = {};

// ── Public Accessors ────────────────────────────────────────────
export function getSending() { return sending; }
export function setSending(val) { sending = val; }
export function getActiveNpcId() { return _cb.getActiveNpcId(); }

// ── Portrait / Expression Helpers ───────────────────────────────
export function portraitUrl(npcId, expression = "neutral") {
  return `${_case().portraitBasePath}/${npcId}/${expression}.webp`;
}

/** Build an <img> element for a portrait, falling back to initials on error. */
export function buildPortraitImg(npcId, expression = "neutral", size = 36) {
  const NPC_META = _case().npcMeta;
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
  if (npcId === _cb.getActiveNpcId() && chatPortraitImg) {
    chatPortraitImg.src = portraitUrl(npcId, expression);
  }
}

export function npcRole(npcId) {
  return t("role." + npcId);
}

/** Update the interrogation icon gauges for the active NPC. */
function updateInterrogationUI(npcId) {
  const PARTNER_NPC_ID = _case().partnerNpcId;
  const gaugeP = document.getElementById("gauge-pressure");
  const gaugeR = document.getElementById("gauge-rapport");
  const iconP  = document.getElementById("gauge-pressure-icon");
  const iconR  = document.getElementById("gauge-rapport-icon");
  if (!gaugeP || !gaugeR) return;

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

  const state = _cb.getNpcInterrogation()[npcId] || { pressure_band: "calm", rapport_band: "neutral" };

  gaugeP.className = "gauge gauge-pressure " + state.pressure_band;
  gaugeR.className = "gauge gauge-rapport " + state.rapport_band;

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

// ── Select NPC ──────────────────────────────────────────────────
export function selectNpc(npcId) {
  const PARTNER_NPC_ID = _case().partnerNpcId;
  _cb.stopAudio();
  if (_cb.isVoiceMode()) _cb.exitVoiceMode();
  _cb.setActiveNpcId(npcId);
  const npcs = _cb.getNpcs();
  const npc = npcs.find(n => n.npc_id === npcId);
  const displayName = npcDisplayName(npc?.display_name) || npcId;

  // Update portrait
  const expr = currentExpression[npcId] || "neutral";
  chatPortraitImg.src = portraitUrl(npcId, expr);
  chatPortraitImg.alt = displayName;

  // Update nameplate
  portraitName.textContent = displayName;
  portraitRole.textContent = npcRole(npcId);
  portraitStatus.textContent = "";

  // Render conversation and interrogation pills
  renderMessages();
  updateInterrogationUI(npcId);

  // Preload all expressions for smooth transitions
  for (const ex of VALID_EXPRESSIONS) {
    const preload = new Image();
    preload.src = portraitUrl(npcId, ex);
  }

  // Inject NPC sub-tab and switch to chat panel
  _cb.addNpcTab(npcId);
  _cb.activateTab("chat");
  chatInput.focus();
  _cb.saveState();

  // Trigger chat-phase tutorial if pending
  if (_cb.getChatTutorialPending()) {
    if (npcId === PARTNER_NPC_ID) {
      setTimeout(() => _cb.startTutorial("lila_chat"), 600);
    } else {
      _cb.setChatTutorialPending(false);
      const lilaAlreadySeen = localStorage.getItem(_cb.LILA_HINT_STORAGE_KEY);
      setTimeout(() => _cb.startTutorial(lilaAlreadySeen ? "chat_short" : "chat"), 600);
    }
  }
  // Partner hint button tutorial — show once on first partner chat visit
  else if (npcId === PARTNER_NPC_ID
           && typeof _cb.LILA_HINT_STORAGE_KEY !== "undefined"
           && !localStorage.getItem(_cb.LILA_HINT_STORAGE_KEY)) {
    setTimeout(() => _cb.startTutorial("lila"), 600);
  }
}

// ── Render Messages ─────────────────────────────────────────────
export function renderMessages() {
  const activeNpcId = _cb.getActiveNpcId();
  const conversations = _cb.getConversations();
  const PARTNER_NPC_ID = _case().partnerNpcId;
  const npcs = _cb.getNpcs();
  chatMessages.innerHTML = "";
  const history = conversations[activeNpcId] || [];

  if (history.length === 0) {
    // NPC bio blurb
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

// Strip system tags from display text
function stripSystemTags(text) {
  return text.replace(/\[(?:EXPRESSION|EVIDENCE|IZRAŽAJ|IZRAZAJ|IZRAZ|EVIDENCIJA|DOKAZ):\s*[^\]]*\]/gi, "").trim();
}

function appendMessageBubble(role, content, messageIndex) {
  const activeNpcId = _cb.getActiveNpcId();
  const conversations = _cb.getConversations();
  const npcs = _cb.getNpcs();
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
      if (msgContent) _cb.speakText(msgContent, npcId, replayBtn.dataset.cacheKey);
    });
  }

  // Restore discovery icon if this message had one
  if (role === "assistant" && activeNpcId && messageIndex !== undefined
      && (_cb.getDiscoveryMessageIndices()[activeNpcId] || []).includes(messageIndex)) {
    div.classList.add("msg-has-discovery");
    const icon = document.createElement("span");
    icon.className = "msg-discovery-icon";
    icon.title = t("toast.new_discovery");
    icon.textContent = "!";
    div.appendChild(icon);
  }

  chatMessages.appendChild(div);
}

export function scrollToBottom() {
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ── Send Message ────────────────────────────────────────────────
export async function sendMessage(overrideText, displayText) {
  const activeNpcId = _cb.getActiveNpcId();
  const conversations = _cb.getConversations();
  const PARTNER_NPC_ID = _case().partnerNpcId;
  const npcInterrogation = _cb.getNpcInterrogation();

  const text = overrideText || chatInput.value.trim();
  if (!text || !activeNpcId || sending) return;
  const shownText = displayText || text;

  sending = true;
  sendBtn.disabled = true;
  showCancelBtn();
  _cb.setChatAbortController(new AbortController());
  if (!overrideText) { chatInput.value = ""; autoResize(); }

  if (!conversations[activeNpcId]) _cb.setConversation(activeNpcId, []);

  // Remove empty-state bio, hint and starters
  const bio = document.getElementById("chat-npc-bio");
  if (bio) bio.remove();
  const hint = document.getElementById("chat-empty-hint");
  if (hint) hint.remove();
  const starters = chatMessages.querySelector(".chat-starters");
  if (starters) starters.remove();

  // Add user bubble
  const conv = _cb.getConversations()[activeNpcId];
  conv.push({ role: "user", content: text });
  const userIdx = conv.length - 1;
  appendMessageBubble("user", shownText, userIdx);
  scrollToBottom();

  // Show typing indicator
  typingIndicator.classList.add("visible");
  chatMessages.appendChild(typingIndicator);
  scrollToBottom();
  portraitStatus.textContent = t("chat.status_responding");

  try {
    const historyForApi = conv.slice(0, -1);
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
        player_evidence_ids: _cb.getEvidence().map(e => e.id),
        player_discovery_ids: Object.values(_cb.getDiscoveries()).flat().map(d => d.id),
        session_id: _cb.getGameId(),
      }),
      signal: _cb.getChatAbortController()?.signal,
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
    conv.push({ role: "assistant", content: data.reply });

    typingIndicator.classList.remove("visible");
    const assistantIdx = conv.length - 1;
    appendMessageBubble("assistant", data.reply, assistantIdx);
    scrollToBottom();

    // Auto-play TTS only in voice mode
    if (_cb.isVoiceMode()) {
      const cacheKey = `${activeNpcId}:${assistantIdx}`;
      _cb.speakText(data.reply, activeNpcId, cacheKey);
    }

    // Process evidence and discoveries
    _cb.detectEvidence(data.evidence_ids || [], activeNpcId);
    _cb.detectNewDiscoveries(data.discovery_ids || [], activeNpcId, data.discovery_summaries || {});

    // Show one-time subpoena toast
    if (activeNpcId !== PARTNER_NPC_ID && !subpoenaToastShown &&
        /subpoena|court order|lawyer|not at liberty/i.test(data.reply)) {
      subpoenaToastShown = true;
      _cb.showDiscoveryToast(t("toast.subpoena"));
    }

    // Update expression
    if (data.expression) {
      setHeaderExpression(activeNpcId, data.expression);
    }

    // Detective's Intuition line
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
      _cb.setNpcInterrogation(activeNpcId, {
        pressure: data.pressure,
        rapport: data.rapport,
        pressure_band: data.pressure_band || "calm",
        rapport_band: data.rapport_band || "cold",
        peak_pressure: data.peak_pressure ?? data.pressure,
      });
      updateInterrogationUI(activeNpcId);
    }
    _cb.checkEndgameTrigger();

  } catch (err) {
    typingIndicator.classList.remove("visible");
    if (err.name === "AbortError") {
      conv.pop();
    } else {
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
      conv.pop();
    }
  }

  _cb.setChatAbortController(null);
  portraitStatus.textContent = "";
  sending = false;
  sendBtn.disabled = !chatInput.value.trim();
  hideCancelBtn();
  _cb.saveState();
}

// ── Auto-resize textarea ────────────────────────────────────────
export function autoResize() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
}

// ── Cancel / Leave ──────────────────────────────────────────────
export function showCancelBtn() {
  chatInputBar.classList.add("cancellable");
}

export function hideCancelBtn() {
  chatInputBar.classList.remove("cancellable");
}

export function cancelResponse() {
  const ctrl = _cb.getChatAbortController();
  if (ctrl) { ctrl.abort(); _cb.setChatAbortController(null); }
  _cb.stopAudio();
  typingIndicator.classList.remove("visible");
  portraitStatus.textContent = "";
  sending = false;
  sendBtn.disabled = !chatInput.value.trim();
  hideCancelBtn();
  if (_cb.isVoiceMode()) {
    document.querySelector("#mic-btn").classList.remove("waiting");
    _cb.exitVoiceMode();
  }
}

export function leaveChat() {
  cancelResponse();
  if (_cb.isVoiceMode()) _cb.exitVoiceMode();
  _cb.setActiveNpcId(null);
  _cb.saveState();
}

// ── Portrait Info (bio tooltip) ─────────────────────────────────
function showBioTooltip() {
  const activeNpcId = _cb.getActiveNpcId();
  const bioTooltipEl = document.querySelector("#portrait-bio-tooltip");
  if (!activeNpcId) return;
  const bioKey = `dossier.${activeNpcId}.bio`;
  const bioText = t(bioKey);
  bioTooltipEl.textContent = bioText !== bioKey ? bioText : "";
  bioTooltipEl.classList.add("visible");
}

function hideBioTooltip() {
  const bioTooltipEl = document.querySelector("#portrait-bio-tooltip");
  bioTooltipEl.classList.remove("visible");
}

// ── Keycard Logs Terminal Modal ─────────────────────────────────
function fmtTime(ts) {
  return ts.substring(11, 19);
}

function renderKeycardLogs(logs) {
  const keycardBody = document.getElementById("keycard-terminal-body");
  let html = `<div class="kc-header">
    <span>${t("keycard.col_time")}</span><span>${t("keycard.col_zone")}</span><span>${t("keycard.col_card")}</span><span>${t("keycard.col_holder")}</span><span>${t("keycard.col_dir")}</span><span>${t("keycard.col_status")}</span>
  </div>`;
  for (const l of logs) {
    if (l.card_id === "SYSTEM") {
      const isOff = l.access === "system_offline";
      const icon = isOff ? "\u26A0" : "\u2713";
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

function closeKeycardModal() {
  document.getElementById("keycard-modal").classList.remove("visible");
}

// ── Init ────────────────────────────────────────────────────────
/**
 * Wire up all chat event listeners. Call once during boot.
 */
export function initChat(callbacks) {
  _cb = callbacks;

  // Resolve DOM refs
  chatLayout      = document.querySelector("#hub-chat .chat-layout");
  chatPortraitImg = document.querySelector("#chat-portrait-img");
  portraitName    = document.querySelector("#portrait-name");
  portraitRole    = document.querySelector("#portrait-role");
  portraitStatus  = document.querySelector("#portrait-status");
  chatMessages    = document.querySelector("#chat-messages");
  typingIndicator = document.querySelector("#typing-indicator");
  chatInputBar    = document.querySelector("#chat-input-bar");
  chatInput       = document.querySelector("#chat-input");
  sendBtn         = document.querySelector("#send-btn");
  cancelBtn       = document.querySelector("#cancel-btn");

  // Chat input events
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

  // Cancel button
  cancelBtn.addEventListener("click", cancelResponse);

  // Partner hint button
  document.getElementById("lila-hint-btn").addEventListener("click", () => {
    const PARTNER_NPC_ID = _case().partnerNpcId;
    if (sending || _cb.getActiveNpcId() !== PARTNER_NPC_ID) return;
    const CASE = _case();
    const displayKey = CASE.hintDisplayKeys[Math.floor(Math.random() * CASE.hintDisplayKeys.length)];
    sendMessage(t("chat.hint_prompt"), t(displayKey));
  });

  // Portrait info button (bio tooltip)
  const portraitInfoBtn = document.querySelector("#portrait-info-btn");
  const bioTooltipEl = document.querySelector("#portrait-bio-tooltip");
  const portraitFrameEl = document.querySelector(".portrait-frame");

  portraitInfoBtn.addEventListener("mouseenter", showBioTooltip);
  portraitFrameEl.addEventListener("mouseleave", hideBioTooltip);
  portraitInfoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (bioTooltipEl.classList.contains("visible")) {
      hideBioTooltip();
    } else {
      showBioTooltip();
    }
  });
  bioTooltipEl.addEventListener("click", hideBioTooltip);

  // Case-ready modal
  const caseReadyModal = document.querySelector("#case-ready-modal");
  document.querySelector("#case-ready-review").addEventListener("click", () => {
    caseReadyModal.classList.remove("visible");
    leaveChat();
    _cb.removeNpcTab();
    _cb.activateTab("caseboard");
  });
  document.querySelector("#case-ready-accuse").addEventListener("click", () => {
    caseReadyModal.classList.remove("visible");
    openAccusationModal();
  });
  document.querySelector("#case-ready-continue").addEventListener("click", () => {
    caseReadyModal.classList.remove("visible");
  });
  addModalCloseOnClickOutside(caseReadyModal, () => caseReadyModal.classList.remove("visible"));

  // Keycard logs modal
  const keycardModal = document.getElementById("keycard-modal");
  const keycardBody  = document.getElementById("keycard-terminal-body");

  window.__openKeycardModal = async function() {
    keycardModal.classList.add("visible");
    document.querySelector(".keycard-terminal-title").textContent = t("keycard.title");
    document.querySelector(".keycard-terminal-info").textContent = t("keycard.subtitle");
    if (keycardLogsCache) {
      renderKeycardLogs(keycardLogsCache);
      return;
    }
    keycardBody.innerHTML = '<div style="padding:2rem;text-align:center;color:rgba(120,220,100,0.4);font-family:var(--font-mono);font-size:0.75rem;">' + t("keycard.loading") + '</div>';
    try {
      const resp = await fetch(_case().keycardLogsPath);
      keycardLogsCache = await resp.json();
      renderKeycardLogs(keycardLogsCache);
    } catch (err) {
      keycardBody.innerHTML = '<div style="padding:2rem;text-align:center;color:rgba(220,60,40,0.8);font-family:var(--font-mono);font-size:0.75rem;">' + t("keycard.error") + '</div>';
    }
  };

  document.getElementById("keycard-modal-close").addEventListener("click", closeKeycardModal);
  addModalCloseOnClickOutside(keycardModal, closeKeycardModal);
}
