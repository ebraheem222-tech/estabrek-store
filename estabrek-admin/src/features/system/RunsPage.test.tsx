// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Run, RunsPage as Page, RunsQuery, RunsSummary } from "../../api/runs.api";

// سجل التشغيل: the page over a stand-in API, and its words. Everything the server did by itself,
// newest first; by kind, by one thing, or only what failed; a job's quiet runs of an hour as one line.

const m = vi.hoisted(() => ({ getRuns: vi.fn() }));
vi.mock("../../api/runs.api", () => ({ getRuns: m.getRuns }));

import { setLangForTests } from "../../lib/lang";
import RunsPage from "./RunsPage";
import { keepLine, runDid, runName, runTimes, runTook, runTrigger, summaryLine, whenText } from "./runsText";

const NOW = Date.parse("2026-11-15T12:00:00Z");
const run = (over: Partial<Run>): Run => ({ id: "r", kind: "job", name: "outbox", ref: null, trigger: "schedule", subject: null, startedAt: "2026-11-15T11:59:00Z", lastAt: null, times: 1, ms: 120, ok: true, result: null, error: null, ...over });
const sent = run({ id: "r1", result: { checked: 3, sent: 3, failed: 0 } });
const quiet = run({ id: "r2", name: "cacheSweep", startedAt: "2026-11-15T11:00:10Z", lastAt: "2026-11-15T11:58:40Z", times: 118, ms: 1180 });
const failed = run({ id: "r3", name: "backup", trigger: "admin", ok: false, error: "Cloudinary said no", ms: 4000, startedAt: "2026-11-15T11:30:00Z" });
const rule = run({ id: "r4", kind: "automation", name: "طلب كبير", ref: "rule1", trigger: "order.created", subject: "order:42", result: { did: "إيميل ← owner@shop.test" }, startedAt: "2026-11-15T11:20:00Z" });
const hook = run({ id: "r5", kind: "webhook", name: "/v1/webhooks/stripe", trigger: "POST", result: { status: 200 }, startedAt: "2026-11-14T09:00:00Z" });
const summary: RunsSummary = { since: "2026-11-14T12:00:00Z", from: "2026-11-05T08:00:00Z", keepDays: 30, runs: 4210, failures: 2, kinds: { job: { runs: 4200, failures: 1 }, automation: { runs: 8, failures: 0 }, webhook: { runs: 2, failures: 1 } }, failing: [{ kind: "job", name: "backup", failures: 1, lastAt: "2026-11-15T11:30:00Z", error: "Cloudinary said no" }] };
const all = [sent, quiet, failed, rule, hook];

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <RunsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const asked = () => m.getRuns.mock.calls.map((c) => c[0] as RunsQuery);

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.getRuns.mockImplementation(async (q: RunsQuery): Promise<Page> => {
    const runs = all.filter((r) => (!q.kind || r.kind === q.kind) && (q.ok === undefined || r.ok === q.ok) && (!q.name || r.name === q.name));
    if (q.before) return { now: NOW, runs: [run({ id: "old", name: "outbox", startedAt: "2026-11-10T10:00:00Z", result: { sent: 1 } })], next: null };
    return { now: NOW, runs, next: !q.kind && q.ok === undefined ? "2026-11-14T09:00:00.000Z" : null, summary };
  });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The run log's words", () => {
  test("what ran, what started it, what it did", () => {
    // A job by the name its own page calls it; a rule and a webhook by their own.
    expect(runName(sent)).toBe("إرسال الرسايل");
    expect(runName(rule)).toBe("طلب كبير");
    expect(runName(hook)).toBe("/v1/webhooks/stripe");
    expect(runTrigger(sent, "en")).toBe("على الوقت");
    expect(runTrigger(rule, "en")).toBe("طلب جديد");
    expect(runTrigger({ kind: "automation", trigger: "test" }, "en")).toBe("A try");
    expect(runTrigger(hook, "en")).toBe("POST");
    expect(runDid(sent, "en")).toBe("3 انبعت");
    expect(runDid(failed, "en")).toBe("Cloudinary said no");
    expect(runDid(run({ ok: false }), "en")).toBe("Failed");
    expect(runDid(rule, "en")).toBe("إيميل ← owner@shop.test");
    expect(runDid(hook, "en")).toBe("Accepted (200)");
    expect(runDid(run({ kind: "task", result: null }), "ar")).toBe("تمام");
  });

  test("a row that stands for an hour of timer runs says so, with what they did together and the usual time of one", () => {
    expect(runDid(quiet, "en")).toBe("Ran, with nothing to do");
    expect(runDid({ ...quiet, result: { checked: 0, sent: 0 } }, "en")).toBe("Ran, with nothing to do");
    expect(runDid({ ...quiet, name: "outbox", result: { checked: 40, sent: 12, failed: 0 } }, "en")).toBe("12 انبعت");
    expect(runTimes(quiet, "en")).toBe("118 times in the hour");
    expect(runTimes(sent, "en")).toBe("");
    expect(runTook(quiet)).toBe(10);
    expect(runTook(failed)).toBe(4000);
  });

  test("the last day in a line, how far back the log goes, and a moment", () => {
    expect(summaryLine(summary, "en")).toBe("4,210 runs in the last 24 hours · 2 failed");
    expect(summaryLine({ runs: 12, failures: 0 }, "en")).toBe("12 runs in the last 24 hours · none failed");
    expect(summaryLine({ runs: 12, failures: 0 }, "ar")).toBe("12 تشغيل بآخر 24 ساعة · ولا واحد فشل");
    expect(keepLine(summary, NOW, "en")).toBe("The log keeps 30 days · It holds the last 10 days");
    expect(keepLine({ from: "2026-11-15T09:00:00Z", keepDays: 30 }, NOW, "en")).toBe("The log keeps 30 days · It started today");
    expect(keepLine({ from: null, keepDays: 30 }, NOW, "en")).toBe("The log keeps 30 days");
    // Today: the time. Before: the day too.
    expect(whenText("2026-11-15T11:59:00Z", NOW, "en")).not.toMatch(/Nov/);
    expect(whenText("2026-11-10T10:00:00Z", NOW, "en")).toMatch(/10 Nov/);
    expect(whenText("nonsense", NOW, "en")).toBe("");
  });
});

describe("The run log page", () => {
  test("shows the last day in numbers, what is failing, and the runs newest first", async () => {
    show();
    expect((await screen.findByTestId("runs-summary")).textContent).toBe("4,210 runs in the last 24 hours · 2 failed");
    expect(screen.getByTestId("runs-keep").textContent).toBe("The log keeps 30 days · It holds the last 10 days");
    expect(screen.getByTestId("runs-failing").textContent).toContain("النسخة الاحتياطية اليومية");
    expect(screen.getByTestId("runs-failing").textContent).toContain("Cloudinary said no");
    const rows = [...screen.getByTestId("runs-list").querySelectorAll("li")].map((li) => li.getAttribute("data-testid"));
    expect(rows).toEqual(["run-r1", "run-r2", "run-r3", "run-r4", "run-r5"]);
    expect(screen.getByTestId("run-did-r1").textContent).toBe("3 انبعت");
    expect(screen.getByTestId("run-r2").textContent).toContain("118 times in the hour");
    expect(screen.getByTestId("run-r3").getAttribute("data-ok")).toBe("false");
    expect(screen.getByTestId("run-r4").textContent).toContain("order:42");
    // Only the kinds that have runs are offered.
    expect(screen.getByTestId("runs-kind-job")).toBeTruthy();
    expect(screen.getByTestId("runs-kind-webhook")).toBeTruthy();
    expect(screen.queryByTestId("runs-kind-function")).toBeNull();
  });

  test("by kind, only what failed, and one thing by itself", async () => {
    show();
    await screen.findByTestId("runs-list");
    fireEvent.click(screen.getByTestId("runs-kind-automation"));
    await waitFor(() => expect(asked().at(-1)).toMatchObject({ kind: "automation", ok: undefined }));
    await waitFor(() => expect(screen.getByTestId("runs-list").querySelectorAll("li")).toHaveLength(1));
    fireEvent.click(screen.getByTestId("runs-kind-all"));
    fireEvent.click(screen.getByTestId("runs-failed-only"));
    await waitFor(() => expect(asked().at(-1)).toMatchObject({ kind: undefined, ok: false }));
    await waitFor(() => expect(screen.getByTestId("runs-list").querySelectorAll("li")).toHaveLength(1));
    expect(screen.getByTestId("run-did-r3").textContent).toBe("Cloudinary said no");
    // What is failing, by its name, leads to that one thing's failed runs.
    fireEvent.click(screen.getByTestId("runs-failed-only"));
    fireEvent.click(screen.getByTestId("runs-failing-job-backup"));
    await waitFor(() => expect(asked().at(-1)).toMatchObject({ kind: "job", name: "backup", ok: false }));
    expect(screen.getByTestId("runs-name").textContent).toContain("النسخة الاحتياطية اليومية");
    fireEvent.click(screen.getByTestId("runs-name-clear"));
    await waitFor(() => expect(asked().at(-1)).toMatchObject({ kind: "job", name: undefined }));
  });

  test("older runs are asked for from where the list ends", async () => {
    show();
    await screen.findByTestId("runs-list");
    fireEvent.click(screen.getByTestId("runs-more"));
    await waitFor(() => expect(asked().at(-1)).toMatchObject({ before: "2026-11-14T09:00:00.000Z" }));
    await waitFor(() => expect(screen.getByTestId("runs-list").querySelectorAll("li")).toHaveLength(6));
    expect(screen.queryByTestId("runs-more")).toBeNull();
  });

  test("nothing failed, or nothing yet: it says which", async () => {
    m.getRuns.mockResolvedValue({ now: NOW, runs: [], next: null, summary: { ...summary, runs: 0, failures: 0, kinds: {}, failing: [], from: null } });
    show();
    expect((await screen.findByTestId("runs-empty")).textContent).toBe("No runs yet.");
    fireEvent.click(screen.getByTestId("runs-failed-only"));
    await waitFor(() => expect(screen.getByTestId("runs-empty").textContent).toBe("Nothing failed. 👌"));
  });
});
