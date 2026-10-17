/**
 * Background jobs (admin → المهام بالخلفية): everything the server does on its
 * own, in one place: sending the queued messages, back-in-stock emails, the
 * daily backup, cleaning old request photos, saving popularity and shoppers'
 * speed, building the popular pages, sweeping the cache, converting videos.
 *
 * Each job registers once (src/jobs.ts) and runs here: on its timer (the next run
 * is set when the last one ends, so two runs of one job never overlap), on an
 * event (stock changed, the catalog changed…) or when the admin asks. Every run
 * is kept (the last 20 per job, since the server started): when, how long, what
 * it did, the error. From the admin a job can be paused and its timer changed;
 * that is saved with the performance settings (PerformanceSettings.data.jobs)
 * and survives restarts. A job the server's settings (env) turn off stays off.
 */
import { z } from "zod";
import { prisma } from "./prisma.js";
import { emitAutomation } from "./automations.js";

export type JobTrigger = "start" | "schedule" | "event" | "admin";
export type JobGroup = "messages" | "data" | "cache" | "media" | "selling" | "control";
/** What a run did, as counts (sent: 3, failed: 0…); the admin names them. */
export type JobCounts = Record<string, number>;

export type JobDef = {
  name: string;
  group: JobGroup;
  /** Time between runs, ms (the server's default); null = only on events or when asked. */
  everyMs: number | null;
  /** What the admin may set the timer to. */
  limits?: { min: number; max: number };
  /** The first run this long after start; null = a full interval after start. */
  firstMs?: number | null;
  /** Turned off by the server's settings: the reason (env name), or null. */
  offReason?: () => string | null;
  run: (trigger: JobTrigger) => Promise<JobCounts | null | void>;
  /** A run longer than this is shown as stuck (default 10 minutes, or 3 timers). */
  stuckMs?: number;
  canPause?: boolean;
  canRunNow?: boolean;
  /** Live numbers for the admin (e.g. waiting conversions). */
  live?: () => Record<string, number>;
};

export type JobRun = { at: string; ms: number; ok: boolean; trigger: JobTrigger; counts: JobCounts | null; error: string | null };

type State = {
  def: JobDef;
  runningSince: number | null;
  running: Promise<JobCounts | null> | null;
  timer: ReturnType<typeof setTimeout> | null;
  nextAt: number | null;
  runs: JobRun[];
  total: { runs: number; failures: number; ms: number };
  lastOkAt: number | null;
  lastError: { at: number; message: string } | null;
  failuresInRow: number;
};

const KEEP_RUNS = 20;
const jobs = new Map<string, State>();
let started = false;
let startedAt = Date.now();

/* ---------------- Settings from the admin ---------------- */

const JobSettingSchema = z.object({ paused: z.boolean().optional(), everyMs: z.number().int().min(1000).max(7 * 86400_000).optional() }).strict();
export const JobsConfigSchema = z.record(z.string().regex(/^[a-zA-Z]{2,40}$/), JobSettingSchema);
/** Only what the admin changed: { stockAlerts: { paused: true }, backup: { everyMs: 300000 } }. */
export type JobsConfig = z.infer<typeof JobsConfigSchema>;

export function mergeJobsConfig(saved: unknown): JobsConfig {
  const s = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {};
  const out: JobsConfig = {};
  for (const [name, v] of Object.entries(s)) {
    const ok = JobsConfigSchema.safeParse({ [name]: v });
    if (ok.success) out[name] = ok.data[name];
  }
  return out;
}

export function jobsChanges(a: JobsConfig, b: JobsConfig): string[] {
  const out: string[] = [];
  for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if ((a[name]?.paused ?? false) !== (b[name]?.paused ?? false)) out.push(`jobs.${name}.paused`);
    if ((a[name]?.everyMs ?? null) !== (b[name]?.everyMs ?? null)) out.push(`jobs.${name}.everyMs`);
  }
  return out;
}

let config: JobsConfig = {};

const paused = (s: State) => (s.def.canPause ?? true) && !!config[s.def.name]?.paused;

function everyOf(s: State): number | null {
  const d = s.def;
  if (d.everyMs == null) return null;
  const set = config[d.name]?.everyMs;
  if (set == null) return d.everyMs;
  const { min, max } = d.limits ?? { min: d.everyMs, max: d.everyMs };
  return Math.min(max, Math.max(min, set));
}

/** New settings (saved from the admin, or loaded): a changed timer counts from now. */
export function applyJobsConfig(next: JobsConfig) {
  const before = new Map([...jobs.values()].map((s) => [s.def.name, everyOf(s)]));
  config = next;
  if (!started) return;
  for (const s of jobs.values()) {
    const every = everyOf(s);
    if (every !== before.get(s.def.name) && !s.running) plan(s, every);
  }
}

export async function loadJobsConfig() {
  try {
    const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
    const data = row?.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
    applyJobsConfig(mergeJobsConfig(data.jobs));
  } catch {
    // run with the defaults
  }
}

/* ---------------- Running ---------------- */

export function registerJob(def: JobDef) {
  const old = jobs.get(def.name);
  if (old?.timer) clearTimeout(old.timer);
  jobs.set(def.name, {
    def,
    runningSince: null,
    running: null,
    timer: null,
    nextAt: null,
    runs: [],
    total: { runs: 0, failures: 0, ms: 0 },
    lastOkAt: null,
    lastError: null,
    failuresInRow: 0,
  });
}

function plan(s: State, inMs: number | null) {
  if (s.timer) clearTimeout(s.timer);
  s.timer = null;
  s.nextAt = null;
  if (!started || inMs == null) return;
  s.nextAt = Date.now() + inMs;
  s.timer = setTimeout(() => {
    s.timer = null;
    s.nextAt = null;
    void tick(s);
  }, inMs);
  s.timer.unref?.();
}

async function tick(s: State, trigger: JobTrigger = "schedule") {
  // Paused or off: nothing runs; looked at again on the next timer.
  if (!paused(s) && !s.def.offReason?.()) await runOnce(s, trigger).catch(() => undefined);
  // An event during the run may have set the next one already.
  if (!s.timer && started) plan(s, everyOf(s));
}

/** The error for the admin: one line; a database error as its call and its cause (the last line, after the code excerpt). */
export function errorText(e: unknown) {
  const raw = e instanceof Error ? e.message : String(e ?? "error");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const call = /^Invalid `(prisma\.[\w.]+)\(\)` invocation/.exec(lines[0] ?? "");
  const text = call && lines.length > 1 ? `${call[1]}: ${lines[lines.length - 1]}` : raw;
  return text.replace(/\s+/g, " ").slice(0, 300);
}

/** One run (or the run already going); kept in the job's history. */
function runOnce(s: State, trigger: JobTrigger, work: JobDef["run"] = s.def.run): Promise<JobCounts | null> {
  if (s.running) return s.running;
  const t0 = Date.now();
  s.runningSince = t0;
  s.running = (async () => {
    let ok = true;
    let counts: JobCounts | null = null;
    let error: string | null = null;
    try {
      counts = cleanCounts(await work(trigger));
      return counts;
    } catch (e) {
      ok = false;
      error = errorText(e);
      throw e;
    } finally {
      const ms = Date.now() - t0;
      s.runs.unshift({ at: new Date(t0).toISOString(), ms, ok, trigger, counts, error });
      s.runs.length = Math.min(s.runs.length, KEEP_RUNS);
      s.total.runs += 1;
      s.total.ms += ms;
      if (ok) {
        s.lastOkAt = Date.now();
        s.failuresInRow = 0;
      } else {
        s.total.failures += 1;
        s.failuresInRow += 1;
        s.lastError = { at: Date.now(), message: error ?? "error" };
        console.error(`[jobs] ${s.def.name} failed:`, error);
        // Admin → التلقائيات: "a job keeps failing → tell me" (once, at the third in a row).
        if (s.failuresInRow === 3) emitAutomation("job.failing", { job: s.def.name, failures: 3, error: error ?? "", link: "/admin/system/jobs" }, `job:${s.def.name}`);
      }
    }
  })().finally(() => {
    s.running = null;
    s.runningSince = null;
  });
  return s.running;
}

function cleanCounts(v: unknown): JobCounts | null {
  if (!v || typeof v !== "object") return null;
  const out: JobCounts = {};
  for (const [k, n] of Object.entries(v as Record<string, unknown>)) if (typeof n === "number" && Number.isFinite(n)) out[k] = n;
  return Object.keys(out).length ? out : null;
}

/**
 * Something happened (stock changed, the catalog changed…): run the job
 * `delayMs` after the last call (many in a row → one run), unless it's paused
 * or off. False when there's no such job (tests, scripts): the caller does it.
 */
export function triggerJob(name: string, delayMs = 0): boolean {
  const s = jobs.get(name);
  if (!s || !started) return false;
  if (paused(s) || s.def.offReason?.()) return true;
  if (delayMs <= 0) {
    void runOnce(s, "event").catch(() => undefined);
    return true;
  }
  const at = Date.now() + delayMs;
  // An earlier timer run stays; a later one moves up.
  if (s.nextAt != null && s.nextAt <= at) return true;
  if (s.timer) clearTimeout(s.timer);
  s.nextAt = at;
  s.timer = setTimeout(() => {
    s.timer = null;
    s.nextAt = null;
    void (async () => {
      // A run that started before the event may have missed it: one more after it.
      while (s.running) await s.running.catch(() => undefined);
      await runOnce(s, "event").catch(() => undefined);
      if (!s.timer && started) plan(s, everyOf(s));
    })();
  }, delayMs);
  s.timer.unref?.();
  return true;
}

/** Work that runs elsewhere (video conversions) but is shown and counted here. */
export async function recordJobRun<T>(name: string, trigger: JobTrigger, fn: () => Promise<T>): Promise<T> {
  const s = jobs.get(name);
  if (!s) return fn();
  while (s.running) await s.running.catch(() => undefined);
  let result!: T;
  await runOnce(s, trigger, async () => {
    result = await fn();
    return null;
  });
  return result;
}

export type RunNowAnswer = { started: boolean; busy: boolean; run: JobRun | null };

/** The admin's "run now": waits up to `waitMs` for the run; a longer one goes on in the background. */
export async function runJobNow(name: string, waitMs = 10_000): Promise<RunNowAnswer | null> {
  const s = jobs.get(name);
  if (!s) return null;
  if (s.def.canRunNow === false) return { started: false, busy: false, run: null };
  if (s.running) return { started: false, busy: true, run: null };
  const p = runOnce(s, "admin").catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const done = await Promise.race([p.then(() => true), new Promise<boolean>((r) => (timer = setTimeout(() => r(false), waitMs)))]);
  if (timer) clearTimeout(timer);
  // After the admin's run, the timer counts again from now.
  void p.then(() => {
    if (!s.running && started && everyOf(s) != null) plan(s, everyOf(s));
  });
  return { started: true, busy: false, run: done ? s.runs[0] ?? null : null };
}

/** The same run as the admin's, for code that needs its result (the outbox page's "send now"). */
export function runJobAndWait(name: string): Promise<JobCounts | null> | null {
  const s = jobs.get(name);
  return s ? runOnce(s, "admin") : null;
}

export function startJobs() {
  if (started) return;
  started = true;
  startedAt = Date.now();
  for (const s of jobs.values()) {
    const first = s.def.firstMs ?? everyOf(s);
    if (first == null) continue;
    if (s.def.firstMs != null) {
      // The first run is "start"; after it, the timer.
      s.nextAt = Date.now() + first;
      s.timer = setTimeout(() => {
        s.timer = null;
        s.nextAt = null;
        void tick(s, "start");
      }, first);
      s.timer.unref?.();
    } else plan(s, first);
  }
}

/** Stops the timers and waits (up to `waitMs`) for the runs going on. */
export async function stopJobs(waitMs = 5_000) {
  started = false;
  const going: Array<Promise<unknown>> = [];
  for (const s of jobs.values()) {
    if (s.timer) clearTimeout(s.timer);
    s.timer = null;
    s.nextAt = null;
    if (s.running) going.push(s.running.catch(() => undefined));
  }
  if (going.length) await Promise.race([Promise.all(going), new Promise((r) => setTimeout(r, waitMs).unref?.())]);
}

/* ---------------- For the admin ---------------- */

export type JobStatus = "running" | "waiting" | "paused" | "off" | "onDemand";

export function jobsSnapshot(now = Date.now()) {
  return {
    now,
    since: new Date(startedAt).toISOString(),
    /** The timers are on (false in tests and scripts). */
    scheduling: started,
    jobs: [...jobs.values()].map((s) => {
      const d = s.def;
      const every = everyOf(s);
      const off = d.offReason?.() ?? null;
      const isPaused = paused(s);
      const status: JobStatus = s.running ? "running" : off ? "off" : isPaused ? "paused" : every == null ? "onDemand" : "waiting";
      const stuckMs = d.stuckMs ?? Math.max(10 * 60_000, 3 * (every ?? 0));
      const lastAt = s.runs[0] ? Date.parse(s.runs[0].at) + s.runs[0].ms : null;
      // A timer job that hasn't run for 3 timers (and a minute): its timer died.
      const late = !s.running && !off && !isPaused && every != null && started && now - (lastAt ?? startedAt) > 3 * every + 60_000 + (d.firstMs ?? 0);
      return {
        name: d.name,
        group: d.group,
        status,
        everyMs: every,
        defaultEveryMs: d.everyMs,
        limits: d.everyMs == null ? null : d.limits ?? null,
        firstMs: d.firstMs ?? null,
        off,
        paused: isPaused,
        canPause: d.canPause ?? true,
        canRunNow: d.canRunNow ?? true,
        runningSince: s.runningSince ? new Date(s.runningSince).toISOString() : null,
        stuck: !!s.runningSince && now - s.runningSince > stuckMs,
        late,
        nextAt: s.nextAt ? new Date(s.nextAt).toISOString() : null,
        lastOkAt: s.lastOkAt ? new Date(s.lastOkAt).toISOString() : null,
        lastError: s.lastError ? { at: new Date(s.lastError.at).toISOString(), message: s.lastError.message } : null,
        failuresInRow: s.failuresInRow,
        total: { runs: s.total.runs, failures: s.total.failures, avgMs: s.total.runs ? Math.round(s.total.ms / s.total.runs) : 0 },
        runs: s.runs,
        live: d.live?.() ?? null,
      };
    }),
  };
}

export const jobNames = () => [...jobs.keys()];
export const jobDef = (name: string) => jobs.get(name)?.def ?? null;

/** Tests: no jobs, no timers. */
export function resetJobsForTests() {
  for (const s of jobs.values()) if (s.timer) clearTimeout(s.timer);
  jobs.clear();
  config = {};
  started = false;
}
