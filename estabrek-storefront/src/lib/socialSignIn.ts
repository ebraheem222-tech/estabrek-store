/**
 * Signing in with Discord and linking a Steam account, as the shop reads the owner's settings (header.signIn.discord
 * and header.signIn.steam; the backend's lib/socialSignIn.ts reads them the same way and does the checking). Pure.
 */

/** A Discord application's id (a snowflake). */
const DISCORD_CLIENT = /^\d{15,22}$/;

/** Which of the two the owner has on: Discord only with a client id that is one. */
export function socialSignIn(header: unknown): { discord: boolean; steam: boolean } {
  const s = (header as { signIn?: { discord?: { enabled?: unknown; clientId?: unknown }; steam?: { enabled?: unknown } } } | null)?.signIn;
  const id = typeof s?.discord?.clientId === "string" ? s.discord.clientId.trim() : "";
  return { discord: s?.discord?.enabled === true && DISCORD_CLIENT.test(id), steam: s?.steam?.enabled === true };
}

/** A path on the shop only (never another site, never "//"); otherwise the fallback. */
export function shopPath(v: unknown, fallback = "/account"): string {
  return typeof v === "string" && /^\/(?!\/)[^\s\\]{0,200}$/.test(v) ? v : fallback;
}

/** The path with one word added to its query ("/account" + steam=linked → "/account?steam=linked"). */
export function withWord(path: string, key: string, value: string): string {
  const u = new URL(shopPath(path), "http://shop.local");
  u.searchParams.set(key, value.slice(0, 40));
  return `${u.pathname}${u.search}${u.hash}`;
}

/** What the state the store's API signed says (not checked here: the API checks it). */
function readState(state: unknown): { b?: unknown; n?: unknown } {
  try {
    const body = typeof state === "string" ? state.split(".")[0] : "";
    return JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))) as { b?: unknown; n?: unknown };
  } catch {
    return {};
  }
}
/** Where a sign-in began (only to come back to). */
export const backOfState = (state: unknown): string => shopPath(readState(state).b);
/** The state's one-time word: kept in a cookie on the shopper's browser as they leave, so only that browser can finish. */
export function wordOfState(state: unknown): string | null {
  const n = readState(state).n;
  return typeof n === "string" && /^[A-Za-z0-9_-]{8,40}$/.test(n) ? n : null;
}
/** The state inside an address the store's API gave (Discord's page). */
export function stateIn(url: string): string | null {
  try {
    return new URL(url).searchParams.get("state");
  } catch {
    return null;
  }
}
/** The cookie that holds it, on the Discord routes only, for the ten minutes a state lives. */
export const DISCORD_COOKIE = "estabrek_discord";

/** The shop's own address as the shopper sees it (behind Vercel's or Cloudflare's proxy too). */
export function shopOrigin(req: { headers: Headers; nextUrl: { origin: string; protocol: string } }): string {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();
  const proto = (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(/:$/, "")).split(",")[0].trim();
  return host && /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) && (proto === "https" || proto === "http") ? `${proto}://${host}` : req.nextUrl.origin;
}
