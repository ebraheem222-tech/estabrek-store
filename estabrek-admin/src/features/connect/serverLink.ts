// A copy's admin put up on the platform owner's Cloudflare Pages before anything else (config/env.ts: server.from
// "none"; paintispassion.pages.dev, 2026-11-24). Its client can't reach that Cloudflare, and has no Neon or Railway:
// the admin asks the platform's own server (VITE_PLATFORM_API_URL) to make them (backend lib/siteAsk.ts). The owner
// says yes after matching six letters; then the database, the server and the shop are made in the owner's accounts,
// and this same site is built again with its server's address. Meanwhile this browser keeps that address, so its
// client goes on at once to make the owner's account.
import { SERVER_KEY, keptServer } from "../../config/env";

/**
 * What an address answered: a store's server (and whether its first setup is still open), nothing at all (down,
 * still building, or refusing this admin: a browser can't tell those apart), or something else.
 */
export type ServerCheck = { kind: "store"; needed: boolean } | { kind: "silent" } | { kind: "other" };
export async function checkServer(api: string, fetcher: typeof fetch = fetch): Promise<ServerCheck> {
  let res: Response;
  try {
    res = await fetcher(`${api}/auth/first-run`, { headers: { Accept: "application/json" } });
  } catch {
    return { kind: "silent" };
  }
  try {
    const data = (await res.json()) as { needed?: unknown };
    return typeof data?.needed === "boolean" ? { kind: "store", needed: data.needed } : { kind: "other" };
  } catch {
    return { kind: "other" };
  }
}

/** This browser's server, until the site is built with it. */
export function keepServer(written: string): string | null {
  const api = keptServer(written);
  if (!api) return null;
  try {
    localStorage.setItem(SERVER_KEY, api);
  } catch {
    return null;
  }
  return api;
}
export function forgetServer() {
  try {
    localStorage.removeItem(SERVER_KEY);
  } catch {
    /* nothing kept */
  }
}

/** This browser's own key for its ask (only it is told the server and the setup code), made once and kept. */
const ASK_KEY = "admin.ask.key";
export function askKey(): string {
  try {
    const kept = localStorage.getItem(ASK_KEY);
    if (kept && /^[A-Za-z0-9_-]{32,128}$/.test(kept)) return kept;
  } catch {
    /* made new below */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const key = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  try {
    localStorage.setItem(ASK_KEY, key);
  } catch {
    /* this page only, then */
  }
  return key;
}
export function forgetAsk() {
  try {
    localStorage.removeItem(ASK_KEY);
  } catch {
    /* nothing kept */
  }
}

export type AskState = "waiting" | "refused" | "making" | "stopped" | "made";
export type AskStep = { id: string; state: "waiting" | "doing" | "done" | "failed" };
export type AskStatus = { state: AskState; pair: string; steps?: AskStep[]; api?: string; code?: string };
/** What the platform said: its answer, "unknown" (it knows no ask of this browser's), or "silent". */
export type Said<T> = { ok: true; value: T } | { ok: false; why: "unknown" | "silent" | "refused"; error?: string };

async function post<T>(url: string, body: unknown, fetcher: typeof fetch): Promise<Said<T>> {
  let res: Response;
  try {
    res = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
  } catch {
    return { ok: false, why: "silent" };
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    return { ok: false, why: "silent" };
  }
  if (res.ok) return { ok: true, value: data as T };
  const error = (data as { error?: string } | null)?.error;
  return { ok: false, why: res.status === 404 ? "unknown" : "refused", error };
}

/** Ask (again) for the rest: the six letters the owner matches. */
export const askPlatform = (platform: string, key: string, fetcher: typeof fetch = fetch) => post<{ pair: string; state: AskState }>(`${platform}/site-ask`, { key }, fetcher);
/** Where this browser's ask stands. */
export const askedStatus = (platform: string, key: string, fetcher: typeof fetch = fetch) => post<AskStatus>(`${platform}/site-ask/status`, { key }, fetcher);

/** The making in four parts the client knows (backend lib/pressMake.ts MAKE_STEPS by service). */
export const PARTS = ["neon", "railway", "vercel", "cloudflare"] as const;
export type Part = (typeof PARTS)[number];
export function partsOf(steps: AskStep[]): Record<Part, AskStep["state"]> {
  const out = {} as Record<Part, AskStep["state"]>;
  for (const part of PARTS) {
    const mine = steps.filter((s) => s.id.startsWith(`${part}.`)).map((s) => s.state);
    out[part] = !mine.length ? "waiting" : mine.includes("failed") ? "failed" : mine.every((s) => s === "done") ? "done" : mine.some((s) => s !== "waiting") ? "doing" : "waiting";
  }
  return out;
}
