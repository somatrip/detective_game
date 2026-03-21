/* ================================================================
   Navigation Module
   Extracted from main.js — manages tab navigation, NPC tab creation,
   hub/chat switching, and NPC grid rendering.
   ================================================================ */
import { escapeHtml, npcDisplayName, t } from "./utils.js";
import { renderEvidence, clearCaseBoardBadges, getNpcsWithNewDiscoveries } from "./evidence.js";
import { openAccusationModal } from "./accusation.js";

// ── CASE constants (from window.CASE) ───────────────────────────
function _case() { return window.CASE; }

// ── Callbacks (set via initNavigation) ──────────────────────────
let _cb = {};

export function initNavigation(callbacks) {
  _cb = callbacks;

  // Hub manila folder tabs — unified handler
  document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.hubTab;
      // Clicking "Persons of Interest" while chatting leaves the chat
      if (_cb.getActiveNpcId() && name === "suspects") {
        _cb.leaveChat();
        removeNpcTab();
      }
      activateTab(name);
    });
  });
}

// ── Tab Navigation ──────────────────────────────────────────────
export function activateTab(tabName) {
  document.querySelectorAll(".manila-tab[data-hub-tab]").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".hub-panel").forEach(p => p.classList.remove("active"));

  const tab = document.querySelector(`.manila-tab[data-hub-tab="${tabName}"]`);
  if (tab) tab.classList.add("active");
  const panel = document.getElementById(`hub-${tabName}`);
  if (panel) panel.classList.add("active");

  // Tab-specific side effects
  if (tabName === "caseboard") { renderEvidence(); clearCaseBoardBadges(); }
  if (tabName === "stringboard") _cb.renderStringBoard();
  if (tabName === "suspects") { renderNpcGrid(); renderEvidence(); }

  // Audio toggle only visible in chat
  const audioBtn = document.getElementById("audio-toggle");
  if (audioBtn) audioBtn.classList.toggle("hidden-icon", tabName !== "chat");
}

export function addNpcTab(npcId) {
  removeNpcTab();
  const npcs = _cb.getNpcs();
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

export function removeNpcTab() {
  document.querySelector(".manila-tab-npc")?.remove();
}

export function showHub() {
  removeNpcTab();
  _cb.leaveChat();
  activateTab("suspects");
}

export function showChat() {
  activateTab("chat");
}

export function showHubOnCaseboard() {
  _cb.getHubScreen().classList.add("active");
  activateTab("caseboard");
}

// ── Render NPC Grid (5 + 4 staggered rows) ─────────────────────
export function renderNpcGrid() {
  const npcGridEl = document.querySelector("#npc-grid");
  const npcs = _cb.getNpcs();
  const conversations = _cb.getConversations();
  const NPC_META = _case().npcMeta;
  const PARTNER_NPC_ID = _case().partnerNpcId;

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
    img.src = _cb.portraitUrl(npc.npc_id, "neutral");
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
      <div class="npc-card-role">${escapeHtml(_cb.npcRole(npc.npc_id))}</div>
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

    card.addEventListener("click", () => _cb.selectNpc(npc.npc_id));

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
  document.querySelector("#hub-accuse-btn").addEventListener("click", openAccusationModal);
}
