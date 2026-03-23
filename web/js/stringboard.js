/* ══════════════════════════════════════════════════════════════
   STRING BOARD (Deduction Board) — extracted module
   ══════════════════════════════════════════════════════════════ */

import { API_BASE } from "./api.js";
import { t } from "./utils.js";

// ── Module-level state ──────────────────────────────────────
let stringBoard = {
  cardPositions: {},  // cardId -> {x, y}
  links: [],          // [{from, to, note}]
};

let sbLinkFrom = null;  // cardId of link source (while creating a link)
let sbDragging = null;  // {cardId, offsetX, offsetY} while dragging a card
let sbSaveTimer = null; // debounce timer for persistence
let sbPan = { x: 0, y: 0 };
let sbZoom = 1;
let sbPanning = null;   // {startX, startY, startPanX, startPanY} while panning

// ── Callbacks (set by initStringBoard) ──────────────────────
let _getEvidence = () => [];
let _getNpcs = () => [];
let _portraitUrl = () => "";
let _getDiscoveriesForEvidence = () => [];
let _saveState = () => {};

// ── Helpers ─────────────────────────────────────────────────
function _npcMeta() { return window.CASE.npcMeta; }
function _partnerNpcId() { return window.CASE.partnerNpcId; }
function _suspectIds() { return Object.keys(_npcMeta()).filter(id => id !== _partnerNpcId()); }

/** Default auto-layout positions for suspect + starting evidence cards. */
let _defaultPositionsCache = null;
function sbDefaultPositions() {
  if (_defaultPositionsCache) return _defaultPositionsCache;
  const defaults = {};
  const cols = 4;
  const spacingX = 200;
  const spacingY = 180;
  const startX = 40;
  const startY = 60;
  const suspectIds = _suspectIds();

  suspectIds.forEach((npcId, i) => {
    const cardId = "suspect:" + npcId;
    defaults[cardId] = {
      x: startX + (i % cols) * spacingX,
      y: startY + Math.floor(i / cols) * spacingY,
    };
  });

  // Starting evidence below suspects
  const evidenceY = startY + Math.ceil(suspectIds.length / cols) * spacingY + 40;
  defaults["burned-notebook"] = { x: startX, y: evidenceY };
  defaults["keycard-logs"] = { x: startX + spacingX, y: evidenceY };

  _defaultPositionsCache = defaults;
  return defaults;
}

/** Find the nearest open grid slot for a new evidence card. */
function sbFindOpenSlot() {
  const slotW = 200;
  const slotH = 180;
  const startX = 40;
  const startY = 60;
  const cols = 6;
  const occupied = new Set();

  for (const pos of Object.values(stringBoard.cardPositions)) {
    const col = Math.round((pos.x - startX) / slotW);
    const row = Math.round((pos.y - startY) / slotH);
    occupied.add(`${col},${row}`);
  }

  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < cols; col++) {
      if (!occupied.has(`${col},${row}`)) {
        return { x: startX + col * slotW, y: startY + row * slotH };
      }
    }
  }
  return { x: startX, y: startY + 20 * slotH };
}

/** Ensure all suspect cards and collected evidence have positions.
 *  Also prunes any cards that don't belong to the current case. */
export function sbEnsurePositions() {
  const defaults = sbDefaultPositions();
  let changed = false;
  const suspectIds = _suspectIds();

  // Build set of valid card IDs for current case
  const validIds = new Set();

  // Suspects always present
  for (const npcId of suspectIds) {
    const cardId = "suspect:" + npcId;
    validIds.add(cardId);
    if (!stringBoard.cardPositions[cardId]) {
      stringBoard.cardPositions[cardId] = defaults[cardId] || sbFindOpenSlot();
      changed = true;
    }
  }

  // Evidence cards — only collected ones
  for (const e of _getEvidence()) {
    validIds.add(e.id);
    if (!stringBoard.cardPositions[e.id]) {
      stringBoard.cardPositions[e.id] = defaults[e.id] || sbFindOpenSlot();
      changed = true;
    }
  }

  // Prune cards from other cases
  for (const cardId of Object.keys(stringBoard.cardPositions)) {
    if (!validIds.has(cardId)) {
      delete stringBoard.cardPositions[cardId];
      changed = true;
    }
  }

  // Prune links referencing removed cards
  const before = stringBoard.links.length;
  stringBoard.links = stringBoard.links.filter(
    l => validIds.has(l.from) && validIds.has(l.to)
  );
  if (stringBoard.links.length !== before) changed = true;

  return changed;
}

/** Render (or re-render) the string board. */
export function renderStringBoard() {
  const cardsContainer = document.getElementById("string-board-cards");
  const svgEl = document.getElementById("string-board-svg");
  if (!cardsContainer || !svgEl) return;

  sbEnsurePositions();
  cardsContainer.innerHTML = "";

  const NPC_META = _npcMeta();
  const suspectIds = _suspectIds();
  const npcs = _getNpcs();
  const evidence = _getEvidence();

  // Render suspect cards
  for (const npcId of suspectIds) {
    const cardId = "suspect:" + npcId;
    const pos = stringBoard.cardPositions[cardId] || { x: 0, y: 0 };
    const npc = npcs.find(n => n.npc_id === npcId);
    const displayName = (npc?.display_name || npcId).split(/\s[—\u2014-]{1,2}\s/)[0];

    const card = document.createElement("div");
    card.className = "string-board-card suspect";
    card.dataset.cardId = cardId;
    card.style.left = pos.x + "px";
    card.style.top = pos.y + "px";

    // Pin circle
    const pin = document.createElement("div");
    pin.className = "string-board-pin";
    pin.dataset.cardId = cardId;
    card.appendChild(pin);

    // Portrait
    const portraitDiv = document.createElement("div");
    portraitDiv.className = "sb-card-portrait";
    const img = new Image();
    img.src = _portraitUrl(npcId, "neutral");
    img.alt = displayName;
    img.loading = "lazy";
    img.onerror = function() {
      const meta = NPC_META[npcId] || { initials: "?" };
      this.parentElement.textContent = meta.initials;
    };
    portraitDiv.appendChild(img);
    card.appendChild(portraitDiv);

    // Name
    const nameDiv = document.createElement("div");
    nameDiv.className = "sb-card-name";
    nameDiv.textContent = displayName;
    card.appendChild(nameDiv);

    cardsContainer.appendChild(card);
  }

  // Render evidence cards (only collected)
  for (const e of evidence) {
    const pos = stringBoard.cardPositions[e.id] || { x: 0, y: 0 };
    const label = t("evidence." + e.id + "_label") || e.label;

    const card = document.createElement("div");
    card.className = "string-board-card evidence";
    card.dataset.cardId = e.id;
    card.style.left = pos.x + "px";
    card.style.top = pos.y + "px";

    // Pin circle
    const pin = document.createElement("div");
    pin.className = "string-board-pin";
    pin.dataset.cardId = e.id;
    card.appendChild(pin);

    // Name
    const nameDiv = document.createElement("div");
    nameDiv.className = "sb-card-name";
    nameDiv.textContent = label;
    card.appendChild(nameDiv);

    // Discovery sub-bullets
    const linkedDisc = _getDiscoveriesForEvidence(e.id);
    if (linkedDisc.length > 0) {
      const discDiv = document.createElement("div");
      discDiv.className = "sb-card-discoveries";
      for (const d of linkedDisc) {
        const line = document.createElement("div");
        line.textContent = "- " + t(d.text);
        discDiv.appendChild(line);
      }
      card.appendChild(discDiv);
    }

    cardsContainer.appendChild(card);
  }

  // Draw SVG string lines
  sbDrawLinks();
}

/** Draw SVG link lines between connected cards. */
function sbDrawLinks() {
  const svgEl = document.getElementById("string-board-svg");
  if (!svgEl) return;
  svgEl.innerHTML = "";

  const cardsContainer = document.getElementById("string-board-cards");
  if (!cardsContainer) return;

  // Resize SVG to match container
  svgEl.setAttribute("width", cardsContainer.scrollWidth || 1200);
  svgEl.setAttribute("height", cardsContainer.scrollHeight || 900);

  for (let i = 0; i < stringBoard.links.length; i++) {
    const link = stringBoard.links[i];
    const fromPos = stringBoard.cardPositions[link.from];
    const toPos = stringBoard.cardPositions[link.to];
    if (!fromPos || !toPos) continue;

    // Center of card (card width ~160, pin is at top center)
    const x1 = fromPos.x + 80;
    const y1 = fromPos.y;
    const x2 = toPos.x + 80;
    const y2 = toPos.y;

    // Quadratic bezier with slight sag
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 + 30; // sag

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`);
    path.setAttribute("class", "string-board-link");
    path.dataset.linkIndex = i;

    // Right-click to delete
    path.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      sbDeleteLink(parseInt(path.dataset.linkIndex, 10));
    });

    // Long-press to delete (mobile)
    let longPressTimer = null;
    path.addEventListener("pointerdown", (e) => {
      longPressTimer = setTimeout(() => {
        sbDeleteLink(parseInt(path.dataset.linkIndex, 10));
      }, 600);
    });
    path.addEventListener("pointerup", () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    });
    path.addEventListener("pointercancel", () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    });

    svgEl.appendChild(path);

  }
}

/** Delete a link by index. */
function sbDeleteLink(index) {
  if (index >= 0 && index < stringBoard.links.length) {
    stringBoard.links.splice(index, 1);
    renderStringBoard();
    sbScheduleSave();
  }
}

/** Toggle a link between two cards: create if missing, remove if exists. */
function sbToggleLink(fromId, toId) {
  const idx = stringBoard.links.findIndex(l =>
    (l.from === fromId && l.to === toId) || (l.from === toId && l.to === fromId)
  );
  if (idx >= 0) {
    stringBoard.links.splice(idx, 1);
  } else {
    stringBoard.links.push({ from: fromId, to: toId });
  }
  renderStringBoard();
  sbScheduleSave();
}

/** Schedule a debounced save for string board state. */
function sbScheduleSave() {
  if (sbSaveTimer) clearTimeout(sbSaveTimer);
  sbSaveTimer = setTimeout(() => {
    _saveState();
    sbSaveToServer();
  }, 2000);
}

/** Save string board state to the backend. */
async function sbSaveToServer() {
  try {
    const caseId = window.CASE?.id || "default";
    await fetch(`${API_BASE}/api/state/stringboard?case_id=${encodeURIComponent(caseId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stringBoard),
    });
  } catch (err) {
    console.error("[string-board] Failed to save to server:", err);
  }
}

/** Load string board state from the backend (only if richer than local). */
export async function sbLoadFromServer() {
  try {
    const caseId = window.CASE?.id || "default";
    const res = await fetch(`${API_BASE}/api/state/stringboard?case_id=${encodeURIComponent(caseId)}`);
    if (res.ok) {
      const data = await res.json();
      const serverPositions = Object.keys(data?.cardPositions || {}).length;
      const localPositions = Object.keys(stringBoard.cardPositions).length;
      // Only overwrite if server has more data than what localStorage restored
      if (serverPositions > localPositions) {
        stringBoard.cardPositions = data.cardPositions;
        stringBoard.links = data.links || [];
      }
    }
  } catch (err) {
    console.error("[string-board] Failed to load from server:", err);
  }
}

/** Apply current pan/zoom transform to the viewport. */
function sbApplyTransform() {
  const vp = document.getElementById("string-board-viewport");
  if (vp) vp.style.transform = `translate(${sbPan.x}px, ${sbPan.y}px) scale(${sbZoom})`;
}

/** Convert a client-space coordinate to board-local coordinate. */
function sbClientToBoard(clientX, clientY) {
  const board = document.getElementById("string-board");
  const rect = board.getBoundingClientRect();
  return {
    x: (clientX - rect.left - sbPan.x) / sbZoom,
    y: (clientY - rect.top - sbPan.y) / sbZoom,
  };
}

/** Select / deselect a card for linking (same logic as pin click). */
function sbSelectCard(cardId) {
  const board = document.getElementById("string-board");
  if (!sbLinkFrom) {
    // First selection
    sbLinkFrom = cardId;
    const pin = board.querySelector(`.string-board-pin[data-card-id="${cardId}"]`);
    if (pin) pin.classList.add("active");
    const card = board.querySelector(`.string-board-card[data-card-id="${cardId}"]`);
    if (card) card.classList.add("selected");
  } else if (sbLinkFrom !== cardId) {
    // Second selection — toggle link
    const fromId = sbLinkFrom;
    sbLinkFrom = null;
    board.querySelectorAll(".string-board-pin.active").forEach(p => p.classList.remove("active"));
    board.querySelectorAll(".string-board-card.selected").forEach(c => c.classList.remove("selected"));
    sbToggleLink(fromId, cardId);
  } else {
    // Same card — deselect
    sbLinkFrom = null;
    const pin = board.querySelector(`.string-board-pin[data-card-id="${cardId}"]`);
    if (pin) pin.classList.remove("active");
    const card = board.querySelector(`.string-board-card[data-card-id="${cardId}"]`);
    if (card) card.classList.remove("selected");
  }
}

/** Initialize string board drag/drop, pan, zoom, and pin click handlers. */
export function initStringBoard(callbacks) {
  _getEvidence = callbacks.getEvidence;
  _getNpcs = callbacks.getNpcs;
  _portraitUrl = callbacks.portraitUrl;
  _getDiscoveriesForEvidence = callbacks.getDiscoveriesForEvidence;
  _saveState = callbacks.saveState;

  const board = document.getElementById("string-board");
  const cardsContainer = document.getElementById("string-board-cards");
  if (!board || !cardsContainer) return;

  sbApplyTransform();

  // Delegated pointer events for dragging cards and panning
  board.addEventListener("pointerdown", (e) => {
    // Pin click — start/complete link
    const pin = e.target.closest(".string-board-pin");
    if (pin) {
      e.preventDefault();
      e.stopPropagation();
      sbSelectCard(pin.dataset.cardId);
      return;
    }

    // Card drag start
    const card = e.target.closest(".string-board-card");
    if (card) {
      e.preventDefault();
      const cardId = card.dataset.cardId;
      const boardPos = sbClientToBoard(e.clientX, e.clientY);
      const cardX = parseInt(card.style.left, 10) || 0;
      const cardY = parseInt(card.style.top, 10) || 0;
      sbDragging = {
        cardId,
        el: card,
        offsetX: boardPos.x - cardX,
        offsetY: boardPos.y - cardY,
        startX: e.clientX,
        startY: e.clientY,
        didMove: false,
      };
      card.classList.add("dragging");
      card.setPointerCapture(e.pointerId);
      return;
    }

    // Pan start — empty board area
    if (!e.target.closest(".sb-zoom-btn")) {
      e.preventDefault();
      sbPanning = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: sbPan.x,
        startPanY: sbPan.y,
      };
      board.classList.add("panning");
      board.setPointerCapture(e.pointerId);
    }
  });

  board.addEventListener("pointermove", (e) => {
    if (sbDragging) {
      e.preventDefault();
      const dx = e.clientX - sbDragging.startX;
      const dy = e.clientY - sbDragging.startY;
      if (!sbDragging.didMove && (dx * dx + dy * dy) > 25) sbDragging.didMove = true;
      const pos = sbClientToBoard(e.clientX, e.clientY);
      sbDragging.el.style.left = Math.max(0, pos.x - sbDragging.offsetX) + "px";
      sbDragging.el.style.top = Math.max(0, pos.y - sbDragging.offsetY) + "px";
      return;
    }
    if (sbPanning) {
      e.preventDefault();
      sbPan.x = sbPanning.startPanX + (e.clientX - sbPanning.startX);
      sbPan.y = sbPanning.startPanY + (e.clientY - sbPanning.startY);
      sbApplyTransform();
    }
  });

  board.addEventListener("pointerup", (e) => {
    if (sbDragging) {
      const wasDrag = sbDragging.didMove;
      const cardId = sbDragging.cardId;
      const cardEl = sbDragging.el;
      cardEl.classList.remove("dragging");
      stringBoard.cardPositions[cardId] = {
        x: parseInt(cardEl.style.left, 10),
        y: parseInt(cardEl.style.top, 10),
      };
      sbDragging = null;
      sbDrawLinks();
      if (wasDrag) {
        sbScheduleSave();
      } else {
        // Click (no drag) — select/deselect card for linking
        sbSelectCard(cardId);
      }
      return;
    }
    if (sbPanning) {
      board.classList.remove("panning");
      sbPanning = null;
    }
  });

  // Cancel link creation when clicking empty board area
  board.addEventListener("click", (e) => {
    if (!e.target.closest(".string-board-pin") && !e.target.closest(".string-board-card") && sbLinkFrom) {
      sbLinkFrom = null;
      board.querySelectorAll(".string-board-pin.active").forEach(p => p.classList.remove("active"));
      board.querySelectorAll(".string-board-card.selected").forEach(c => c.classList.remove("selected"));
    }
  });

  // Zoom with scroll wheel
  board.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.min(2, Math.max(0.3, sbZoom + delta));
    // Zoom toward cursor position
    const rect = board.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    sbPan.x = cx - (cx - sbPan.x) * (newZoom / sbZoom);
    sbPan.y = cy - (cy - sbPan.y) * (newZoom / sbZoom);
    sbZoom = newZoom;
    sbApplyTransform();
  }, { passive: false });

  // Zoom buttons
  document.getElementById("sb-zoom-in")?.addEventListener("click", () => {
    sbZoom = Math.min(2, sbZoom + 0.15);
    sbApplyTransform();
  });
  document.getElementById("sb-zoom-out")?.addEventListener("click", () => {
    sbZoom = Math.max(0.3, sbZoom - 0.15);
    sbApplyTransform();
  });
}

// ── Getter / Setter for state serialization ─────────────────

/** Returns the string board data object. */
export function getStringBoard() {
  return stringBoard;
}

/** Sets the string board data (for state restore). */
export function setStringBoard(data) {
  if (data.cardPositions) stringBoard.cardPositions = data.cardPositions;
  if (data.links) stringBoard.links = data.links;
}

/** Resets string board to empty state. */
export function resetStringBoard() {
  stringBoard = { cardPositions: {}, links: [] };
  _defaultPositionsCache = null;
}
