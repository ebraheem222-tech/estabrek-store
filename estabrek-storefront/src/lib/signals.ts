/**
 * What shoppers do with products (viewed, saved, added to the bag), counted per
 * product for the shop's cache: popular products stay cached longer and load
 * faster (backend lib/popularity.ts). Only the product (or variant) id is sent:
 * no cookies, no account, nothing about the shopper. Browsers asking not to be
 * tracked (Global Privacy Control / Do Not Track) send nothing.
 *
 * Signals wait a few seconds and go together in one small request; whatever is
 * left goes out when the page is hidden or closed.
 */
import { apiBaseClient } from "./apiClient";

export type SignalKind = "view" | "wishlist" | "bag";
type Signal = { k: SignalKind; p?: string; v?: string };

const MAX_BATCH = 20;
const WAIT_MS = 3_000;
const queue: Signal[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;
/** The API doesn't know signals (an older server): stop for this visit, unknown paths count against the visitor. */
let unsupported = false;

function asksNotToTrack() {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.globalPrivacyControl === true || n.doNotTrack === "1" || (window as Window & { doNotTrack?: string }).doNotTrack === "1";
}

function send() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (unsupported) queue.length = 0;
  while (queue.length) {
    const body = JSON.stringify({ e: queue.splice(0, MAX_BATCH) });
    try {
      // text/plain: a simple request (no preflight); keepalive: still sent while the page closes.
      void fetch(`${apiBaseClient()}/storefront/signals`, {
        method: "POST",
        body,
        headers: { "Content-Type": "text/plain" },
        credentials: "omit",
        keepalive: true,
      })
        .then((res) => {
          if (res.status === 404 || res.status === 405) unsupported = true;
        })
        .catch(() => undefined);
    } catch {
      /* counting must never break the shop */
    }
  }
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("pagehide", send);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") send();
  });
}

/** Counts one action on a product (by product id, or by variant id for the bag). */
export function signal(kind: SignalKind, ref: { productId?: string | null; variantId?: string | null }) {
  if (typeof window === "undefined" || unsupported) return;
  if (!ref.productId && !ref.variantId) return;
  try {
    if (asksNotToTrack()) return;
  } catch {
    return;
  }
  const next: Signal = ref.productId ? { k: kind, p: String(ref.productId) } : { k: kind, v: String(ref.variantId) };
  // The same thing twice before sending (a page mounted twice, a double tap) goes once.
  if (queue.some((q) => q.k === next.k && q.p === next.p && q.v === next.v)) return;
  queue.push(next);
  listen();
  if (queue.length >= MAX_BATCH) return send();
  if (timer) clearTimeout(timer);
  timer = setTimeout(send, WAIT_MS);
}
