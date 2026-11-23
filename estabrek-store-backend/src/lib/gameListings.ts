/**
 * A server list's servers (wave G7d2 of docs/sites-300-plan.ar.md: «قائمة سيرفرات»): owners add theirs to the site's
 * «listings» table, and each one the staff list is read by our server like any game server (lib/gameStatus.ts): a few
 * at a time with the game status job, each again after a few minutes, the oldest reading first. What it finds is
 * written beside the owner's words in the row (`live` on or off, `players`, `max`, `checked`), never as a change of
 * theirs: no function starts and nothing else in the row moves. The list's pages read the rows in the visitor's browser.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { readStatus, type Game } from "./gameStatus.js";

export const LISTING_LIMITS = { perRun: 20, together: 4, everyMinutes: 5, rows: 500 } as const;
/** The games a listed server may be: those asked at their own address. */
export const LISTED_GAMES: ReadonlySet<string> = new Set(["fivem", "minecraft", "bedrock", "steam"]);

const textOf = (v: unknown): string => (typeof v === "string" ? v : v && typeof v === "object" ? String(Object.values(v as Record<string, unknown>).find((x) => typeof x === "string" && x.trim()) ?? "") : "");
/** Private addresses only where the server is told to (a local look), never in production. */
const allowPrivate = () => process.env.GAME_STATUS_PRIVATE === "true" && process.env.NODE_ENV !== "production";

/** The «listings» tables of the server lists that are on. */
async function listingTables(): Promise<string[]> {
  const features = await prisma.feature.findMany({ where: { enabled: true }, select: { template: true } });
  return features.map((f) => (f.template as { ids?: { table?: { listings?: string } } } | null)?.ids?.table?.listings).filter((x): x is string => typeof x === "string" && !!x);
}

/** Each list's listed servers that are due, read and written into their rows. */
export async function readListings(now = Date.now(), opts: { allowPrivate?: boolean } = {}): Promise<{ read: number; online: number }> {
  const out = { read: 0, online: 0 };
  const allow = opts.allowPrivate ?? allowPrivate();
  const at = (d: Record<string, unknown>) => (typeof d.checked === "string" ? Date.parse(d.checked) : NaN);
  for (const table of await listingTables()) {
    const rows = await prisma.collectionItem.findMany({ where: { collectionId: table, status: "PUBLISHED", deletedAt: null }, select: { id: true, data: true }, take: LISTING_LIMITS.rows });
    const due = rows
      .map((r) => ({ id: r.id, d: (r.data ?? {}) as Record<string, unknown> }))
      .filter(({ d }) => d.state === "listed" && LISTED_GAMES.has(String(d.game)) && textOf(d.address).trim())
      .filter(({ d }) => Number.isNaN(at(d)) || now - at(d) >= LISTING_LIMITS.everyMinutes * 60_000 - 5_000)
      .sort((a, b) => (Number.isNaN(at(a.d)) ? 0 : at(a.d)) - (Number.isNaN(at(b.d)) ? 0 : at(b.d)))
      .slice(0, LISTING_LIMITS.perRun);
    for (let i = 0; i < due.length; i += LISTING_LIMITS.together) {
      await Promise.all(
        due.slice(i, i + LISTING_LIMITS.together).map(async ({ id, d }) => {
          const s = await readStatus(d.game as Game, textOf(d.address).trim(), { allowPrivate: allow });
          // Read again just before writing: the owner's words may have changed while it was asked.
          const fresh = await prisma.collectionItem.findUnique({ where: { id }, select: { data: true } });
          if (!fresh) return;
          const data = { ...((fresh.data ?? {}) as Record<string, unknown>), live: s.online ? "on" : "off", players: s.online ? s.players : null, max: s.max, checked: new Date(now).toISOString() };
          await prisma.collectionItem.update({ where: { id }, data: { data: data as Prisma.InputJsonValue } });
          out.read += 1;
          if (s.online) out.online += 1;
        }),
      );
    }
  }
  return out;
}
