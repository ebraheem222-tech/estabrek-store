/**
 * What every Razan on the page obeys right now: the owner's settings (or the
 * preview being tried), the per-visit bubble budget, quiet pages and phones.
 * Kept outside React so the mascot's animation loop can ask cheaply.
 */
import { RAZAN_DEFAULTS, type RazanSettings } from "./razanSettings";
import { apiBaseClient } from "./apiClient";

let current: RazanSettings = RAZAN_DEFAULTS;
const BUBBLES_KEY = "razan_bubbles";

export function setRazanRuntime(s: RazanSettings) {
  current = s;
}

export function razanNow() {
  return current;
}

export function isPhone() {
  return typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches === true;
}

export function onQuietPage(path = typeof window !== "undefined" ? window.location.pathname : "/") {
  return current.quietPaths.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));
}

export type SpeakKind = "greet" | "react" | "outfit" | "offer";

/** May Razan show a speech bubble now? (Counts it when yes.) Chat replies inside her panel don't ask. */
export function razanMaySpeak(kind: SpeakKind) {
  const s = current;
  if (!s.enabled) return false;
  if (kind === "greet" && !s.greeting) return false;
  if ((kind === "react" || kind === "outfit") && !s.reactions) return false;
  if (isPhone() && s.phone !== "full") return false;
  if (onQuietPage()) return false;
  // Offers (help to order, the history) come once a visit each and have their own switches,
  // so the chatter cap doesn't swallow them.
  if (s.maxBubbles > 0 && kind !== "offer") {
    let n = 0;
    try { n = Number(sessionStorage.getItem(BUBBLES_KEY)) || 0; } catch { /* private mode */ }
    if (n >= s.maxBubbles) return false;
    try { sessionStorage.setItem(BUBBLES_KEY, String(n + 1)); } catch { /* ignore */ }
  }
  return true;
}

/* ---------------- Report counts (no personal data) ---------------- */

const lastSent = new Map<string, number>();

export function razanCount(key: string) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if ((lastSent.get(key) ?? 0) > now - 1500) return; // a double tap is one
  lastSent.set(key, now);
  try {
    void fetch(`${apiBaseClient()}/razan/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* offline */
  }
}

/** Opens Razan's panel on a tab from anywhere in the shop (e.g. «رزان بتختارلك» on the shop page). */
export const RAZAN_OPEN_EVENT = "razan:open";
export function razanOpen(tab: "chat" | "help" | "quiz" | "history") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(RAZAN_OPEN_EVENT, { detail: tab }));
}
