// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { FnDef, FnFull, FnList, FnLite, Outcome } from "../../api/functions.api";

// الـ Functions: the list and the builder over a stand-in API. Steps are added from a menu, each
// opens to its own form; the draft is saved, tried dry, and published.

const m = vi.hoisted(() => ({ getFunctions: vi.fn(), getFunction: vi.fn(), createFunction: vi.fn(), saveFunction: vi.fn(), publishFunction: vi.fn(), runFunction: vi.fn(), deleteFunction: vi.fn(), may: new Set<string>() }));
vi.mock("../../api/functions.api", () => m);
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import FunctionsPage from "./FunctionsPage";
import FunctionEditor from "./FunctionEditor";
import { inputsOut } from "./TryPanel";

const lite = (over: Partial<FnLite>): FnLite => ({ id: "f1", name: "Points", note: null, enabled: true, published: false, publishedAt: null, changed: true, steps: 0, inputs: 0, takes: [], runs: 0, lastRunAt: null, updatedAt: "2026-11-16T10:00:00Z", ...over });
const full = (over: Partial<FnFull> = {}): FnFull => ({ ...lite({}), draft: { inputs: [], do: [] }, live: null, problems: [], ...over });
const greet = lite({ id: "f2", name: "Greet", published: true, changed: false, steps: 1, inputs: 1, runs: 4, takes: [{ name: "who", type: "text", required: true }] });
const listOf = (functions: FnLite[]): FnList => ({
  functions,
  tables: [
    { id: "t1", slug: "customers", name: { en: "Customers" }, fields: [{ id: "name", type: "text", name: { en: "Name" }, required: true }, { id: "email", type: "email", name: null, required: false }, { id: "points", type: "number", name: null, required: false }, { id: "state", type: "select", name: null, required: false, options: [{ id: "new", name: null }, { id: "vip", name: null }] }] },
    { id: "t2", slug: "orders", name: { en: "Orders" }, fields: [{ id: "title", type: "text", name: null, required: true }] },
  ],
  ops: { text: ["contains", "is", "empty"], email: ["is", "contains"], number: ["is", "gt", "lt", "between"], select: ["is", "anyOf"], $status: ["is"], $slug: ["is"], $date: ["gt", "lt"] },
  cmps: ["eq", "ne", "gt", "empty", "notEmpty"],
  limits: { steps: 60, depth: 4, conditions: 8, inputs: 20, values: 40, text: 2000, found: 200, loop: 200, executed: 1000, writes: 200, messages: 20, calls: 3, ms: 10000 },
});

let server: FnFull;
const lastDraft = () => m.saveFunction.mock.calls.at(-1)?.[1].draft as FnDef;

function show(path = "/admin/functions/f1") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/functions" element={<FunctionsPage />} />
          <Route path="/admin/functions/:id" element={<FunctionEditor />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const pick = (testid: string, value: string) => fireEvent.change(screen.getByTestId(testid), { target: { value } });
const type = pick;

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["functions:read", "functions:write"]);
  server = full();
  m.getFunctions.mockImplementation(async () => listOf([lite(server), greet]));
  m.getFunction.mockImplementation(async () => server);
  m.saveFunction.mockImplementation(async (_id: string, body: { name?: string; note?: string | null; enabled?: boolean; draft?: FnDef }) => {
    server = { ...server, ...(body.name ? { name: body.name } : {}), ...(body.note !== undefined ? { note: body.note } : {}), ...(body.enabled !== undefined ? { enabled: body.enabled } : {}), ...(body.draft ? { draft: body.draft, changed: true } : {}), updatedAt: new Date(Date.parse(server.updatedAt) + 1000).toISOString() };
    return server;
  });
  m.publishFunction.mockImplementation(async () => {
    server = { ...server, live: server.draft, published: true, changed: false, updatedAt: new Date(Date.parse(server.updatedAt) + 1000).toISOString() };
    return server;
  });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The list", () => {
  test("each function with its state; a new one opens its builder", async () => {
    m.createFunction.mockImplementation(async ({ name }: { name: string }) => (server = full({ id: "f9", name })));
    show("/admin/functions");
    const list = await screen.findByTestId("fn-list");
    expect([...list.querySelectorAll("li")].map((li) => [li.getAttribute("data-testid"), li.getAttribute("data-state")])).toEqual([["fn-f1", "draft"], ["fn-f2", "live"]]);
    expect(screen.getByTestId("fn-f2").textContent).toContain("1 steps · ran 4 times");
    expect(screen.getByTestId("fn-f1").textContent).toContain("hasn't run yet");
    type("fn-new-name", "Welcome");
    fireEvent.click(screen.getByTestId("fn-new"));
    await waitFor(() => expect(m.createFunction).toHaveBeenCalledWith({ name: "Welcome" }));
    // The builder of the new one.
    expect(((await screen.findByTestId("fn-name")) as HTMLInputElement).value).toBe("Welcome");
  });

  test("deleting asks first; a member who can only look has no buttons", async () => {
    m.deleteFunction.mockResolvedValue({ ok: true });
    show("/admin/functions");
    fireEvent.click(await screen.findByTestId("fn-f2-delete"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("“Greet” is deleted with its steps");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(m.deleteFunction).toHaveBeenCalledWith("f2"));
    cleanup();
    m.may = new Set(["functions:read"]);
    show("/admin/functions");
    await screen.findByTestId("fn-list");
    expect(screen.queryByTestId("fn-new")).toBeNull();
    expect(screen.queryByTestId("fn-f2-delete")).toBeNull();
  });
});

describe("The builder", () => {
  test("an input, a find with a condition on the rows, a question with both ways, and saving", async () => {
    show();
    await screen.findByTestId("fn-editor");
    expect(screen.getByTestId("fn-state").textContent).toBe("Draft, not published");
    expect(screen.getByTestId("steps-do-empty")).toBeTruthy();
    expect((screen.getByTestId("fn-save") as HTMLButtonElement).disabled).toBe(true);

    // What it is handed.
    fireEvent.click(screen.getByTestId("fn-input-add"));
    type("fn-input-0-name", "email");
    fireEvent.click(screen.getByTestId("fn-input-0-required"));

    // Find the customer by that email: the menu offers the input by its name.
    pick("steps-do-add", "find");
    expect(screen.getByTestId("step-do.0").getAttribute("data-open")).toBe("true");
    fireEvent.click(screen.getByTestId("filter-do.0-add"));
    pick("filter-do.0-0-field", "email");
    // The questions an email can be asked; the one already picked stays when the new column can be asked it too.
    expect([...screen.getByTestId("filter-do.0-0-op").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["is", "contains"]);
    expect((screen.getByTestId("filter-do.0-0-op") as HTMLSelectElement).value).toBe("contains");
    pick("filter-do.0-0-op", "is");
    expect([...screen.getByTestId("filter-do.0-0-value-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["", "input.email", "now"]);
    pick("filter-do.0-0-value-names", "input.email");
    expect((screen.getByTestId("filter-do.0-0-value") as HTMLInputElement).value).toBe("{{input.email}}");
    type("step-do.0-as", "found");
    expect(screen.getByTestId("step-do.0-line").textContent).toBe("Customers · 1 conditions ← found");

    // If there is none: add one. Else: add to their points.
    pick("steps-do-add", "if");
    // One form is open at a time: the find's closed.
    expect(screen.getByTestId("step-do.0").getAttribute("data-open")).toBe("false");
    pick("cond-do.1-0-left-names", "found");
    pick("cond-do.1-0-cmp", "empty");
    expect(screen.queryByTestId("cond-do.1-0-right")).toBeNull();
    pick("steps-do.1.do-add", "add");
    pick("values-do.1.do.0-add", "email");
    pick("value-do.1.do.0-email-names", "input.email");
    pick("values-do.1.do.0-add", "points");
    type("value-do.1.do.0-points", "10");
    fireEvent.click(screen.getByTestId("step-do.1-else-add"));
    pick("steps-do.1.else-add", "change");
    // The row to change: a name the steps before it kept (the find's rows, by their first).
    expect([...screen.getByTestId("step-do.1.else.0-row-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(expect.arrayContaining(["found", "found.length", "found.first.points"]));
    type("step-do.1.else.0-row", "{{found.first}}");
    pick("values-do.1.else.0-add", "state");
    // A choice field says its choices.
    expect((screen.getByTestId("value-do.1.else.0-state") as HTMLInputElement).placeholder).toBe("new · vip");
    type("value-do.1.else.0-state", "vip");

    expect(screen.getByTestId("fn-dirty").textContent).toBe("There are changes that aren't saved.");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(m.saveFunction).toHaveBeenCalled());
    expect(lastDraft()).toEqual({
      inputs: [{ name: "email", type: "text", required: true }],
      do: [
        { act: "find", table: "t1", as: "found", filters: [{ field: "email", op: "is", value: "{{input.email}}" }], match: undefined },
        {
          act: "if",
          if: [{ left: "{{found}}", cmp: "empty" }],
          match: undefined,
          do: [{ act: "add", table: "t1", values: { email: "{{input.email}}", points: 10 }, as: "made" }],
          else: [{ act: "change", table: "t1", row: "{{found.first}}", values: { state: "vip" } }],
        },
      ],
    });
    await waitFor(() => expect((screen.getByTestId("fn-save") as HTMLButtonElement).disabled).toBe(true));
  });

  test("steps move, and go; a name that isn't one isn't taken", async () => {
    server = full({ draft: { inputs: [], do: [{ act: "find", table: "t1", as: "rows" }, { act: "stop", message: "x" }, { act: "return", value: "y" }] } });
    show();
    await screen.findByTestId("step-do.2");
    const acts = () => [...screen.getByTestId("steps-do").querySelectorAll(":scope > ol > li")].map((li) => li.getAttribute("data-act"));
    expect((screen.getByTestId("step-do.0-up") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("step-do.2-down") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("step-do.0-down"));
    expect(acts()).toEqual(["stop", "find", "return"]);
    fireEvent.click(screen.getByTestId("step-do.2-remove"));
    expect(acts()).toEqual(["stop", "find"]);
    fireEvent.click(screen.getByTestId("step-do.1-head"));
    type("step-do.1-as", "My Rows");
    expect(screen.getByTestId("step-do.1-as").getAttribute("aria-invalid")).toBe("true");
    type("step-do.1-as", "input");
    expect(screen.getByTestId("step-do.1-line").textContent).toBe("Customers ← rows");
    type("step-do.1-as", "customers");
    expect(screen.getByTestId("step-do.1-line").textContent).toBe("Customers ← customers");
  });

  test("calling another function asks for what that one is handed; after a failure only telling and writing down are offered", async () => {
    show();
    await screen.findByTestId("fn-editor");
    pick("steps-do-add", "call");
    expect((screen.getByTestId("step-do.0-fn") as HTMLSelectElement).value).toBe("f2");
    type("step-do.0-input-who", "Amal");
    type("step-do.0-as", "said");
    expect(screen.getByTestId("step-do.0-line").textContent).toBe("Greet ← said");
    expect([...screen.getByTestId("steps-fail-add").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["", "add", "change", "set", "notify", "email", "whatsapp", "sms"]);
    pick("steps-fail-add", "notify");
    expect([...screen.getByTestId("step-fail.0-title-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["", "now", "said", "error"]);
    type("step-fail.0-title", "It failed: {{error}}");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastDraft()).toEqual({ inputs: [], do: [{ act: "call", fn: "f2", input: { who: "Amal" }, as: "said" }], fail: [{ act: "notify", title: "It failed: {{error}}" }] }));
  });

  test("what stands in the way of publishing is shown on its step, in the page's words; publishing saves first", async () => {
    server = full({ draft: { inputs: [], do: [{ act: "find", table: "gone", as: "rows" }, { act: "notify", title: "{{order.title}}" }] }, problems: [{ at: "do.0", message: "This table isn't there any more" }, { at: "do.1", message: 'Nothing is kept under "order" before this step' }] });
    show();
    expect((await screen.findByTestId("fn-problems")).textContent).toContain("Before publishing, fix these (2):");
    expect(screen.getByTestId("fn-problems").textContent).toContain("Step 2: Nothing is kept under “order” before this step");
    expect(screen.getByTestId("step-do.0-problems").textContent).toBe("This table isn't there any more");
    // Fixed on the page: the list is the server's, so it waits for a save.
    fireEvent.click(screen.getByTestId("step-do.1-head"));
    type("step-do.1-title", "Hello");
    expect(screen.queryByTestId("fn-problems")).toBeNull();
    m.saveFunction.mockImplementationOnce(async (_id: string, body: { draft: FnDef }) => (server = { ...server, draft: body.draft, problems: [], updatedAt: "2026-11-16T10:00:05Z" }));
    fireEvent.click(screen.getByTestId("fn-publish"));
    await waitFor(() => expect(m.publishFunction).toHaveBeenCalledWith("f1"));
    expect(m.saveFunction.mock.invocationCallOrder[0]).toBeLessThan(m.publishFunction.mock.invocationCallOrder[0]);
    await waitFor(() => expect(screen.getByTestId("fn-state").textContent).toBe("Published"));
    expect((screen.getByTestId("fn-publish") as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Trying it", () => {
  const outcome = (over: Partial<Outcome>): Outcome => ({ ok: true, dry: true, value: null, error: null, failedAt: null, trace: [], counts: { steps: 0, found: 0, added: 0, changed: 0, deleted: 0, sent: 0 }, ms: 7, ...over });
  const draft: FnDef = { inputs: [{ name: "email", type: "text", required: true }, { name: "tags", type: "list" }], do: [{ act: "find", table: "t1", as: "found" }, { act: "each", list: "{{found}}", do: [{ act: "change", table: "t1", row: "{{item}}", values: { points: 1 } }] }] };

  test("what is typed is handed over as its kind", () => {
    expect(inputsOut(draft.inputs, { email: " a@b.c ", tags: '["vip", "new"]' })).toEqual({ email: " a@b.c ", tags: ["vip", "new"] });
    expect(inputsOut(draft.inputs, { email: "", tags: "  " })).toEqual({});
  });

  test("a try runs the draft dry and shows every step in the page's words; a real run asks first and needs it published", async () => {
    server = full({ draft });
    m.runFunction.mockResolvedValueOnce(
      outcome({
        value: { changed: 2 },
        counts: { steps: 4, found: 2, added: 0, changed: 2, deleted: 0, sent: 0 },
        trace: [
          { at: "do.0", act: "find", ok: true, ms: 3, note: "2 rows", say: ["found", 2, 2] },
          { at: "do.1", act: "each", ok: true, ms: 0, note: "2 times", say: ["times", 2] },
          { at: "do.1.do[0].0", act: "change", ok: true, ms: 2, note: "Would change amal in customers", say: ["wouldChange", "amal", "customers"] },
          { at: "do.1.do[1].0", act: "change", ok: true, ms: 2, note: "Would change basel in customers", say: ["wouldChange", "basel", "customers"] },
        ],
      }),
    );
    show();
    await screen.findByTestId("fn-try");
    // Not published: only the try.
    expect((screen.getByTestId("fn-try-real") as HTMLButtonElement).disabled).toBe(true);
    type("fn-try-input-email", "amal@shop.test");
    fireEvent.click(screen.getByTestId("fn-try-dry"));
    await waitFor(() => expect(m.runFunction).toHaveBeenCalledWith("f1", { input: { email: "amal@shop.test" }, dry: true, which: "draft" }));
    expect((await screen.findByTestId("fn-outcome-line")).textContent).toBe("It would have gone through · would have: 2 changed · 7 ms");
    expect(screen.getByTestId("fn-outcome-value").textContent).toContain('"changed": 2');
    expect([...screen.getByTestId("fn-trace").querySelectorAll("li")].map((li) => [...li.children].map((c) => c.textContent?.replace(/\s+/g, " ").trim()).join(" | "))).toEqual([
      "Step 1 Find rows 2 rows | 3 ms",
      "Step 2 For each in a list 2 times | 0 ms",
      "Step 2 ← Step 1 (turn 1) Change a row Would change amal in customers | 2 ms",
      "Step 2 ← Step 1 (turn 2) Change a row Would change basel in customers | 2 ms",
    ]);

    // It failed: where and why, and its step is marked.
    m.runFunction.mockResolvedValueOnce(outcome({ ok: false, error: "points: Not a number", failedAt: "do.1.do[0].0", trace: [{ at: "do.1.do[0].0", act: "change", ok: false, ms: 1, error: "points: Not a number" }] }));
    fireEvent.click(screen.getByTestId("fn-try-dry"));
    await waitFor(() => expect(screen.getByTestId("fn-outcome").getAttribute("data-ok")).toBe("false"));
    expect(screen.getByTestId("fn-outcome-error").textContent).toBe("Step 2 ← Step 1: points: Not a number");
    expect(screen.getByTestId("step-do.1.do.0").className).toContain("border-red-400/60");
  });

  test("a real run: published only, asked first", async () => {
    server = full({ draft, live: draft, published: true, changed: false });
    m.runFunction.mockResolvedValue(outcome({ dry: false, counts: { steps: 1, found: 0, added: 1, changed: 0, deleted: 0, sent: 0 } }));
    show();
    fireEvent.click(await screen.findByTestId("fn-try-real"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("The published steps will run for real");
    fireEvent.click(within(dialog).getByRole("button", { name: "Run" }));
    await waitFor(() => expect(m.runFunction).toHaveBeenCalledWith("f1", { input: {}, dry: false, which: "live" }));
    expect((await screen.findByTestId("fn-outcome-line")).textContent).toBe("It went through · 1 added · 7 ms");
    // A member who can only look can't run it.
    cleanup();
    m.may = new Set(["functions:read"]);
    show();
    await screen.findByTestId("fn-try");
    expect(screen.queryByTestId("fn-try-dry")).toBeNull();
    expect(screen.queryByTestId("steps-do-add")).toBeNull();
    expect(screen.queryByTestId("fn-save")).toBeNull();
  });
});
