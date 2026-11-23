/**
 * The whole sites that are game servers (wave G1 of docs/sites-300-plan.ar.md): a site whose settings declare
 * "game" (fivem, minecraft, bedrock, steam) and "serverAddress". Once a minute our server asks each one that is on
 * (lib/gameStatus.ts) and keeps the answer (GameSample, two days). Its pages show it in their «حالة السيرفر»
 * elements (filled as the page is served, then asked again by the shop every minute), and its panel draws the last
 * 24 hours.
 *
 * A network or a community has servers of its own besides (wave G7b): the rows of its «السيرفرات» table, each with
 * its key, its game and, where players reach it directly, its address. One with an address is asked with the main one
 * and kept by its key; one without (a network's server behind its proxy) is known by its link's hello, sent by the
 * same name (lib/gameLink.ts). Its pages show them in their «السيرفرات» elements.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { allSiteSettings, settingsFor, settingsOfFeature, type SiteSettings } from "./siteSettings.js";
import { GAME_LIMITS, isGame, joinOf, readStatus, type Game, type GameStatus } from "./gameStatus.js";
import { discordCounts } from "./socialSignIn.js";
import { LINK_LIMITS, SERVER_NAME, heardOf } from "./gameLink.js";
import { channelNow, hasTwitchKeys } from "./twitch.js";

const HOUR = 3_600_000;
/** A game site's game and address, as its owner set them (null: not a game site, or no address yet). */
export function gameOf(s: SiteSettings | null): { game: Game; address: string } | null {
  if (!s) return null;
  const keys = new Set(s.decls.map((d) => d.key));
  if (!keys.has("game") || !keys.has("serverAddress")) return null;
  const game = s.values.game;
  const address = typeof s.values.serverAddress === "string" ? s.values.serverAddress.trim() : "";
  return isGame(game) && address ? { game, address } : null;
}

/** Private addresses are asked only where the server is told to (a local look at a game server on this computer); never in production. */
const allowPrivate = () => process.env.GAME_STATUS_PRIVATE === "true" && process.env.NODE_ENV !== "production";

/* ---------------- A site's own servers (wave G7b) ---------------- */

export const SUB_LIMITS = { servers: 12, together: 4 } as const;
/** One of a site's own servers, as its owner wrote it: its key (what its link says hello by), its words, its game, its address ("" behind the main one). */
export type SubServer = { key: string; title: unknown; line: unknown; hint: unknown; game: Game; address: string };
/** Words in any language, or a plain value, as text. */
const textOf = (v: unknown): string => (typeof v === "string" ? v : v && typeof v === "object" ? String(Object.values(v as Record<string, unknown>).find((x) => typeof x === "string" && x.trim()) ?? "") : "");

/** A site's own servers in its owner's order: the published rows of its «السيرفرات» table (12 at most; a row with no game of its own is the site's). */
export async function subServersOf(featureId: string, mainGame: Game): Promise<SubServer[]> {
  const f = await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } });
  const table = (f?.template as { ids?: { table?: { servers?: string } } } | null)?.ids?.table?.servers;
  if (!table) return [];
  const rows = await prisma.collectionItem.findMany({ where: { collectionId: table, deletedAt: null, status: "PUBLISHED" }, select: { data: true }, orderBy: { sort: "asc" }, take: 40 });
  const out: SubServer[] = [];
  for (const r of rows) {
    const d = (r.data ?? {}) as Record<string, unknown>;
    const key = textOf(d.key).trim().toLowerCase();
    if (!SERVER_NAME.test(key) || out.some((x) => x.key === key)) continue;
    out.push({ key, title: d.title ?? key, line: d.line ?? null, hint: d.hint ?? null, game: isGame(d.game) ? d.game : mainGame, address: textOf(d.address).trim() });
    if (out.length >= SUB_LIMITS.servers) break;
  }
  return out;
}

const sampleOf = (s: GameStatus) => ({ online: s.online, players: s.players, max: s.max, name: s.name, map: s.map, version: s.version, ms: s.ms });

/** One site read now and kept: its main server, then each of its own that has an address, a few at a time. */
export async function readSite(featureId: string, opts: { allowPrivate?: boolean } = {}): Promise<GameStatus | null> {
  const settings = await settingsOfFeature(featureId);
  const site = gameOf(settings);
  if (!site) return null;
  // A streamer's channel is asked with the site's own Twitch keys: without them it isn't asked (and nothing is kept).
  if (site.game === "twitch" && !hasTwitchKeys(settings)) return null;
  const allow = opts.allowPrivate ?? allowPrivate();
  const twitch = async (channel: string) => (await channelNow(settings, channel)) ?? Promise.reject(new Error("No Twitch keys"));
  const status = await readStatus(site.game, site.address, { allowPrivate: allow, twitch });
  await prisma.gameSample.create({ data: { featureId, ...sampleOf(status) } });
  const own = (await subServersOf(featureId, site.game)).filter((x) => x.address);
  for (let i = 0; i < own.length; i += SUB_LIMITS.together) {
    await Promise.all(own.slice(i, i + SUB_LIMITS.together).map(async (x) => {
      const got = await readStatus(x.game, x.address, { allowPrivate: allow, twitch }).catch(() => null);
      if (got) await prisma.gameSample.create({ data: { featureId, server: x.key, ...sampleOf(got) } });
    }));
  }
  forgetView(featureId);
  return status;
}

/** The job (lib/jobs.ts "gameStatus"): every game site that is on, read and kept; readings older than two days go. */
export async function readGameServers(): Promise<{ read: number; online: number; failed: number }> {
  const sites = (await allSiteSettings()).filter((s) => gameOf(s));
  const on = new Set((await prisma.feature.findMany({ where: { id: { in: sites.map((s) => s.featureId) }, enabled: true }, select: { id: true } })).map((f) => f.id));
  const counts = { read: 0, online: 0, failed: 0 };
  const todo = sites.filter((s) => on.has(s.featureId));
  // A few at a time: each waits a few seconds at most.
  for (let i = 0; i < todo.length; i += 5) {
    const got = await Promise.all(todo.slice(i, i + 5).map((s) => readSite(s.featureId).catch(() => null)));
    for (const g of got) {
      counts.read += 1;
      if (g?.online) counts.online += 1;
      else counts.failed += 1;
    }
  }
  await prisma.gameSample.deleteMany({ where: { at: { lt: new Date(Date.now() - GAME_LIMITS.keepHours * HOUR) } } });
  return counts;
}

/* ---------------- What a site shows ---------------- */

/** One of a site's own servers now: asked at its address, or heard from by its link (`from`); joined at its address, else the site's. */
export type SubView = {
  key: string;
  title: unknown;
  line: unknown;
  hint: unknown;
  game: Game;
  online: boolean | null;
  players: number | null;
  max: number | null;
  map: string | null;
  at: string | null;
  from: "asked" | "link" | null;
  join: { href: string | null; address: string };
};
export type GameView = {
  featureId: string;
  game: Game;
  online: boolean | null;
  players: number | null;
  max: number | null;
  name: string | null;
  map: string | null;
  version: string | null;
  at: string | null;
  join: { href: string | null; address: string };
  /** The last 24 hours, an hour each (the most that played; null: not read that hour). */
  history: Array<{ hour: string; players: number | null; online: boolean | null }>;
  /** Its Discord while its owner shows it: how many are on now and in it (Discord's public invite answer). */
  discord: { online: number; members: number } | null;
  /** Its own servers (a network's, a community's), in its owner's order; null: it has none. */
  servers: SubView[] | null;
};

type LastRow = { server: string; at: Date; online: boolean; players: number | null; max: number | null; map: string | null };
/** Each of a site's own servers now. */
async function subViews(featureId: string, main: { game: Game; address: string }, own: SubServer[], now: number): Promise<SubView[]> {
  const asked = own.filter((x) => x.address).map((x) => x.key);
  // The last reading of each, at once (the index on featureId, server, at).
  const last = asked.length
    ? await prisma.$queryRaw<LastRow[]>`SELECT DISTINCT ON ("server") "server", "at", "online", "players", "max", "map" FROM "GameSample" WHERE "featureId" = ${featureId} AND "server" IN (${Prisma.join(asked)}) ORDER BY "server", "at" DESC`
    : [];
  const byKey = new Map(last.map((r) => [r.server, r]));
  const link = own.some((x) => !x.address) ? await prisma.siteLink.findUnique({ where: { featureId }, select: { servers: true } }) : null;
  const heard = heardOf(link?.servers);
  return own.map((x) => {
    const base = { key: x.key, title: x.title, line: x.line, hint: x.hint, game: x.game, join: joinOf(x.game, x.address || main.address) };
    if (x.address) {
      const r = byKey.get(x.key);
      return { ...base, online: r ? r.online : null, players: r?.online ? r.players : null, max: r?.max ?? null, map: r?.map ?? null, at: r ? r.at.toISOString() : null, from: r ? "asked" : null };
    }
    // Behind the main one: up while its link said hello in the last minutes.
    const h = heard[x.key];
    if (!h) return { ...base, online: null, players: null, max: null, map: null, at: null, from: null };
    const up = now - Date.parse(h.at) <= LINK_LIMITS.freshMinutes * 60_000;
    return { ...base, online: up, players: up ? h.players : null, max: h.max, map: null, at: h.at, from: "link" };
  });
}

const views = new Map<string, { at: number; view: GameView }>();
const forgetView = (featureId: string) => views.delete(featureId);

/** A game site's status as its pages and its panel show it (null: not a game site). Kept 20 seconds. */
export async function gameView(featureId: string, now = Date.now()): Promise<GameView | null> {
  const kept = views.get(featureId);
  if (kept && now - kept.at < 20_000) return kept.view;
  const s = await settingsOfFeature(featureId);
  const site = gameOf(s);
  if (!site) return null;
  const since = new Date(Math.floor(now / HOUR) * HOUR - 23 * HOUR);
  // The main server's readings ("" is the main one; the site's own servers are kept by their keys).
  const samples = await prisma.gameSample.findMany({ where: { featureId, server: "", at: { gte: since } }, orderBy: { at: "asc" }, select: { at: true, online: true, players: true, max: true, name: true, map: true, version: true } });
  const last = samples.at(-1) ?? (await prisma.gameSample.findFirst({ where: { featureId, server: "" }, orderBy: { at: "desc" } }));
  const history = Array.from({ length: 24 }, (_, k) => {
    const from = since.getTime() + k * HOUR;
    const inHour = samples.filter((x) => x.at.getTime() >= from && x.at.getTime() < from + HOUR);
    return { hour: new Date(from).toISOString(), players: inHour.length ? Math.max(...inHour.map((x) => (x.online ? x.players ?? 0 : 0))) : null, online: inHour.length ? inHour.some((x) => x.online) : null };
  });
  const own = await subServersOf(featureId, site.game);
  const view: GameView = {
    featureId,
    game: site.game,
    online: last ? last.online : null,
    players: last?.online ? last.players : null,
    max: last?.max ?? null,
    name: last?.name ?? null,
    map: last?.map ?? null,
    version: last?.version ?? null,
    at: last ? last.at.toISOString() : null,
    join: joinOf(site.game, site.address),
    history,
    discord: s?.values.discordOn === true ? await discordCounts(s.values.discordUrl, now) : null,
    servers: own.length ? await subViews(featureId, site, own, now) : null,
  };
  views.set(featureId, { at: now, view });
  return view;
}

type Node = { type?: string; props?: Record<string, unknown>; children?: Node[] };
const LIVE_TYPES = new Set(["gameStatus", "serverList"]);
/** A page of a game site as the shop gets it: its «حالة السيرفر» and «السيرفرات» elements with the status now (the shop asks again every minute). */
export async function withGameStatus<T>(tree: T, of: { kind: "page" | "table"; id: string }): Promise<T> {
  if (!tree || typeof tree !== "object") return tree;
  const text = JSON.stringify(tree);
  if (!text.includes('"gameStatus"') && !text.includes('"serverList"')) return tree;
  const s = await settingsFor(of.kind, of.id);
  const view = s ? await gameView(s.featureId) : null;
  const walk = (n: Node): Node => ({ ...n, ...(n.type && LIVE_TYPES.has(n.type) ? { props: { ...n.props, live: view } } : {}), ...(Array.isArray(n.children) ? { children: n.children.map(walk) } : {}) });
  const root = (tree as { root?: Node }).root;
  return root ? ({ ...(tree as object), root: walk(root) } as T) : tree;
}
