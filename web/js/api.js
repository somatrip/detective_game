/**
 * Centralized API client with auth header injection.
 * @module api
 */

export const API_BASE = window.location.origin;

let _getAuthUser = null;

/**
 * Initialize the API client with auth callback.
 * @param {Function} getAuthUser - Returns current auth user object or null
 */
export function initApiClient(getAuthUser) {
  _getAuthUser = getAuthUser;
}

/**
 * Make an authenticated API request. Automatically adds Authorization header
 * if an auth user is available.
 * @param {string} url - API endpoint URL
 * @param {object} [options] - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  const authUser = _getAuthUser?.();
  if (authUser?.access_token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${authUser.access_token}`,
    };
  }
  return fetch(url, options);
}

/**
 * Make an authenticated JSON POST request.
 * @param {string} url - API endpoint URL
 * @param {object} body - JSON body to send
 * @returns {Promise<Response>}
 */
export async function apiPost(url, body) {
  return apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
