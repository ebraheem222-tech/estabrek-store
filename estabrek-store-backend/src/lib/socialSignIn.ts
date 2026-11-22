/**
 * A shopper's Discord and Steam accounts (wave G2 of docs/sites-300-plan.ar.md; a game server's players sign in with
 * the accounts they play with). Both are switched on by the owner (admin → الزبائن → الدخول بحساب Discord / Steam,
 * header.signIn.discord and header.signIn.steam):
 *
 *  - Discord: sign in (OAuth2's code flow). The shop sends the shopper to Discord with a state we signed; Discord
 *    sends them back to the shop's own callback with a code, which comes here and is traded (with the owner's client
 *    secret, kept as the secret DISCORD_CLIENT_SECRET in الاتصالات والأسرار) for who they are. Only an email Discord
 *    says is verified opens or makes an account.
 *  - Steam: link (OpenID 2.0). Steam gives no email, so it is linked to an account already signed in: the state
 *    we signed says which. Steam's answer is asked back of Steam itself (check_authentication) before it is believed.
 *
 * A state lives ten minutes and is used once. Only Discord's and Steam's own addresses are ever called.
 */
import crypto from "node:crypto";
import { env } from "../config/env.js";

export const DISCORD_SECRET = "DISCORD_CLIENT_SECRET";
const DISCORD_API = "https://discord.com/api/v10";
const STEAM_OPENID = "https://steamcommunity.com/openid/login";
/** A Discord application's id (a snowflake). */
export const DISCORD_CLIENT = /^\d{15,22}$/;
const STATE_MS = 10 * 60_000;
/** The shop's own callbacks, the only places a shopper is sent back to. */
const CALLBACK = { discord: "/api/account/discord/callback", steam: "/api/account/steam/callback" } as const;

export type SocialSettings = { discord: { on: boolean; clientId: string | null }; steam: { on: boolean } };
/** The owner's settings (header.signIn), as the shop reads them too: Discord on only with a client id that is one. */
export function socialOf(header: unknown): SocialSettings {
  const s = (header as { signIn?: { discord?: { enabled?: unknown; clientId?: unknown }; steam?: { enabled?: unknown } } } | null)?.signIn;
  const clientId = typeof s?.discord?.clientId === "string" && DISCORD_CLIENT.test(s.discord.clientId.trim()) ? s.discord.clientId.trim() : null;
  return { discord: { on: s?.discord?.enabled === true && !!clientId, clientId }, steam: { on: s?.steam?.enabled === true } };
}

/** Why a sign-in or a link didn't go: SOCIAL_STATE (not ours, run out, used), SOCIAL_RETURN (not the shop's callback), DISCORD_EMAIL, DISCORD_REFUSED, STEAM_REFUSED. */
export class SocialError extends Error {}

/* ---------------- The state ---------------- */

type State = { k: "discord" | "steam"; r: string; b: string; u?: string; n: string; e: number };
const used = new Map<string, number>();
const mac = (data: string) => crypto.createHmac("sha256", `social:${env.JWT_SECRET}`).update(data).digest("base64url");

/** A callback address is the shop's own: an http(s) address ending in the kind's callback path. */
export function isCallback(kind: "discord" | "steam", url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === "https:" || u.protocol === "http:") && u.pathname === CALLBACK[kind] && !u.search && !u.hash && !u.username && !u.password;
  } catch {
    return false;
  }
}
/** Where the shopper goes once it is done: a path on the shop only. */
const backOf = (b: unknown) => (typeof b === "string" && /^\/(?!\/)[^\s]{0,200}$/.test(b) ? b : "/");

export function signState(s: Omit<State, "n" | "e">, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...s, b: backOf(s.b), n: crypto.randomBytes(12).toString("base64url"), e: now + STATE_MS })).toString("base64url");
  return `${body}.${mac(body)}`;
}
/** A state we signed, of this kind, not run out and not used before (used now). */
export function readState(raw: unknown, kind: State["k"], now = Date.now()): State {
  const [body, sig] = typeof raw === "string" ? raw.split(".") : [];
  if (!body || !sig || sig.length !== 43 || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(mac(body)))) throw new SocialError("SOCIAL_STATE");
  const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as State;
  if (s.k !== kind || typeof s.e !== "number" || s.e < now || used.has(s.n)) throw new SocialError("SOCIAL_STATE");
  for (const [n, e] of used) if (e < now) used.delete(n);
  used.set(s.n, s.e);
  return s;
}

/* ---------------- Discord ---------------- */

/** Where the shopper is sent to sign in with Discord (who they are and their email, nothing else). */
export function discordUrl(clientId: string, redirectUri: string, back: string): string {
  if (!isCallback("discord", redirectUri)) throw new SocialError("SOCIAL_RETURN");
  const q = new URLSearchParams({ client_id: clientId, response_type: "code", scope: "identify email", redirect_uri: redirectUri, state: signState({ k: "discord", r: redirectUri, b: back }), prompt: "none" });
  return `https://discord.com/oauth2/authorize?${q}`;
}

export type DiscordProfile = { id: string; email: string; name: string };
/** Discord's code traded for who the shopper is. */
export async function discordProfile(code: string, state: State, clientId: string, secret: string): Promise<DiscordProfile> {
  const token = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: secret, grant_type: "authorization_code", code, redirect_uri: state.r }),
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });
  const t = (await token.json().catch(() => ({}))) as { access_token?: unknown };
  if (!token.ok || typeof t.access_token !== "string") throw new SocialError("DISCORD_REFUSED");
  const me = await fetch(`${DISCORD_API}/users/@me`, { headers: { authorization: `Bearer ${t.access_token}` }, signal: AbortSignal.timeout(8000), redirect: "error" });
  const u = (await me.json().catch(() => ({}))) as { id?: unknown; email?: unknown; verified?: unknown; global_name?: unknown; username?: unknown };
  if (!me.ok || typeof u.id !== "string" || !/^\d{15,22}$/.test(u.id)) throw new SocialError("DISCORD_REFUSED");
  if (typeof u.email !== "string" || u.verified !== true) throw new SocialError("DISCORD_EMAIL");
  const name = typeof u.global_name === "string" && u.global_name.trim() ? u.global_name : typeof u.username === "string" ? u.username : "";
  return { id: u.id, email: u.email.trim().toLowerCase(), name: name.trim().slice(0, 80) };
}

/* ---------------- Steam ---------------- */

/** Where a signed-in shopper is sent to link their Steam account. */
export function steamUrl(userId: string, returnTo: string, back: string): string {
  if (!isCallback("steam", returnTo)) throw new SocialError("SOCIAL_RETURN");
  const state = signState({ k: "steam", r: returnTo, b: back, u: userId });
  const ret = `${returnTo}?state=${encodeURIComponent(state)}`;
  const q = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": ret,
    "openid.realm": new URL(returnTo).origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID}?${q}`;
}

/** Steam's answer, asked back of Steam itself: the SteamID64 it vouches for. */
export async function steamId(params: Record<string, string>, state: State): Promise<string> {
  const ret = params["openid.return_to"] ?? "";
  if (params["openid.mode"] !== "id_res" || !ret.startsWith(`${state.r}?`) || params["openid.op_endpoint"] !== STEAM_OPENID) throw new SocialError("STEAM_REFUSED");
  const claimed = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(params["openid.claimed_id"] ?? "");
  if (!claimed || params["openid.identity"] !== params["openid.claimed_id"]) throw new SocialError("STEAM_REFUSED");
  const ask = new URLSearchParams(Object.entries(params).filter(([k]) => k.startsWith("openid.")));
  ask.set("openid.mode", "check_authentication");
  const res = await fetch(STEAM_OPENID, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: ask, signal: AbortSignal.timeout(8000), redirect: "error" });
  const said = await res.text().catch(() => "");
  if (!res.ok || !/(^|\n)is_valid:true(\n|$)/.test(said)) throw new SocialError("STEAM_REFUSED");
  return claimed[1];
}

/* ---------------- A Discord server's online count ---------------- */

/** An invite's code from its link (discord.gg/abc, discord.com/invite/abc); null: not one. */
export function inviteCode(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const m = /^https:\/\/(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]{2,40})\/?$/.exec(url.trim());
  return m ? m[1] : null;
}
const counts = new Map<string, { at: number; v: { online: number; members: number } | null }>();
/** How many are on the server's Discord now, and in it (Discord's public invite answer; asked at most every 5 minutes). */
export async function discordCounts(url: unknown, now = Date.now()): Promise<{ online: number; members: number } | null> {
  const code = inviteCode(url);
  if (!code) return null;
  const kept = counts.get(code);
  if (kept && now - kept.at < 5 * 60_000) return kept.v;
  let v: { online: number; members: number } | null = null;
  try {
    const res = await fetch(`${DISCORD_API}/invites/${encodeURIComponent(code)}?with_counts=true`, { signal: AbortSignal.timeout(5000), redirect: "error" });
    const b = (await res.json().catch(() => ({}))) as { approximate_presence_count?: unknown; approximate_member_count?: unknown };
    if (res.ok && typeof b.approximate_presence_count === "number" && typeof b.approximate_member_count === "number") v = { online: b.approximate_presence_count, members: b.approximate_member_count };
  } catch {
    v = null;
  }
  counts.set(code, { at: now, v });
  return v;
}
/** For the tests: Discord is asked again. */
export const forgetDiscordCounts = () => counts.clear();
