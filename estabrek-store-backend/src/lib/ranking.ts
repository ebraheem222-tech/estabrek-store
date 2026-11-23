/**
 * A game server site's rankings («الترتيب», wave G6a of docs/sites-300-plan.ar.md): its boards (a table its owner
 * edits: play time, money, a level, a lap…) and the players' numbers on them. Each board says how a player's numbers
 * add up: summed (play time, kills), their best (the highest level, the fastest lap), or their latest (money now).
 *
 * The numbers come from the game server's link (lib/gameLink.ts): it counts play time by itself (a minute for each
 * player online at each hello, on a board keyed "playtime") and sends the server's own numbers (POST /v1/link/scores,
 * from a FiveM script's exports['site-link']:score or Paper's /linkscore). A player has one row a day on a board and one
 * for all time, so a board stays small: day rows older than 35 days go. A page's «الترتيب» element shows a board's
 * best players today, this week (7 days), this month (30 days) or of all time, filled as the page is served.
 */
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { settingsFor } from "./siteSettings.js";

export const RANKING_LIMITS = { items: 200, online: 500, id: 80, name: 40, value: 1e12, size: 50, keepDays: 35 } as const;
export const WINDOWS = ["day", "week", "month", "all"] as const;
export type RankWindow = (typeof WINDOWS)[number];
export type BoardHow = "sum" | "best" | "latest";
export type Board = { key: string; title: unknown; unit: "minutes" | "number" | "lap"; how: BoardHow; best: "high" | "low" };
export type Rank = { n: number; name: string; value: number };
export type BoardView = { key: string; title: unknown; unit: Board["unit"]; best: Board["best"]; windows: Partial<Record<RankWindow, Rank[]>> };

const DAY = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);
/** Words in any language, or a plain value, as text. */
const textOf = (v: unknown): string => (typeof v === "string" ? v : v && typeof v === "object" ? String(Object.values(v as Record<string, unknown>).find((x) => typeof x === "string" && x.trim()) ?? "") : "");
/** A player's name as it may be shown: letters, no control characters, short. */
const cleanName = (v: unknown) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, RANKING_LIMITS.name) : "");
const cleanId = (v: unknown) => (typeof v === "string" && /^[\w:.\-]{1,80}$/.test(v) ? v : null);

type TableIds = { boards?: string; scores?: string };
async function rankTables(featureId: string): Promise<TableIds> {
  const f = await prisma.feature.findUnique({ where: { id: featureId }, select: { template: true } });
  const t = ((f?.template as { ids?: { table?: TableIds } } | null)?.ids?.table ?? {}) as TableIds;
  return { boards: t.boards, scores: t.scores };
}

/** A site's boards, by their key (only published rows; a board's choices fall back to «summed, highest first, a number»). */
export async function boardsOf(featureId: string, tables?: TableIds): Promise<Map<string, Board>> {
  const t = tables ?? (await rankTables(featureId));
  const out = new Map<string, Board>();
  if (!t.boards || !t.scores) return out;
  const rows = await prisma.collectionItem.findMany({ where: { collectionId: t.boards, deletedAt: null, status: "PUBLISHED" }, select: { data: true }, orderBy: { sort: "asc" } });
  for (const r of rows) {
    const d = (r.data ?? {}) as Record<string, unknown>;
    const key = textOf(d.key).trim();
    if (!/^[a-z0-9_-]{1,40}$/i.test(key) || out.has(key)) continue;
    const how: BoardHow = d.how === "best" || d.how === "latest" ? d.how : "sum";
    const unit: Board["unit"] = d.unit === "minutes" || d.unit === "lap" ? d.unit : "number";
    out.set(key, { key, title: d.title ?? key, unit, how, best: d.best === "low" ? "low" : "high" });
  }
  return out;
}

/* ---------------- Writing numbers ---------------- */

type Said = { board: Board; id: string; name: string; value: number };
/** A numeric value of a row's data, or NULL when it isn't one (an owner may have typed anything). */
const num = (expr: Prisma.Sql) => Prisma.sql`(CASE WHEN (${expr}) ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (${expr})::numeric ELSE NULL END)`;
const OLD = num(Prisma.sql`"CollectionItem"."data"->>'value'`);
const NEW = Prisma.sql`(EXCLUDED."data"->>'value')::numeric`;
const MERGE: Record<string, Prisma.Sql> = {
  sum: Prisma.sql`COALESCE(${OLD}, 0) + ${NEW}`,
  high: Prisma.sql`GREATEST(COALESCE(${OLD}, ${NEW}), ${NEW})`,
  low: Prisma.sql`LEAST(COALESCE(${OLD}, ${NEW}), ${NEW})`,
  latest: NEW,
};
const mergeOf = (b: Board) => (b.how === "sum" ? "sum" : b.how === "latest" ? "latest" : b.best);
/** Two numbers for the same row in one call, put together as the board adds them up. */
const combine = (how: string, a: number, b: number) => (how === "sum" ? a + b : how === "high" ? Math.max(a, b) : how === "low" ? Math.min(a, b) : b);

const pruned = new Map<string, string>();
/** Each player's row for today and for all time on its board, written once (a row the owner put in the trash starts over). */
async function write(scores: string, said: Said[], now: number): Promise<number> {
  const day = isoDay(now);
  type Row = { how: string; slug: string; data: Record<string, unknown> };
  const rows = new Map<string, Row>();
  for (const s of said) {
    const how = mergeOf(s.board);
    const who = createHash("sha256").update(s.id).digest("hex").slice(0, 16);
    for (const span of ["day", "all"] as const) {
      const slug = `${s.board.key}-${span === "day" ? day : "all"}-${who}`;
      const had = rows.get(slug);
      const value = had ? combine(how, had.data.value as number, s.value) : s.value;
      const player = s.name || textOf((had?.data.player as unknown) ?? "") || "?";
      rows.set(slug, { how, slug, data: { board: s.board.key, player: { ar: player, en: player, he: player }, playerId: s.id, span, day: span === "day" ? day : null, value } });
    }
  }
  const byHow = new Map<string, Row[]>();
  for (const r of rows.values()) byHow.set(r.how, [...(byHow.get(r.how) ?? []), r]);
  for (const [how, list] of byHow) {
    const values = list.map((r) => Prisma.sql`(${`c${randomUUID().replace(/-/g, "")}`}, ${scores}, ${r.slug}, 'PUBLISHED'::"PageStatus", ${JSON.stringify(r.data)}::jsonb, now(), now())`);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "CollectionItem" ("id", "collectionId", "slug", "status", "data", "createdAt", "updatedAt") VALUES ${Prisma.join(values)}
      ON CONFLICT ("collectionId", "slug") DO UPDATE SET
        "data" = jsonb_set(jsonb_set("CollectionItem"."data", '{value}', to_jsonb(CASE WHEN "CollectionItem"."deletedAt" IS NOT NULL THEN ${NEW} ELSE ${MERGE[how]} END)), '{player}', EXCLUDED."data"->'player'),
        "updatedAt" = now(), "deletedAt" = NULL`);
  }
  // Once a day: day rows past the longest window go (a player's all-time row stays).
  if (pruned.get(scores) !== day) {
    pruned.set(scores, day);
    await prisma.$executeRaw(Prisma.sql`DELETE FROM "CollectionItem" WHERE "collectionId" = ${scores} AND "data"->>'span' = 'day' AND "data"->>'day' < ${isoDay(now - RANKING_LIMITS.keepDays * DAY)}`);
  }
  forgetRanks(scores);
  return said.length;
}

/** The game server's numbers (POST /v1/link/scores): each on a board the site has, for a player by their game id. */
export async function addScores(featureId: string, items: unknown, now = Date.now()): Promise<{ kept: number; skipped: number }> {
  const list = Array.isArray(items) ? items.slice(0, RANKING_LIMITS.items) : [];
  const t = await rankTables(featureId);
  const boards = await boardsOf(featureId, t);
  const said: Said[] = [];
  for (const x of list) {
    const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const p = (r.player && typeof r.player === "object" ? r.player : {}) as Record<string, unknown>;
    const board = boards.get(typeof r.board === "string" ? r.board : "");
    const id = cleanId(p.id);
    const value = typeof r.value === "number" && Number.isFinite(r.value) && Math.abs(r.value) <= RANKING_LIMITS.value ? Math.round(r.value * 1000) / 1000 : null;
    if (board && id && value !== null) said.push({ board, id, name: cleanName(p.name), value });
  }
  const kept = said.length && t.scores ? await write(t.scores, said, now) : 0;
  return { kept, skipped: (Array.isArray(items) ? items.length : 0) - kept };
}

/**
 * Play time, counted by the link's hello: a minute for each player online, on the site's "playtime" board (summed),
 * once a minute however often the server says hello (`last`: its previous hello).
 */
export async function countPlaytime(featureId: string, online: unknown, last: Date | null, now = Date.now()): Promise<number> {
  if (!Array.isArray(online) || !online.length || (last && now - last.getTime() < 50_000)) return 0;
  const t = await rankTables(featureId);
  const board = (await boardsOf(featureId, t)).get("playtime");
  if (!board || board.how !== "sum" || !t.scores) return 0;
  const seen = new Map<string, Said>();
  for (const x of online.slice(0, RANKING_LIMITS.online)) {
    const p = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const id = cleanId(p.id);
    if (id) seen.set(id, { board, id, name: cleanName(p.name), value: 1 });
  }
  return seen.size ? write(t.scores, [...seen.values()], now) : 0;
}

/* ---------------- Reading a board ---------------- */

const kept = new Map<string, { at: number; v: BoardView | null }>();
/** For the tests (and a board just changed): read again. */
export const forgetRanks = (scores?: string) => (scores ? [...kept.keys()].filter((k) => k.startsWith(`${scores}|`)).forEach((k) => kept.delete(k)) : kept.clear());

/** A board's best players in each window asked (kept a minute). */
export async function boardView(featureId: string, key: string, windows: RankWindow[], size: number, now = Date.now()): Promise<BoardView | null> {
  const t = await rankTables(featureId);
  if (!t.scores) return null;
  const memo = `${t.scores}|${key}|${windows.join(",")}|${size}`;
  const had = kept.get(memo);
  if (had && now - had.at < 60_000) return had.v;
  const board = (await boardsOf(featureId, t)).get(key);
  let v: BoardView | null = null;
  if (board) {
    const value = num(Prisma.sql`"data"->>'value'`);
    const agg = board.how === "sum" ? Prisma.sql`SUM(${value})` : board.how === "latest" ? Prisma.sql`(array_agg(${value} ORDER BY "data"->>'day' DESC))[1]` : board.best === "low" ? Prisma.sql`MIN(${value})` : Prisma.sql`MAX(${value})`;
    const order = board.best === "low" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const out: BoardView["windows"] = {};
    for (const w of windows) {
      const since = w === "day" ? isoDay(now) : w === "week" ? isoDay(now - 6 * DAY) : isoDay(now - 29 * DAY);
      const where = w === "all" ? Prisma.sql`"data"->>'span' = 'all'` : Prisma.sql`"data"->>'span' = 'day' AND "data"->>'day' >= ${since}`;
      const rows = await prisma.$queryRaw<Array<{ name: unknown; value: unknown }>>(Prisma.sql`
        SELECT (array_agg("data"->'player' ORDER BY "updatedAt" DESC))[1] AS name, ${agg} AS value
        FROM "CollectionItem"
        WHERE "collectionId" = ${t.scores} AND "deletedAt" IS NULL AND "data"->>'board' = ${key} AND ${where}
        GROUP BY "data"->>'playerId'
        HAVING ${agg} IS NOT NULL
        ORDER BY value ${order}
        LIMIT ${size}`);
      out[w] = rows.map((r, i) => ({ n: i + 1, name: textOf(r.name) || "?", value: Number(r.value) }));
    }
    v = { key, title: board.title, unit: board.unit, best: board.best, windows: out };
  }
  kept.set(memo, { at: now, v });
  return v;
}

type Node = { type?: string; props?: Record<string, unknown>; children?: Node[] };
/** A site's page as the shop gets it: each «الترتيب» element with its board's best players now. */
export async function withRanking<T>(tree: T, of: { kind: "page" | "table"; id: string }): Promise<T> {
  if (!tree || typeof tree !== "object" || !JSON.stringify(tree).includes('"leaderboard"')) return tree;
  const featureId = (await settingsFor(of.kind, of.id))?.featureId;
  const views = new Map<Node, BoardView | null>();
  const visit = async (n: Node) => {
    if (n.type === "leaderboard") {
      const p = n.props ?? {};
      const asked = Array.isArray(p.windows) ? (p.windows as unknown[]).filter((w): w is RankWindow => WINDOWS.includes(w as RankWindow)) : [];
      const size = typeof p.size === "number" && Number.isInteger(p.size) ? Math.min(Math.max(p.size, 3), RANKING_LIMITS.size) : 10;
      views.set(n, featureId && typeof p.board === "string" ? await boardView(featureId, p.board, asked.length ? [...new Set(asked)] : ["week", "month", "all"], size) : null);
    }
    for (const c of n.children ?? []) await visit(c);
  };
  const root = (tree as { root?: Node }).root;
  if (!root) return tree;
  await visit(root);
  const walk = (n: Node): Node => ({ ...n, ...(views.has(n) ? { props: { ...n.props, ranks: views.get(n) } } : {}), ...(Array.isArray(n.children) ? { children: n.children.map(walk) } : {}) });
  return { ...(tree as object), root: walk(root) } as T;
}
