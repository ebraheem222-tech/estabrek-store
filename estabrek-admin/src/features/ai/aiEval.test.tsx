// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { EvalRun, EvalState } from "../../api/ai.api";

// «جرّب النموذج» and «كيف ماشي الذكاء الاصطناعي». The server's part (the run, marks, time limits,
// the counters) is tested with the database.

const m = vi.hoisted(() => ({ evalState: vi.fn(), saveEvalQuestions: vi.fn(), startEvalRun: vi.fn(), markEvalAnswer: vi.fn(), deleteEvalRun: vi.fn(), aiStats: vi.fn() }));
vi.mock("../../api/ai.api", async (orig) => ({ ...(await orig<typeof import("../../api/ai.api")>()), ...m }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import AiEvalPage, { runSummary } from "./AiEvalPage";
import { AiStatsCard, aiUseName } from "./AiStatsCard";

const show = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const run = (over: Partial<EvalRun> = {}): EvalRun => ({
  id: "r1",
  at: "2026-11-21T09:00:00.000Z",
  finishedAt: "2026-11-21T09:01:00.000Z",
  model: "qwen3:8b (small)",
  running: false,
  total: 2,
  answers: [
    { qid: "q1", text: "كم مدة التوصيل؟", answer: "من يومين لأربع أيام", products: [], ms: 2000, ok: true, error: null, missed: false, mark: "good" },
    { qid: "q2", text: "بتغلفوا هدايا؟", answer: "ما عندي معلومة", products: ["عباية"], ms: 4000, ok: true, error: null, missed: true, mark: null },
  ],
  ...over,
});
const state = (over: Partial<EvalState> = {}): EvalState => ({
  questions: [{ id: "q1", text: "كم مدة التوصيل؟" }, { id: "q2", text: "بتغلفوا هدايا؟" }],
  runs: [run()],
  running: false,
  limits: { questions: 50, text: 300, runs: 3 },
  ...over,
});

describe("try the model", () => {
  test("a run's summary: average time of what answered, failures, good of marked", () => {
    expect(runSummary(run())).toEqual({ done: 2, failed: 0, avgMs: 3000, good: 1, marked: 1 });
    const failed = run({ answers: [...run().answers, { qid: "q3", text: "x", answer: "", products: [], ms: 9000, ok: false, error: "boom", missed: true, mark: null }] });
    expect(runSummary(failed)).toMatchObject({ done: 3, failed: 1, avgMs: 3000 });
  });

  test("the questions, the runs side by side, a mark, and a run that can't start while the questions aren't saved", async () => {
    m.evalState.mockResolvedValue(state());
    m.markEvalAnswer.mockResolvedValue({ ok: true });
    m.startEvalRun.mockResolvedValue(state({ running: true, runs: [run({ id: "r2", running: true, answers: [] }), run()] }));
    m.saveEvalQuestions.mockResolvedValue(state({ questions: [...state().questions, { id: "q3", text: "سؤال جديد" }] }));
    show(<AiEvalPage />);
    expect(await screen.findByTestId("eval-questions")).toHaveValue("كم مدة التوصيل؟\nبتغلفوا هدايا؟");
    const head = screen.getByTestId("eval-run");
    expect(head).toHaveTextContent("qwen3:8b (small)");
    expect(within(head).getByTestId("eval-run-summary")).toHaveTextContent("3.0");
    expect(within(head).getByTestId("eval-run-summary")).toHaveTextContent("1/1");
    const cells = screen.getAllByTestId("eval-cell");
    expect(cells[1]).toHaveTextContent("ما عرف");

    fireEvent.click(within(cells[1]).getByTestId("eval-mark-bad"));
    await waitFor(() => expect(m.markEvalAnswer).toHaveBeenCalledWith("r1", "q2", "bad"));
    expect(within(cells[1]).getByTestId("eval-mark-bad")).toHaveAttribute("aria-pressed", "true");

    // Unsaved questions: save first, then run.
    fireEvent.change(screen.getByTestId("eval-questions"), { target: { value: "كم مدة التوصيل؟\nبتغلفوا هدايا؟\nسؤال جديد" } });
    const runButton = screen.getByRole("button", { name: /اسأل الـ/ });
    expect(runButton).toBeDisabled();
    fireEvent.click(screen.getByTestId("eval-save"));
    await waitFor(() => expect(m.saveEvalQuestions).toHaveBeenCalledWith(["كم مدة التوصيل؟", "بتغلفوا هدايا؟", "سؤال جديد"]));
    await waitFor(() => expect(screen.getByRole("button", { name: /اسأل الـ 3/ })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /اسأل الـ 3/ }));
    expect(await screen.findByTestId("eval-run-progress")).toHaveTextContent("0");
  });
});

describe("how the AI is doing", () => {
  test("each use since the server started: calls, failures with their share, the average, where it ran", async () => {
    m.aiStats.mockResolvedValue({ since: "2026-11-21T08:00:00.000Z", uses: [{ use: "search", calls: 4, failed: 0, avgMs: 300, lastError: null, lastAt: null, via: "own" }, { use: "shopAgent", calls: 10, failed: 3, avgMs: 6200, lastError: "The model server didn't answer in time", lastAt: null, via: "own" }] });
    show(<AiStatsCard />);
    const rows = await screen.findAllByTestId("ai-stats-row");
    expect(rows[0]).toHaveTextContent("مساعد المتجر الذكي");
    expect(rows[0]).toHaveTextContent("3 (30%)");
    expect(rows[0]).toHaveTextContent("6.2 s");
    expect(rows[1]).toHaveTextContent("البحث بالمعنى");
    expect(aiUseName("oldChat")).toBe("الشات العادي");
    expect(screen.getByTestId("ai-open-eval")).toHaveAttribute("href", "/admin/ai/eval");
  });
});
