/**
 * The home page's sections in numbers (admin → تجارب A/B → أقسام الرئيسية). The shop says, once per visit and
 * section: it was seen (at least 40% of it on screen for a second), something in it was tapped, and a piece was
 * added to the bag after a tap in it. Only the section's key goes out ("s:<section id>" or "b:<scene name>"): no
 * cookie, nothing about the shopper; browsers asking not to be tracked send nothing. Bots and repeats from the
 * same visitor within half an hour are ignored. Counts add up in memory and are saved every minute (background
 * job homeStatsSave), like the A/B tests' (experiments.ts).
 */
import { z } from "zod";
import { prisma } from "./prisma.js";
import { isBot, storeDay, visitorOf } from "./popularity.js";

export const HOME_KEY = /^(s:[A-Za-z0-9_-]{1,40}|b:[a-z]{1,20})$/;
export const HomeStatsBody = z
  .object({ e: z.array(z.object({ s: z.string().regex(HOME_KEY), k: z.enum(["seen", "tap", "bag"]) }).strict()).min(1).max(30) })
  .strict();
export type HomeEvent = z.infer<typeof HomeStatsBody>["e"][number];

type Agg = { seen: number; taps: number; bags: number };
const pending = new Map<string, Agg>();
const recent = new Map<string, number>();
const REPEAT_MS = 30 * 60_000;

export function noteHomeStats(events: HomeEvent[], who: { ip: string; userAgent: string }, now = Date.now()) {
  if (isBot(who.userAgent)) return 0;
  const visitor = visitorOf(who.ip, who.userAgent);
  const day = storeDay(now).toISOString().slice(0, 10);
  let counted = 0;
  for (const e of events) {
    const once = `${visitor}|${e.s}|${e.k}`;
    const last = recent.get(once);
    if (last && now - last < REPEAT_MS) continue;
    recent.set(once, now);
    const key = `${day}|${e.s}`;
    const agg = pending.get(key) ?? { seen: 0, taps: 0, bags: 0 };
    if (e.k === "seen") agg.seen += 1;
    else if (e.k === "tap") agg.taps += 1;
    else agg.bags += 1;
    pending.set(key, agg);
    counted += 1;
  }
  if (recent.size > 50_000) for (const [k, t] of recent) if (now - t >= REPEAT_MS) recent.delete(k);
  return counted;
}

let flushing: Promise<number> | null = null;

/** Adds what came in to the days' rows (every minute, and when the server stops). */
export function flushHomeStats(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    const batch = [...pending];
    pending.clear();
    let saved = 0;
    for (const [key, agg] of batch) {
      const [day, section] = key.split("|");
      const id = { day: new Date(`${day}T00:00:00.000Z`), section };
      try {
        await prisma.homeSectionDay.upsert({
          where: { day_section: id },
          create: { ...id, ...agg },
          update: { seen: { increment: agg.seen }, taps: { increment: agg.taps }, bags: { increment: agg.bags } },
        });
        saved += 1;
      } catch {
        const back = pending.get(key) ?? { seen: 0, taps: 0, bags: 0 };
        pending.set(key, { seen: back.seen + agg.seen, taps: back.taps + agg.taps, bags: back.bags + agg.bags });
      }
    }
    return saved;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Each section's totals over the last `days` store days. */
export async function homeSectionTotals(days: number, now = Date.now()) {
  await flushHomeStats().catch(() => undefined);
  const from = new Date(storeDay(now).getTime() - (days - 1) * 86_400_000);
  const rows = await prisma.homeSectionDay.groupBy({ by: ["section"], where: { day: { gte: from } }, _sum: { seen: true, taps: true, bags: true } });
  return new Map(rows.map((r) => [r.section, { seen: r._sum.seen ?? 0, taps: r._sum.taps ?? 0, bags: r._sum.bags ?? 0 }]));
}

/** Enough visits saw a section for its numbers to mean something. */
export const MIN_SEEN = 20;

/** How well a section turns a look into a tap and a bag (a bag counts three taps). */
export const sectionScore = (n: Agg) => (n.seen ? (n.taps + 3 * n.bags) / n.seen : 0);

/**
 * The order the numbers suggest: the first section (the opening) stays first; the sections with enough visits
 * are ranked by their score in the places they hold together; the others keep their places. Null when the
 * numbers say nothing new (fewer than two sections with enough visits, or the same order).
 */
export function suggestOrder(current: string[], totals: Map<string, Agg>): string[] | null {
  const slots: number[] = [];
  const ranked: string[] = [];
  current.forEach((key, i) => {
    const n = totals.get(key);
    if (i > 0 && n && n.seen >= MIN_SEEN) { slots.push(i); ranked.push(key); }
  });
  if (ranked.length < 2) return null;
  const order = [...ranked].sort((a, b) => sectionScore(totals.get(b)!) - sectionScore(totals.get(a)!) || ranked.indexOf(a) - ranked.indexOf(b));
  const out = [...current];
  slots.forEach((slot, j) => { out[slot] = order[j]; });
  return out.join() === current.join() ? null : out;
}

/* ---------------- Tests ---------------- */

export function resetHomeStatsForTests() {
  pending.clear();
  recent.clear();
}
