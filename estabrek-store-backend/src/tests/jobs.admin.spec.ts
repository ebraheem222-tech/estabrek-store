import { describe, test, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { applyJobsConfig, jobsSnapshot, resetJobsForTests } from "../lib/jobs.js";
import { registerBackgroundJobs } from "../jobs.js";
import { flushRum, noteRum, resetRumForTests } from "../lib/rum.js";

// Background jobs page (admin → المهام بالخلفية) and the shoppers' speed report
// (مراقبة السرعة والأولوية → تجربة الزباين), with the database. Requests without
// a token run as the test owner.

async function clean() {
  await prisma.performanceSettingsRevision.deleteMany();
  await prisma.performanceSettings.deleteMany();
  await prisma.rumDaily.deleteMany();
  applyJobsConfig({});
  resetRumForTests();
}

beforeAll(() => registerBackgroundJobs());
beforeEach(clean);
afterAll(async () => {
  await clean();
  resetJobsForTests();
});

describe("Background jobs", () => {
  test("every job is listed with its timer", async () => {
    const out = await request(app).get("/v1/admin/system/jobs").expect(200);
    expect(out.body.jobs.map((j: any) => j.name)).toEqual([
      "outbox",
      "stockAlerts",
      "backup",
      "requestPhotos",
      "popularitySave",
      "popularityHot",
      "popularityLoad",
      "cacheWarm",
      "cacheSweep",
      "rumSave",
      "abSave",
      "campaigns",
      "scheduled",
      "automations",
      "videoConvert",
    ]);
    const stock = out.body.jobs.find((j: any) => j.name === "stockAlerts");
    expect(stock).toMatchObject({ group: "messages", everyMs: 120_000, defaultEveryMs: 120_000, paused: false });
  });

  test("pause and timer: in force at once, saved minimal, in the shared history", async () => {
    const out = await request(app)
      .patch("/v1/admin/system/jobs")
      .send({ jobs: { stockAlerts: { paused: true }, rumSave: { everyMs: 300_000 } } })
      .expect(200);
    expect(out.body.changed.sort()).toEqual(["jobs.rumSave.everyMs", "jobs.stockAlerts.paused"]);
    const snap = jobsSnapshot().jobs;
    expect(snap.find((j) => j.name === "stockAlerts")).toMatchObject({ paused: true, status: "paused" });
    expect(snap.find((j) => j.name === "rumSave")?.everyMs).toBe(300_000);
    const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
    expect((row?.data as any).jobs).toEqual({ stockAlerts: { paused: true }, rumSave: { everyMs: 300_000 } });
    const history = await request(app).get("/v1/admin/system/cache").expect(200);
    expect(history.body.revisions[0].changed).toEqual(expect.arrayContaining(["jobs.stockAlerts.paused"]));
    // Back to the defaults: nothing kept.
    await request(app)
      .patch("/v1/admin/system/jobs")
      .send({ jobs: { stockAlerts: { paused: false }, rumSave: { everyMs: null } } })
      .expect(200);
    const again = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
    expect((again?.data as any).jobs).toEqual({});
  });

  test("unknown jobs, timers out of range and pausing what can't pause are refused", async () => {
    await request(app).patch("/v1/admin/system/jobs").send({ jobs: { nope: { paused: true } } }).expect(400);
    await request(app).patch("/v1/admin/system/jobs").send({ jobs: { cacheSweep: { everyMs: 1000 } } }).expect(400);
    await request(app).patch("/v1/admin/system/jobs").send({ jobs: { cacheWarm: { everyMs: 60_000 } } }).expect(400);
    await request(app).patch("/v1/admin/system/jobs").send({ jobs: { videoConvert: { paused: true } } }).expect(400);
    expect(await prisma.performanceSettings.count()).toBe(0);
  });

  test("run now", async () => {
    const out = await request(app).post("/v1/admin/system/jobs/cacheSweep/run").expect(200);
    expect(out.body).toMatchObject({ started: true, busy: false, run: { ok: true, trigger: "admin" } });
    expect(typeof out.body.run.counts.removed).toBe("number");
    await request(app).post("/v1/admin/system/jobs/videoConvert/run").expect(400);
    await request(app).post("/v1/admin/system/jobs/nope/run").expect(404);
  });
});

describe("Shoppers' speed report", () => {
  const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/128 Mobile Safari/537.36";
  const DAY = 86400_000;

  test("per page, device and system; getting worse is noticed", async () => {
    const now = Date.now();
    const report = (daysAgo: number, lcp: number, n: number) => {
      for (let i = 0; i < n; i++) noteRum([{ page: "product", device: "phone", os: "android", m: { lcp, scrollFps: 58 } }], { userAgent: UA }, now - daysAgo * DAY);
    };
    report(6, 1800, 30); // the week before: fast
    report(1, 3600, 30); // the last days: slow
    noteRum([{ page: "home", device: "desktop", os: "windows", m: { lcp: 1200 } }], { userAgent: UA }, now);
    await flushRum(now);
    expect(await prisma.rumDaily.count()).toBeGreaterThan(0);

    const out = await request(app).get("/v1/admin/system/speed/rum?days=14").expect(200);
    const product = out.body.items.find((i: any) => i.page === "product");
    expect(product).toMatchObject({ device: "phone", os: "android", visits: 30 + 30 });
    expect(product.worse).toContain("lcp");
    expect(product.metrics.scrollFps.rating).toBe("good");
    expect(product.daily).toHaveLength(14);
    expect(out.body.overall.lcp.count).toBe(61);

    const desktops = await request(app).get("/v1/admin/system/speed/rum?days=14&device=desktop&split=device").expect(200);
    expect(desktops.body.items).toEqual([expect.objectContaining({ page: "home", device: "desktop", os: "all" })]);
    await request(app).get("/v1/admin/system/speed/rum?days=0").expect(400);
  });
});
