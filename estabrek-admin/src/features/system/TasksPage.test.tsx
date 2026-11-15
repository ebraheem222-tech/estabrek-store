// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Task, TasksPage as Page, TasksQuery } from "../../api/tasks.api";

// صف الشغل: the page over a stand-in API, and its words. Work that must not be lost: what waits,
// what is being done, what was done, and what failed every try and needs the owner's look.

const m = vi.hoisted(() => ({ getTasks: vi.fn(), retryTask: vi.fn(), cancelTask: vi.fn(), may: new Set<string>() }));
vi.mock("../../api/tasks.api", () => ({ getTasks: m.getTasks, retryTask: m.retryTask, cancelTask: m.cancelTask }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import TasksPage from "./TasksPage";
import { countsLine, didText, keepLine, lateText, nextText, rulesRanText, spanText, taskKindName, triesText, whenText } from "./tasksText";

const NOW = Date.parse("2026-11-15T12:00:00Z");
const MIN = 60_000;
const task = (over: Partial<Task>): Task => ({ id: "t", kind: "automation", key: null, status: "waiting", attempts: 0, maxAttempts: 5, runAt: "2026-11-15T11:59:00Z", lockedAt: null, lastError: null, result: null, createdAt: "2026-11-15T11:59:00Z", finishedAt: null, ...over });
const aside = task({ id: "t1", status: "failed", attempts: 5, lastError: "NO_EMAIL: add one to the rule or the settings", finishedAt: "2026-11-15T11:40:00Z", createdAt: "2026-11-15T09:00:00Z" });
const retrying = task({ id: "t2", attempts: 2, lastError: "Can't reach database server", runAt: "2026-11-15T12:08:00Z", key: "order.created:order:42" });
const going = task({ id: "t3", status: "running", attempts: 1, lockedAt: "2026-11-15T11:59:30Z" });
const done = task({ id: "t4", status: "done", attempts: 1, finishedAt: "2026-11-15T11:50:00Z", result: { rules: 2 } });
const gone = task({ id: "t5", kind: "sendReport", status: "cancelled", attempts: 0, finishedAt: "2026-11-14T08:00:00Z" });
const all = [aside, retrying, going, done, gone];
const counts = { waiting: 1, running: 1, done: 40, failed: 1, cancelled: 1 };
const page = (over: Partial<Page> = {}): Page => ({ now: NOW, counts, doneToday: 12, waitingSince: null, kinds: ["automation"], keepDays: { done: 7, failed: 30 }, tasks: all, next: null, ...over });

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const asked = () => m.getTasks.mock.calls.map((c) => c[0] as TasksQuery);

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["system:read", "system:write"]);
  m.getTasks.mockImplementation(async (q: TasksQuery): Promise<Page> => {
    if (q.before) return page({ tasks: [task({ id: "old", status: "done", attempts: 1, finishedAt: "2026-11-10T10:00:00Z" })] });
    return page({ tasks: all.filter((t) => !q.status || t.status === q.status), next: q.status ? null : "2026-11-14T08:00:00.000Z" });
  });
  m.retryTask.mockResolvedValue({ ok: true });
  m.cancelTask.mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The queue's words", () => {
  test("the numbers in a line, and how long finished work is kept", () => {
    expect(countsLine({ counts, doneToday: 12 }, "en")).toBe("1 waiting · 1 being done · 1 need a look · 12 done in the last 24 hours");
    expect(countsLine({ counts: { ...counts, waiting: 0, running: 0, failed: 0 }, doneToday: 1200 }, "en")).toBe("0 waiting · none needs a look · 1,200 done in the last 24 hours");
    expect(countsLine({ counts: { ...counts, running: 0, failed: 0 }, doneToday: 0 }, "ar")).toBe("1 بتستنى · ولا وحدة بدها نظر · 0 خلصت بآخر 24 ساعة");
    expect(keepLine({ keepDays: { done: 7, failed: 30 } }, "en")).toBe("Done ones are kept 7 days; the ones that need a look or were dismissed, 30 days.");
  });

  test("a kind by a name the owner knows; one the page doesn't know, as the server calls it", () => {
    expect(taskKindName("automation", "en")).toBe("An automation's event");
    expect(taskKindName("automation", "ar")).toBe("حدث لتلقائية");
    expect(taskKindName("sendReport", "en")).toBe("sendReport");
  });

  test("how many tries, what comes next, and what it did", () => {
    expect(triesText(task({}), "en")).toBe("Not tried yet");
    expect(triesText(retrying, "en")).toBe("2 of 5 tries");
    expect(triesText(going, "en")).toBe("Try 1 of 5");
    expect(triesText(aside, "en")).toBe("5 of 5 tries");
    expect(triesText(done, "en")).toBe("At the first try");
    expect(triesText({ ...done, attempts: 3 }, "en")).toBe("After 3 tries");
    expect([2, 3, 11].map((attempts) => triesText({ ...done, attempts }, "ar"))).toEqual(["بعد محاولتين", "بعد 3 محاولات", "بعد 11 محاولة"]);
    expect(nextText(retrying, NOW, "en")).toBe("Next try in 8 min");
    expect(nextText(task({ runAt: "2026-11-15T13:00:00Z" }), NOW, "en")).toBe("Starts in 1 h");
    expect(nextText(retrying, NOW, "ar")).toBe("المحاولة الجاية بعد 8 دقايق");
    expect(nextText(task({}), NOW, "en")).toBe("Its turn is now");
    expect(nextText(going, NOW, "en")).toBe("For 30 s");
    expect(nextText(aside, NOW, "en")).toBe("");
    expect(didText(done, "en")).toBe("2 rules ran");
    expect(didText({ ...done, result: { rules: 0 } }, "en")).toBe("No rule applied");
    expect(didText({ ...done, result: { rules: 1 } }, "en")).toBe("1 rule ran");
    expect([1, 2, 5, 12].map((n) => rulesRanText(n, "ar"))).toEqual(["قاعدة وحدة اشتغلت", "قاعدتين اشتغلوا", "5 قواعد اشتغلت", "12 قاعدة اشتغلت"]);
    expect([1, 3].map((n) => rulesRanText(n, "he"))).toEqual(["כלל אחד רץ", "3 כללים רצו"]);
    expect(didText({ ...done, kind: "sendReport" }, "en")).toBe("");
    expect(didText(aside, "en")).toBe("");
  });

  test("a span of time, a moment, and work nobody takes", () => {
    expect([45_000, 8 * MIN, 3 * 60 * MIN, 72 * 60 * MIN].map((ms) => spanText(ms, "en"))).toEqual(["45 s", "8 min", "3 h", "3 days"]);
    // Arabic counts: one, two, a few, many.
    expect([45_000, 5000, MIN, 2 * MIN, 8 * MIN, 20 * MIN, 60 * MIN, 2 * 60 * MIN, 72 * 60 * MIN].map((ms) => spanText(ms, "ar"))).toEqual(["45 ثانية", "5 ثواني", "دقيقة", "دقيقتين", "8 دقايق", "20 دقيقة", "ساعة", "ساعتين", "3 أيام"]);
    expect(spanText(8 * MIN, "he")).toBe("8 דק׳");
    expect(whenText("2026-11-15T11:59:00Z", NOW, "en")).not.toMatch(/Nov/);
    expect(whenText("2026-11-10T10:00:00Z", NOW, "en")).toMatch(/10 Nov/);
    expect(whenText(null, NOW, "en")).toBe("");
    // A minute's wait is the worker's own pace; more than two is a worker that isn't running.
    expect(lateText({ waitingSince: new Date(NOW - MIN).toISOString(), now: NOW }, "en")).toBe("");
    expect(lateText({ waitingSince: null, now: NOW }, "en")).toBe("");
    expect(lateText({ waitingSince: new Date(NOW - 20 * MIN).toISOString(), now: NOW }, "en")).toBe("Work has waited 20 min and nobody took it. The job “The queue” may be paused.");
  });
});

describe("The queue page", () => {
  test("shows the numbers and the tasks: what needs a look with its error, the next try, what it did", async () => {
    show();
    expect((await screen.findByTestId("tasks-counts")).textContent).toBe("1 waiting · 1 being done · 1 need a look · 12 done in the last 24 hours");
    expect(screen.getByTestId("tasks-keep").textContent).toContain("Done ones are kept 7 days");
    expect(screen.queryByTestId("tasks-late")).toBeNull();
    const rows = [...screen.getByTestId("tasks-list").querySelectorAll("li")].map((li) => [li.getAttribute("data-testid"), li.getAttribute("data-status")]);
    expect(rows).toEqual([["task-t1", "failed"], ["task-t2", "waiting"], ["task-t3", "running"], ["task-t4", "done"], ["task-t5", "cancelled"]]);
    expect(screen.getByTestId("task-error-t1").textContent).toBe("NO_EMAIL: add one to the rule or the settings");
    expect(screen.getByTestId("task-error-t2").textContent).toBe("Last time it failed: Can't reach database server");
    expect(screen.getByTestId("task-tries-t2").textContent).toBe("2 of 5 tries");
    expect(screen.getByTestId("task-next-t2").textContent).toBe("Next try in 8 min");
    expect(screen.getByTestId("task-t2").textContent).toContain("order.created:order:42");
    expect(screen.getByTestId("task-t4").textContent).toContain("2 rules ran");
    expect(screen.getByTestId("task-t5").textContent).toContain("sendReport");
    // How many are in each state sits on its tab (not for the done ones: that number only grows).
    expect(screen.getByTestId("tasks-status-failed").textContent).toBe("Needs a look1");
    expect(screen.getByTestId("tasks-status-done").textContent).toBe("Done");
  });

  test("what stopped can be tried again, what waits can be dismissed; one being done or done has no buttons", async () => {
    show();
    await screen.findByTestId("tasks-list");
    expect(screen.getByTestId("task-retry-t1")).toBeTruthy();
    expect(screen.getByTestId("task-cancel-t1")).toBeTruthy();
    expect(screen.queryByTestId("task-retry-t2")).toBeNull();
    expect(screen.getByTestId("task-cancel-t2")).toBeTruthy();
    for (const id of ["t3", "t4"]) {
      expect(screen.queryByTestId(`task-retry-${id}`)).toBeNull();
      expect(screen.queryByTestId(`task-cancel-${id}`)).toBeNull();
    }
    // Dismissed: it can come back, and there is nothing left to dismiss.
    expect(screen.getByTestId("task-retry-t5")).toBeTruthy();
    expect(screen.queryByTestId("task-cancel-t5")).toBeNull();
    fireEvent.click(screen.getByTestId("task-retry-t1"));
    await waitFor(() => expect(m.retryTask).toHaveBeenCalledWith("t1"));
    // The list is read again after it.
    await waitFor(() => expect(m.getTasks.mock.calls.length).toBeGreaterThanOrEqual(2));
    fireEvent.click(screen.getByTestId("task-cancel-t2"));
    await waitFor(() => expect(m.cancelTask).toHaveBeenCalledWith("t2"));
  });

  test("a member who can only look has no buttons", async () => {
    m.may = new Set(["system:read"]);
    show();
    await screen.findByTestId("tasks-list");
    expect(screen.queryByTestId("task-retry-t1")).toBeNull();
    expect(screen.queryByTestId("task-cancel-t2")).toBeNull();
  });

  test("by state, and older work from where the list ends", async () => {
    show();
    await screen.findByTestId("tasks-list");
    fireEvent.click(screen.getByTestId("tasks-more"));
    await waitFor(() => expect(asked().at(-1)).toMatchObject({ before: "2026-11-14T08:00:00.000Z" }));
    await waitFor(() => expect(screen.getByTestId("tasks-list").querySelectorAll("li")).toHaveLength(6));
    expect(screen.queryByTestId("tasks-more")).toBeNull();
    fireEvent.click(screen.getByTestId("tasks-status-failed"));
    await waitFor(() => expect(asked().at(-1)).toMatchObject({ status: "failed" }));
    await waitFor(() => expect(screen.getByTestId("tasks-list").querySelectorAll("li")).toHaveLength(1));
    fireEvent.click(screen.getByTestId("tasks-status-all"));
    await waitFor(() => expect(asked().at(-1)).toMatchObject({ status: undefined }));
  });

  test("work nobody takes is said, with where the worker is; an empty queue says which kind of empty", async () => {
    m.getTasks.mockImplementation(async (q: TasksQuery) => page({ tasks: [], counts: { waiting: 3, running: 0, done: 0, failed: 0, cancelled: 0 }, doneToday: 0, waitingSince: q.status ? null : new Date(NOW - 20 * MIN).toISOString() }));
    show();
    expect((await screen.findByTestId("tasks-late")).textContent).toContain("Work has waited 20 min and nobody took it.");
    expect(screen.getByTestId("tasks-late").querySelector("a")?.getAttribute("href")).toBe("/admin/system/jobs");
    expect(screen.getByTestId("tasks-empty").textContent).toBe("The queue is empty: no work has been added yet.");
    fireEvent.click(screen.getByTestId("tasks-status-failed"));
    await waitFor(() => expect(screen.getByTestId("tasks-empty").textContent).toBe("Nothing needs a look. 👌"));
    fireEvent.click(screen.getByTestId("tasks-status-running"));
    await waitFor(() => expect(screen.getByTestId("tasks-empty").textContent).toBe("Nothing in this state."));
  });
});
