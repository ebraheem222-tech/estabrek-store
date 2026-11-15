import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { registerJob, resetJobsForTests, runJobNow } from "../lib/jobs.js";
import { RUN_KEEP_DAYS, cleanRuns, didSomething, flushRuns, isFolded, recordRun, resetRunsForTests, type RunIn } from "../lib/runs.js";
import { handleEvent, resetAutomationsForTests, testRule } from "../modules/admin/automations.service.js";

// The run log (E0.2), with the database: everything the server did by itself is kept in one table,
// so a restart doesn't wipe it. A run that failed or was asked for has a row of its own; a job's
// timer runs that went fine are folded into one row an hour, their counts added up. Requests
// without a token run as the test owner.

const NAME = "runsSpec";
const HOUR = 3_600_000;
const T0 = Date.parse("2026-11-15T10:05:00.000Z");
const run = (over: Partial<RunIn> = {}): RunIn => ({ kind: "job", name: NAME, trigger: "schedule", startedAt: T0, ms: 12, ok: true, result: null, ...over });
const rows = () => prisma.run.findMany({ where: { OR: [{ name: { startsWith: NAME } }, { name: { startsWith: "runs-spec" } }, { name: { startsWith: "/v1/webhooks/" } }] }, orderBy: [{ startedAt: "asc" }, { id: "asc" }] });
/** Everything recorded so far is in the table. */
const written = async () => {
  await flushRuns();
  await flushRuns();
};

async function clean() {
  await resetRunsForTests();
  resetJobsForTests();
  resetAutomationsForTests();
  await prisma.run.deleteMany({ where: { OR: [{ name: { startsWith: NAME } }, { name: { startsWith: "runs-spec" } }, { name: { startsWith: "/v1/webhooks/" } }] } });
  await prisma.automationRule.deleteMany({ where: { name: { startsWith: "runs-spec" } } });
  await prisma.adminNotification.deleteMany({ where: { title: { startsWith: "runs-spec" } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@runs-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: "runs-spec" } } });
  invalidateAccess();
}
beforeEach(clean);
afterAll(clean);

describe("What is written", () => {
  test("a run that was asked for, or failed, has a row of its own", async () => {
    recordRun(run({ trigger: "admin", result: { sent: 3, failed: 0 } }));
    recordRun(run({ trigger: "start", startedAt: T0 + 1000 }));
    recordRun(run({ trigger: "event", startedAt: T0 + 2000, result: { checked: 0 } }));
    recordRun(run({ ok: false, error: "SMTP timed out", startedAt: T0 + 3000, ms: 5000 }));
    await written();
    const got = await rows();
    expect(got.map((r) => [r.trigger, r.ok, r.times, r.ms, r.result, r.error])).toEqual([
      ["admin", true, 1, 12, { sent: 3, failed: 0 }, null],
      ["start", true, 1, 12, null, null],
      // Counts that are all zero say nothing: not kept.
      ["event", true, 1, 12, null, null],
      ["schedule", false, 1, 5000, null, "SMTP timed out"],
    ]);
    expect(got[0].startedAt.toISOString()).toBe("2026-11-15T10:05:00.000Z");
  });

  test("a job's timer runs that went fine are one row an hour: how many, how long and what they did together, when last", async () => {
    expect(isFolded(run())).toBe(true);
    expect(isFolded(run({ result: { sent: 1 } }))).toBe(true);
    for (const own of [run({ ok: false }), run({ trigger: "admin" }), run({ trigger: "event" }), run({ kind: "automation" })]) expect(isFolded(own)).toBe(false);
    expect(didSomething({ did: "an email" })).toBe(true);
    expect(didSomething({ checked: 0, sent: 0 })).toBe(false);
    expect(didSomething({})).toBe(false);
    // Forty runs in one hour (this one: a fold whose hour is over takes no more), then the hour turns.
    const H0 = Math.floor(Date.now() / HOUR) * HOUR + 5 * 60_000;
    for (let k = 0; k < 40; k++) recordRun(run({ startedAt: H0 + k * 60_000, ms: 10 }));
    await written();
    let got = await rows();
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ kind: "job", name: NAME, trigger: "schedule", ok: true, times: 40, ms: 400, result: null });
    expect(got[0].startedAt.getTime()).toBe(H0);
    expect(got[0].lastAt?.getTime()).toBe(H0 + 39 * 60_000);
    // More in the same hour change that row; they don't add one. What they did is added up.
    for (let k = 40; k < 50; k++) recordRun(run({ startedAt: H0 + k * 60_000, ms: 10, result: { checked: 2, sent: k % 2, failed: 0 } }));
    await written();
    got = await rows();
    expect(got.map((r) => [r.times, r.lastAt?.getTime(), r.result])).toEqual([[50, H0 + 49 * 60_000, { checked: 20, sent: 5, failed: 0 }]]);
    // The next hour is a row of its own; a failure in between is its own too.
    recordRun(run({ startedAt: H0 + HOUR, ok: false, error: "boom" }));
    recordRun(run({ startedAt: H0 + HOUR + 60_000 }));
    recordRun(run({ startedAt: H0 + HOUR + 120_000 }));
    // Another job's quiet runs don't mix with these.
    recordRun(run({ name: `${NAME}Other`, startedAt: H0 + 5000 }));
    await written();
    got = await rows();
    expect(got.map((r) => [r.name, r.ok, r.times])).toEqual([[NAME, true, 50], [`${NAME}Other`, true, 1], [NAME, false, 1], [NAME, true, 2]]);
  });

  test("old runs go after their days", async () => {
    const now = Date.now();
    recordRun(run({ trigger: "admin", startedAt: now - (RUN_KEEP_DAYS + 1) * 86_400_000 }));
    recordRun(run({ trigger: "admin", startedAt: now - (RUN_KEEP_DAYS - 1) * 86_400_000 }));
    await written();
    expect((await cleanRuns(now)).removed).toBeGreaterThanOrEqual(1);
    const got = await rows();
    expect(got).toHaveLength(1);
    expect(now - got[0].startedAt.getTime()).toBeLessThan(RUN_KEEP_DAYS * 86_400_000);
  });
});

describe("Who writes", () => {
  test("a background job: each run, with what it did or why it failed", async () => {
    let fail = false;
    registerJob({ name: NAME, group: "data", everyMs: null, run: async () => {
      if (fail) throw new Error("the disk is full");
      return { removed: 4 };
    } });
    expect((await runJobNow(NAME))?.run).toMatchObject({ ok: true, counts: { removed: 4 } });
    fail = true;
    expect((await runJobNow(NAME))?.run).toMatchObject({ ok: false, error: "the disk is full" });
    await written();
    const got = await rows();
    expect(got.map((r) => [r.kind, r.name, r.trigger, r.ok, r.result, r.error])).toEqual([
      ["job", NAME, "admin", true, { removed: 4 }, null],
      ["job", NAME, "admin", false, null, "the disk is full"],
    ]);
  });

  test("an automation: the rule by its name and id, what it was about, what it did", async () => {
    const rule = await prisma.automationRule.create({ data: { name: "runs-spec bell", trigger: "order.created", conditions: {}, action: "notify", config: {}, enabled: true } });
    const broken = await prisma.automationRule.create({ data: { name: "runs-spec email", trigger: "order.created", conditions: {}, action: "pinProduct", config: {}, enabled: true } });
    expect(await handleEvent("order.created", { orderId: "ORD-7", total: 50 }, "order:7", Date.now(), [rule, broken])).toBe(2);
    await testRule(rule, { orderId: "ORD-1" });
    await written();
    const got = (await rows()).map((r) => [r.kind, r.name, r.ref, r.trigger, r.subject, r.ok, r.result, r.error]);
    expect(got).toEqual([
      ["automation", "runs-spec bell", rule.id, "order.created", "order:7", true, { did: "إشعار باللوحة" }, null],
      // A product action on something that has no product: said as it failed.
      ["automation", "runs-spec email", broken.id, "order.created", "order:7", false, null, "NO_PRODUCT"],
      ["automation", "runs-spec bell", rule.id, "test", null, true, { did: "إشعار باللوحة" }, null],
    ]);
    // The rule's own list (the automations page) is still kept too.
    expect(await prisma.automationRun.count({ where: { ruleId: rule.id } })).toBe(2);
  });

  test("a webhook taken in, and one refused (once a minute, however many times it is tried)", async () => {
    await request(app).post("/v1/webhooks/wire").set("x-webhook-token", process.env.WEBHOOK_TOKEN ?? "").send({ eventId: "evt_9" }).expect(200);
    for (let k = 0; k < 3; k++) await request(app).post("/v1/webhooks/wire").set("x-webhook-token", "wrong").send({}).expect(401);
    // An address nobody answers isn't a webhook; reading isn't one either.
    await request(app).post("/v1/webhooks/no-such-thing").send({});
    await written();
    const got = (await rows()).map((r) => [r.kind, r.name, r.trigger, r.ok, r.result, r.error]);
    expect(got).toEqual([
      ["webhook", "/v1/webhooks/wire", "POST", true, { status: 200 }, null],
      ["webhook", "/v1/webhooks/wire", "POST", false, { status: 401 }, "HTTP 401"],
    ]);
  });
});

describe("The admin's page", () => {
  const at = "/v1/admin/system/runs";

  test("the log newest first, a page at a time, by kind, by name, or only what failed; and the last day in numbers", async () => {
    const now = Date.now();
    recordRun(run({ trigger: "admin", startedAt: now - 5 * 60_000, result: { sent: 2 } }));
    recordRun(run({ ok: false, error: "boom", startedAt: now - 4 * 60_000 }));
    // (Their minute may fall in the hour before this one: the page still shows them as that job's one row.)
    recordRun(run({ kind: "automation", name: "runs-spec rule", trigger: "order.created", startedAt: now - 3 * 60_000, result: { did: "x" } }));
    recordRun(run({ kind: "webhook", name: "/v1/webhooks/runs-spec", trigger: "POST", startedAt: now - 2 * 60_000, ok: false, error: "HTTP 400" }));
    for (let k = 0; k < 6; k++) recordRun(run({ name: `${NAME}Quiet`, startedAt: now - 60_000 + k * 1000 }));
    const mine = (list: Array<{ name: string }>) => list.filter((r) => r.name.startsWith(NAME) || r.name.includes("runs-spec"));
    // The page itself writes what was folded in the last minute before it answers.
    const first = (await request(app).get(at).query({ limit: 200 }).expect(200)).body;
    expect(mine(first.runs).map((r: { name: string; ok: boolean; times: number }) => [r.name, r.ok, r.times])).toEqual([
      [`${NAME}Quiet`, true, 6],
      ["/v1/webhooks/runs-spec", false, 1],
      ["runs-spec rule", true, 1],
      [NAME, false, 1],
      [NAME, true, 1],
    ]);
    expect(first.summary.keepDays).toBe(RUN_KEEP_DAYS);
    expect(first.summary.runs).toBeGreaterThanOrEqual(10);
    expect(first.summary.failures).toBeGreaterThanOrEqual(2);
    expect(first.summary.kinds.job.runs).toBeGreaterThanOrEqual(8);
    expect(first.summary.failing).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "job", name: NAME, failures: 1, error: "boom" }), expect.objectContaining({ kind: "webhook", name: "/v1/webhooks/runs-spec", error: "HTTP 400" })]));
    // Narrowed.
    const failed = (await request(app).get(at).query({ ok: "false", limit: 200 }).expect(200)).body;
    expect(mine(failed.runs).map((r: { name: string }) => r.name)).toEqual(["/v1/webhooks/runs-spec", NAME]);
    const jobs = (await request(app).get(at).query({ kind: "job", name: NAME }).expect(200)).body;
    expect(jobs.runs.map((r: { ok: boolean }) => r.ok)).toEqual([false, true]);
    // A page at a time: the next one starts where this ended, and carries no numbers.
    const page1 = (await request(app).get(at).query({ kind: "job", name: NAME, limit: 1 }).expect(200)).body;
    expect(page1.runs).toHaveLength(1);
    expect(page1.next).toBeTruthy();
    const page2 = (await request(app).get(at).query({ kind: "job", name: NAME, limit: 1, before: page1.next }).expect(200)).body;
    expect(page2.runs.map((r: { ok: boolean }) => r.ok)).toEqual([true]);
    expect(page2.next).toBeNull();
    expect(page2.summary).toBeUndefined();
    for (const bad of [{ kind: "nope" }, { ok: "maybe" }, { limit: 0 }, { before: "yesterday" }]) expect((await request(app).get(at).query(bad).expect(400)).body.error).toBe("VALIDATION_ERROR");
  });

  test("looking needs system:read", async () => {
    const role = await prisma.staffRole.create({ data: { name: "runs-spec editor", permissions: ["pages:read"] } });
    const member = await prisma.adminUser.create({ data: { email: "editor@runs-spec.test", name: "editor", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    const auth = `Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`;
    expect((await request(app).get(at).set("Authorization", auth).expect(403)).body).toMatchObject({ error: "PERMISSION_DENIED", required: ["system:read"] });
  });
});
