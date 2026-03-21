/* ================================================================
   Evidence & Discovery Module
   Extracted from main.js — manages evidence collection, discovery
   detection, rendering, and endgame trigger.
   ================================================================ */
import { escapeHtml, npcDisplayName, t } from "./utils.js";

// ── CASE constants (from window.CASE) ───────────────────────────
function _case() { return window.CASE; }

// ── Module state ────────────────────────────────────────────────
let evidence = [];
let discoveries = {};
let discoveryMessageIndices = {};
let caseReadyPromptShown = false;
let unseenDiscoveryCount = 0;
const npcsWithNewDiscoveries = new Set();

// ── Callbacks (set via initEvidence) ────────────────────────────
let _cb = {};

export function initEvidence(callbacks) {
  _cb = callbacks;
}

// ── Getters / Setters ───────────────────────────────────────────
export function getEvidence() { return evidence; }
export function setEvidence(arr) { evidence = arr; }
export function getDiscoveries() { return discoveries; }
export function setDiscoveries(obj) { discoveries = obj; }
export function getDiscoveryMessageIndices() { return discoveryMessageIndices; }
export function setDiscoveryMessageIndices(obj) { discoveryMessageIndices = obj; }
export function getNpcsWithNewDiscoveries() { return npcsWithNewDiscoveries; }
export function isCaseReadyPromptShown() { return caseReadyPromptShown; }
export function setCaseReadyPromptShown(val) { caseReadyPromptShown = val; }
export function getUnseenDiscoveryCount() { return unseenDiscoveryCount; }

// ── Seed Starting Evidence ──────────────────────────────────────
export function seedStartingEvidence() {
  const STARTING_EVIDENCE = _case().startingEvidence;
  const EVIDENCE_CATALOG = _case().evidenceCatalog;
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
  if (added) _cb.saveState();
}

// ── Endgame Trigger ─────────────────────────────────────────────
export function checkEndgameTrigger() {
  if (caseReadyPromptShown) return;
  const CANONICAL_EVIDENCE = _case().canonicalEvidence;
  const collectedIds = evidence.map(e => e.id);
  if (!CANONICAL_EVIDENCE.every(id => collectedIds.includes(id))) return;
  caseReadyPromptShown = true;
  _cb.saveState();
  document.getElementById("case-ready-modal").classList.add("visible");
}

// ── Grade Arrest ────────────────────────────────────────────────
export function gradeArrest() {
  const found = Object.values(discoveries).flat().map(d => d.id);
  const hasMotive = _case().culpritMotiveDiscoveries.some(d => found.includes(d));
  const hasOpportunity = _case().culpritOpportunityDiscoveries.some(d => found.includes(d));
  if (hasMotive && hasOpportunity) return "slam_dunk";
  if (hasMotive || hasOpportunity) return "plea_deal";
  return "released";
}

// ── Discovery Detection ─────────────────────────────────────────
export function detectNewDiscoveries(discoveryIds, npcId, discoverySummaries) {
  const DISCOVERY_EVIDENCE_MAP = _case().discoveryEvidenceMap;
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
    const gameId = _cb.getGameId ? _cb.getGameId() : undefined;
    _cb.trackEvent("discovery", { session_id: gameId, case_id: _case().id, evidence_id: evidenceId, npc_id: npcId, discovery_id: did });
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
  const chatMsgs = _cb.getChatMessages();
  if (!chatMsgs) return;
  const msgs = chatMsgs.querySelectorAll(".msg.assistant");
  const last = msgs[msgs.length - 1];
  if (!last || last.querySelector(".msg-discovery-icon")) return;
  const icon = document.createElement("span");
  icon.className = "msg-discovery-icon";
  icon.title = t("toast.new_discovery");
  icon.textContent = "!";
  last.appendChild(icon);
  last.classList.add("msg-has-discovery");
  // Persist discovery index so icons survive re-renders and reloads
  const activeNpcId = _cb.getActiveNpcId();
  if (activeNpcId) {
    const convLen = (_cb.getConversations()[activeNpcId] || []).length;
    const idx = convLen - 1;
    if (!discoveryMessageIndices[activeNpcId]) discoveryMessageIndices[activeNpcId] = [];
    if (!discoveryMessageIndices[activeNpcId].includes(idx)) {
      discoveryMessageIndices[activeNpcId].push(idx);
    }
  }
}

// ── UI Badges ───────────────────────────────────────────────────
export function flashCaseBoardTab() {
  unseenDiscoveryCount++;
  const tabs = document.querySelectorAll('.manila-tab[data-hub-tab="caseboard"]');
  tabs.forEach(tab => {
    tab.classList.add("tab-flash");
    setTimeout(() => tab.classList.remove("tab-flash"), 4000);
    let badge = tab.querySelector(".tab-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "tab-badge";
      tab.appendChild(badge);
    }
    badge.textContent = unseenDiscoveryCount;
  });
}

export function clearCaseBoardBadges() {
  unseenDiscoveryCount = 0;
  document.querySelectorAll('.manila-tab .tab-badge').forEach(b => b.remove());
  if (npcsWithNewDiscoveries.size > 0) {
    npcsWithNewDiscoveries.clear();
    _cb.renderNpcGrid();
  }
}

// ── Toast ───────────────────────────────────────────────────────
function ensureToastContainer() {
  let el = document.getElementById("discovery-toast-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "discovery-toast-container";
    document.body.appendChild(el);
  }
  return el;
}

export function showDiscoveryToast(text) {
  const container = ensureToastContainer();
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

// ── Evidence Detection ──────────────────────────────────────────
export function detectEvidence(evidenceIds, npcId) {
  const EVIDENCE_CATALOG = _case().evidenceCatalog;
  const PARTNER_NPC_ID = _case().partnerNpcId;
  const npcs = _cb.getNpcs ? _cb.getNpcs() : [];
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

// ── Render Evidence (Case Board) ────────────────────────────────
export function getDiscoveriesForEvidence(evidenceId) {
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

function renderEvidenceItem(e) {
  const PARTNER_NPC_ID = _case().partnerNpcId;
  const npcs = _cb.getNpcs ? _cb.getNpcs() : [];
  const div = document.createElement("div");
  div.className = "clue-item";
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

export function renderEvidence() {
  const EVIDENCE_GROUPS = _case().evidenceGroups;
  const cbEvidenceList = document.querySelector("#cb-evidence-list");
  const cbEvidenceEmpty = document.querySelector("#cb-evidence-empty");
  if (!cbEvidenceList || !cbEvidenceEmpty) return;
  cbEvidenceList.innerHTML = "";
  cbEvidenceEmpty.style.display = evidence.length ? "none" : "block";

  if (caseReadyPromptShown && evidence.length > 0) {
    for (const [groupKey, ids] of Object.entries(EVIDENCE_GROUPS)) {
      const groupEvidence = evidence.filter(e => ids.includes(e.id));
      if (groupEvidence.length === 0) continue;
      const header = document.createElement("div");
      header.className = "evidence-group-header";
      header.textContent = t("evidence.group_" + groupKey);
      cbEvidenceList.appendChild(header);
      for (const e of groupEvidence) cbEvidenceList.appendChild(renderEvidenceItem(e));
    }
    const cta = document.createElement("button");
    cta.className = "evidence-accuse-cta";
    cta.textContent = t("endgame.accuse_cta");
    cta.addEventListener("click", () => _cb.openAccusationModal());
    cbEvidenceList.appendChild(cta);
  } else {
    for (const e of evidence) cbEvidenceList.appendChild(renderEvidenceItem(e));
  }
}
