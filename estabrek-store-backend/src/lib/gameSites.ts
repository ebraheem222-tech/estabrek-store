/**
 * The whole sites that are game servers (wave G1 of docs/sites-300-plan.ar.md): a site whose settings declare
 * "game" (fivem, minecraft, bedrock, steam) and "serverAddress". Once a minute our server asks each one that is on
 * (lib/gameStatus.ts) and keeps the answer (GameSample, two days). Its pages show it in their «حالة السيرفر»
 * elements (filled as the page is served, then asked again by the shop every minute), and its panel draws the last
 * 24 hours.
 */
import { prisma } from "./prisma.js";
import { allSiteSettings, settingsFor, settingsOfFeature, type SiteSettings } from "./siteSettings.js";
import { GAME_LIMITS, isGame, joinOf, readStatus, type Game, type GameStatus } from "./gameStatus.js";

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

/** One site read now and kept. */
export async function readSite(featureId: string, opts: { allowPrivate?: boolean } = {}): Promise<GameStatus | null> {
  const site = gameOf(await settingsOfFeature(featureId));
  if (!site) return null;
  const status = await readStatus(site.game, site.address, { allowPrivate: opts.allowPrivate ?? allowPrivate() });
  await prisma.gameSample.create({ data: { featureId, online: status.online, players: status.players, max: status.max, name: status.name, map: status.map, version: status.version, ms: status.ms } });
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
};

const views = new Map<string, { at: number; view: GameView }>();
const forgetView = (featureId: string) => views.delete(featureId);

/** A game site's status as its pages and its panel show it (null: not a game site). Kept 20 seconds. */
export async function gameView(featureId: string, now = Date.now()): Promise<GameView | null> {
  const kept = views.get(featureId);
  if (kept && now - kept.at < 20_000) return kept.view;
  const site = gameOf(await settingsOfFeature(featureId));
  if (!site) return null;
  const since = new Date(Math.floor(now / HOUR) * HOUR - 23 * HOUR);
  const samples = await prisma.gameSample.findMany({ where: { featureId, at: { gte: since } }, orderBy: { at: "asc" }, select: { at: true, online: true, players: true, max: true, name: true, map: true, version: true } });
  const last = samples.at(-1) ?? (await prisma.gameSample.findFirst({ where: { featureId }, orderBy: { at: "desc" } }));
  const history = Array.from({ length: 24 }, (_, k) => {
    const from = since.getTime() + k * HOUR;
    const inHour = samples.filter((s) => s.at.getTime() >= from && s.at.getTime() < from + HOUR);
    return { hour: new Date(from).toISOString(), players: inHour.length ? Math.max(...inHour.map((s) => (s.online ? s.players ?? 0 : 0))) : null, online: inHour.length ? inHour.some((s) => s.online) : null };
  });
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
  };
  views.set(featureId, { at: now, view });
  return view;
}

type Node = { type?: string; props?: Record<string, unknown>; children?: Node[] };
/** A page of a game site as the shop gets it: its «حالة السيرفر» elements with the status now (the shop asks again every minute). */
export async function withGameStatus<T>(tree: T, of: { kind: "page" | "table"; id: string }): Promise<T> {
  if (!tree || typeof tree !== "object" || !JSON.stringify(tree).includes('"gameStatus"')) return tree;
  const s = await settingsFor(of.kind, of.id);
  const view = s ? await gameView(s.featureId) : null;
  const walk = (n: Node): Node => ({ ...n, ...(n.type === "gameStatus" ? { props: { ...n.props, live: view } } : {}), ...(Array.isArray(n.children) ? { children: n.children.map(walk) } : {}) });
  const root = (tree as { root?: Node }).root;
  return root ? ({ ...(tree as object), root: walk(root) } as T) : tree;
}
