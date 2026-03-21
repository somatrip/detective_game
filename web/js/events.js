/**
 * Lightweight pub/sub event bus for cross-module communication.
 * Keeps modules decoupled — emitters don't need to know about subscribers.
 *
 * Usage:
 *   import { on, emit } from "./events.js";
 *   on("evidence:collected", (data) => { ... });
 *   emit("evidence:collected", { id: "keycard" });
 */

const _listeners = {};

/** Subscribe to an event. Returns an unsubscribe function. */
export function on(event, fn) {
  (_listeners[event] ||= []).push(fn);
  return () => off(event, fn);
}

/** Unsubscribe from an event. */
export function off(event, fn) {
  const list = _listeners[event];
  if (!list) return;
  const idx = list.indexOf(fn);
  if (idx >= 0) list.splice(idx, 1);
}

/** Emit an event to all subscribers. */
export function emit(event, data) {
  const list = _listeners[event];
  if (!list) return;
  // Iterate a copy so handlers can safely unsubscribe
  for (const fn of [...list]) fn(data);
}

/** Subscribe to an event, but only fire once. */
export function once(event, fn) {
  const wrapper = (data) => {
    off(event, wrapper);
    fn(data);
  };
  on(event, wrapper);
}
