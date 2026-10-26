import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  applyJobsConfig,
  errorText,
  jobsChanges,
  jobsSnapshot,
  mergeJobsConfig,
  recordJobRun,
  registerJob,
  resetJobsForTests,
  runJobNow,
  startJobs,
  stopJobs,
  triggerJob,
  type JobDef,
} from "../lib/jobs.js";

// Background jobs (المهام بالخلفية): timers that never overlap, history, pause,
// timers from the admin, events, "run now". No database.

const job = (over: Partial<JobDef> & { name: string }): JobDef => ({ group: "data", everyMs: 1000, limits: { min: 500, max: 10_000 }, run: async () => null, ...over });
const snap = (name: string) => jobsSnapshot().jobs.find((j) => j.name === name)!;
/** Moves the fake clock and lets the runs started by it finish. */
const advance = async (ms: number) => {
  await vi.advanceTimersByTimeAsync(ms);
};

beforeEach(() => {
  resetJobsForTests();
  vi.useFakeTimers();
});
afterEach(async () => {
  // Real timers first: a run left hanging on a fake timer must not hold the cleanup.
  vi.useRealTimers();
  await stopJobs(0);
  resetJobsForTests();
});

describe("Running on a timer", () => {
  test("runs every interval and keeps what each run did", async () => {
    let n = 0;
    registerJob(job({ name: "count", run: async () => ({ sent: ++n, note: "x" as unknown as number }) }));
    startJobs();
    await advance(3100);
    const s = snap("count");
    expect(s.total.runs).toBe(3);
    expect(s.runs[0]).toMatchObject({ ok: true, trigger: "schedule", counts: { sent: 3 }, error: null });
    expect(s.runs[0].counts).not.toHaveProperty("note"); // only numbers
    expect(s.status).toBe("waiting");
    expect(s.nextAt).not.toBeNull();
  });

  test("a slow run is never doubled: the next one starts after it ends", async () => {
    let running = 0;
    let most = 0;
    registerJob(
      job({
        name: "slow",
        run: async () => {
          running += 1;
          most = Math.max(most, running);
          await new Promise((r) => setTimeout(r, 2500));
          running -= 1;
          return null;
        },
      }),
    );
    startJobs();
    await advance(1000); // starts
    expect(snap("slow").status).toBe("running");
    expect(await runJobNow("slow")).toMatchObject({ started: false, busy: true });
    await advance(9000);
    expect(most).toBe(1);
    // Starts at 1 s, 4.5 s, 8 s (each 1 s after the last ended): two done, the third going.
    expect(snap("slow").total.runs).toBe(2);
    expect(snap("slow").status).toBe("running");
  });

  test("a failing run: the error, how many in a row; the timer goes on", async () => {
    let fail = true;
    registerJob(
      job({
        name: "flaky",
        run: async () => {
          if (fail) throw new Error("SMTP   timed\nout");
          return { sent: 1 };
        },
      }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    startJobs();
    await advance(2000);
    let s = snap("flaky");
    expect(s.failuresInRow).toBe(2);
    expect(s.lastError?.message).toBe("SMTP timed out");
    expect(s.runs[0]).toMatchObject({ ok: false, error: "SMTP timed out" });
    fail = false;
    await advance(1000);
    s = snap("flaky");
    expect(s.failuresInRow).toBe(0);
    expect(s.total).toMatchObject({ runs: 3, failures: 2 });
    expect(s.lastError).not.toBeNull(); // the last one is still shown
    log.mockRestore();
  });

  test("a database error is shown as its call and its cause", () => {
    const prismaError = new Error(
      [
        "",
        "Invalid `prisma.outboxMessage.findMany()` invocation in",
        "C:\\app\\src\\outbox.service.ts:101:47",
        "",
        "  98 const batch = await prisma.outboxMessage.findMany(",
        "Can't reach database server at `db:5432`",
      ].join("\n"),
    );
    expect(errorText(prismaError)).toBe("prisma.outboxMessage.findMany: Can't reach database server at `db:5432`");
    expect(errorText("plain")).toBe("plain");
  });

  test("the first run soon after start, then the timer", async () => {
    const triggers: string[] = [];
    registerJob(job({ name: "first", everyMs: 10_000, firstMs: 100, run: async (t) => (triggers.push(t), null) }));
    startJobs();
    await advance(150);
    expect(triggers).toEqual(["start"]);
    await advance(10_000);
    expect(triggers).toEqual(["start", "schedule"]);
  });

  test("a job without a timer runs only on events (and at start when asked)", async () => {
    const triggers: string[] = [];
    registerJob(job({ name: "warm", everyMs: null, firstMs: 200, run: async (t) => (triggers.push(t), null) }));
    startJobs();
    await advance(60_000);
    expect(triggers).toEqual(["start"]);
    expect(snap("warm").status).toBe("onDemand");
  });
});

describe("From the admin", () => {
  test("paused: no runs on the timer or events; run now still works", async () => {
    let n = 0;
    registerJob(job({ name: "p", run: async () => (n++, null) }));
    applyJobsConfig({ p: { paused: true } });
    startJobs();
    await advance(5000);
    expect(triggerJob("p")).toBe(true);
    await advance(10);
    expect(n).toBe(0);
    expect(snap("p")).toMatchObject({ status: "paused", paused: true, late: false });
    expect(await runJobNow("p")).toMatchObject({ started: true, run: { ok: true, trigger: "admin" } });
    expect(n).toBe(1);
    applyJobsConfig({});
    await advance(1000);
    expect(n).toBe(2);
  });

  test("a new timer counts from now, within the job's limits", async () => {
    let n = 0;
    registerJob(job({ name: "t", everyMs: 10_000, limits: { min: 2000, max: 20_000 }, run: async () => (n++, null) }));
    startJobs();
    await advance(3000);
    applyJobsConfig({ t: { everyMs: 2000 } });
    await advance(2100);
    expect(n).toBe(1);
    expect(snap("t").everyMs).toBe(2000);
    applyJobsConfig({ t: { everyMs: 50 } }); // below the limit: the limit
    expect(snap("t").everyMs).toBe(2000);
  });

  test("off by the server's settings: never on the timer, shown with the reason", async () => {
    let n = 0;
    registerJob(job({ name: "o", offReason: () => "OUTBOX_WORKER", run: async () => (n++, null) }));
    startJobs();
    await advance(5000);
    expect(n).toBe(0);
    expect(snap("o")).toMatchObject({ status: "off", off: "OUTBOX_WORKER" });
    // The admin can still send now (as the outbox page always could).
    await runJobNow("o");
    expect(n).toBe(1);
  });

  test("settings: only valid entries are kept; changes are named", () => {
    expect(mergeJobsConfig({ backup: { paused: true }, "bad name": { paused: true }, rumSave: { everyMs: 5 }, x: "no" })).toEqual({ backup: { paused: true } });
    expect(mergeJobsConfig(null)).toEqual({});
    expect(jobsChanges({ backup: { paused: true } }, { backup: { everyMs: 60_000 } })).toEqual(["jobs.backup.paused", "jobs.backup.everyMs"]);
    expect(jobsChanges({}, {})).toEqual([]);
  });
});

describe("Events and work from elsewhere", () => {
  test("many events in a row → one run, soon after the first", async () => {
    let n = 0;
    registerJob(job({ name: "e", everyMs: 60_000, run: async () => (n++, null) }));
    expect(triggerJob("e", 100)).toBe(false); // not started: the caller does it itself
    startJobs();
    expect(triggerJob("missing", 100)).toBe(false);
    for (let i = 0; i < 5; i++) triggerJob("e", 3000);
    await advance(3100);
    expect(n).toBe(1);
    expect(snap("e").runs[0].trigger).toBe("event");
    // Back on its timer after the event.
    await advance(60_000);
    expect(n).toBe(2);
  });

  test("an event during a run: one more run after it", async () => {
    const seen: number[] = [];
    let version = 0;
    registerJob(
      job({
        name: "late",
        everyMs: 60_000,
        run: async () => {
          const v = version;
          await new Promise((r) => setTimeout(r, 1000));
          seen.push(v);
          return null;
        },
      }),
    );
    startJobs();
    void runJobNow("late", 0);
    version = 1;
    triggerJob("late", 100);
    await advance(3000);
    expect(seen).toEqual([0, 1]);
  });

  test("work recorded from elsewhere (video conversions): history, errors passed on", async () => {
    registerJob(job({ name: "videoConvert", everyMs: null, canPause: false, canRunNow: false, live: () => ({ waiting: 2 }) }));
    expect(await recordJobRun("videoConvert", "event", async () => "done")).toBe("done");
    await expect(recordJobRun("videoConvert", "event", async () => Promise.reject(new Error("ffmpeg stopped (1)")))).rejects.toThrow("ffmpeg stopped");
    const s = snap("videoConvert");
    expect(s.runs.map((r) => r.ok)).toEqual([false, true]);
    expect(s.live).toEqual({ waiting: 2 });
    expect(await runJobNow("videoConvert")).toEqual({ started: false, busy: false, run: null });
    // Not registered (tests, scripts): just runs.
    expect(await recordJobRun("nothing", "event", async () => 7)).toBe(7);
  });

  test("a run that never ends shows as stuck", async () => {
    registerJob(job({ name: "hang", everyMs: 1000, stuckMs: 5000, run: () => new Promise(() => undefined) }));
    startJobs();
    await advance(1000);
    expect(snap("hang")).toMatchObject({ status: "running", stuck: false });
    await advance(6000);
    expect(snap("hang").stuck).toBe(true);
  });
});

describe("The admin routes", () => {
  const app = async () => {
    const jobs = (await import("../modules/admin/jobs.controller.js")).default;
    const { errorHandler } = await import("../middleware/error.js");
    const a = express();
    a.use(express.json());
    a.use("/jobs", jobs);
    a.use(errorHandler);
    return a;
  };

  test("the list, run now, and refusing unknown jobs or timers out of range", async () => {
    vi.useRealTimers();
    process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/none";
    process.env.JWT_SECRET ||= "test-secret-at-least-16";
    let n = 0;
    registerJob(job({ name: "stockAlerts", group: "messages", everyMs: 120_000, limits: { min: 15_000, max: 3_600_000 }, run: async () => ({ sent: ++n }) }));
    registerJob(job({ name: "videoConvert", everyMs: null, canPause: false, canRunNow: false }));
    const a = await app();
    const list = await request(a).get("/jobs").expect(200);
    expect(list.body.jobs.map((j: { name: string }) => j.name)).toEqual(["stockAlerts", "videoConvert"]);
    const ran = await request(a).post("/jobs/stockAlerts/run").expect(200);
    expect(ran.body).toMatchObject({ started: true, run: { ok: true, counts: { sent: 1 }, trigger: "admin" } });
    await request(a).post("/jobs/nope/run").expect(404);
    await request(a).post("/jobs/videoConvert/run").expect(400);
    const bad = await request(a)
      .patch("/jobs")
      .send({ jobs: { stockAlerts: { everyMs: 1000 }, videoConvert: { paused: true }, nope: { paused: true } } })
      .expect(400);
    expect(bad.body.error?.details?.fields ?? bad.body.details?.fields ?? bad.body.fields).toEqual(["stockAlerts.everyMs", "videoConvert.paused", "nope"]);
  }, 60_000);
});
