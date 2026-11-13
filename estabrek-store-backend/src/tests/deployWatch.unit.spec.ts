import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import express from "express";
import request from "supertest";

// Deploy watch (admin → حالة السيرفر): the commit running here against the branch's last one.
// GitHub and the database are stand-ins; the watch's own rules run for real.
const m = vi.hoisted(() => ({
  db: {
    automationRule: { count: vi.fn(), findMany: vi.fn() },
    adminNotification: { findFirst: vi.fn(), create: vi.fn() },
    performanceSettings: { findUnique: vi.fn() },
  },
}));
vi.mock("../lib/prisma.js", () => ({ prisma: m.db }));
vi.mock("../modules/outbox/sender/email.js", () => ({ emailConfigured: () => false }));

import { branchInRefs, checkDeploy, deploySnapshot, deployState, deployWatchOff, healthVersion, lateMs, liveVersion, resetDeployWatchForTests, setDeployFetchForTests } from "../lib/deployWatch.js";
import { setAutomationHandler } from "../lib/automations.js";
import { registerJob, resetJobsForTests } from "../lib/jobs.js";
import deploy from "../modules/admin/deploy.controller.js";

const LIVE = "a".repeat(40);
const NEXT = "b".repeat(40);
const MIN = 60_000;
const T0 = Date.parse("2026-11-13T10:00:00Z");

const ENV = ["RAILWAY_GIT_COMMIT_SHA", "GIT_COMMIT_SHA", "RAILWAY_GIT_REPO_OWNER", "RAILWAY_GIT_REPO_NAME", "RAILWAY_GIT_BRANCH", "RAILWAY_GIT_COMMIT_MESSAGE", "RAILWAY_PROJECT_NAME", "RAILWAY_ENVIRONMENT_NAME", "RAILWAY_DEPLOYMENT_ID", "DEPLOY_REPO", "DEPLOY_BRANCH", "DEPLOY_LATE_MINUTES", "GITHUB_TOKEN"];
const saved: Record<string, string | undefined> = {};

/** What GitHub answers: the branch's commit, the commit's words, the deployment's mark. */
const github = { tip: LIVE, refsFail: false, down: false, words: { message: "Merge pull request #92\n\nmore", at: null as string | null } as null | { message: string; at: string | null }, mark: null as string | null, calls: [] as Array<{ url: string; auth: string | undefined }> };

const refs = (tip: string) => `001e# service=git-upload-pack\n0000015${tip} HEAD\0multi_ack symref=HEAD:refs/heads/main\n003d${tip} refs/heads/main\n0040${"c".repeat(40)} refs/heads/main-2\n0000`;
const answer = (status: number, body: unknown) => ({ ok: status < 400, status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)), json: async () => body });

const told: Array<{ trigger: string; data: Record<string, unknown>; subject: string }> = [];
const settle = () => new Promise((r) => setTimeout(r, 5));

beforeEach(() => {
  for (const k of ENV) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  Object.assign(process.env, { RAILWAY_GIT_COMMIT_SHA: LIVE, RAILWAY_GIT_REPO_OWNER: "acme", RAILWAY_GIT_REPO_NAME: "shop", RAILWAY_GIT_BRANCH: "main", RAILWAY_GIT_COMMIT_MESSAGE: "Merge pull request #91\n\nbody", RAILWAY_PROJECT_NAME: "proj", RAILWAY_ENVIRONMENT_NAME: "production" });
  Object.assign(github, { tip: LIVE, refsFail: false, down: false, words: { message: "Merge pull request #92\n\nmore", at: null }, mark: null, calls: [] });
  told.length = 0;
  vi.clearAllMocks();
  m.db.automationRule.count.mockResolvedValue(0);
  m.db.automationRule.findMany.mockResolvedValue([]);
  m.db.adminNotification.findFirst.mockResolvedValue(null);
  m.db.adminNotification.create.mockResolvedValue({});
  resetDeployWatchForTests();
  setAutomationHandler(async (trigger, data, subject) => void told.push({ trigger, data, subject }));
  setDeployFetchForTests(async (url, init) => {
    github.calls.push({ url, auth: init.headers.Authorization });
    if (github.down) throw new Error("fetch failed");
    if (url.includes("/info/refs")) return github.refsFail ? answer(503, "") : answer(200, refs(github.tip));
    if (/\/commits\/main$/.test(url)) return answer(200, `${github.tip}\n`);
    if (/\/commits\/[0-9a-f]{40}$/.test(url)) return github.words ? answer(200, { commit: { message: github.words.message, committer: { date: github.words.at } } }) : answer(403, {});
    if (url.includes("/deployments?")) return github.mark ? answer(200, [{ id: 7 }]) : answer(200, []);
    if (url.includes("/deployments/7/statuses")) return answer(200, [{ state: github.mark }]);
    return answer(404, {});
  });
});

afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  setDeployFetchForTests(null);
  setAutomationHandler(null);
  resetJobsForTests();
});

describe("What the host says", () => {
  test("the commit, the repository and the branch; nonsense is refused", () => {
    expect(liveVersion()).toEqual({ commit: LIVE, message: "Merge pull request #91", repo: "acme/shop", branch: "main", environment: "proj / production", deploymentId: null });
    expect(liveVersion({ RAILWAY_GIT_COMMIT_SHA: "not-a-sha", RAILWAY_GIT_REPO_OWNER: "acme" })).toMatchObject({ commit: null, repo: null, branch: "main", environment: null });
    expect(liveVersion({ GIT_COMMIT_SHA: LIVE.toUpperCase(), DEPLOY_REPO: "me/api.git", DEPLOY_BRANCH: "release/1" })).toMatchObject({ commit: LIVE, repo: "me/api", branch: "release/1" });
    expect(liveVersion({ DEPLOY_REPO: "../../etc", DEPLOY_BRANCH: "a b" })).toMatchObject({ repo: null, branch: "main" });
  });

  test("off where the host doesn't say; late after 10 minutes unless set (3 to 120)", () => {
    expect(deployWatchOff()).toBeNull();
    expect(deployWatchOff({})).toBe("RAILWAY_GIT_COMMIT_SHA");
    expect(deployWatchOff({ RAILWAY_GIT_COMMIT_SHA: LIVE })).toBe("RAILWAY_GIT_COMMIT_SHA");
    expect(lateMs({})).toBe(10 * MIN);
    expect(lateMs({ DEPLOY_LATE_MINUTES: "25" })).toBe(25 * MIN);
    expect(lateMs({ DEPLOY_LATE_MINUTES: "1" })).toBe(3 * MIN);
    expect(lateMs({ DEPLOY_LATE_MINUTES: "x" })).toBe(10 * MIN);
    expect(healthVersion().commit).toBe("aaaaaaa");
  });

  test("the branch's commit in git's listing", () => {
    expect(branchInRefs(refs(NEXT), "main")).toBe(NEXT);
    expect(branchInRefs(refs(NEXT), "main-2")).toBe("c".repeat(40));
    expect(branchInRefs(refs(NEXT), "mai")).toBeNull();
    expect(branchInRefs(refs(NEXT), "ma.n")).toBeNull();
    expect(branchInRefs(`0155${NEXT} refs/heads/main\0caps`, "main")).toBe(NEXT);
  });
});

describe("The watch", () => {
  test("the branch's last commit runs here: current, with one question and no key", async () => {
    expect(deployState(T0)).toEqual({ state: "unknown", reason: "notChecked" });
    expect(await checkDeploy(T0)).toEqual({ checked: 1, behind: 0 });
    expect(deployState(T0)).toEqual({ state: "current", reason: null });
    expect(github.calls).toEqual([{ url: "https://github.com/acme/shop.git/info/refs?service=git-upload-pack", auth: undefined }]);
    expect(deploySnapshot(T0)).toMatchObject({ state: "current", latest: { commit: LIVE, message: "Merge pull request #91" }, checkedAt: "2026-11-13T10:00:00.000Z", error: null, told: false });
  });

  test("a new commit: deploying, then late after 10 minutes; the bell and the rules hear it once", async () => {
    await checkDeploy(T0);
    github.tip = NEXT;
    expect(await checkDeploy(T0 + MIN)).toEqual({ checked: 1, behind: 1, told: 0 });
    expect(deploySnapshot(T0 + MIN)).toMatchObject({ state: "deploying", latest: { commit: NEXT, message: "Merge pull request #92", since: "2026-11-13T10:01:00.000Z" } });
    expect((await checkDeploy(T0 + 10 * MIN)).told).toBe(0);
    expect((await checkDeploy(T0 + 11 * MIN)).told).toBe(1);
    expect(deployState(T0 + 11 * MIN).state).toBe("late");
    await settle();
    expect(m.db.adminNotification.create).toHaveBeenCalledTimes(1);
    const bell = m.db.adminNotification.create.mock.calls[0][0].data;
    expect(bell).toMatchObject({ title: "النشر متأخّر", link: "/admin/system/server" });
    expect(bell.body).toBe("النشر تأخّر: التعديل bbbbbbb (Merge pull request #92) على الفرع من 10 دقيقة ولسا مش حي. السيرفر شغّال على aaaaaaa.");
    expect(told).toEqual([{ trigger: "deploy.failed", subject: `deploy:${NEXT}`, data: { commit: "bbbbbbb", message: "Merge pull request #92", minutes: 10, live: "aaaaaaa", reason: "تأخّر", link: "/admin/system/server" } }]);
    // Still late a minute later: nothing more is said.
    expect((await checkDeploy(T0 + 12 * MIN)).told).toBe(0);
    await settle();
    expect(m.db.adminNotification.create).toHaveBeenCalledTimes(1);
    expect(told).toHaveLength(1);
    expect(deploySnapshot(T0 + 12 * MIN).told).toBe(true);
  });

  test("the host marks the deployment as failed: told at once, not after 10 minutes", async () => {
    await checkDeploy(T0);
    github.tip = NEXT;
    await checkDeploy(T0 + MIN);
    // The mark is only asked for once the build had two minutes.
    expect(github.calls.some((c) => c.url.includes("/deployments"))).toBe(false);
    github.mark = "in_progress";
    expect((await checkDeploy(T0 + 3 * MIN)).told).toBe(0);
    expect(deploySnapshot(T0 + 3 * MIN)).toMatchObject({ state: "deploying", mark: "in_progress" });
    github.mark = "failure";
    // Asked again every two minutes, not every look.
    expect((await checkDeploy(T0 + 4 * MIN)).told).toBe(0);
    expect((await checkDeploy(T0 + 5 * MIN)).told).toBe(1);
    expect(deployState(T0 + 5 * MIN).state).toBe("failed");
    await settle();
    expect(m.db.adminNotification.create.mock.calls[0][0].data.title).toBe("النشر فشل");
    expect(told[0].data).toMatchObject({ reason: "فشل", minutes: 4 });
    expect(github.calls.find((c) => c.url.includes("/deployments?"))?.url).toBe(`https://api.github.com/repos/acme/shop/deployments?sha=${NEXT}&environment=proj%20%2F%20production&per_page=1`);
    // Known failed: the mark isn't asked again.
    const before = github.calls.length;
    await checkDeploy(T0 + 9 * MIN);
    expect(github.calls.length).toBe(before + 1);
  });

  test("an old server that restarts behind: late from its first look, by the commit's own time", async () => {
    github.tip = NEXT;
    github.words = { message: "fix", at: "2026-11-13T08:00:00Z" };
    expect((await checkDeploy(T0)).told).toBe(1);
    expect(deploySnapshot(T0)).toMatchObject({ state: "late", latest: { since: "2026-11-13T08:00:00.000Z", at: "2026-11-13T08:00:00Z" } });
    await settle();
    expect(told[0].data.minutes).toBe(120);
    // A commit seen while running counts from when it was seen, whatever its own time says.
    github.tip = "d".repeat(40);
    await checkDeploy(T0 + MIN);
    expect(deploySnapshot(T0 + MIN)).toMatchObject({ state: "deploying", latest: { since: "2026-11-13T10:01:00.000Z" } });
  });

  test("the bell isn't doubled: a rule of the owner's rings it, or it rang for this commit already", async () => {
    github.tip = NEXT;
    github.words = { message: "fix", at: "2026-11-13T08:00:00Z" };
    m.db.automationRule.count.mockResolvedValue(1);
    await checkDeploy(T0);
    await settle();
    expect(m.db.adminNotification.create).not.toHaveBeenCalled();
    expect(told).toHaveLength(1);

    resetDeployWatchForTests();
    m.db.automationRule.count.mockResolvedValue(0);
    m.db.adminNotification.findFirst.mockResolvedValue({ id: "n1" });
    await checkDeploy(T0 + MIN);
    await settle();
    expect(m.db.adminNotification.create).not.toHaveBeenCalled();
    expect(m.db.adminNotification.findFirst.mock.calls[0][0].where).toMatchObject({ link: "/admin/system/server", body: { contains: "bbbbbbb" } });
    expect(told).toHaveLength(2);
  });

  test("the commit's words are a bonus: without them the watch still tells", async () => {
    await checkDeploy(T0);
    github.tip = NEXT;
    github.words = null;
    await checkDeploy(T0 + MIN);
    expect((await checkDeploy(T0 + 11 * MIN)).told).toBe(1);
    await settle();
    expect(told[0].data).toMatchObject({ commit: "bbbbbbb", message: "" });
    expect(m.db.adminNotification.create.mock.calls[0][0].data.body).toContain("bbbbbbb ()");
  });

  test("GitHub can't be reached: shown, not an alarm; half an hour blind fails the job", async () => {
    github.down = true;
    expect(await checkDeploy(T0)).toEqual({ checked: 0, unreachable: 1 });
    expect(deploySnapshot(T0)).toMatchObject({ state: "unknown", reason: "cantReach", error: "fetch failed", latest: null });
    expect(await checkDeploy(T0 + 29 * MIN)).toEqual({ checked: 0, unreachable: 1 });
    await expect(checkDeploy(T0 + 30 * MIN)).rejects.toThrow("fetch failed");
    github.down = false;
    expect(await checkDeploy(T0 + 31 * MIN)).toEqual({ checked: 1, behind: 0 });
    expect(deploySnapshot(T0 + 31 * MIN)).toMatchObject({ state: "current", error: null });
    // What was known stays known through a hiccup.
    github.down = true;
    await checkDeploy(T0 + 32 * MIN);
    expect(deploySnapshot(T0 + 32 * MIN)).toMatchObject({ state: "current", error: "fetch failed" });
  });

  test("git's listing fails: the API answers instead; with a key only the API is asked", async () => {
    github.refsFail = true;
    expect(await checkDeploy(T0)).toEqual({ checked: 1, behind: 0 });
    expect(github.calls.map((c) => c.url)).toEqual(["https://github.com/acme/shop.git/info/refs?service=git-upload-pack", "https://api.github.com/repos/acme/shop/commits/main"]);

    resetDeployWatchForTests();
    github.calls.length = 0;
    github.refsFail = false;
    process.env.GITHUB_TOKEN = "test-key";
    await checkDeploy(T0);
    expect(github.calls).toEqual([{ url: "https://api.github.com/repos/acme/shop/commits/main", auth: "Bearer test-key" }]);
  });

  test("nothing is asked where the host doesn't say which commit runs", async () => {
    delete process.env.RAILWAY_GIT_COMMIT_SHA;
    expect(await checkDeploy(T0)).toEqual({ checked: 0 });
    expect(github.calls).toEqual([]);
    expect(deployState(T0)).toEqual({ state: "unknown", reason: "noCommit" });
    process.env.RAILWAY_GIT_COMMIT_SHA = LIVE;
    delete process.env.RAILWAY_GIT_REPO_NAME;
    expect(deployState(T0)).toEqual({ state: "unknown", reason: "noRepo" });
  });
});

describe("The admin's page", () => {
  const app = express();
  app.use(express.json());
  app.use("/deploy", deploy);

  test("the state, the owner's rules, and \"look now\"", async () => {
    registerJob({ name: "deployWatch", group: "control", everyMs: MIN, run: () => checkDeploy(T0) });
    m.db.automationRule.findMany.mockResolvedValue([{ id: "r1", name: "النشر فشل", action: "email", enabled: true }]);
    const first = await request(app).get("/deploy").expect(200);
    expect(first.body).toMatchObject({ state: "unknown", reason: "notChecked", live: { commit: LIVE, repo: "acme/shop", branch: "main" }, latest: null, lateAfterMinutes: 10, rules: [{ id: "r1", action: "email" }], channels: { email: false }, watch: { status: "waiting", everyMs: MIN } });
    expect(m.db.automationRule.findMany.mock.calls[0][0].where).toEqual({ trigger: "deploy.failed" });
    const looked = await request(app).post("/deploy/check").expect(200);
    expect(looked.body).toMatchObject({ ran: true, busy: false, state: "current", latest: { commit: LIVE } });
  });
});
