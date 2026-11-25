/**
 * A coupon the shopper won in the page (pageTree/ShopGames.tsx: a scratch card, a memory game), kept on this device
 * for the bag (RoseCart, CartClient), which puts it in by itself. It lasts a week. No "@/" imports, no React.
 */
const KEY = "estabrek_won_coupon";
const WEEK = 7 * 86_400_000;
/** The bags listen for it, so one already open picks a new prize up. */
export const WON_COUPON_EVENT = "estabrek:won-coupon";
export const COUPON_CODE = /^[A-Za-z0-9_-]{2,32}$/;

export function saveWonCoupon(code: string): void {
  if (typeof window === "undefined" || !COUPON_CODE.test(code)) return;
  try { window.localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() })); } catch { /* private mode: the code is still on screen */ }
  window.dispatchEvent(new CustomEvent(WON_COUPON_EVENT, { detail: code }));
}

/** The coupon won here in the last week, if any. */
export function wonCoupon(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "null") as { code?: unknown; at?: unknown } | null;
    if (!raw || typeof raw.code !== "string" || !COUPON_CODE.test(raw.code) || typeof raw.at !== "number" || Date.now() - raw.at > WEEK) return null;
    return raw.code;
  } catch {
    return null;
  }
}

/** The bag found the store doesn't take it (used up, expired): it isn't offered again. */
export function forgetWonCoupon(code?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!code || wonCoupon() === code) window.localStorage.removeItem(KEY);
  } catch { /* nothing kept */ }
}
