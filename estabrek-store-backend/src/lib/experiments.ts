/**
 * A/B tests (admin → تجارب A/B). What can be tested:
 *   heroOpening  the home page opens with the scarf film or the photo
 *   motion       one of the shop's motion settings (frames a second, glass on phones…)
 * Running tests go to the shop with the public settings (site.experiments). The
 * shop picks A or B per visit in the browser and keeps it for that visit only
 * (sessionStorage; no cookie, nothing about the shopper), then reports, once per
 * visit and test: the visit, a bag add, an order (with its total). Bots and
 * repeats from the same visitor within half an hour are ignored. Counts add up
 * in memory and are saved every minute (background job abSave).
 */
import { z } from "zod";
import { prisma } from "./prisma.js";
import { isBot, storeDay, visitorOf } from "./popularity.js";
import { StorefrontMotionSchema } from "./storefrontMotion.js";

export const EXPERIMENT_KINDS = ["heroOpening", "motion"] as const;
export type ExperimentKind = (typeof EXPERIMENT_KINDS)[number];

/** The motion settings a test may change (the ones a shopper can feel). */
export const MOTION_TEST_FIELDS = ["maxFps", "adaptive", "phoneGlass", "desktopDpr", "phoneDpr", "lazyPercent", "prebuild3d", "keyframeSnap", "videoPreload", "maxStepMs"] as const;
export type MotionTestField = (typeof MOTION_TEST_FIELDS)[number];

const HeroValue = z.enum(["film", "photo"]);

/** A and B checked for what's tested; the same value twice is refused. */
export function checkValues(kind: ExperimentKind, field: string | null, a: unknown, b: unknown): { a: unknown; b: unknown } | string {
  let schema: z.ZodTypeAny;
  if (kind === "heroOpening") schema = HeroValue;
  else {
    if (!field || !(MOTION_TEST_FIELDS as readonly string[]).includes(field)) return "BAD_FIELD";
    schema = StorefrontMotionSchema.shape[field as MotionTestField];
  }
  const pa = schema.safeParse(a);
  const pb = schema.safeParse(b);
  if (!pa.success || !pb.success) return "BAD_VALUE";
  if (JSON.stringify(pa.data) === JSON.stringify(pb.data)) return "SAME_VALUES";
  return { a: pa.data, b: pb.data };
}

/** Only one running test per thing tested. */
export const slotOf = (e: { kind: string; field: string | null }) => (e.kind === "motion" ? `motion:${e.field}` : e.kind);

/* ---------------- What the shop gets ---------------- */

export type PublicTest = { id: string; kind: ExperimentKind; field: string | null; a: unknown; b: unknown; split: number };

let running = new Map<string, PublicTest>();
let loadedAt = 0;
let loading: Promise<void> | null = null;

export function loadRunningTests(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const rows = await prisma.experiment.findMany({ where: { status: "running" }, select: { id: true, kind: true, field: true, a: true, b: true, split: true } });
      running = new Map(rows.filter((r) => (EXPERIMENT_KINDS as readonly string[]).includes(r.kind)).map((r) => [r.id, { ...r, kind: r.kind as ExperimentKind }]));
      loadedAt = Date.now();
    } catch {
      // keep what we have
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** The running tests for the public settings (read again at most once a minute). */
export async function publicExperiments(): Promise<PublicTest[]> {
  if (!loadedAt || Date.now() - loadedAt > 60_000) await loadRunningTests();
  return [...running.values()];
}

/* ---------------- Counting ---------------- */

export const AbEventSchema = z.object({
  x: z.string().min(1).max(40),
  v: z.enum(["A", "B"]),
  k: z.enum(["visit", "bag", "order"]),
  /** An order's total. */
  a: z.number().min(0).max(1_000_000).optional(),
});
export const AbBodySchema = z.object({ e: z.array(AbEventSchema).min(1).max(10) }).strict();
export type AbEvent = z.infer<typeof AbEventSchema>;

type Agg = { visits: number; bags: number; orders: number; revenue: number };
const pending = new Map<string, Agg>();
const seen = new Map<string, number>();
const REPEAT_MS = 30 * 60_000;
const counters = { events: 0, bots: 0, repeats: 0, unknown: 0 };

export function noteAb(events: AbEvent[], who: { ip: string; userAgent: string }, now = Date.now()) {
  if (isBot(who.userAgent)) {
    counters.bots += events.length;
    return 0;
  }
  const visitor = visitorOf(who.ip, who.userAgent);
  const day = storeDay(now).toISOString().slice(0, 10);
  let counted = 0;
  for (const e of events) {
    if (!running.has(e.x)) {
      counters.unknown += 1;
      continue;
    }
    const key = `${visitor}|${e.x}|${e.k}`;
    const last = seen.get(key);
    if (last && now - last < REPEAT_MS) {
      counters.repeats += 1;
      continue;
    }
    seen.set(key, now);
    const pk = `${e.x}|${day}|${e.v}`;
    const agg = pending.get(pk) ?? { visits: 0, bags: 0, orders: 0, revenue: 0 };
    if (e.k === "visit") agg.visits += 1;
    else if (e.k === "bag") agg.bags += 1;
    else {
      agg.orders += 1;
      agg.revenue += e.a ?? 0;
    }
    pending.set(pk, agg);
    counted += 1;
  }
  counters.events += counted;
  if (seen.size > 50_000) for (const [k, t] of seen) if (now - t >= REPEAT_MS) seen.delete(k);
  return counted;
}

let flushing: Promise<number> | null = null;

/** Adds what came in to the days' rows (the background job abSave, every minute). */
export function flushAb(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    const batch = [...pending];
    pending.clear();
    let saved = 0;
    for (const [key, agg] of batch) {
      const [experimentId, day, variant] = key.split("|");
      const id = { experimentId, day: new Date(`${day}T00:00:00.000Z`), variant };
      try {
        await prisma.experimentDay.upsert({
          where: { experimentId_day_variant: id },
          create: { ...id, ...agg },
          update: { visits: { increment: agg.visits }, bags: { increment: agg.bags }, orders: { increment: agg.orders }, revenue: { increment: agg.revenue } },
        });
        saved += 1;
      } catch {
        // A test deleted meanwhile: its counts go. Anything else: next time.
        const exists = await prisma.experiment.count({ where: { id: experimentId } }).catch(() => 1);
        if (exists) {
          const back = pending.get(key) ?? { visits: 0, bags: 0, orders: 0, revenue: 0 };
          pending.set(key, { visits: back.visits + agg.visits, bags: back.bags + agg.bags, orders: back.orders + agg.orders, revenue: back.revenue + agg.revenue });
        }
      }
    }
    return saved;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export const abCounters = () => ({ ...counters, waiting: pending.size });

/** Each side's totals and its days. */
export async function experimentNumbers(ids: string[]) {
  if (!ids.length) return new Map<string, { A: Agg; B: Agg; days: Array<{ day: string; variant: string } & Agg> }>();
  await flushAb().catch(() => undefined);
  const rows = await prisma.experimentDay.findMany({ where: { experimentId: { in: ids } }, orderBy: { day: "asc" } });
  const out = new Map<string, { A: Agg; B: Agg; days: Array<{ day: string; variant: string } & Agg> }>();
  for (const id of ids) out.set(id, { A: { visits: 0, bags: 0, orders: 0, revenue: 0 }, B: { visits: 0, bags: 0, orders: 0, revenue: 0 }, days: [] });
  for (const r of rows) {
    const e = out.get(r.experimentId)!;
    const side = r.variant === "B" ? e.B : e.A;
    side.visits += r.visits;
    side.bags += r.bags;
    side.orders += r.orders;
    side.revenue += r.revenue;
    e.days.push({ day: r.day.toISOString().slice(0, 10), variant: r.variant, visits: r.visits, bags: r.bags, orders: r.orders, revenue: r.revenue });
  }
  return out;
}

/* ---------------- Tests ---------------- */

export function setRunningTestsForTests(tests: PublicTest[]) {
  running = new Map(tests.map((t) => [t.id, t]));
  loadedAt = Date.now();
}

export function resetAbForTests() {
  pending.clear();
  seen.clear();
  running = new Map();
  loadedAt = 0;
  counters.events = counters.bots = counters.repeats = counters.unknown = 0;
}

export const pendingAbForTests = () => new Map(pending);
