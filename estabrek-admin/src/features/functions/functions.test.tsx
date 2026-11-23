// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { FnVersion, FnDef, FnFull, FnList, FnLite, FnTest, FnTrigger, Outcome, TestsOutcome } from "../../api/functions.api";

// الـ Functions: the list and the builder over a stand-in API. Steps are added from a menu, each
// opens to its own form; the draft is saved, tried dry, and published.

const m = vi.hoisted(() => ({ getFunctions: vi.fn(), getFunction: vi.fn(), createFunction: vi.fn(), saveFunction: vi.fn(), publishFunction: vi.fn(), runFunction: vi.fn(), runFnTests: vi.fn(), deleteFunction: vi.fn(), addTrigger: vi.fn(), saveTrigger: vi.fn(), deleteTrigger: vi.fn(), getFnVersion: vi.fn(), restoreFnVersion: vi.fn(), toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, may: new Set<string>(), copied: [] as string[], HTTP_METHODS: ["GET", "POST", "PUT", "PATCH", "DELETE"] as const }));
vi.mock("../../api/functions.api", () => m);
vi.mock("../../config/env", () => ({ env: { VITE_API_BASE_URL: "https://api.shop.test/v1" } }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: m.toast }));
// The shoppers' roles (الأدوار والمجموعات), for a door that is for some roles only.
vi.mock("../../api/shopperRoles.api", () => ({ getRoles: vi.fn(async () => ({ roles: [{ key: "seller", name: { en: "Seller" }, note: null, shoppers: 2, createdAt: "2026-11-18T10:00:00Z" }], groups: [], presets: [], limits: { roles: 30, groups: 200, rolesPerShopper: 10, groupsPerShopper: 20, rolesPerAct: 10, name: 60, note: 300, members: 2000 } })) }));

import { setLangForTests } from "../../lib/lang";
import FunctionsPage from "./FunctionsPage";
import FunctionEditor from "./FunctionEditor";
import { inputsOut } from "./TryPanel";
import { newTest, newTestId, setTestInput } from "./TestsPanel";
import { testWhyText } from "./fnText";
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
  // What a customer step picks from.
  store: { roles: [{ key: "vip", name: { en: "VIP", ar: "مميّزة" } }, { key: "seller", name: { en: "Seller" } }], groups: [{ id: "g1", name: "Club" }] },
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
  m.saveFunction.mockImplementation(async (_id: string, body: { name?: string; note?: string | null; enabled?: boolean; draft?: FnDef; tests?: FnTest[] }) => {
    server = { ...server, ...(body.name ? { name: body.name } : {}), ...(body.note !== undefined ? { note: body.note } : {}), ...(body.enabled !== undefined ? { enabled: body.enabled } : {}), ...(body.draft ? { draft: body.draft, changed: true } : {}), ...(body.tests ? { tests: body.tests } : {}), updatedAt: new Date(Date.parse(server.updatedAt) + 1000).toISOString() };
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
    expect([...screen.getByTestId("filter-do.0-0-value-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["", "input.email", "now", "caller", "caller.id", "caller.name", "caller.email", "caller.kind", "caller.roles", "caller.groups", "caller.discordId", "caller.steamId"]);
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
    expect([...screen.getByTestId("steps-fail-add").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["", "add", "change", "set", "notify", "push", "email", "whatsapp", "sms", "ready", "http"]);
    pick("steps-fail-add", "notify");
    expect([...screen.getByTestId("step-fail.0-title-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["", "now", "caller", "caller.id", "caller.name", "caller.email", "caller.kind", "caller.roles", "caller.groups", "caller.discordId", "caller.steamId", "said", "error"]);
    type("step-fail.0-title", "It failed: {{error}}");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastDraft()).toEqual({ inputs: [], do: [{ act: "call", fn: "f2", input: { who: "Amal" }, as: "said" }], fail: [{ act: "notify", title: "It failed: {{error}}" }] }));
  });

  test("a code step: what it is handed by name, the code, and a name for its answer; saved as written", async () => {
    show();
    await screen.findByTestId("fn-editor");
    // Its own group in the menu, after the others.
    expect([...screen.getByTestId("steps-do-add").querySelectorAll("optgroup")].map((g) => g.getAttribute("label"))).toEqual(["Your tables", "The store", "Control", "Messages", "Outside the store", "Code"]);
    pick("steps-do-add", "find");
    pick("steps-do-add", "code");
    expect(screen.getByTestId("step-do.1").getAttribute("data-open")).toBe("true");
    // It starts with a few lines saying how it works, and says what the cage lets it do.
    const box = screen.getByTestId("step-do.1-code") as HTMLTextAreaElement;
    expect(box.value).toMatch(/^\/\/ What you hand the code is in input[\s\S]+return input;$/);
    expect(box.getAttribute("dir")).toBe("ltr");
    expect(screen.getByTestId("step-do.1-code-note").textContent).toContain("it sees only what you hand it");
    expect(screen.getByTestId("step-do.1-code-note").textContent).toContain("At most 2 seconds and 32 MB");
    // What it is handed: a name, and a value the run knows (the menu offers the rows found before it).
    fireEvent.click(screen.getByTestId("step-do.1-give-add"));
    expect((screen.getByTestId("step-do.1-give-0-name") as HTMLInputElement).value).toBe("value");
    type("step-do.1-give-0-name", "orders");
    expect([...screen.getByTestId("step-do.1-give-0-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toContain("rows");
    pick("step-do.1-give-0-names", "rows");
    fireEvent.click(screen.getByTestId("step-do.1-give-add"));
    type("step-do.1-give-1", "100");
    // A second value, taken out again.
    fireEvent.click(screen.getByTestId("step-do.1-give-add"));
    fireEvent.click(screen.getByTestId("step-do.1-give-2-remove"));
    type("step-do.1-code", "const big = input.orders.filter((o) => o.total > input.value);\nreturn big.length;");
    type("step-do.1-as", "count");
    // (A long first line is cut where the card's line ends.)
    expect(screen.getByTestId("step-do.1-line").textContent).toBe("const big = input.orders.filter((o) => o.total > input.valu… ← count");
    // The step after it is offered what the code keeps.
    pick("steps-do-add", "return");
    expect([...screen.getByTestId("step-do.2-value-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toContain("count");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() =>
      expect(lastDraft()).toEqual({
        inputs: [],
        do: [
          { act: "find", table: "t1", as: "rows" },
          { act: "code", code: "const big = input.orders.filter((o) => o.total > input.value);\nreturn big.length;", give: { orders: "{{rows}}", value: 100 }, as: "count" },
          { act: "return", value: "" },
        ],
      }),
    );
  });

  test("code that can't be read is said on its step, with its line; the cage's limits come from the server", async () => {
    m.getFunctions.mockImplementation(async () => ({ ...listOf([lite(server), greet]), limits: { ...listOf([]).limits, code: 8000, cage: { ms: 3000, memoryMb: 64 } } }));
    server = full({ draft: { inputs: [], do: [{ act: "code", code: "const a = 1;\nreturn a +;", as: "x" }] }, problems: [{ at: "do.0", message: "The code can't be read: SyntaxError: unexpected token in expression: ';' (line 2)" }] });
    show();
    expect((await screen.findByTestId("fn-problems")).textContent).toContain("Step 1: The code has a mistake in its writing: SyntaxError: unexpected token in expression: ';' (line 2)");
    expect(screen.getByTestId("step-do.0-problems").textContent).toBe("The code has a mistake in its writing: SyntaxError: unexpected token in expression: ';' (line 2)");
    fireEvent.click(screen.getByTestId("step-do.0-head"));
    expect(screen.getByTestId("step-do.0-code-note").textContent).toContain("At most 3 seconds and 64 MB");
    expect((screen.getByTestId("step-do.0-code") as HTMLTextAreaElement).maxLength).toBe(8000);
    // A member who can only look reads the code and changes nothing.
    cleanup();
    m.may = new Set(["functions:read"]);
    show();
    await screen.findByTestId("fn-editor");
    fireEvent.click(screen.getByTestId("step-do.0-head"));
    expect((screen.getByTestId("step-do.0-code") as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.queryByTestId("step-do.0-give-add")).toBeNull();
  });

  test("a call to a site: the way, the address, a secret put in by its name, what is sent, and a name for the answer", async () => {
    const outside = { sites: ["api.telegram.org"], secrets: [{ name: "TELEGRAM_TOKEN", sites: ["api.telegram.org"] }] };
    m.getFunctions.mockImplementation(async () => ({ ...listOf([lite(server), greet]), outside }));
    server = full({ draft: { inputs: [{ name: "chat", type: "text" }], do: [] } });
    show();
    await screen.findByTestId("fn-editor");
    pick("steps-do-add", "http");
    expect(screen.getByTestId("step-do.0").getAttribute("data-open")).toBe("true");
    expect((screen.getByTestId("step-do.0-method") as HTMLSelectElement).value).toBe("POST");
    // Where it may call is said, with the way to the page that allows a site.
    expect(screen.getByTestId("step-do.0-sites").textContent).toContain("It calls only the allowed sites: api.telegram.org.");
    expect(within(screen.getByTestId("step-do.0-sites")).getByRole("link").getAttribute("href")).toBe("/admin/connections");
    // The address, with the secret put in from the menu: only its name is ever on the page.
    type("step-do.0-url", "https://api.telegram.org/bot");
    expect([...screen.getByTestId("step-do.0-url-secrets").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(["", "TELEGRAM_TOKEN"]);
    pick("step-do.0-url-secrets", "TELEGRAM_TOKEN");
    type("step-do.0-url", "https://api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage");
    // A header, its secret from the menu too.
    fireEvent.click(screen.getByTestId("step-do.0-header-add"));
    expect((screen.getByTestId("step-do.0-header-0-name") as HTMLInputElement).value).toBe("Authorization");
    type("step-do.0-header-0", "Bearer ");
    pick("step-do.0-header-0-secrets", "TELEGRAM_TOKEN");
    // A second header, taken out again.
    fireEvent.click(screen.getByTestId("step-do.0-header-add"));
    fireEvent.click(screen.getByTestId("step-do.0-header-1-remove"));
    // What is sent: a thing, with the run's names in it.
    type("step-do.0-body", '{"chat_id": "{{input.chat}}", "text": "hi"}');
    fireEvent.click(screen.getByTestId("step-do.0-any"));
    type("step-do.0-as", "sent");
    expect(screen.getByTestId("step-do.0-line").textContent).toBe("POST api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage ← sent");
    expect(screen.getByTestId("step-do.0-http-note").textContent).toContain("no step ever gets it back");
    // The step after it is offered the answer's parts.
    pick("steps-do-add", "return");
    expect([...screen.getByTestId("step-do.1-value-names").querySelectorAll("option")].map((o) => o.getAttribute("value")).slice(-3)).toEqual(["sent.body", "sent.ok", "sent.status"]);
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() =>
      expect(lastDraft().do[0]).toEqual({
        act: "http",
        method: "POST",
        url: "https://api.telegram.org/bot{{secret.TELEGRAM_TOKEN}}/sendMessage",
        headers: { Authorization: "Bearer {{secret.TELEGRAM_TOKEN}}" },
        body: { chat_id: "{{input.chat}}", text: "hi" },
        anyStatus: true,
        as: "sent",
      }),
    );
    // A GET sends nothing: what was to be sent isn't asked for.
    fireEvent.click(screen.getByTestId("step-do.0-head"));
    pick("step-do.0-method", "GET");
    expect(screen.queryByTestId("step-do.0-body")).toBeNull();
  });

  test("a step through a ready connection: picked from a menu, with what its kind asks for; no address and no key", async () => {
    const outside = {
      sites: [],
      secrets: [],
      ready: [{ id: "c1", name: "Store alerts", kind: "telegram", set: ["chat"] }, { id: "c2", name: "Team", kind: "slack", set: [] }, { id: "c3", name: "Bare bot", kind: "telegram", set: [] }],
      kinds: [
        { kind: "telegram", label: "Telegram", actions: [{ id: "message", fields: [{ id: "chat", required: true, long: false, or: "chat" }, { id: "text", required: true, long: true }] }] },
        { kind: "slack", label: "Slack", actions: [{ id: "message", fields: [{ id: "text", required: true, long: true }] }] },
      ],
    };
    m.getFunctions.mockImplementation(async () => ({ ...listOf([lite(server), greet]), outside }));
    server = full({ draft: { inputs: [{ name: "name", type: "text" }], do: [] } });
    show();
    await screen.findByTestId("fn-editor");
    // It is offered first under "Outside the store".
    expect([...screen.getByTestId("steps-do-add").querySelectorAll('optgroup[label="Outside the store"] option')].map((o) => o.getAttribute("value"))).toEqual(["ready", "http"]);
    pick("steps-do-add", "ready");
    expect(screen.getByTestId("step-do.0").getAttribute("data-open")).toBe("true");
    // The first connection is picked: each by its service and the owner's name for it.
    expect((screen.getByTestId("step-do.0-via") as HTMLSelectElement).value).toBe("c1");
    expect([...screen.getByTestId("step-do.0-via").querySelectorAll("option")].map((o) => o.textContent)).toEqual(["Telegram · Store alerts", "Slack · Team", "Telegram · Bare bot"]);
    // Its kind does one thing: nothing to choose there.
    expect(screen.queryByTestId("step-do.0-what")).toBeNull();
    // The connection has a usual chat, so the step may leave it out; the message is the step's to write.
    expect((screen.getByTestId("step-do.0-give-chat") as HTMLInputElement).placeholder).toBe("empty = the connection's usual one");
    expect(screen.getByTestId("step-do.0-give-chat").closest("div.flex.flex-wrap")?.querySelector("span")?.textContent).toBe("To which chat");
    type("step-do.0-give-text", "New order from ");
    pick("step-do.0-give-text-names", "input.name");
    expect((screen.getByTestId("step-do.0-give-text") as HTMLTextAreaElement).value).toBe("New order from {{input.name}}");
    type("step-do.0-as", "sent");
    expect(screen.getByTestId("step-do.0-line").textContent).toBe("Store alerts · New order from {{input.name}} ← sent");
    expect(screen.getByTestId("step-do.0-ready-note").textContent).toContain("No address and no key in this step");
    // Nothing in the step lets a secret in.
    expect(screen.queryByTestId("step-do.0-url-secrets")).toBeNull();
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastDraft().do[0]).toEqual({ act: "ready", via: "c1", what: "message", give: { text: "New order from {{input.name}}" }, as: "sent" }));
    // A connection with no usual chat: the step must say which.
    pick("step-do.0-via", "c3");
    expect((screen.getByTestId("step-do.0-give-chat") as HTMLInputElement).placeholder).toBe("");
    expect(screen.getByTestId("step-do.0-give-chat").closest("div.flex.flex-wrap")?.querySelector("span")?.textContent).toBe("To which chat *");
    // The same kind: what was written stays. Another kind asks for other things.
    expect((screen.getByTestId("step-do.0-give-text") as HTMLTextAreaElement).value).toBe("New order from {{input.name}}");
    type("step-do.0-give-chat", "@orders");
    pick("step-do.0-via", "c2");
    expect(screen.queryByTestId("step-do.0-give-chat")).toBeNull();
    expect((screen.getByTestId("step-do.0-give-text") as HTMLTextAreaElement).value).toBe("");
    type("step-do.0-give-text", "hi team");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastDraft().do[0]).toEqual({ act: "ready", via: "c2", what: "message", give: { text: "hi team" }, as: "sent" }));
  });

  test("with no ready connection the step says where one is made; one that was deleted is said on the step", async () => {
    server = full({ draft: { inputs: [], do: [{ act: "ready", via: "gone", what: "message", give: { text: "hi" } }] }, problems: [{ at: "do.0", message: "This connection isn't there any more" }] });
    show();
    expect((await screen.findByTestId("step-do.0-problems")).textContent).toBe("This connection isn't there any more");
    fireEvent.click(screen.getByTestId("step-do.0-head"));
    expect(screen.getByTestId("step-do.0-via").querySelector("option")?.textContent).toBe("A deleted connection");
    expect(screen.getByTestId("step-do.0-ready-none").textContent).toContain("No ready connections yet (Telegram, Slack, Discord, Google Sheets, any API, or where the store is hosted: Neon, Railway, Vercel, Cloudflare)");
    expect(within(screen.getByTestId("step-do.0-ready-none")).getByRole("link").getAttribute("href")).toBe("/admin/connections");
    // A new one starts with nothing picked.
    pick("steps-do-add", "ready");
    expect(screen.getByTestId("step-do.1-via").querySelector("option")?.textContent).toBe("Pick a connection");
  });

  test("a call with no site allowed yet says so; a site that isn't allowed is said on the step", async () => {
    server = full({ draft: { inputs: [], do: [{ act: "http", method: "GET", url: "https://evil.example.com/x" }] }, problems: [{ at: "do.0", message: '"evil.example.com" isn\'t among the allowed sites' }] });
    show();
    expect((await screen.findByTestId("step-do.0-problems")).textContent).toBe("“evil.example.com” isn't among the allowed sites (it is added in “Connections & secrets”)");
    fireEvent.click(screen.getByTestId("step-do.0-head"));
    expect(screen.getByTestId("step-do.0-sites").textContent).toContain("No site is allowed yet: this step will call nowhere.");
    // No secrets kept: no menu to put one in.
    expect(screen.queryByTestId("step-do.0-url-secrets")).toBeNull();
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

  test("a code step in a try-out: that it ran, what it logged, and why its cage stopped it", async () => {
    server = full({ draft: { inputs: [], do: [{ act: "code", code: "log('customers', 2);\nreturn 2;", as: "n" }, { act: "return", value: "{{n}}" }] } });
    m.runFunction.mockResolvedValueOnce(
      outcome({
        value: 2,
        counts: { steps: 2, found: 0, added: 0, changed: 0, deleted: 0, sent: 0 },
        trace: [
          { at: "do.0", act: "code", ok: true, ms: 3, note: "Ran the code (3 ms)", say: ["ran", 3], log: ["customers 2", "done"] },
          { at: "do.1", act: "return", ok: true, ms: 0, note: "Gave back its answer", say: ["returned"] },
        ],
      }),
    );
    show();
    await screen.findByTestId("fn-try");
    fireEvent.click(screen.getByTestId("fn-try-dry"));
    await screen.findByTestId("fn-outcome-line");
    const lines = [...screen.getByTestId("fn-trace").querySelectorAll("li")];
    expect(lines[0].textContent?.replace(/\s+/g, " ")).toContain("Step 1 JavaScript code Ran the code (3 ms)");
    expect(screen.getByTestId("fn-trace-log-0").textContent).toBe("customers 2\ndone");
    expect(screen.queryByTestId("fn-trace-log-1")).toBeNull();

    // Stopped by the cage: said in the page's words; what the code logged before is still shown.
    m.runFunction.mockResolvedValueOnce(outcome({ ok: false, error: "The code ran longer than 2 seconds", failedAt: "do.0", trace: [{ at: "do.0", act: "code", ok: false, ms: 2001, error: "The code ran longer than 2 seconds", log: ["started"] }] }));
    fireEvent.click(screen.getByTestId("fn-try-dry"));
    await waitFor(() => expect(screen.getByTestId("fn-outcome").getAttribute("data-ok")).toBe("false"));
    expect(screen.getByTestId("fn-outcome-error").textContent).toBe("Step 1: The code ran longer than 2 seconds and was stopped");
    expect(screen.getByTestId("fn-trace").textContent).toContain("The code ran longer than 2 seconds and was stopped");
    expect(screen.getByTestId("fn-trace-log-0").textContent).toBe("started");
    expect(screen.getByTestId("step-do.0").className).toContain("border-red-400/60");
    // The code's own mistake stays as the engine said it, with its line.
    m.runFunction.mockResolvedValueOnce(outcome({ ok: false, error: "TypeError: cannot read property 'total' of undefined (line 3)", failedAt: "do.0", trace: [{ at: "do.0", act: "code", ok: false, ms: 1, error: "TypeError: cannot read property 'total' of undefined (line 3)" }] }));
    fireEvent.click(screen.getByTestId("fn-try-dry"));
    await waitFor(() => expect(screen.getByTestId("fn-outcome-error").textContent).toBe("Step 1: TypeError: cannot read property 'total' of undefined (line 3)"));
  });

  test("a real run: published only, asked first", async () => {
    server = full({ draft, live: draft, published: true, changed: false });
    m.runFunction.mockResolvedValue(outcome({ dry: false, counts: { steps: 1, found: 0, added: 1, changed: 0, deleted: 0, sent: 0 }, version: 2, runId: "r0123456789abcdef01234567" }));
    show();
    // A try isn't kept anywhere: it has no number.
    m.runFunction.mockResolvedValueOnce(outcome({}));
    fireEvent.click(await screen.findByTestId("fn-try-dry"));
    await screen.findByTestId("fn-outcome");
    expect(screen.queryByTestId("fn-outcome-run")).toBeNull();
    fireEvent.click(await screen.findByTestId("fn-try-real"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("The published steps will run for real");
    fireEvent.click(within(dialog).getByRole("button", { name: "Run" }));
    await waitFor(() => expect(m.runFunction).toHaveBeenCalledWith("f1", { input: {}, dry: false, which: "live" }));
    await waitFor(() => expect(screen.getByTestId("fn-outcome-line").textContent).toBe("It went through · 1 added · 7 ms"));
    // A real run is kept in the run log, with what each step did: it says which version ran and under which number.
    expect(screen.getByTestId("fn-outcome-run").textContent).toBe("Version 2 · Kept in the run log as r0123456789abcdef01234567");
    expect(within(screen.getByTestId("fn-outcome-run")).getByRole("link").getAttribute("href")).toBe("/admin/system/runs");
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

describe("Its own tests", () => {
  const draft: FnDef = { inputs: [{ name: "email", type: "text", required: true }, { name: "tags", type: "list" }], do: [{ act: "if", if: [{ left: "{{input.email}}", cmp: "empty" }], do: [{ act: "stop", message: "An email is needed" }] }, { act: "return", value: { ok: true } }] };
  const kept: FnTest[] = [
    { id: "t001", name: "With an email", input: { email: "a@b.c" }, expect: { ok: true, value: { ok: true } } },
    { id: "t002", name: "No email: refused", input: {}, expect: { ok: false, error: "email is needed" } },
  ];
  const result = (id: string, over: Partial<TestsOutcome["results"][number]> = {}) => ({ id, name: id, pass: true, why: null, ok: true, value: null, error: null, failedAt: null, ms: 3, ...over });
  const lastTests = () => m.saveFunction.mock.calls.at(-1)?.[1].tests as FnTest[];

  test("a test's own sums: a fresh one, what is typed for an input, and why one didn't pass", () => {
    expect(newTestId(["t001"])).toMatch(/^[a-z0-9]{4,16}$/);
    expect(newTest(kept, "Test 3")).toMatchObject({ name: "Test 3", input: {}, expect: { ok: true } });
    expect(new Set([...kept.map((t) => t.id), newTest(kept, "x").id]).size).toBe(3);
    const t = kept[0];
    // Words stay words; a list is read as one; nothing typed isn't handed.
    expect(setTestInput(t, draft.inputs[0], "12").input).toEqual({ email: "12" });
    expect(setTestInput(t, draft.inputs[1], '["vip", "new"]').input).toEqual({ email: "a@b.c", tags: ["vip", "new"] });
    expect(setTestInput(t, draft.inputs[0], "  ").input).toEqual({});
    expect(testWhyText("stopped", "en")).toBe("It stopped, and was expected to go through");
    expect(testWhyText("wentThrough", "ar")).toBe("مشيت للآخر، والمتوقّع إنها توقف");
    expect(testWhyText("time", "en")).toContain("never got its turn");
    // One a newer server says: as it said it.
    expect(testWhyText("flew", "ar")).toBe("flew");
  });

  test("a test is written: what it hands, what must come of it; saved with the draft", async () => {
    server = full({ draft });
    show();
    await screen.findByTestId("fn-tests");
    expect(screen.getByTestId("fn-tests-empty").textContent).toContain("No tests yet");
    expect(screen.queryByTestId("fn-tests-run")).toBeNull();
    // It goes through, giving back exactly this.
    fireEvent.click(screen.getByTestId("fn-test-add"));
    expect((screen.getByTestId("fn-test-0-name") as HTMLInputElement).value).toBe("Test 1");
    type("fn-test-0-name", "With an email");
    type("fn-test-0-input-email", "a@b.c");
    type("fn-test-0-input-tags", '["vip"]');
    type("fn-test-0-value", '{"ok": true}');
    // It stops, with these words in its reason.
    fireEvent.click(screen.getByTestId("fn-test-add"));
    type("fn-test-1-name", "No email: refused");
    pick("fn-test-1-ok", "stop");
    expect(screen.queryByTestId("fn-test-1-value")).toBeNull();
    type("fn-test-1-error", "email is needed");
    // A third, taken out again.
    fireEvent.click(screen.getByTestId("fn-test-add"));
    fireEvent.click(screen.getByTestId("fn-test-2-remove"));
    // The steps don't name the caller: a test has nobody to be run as.
    expect(screen.queryByTestId("fn-test-0-caller")).toBeNull();
    expect(screen.getByTestId("fn-dirty").textContent).toBe("There are changes that aren't saved.");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(m.saveFunction).toHaveBeenCalled());
    expect(lastTests().map(({ id: _id, ...t }) => t)).toEqual([
      { name: "With an email", input: { email: "a@b.c", tags: ["vip"] }, expect: { ok: true, value: { ok: true } } },
      { name: "No email: refused", input: {}, expect: { ok: false, error: "email is needed" } },
    ]);
    expect(lastTests().every((t) => /^[a-z0-9]{4,16}$/.test(t.id))).toBe(true);
    expect(new Set(lastTests().map((t) => t.id)).size).toBe(2);
  });

  test("where the steps name the caller, a test says who it is run as", async () => {
    server = full({ draft: { ...draft, do: [{ act: "return", value: "{{caller.email}}" }] }, tests: [kept[0]] });
    show();
    await screen.findByTestId("fn-test-0");
    type("fn-test-0-caller", " lina@shop.test ");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastTests()[0].caller).toEqual({ email: "lina@shop.test" }));
    // Emptied: run as the member themself.
    type("fn-test-0-caller", "");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastTests()[0]).not.toHaveProperty("caller"));
  });

  test("they are run: each says how it went, and why one didn't pass", async () => {
    server = full({ draft, tests: kept });
    m.runFnTests.mockResolvedValueOnce({ results: [result("t001"), result("t002", { pass: false, why: "wentThrough", ok: true, value: { ok: true }, ms: 2 })], passed: 1, failed: 1, ms: 5 });
    show();
    await screen.findByTestId("fn-test-1");
    fireEvent.click(screen.getByTestId("fn-tests-run"));
    await waitFor(() => expect(m.runFnTests).toHaveBeenCalledWith("f1"));
    // Nothing changed on the page: nothing to save first.
    expect(m.saveFunction).not.toHaveBeenCalled();
    expect((await screen.findByTestId("fn-test-t001-result")).textContent).toBe("✓ Passed · 3 ms");
    expect(screen.getByTestId("fn-test-t002-result").textContent).toBe("✗ Didn't pass · It went through, and was expected to stop · 2 ms");
    expect(screen.getByTestId("fn-tests-summary").textContent).toBe("1 of 2 didn't pass: publishing waits until they do");
    expect(screen.getByTestId("fn-test-1").className).toContain("border-red-400/60");

    // It stopped where it should have gone through: where, and the reason; another answer than expected: the answer it gave.
    m.runFnTests.mockResolvedValueOnce({
      results: [result("t001", { pass: false, why: "value", value: { ok: false } }), result("t002", { pass: false, why: "reason", ok: false, error: "The code ran longer than 2 seconds", failedAt: "do.0" })],
      passed: 0,
      failed: 2,
      ms: 9,
    });
    fireEvent.click(screen.getByTestId("fn-tests-run"));
    await waitFor(() => expect(screen.getByTestId("fn-tests-summary").textContent).toBe("2 of 2 didn't pass: publishing waits until they do"));
    expect(screen.getByTestId("fn-test-t001-result").textContent).toContain("It gave back another answer than expected:");
    expect(screen.getByTestId("fn-test-t001-got").textContent).toContain('"ok": false');
    expect(screen.getByTestId("fn-test-t002-result").textContent).toBe("✗ Didn't pass · It stopped, but for another reason than expected · Step 1: The code ran longer than 2 seconds and was stopped · 3 ms");

    // A test changed on the page: how the old one went is no longer said; running saves it first.
    type("fn-test-1-error", "an email");
    expect(screen.queryByTestId("fn-test-t002-result")).toBeNull();
    expect(screen.queryByTestId("fn-tests-summary")).toBeNull();
    m.runFnTests.mockResolvedValueOnce({ results: [result("t001"), result("t002", { ok: false, error: "An email is needed" })], passed: 2, failed: 0, ms: 4 });
    fireEvent.click(screen.getByTestId("fn-tests-run"));
    await waitFor(() => expect(screen.getByTestId("fn-tests-summary").textContent).toBe("All passed (2)"));
    expect(lastTests()[1].expect).toEqual({ ok: false, error: "an email" });
    expect(m.saveFunction.mock.invocationCallOrder.at(-1)!).toBeLessThan(m.runFnTests.mock.invocationCallOrder.at(-1)!);
  });

  test("a publish stopped by a test shows which, and says so", async () => {
    server = full({ draft, tests: kept, changed: true });
    m.publishFunction.mockRejectedValueOnce({ response: { status: 409, data: { error: "FN_TESTS_FAILED", message: "Its own tests don't pass", details: { results: [result("t001"), result("t002", { pass: false, why: "wentThrough", ok: true })], passed: 1, failed: 1, ms: 6 } } } });
    show();
    await screen.findByTestId("fn-test-1");
    fireEvent.click(screen.getByTestId("fn-publish"));
    expect((await screen.findByTestId("fn-test-t002-result")).getAttribute("data-pass")).toBe("false");
    expect(screen.getByTestId("fn-tests-summary").textContent).toBe("1 of 2 didn't pass: publishing waits until they do");
    expect(screen.getByTestId("fn-state").textContent).toBe("Draft, not published");
    // Mended: it publishes, and the old results go.
    fireEvent.click(screen.getByTestId("fn-publish"));
    await waitFor(() => expect(screen.getByTestId("fn-state").textContent).toBe("Published"));
    expect(screen.queryByTestId("fn-tests-summary")).toBeNull();
  });

  test("what was just tried is kept as a test; a member who can only look reads the tests and changes nothing", async () => {
    server = full({ draft, tests: [kept[0]] });
    m.runFunction.mockResolvedValueOnce({ ok: false, dry: true, value: null, error: "An email is needed", failedAt: "do.0.do.0", trace: [], counts: { steps: 2, found: 0, added: 0, changed: 0, deleted: 0, sent: 0 }, ms: 4 });
    show();
    await screen.findByTestId("fn-try");
    type("fn-try-input-tags", '["new"]');
    fireEvent.click(screen.getByTestId("fn-try-dry"));
    await screen.findByTestId("fn-outcome");
    fireEvent.click(screen.getByTestId("fn-try-keep"));
    // The same inputs, and what the try showed: it stops.
    expect((screen.getByTestId("fn-test-1-name") as HTMLInputElement).value).toBe("Test 2");
    expect((screen.getByTestId("fn-test-1-input-tags") as HTMLInputElement).value).toBe('["new"]');
    expect((screen.getByTestId("fn-test-1-ok") as HTMLSelectElement).value).toBe("stop");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastTests()).toHaveLength(2));
    expect(lastTests()[1]).toMatchObject({ input: { tags: ["new"] }, expect: { ok: false } });

    cleanup();
    m.may = new Set(["functions:read"]);
    show();
    await screen.findByTestId("fn-test-0");
    expect((screen.getByTestId("fn-test-0-name") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByTestId("fn-test-add")).toBeNull();
    expect(screen.queryByTestId("fn-tests-run")).toBeNull();
    expect(screen.queryByTestId("fn-test-0-remove")).toBeNull();
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

  test("a call for signed-in shoppers can be for some roles only (with the customers' permission)", async () => {
    m.may = new Set([...m.may, "customers:read"]);
    server = full({ name: "Sellers only", live: { inputs: [], do: [] }, published: true, changed: false, triggers: [trig({ id: "c1", kind: "call", config: { who: "customer", perMinute: 20 }, address: "/v1/fn/sellers-only", hands: ["input", "caller"] })] });
    show();
    fireEvent.click(await screen.findByTestId("trigger-c1-roles-pick-seller"));
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "c1", { config: { who: "customer", perMinute: 20, roles: ["seller"] } }));
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

describe("Its versions", () => {
  const v = (n: number, more: Partial<FnVersion> = {}): FnVersion => ({ n, at: `2026-11-1${n}T09:00:00Z`, by: "owner@shop.test", back: null, steps: 2, inputs: 1, ...more });
  const three = (): FnFull => full({ published: true, changed: false, version: 3, live: { inputs: [], do: [{ act: "return", value: "three" }] }, draft: { inputs: [], do: [{ act: "return", value: "three" }] }, versions: [v(3, { back: 1 }), v(2), v(1)], versionsKept: 50 });
  beforeEach(() => {
    m.getFnVersion.mockImplementation(async (_id: string, n: number) => ({ n, def: { inputs: [{ name: "who", type: "text" }], do: [{ act: "notify", title: `Version ${n} says hi` }, { act: "return", value: "{{input.who}}" }], fail: [{ act: "email", subject: "It failed", text: "{{error}}" }] } }));
    m.restoreFnVersion.mockImplementation(async (_id: string, n: number, to: "live" | "draft") => {
      const def: FnDef = { inputs: [], do: [{ act: "return", value: `from ${n}` }] };
      server = to === "draft" ? { ...server, draft: def, changed: true, updatedAt: new Date(Date.parse(server.updatedAt) + 1000).toISOString() } : { ...server, live: def, version: (server.version ?? 0) + 1, versions: [v((server.version ?? 0) + 1, { back: n }), ...(server.versions ?? [])], changed: true, updatedAt: new Date(Date.parse(server.updatedAt) + 1000).toISOString() };
      return server;
    });
  });

  test("one that was never published has none; a published one says which version runs", async () => {
    show();
    expect((await screen.findByTestId("fn-versions-empty")).textContent).toContain("The first publish becomes version 1");
    expect(screen.queryByTestId("fn-version")).toBeNull();
    cleanup();
    server = three();
    show();
    expect((await screen.findByTestId("fn-version")).textContent).toBe("Version 3");
    expect([...screen.getByTestId("fn-versions").querySelectorAll("li[data-testid^=fn-version-]")].map((li) => [li.getAttribute("data-testid"), li.getAttribute("data-live")])).toEqual([["fn-version-3", "true"], ["fn-version-2", "false"], ["fn-version-1", "false"]]);
    // Newest first: which one runs, where its steps came from, when, who and how big.
    expect(screen.getByTestId("fn-version-3").textContent).toContain("This one runs");
    expect(screen.getByTestId("fn-version-3").textContent).toContain("Back to version 1");
    expect(screen.getByTestId("fn-version-2").textContent).toMatch(/12 Nov 2026.* · owner@shop\.test · 2 steps/);
    // The one that runs isn't published again; any of them goes into the draft.
    expect(screen.queryByTestId("fn-version-3-publish")).toBeNull();
    expect(screen.getByTestId("fn-version-2-publish")).toBeTruthy();
    expect(screen.getByTestId("fn-version-3-draft")).toBeTruthy();
  });

  test("its steps are looked at as they were published", async () => {
    server = three();
    show();
    fireEvent.click(await screen.findByTestId("fn-version-2-look"));
    const steps = await screen.findByTestId("fn-version-2-steps");
    expect(m.getFnVersion).toHaveBeenCalledWith("f1", 2);
    expect(steps.textContent).toContain("It is handed: who");
    expect([...steps.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["1.Ring the admin's bellVersion 2 says hi", "2.Give back an answer{{input.who}}", "1.Emailthe shop's email · It failed"]);
    expect(steps.textContent).toContain("If a step fails");
    // One at a time; closed again.
    fireEvent.click(screen.getByTestId("fn-version-1-look"));
    await screen.findByTestId("fn-version-1-steps");
    expect(screen.queryByTestId("fn-version-2-steps")).toBeNull();
    fireEvent.click(screen.getByTestId("fn-version-1-look"));
    expect(screen.queryByTestId("fn-version-1-steps")).toBeNull();
  });

  test("an older version is published again after asking: a new version, and the draft stays", async () => {
    server = three();
    show();
    fireEvent.click(await screen.findByTestId("fn-version-1-publish"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Version 1's steps become what runs again, as a new version");
    expect(m.restoreFnVersion).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Publish it" }));
    await waitFor(() => expect(m.restoreFnVersion).toHaveBeenCalledWith("f1", 1, "live"));
    await waitFor(() => expect(screen.getByTestId("fn-version").textContent).toBe("Version 4"));
    expect(screen.getByTestId("fn-version-4").textContent).toContain("Back to version 1");
    expect(m.toast.success).toHaveBeenCalledWith("Version 1 runs again", { description: "It was kept as a new version, number 4." });
    // The draft on the page is the one that was there.
    expect(screen.getByTestId("step-do.0-line").textContent).toBe("three");
  });

  test("one that points at things that are gone isn't published again, and says which", async () => {
    server = three();
    m.restoreFnVersion.mockRejectedValueOnce({ response: { status: 409, data: { error: "FN_HAS_PROBLEMS", details: { problems: [{ at: "do.0", message: "This connection isn't there any more" }] } } } });
    show();
    fireEvent.click(await screen.findByTestId("fn-version-2-publish"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Publish it" }));
    await waitFor(() => expect(m.toast.error).toHaveBeenCalledWith("It can't be published as it is", { description: "It talks about things that aren't there any more: Step 1: This connection isn't there any more Put it in the draft and mend it." }));
    expect(screen.getByTestId("fn-version").textContent).toBe("Version 3");
  });

  test("into the draft: at once when nothing would be lost, after asking when the draft has changes", async () => {
    server = three();
    show();
    // The draft is what is published: nothing to lose.
    fireEvent.click(await screen.findByTestId("fn-version-1-draft"));
    await waitFor(() => expect(m.restoreFnVersion).toHaveBeenCalledWith("f1", 1, "draft"));
    await waitFor(() => expect(screen.getByTestId("step-do.0-line").textContent).toBe("from 1"));
    expect(screen.getByTestId("fn-version").textContent).toBe("Version 3");
    expect(m.toast.success).toHaveBeenCalledWith("Version 1's steps are in the draft", { description: "What runs hasn't changed until you publish." });
    // Now the draft differs from what runs: another version over it asks first.
    fireEvent.click(screen.getByTestId("fn-version-2-draft"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("the changes in it that weren't published are lost");
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace the draft" }));
    await waitFor(() => expect(m.restoreFnVersion).toHaveBeenLastCalledWith("f1", 2, "draft"));
    await waitFor(() => expect(screen.getByTestId("step-do.0-line").textContent).toBe("from 2"));
  });

  test("a member who can only look sees the versions and their steps, and goes back to none", async () => {
    m.may = new Set(["functions:read"]);
    server = three();
    show();
    await screen.findByTestId("fn-versions");
    expect(screen.getByTestId("fn-version-2-look")).toBeTruthy();
    expect(screen.queryByTestId("fn-version-2-publish")).toBeNull();
    expect(screen.queryByTestId("fn-version-2-draft")).toBeNull();
  });
});

describe("What it gives back", () => {
  const outcome = (over: Partial<Outcome>): Outcome => ({ ok: true, dry: true, value: null, error: null, failedAt: null, trace: [], counts: { steps: 0, found: 0, added: 0, changed: 0, deleted: 0, sent: 0 }, ms: 7, ...over });

  test("the kind of its answer and a thing's fields are part of the draft; nothing in particular is no promise", async () => {
    server = full({ draft: { inputs: [], do: [{ act: "return", value: "" }] } });
    show();
    await screen.findByTestId("fn-gives");
    expect((screen.getByTestId("fn-gives-type") as HTMLSelectElement).value).toBe("");
    expect([...screen.getByTestId("fn-gives-type").querySelectorAll("option")].map((o) => o.textContent)).toEqual(["It promises nothing in particular", "Text", "Number", "Yes / no", "A list", "A thing with fields"]);
    // Text has no fields to say.
    pick("fn-gives-type", "text");
    expect(screen.queryByTestId("fn-gives-field-add")).toBeNull();
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastDraft().gives).toEqual({ type: "text" }));
    // A thing: its fields, each with its kind, and whether it is always there.
    pick("fn-gives-type", "thing");
    fireEvent.click(screen.getByTestId("fn-gives-field-add"));
    type("fn-gives-field-0-name", "id");
    fireEvent.click(screen.getByTestId("fn-gives-field-0-required"));
    fireEvent.click(screen.getByTestId("fn-gives-field-add"));
    type("fn-gives-field-1-name", "total");
    pick("fn-gives-field-1-type", "number");
    fireEvent.click(screen.getByTestId("fn-gives-field-add"));
    // A name that isn't one, or is taken, is marked.
    type("fn-gives-field-2-name", "total");
    expect(screen.getByTestId("fn-gives-field-2-name").className).toContain("border-red-400/60");
    fireEvent.click(screen.getByTestId("fn-gives-field-2-remove"));
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastDraft().gives).toEqual({ type: "thing", fields: [{ name: "id", type: "text", required: true }, { name: "total", type: "number" }] }));
    // A list keeps the fields (they are each thing's); nothing in particular drops the promise.
    pick("fn-gives-type", "list");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastDraft().gives?.type).toBe("list"));
    expect(lastDraft().gives?.fields).toHaveLength(2);
    pick("fn-gives-type", "");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect("gives" in lastDraft()).toBe(false));
    // A member who can only look changes none of it.
    cleanup();
    m.may = new Set(["functions:read"]);
    server = full({ draft: { inputs: [], do: [], gives: { type: "thing", fields: [{ name: "id", type: "text" }] } } });
    show();
    await screen.findByTestId("fn-gives");
    expect((screen.getByTestId("fn-gives-type") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByTestId("fn-gives-field-0-name") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByTestId("fn-gives-field-add")).toBeNull();
    expect(screen.queryByTestId("fn-gives-field-0-remove")).toBeNull();
  });

  test("a try says when the answer isn't what is promised; a test that goes through with another shape says how", async () => {
    const draft: FnDef = { inputs: [], do: [{ act: "return", value: { total: "a lot" } }], gives: { type: "thing", fields: [{ name: "total", type: "number", required: true }] } };
    server = full({ draft, tests: [{ id: "test1", name: "An order", input: {}, expect: { ok: true } }] });
    m.runFunction.mockResolvedValue(outcome({ value: { total: "a lot" }, shape: '"total" is promised to be a number and is text' }));
    show();
    fireEvent.click(await screen.findByTestId("fn-try-dry"));
    expect((await screen.findByTestId("fn-outcome-shape")).textContent).toBe("The answer isn't what it promises: “total” is promised to be a number and is text");
    // The answer is still shown: the promise is looked at, not enforced.
    expect(screen.getByTestId("fn-outcome-value").textContent).toContain("a lot");
    m.runFnTests.mockResolvedValue({ results: [{ id: "test1", name: "An order", pass: false, why: "shape", said: '"total" is promised to be a number and is text', ok: true, value: { total: "a lot" }, error: null, failedAt: null, ms: 3 }], passed: 0, failed: 1, ms: 3 });
    fireEvent.click(screen.getByTestId("fn-tests-run"));
    await waitFor(() => expect(screen.getByTestId("fn-test-test1-result").textContent).toBe("✗ Didn't pass · It went through, but its answer isn't what it promises: “total” is promised to be a number and is text · 3 ms"));
    // One that keeps its promise says nothing about it.
    m.runFunction.mockResolvedValue(outcome({ value: { total: 5 } }));
    fireEvent.click(screen.getByTestId("fn-try-dry"));
    await waitFor(() => expect(screen.queryByTestId("fn-outcome-shape")).toBeNull());
  });

  test("a step after a call is offered the fields the called function promises", async () => {
    const order = lite({ id: "f3", name: "Order", published: true, changed: false, gives: { type: "thing", fields: [{ name: "id", type: "text", required: true }, { name: "total", type: "number" }] } });
    m.getFunctions.mockImplementation(async () => listOf([lite(server), greet, order]));
    server = full({ draft: { inputs: [], do: [{ act: "call", fn: "f3", input: {}, as: "order" }, { act: "return", value: "" }] } });
    show();
    fireEvent.click(await screen.findByTestId("step-do.1-head"));
    expect([...screen.getByTestId("step-do.1-value-names").querySelectorAll("option")].map((o) => o.getAttribute("value")).slice(-3)).toEqual(["order", "order.id", "order.total"]);
  });
});

describe("The store's own steps", () => {
  test("a coupon: its code, what it takes off, and the rest left to the store; the steps after it are offered its code", async () => {
    show();
    await screen.findByTestId("fn-editor");
    expect([...screen.getByTestId("steps-do-add").querySelectorAll('optgroup[label="The store"] option')].map((o) => o.getAttribute("value"))).toEqual(["coupon", "stock", "customer", "pay"]);
    pick("steps-do-add", "coupon");
    // A new one: a made-up code, ten percent, a month.
    expect(screen.getByTestId("step-do.0-line").textContent).toBe("a new code · 10% · 30 days ← coupon");
    expect(screen.getByTestId("step-do.0-max")).toBeTruthy();
    type("step-do.0-coupon-code", "SPRING");
    type("step-do.0-value", "15");
    type("step-do.0-days", "");
    // An amount off has no "most off".
    pick("step-do.0-off", "amount");
    expect(screen.queryByTestId("step-do.0-max")).toBeNull();
    expect(screen.getByTestId("step-do.0-line").textContent).toBe("SPRING · 15 off ← coupon");
    expect(screen.getByTestId("store-right-note").textContent).toBe("Publishing this step also needs the permission: «Coupons: add and change»");
    pick("steps-do-add", "email");
    expect([...screen.getByTestId("step-do.1-subject-names").querySelectorAll("option")].map((o) => o.getAttribute("value"))).toEqual(expect.arrayContaining(["coupon.code", "coupon.endsAt", "coupon.value"]));
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastDraft()).toEqual({ inputs: [], do: [{ act: "coupon", off: "amount", value: 15, code: "SPRING", as: "coupon" }, { act: "email", subject: "", text: "" }] }));
  });

  test("a customer given a role or put in a group, picked from the store's own; a piece's stock by its SKU", async () => {
    show();
    await screen.findByTestId("fn-editor");
    pick("steps-do-add", "customer");
    // It starts on the one who started the run, and the first role.
    expect((screen.getByTestId("step-do.0-what") as HTMLSelectElement).value).toBe("vip");
    expect(screen.getByTestId("step-do.0-line").textContent).toBe("{{caller.id}} · Give a role «VIP» ← buyer");
    expect(screen.getByTestId("store-right-note").textContent).toContain("«Customers: change»");
    pick("step-do.0-mark", "join");
    const groups = screen.getByTestId("step-do.0-what") as HTMLSelectElement;
    expect([groups.value, [...groups.options].map((o) => o.textContent)]).toEqual(["Club", ["Club"]]);
    pick("step-do.0-mark", "read");
    expect(screen.queryByTestId("step-do.0-what")).toBeNull();
    expect(screen.getByTestId("store-right-note").textContent).toContain("«Customers: see»");
    pick("step-do.0-mark", "join");
    pick("steps-do-add", "stock");
    type("step-do.1-sku", "CH-BLK-M");
    pick("step-do.1-how", "add");
    type("step-do.1-amount", "3");
    expect(screen.getByTestId("step-do.1-line").textContent).toBe("CH-BLK-M +3 ← stock");
    expect(screen.getByTestId("step-do.1-stock-note").textContent).toContain("It never goes below 0");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() =>
      expect(lastDraft()).toEqual({
        inputs: [],
        do: [
          { act: "customer", who: "{{caller.id}}", mark: "join", what: "Club", as: "buyer" },
          { act: "stock", sku: "CH-BLK-M", how: "add", amount: 3, as: "stock" },
        ],
      }),
    );
  });

  test("publishing one without the permission it needs says which", async () => {
    server = full({ draft: { inputs: [], do: [{ act: "coupon", off: "percent", value: 10 }] }, changed: true });
    m.publishFunction.mockRejectedValueOnce({ response: { status: 403, data: { error: "FN_NEEDS_RIGHT", details: { missing: ["discounts:write", "customers:read"] } } } });
    show();
    fireEvent.click(await screen.findByTestId("fn-publish"));
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled());
    const [title, { description }] = m.toast.error.mock.calls.at(-1) as [string, { description: string }];
    expect(title).toBe("Not published");
    expect(description).toBe("It has steps that change the store, and publishing them needs a permission you don't have: Coupons: add and change · Customers: see");
  });
});
