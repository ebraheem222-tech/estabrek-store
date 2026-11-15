/**
 * The queue (E0.3; admin → صف الشغل): background work that must not be lost. A task is a row
 * until it is done, so a restart in the middle doesn't drop it; one that fails is tried again
 * after a growing wait; one that keeps failing is set aside ("needs a look") for the owner to
 * try again or dismiss.
 *
 * - `enqueueTask(kind, payload, { key })`: with a key, the same thing asked twice is one task.
 * - Workers take tasks with FOR UPDATE SKIP LOCKED, so two never take the same one.
 * - A task still "running" after its kind's time (and a little) had a worker that died mid-way:
 *   it is taken again. So after a crash a task's handler may start a second time: what a handler
 *   does has to be safe to repeat (the automations' one is: a rule that took an event isn't run
 *   for it again).
 * - Every try goes to the run log (lib/runs.ts) as kind "task".
 * - What a task was given (its payload: an order's customer and phone, say) is dropped the moment
 *   it is done; only one that may still be tried keeps it.
 *
 * The job "tasks" (src/jobs.ts) is the worker: at once when a task is added, and on its timer.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { utc } from "./dataQuery.js";
import { errorText, triggerJob } from "./jobs.js";
import { recordRun } from "./runs.js";

export const TASK_STATUSES = ["waiting", "running", "done", "failed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskInfo = { id: string; kind: string; key: string | null; /** Which try this is (1 = the first). */ attempts: number };
export type TaskHandler = (payload: unknown, task: TaskInfo) => Promise<unknown>;
type Registered = { run: TaskHandler; /** Tries before it is set aside. */ maxAttempts: number; /** A try longer than this has failed. */ timeoutMs: number };

export const TASK_DEFAULTS = { maxAttempts: 5, timeoutMs: 2 * 60_000 } as const;
/** How long finished tasks are kept: done ones a week, the ones set aside or dismissed a month. */
export const TASK_KEEP_DAYS = { done: 7, failed: 30 } as const;
const MINUTE = 60_000;
/** Past its kind's time by this much, a "running" task's worker is taken for dead. */
const GRACE_MS = 30_000;
const STOPPED = "Its worker stopped mid-way, every time it was tried";

const handlers = new Map<string, Registered>();

/** What does a kind of task: `run` gets the payload it was added with. */
export function registerTask(kind: string, run: TaskHandler, opts: Partial<Omit<Registered, "run">> = {}) {
  handlers.set(kind, { run, maxAttempts: opts.maxAttempts ?? TASK_DEFAULTS.maxAttempts, timeoutMs: opts.timeoutMs ?? TASK_DEFAULTS.timeoutMs });
}
export const taskKinds = () => [...handlers.keys()];

/** The wait after try number `attempts` failed: 30 s, 2 min, 8 min, 32 min, ~2 h… never more than 6 hours. */
export function retryDelayMs(attempts: number): number {
  return Math.min(6 * 60 * MINUTE, 30_000 * 4 ** Math.max(0, attempts - 1));
}

/** The worker is told there is work: the job when the server runs its jobs, else (tests, scripts) right here. */
function wake() {
  if (!triggerJob("tasks", 20)) void runTasks().catch(() => undefined);
}

/**
 * Work to do, kept until it is done. `key`: asked again with the same key, it is the same task
 * (nothing is added, `added` is false).
 */
export async function enqueueTask(kind: string, payload: unknown, opts: { key?: string | null; runAt?: Date; maxAttempts?: number } = {}): Promise<{ id: string; added: boolean }> {
  const key = opts.key?.slice(0, 200) || null;
  const data = { kind, payload: (payload ?? {}) as Prisma.InputJsonValue, key, runAt: opts.runAt ?? new Date(), maxAttempts: opts.maxAttempts ?? handlers.get(kind)?.maxAttempts ?? TASK_DEFAULTS.maxAttempts };
  try {
    const made = await prisma.task.create({ data, select: { id: true } });
    wake();
    return { id: made.id, added: true };
  } catch (e) {
    const same = key && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" ? await prisma.task.findUnique({ where: { key }, select: { id: true } }) : null;
    if (!same) throw e;
    return { id: same.id, added: false };
  }
}

type Claimed = TaskInfo & { payload: unknown; maxAttempts: number };

/** Takes up to `limit` tasks whose time has come (or whose worker died), marking them running. */
export async function claimTasks(limit: number, now: Date): Promise<Claimed[]> {
  const kinds = taskKinds();
  if (!kinds.length) return [];
  const at = utc(now);
  // Each kind's own time: past it (and a little), a task still "running" is nobody's any more.
  const until = Prisma.join(
    kinds.map((k) => Prisma.sql`WHEN ${k} THEN ${utc(new Date(now.getTime() + handlers.get(k)!.timeoutMs + GRACE_MS))}`),
    " ",
  );
  return prisma.$queryRaw<Claimed[]>(Prisma.sql`
    UPDATE "Task" SET "status" = 'running', "lockedAt" = ${at}, "lockedUntil" = CASE "kind" ${until} END, "attempts" = "attempts" + 1, "updatedAt" = ${at}
    WHERE "id" IN (
      SELECT "id" FROM "Task"
      WHERE "kind" IN (${Prisma.join(kinds)})
        AND (("status" = 'waiting' AND "runAt" <= ${at}) OR ("status" = 'running' AND "lockedUntil" < ${at} AND "attempts" < "maxAttempts"))
      ORDER BY "runAt" ASC, "id" ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "kind", "key", "payload", "attempts", "maxAttempts"`);
}

/** A task whose worker died on every one of its tries isn't taken again: it is set aside. */
async function setAsideStopped(now: Date) {
  const stopped = await prisma.task.updateMany({
    where: { status: "running", lockedUntil: { lt: now }, attempts: { gte: prisma.task.fields.maxAttempts } },
    data: { status: "failed", lockedAt: null, lockedUntil: null, lastError: STOPPED, finishedAt: now },
  });
  if (stopped.count) await bell(`${STOPPED} (${stopped.count})`);
  return stopped.count;
}

/** Given up on: the bell in the admin rings. */
const bell = (body: string) => prisma.adminNotification.create({ data: { title: "شغل بالصف فشل وبدّه نظر", body: body.slice(0, 300), link: "/admin/system/tasks" } }).catch(() => undefined);

const within = <T>(work: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Took longer than ${Math.round(ms / 1000)} s`)), ms);
    timer.unref?.();
    work.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e)),
    );
  });

const asJson = (v: unknown): Prisma.InputJsonValue | undefined => (v && typeof v === "object" ? (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue) : undefined);

type Outcome = "done" | "retry" | "failed";

async function runOne(t: Claimed): Promise<Outcome> {
  const h = handlers.get(t.kind)!;
  const t0 = Date.now();
  let outcome: Outcome;
  let error: string | null = null;
  let result: unknown = null;
  try {
    result = await within(h.run(t.payload, { id: t.id, kind: t.kind, key: t.key, attempts: t.attempts }), h.timeoutMs);
    outcome = "done";
    const kept = asJson(result);
    // Done: what it was given isn't needed any more, and isn't kept.
    await prisma.task.update({ where: { id: t.id }, data: { status: "done", payload: {}, lockedAt: null, lockedUntil: null, lastError: null, finishedAt: new Date(), ...(kept ? { result: kept } : {}) } });
  } catch (e) {
    error = errorText(e);
    outcome = t.attempts >= t.maxAttempts ? "failed" : "retry";
    // Not written (the database is away): the task stays "running" and is taken again after its time.
    await prisma.task
      .update({
        where: { id: t.id },
        data:
          outcome === "failed"
            ? { status: "failed", lockedAt: null, lockedUntil: null, lastError: error, finishedAt: new Date() }
            : { status: "waiting", lockedAt: null, lockedUntil: null, lastError: error, runAt: new Date(Date.now() + retryDelayMs(t.attempts)) },
      })
      .catch(() => undefined);
    if (outcome === "failed") await bell(`${t.kind}: ${error}`);
  }
  recordRun({ kind: "task", name: t.kind, ref: t.id, trigger: t.attempts > 1 ? "retry" : "queue", subject: t.key, startedAt: t0, ms: Date.now() - t0, ok: outcome === "done", result: outcome === "done" ? result : outcome === "failed" ? { gaveUp: 1 } : null, error });
  return outcome;
}

let pass: Promise<Record<Outcome, number>> | null = null;

/** One pass of the worker: the tasks whose time has come, a few at a time, until none is left (or `most` were run). */
export function runTasks(most = 200): Promise<Record<Outcome, number>> {
  // One pass at a time in this process: a second call waits for the one going, then looks again.
  if (pass) return pass.then(() => runTasks(most), () => runTasks(most));
  pass = (async () => {
    const counts = { done: 0, retry: 0, failed: 0 };
    counts.failed += await setAsideStopped(new Date());
    while (counts.done + counts.retry + counts.failed < most) {
      const taken = await claimTasks(10, new Date());
      if (!taken.length) break;
      for (const outcome of await Promise.all(taken.map(runOne))) counts[outcome] += 1;
    }
    return counts;
  })().finally(() => {
    pass = null;
  });
  return pass;
}

/* ---------------- For the admin ---------------- */

const ROW = { id: true, kind: true, key: true, status: true, attempts: true, maxAttempts: true, runAt: true, lockedAt: true, lastError: true, result: true, createdAt: true, finishedAt: true } as const;

export async function tasksSnapshot(q: { status?: TaskStatus; kind?: string; before?: Date; limit: number }, now = Date.now()) {
  const [byStatus, doneToday, oldest, rows] = await Promise.all([
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.task.count({ where: { status: "done", finishedAt: { gte: new Date(now - 86_400_000) } } }),
    // How long the one waiting longest has waited (not counting the ones put off for a retry).
    prisma.task.findFirst({ where: { status: "waiting", runAt: { lte: new Date(now) } }, orderBy: { runAt: "asc" }, select: { runAt: true } }),
    prisma.task.findMany({
      where: { ...(q.status ? { status: q.status } : {}), ...(q.kind ? { kind: q.kind } : {}), ...(q.before ? { createdAt: { lt: q.before } } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: q.limit + 1,
      select: ROW,
    }),
  ]);
  const counts = Object.fromEntries(TASK_STATUSES.map((s) => [s, byStatus.find((g) => g.status === s)?._count._all ?? 0])) as Record<TaskStatus, number>;
  const more = rows.length > q.limit;
  const tasks = more ? rows.slice(0, q.limit) : rows;
  return { now, counts, doneToday, waitingSince: oldest?.runAt ?? null, kinds: taskKinds(), keepDays: TASK_KEEP_DAYS, tasks, next: more ? tasks[tasks.length - 1].createdAt : null };
}

/** A task that was set aside (or dismissed) gets its tries back and waits its turn again. */
export async function retryTask(id: string) {
  const changed = await prisma.task.updateMany({ where: { id, status: { in: ["failed", "cancelled"] } }, data: { status: "waiting", attempts: 0, runAt: new Date(), lockedAt: null, lockedUntil: null, finishedAt: null } });
  if (changed.count) wake();
  return changed.count > 0;
}

/** A task that waits, or was set aside, is dismissed: it won't be tried. One being run right now can't be. */
export async function cancelTask(id: string) {
  return (await prisma.task.updateMany({ where: { id, status: { in: ["waiting", "failed"] } }, data: { status: "cancelled", finishedAt: new Date(), lockedAt: null, lockedUntil: null } })).count > 0;
}

/** Finished tasks go after their days (the job "tasksClean"). */
export async function cleanTasks(now = Date.now()) {
  const done = await prisma.task.deleteMany({ where: { status: "done", finishedAt: { lt: new Date(now - TASK_KEEP_DAYS.done * 86_400_000) } } });
  const rest = await prisma.task.deleteMany({ where: { status: { in: ["failed", "cancelled"] }, finishedAt: { lt: new Date(now - TASK_KEEP_DAYS.failed * 86_400_000) } } });
  return { removed: done.count + rest.count };
}

/** Tests: no handlers, no pass going. */
export async function resetTasksForTests() {
  await pass?.catch(() => undefined);
  handlers.clear();
}
