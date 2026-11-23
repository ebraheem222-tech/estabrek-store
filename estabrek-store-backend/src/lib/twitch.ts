/**
 * A game server site's streamers («الستريمرز», wave G6b of docs/sites-300-plan.ar.md): the people who stream its
 * server, a table its owner edits (a name, their Twitch channel, a picture, a line about them). Who is live now comes
 * from Twitch's own API (Helix) with the owner's app keys (the site's settings «Client ID» and «Client Secret», from
 * dev.twitch.tv; they stay on the server): an app token (kept until it is about to run out), who of them streams now
 * (kept 2 minutes) and their pictures (kept an hour). Without keys the page lists them with their channels, and says
 * nothing of who is live. A page's «الستريمرز» element gets the list filled as the page is served, the live first.
 */
import { prisma } from "./prisma.js";
import { settingsFor, settingsOfFeature, type SiteSettings } from "./siteSettings.js";

export const TWITCH_LIMITS = { streamers: 60, timeoutMs: 6_000, liveMs: 2 * 60_000, picturesMs: 60 * 60_000 } as const;
const LOGIN = /^[a-z0-9_]{3,25}$/;
export type Streamer = { name: string; login: string | null; url: string | null; picture: string | null; about: unknown; live: { title: string; game: string; viewers: number; since: string; thumb: string | null } | null };
export type Crew = { connected: boolean; failed: boolean; list: Streamer[] };

/** Words in any language, or a plain value, as text. */
const textOf = (v: unknown): string => (typeof v === "string" ? v : v && typeof v === "object" ? String(Object.values(v as Record<string, unknown>).find((x) => typeof x === "string" && x.trim()) ?? "") : "");
/** A Twitch channel as its owner may write it: a login, or the channel's address. */
export function twitchLogin(v: unknown): string | null {
  const t = textOf(v).trim().toLowerCase().replace(/^(https?:\/\/)?(www\.|m\.)?twitch\.tv\//, "").replace(/^@/, "").replace(/[/?#].*$/, "");
  return LOGIN.test(t) ? t : null;
}
const safeImage = (v: unknown) => (typeof v === "string" && /^https:\/\/static-cdn\.jtvnw\.net\//.test(v) ? v : null);

type Keys = { id: string; secret: string };
const keysOf = (s: SiteSettings | null): Keys | null => {
  const id = typeof s?.values.twitchClientId === "string" ? s.values.twitchClientId.trim() : "";
  const secret = typeof s?.values.twitchSecret === "string" ? s.values.twitchSecret.trim() : "";
  return /^[a-z0-9]{10,64}$/i.test(id) && /^[a-z0-9]{10,64}$/i.test(secret) ? { id, secret } : null;
};

const tokens = new Map<string, { token: string; until: number }>();
const live = new Map<string, { at: number; v: Map<string, Streamer["live"] & object> | null }>();
const pictures = new Map<string, { at: number; v: string | null }>();
/** For the tests (and keys just changed): Twitch is asked again. */
export const forgetTwitch = () => {
  tokens.clear();
  live.clear();
  pictures.clear();
};

async function ask(url: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TWITCH_LIMITS.timeoutMs) });
  } catch {
    return null;
  }
}
async function tokenFor(k: Keys, now: number): Promise<string | null> {
  const had = tokens.get(k.id);
  if (had && had.until > now) return had.token;
  const res = await ask("https://id.twitch.tv/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: k.id, client_secret: k.secret, grant_type: "client_credentials" }).toString() });
  const body = res?.ok ? ((await res.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown } | null) : null;
  if (typeof body?.access_token !== "string") return null;
  const life = typeof body.expires_in === "number" && body.expires_in > 0 ? body.expires_in * 1000 : 3_600_000;
  tokens.set(k.id, { token: body.access_token, until: now + life - 5 * 60_000 });
  return body.access_token;
}
async function helix(k: Keys, path: string, now: number): Promise<Array<Record<string, unknown>> | null> {
  const token = await tokenFor(k, now);
  if (!token) return null;
  const res = await ask(`https://api.twitch.tv/helix/${path}`, { headers: { "Client-Id": k.id, Authorization: `Bearer ${token}` } });
  if (res?.status === 401) tokens.delete(k.id);
  const body = res?.ok ? ((await res.json().catch(() => null)) as { data?: unknown } | null) : null;
  return Array.isArray(body?.data) ? (body.data as Array<Record<string, unknown>>) : null;
}

/** Who of these streams now (null: Twitch didn't answer, or the keys aren't good). */
async function liveNow(k: Keys, logins: string[], now: number) {
  const memo = `${k.id}|${logins.join(",")}`;
  const had = live.get(memo);
  if (had && now - had.at < TWITCH_LIMITS.liveMs) return had.v;
  const data = logins.length ? await helix(k, `streams?first=100&${logins.map((l) => `user_login=${l}`).join("&")}`, now) : [];
  const v = data
    ? new Map(data.filter((s) => s.type === "live" && typeof s.user_login === "string").map((s) => [String(s.user_login).toLowerCase(), { title: textOf(s.title).slice(0, 140), game: textOf(s.game_name).slice(0, 60), viewers: typeof s.viewer_count === "number" ? s.viewer_count : 0, since: textOf(s.started_at), thumb: safeImage(textOf(s.thumbnail_url).replace("{width}", "440").replace("{height}", "248")) }]))
    : null;
  live.set(memo, { at: now, v });
  return v;
}
/** Whether a site's Twitch keys are set (a channel isn't asked without them). */
export const hasTwitchKeys = (s: SiteSettings | null) => keysOf(s) !== null;
/**
 * A site's own channel now, as its status (wave G7c2: a streamer's site): live or not, how many watch, its title and its
 * game. Null: no keys (not asked). Throws when Twitch doesn't answer, so the status says why.
 */
export async function channelNow(s: SiteSettings | null, channel: string, now = Date.now()): Promise<{ online: boolean; players: number | null; max: null; name: string | null; map: string | null; version: null } | null> {
  const k = keysOf(s);
  if (!k) return null;
  const v = await liveNow(k, [channel], now);
  if (!v) throw new Error("Twitch didn't answer");
  const on = v.get(channel);
  return on ? { online: true, players: on.viewers, max: null, name: on.title || null, map: on.game || null, version: null } : { online: false, players: null, max: null, name: null, map: null, version: null };
}

/** Their pictures on Twitch, for those with none of their own on the site. */
async function picturesOf(k: Keys, logins: string[], now: number): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const missing = logins.filter((l) => {
    const had = pictures.get(l);
    if (had && now - had.at < TWITCH_LIMITS.picturesMs) {
      if (had.v) out.set(l, had.v);
      return false;
    }
    return true;
  });
  if (missing.length) {
    const data = await helix(k, `users?${missing.map((l) => `login=${l}`).join("&")}`, now);
    const got = new Map((data ?? []).map((u) => [textOf(u.login).toLowerCase(), safeImage(u.profile_image_url)]));
    for (const l of missing) {
      if (!data) continue;
      const pic = got.get(l) ?? null;
      pictures.set(l, { at: now, v: pic });
      if (pic) out.set(l, pic);
    }
  }
  return out;
}

/** A site's streamers now: their rows (published, in their order), each with their channel and whether they are live. */
export async function siteCrew(featureId: string, now = Date.now()): Promise<Crew | null> {
  const f = await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } });
  const table = (f?.template as { ids?: { table?: Record<string, string> } } | null)?.ids?.table?.streamers;
  if (!table) return null;
  const rows = await prisma.collectionItem.findMany({ where: { collectionId: table, deletedAt: null, status: "PUBLISHED" }, select: { data: true }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }], take: TWITCH_LIMITS.streamers });
  const keys = keysOf(await settingsOfFeature(featureId));
  const people = rows.map((r) => {
    const d = (r.data ?? {}) as Record<string, unknown>;
    const login = twitchLogin(d.twitch);
    const picture = typeof d.picture === "string" && /^(https:\/\/|\/)/.test(d.picture) ? d.picture : null;
    return { name: textOf(d.name).slice(0, 60) || login || "?", login, url: login ? `https://www.twitch.tv/${login}` : null, picture, about: d.about ?? null, live: null } as Streamer;
  });
  const logins = [...new Set(people.map((p) => p.login).filter((l): l is string => !!l))];
  let failed = false;
  if (keys && logins.length) {
    const on = await liveNow(keys, logins, now);
    failed = on === null;
    const pics = failed ? new Map<string, string>() : await picturesOf(keys, logins.filter((l) => !people.find((p) => p.login === l)?.picture), now);
    for (const p of people) {
      if (!p.login) continue;
      p.live = on?.get(p.login) ?? null;
      if (!p.picture) p.picture = pics.get(p.login) ?? null;
    }
  }
  // The live first, the most watched first; then the others in the owner's order.
  const list = people.map((p, i) => ({ p, i })).sort((a, b) => (b.p.live?.viewers ?? -1) - (a.p.live?.viewers ?? -1) || a.i - b.i).map((x) => x.p);
  return { connected: !!keys, failed, list };
}

type Node = { type?: string; props?: Record<string, unknown>; children?: Node[] };
/** A site's page as the shop gets it: each «الستريمرز» element with its streamers now. */
export async function withStreamers<T>(tree: T, of: { kind: "page" | "table"; id: string }): Promise<T> {
  if (!tree || typeof tree !== "object" || !JSON.stringify(tree).includes('"streamers"')) return tree;
  const featureId = (await settingsFor(of.kind, of.id))?.featureId;
  const crew = featureId ? await siteCrew(featureId) : null;
  // The shop learns nothing of the keys, only whether anyone is live.
  const shown = crew ? { live: crew.connected && !crew.failed, list: crew.list } : null;
  const walk = (n: Node): Node => ({ ...n, ...(n.type === "streamers" ? { props: { ...n.props, crew: shown } } : {}), ...(Array.isArray(n.children) ? { children: n.children.map(walk) } : {}) });
  const root = (tree as { root?: Node }).root;
  return root ? ({ ...(tree as object), root: walk(root) } as T) : tree;
}
