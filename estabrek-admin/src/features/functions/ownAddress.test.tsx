// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { FnDef, FnFull, FnInput, FnList, FnTrigger } from "../../api/functions.api";

// An address of the owner's own (a method and a path under /v1/api), and an input's rules, on the
// function's page: the address's card, its words, and the rules box of each input. The server's
// part is tested with the database (backend fnRoutes.spec.ts).

const m = vi.hoisted(() => ({ getFunctions: vi.fn(), getFunction: vi.fn(), createFunction: vi.fn(), saveFunction: vi.fn(), publishFunction: vi.fn(), runFunction: vi.fn(), runFnTests: vi.fn(), deleteFunction: vi.fn(), addTrigger: vi.fn(), saveTrigger: vi.fn(), deleteTrigger: vi.fn(), getFnVersion: vi.fn(), restoreFnVersion: vi.fn(), toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }, may: new Set<string>(), copied: [] as string[], HTTP_METHODS: ["GET", "POST", "PUT", "PATCH", "DELETE"] as const }));
vi.mock("../../api/functions.api", () => m);
vi.mock("../../config/env", () => ({ env: { VITE_API_BASE_URL: "https://api.shop.test/v1" } }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: m.toast }));

import { setLangForTests } from "../../lib/lang";
import FunctionEditor from "./FunctionEditor";
import { newTrigger } from "./FnTriggers";
import { boundOf, choicesOf, rulesCount, withRules, withoutRules } from "./fnInputRules";
import { INPUT_FORMAT_NAME, TRIGGER_KIND_NAME, failText, fnTriggerName, inputSaid, problemText, routeRefusal, triggerLine } from "./fnText";

const list: FnList = {
  functions: [],
  tables: [],
  ops: {},
  cmps: ["eq"],
  limits: { steps: 60, depth: 4, conditions: 8, inputs: 20, values: 40, text: 2000, found: 200, loop: 200, executed: 1000, writes: 200, messages: 20, calls: 3, ms: 10000 },
  triggers: { kinds: ["row", "schedule", "event", "call", "webhook", "route"], events: [], callPerMinute: { customer: 30, key: 120, public: 10 }, limits: { perFunction: 10, everyMinutes: { min: 5, max: 10080 } }, route: { base: "/v1/api", methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], status: [200, 201, 202, 204], limits: { parts: 6, length: 120 } } },
  inputRules: { formats: ["email", "phone", "url", "date"], limits: { choices: 30, choice: 100 } },
};
let server: FnFull;
const full = (over: Partial<FnFull> = {}): FnFull => ({ id: "f1", name: "Order lines", note: null, published: true, enabled: true, changed: false, steps: 0, inputs: 0, takes: [], gives: null, calls: [], runs: 0, lastRunAt: null, updatedAt: "2026-11-17T10:00:00Z", draft: { inputs: [], do: [] }, live: { inputs: [], do: [] }, problems: [], triggers: [], ...over }) as FnFull;
/** The stand-in server: an own address is kept with its address and its path's :names. */
const routeView = (id: string, config: Record<string, unknown>): FnTrigger => ({ id, kind: "route", config, slug: null, address: `/v1/api/${String(config.path)}`, enabled: true, fired: 0, lastAt: null, nextAt: null, hands: String(config.path).split("/").filter((p) => p.startsWith(":")).map((p) => p.slice(1)) });
const show = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/admin/functions/f1"]}>
        <Routes>
          <Route path="/admin/functions/:id" element={<FunctionEditor />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
const pick = (testid: string, value: string) => fireEvent.change(screen.getByTestId(testid), { target: { value } });
const lastDraft = () => m.saveFunction.mock.calls.at(-1)?.[1].draft as FnDef;

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["functions:read", "functions:write"]);
  m.copied = [];
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => void m.copied.push(t) } });
  server = full();
  m.getFunctions.mockImplementation(async () => list);
  m.getFunction.mockImplementation(async () => server);
  m.saveFunction.mockImplementation(async (_id: string, body: { draft?: FnDef }) => (server = { ...server, ...(body.draft ? { draft: body.draft } : {}) }));
  let n = 0;
  m.addTrigger.mockImplementation(async (_id: string, body: { kind: FnTrigger["kind"]; config: Record<string, unknown> }) => (server = { ...server, triggers: [...server.triggers, routeView(`r${++n}`, body.config)] }));
  m.saveTrigger.mockImplementation(async (_id: string, tid: string, body: { config?: Record<string, unknown> }) => (server = { ...server, triggers: server.triggers.map((t) => (t.id === tid && body.config ? routeView(tid, body.config) : t)) }));
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("An address of your own", () => {
  test("its words: the kind, its line, a run it started, why one isn't kept", () => {
    expect(TRIGGER_KIND_NAME.route.split("|")[1]).toBe("An address of your own (a method and a path)");
    expect(triggerLine({ kind: "route", config: { method: "GET", path: "orders/:id", who: "key" }, slug: null }, [], "en")).toBe("GET /orders/:id · A program with an API key");
    expect(fnTriggerName("route.PATCH", "en")).toBe("Your address (PATCH)");
    expect(fnTriggerName("route.PATCH", "ar")).toBe("عنوانك (PATCH)");
    expect(routeRefusal("Another address has this method and path", "ar")).toBe("في عنوان تاني بنفس الـ method والمسار");
    expect(routeRefusal("A path starts with a word, like orders/:id", "en")).toBe("A path starts with a word, like orders/:id");
    expect(routeRefusal('"$all" isn\'t a part of a path: small letters, digits, . _ - or :name', "en")).toBe("“$all” can't be in a path: small letters, digits, . _ - or :name");
    expect(routeRefusal("Something else", "ar")).toBe("Something else");
    // A new one: a program's POST to the function's name, on a path this function doesn't have yet.
    const ctx = { tables: [], events: [], taken: [], name: "Order lines" };
    expect(newTrigger("route", ctx)).toEqual({ kind: "route", config: { method: "POST", path: "order-lines", who: "key" } });
    expect(newTrigger("route", { ...ctx, paths: ["POST order-lines"] }).config.path).toBe("order-lines-2");
  });

  test("its card: the method, the path, who, how many a minute and the answer, each sent as one; its address in full", async () => {
    show();
    await screen.findByTestId("fn-triggers");
    pick("fn-triggers-add", "route");
    await waitFor(() => expect(m.addTrigger).toHaveBeenCalledWith("f1", { kind: "route", config: { method: "POST", path: "order-lines", who: "key" } }));
    expect((await screen.findByTestId("trigger-r1-address")).textContent).toBe("POST https://api.shop.test/v1/api/order-lines");
    expect(screen.getByTestId("trigger-r1-line").textContent).toBe("POST /order-lines · A program with an API key");
    // The path is sent when its box is left: the whole address with it.
    pick("trigger-r1-path", "orders/:id/lines");
    expect(m.saveTrigger).not.toHaveBeenCalled();
    fireEvent.blur(screen.getByTestId("trigger-r1-path"));
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "r1", { config: { method: "POST", path: "orders/:id/lines", who: "key" } }));
    await waitFor(() => expect(screen.getByTestId("trigger-r1-address").textContent).toBe("POST https://api.shop.test/v1/api/orders/:id/lines"));
    fireEvent.click(screen.getByTestId("trigger-r1-copy"));
    await waitFor(() => expect(m.copied).toEqual(["https://api.shop.test/v1/api/orders/:id/lines"]));
    pick("trigger-r1-method", "PUT");
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "r1", { config: { method: "PUT", path: "orders/:id/lines", who: "key" } }));
    pick("trigger-r1-status", "204");
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "r1", { config: { method: "PUT", path: "orders/:id/lines", who: "key", status: 204 } }));
    expect((screen.getByTestId("trigger-r1-per-minute") as HTMLInputElement).placeholder).toBe("120");
    pick("trigger-r1-per-minute", "30");
    fireEvent.blur(screen.getByTestId("trigger-r1-per-minute"));
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "r1", { config: { method: "PUT", path: "orders/:id/lines", who: "key", status: 204, perMinute: 30 } }));
    // Another caller: the limit goes back to its own.
    pick("trigger-r1-who", "public");
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "r1", { config: { method: "PUT", path: "orders/:id/lines", who: "public", status: 204 } }));
    // Answer 200 again: not kept (it is what an address answers when it doesn't say).
    pick("trigger-r1-status", "200");
    await waitFor(() => expect(m.saveTrigger).toHaveBeenLastCalledWith("f1", "r1", { config: { method: "PUT", path: "orders/:id/lines", who: "public" } }));
    // The path's parts, and the input the function doesn't take yet: one press adds it.
    expect(screen.getByTestId("trigger-r1-hint").textContent).toContain("The path's parts: id.");
    expect(screen.getByTestId("trigger-r1-route-help").textContent).toContain("answers 400 with every problem");
    fireEvent.click(screen.getByTestId("trigger-r1-add-inputs"));
    expect((screen.getByTestId("fn-input-0-name") as HTMLInputElement).value).toBe("id");
  });

  test("a refusal from the server is said in the page's words", async () => {
    m.addTrigger.mockRejectedValueOnce({ response: { status: 409, data: { error: "ROUTE_TAKEN", message: "Another address has this method and path" } } });
    setLangForTests("ar");
    show();
    await screen.findByTestId("fn-triggers");
    pick("fn-triggers-add", "route");
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled());
    expect(m.toast.error.mock.calls[0][1].description).toBe("في عنوان تاني بنفس الـ method والمسار");
  });
});

describe("An input's rules", () => {
  test("the pure parts: how many, without them, choices and bounds as typed", () => {
    const qty: FnInput = { name: "qty", type: "number", required: true, min: 1, max: 10 };
    expect([rulesCount(qty), rulesCount({ name: "x", type: "text", choices: ["S"], format: undefined }), rulesCount({ name: "x", type: "text", choices: [] })]).toEqual([2, 1, 0]);
    expect(withoutRules({ ...qty, choices: ["a"], format: "email" })).toEqual({ name: "qty", type: "number", required: true });
    expect([choicesOf(" S, M ,, L "), choicesOf(" , ")]).toEqual([["S", "M", "L"], undefined]);
    expect([boundOf(""), boundOf(" 5 "), boundOf("-2.5"), boundOf("lots")]).toEqual([undefined, 5, -2.5, undefined]);
    expect(withRules(qty, { min: undefined, max: 3 })).toEqual({ name: "qty", type: "number", required: true, max: 3 });
  });

  test("each input has a rules box: by its kind; a kind changed takes its rules away", async () => {
    server = full({ draft: { inputs: [{ name: "qty", type: "number" }, { name: "size", type: "text" }, { name: "ok", type: "bool" }], do: [] } });
    show();
    fireEvent.click(await screen.findByTestId("fn-input-0-rules-toggle"));
    pick("fn-input-0-rules-min", "1");
    fireEvent.blur(screen.getByTestId("fn-input-0-rules-min"));
    pick("fn-input-0-rules-max", "10");
    fireEvent.blur(screen.getByTestId("fn-input-0-rules-max"));
    expect(screen.getByTestId("fn-input-0-rules-toggle").textContent).toBe("Rules (2)");
    // Words: choices, or a form (one shuts the other).
    fireEvent.click(screen.getByTestId("fn-input-1-rules-toggle"));
    expect(screen.queryByTestId("fn-input-0-rules")).toBeNull();
    pick("fn-input-1-rules-choices", "S, M, L");
    fireEvent.blur(screen.getByTestId("fn-input-1-rules-choices"));
    expect((screen.getByTestId("fn-input-1-rules-format") as HTMLSelectElement).disabled).toBe(true);
    expect([...(screen.getByTestId("fn-input-1-rules-format") as HTMLSelectElement).options].map((o) => o.textContent)).toEqual(["Any words", "An email", "A phone number", "A web address (https://…)", "A day (YYYY-MM-DD)"]);
    // Yes/no: none.
    fireEvent.click(screen.getByTestId("fn-input-2-rules-toggle"));
    expect(screen.getByTestId("fn-input-2-rules-none").textContent).toContain("No rules for this kind");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(m.saveFunction).toHaveBeenCalled());
    expect(lastDraft().inputs).toEqual([{ name: "qty", type: "number", min: 1, max: 10 }, { name: "size", type: "text", choices: ["S", "M", "L"] }, { name: "ok", type: "bool" }]);
    // Another kind: the rules go with the old one.
    pick("fn-input-0-type", "text");
    fireEvent.click(screen.getByTestId("fn-save"));
    await waitFor(() => expect(lastDraft().inputs[0]).toEqual({ name: "qty", type: "text" }));
  });

  test("what isn't right, in the page's words: before publishing, and as a run says it", () => {
    expect(problemText('"qty": the least is more than the most', "en")).toBe("Input “qty”: the least is more than the most");
    expect(problemText('"size": choices or a format, not both', "ar")).toBe("المدخل «size»: يا خيارات يا شكل، مش التنين");
    expect(failText('"qty" is at least 1', "ar")).toBe("«qty» أقل شي 1");
    expect(failText('"size" is one of: S, M, L', "en")).toBe("“size” is one of: S, M, L");
    expect(failText('"email" has to be an email', "ar")).toBe("«email» لازم يكون: إيميل");
    expect(failText('"day" has to be a day (YYYY-MM-DD)', "en")).toBe("“day” has to be A day (YYYY-MM-DD)");
    expect(failText('It needs "qty"', "he")).toBe("חסר «qty»");
    expect(failText('"note" has at most 20 letters', "en")).toBe("“note” has at most 20 letters");
    expect(inputSaid("The code ran longer than 2 seconds", "en")).toBeNull();
    expect(Object.keys(INPUT_FORMAT_NAME)).toEqual(["email", "phone", "url", "date"]);
  });
});
