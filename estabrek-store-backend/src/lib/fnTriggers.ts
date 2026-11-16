/**
 * What starts a function (F3; lib/fnDef.ts says what a function is). A trigger belongs to one
 * function and fires only while that function is published and switched on:
 *
 *   row       a row of one of the owner's tables was added, changed or deleted
 *   schedule  every so many minutes, or every day at a time on the store's clock
 *   event     something happened in the store (a new order, a video ready, a job failing…)
 *   call      a request to /v1/fn/<address>: from a signed-in shopper, with an API key, or from anyone
 *   webhook   a request from another system to /v1/hooks/<a secret address>
 *
 * Everything but a call goes through the queue (lib/tasks.ts): the run isn't lost with a
 * restart, and the thing that caused it (a row saved, an order placed) never waits for it. A call
 * runs at once, because its caller waits for the answer.
 *
 * Functions can start each other (a function adds a row, a trigger on that table starts another):
 * so deep and no deeper (CHAIN_MAX).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { AppError } from "../utils/httpError.js";
import { recordRun } from "./runs.js";
import { dayOf, nextDay, zonedToUtc } from "./storeTime.js";
import { enqueueTask } from "./tasks.js";

export const TRIGGER_KINDS = ["row", "schedule", "event", "call", "webhook"] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];
export const ROW_EVENTS = ["added", "changed", "deleted"] as const;
export type RowEvent = (typeof ROW_EVENTS)[number];
/** The store's events that come by themselves (lib/automations.ts emitAutomation). */
export const FN_EVENTS = ["order.created", "video.ready", "job.failing", "deploy.failed"] as const;
export const CALL_WHO = ["customer", "key", "public"] as const;
export type CallWho = (typeof CALL_WHO)[number];
/** A call's address: the owner's own word for it. */
export const CALL_SLUG = /^[a-z0-9][a-z0-9-]{1,40}$/;
/** How many calls a minute from one shopper, one key, or one place (when the trigger doesn't say). */
export const CALL_PER_MINUTE: Record<CallWho, number> = { customer: 30, key: 120, public: 10 };
export const TRIGGER_LIMITS = { perFunction: 10, everyMinutes: { min: 5, max: 7 * 24 * 60 }, webhookPerMinute: 60, webhookBytes: 64_000 } as const;
/** Functions starting functions: this many deep. */
export const CHAIN_MAX = 3;

const CONFIG = {
  row: z.object({ table: z.string().min(1).max(40), on: z.array(z.enum(ROW_EVENTS)).min(1).max(3) }).strict(),
  schedule: z.union([
    z.object({ everyMinutes: z.number().int().min(TRIGGER_LIMITS.everyMinutes.min).max(TRIGGER_LIMITS.everyMinutes.max) }).strict(),
    /** Every day at this time, on the store's clock. */
    z.object({ at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).strict(),
  ]),
  event: z.object({ event: z.enum(FN_EVENTS) }).strict(),
  call: z.object({ who: z.enum(CALL_WHO), perMinute: z.number().int().min(1).max(600).optional() }).strict(),
  webhook: z.object({}).strict(),
} as const;
export type RowConfig = z.infer<(typeof CONFIG)["row"]>;
export type ScheduleConfig = z.infer<(typeof CONFIG)["schedule"]>;
export type CallConfig = z.infer<(typeof CONFIG)["call"]>;

/** A trigger's settings, checked for its kind. */
export function configOf(kind: TriggerKind, raw: unknown): Record<string, unknown> {
  const parsed = CONFIG[kind].safeParse(raw ?? {});
  if (!parsed.success) throw new AppError(400, "TRIGGER_INVALID", parsed.error.issues[0]?.message ?? "Bad trigger", { at: parsed.error.issues[0]?.path.map(String).join(".") });
  return parsed.data as Record<string, unknown>;
}

/** What each kind hands the function (the function takes the ones it has an input for). */
export const HANDS: Record<TriggerKind, string[]> = {
  row: ["row", "before", "event", "table"],
  schedule: ["at"],
  event: ["event", "subject"],
  call: [],
  webhook: ["body", "query"],
};

/** A webhook's address: long and random, because knowing it is the permission. */
export const newToken = () => randomBytes(18).toString("base64url");

/** When a schedule is due next, after `after`. */
export function nextRun(config: ScheduleConfig, after: Date): Date {
  if ("everyMinutes" in config) return new Date(after.getTime() + config.everyMinutes * 60_000);
  const [hour, minute] = config.at.split(":").map(Number);
  const on = (day: string) => {
    const [y, m, d] = day.split("-").map(Number);
    return zonedToUtc(y, m, d, hour, minute);
  };
  const today = dayOf(after);
  const first = on(today);
  return first.getTime() > after.getTime() ? first : on(nextDay(today));
}

/* ---------------- The triggers that are live ---------------- */

export type LiveTrigger = { id: string; fnId: string; kind: TriggerKind; config: Record<string, unknown>; slug: string | null };
let cache: { at: number; list: LiveTrigger[] } | null = null;
/** After a trigger or a function changes: read them again. */
export function forgetTriggers() {
  cache = null;
}
/** The switched-on triggers of functions that are published and switched on (read every few seconds). */
export async function liveTriggers(now = Date.now()): Promise<LiveTrigger[]> {
  if (!cache || now - cache.at > 10_000) {
    const rows = await prisma.fnTrigger.findMany({ where: { enabled: true, fn: { enabled: true, publishedAt: { not: null } } }, select: { id: true, fnId: true, kind: true, config: true, slug: true } });
    cache = { at: now, list: rows.map((t) => ({ ...t, kind: t.kind as TriggerKind, config: (t.config ?? {}) as Record<string, unknown> })) };
  }
  return cache.list;
}
/** The live trigger behind an address (a call's, or a webhook's), or null. */
export async function triggerAt(kind: "call" | "webhook", slug: string): Promise<LiveTrigger | null> {
  return (await liveTriggers()).find((t) => t.kind === kind && t.slug === slug) ?? null;
}

/* ---------------- A run for the queue ---------------- */

export type FnTask = {
  fnId: string;
  triggerId: string;
  /** What started it, as the run log says it: "row.added", "schedule", "event.order.created", "webhook". */
  trigger: string;
  /** How many functions deep this run is (1: started by something that wasn't a function). */
  chain: number;
  input?: Record<string, unknown>;
  /** A row event: which row; the handler reads it when the run starts. */
  row?: { table: string; id: string; event: RowEvent; before?: unknown };
  /** The run began (set by the handler): one that was interrupted isn't run again by itself. */
  started?: boolean;
};

const chain = new AsyncLocalStorage<number>();
/** Everything `work` causes (rows written, and the triggers on them) is one deeper. */
export const inChain = <T>(depth: number, work: () => Promise<T>): Promise<T> => chain.run(depth, work);
export const chainDepth = () => chain.getStore() ?? 0;

async function start(t: LiveTrigger, trigger: string, more: Pick<FnTask, "input" | "row">, key?: string) {
  const depth = chainDepth();
  if (depth >= CHAIN_MAX) {
    // Functions that keep starting each other: said in the run log, and stopped.
    const fn = await prisma.fn.findUnique({ where: { id: t.fnId }, select: { name: true } });
    recordRun({ kind: "function", name: fn?.name ?? t.fnId, ref: t.fnId, trigger, startedAt: Date.now(), ms: 0, ok: false, error: `Functions started each other ${CHAIN_MAX} deep; this one wasn't started` });
    return;
  }
  const task: FnTask = { fnId: t.fnId, triggerId: t.id, trigger, chain: depth + 1, ...more };
  await enqueueTask("function", task, { key });
}

const quiet = (what: string) => (e: unknown) => console.error(`[functions] ${what}:`, e instanceof Error ? e.message : e);

/**
 * A row was added, changed or deleted: the functions that wait for that are started (through the
 * queue). Never slows or fails the write; a file's worth of rows (an import) doesn't come here.
 */
export function emitRow(event: RowEvent, tableId: string, row: { id: string }, before?: unknown) {
  void (async () => {
    for (const t of await liveTriggers()) {
      const c = t.config as Partial<RowConfig>;
      if (t.kind === "row" && c.table === tableId && c.on?.includes(event)) await start(t, `row.${event}`, { row: { table: tableId, id: row.id, event, ...(before !== undefined ? { before } : {}) } });
    }
  })().catch(quiet(`row.${event}`));
}

/** Something happened in the store: the functions that wait for it are started, with what it was about. */
export async function emitFnEvent(event: string, data: Record<string, unknown>, subject: string) {
  for (const t of await liveTriggers()) if (t.kind === "event" && t.config.event === event) await start(t, `event.${event}`, { input: { ...data, event, subject } });
}

/** A request came in at a webhook's address. */
export async function emitWebhook(t: LiveTrigger, body: unknown, query: unknown) {
  await start(t, "webhook", { input: { body, query } });
}

/** The schedules that are due: each is started once for its moment, and its next moment is set. */
export async function runFnSchedule(now = new Date()) {
  const due = await prisma.fnTrigger.findMany({ where: { kind: "schedule", enabled: true, nextAt: { lte: now }, fn: { enabled: true, publishedAt: { not: null } } }, orderBy: { nextAt: "asc" }, take: 50 });
  let started = 0;
  for (const t of due) {
    const config = CONFIG.schedule.safeParse(t.config);
    if (!config.success || !t.nextAt) continue;
    // The same moment asked twice (two servers, a restart) is one run.
    await start({ id: t.id, fnId: t.fnId, kind: "schedule", config: config.data, slug: null }, "schedule", { input: { at: t.nextAt.toISOString() } }, `fn-schedule:${t.id}:${t.nextAt.toISOString()}`);
    // Moments missed while the server was down aren't run one by one: the next one from now.
    await prisma.fnTrigger.update({ where: { id: t.id }, data: { nextAt: nextRun(config.data, now) } });
    started += 1;
  }
  return { started };
}
