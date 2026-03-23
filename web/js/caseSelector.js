/**
 * Case Selector Module
 * Displays available cases as manila folder cards on a desk surface.
 * @module caseSelector
 */
import { API_BASE } from "./api.js";

/* ── DOM refs ─────────────────────────────────────────────── */
const caseSelector = document.querySelector("#case-selector");
const caseSelectorDesk = document.querySelector("#case-selector-desk");

/* ── State ────────────────────────────────────────────────── */
let _callbacks = {};
let _cases = [];

/* ── Public API ───────────────────────────────────────────── */
export function showCaseSelector() {
  caseSelector.classList.remove("hidden");
  updateProgressBadges();
}

export function hideCaseSelector() {
  caseSelector.classList.add("hidden");
}

/* ── Progress Detection ───────────────────────────────────── */
function getCaseProgress(caseId) {
  const frontendId = caseId.replace(/_/g, "-");
  const stateKey = `sad_${frontendId}_state_v2`;
  const raw = localStorage.getItem(stateKey);
  if (!raw) {
    // Check for migrated old-format key
    return "new";
  }
  try {
    const state = JSON.parse(raw);
    // Check if the case has been solved (outcome exists)
    if (state.outcome) return "solved";
    // Check if any conversations exist
    if (state.conversations && Object.keys(state.conversations).length > 0) return "in-progress";
    return "new";
  } catch {
    return "new";
  }
}

function updateProgressBadges() {
  for (const c of _cases) {
    const badge = caseSelectorDesk.querySelector(`[data-case-id="${c.case_id}"] .case-folder-badge`);
    if (badge) {
      const progress = getCaseProgress(c.case_id);
      badge.textContent = progress === "solved" ? "SOLVED" : progress === "in-progress" ? "IN PROGRESS" : "NEW";
      badge.className = `case-folder-badge badge-${progress}`;
    }
  }
}

/* ── Rendering ────────────────────────────────────────────── */
function renderFolders() {
  caseSelectorDesk.innerHTML = "";
  for (const c of _cases) {
    const progress = getCaseProgress(c.case_id);
    const badgeText = progress === "solved" ? "SOLVED" : progress === "in-progress" ? "IN PROGRESS" : "NEW";

    const folder = document.createElement("button");
    folder.className = "case-folder";
    folder.dataset.caseId = c.case_id;
    folder.innerHTML = `
      <div class="case-folder-tab">${escapeHtml(c.title)}</div>
      <div class="case-folder-body">
        <div class="case-folder-classified">CLASSIFIED</div>
        <div class="case-folder-tagline">${escapeHtml(c.tagline || "")}</div>
        <div class="case-folder-meta">${c.npc_count} characters</div>
        <div class="case-folder-badge badge-${progress}">${badgeText}</div>
      </div>
    `;
    folder.addEventListener("click", () => {
      _callbacks.onCaseSelected(c);
    });
    caseSelectorDesk.appendChild(folder);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ── Init ─────────────────────────────────────────────────── */
export async function initCaseSelector(callbacks) {
  _callbacks = callbacks;

  // Fetch available cases
  try {
    const res = await fetch(`${API_BASE}/api/cases`);
    const data = await res.json();
    _cases = data.cases || [];
  } catch (err) {
    console.error("[caseSelector] Failed to fetch cases:", err);
    _cases = [];
  }

  renderFolders();
}
