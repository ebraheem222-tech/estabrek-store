import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { flushRuns, resetRunsForTests } from "../lib/runs.js";
import { TASK_KEEP_DAYS, cancelTask, claimTasks, cleanTasks, enqueueTask, registerTask, resetTasksForTests, retryDelayMs, retryTask, runTasks } from "../lib/tasks.js";
import { emitAutomation, setAutomationHandler } from "../lib/automations.js";
import { forgetRules, handleEvent, resetAutomationsForTests, startAutomations } from "../modules/admin/automations.service.js";

// The queue (E0.3), with the database: background work is a row until it is done, so a restart
// doesn't drop it; a try that fails waits longer each time and is then set aside for the owner;
// the same thing asked twice (one key) is one task; a task whose worker died is taken again, once.
// No jobs run here, so adding a task starts the worker in the background: `runTasks()` waits for it.

const KIND = "tasks-spec";
const BELL = "/admin/system/tasks";
const MIN = 60_000;
const DAY = 86_400_000;
const get = (id: string) => prisma.task.findUniqueOrThrow({ where: { id } });
/** Its wait is over. */
const due = (id: string) => prisma.task.update({ where: { id }, data: { runAt: new Date(Date.now() - 1000) } });
/** A row written straight to the table. Its time has come (said by this clock, not left to the database's, which may be a millisecond ahead). */
const row = (data: Record<string, unknown> = {}) => prisma.task.create({ data: { kind: KIND, payload: {}, runAt: new Date(Date.now() - 1000), ...data } });
const logged = async () => {
  await flushRuns();
  await flushRuns();
  return prisma.run.findMany({ where: { kind: "task", name: { startsWith: KIND } }, orderBy: [{ startedAt: "asc" }, { id: "asc" }] });
};
const bells = () => prisma.adminNotification.findMany({ where: { link: BELL } });

async function clean() {
  await resetTasksForTests();
  await resetRunsForTests();
  resetAutomationsForTests();
  setAutomationHandler(null);
  await prisma.task.deleteMany({ where: { OR: [{ kind: { startsWith: KIND } }, { kind: "automation" }] } });
  await prisma.run.deleteMany({ where: { OR: [{ kind: "task" }, { name: { startsWith: KIND } }] } });
  await prisma.adminNotification.deleteMany({ where: { OR: [{ link: BELL }, { title: { startsWith: KIND } }] } });
  await prisma.automationState.deleteMany({ where: { subject: { contains: KIND } } });
  await prisma.automationRule.deleteMany({ where: { name: { startsWith: KIND } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@tasks-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: KIND } } });
  invalidateAccess();
}
beforeEach(clean);
afterAll(clean);

describe("The wait between tries", () => {
  test("grows: half a minute, 2 minutes, 8, 32… and never more than 6 hours", () => {
    expect([1, 2, 3, 4, 5].map(retryDelayMs)).toEqual([30_000, 2 * MIN, 8 * MIN, 32 * MIN, 128 * MIN]);
    expect(retryDelayMs(6)).toBe(6 * 60 * MIN);
    expect(retryDelayMs(40)).toBe(6 * 60 * MIN);
    expect(retryDelayMs(0)).toBe(30_000);
  });
});

describe("A task", () => {
  test("is kept until it is done: run once, what it did kept, and written in the run log", async () => {
    const seen: unknown[] = [];
    registerTask(KIND, async (payload, task) => {
      seen.push([payload, task.attempts, task.kind]);
      return { sent: 2 };
    });
    const { id, added } = await enqueueTask(KIND, { to: "owner" });
    expect(added).toBe(true);
    await runTasks();
    expect(seen).toEqual([[{ to: "owner" }, 1, KIND]]);
    // What it was given isn't kept once it is done.
    expect(await get(id)).toMatchObject({ status: "done", attempts: 1, payload: {}, result: { sent: 2 }, lastError: null, lockedAt: null, lockedUntil: null });
    expect((await get(id)).finishedAt).toBeInstanceOf(Date);
    // Nothing left: another pass does nothing.
    expect(await runTasks()).toEqual({ done: 0, retry: 0, failed: 0 });
    expect(seen).toHaveLength(1);
    expect((await logged()).map((r) => [r.name, r.ref, r.trigger, r.ok, r.result, r.error])).toEqual([[KIND, id, "queue", true, { sent: 2 }, null]]);
  });

  test("with a key, the same thing asked twice (or five times at once) is one task", async () => {
    let ran = 0;
    const given: unknown[] = [];
    registerTask(KIND, async (payload) => {
      ran += 1;
      given.push(payload);
      return null;
    });
    const first = await enqueueTask(KIND, { n: 1 }, { key: `${KIND}:order:1` });
    const again = await enqueueTask(KIND, { n: 2 }, { key: `${KIND}:order:1` });
    expect([first.added, again.added, again.id === first.id]).toEqual([true, false, true]);
    await runTasks();
    // Done, and asked once more: still that one task; it isn't run again.
    expect((await enqueueTask(KIND, { n: 3 }, { key: `${KIND}:order:1` })).added).toBe(false);
    await runTasks();
    expect(ran).toBe(1);
    // It was done with what it was first asked with.
    expect(given).toEqual([{ n: 1 }]);
    const many = await Promise.all([1, 2, 3, 4, 5].map((n) => enqueueTask(KIND, { n }, { key: `${KIND}:order:2` })));
    expect(many.filter((m) => m.added)).toHaveLength(1);
    expect(new Set(many.map((m) => m.id)).size).toBe(1);
    await runTasks();
    expect(ran).toBe(2);
    // Without a key, each asking is its own task.
    await enqueueTask(KIND, {});
    await enqueueTask(KIND, {});
    await runTasks();
    expect(ran).toBe(4);
  });

  test("a try that fails waits longer each time, then the task is set aside; the owner tries it again", async () => {
    let broken = true;
    registerTask(
      KIND,
      async () => {
        if (broken) throw new Error("SMTP timed out");
        return null;
      },
      { maxAttempts: 3 },
    );
    const { id } = await enqueueTask(KIND, {});
    await runTasks();
    let t = await get(id);
    expect(t).toMatchObject({ status: "waiting", attempts: 1, maxAttempts: 3, lastError: "SMTP timed out", lockedAt: null });
    let wait = t.runAt.getTime() - Date.now();
    expect(wait).toBeGreaterThan(20_000);
    expect(wait).toBeLessThanOrEqual(30_000);
    // Not before its time.
    expect(await runTasks()).toEqual({ done: 0, retry: 0, failed: 0 });
    await due(id);
    expect(await runTasks()).toEqual({ done: 0, retry: 1, failed: 0 });
    t = await get(id);
    wait = t.runAt.getTime() - Date.now();
    expect(t.attempts).toBe(2);
    expect(wait).toBeGreaterThan(110_000);
    expect(wait).toBeLessThanOrEqual(2 * MIN);
    await due(id);
    expect(await runTasks()).toEqual({ done: 0, retry: 0, failed: 1 });
    t = await get(id);
    expect(t).toMatchObject({ status: "failed", attempts: 3, lastError: "SMTP timed out" });
    expect(t.finishedAt).toBeInstanceOf(Date);
    // Set aside: not tried by itself any more; the bell rang once.
    await due(id);
    expect(await runTasks()).toEqual({ done: 0, retry: 0, failed: 0 });
    expect((await bells()).map((b) => b.body)).toEqual([`${KIND}: SMTP timed out`]);
    expect((await logged()).map((r) => [r.trigger, r.ok, r.result, r.error])).toEqual([
      ["queue", false, null, "SMTP timed out"],
      ["retry", false, null, "SMTP timed out"],
      ["retry", false, { gaveUp: 1 }, "SMTP timed out"],
    ]);
    // What was wrong is fixed, and the owner asks for it again: its tries start over.
    broken = false;
    expect(await retryTask(id)).toBe(true);
    await runTasks();
    expect(await get(id)).toMatchObject({ status: "done", attempts: 1, lastError: null });
    // One that is done can't be asked for again.
    expect(await retryTask(id)).toBe(false);
  });

  test("interrupted mid-way (its worker died): it is taken again after its time, and done once", async () => {
    let ran = 0;
    registerTask(
      KIND,
      async () => {
        ran += 1;
        return null;
      },
      { timeoutMs: MIN },
    );
    // Taken by a worker…
    const t = await row();
    const now = Date.now();
    const [taken] = await claimTasks(10, new Date(now));
    expect(taken).toMatchObject({ id: t.id, attempts: 1 });
    const held = await get(t.id);
    expect(held.status).toBe("running");
    // …that has its kind's time and half a minute to finish.
    expect(held.lockedUntil!.getTime()).toBe(now + MIN + 30_000);
    // …and the server stops there. While that time isn't over, nobody else takes it.
    expect(await claimTasks(10, new Date(now + MIN + 29_000))).toEqual([]);
    expect(await runTasks()).toEqual({ done: 0, retry: 0, failed: 0 });
    expect(ran).toBe(0);
    // After it, the server that is up takes it and does it.
    await prisma.task.update({ where: { id: t.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    expect(await runTasks()).toEqual({ done: 1, retry: 0, failed: 0 });
    expect(await get(t.id)).toMatchObject({ status: "done", attempts: 2 });
    expect(await runTasks()).toEqual({ done: 0, retry: 0, failed: 0 });
    expect(ran).toBe(1);
    expect((await logged()).map((r) => [r.trigger, r.ok])).toEqual([["retry", true]]);
  });

  test("two workers never take the same task", async () => {
    registerTask(KIND, async () => null);
    await prisma.task.createMany({ data: Array.from({ length: 30 }, (_, n) => ({ kind: KIND, payload: { n }, runAt: new Date(Date.now() - 1000) })) });
    const now = new Date();
    const sets = await Promise.all([claimTasks(10, now), claimTasks(10, now), claimTasks(10, now), claimTasks(10, now)]);
    const ids = sets.flat().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    // What one left because another held it is taken by the next look.
    for (;;) {
      const more = await claimTasks(10, now);
      if (!more.length) break;
      ids.push(...more.map((t) => t.id));
    }
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(await prisma.task.count({ where: { kind: KIND, status: "running", attempts: 1 } })).toBe(30);
  });

  test("one whose worker died on every try is set aside, not taken for ever", async () => {
    let ran = 0;
    registerTask(KIND, async () => {
      ran += 1;
      return null;
    });
    const t = await row({ status: "running", attempts: 3, maxAttempts: 3, lockedAt: new Date(Date.now() - 10 * MIN), lockedUntil: new Date(Date.now() - 5 * MIN) });
    expect(await runTasks()).toEqual({ done: 0, retry: 0, failed: 1 });
    expect(ran).toBe(0);
    expect(await get(t.id)).toMatchObject({ status: "failed", lockedUntil: null });
    expect((await get(t.id)).lastError).toMatch(/stopped mid-way/);
    expect((await bells()).map((b) => b.body)).toEqual(["Its worker stopped mid-way, every time it was tried (1)"]);
  });

  test("a try that takes longer than its kind's time has failed", async () => {
    registerTask(KIND, () => new Promise((r) => setTimeout(r, 400)), { timeoutMs: 50, maxAttempts: 2 });
    const { id } = await enqueueTask(KIND, {});
    await runTasks();
    expect(await get(id)).toMatchObject({ status: "waiting", attempts: 1 });
    expect((await get(id)).lastError).toMatch(/^Took longer than/);
    await new Promise((r) => setTimeout(r, 450));
  });

  test("one that waits (or was set aside) can be dismissed; one being done can't", async () => {
    let ran = 0;
    registerTask(KIND, async () => {
      ran += 1;
      return null;
    });
    const later = await enqueueTask(KIND, {}, { runAt: new Date(Date.now() + 60 * MIN) });
    expect(await cancelTask(later.id)).toBe(true);
    expect((await get(later.id)).status).toBe("cancelled");
    await due(later.id);
    await runTasks();
    expect(ran).toBe(0);
    const going = await row({ status: "running", attempts: 1, lockedAt: new Date(), lockedUntil: new Date(Date.now() + MIN) });
    expect(await cancelTask(going.id)).toBe(false);
    expect((await get(going.id)).status).toBe("running");
    const aside = await row({ status: "failed", attempts: 5, finishedAt: new Date(), lastError: "boom" });
    expect(await cancelTask(aside.id)).toBe(true);
    // Dismissed by mistake: asked for again, it waits its turn and is done.
    expect(await retryTask(later.id)).toBe(true);
    await runTasks();
    expect(await get(later.id)).toMatchObject({ status: "done", attempts: 1 });
    expect(ran).toBe(1);
  });

  test("a kind this server doesn't do waits (it isn't lost, and it isn't failed)", async () => {
    const { id } = await enqueueTask(`${KIND}-later`, { n: 1 });
    registerTask(KIND, async () => null);
    await runTasks();
    expect(await get(id)).toMatchObject({ status: "waiting", attempts: 0 });
    // The code that does it arrives (a deploy): it is done.
    registerTask(`${KIND}-later`, async (payload) => payload);
    expect(await runTasks()).toEqual({ done: 1, retry: 0, failed: 0 });
    expect(await get(id)).toMatchObject({ status: "done", result: { n: 1 } });
  });

  test("finished tasks go after their days: done ones a week, the ones set aside or dismissed a month", async () => {
    const ago = (days: number) => new Date(Date.now() - days * DAY);
    const made = await Promise.all([
      row({ status: "done", finishedAt: ago(TASK_KEEP_DAYS.done + 1) }),
      row({ status: "done", finishedAt: ago(TASK_KEEP_DAYS.done - 1) }),
      row({ status: "failed", finishedAt: ago(TASK_KEEP_DAYS.failed + 1) }),
      row({ status: "failed", finishedAt: ago(TASK_KEEP_DAYS.failed - 1) }),
      row({ status: "cancelled", finishedAt: ago(TASK_KEEP_DAYS.failed + 1) }),
      // One that still waits is never removed, however old.
      row({ status: "waiting", createdAt: ago(90), runAt: new Date(Date.now() + DAY) }),
    ]);
    expect((await cleanTasks()).removed).toBeGreaterThanOrEqual(3);
    const left = new Set((await prisma.task.findMany({ where: { id: { in: made.map((m) => m.id) } }, select: { id: true } })).map((m) => m.id));
    expect(made.map((m) => left.has(m.id))).toEqual([false, true, false, true, false, true]);
  });
});

describe("The admin's page", () => {
  const at = "/v1/admin/system/tasks";

  test("the numbers and the tasks newest first, by state, a page at a time; try again and dismiss", async () => {
    const t0 = Date.now() - 10 * MIN;
    const waits = await row({ createdAt: new Date(t0), runAt: new Date(Date.now() + 60 * MIN), key: `${KIND}:k1` });
    const aside = await row({ createdAt: new Date(t0 + 1000), status: "failed", attempts: 5, lastError: "boom", finishedAt: new Date() });
    const done = await row({ createdAt: new Date(t0 + 2000), status: "done", attempts: 1, finishedAt: new Date(), result: { sent: 1 } });
    const overdue = await row({ createdAt: new Date(t0 + 3000), runAt: new Date(Date.now() - 5 * MIN) });
    const all = (await request(app).get(at).query({ kind: KIND }).expect(200)).body;
    expect(all.tasks.map((t: { id: string }) => t.id)).toEqual([overdue.id, done.id, aside.id, waits.id]);
    expect(all.tasks[2]).toMatchObject({ kind: KIND, status: "failed", attempts: 5, maxAttempts: 5, lastError: "boom" });
    expect(all.tasks[3]).toMatchObject({ key: `${KIND}:k1`, status: "waiting" });
    expect(all.tasks[0].payload).toBeUndefined();
    expect(all.next).toBeNull();
    expect(all.counts.waiting).toBeGreaterThanOrEqual(2);
    expect(all.counts.failed).toBeGreaterThanOrEqual(1);
    expect(all.doneToday).toBeGreaterThanOrEqual(1);
    expect(all.keepDays).toEqual(TASK_KEEP_DAYS);
    // The one that has waited longest (its time has come and nobody does this kind here).
    expect(Date.now() - Date.parse(all.waitingSince)).toBeGreaterThanOrEqual(5 * MIN - 1000);
    expect((await request(app).get(at).query({ kind: KIND, status: "failed" }).expect(200)).body.tasks.map((t: { id: string }) => t.id)).toEqual([aside.id]);
    const page1 = (await request(app).get(at).query({ kind: KIND, limit: 3 }).expect(200)).body;
    expect(page1.tasks).toHaveLength(3);
    const page2 = (await request(app).get(at).query({ kind: KIND, limit: 3, before: page1.next }).expect(200)).body;
    expect(page2.tasks.map((t: { id: string }) => t.id)).toEqual([waits.id]);
    expect(page2.next).toBeNull();
    for (const bad of [{ status: "nope" }, { limit: 0 }, { before: "yesterday" }]) expect((await request(app).get(at).query(bad).expect(400)).body.error).toBe("VALIDATION_ERROR");

    // Try again: only what stopped.
    expect((await request(app).post(`${at}/${waits.id}/retry`).expect(409)).body).toMatchObject({ error: "TASK_NOT_STOPPED" });
    await request(app).post(`${at}/${aside.id}/retry`).expect(200);
    expect(await get(aside.id)).toMatchObject({ status: "waiting", attempts: 0, finishedAt: null });
    // Dismiss: only what waits or was set aside.
    expect((await request(app).post(`${at}/${done.id}/cancel`).expect(409)).body).toMatchObject({ error: "TASK_NOT_WAITING" });
    await request(app).post(`${at}/${waits.id}/cancel`).expect(200);
    expect((await get(waits.id)).status).toBe("cancelled");
    expect((await request(app).post(`${at}/nope/retry`).expect(404)).body.error).toBe("TASK_NOT_FOUND");
    expect((await request(app).post(`${at}/nope/cancel`).expect(404)).body.error).toBe("TASK_NOT_FOUND");
  });

  test("the kinds this server does are named", async () => {
    registerTask(KIND, async () => null);
    expect((await request(app).get(at).expect(200)).body.kinds).toEqual([KIND]);
  });

  test("looking needs system:read; trying again and dismissing need system:write", async () => {
    const aside = await row({ status: "failed", attempts: 5, finishedAt: new Date() });
    const member = async (name: string, permissions: string[]) => {
      const role = await prisma.staffRole.create({ data: { name: `${KIND} ${name}`, permissions } });
      const m = await prisma.adminUser.create({ data: { email: `${name}@tasks-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
      return `Bearer ${signAccessToken({ sub: m.id, role: "STAFF", email: m.email })}`;
    };
    const editor = await member("editor", ["pages:read"]);
    const watcher = await member("watcher", ["system:read"]);
    expect((await request(app).get(at).set("Authorization", editor).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["system:read"] });
    await request(app).get(at).set("Authorization", watcher).expect(200);
    expect((await request(app).post(`${at}/${aside.id}/retry`).set("Authorization", watcher).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["system:write"] });
    expect((await request(app).post(`${at}/${aside.id}/cancel`).set("Authorization", watcher).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED" });
    expect((await get(aside.id)).status).toBe("failed");
  });
});

describe("Automations go through the queue", () => {
  const rule = (over: Record<string, unknown> = {}) => prisma.automationRule.create({ data: { name: `${KIND} bell`, trigger: "order.created", conditions: {}, action: "notify", config: {}, enabled: true, ...over } });
  const rang = () => prisma.adminNotification.count({ where: { title: { startsWith: KIND } } });
  const events = () => prisma.task.findMany({ where: { kind: "automation" }, orderBy: { createdAt: "asc" } });
  /** The event has reached the queue (it is put there in the background, never holding the caller). */
  const queued = async (n: number) => {
    for (let k = 0; k < 100 && (await prisma.task.count({ where: { kind: "automation" } })) < n; k++) await new Promise((r) => setTimeout(r, 20));
  };

  test("an event is a task from the moment it happens until its rules ran; an event no rule asks for isn't queued", async () => {
    const r = await rule();
    forgetRules();
    startAutomations();
    emitAutomation("video.ready", { video: "x" }, `video:${KIND}`);
    emitAutomation("order.created", { orderId: "ORD-7", total: 50, link: "/admin/orders/7" }, `order:${KIND}-7`);
    await queued(1);
    await runTasks();
    const got = await events();
    expect(got).toHaveLength(1);
    // (Done: the order's details aren't kept in the queue.)
    expect(got[0]).toMatchObject({ status: "done", attempts: 1, payload: {} });
    expect((got[0].result as { rules: number }).rules).toBeGreaterThanOrEqual(1);
    expect(await rang()).toBe(1);
    expect(await prisma.automationRun.count({ where: { ruleId: r.id } })).toBe(1);
  });

  test("the same event handled again doesn't run a rule twice; one that stopped before its action goes on", async () => {
    const r = await rule();
    const subject = `order:${KIND}-8`;
    const at = Date.now();
    expect(await handleEvent("order.created", { orderId: "ORD-8" }, subject, at, [r])).toBe(1);
    expect(await handleEvent("order.created", { orderId: "ORD-8" }, subject, at, [r])).toBe(0);
    expect(await rang()).toBe(1);
    // Another event about the same thing is another event.
    expect(await handleEvent("order.created", { orderId: "ORD-8" }, subject, at + 5, [r])).toBe(1);
    // The rule took an event (its moment is written) and the server stopped before the action: it goes on.
    await prisma.automationState.update({ where: { ruleId_subject: { ruleId: r.id, subject } }, data: { lastAt: new Date(at + 1000) } });
    expect(await handleEvent("order.created", { orderId: "ORD-8" }, subject, at + 1000, [r])).toBe(1);
    expect(await rang()).toBe(3);
    // The same with a rule that waits an hour between two events about one thing.
    const slow = await rule({ name: `${KIND} hourly`, cooldownMinutes: 60 });
    expect(await handleEvent("order.created", {}, subject, at, [slow])).toBe(1);
    expect(await handleEvent("order.created", {}, subject, at + 2000, [slow])).toBe(0);
    expect(await handleEvent("order.created", {}, subject, at, [slow])).toBe(0);
    await prisma.automationState.update({ where: { ruleId_subject: { ruleId: slow.id, subject } }, data: { lastAt: new Date(at + 3000) } });
    expect(await handleEvent("order.created", {}, subject, at + 3000, [slow])).toBe(1);
    expect(await prisma.automationRun.count({ where: { ruleId: slow.id } })).toBe(2);
  });

  test("an event whose task was interrupted by a restart is handled after it, once", async () => {
    const r = await rule();
    forgetRules();
    const at = Date.now() - 5 * MIN;
    const subject = `order:${KIND}-9`;
    // As the stopped server left it: taken, its rule not run yet.
    const t = await prisma.task.create({ data: { kind: "automation", payload: { trigger: "order.created", data: { orderId: "ORD-9" }, subject, at }, status: "running", attempts: 1, lockedAt: new Date(at), lockedUntil: new Date(at + 90_000) } });
    // The server starts.
    startAutomations();
    expect(await runTasks()).toEqual({ done: 1, retry: 0, failed: 0 });
    expect(await get(t.id)).toMatchObject({ status: "done", attempts: 2 });
    expect(await prisma.automationRun.count({ where: { ruleId: r.id, subject } })).toBe(1);
    // Had it stopped after the rule ran but before the task was marked done, the rule isn't run again.
    await prisma.task.update({ where: { id: t.id }, data: { status: "running", payload: { trigger: "order.created", data: { orderId: "ORD-9" }, subject, at }, lockedUntil: new Date(Date.now() - 1000) } });
    expect(await runTasks()).toEqual({ done: 1, retry: 0, failed: 0 });
    expect(await prisma.automationRun.count({ where: { ruleId: r.id, subject } })).toBe(1);
    expect(await rang()).toBe(1);
  });

  test("what isn't an event fails its tries and is set aside", async () => {
    startAutomations();
    const { id } = await enqueueTask("automation", { trigger: "nope" }, { maxAttempts: 1 });
    await runTasks();
    expect(await get(id)).toMatchObject({ status: "failed", lastError: "Not an automation's event" });
  });
});
