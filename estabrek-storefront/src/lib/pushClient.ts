/**
 * Notifications, on the shopper's side (the shop as an app, part two; lib/pwa.ts): whether this browser can get them,
 * asking it (only ever after the shopper's own tap), subscribing with the shop's key, and telling the API (the
 * backend's /v1/push) who this phone is and who is signed in on it. Saying no again (the account page's switch) takes
 * the subscription away on both sides. Nothing here runs on the server.
 *
 * An iPhone only gets notifications from a shop put on its home screen (iOS 16.4 and later): in Safari's own window it
 * is never asked.
 */
import { apiBaseClient } from "./apiClient";
import type { Lang } from "./i18n";

export type PushState = "unsupported" | "install-first" | "denied" | "off" | "on";

/** Opened from the home screen, as an app. */
export const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
/** Inside the admin's editor frames: no worker, no asking. */
export const inEditorFrame = () => {
  try {
    return window.top !== window.self || /\/(studio-frame|design-frame)(\/|$)/.test(window.location.pathname);
  } catch {
    return true;
  }
};
const iphone = () => /iP(hone|ad|od)/.test(navigator.userAgent);

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** The shop's public key (the API's /push/key), or null while notifications are off. */
export async function shopKey(): Promise<string | null> {
  try {
    const res = await fetch(`${apiBaseClient()}/push/key`, { cache: "no-store" });
    if (!res.ok) return null;
    const key = (await res.json())?.key;
    return typeof key === "string" && /^[A-Za-z0-9_-]{80,100}$/.test(key) ? key : null;
  } catch {
    return null;
  }
}

/** A base64url key as the bytes PushManager.subscribe wants. */
export function keyBytes(key: string): Uint8Array {
  const b64 = key.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(key.length / 4) * 4, "=");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) => {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
};

/** The worker, once it is running (null when it isn't there: the app is off). */
async function worker(): Promise<ServiceWorkerRegistration | null> {
  const reg = await navigator.serviceWorker.getRegistration("/").catch(() => undefined);
  if (!reg) return null;
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 8000))]);
}

/** Where this browser stands, without asking anything. */
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (iphone() && !standalone()) return "install-first";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  const reg = await worker();
  const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
  return sub ? "on" : "off";
}

type Headers = Record<string, string>;

/** What the API last heard from this tab: who was signed in on it, and its language. */
const SYNCED = "shop-push-synced";
const markOf = (lang: Lang, who: string) => `${who}|${lang}`;
const heard = (mark: string | null) => {
  try {
    if (mark) sessionStorage.setItem(SYNCED, mark);
    else sessionStorage.removeItem(SYNCED);
  } catch {
    /* storage blocked: told every time */
  }
};

/** The API is told this phone's subscription (and, with a shopper's token, who it is). `who`: "guest" or the shopper's id. */
async function tell(sub: PushSubscription, lang: Lang, who: string, auth: Headers) {
  const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const res = await fetch(`${apiBaseClient()}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ endpoint: j.endpoint, keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth }, lang }),
  });
  if (res.ok) heard(markOf(lang, who));
  return res.ok;
}

/**
 * Asks (the browser's own question: call it from the shopper's tap), subscribes with the shop's key and tells the API.
 * "denied": the shopper said no to the browser; "failed": something on the way didn't work (no key, no worker).
 */
export async function turnPushOn(lang: Lang, who: string, auth: Headers = {}): Promise<"on" | "denied" | "failed"> {
  if (!pushSupported()) return "failed";
  const answer = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (answer !== "granted") return answer === "denied" ? "denied" : "failed";
  const key = await shopKey();
  const reg = key ? await worker() : null;
  if (!key || !reg) return "failed";
  try {
    const bytes = keyBytes(key);
    let sub = await reg.pushManager.getSubscription();
    // Made with another key (the shop's changed): a new one.
    if (sub && !sameKey(sub.options?.applicationServerKey, bytes)) {
      await sub.unsubscribe().catch(() => false);
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
    return (await tell(sub, lang, who, auth)) ? "on" : "failed";
  } catch {
    return "failed";
  }
}

/** No more notifications on this phone: the subscription goes, here and on the API. */
export async function turnPushOff(): Promise<void> {
  const reg = await worker();
  const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
  if (!sub) return;
  const endpoint = sub.endpoint;
  heard(null);
  await sub.unsubscribe().catch(() => false);
  await fetch(`${apiBaseClient()}/push/unsubscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }) }).catch(() => null);
}

/** One telling at a time for the same thing (a page's effects may run twice). */
const telling = new Map<string, Promise<boolean>>();

/**
 * Said yes before: the API hears from this phone again (who is signed in on it now, its language), once a visit and
 * again when that changes. Never asks anything.
 */
export function syncPush(lang: Lang, who: string, auth: Headers = {}): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return Promise.resolve(false);
  const mark = markOf(lang, who);
  try {
    if (sessionStorage.getItem(SYNCED) === mark) return Promise.resolve(false);
  } catch {
    /* storage blocked: tell it every time */
  }
  const going = telling.get(mark);
  if (going) return going;
  const run = (async () => {
    const reg = await worker();
    let sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
    if (!reg || !sub) return false;
    const key = await shopKey();
    if (!key) return false;
    // The shop's key changed (the server made a new pair): the same yes, with the new key; nothing is asked again.
    const bytes = keyBytes(key);
    if (!sameKey(sub.options?.applicationServerKey, bytes)) {
      await sub.unsubscribe().catch(() => false);
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes }).catch(() => null);
      if (!sub) return false;
    }
    return tell(sub, lang, who, auth).catch(() => false);
  })().finally(() => telling.delete(mark));
  telling.set(mark, run);
  return run;
}
