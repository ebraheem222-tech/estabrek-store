// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { FnDef, FnFull, FnList, FnLite, FnTrigger, Outcome } from "../../api/functions.api";

// الـ Functions: the list and the builder over a stand-in API. Steps are added from a menu, each
// opens to its own form; the draft is saved, tried dry, and published.

const m = vi.hoisted(() => ({ getFunctions: vi.fn(), getFunction: vi.fn(), createFunction: vi.fn(), saveFunction: vi.fn(), publishFunction: vi.fn(), runFunction: vi.fn(), deleteFunction: vi.fn(), addTrigger: vi.fn(), saveTrigger: vi.fn(), deleteTrigger: vi.fn(), may: new Set<string>(), copied: [] as string[] }));
vi.mock("../../api/functions.api", () => m);
vi.mock("../../config/env", () => ({ env: { VITE_API_BASE_URL: "https://api.shop.test/v1" } }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import FunctionsPage from "./FunctionsPage";
import FunctionEditor from "./FunctionEditor";
import { inputsOut } from "./TryPanel";
import { newTrigger } from "./FnTriggers";

const lite = (over: Partial<FnLite>): FnLite => ({ id: "f1", name: "Points", note: null, enabled: true, published: false, publishedAt: null, changed: true, steps: 0, inputs: 0, takes: [], runs: 0, lastRunAt: null, updatedAt: "2026-11-16T10:00:00Z", ...over });
const full = (over: Partial<FnFull> = {}): FnFull => ({ ...lite({}), draft: { inputs: [], do: [] }, live: null, problems: [], triggers: [], ...over });
const trig = (over: Partial<FnTrigger>): FnTrigger => ({ id: "g1", kind: "row", config: { table: "t1", on: ["added"] }, slug: null, address: null, enabled: true, fired: 0, lastAt: null, nextAt: null, hands: ["row", "before", "event", "table"], ...over });
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
  triggers: { kinds: ["row", "schedule", "event", "call", "webhook"], events: ["order.created", "video.ready"], callPerMinute: { customer: 30, key: 120, public: 10 }, limits: { perFunction: 10, everyMinutes: { min: 5, max: 10080 } } },
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
    expect([...screen.getByTestId("filter-do.0-0-value-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["", "input.email", "now", "caller", "caller.id", "caller.name", "caller.email", "caller.kind"]);
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
    expect([...screen.getByTestId("step-fail.0-title-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["", "now", "caller", "caller.id", "caller.name", "caller.email", "caller.kind", "said", "error"]);
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

describe("What starts it", () => {
  /** The stand-in server keeps the triggers the page asks for. */
  beforeEach(() => {
    m.copied = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => void m.copied.push(t) } });
    let n = 0;
    m.addTrigger.mockImplementation(async (_id: string, body: { kind: FnTrigger["kind"]; config: Record<string, unknown>; slug?: string }) => {
      const id = `g${++n}`;
      const address = body.kind === "call" ? `/v1/fn/${body.slug}` : body.kind === "webhook" ? "/v1/hooks/s3cr3ts3cr3ts3cr3ts3cr3t" : null;
      const hands = body.kind === "row" ? ["row", "before", "event", "table"] : body.kind === "webhook" ? ["body", "query"] : body.kind === "schedule" ? ["at"] : body.kind === "event" ? ["event", "subject"] : [];
      return (server = { ...server, triggers: [...server.triggers, trig({ id, kind: body.kind, config: body.config, slug: body.kind === "call" ? body.slug ?? null : null, address, hands })] });
    });
    m.saveTrigger.mockImplementation(async (_id: string, tid: string, body: { config?: Record<string, unknown>; slug?: string; enabled?: boolean }) => {
      return (server = { ...server, triggers: server.triggers.map((t) => (t.id === tid ? { ...t, ...(body.config ? { config: body.config } : {}), ...(body.enabled !== undefined ? { enabled: body.enabled } : {}), ...(body.slug ? { slug: body.slug, address: `/v1/fn/${body.slug}` } : {}) } : t)) });
    });
    m.deleteTrigger.mockImplementation(async (_id: string, tid: string) => (server = { ...server, triggers: server.triggers.filter((t) => t.id !== tid) }));
  });

  test("a new trigger of each kind starts from something sensible", () => {
    const tables = listOf([]).tables;
    const ctx = { tables, events: ["order.created"], taken: [] as string[], name: "Customer points" };
    expect(newTrigger("row", ctx)).toEqual({ kind: "row", config: { table: "t1", on: ["added"] } });
    expect(newTrigger("schedule", ctx)).toEqual({ kind: "schedule", config: { everyMinutes: 60 } });
    expect(newTrigger("event", ctx)).toEqual({ kind: "event", config: { event: "order.created" } });
    expect(newTrigger("webhook", ctx)).toEqual({ kind: "webhook", config: {} });
    // A call's address comes from the function's name; one that is taken gets a number; a name with no Latin letters gets "fn".
    expect(newTrigger("call", ctx)).toEqual({ kind: "call", config: { who: "customer" }, slug: "customer-points" });
    expect(newTrigger("call", { ...ctx, taken: ["customer-points", "customer-points-2"] }).slug).toBe("customer-points-3");
    expect(newTrigger("call", { ...ctx, name: "نقاط الزبون" }).slug).toBe("fn");
    expect(newTrigger("call", { ...ctx, name: "X" }).slug).toBe("x-fn");
  });

  test("a row trigger: which table, which events; it says what it hands and adds the inputs for it", async () => {
    show();
    expect((await screen.findByTestId("fn-triggers-empty")).textContent).toContain("Nothing starts it by itself yet");
    pick("fn-triggers-add", "row");
    await waitFor(() => expect(m.addTrigger).toHaveBeenCalledWith("f1", { kind: "row", config: { table: "t1", on: ["added"] } }));
    expect((await screen.findByTestId("trigger-g1-line")).textContent).toBe("Customers: added");
    // Not published: it is said that nothing fires yet.
    expect(screen.getByTestId("fn-triggers-asleep").textContent).toContain("isn't published yet");
    // The only event ticked can't be unticked; another can be added.
    expect((screen.getByTestId("trigger-g1-on-added") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("trigger-g1-on-changed"));
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "g1", { config: { table: "t1", on: ["added", "changed"] } }));
    await waitFor(() => expect(screen.getByTestId("trigger-g1-line").textContent).toBe("Customers: added, changed"));
    pick("trigger-g1-table", "t2");
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "g1", { config: { table: "t2", on: ["added", "changed"] } }));
    // What it hands, and the inputs the function doesn't take yet: one press adds them to the draft.
    expect(screen.getByTestId("trigger-g1-hint").textContent).toContain("It hands the function: row, before, event, table.");
    fireEvent.click(screen.getByTestId("trigger-g1-add-inputs"));
    expect([0, 1, 2, 3].map((k) => (screen.getByTestId(`fn-input-${k}-name`) as HTMLInputElement).value)).toEqual(["row", "before", "event", "table"]);
    expect(screen.queryByTestId("trigger-g1-add-inputs")).toBeNull();
    expect(screen.getByTestId("fn-dirty").textContent).toBe("There are changes that aren't saved.");
    // Switched off, and removed.
    fireEvent.click(within(screen.getByTestId("trigger-g1")).getByRole("switch"));
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "g1", { enabled: false }));
    fireEvent.click(screen.getByTestId("trigger-g1-remove"));
    await waitFor(() => expect(m.deleteTrigger).toHaveBeenCalledWith("f1", "g1"));
    await screen.findByTestId("fn-triggers-empty");
  });

  test("a call: who may, its own address in full, and how many a minute", async () => {
    server = full({ name: "Join us", live: { inputs: [], do: [] }, published: true, changed: false });
    show();
    await screen.findByTestId("fn-triggers");
    pick("fn-triggers-add", "call");
    await waitFor(() => expect(m.addTrigger).toHaveBeenCalledWith("f1", { kind: "call", config: { who: "customer" }, slug: "join-us" }));
    expect((await screen.findByTestId("trigger-g1-address")).textContent).toBe("POST https://api.shop.test/v1/fn/join-us");
    expect(screen.queryByTestId("fn-triggers-asleep")).toBeNull();
    fireEvent.click(screen.getByTestId("trigger-g1-copy"));
    await waitFor(() => expect(m.copied).toEqual(["https://api.shop.test/v1/fn/join-us"]));
    expect(screen.getByTestId("trigger-g1-hint").textContent).toContain("Who called is {{caller}}");
    pick("trigger-g1-who", "public");
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "g1", { config: { who: "public" } }));
    // The address and the limit are sent when their box is left.
    type("trigger-g1-slug", "Join-Club");
    expect(m.saveTrigger).toHaveBeenCalledTimes(1);
    fireEvent.blur(screen.getByTestId("trigger-g1-slug"));
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "g1", { slug: "join-club" }));
    await waitFor(() => expect(screen.getByTestId("trigger-g1-address").textContent).toBe("POST https://api.shop.test/v1/fn/join-club"));
    expect((screen.getByTestId("trigger-g1-per-minute") as HTMLInputElement).placeholder).toBe("10");
    type("trigger-g1-per-minute", "5");
    fireEvent.blur(screen.getByTestId("trigger-g1-per-minute"));
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "g1", { config: { who: "public", perMinute: 5 } }));
  });

  test("a schedule, a store event and a webhook; a member who can only look sees them and changes nothing", async () => {
    server = full({
      triggers: [
        trig({ id: "s1", kind: "schedule", config: { everyMinutes: 30 }, hands: ["at"], fired: 12, lastAt: "2026-11-16T09:00:00Z", nextAt: "2026-11-16T09:30:00Z" }),
        trig({ id: "e1", kind: "event", config: { event: "order.created" }, hands: ["event", "subject"] }),
        trig({ id: "w1", kind: "webhook", config: {}, address: "/v1/hooks/s3cr3t", hands: ["body", "query"] }),
        trig({ id: "w2", kind: "webhook", config: {}, address: null, hands: ["body", "query"] }),
      ],
    });
    show();
    expect((await screen.findByTestId("trigger-s1-line")).textContent).toBe("Every 30 minutes");
    expect(screen.getByTestId("trigger-s1-hint").textContent).toMatch(/It fired 12 times, last on 16 Nov.* Next: 16 Nov/);
    expect(screen.getByTestId("trigger-e1-line").textContent).toBe("A new order");
    expect(screen.getByTestId("trigger-w1-address").textContent).toBe("POST https://api.shop.test/v1/hooks/s3cr3t");
    // A webhook whose address this member isn't told.
    expect(screen.queryByTestId("trigger-w2-address")).toBeNull();
    expect(screen.getByTestId("trigger-w2").textContent).toContain("shown only to who may change functions");
    // Every day at a time instead.
    pick("trigger-s1-mode", "at");
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "s1", { config: { at: "09:00" } }));
    await waitFor(() => expect(screen.getByTestId("trigger-s1-line").textContent).toBe("Every day at 09:00"));
    pick("trigger-e1-event", "video.ready");
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "e1", { config: { event: "video.ready" } }));
    cleanup();
    m.may = new Set(["functions:read"]);
    show();
    await screen.findByTestId("trigger-s1");
    expect(screen.queryByTestId("fn-triggers-add")).toBeNull();
    expect(screen.queryByTestId("trigger-s1-remove")).toBeNull();
    expect((screen.getByTestId("trigger-e1-event") as HTMLSelectElement).disabled).toBe(true);
  });
});
