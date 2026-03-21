/**
 * Thin wrapper around the global t() i18n function, importable by modules.
 * @param {...any} args - Arguments forwarded to window.t()
 * @returns {string}
 */
export const t = (...args) => window.t(...args);

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str - Raw string to escape
 * @returns {string} HTML-safe string
 */
const _ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => _ESC[c]);
}

/**
 * Extract the NPC display name from a full label like "Name — Title".
 * Returns the label unchanged if it contains no separator, or an empty
 * string when label is nullish.
 * @param {string|null|undefined} label - Full NPC label
 * @returns {string} Just the name portion
 */
export function npcDisplayName(label) {
  if (!label) return "";
  return label.split(" — ")[0];
}

/**
 * Add click-outside-to-close behavior to a modal overlay.
 * @param {HTMLElement} overlay - The modal overlay element
 * @param {Function} closeFn - Function to call when clicking outside
 */
export function addModalCloseOnClickOutside(overlay, closeFn) {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeFn();
  });
}
