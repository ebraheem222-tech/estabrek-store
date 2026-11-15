/**
 * The run log (E0.2; admin → سجل التشغيل): every time the server did something on its own, kept
 * in one table so a restart doesn't wipe it: a background job's run, an automation's action, a
 * webhook taken in (and later a queued task, a function).
 *
 * A run that failed, or that was asked for (by the admin, by an event, at start), gets a row of
 * its own. A job's timer runs that went fine are too many to keep one by one (some jobs run every
 * half minute: thousands a day), so they are folded: one row per job per hour that says how many
 * times it ran, what they did together (their counts added up) and when last. That row is written
 * at most once a minute, and when the server stops.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export const RUN_KINDS = ["job", "automation", "webhook", "task", "function"] as const;
export type RunKind = (typeof RUN_KINDS)[number];
export type RunIn = {
  kind: RunKind;
  /** Which one: the job's name, the rule's name, the webhook's address. */
  name: string;
  /** Its id, when the name may change (a rule's). */
  ref?: string | null;
  /** What started it: "start" | "schedule" | "event" | "admin" | "test", a rule's trigger, a request's method. */
  trigger?: string | null;
  /** What it was about (an order, a size…), when there is one. */
  subject?: string | null;
  startedAt: number | Date;
  ms: number;
  ok: boolean;
  /** What it did: counts ({ sent: 3 }) or a few words ({ did: "…" }). */
  result?: unknown;
  error?: string | null;
};

export const RUN_KEEP_DAYS = 30;
/** Never more than this many rows, whatever their age. */
export const RUN_KEEP_ROWS = 200_000;
const HOUR = 3_600_000;
const FLUSH_EVERY_MS = 60_000;

type Fold = { id: string | null; kind: RunKind; name: string; hour: number; firstAt: number; lastAt: number; times: number; ms: number; /** What its runs did, added up. */ sum: Record<string, number>; dirty: boolean };
const folds = new Map<string, Fold>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let writing: Promise<unknown> = Promise.resolve();

const text = (v: unknown, max: number) => (v == null || v === "" ? null : String(v).slice(0, max));
const at = (v: number | Date) => (v instanceof Date ? v : new Date(v));

/** Did the run do anything? (Counts that are all zero, or nothing at all, didn't.) */
export function didSomething(result: unknown): boolean {
  if (result == null) return false;
  if (typeof result !== "object") return true;
  const values = Object.values(result as Record<string, unknown>);
  return values.some((v) => (typeof v === "number" ? v !== 0 : v != null && v !== "" && v !== false));
}

/** A job's timer run that went fine: folded with the others of its hour. */
export const isFolded = (run: RunIn) => run.kind === "job" && run.ok && run.trigger === "schedule";

function later<T>(work: () => Promise<T>): Promise<T | undefined> {
  // One write after another (a fold's row is made once, then changed), and never a rejection for the caller.
  const next = writing.then(work).catch((e) => {
    console.error("[runs] not written:", e instanceof Error ? e.message : e);
    return undefined;
  });
  writing = next;
  return next;
}

async function writeFold(f: Fold) {
  if (!f.dirty) return;
  f.dirty = false;
  const data = { times: f.times, ms: f.ms, lastAt: new Date(f.lastAt), ...(didSomething(f.sum) ? { result: f.sum } : {}) };
  if (f.id) await prisma.run.update({ where: { id: f.id }, data });
  else f.id = (await prisma.run.create({ data: { kind: f.kind, name: f.name, trigger: "schedule", startedAt: new Date(f.firstAt), ok: true, ...data }, select: { id: true } })).id;
}

/** What is folded and not yet written goes to the table (every minute, and when the server stops). */
export function flushRuns(): Promise<unknown> {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  const pending = [...folds.values()].filter((f) => f.dirty);
  // A fold whose hour is over and is written is done with.
  const hour = Math.floor(Date.now() / HOUR);
  for (const [key, f] of folds) if (f.hour < hour && !f.dirty) folds.delete(key);
  if (!pending.length) return writing;
  return later(async () => {
    for (const f of pending) await writeFold(f);
  });
}

function fold(run: RunIn) {
  const started = at(run.startedAt).getTime();
  const hour = Math.floor(started / HOUR);
  const key = `${run.kind}:${run.name}`;
  let f = folds.get(key);
  if (!f || f.hour !== hour) {
    // The hour turned: the last one's row is finished, a new one starts.
    if (f?.dirty) {
      const done = f;
      void later(() => writeFold(done));
    }
    f = { id: null, kind: run.kind, name: run.name, hour, firstAt: started, lastAt: started, times: 0, ms: 0, sum: {}, dirty: false };
    folds.set(key, f);
  }
  f.times += 1;
  f.ms += Math.max(0, Math.round(run.ms));
  if (run.result && typeof run.result === "object") for (const [k, v] of Object.entries(run.result as Record<string, unknown>)) if (typeof v === "number" && Number.isFinite(v)) f.sum[k] = (f.sum[k] ?? 0) + v;
  f.lastAt = Math.max(f.lastAt, started);
  f.dirty = true;
  if (!flushTimer) {
    flushTimer = setTimeout(() => void flushRuns(), FLUSH_EVERY_MS);
    flushTimer.unref?.();
  }
}

/** A run, written to the log. Never throws, and the caller never waits for it. */
export function recordRun(run: RunIn): void {
  try {
    if (isFolded(run)) return fold(run);
    const data: Prisma.RunCreateInput = {
      kind: run.kind,
      name: run.name.slice(0, 120),
      ref: text(run.ref, 64),
      trigger: text(run.trigger, 60),
      subject: text(run.subject, 200),
      startedAt: at(run.startedAt),
      ms: Math.max(0, Math.round(run.ms)),
      ok: run.ok,
      ...(run.result != null && didSomething(run.result) ? { result: run.result as Prisma.InputJsonValue } : {}),
      error: text(run.error, 500),
    };
    void later(() => prisma.run.create({ data }));
  } catch (e) {
    console.error("[runs] not written:", e instanceof Error ? e.message : e);
  }
}

/** Old runs go (the job "runsClean"): past their days, and anything beyond the most rows kept. */
export async function cleanRuns(now = Date.now()): Promise<{ removed: number }> {
  const old = await prisma.run.deleteMany({ where: { startedAt: { lt: new Date(now - RUN_KEEP_DAYS * 86_400_000) } } });
  let removed = old.count;
  const count = await prisma.run.count();
  if (count > RUN_KEEP_ROWS) {
    const edge = await prisma.run.findFirst({ orderBy: { startedAt: "desc" }, skip: RUN_KEEP_ROWS, select: { startedAt: true } });
    if (edge) removed += (await prisma.run.deleteMany({ where: { startedAt: { lte: edge.startedAt } } })).count;
  }
  return { removed };
}

/* ---------------- For the admin ---------------- */

export type RunsQuery = { kind?: RunKind; name?: string; ok?: boolean; /** Runs that started before this moment (the page after). */ before?: Date; limit: number };

const ROW = { id: true, kind: true, name: true, ref: true, trigger: true, subject: true, startedAt: true, lastAt: true, times: true, ms: true, ok: true, result: true, error: true } as const;

/** A page of the log, newest first. */
export async function listRuns(q: RunsQuery) {
  const rows = await prisma.run.findMany({
    where: { ...(q.kind ? { kind: q.kind } : {}), ...(q.name ? { name: q.name } : {}), ...(q.ok === undefined ? {} : { ok: q.ok }), ...(q.before ? { startedAt: { lt: q.before } } : {}) },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: q.limit + 1,
    select: ROW,
  });
  const more = rows.length > q.limit;
  const runs = more ? rows.slice(0, q.limit) : rows;
  return { runs, next: more ? runs[runs.length - 1].startedAt : null };
}

/** The last day in numbers: how many runs, how many failed, and what is failing. */
export async function runsSummary(now = Date.now()) {
  const since = new Date(now - 86_400_000);
  const [byKind, failing, first] = await Promise.all([
    prisma.run.groupBy({ by: ["kind", "ok"], where: { startedAt: { gte: since } }, _sum: { times: true }, _count: { _all: true } }),
    prisma.run.groupBy({ by: ["kind", "name"], where: { startedAt: { gte: since }, ok: false }, _count: { _all: true }, _max: { startedAt: true }, orderBy: { _count: { id: "desc" } }, take: 8 }),
    prisma.run.findFirst({ orderBy: { startedAt: "asc" }, select: { startedAt: true } }),
  ]);
  const kinds: Record<string, { runs: number; failures: number }> = {};
  for (const g of byKind) {
    const k = (kinds[g.kind] ??= { runs: 0, failures: 0 });
    k.runs += g._sum.times ?? g._count._all;
    if (!g.ok) k.failures += g._count._all;
  }
  const last = failing.length
    ? await prisma.run.findMany({ where: { ok: false, OR: failing.map((f) => ({ kind: f.kind, name: f.name, startedAt: f._max.startedAt ?? undefined })) }, select: { kind: true, name: true, error: true, startedAt: true } })
    : [];
  return {
    since,
    /** The log's own first row: how far back it goes. */
    from: first?.startedAt ?? null,
    keepDays: RUN_KEEP_DAYS,
    runs: Object.values(kinds).reduce((n, k) => n + k.runs, 0),
    failures: Object.values(kinds).reduce((n, k) => n + k.failures, 0),
    kinds,
    failing: failing.map((f) => ({ kind: f.kind, name: f.name, failures: f._count._all, lastAt: f._max.startedAt, error: last.find((l) => l.kind === f.kind && l.name === f.name)?.error ?? null })),
  };
}

/** Tests: nothing folded, nothing waiting. */
export async function resetRunsForTests() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  await writing.catch(() => undefined);
  folds.clear();
}
