/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str - Raw string to escape
 * @returns {string} HTML-safe string
 */
export function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
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
