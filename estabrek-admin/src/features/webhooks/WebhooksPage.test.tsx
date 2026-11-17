// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Delivery, Endpoint, Webhooks } from "../../api/webhooks.api";

// Webhooks طالعة over a stand-in API: the page's words, an endpoint made (its secret on screen
// once), tried, changed, switched off and deleted, and its delivery log read and sent again.
// The server's part (signing, sending, trying again) is tested with the database.

const m = vi.hoisted(() => ({
  may: new Set<string>(),
  getWebhooks: vi.fn(),
  addEndpoint: vi.fn(),
  changeEndpoint: vi.fn(),
  renewSecret: vi.fn(),
  removeEndpoint: vi.fn(),
  pingEndpoint: vi.fn(),
  getDeliveries: vi.fn(),
  getDelivery: vi.fn(),
  resendDelivery: vi.fn(),
  toastOk: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("../../api/webhooks.api", () => m);
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: m.toastOk, error: m.toastError, info: vi.fn() } }));

import { setLangForTests } from "../../lib/lang";
import WebhooksPage from "./WebhooksPage";
import { EVENT_NAME, STATE_NAME, VERIFY_SNIPPET, deliveryState, errorText, eventName, refusalText, stateOf, tablesText, totalWait, urlProblem, waitText } from "./webhookText";

const en = (words: string | null) => (words ?? "").split("|")[1];
const limits: Webhooks["limits"] = { endpoints: 20, tables: 50, name: 60, url: 500, tries: 8, pauseAfter: 10, keepDays: 14, freshSeconds: 300, waits: [30, 120, 480, 1920, 7680, 21600, 21600] };
const events: Webhooks["events"] = { rows: ["row.added", "row.changed", "row.deleted"], store: ["order.created", "stock.low", "video.ready", "product.viral", "job.failing", "deploy.failed"], ping: "ping" };
const tables: Webhooks["tables"] = [{ id: "t1", slug: "notes", name: { en: "Notes" } }, { id: "t2", slug: "plans", name: { en: "Plans" } }];
// Made up, and not in the shape of any real key.
const SECRET = "whsec_made-up-for-the-test";
const endpoint = (over: Partial<Endpoint> = {}): Endpoint => ({ id: "e1", name: "Accounts", url: "https://hooks.example.test/in", events: ["row.added", "order.created"], tables: ["t1"], hint: "test", enabled: true, failures: 0, pausedAt: null, lastOkAt: null, lastErrorAt: null, lastError: null, createdAt: "2026-11-17T10:00:00Z", waiting: 0, ...over });
const delivery = (over: Partial<Delivery> = {}): Delivery => ({ id: "d1", event: "row.added", eventId: "evt_1", status: "sent", attempts: 1, code: 200, error: null, ms: 41, nextAt: null, createdAt: "2026-11-17T10:05:00Z", finishedAt: "2026-11-17T10:05:00Z", ...over });
let server: Webhooks;

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const type = (testid: string, value: string) => fireEvent.change(screen.getByTestId(testid), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["connections:read", "connections:write"]);
  server = { endpoints: [], events, tables, limits };
  m.getWebhooks.mockImplementation(async () => server);
  // As the server answers: the endpoint, and its secret this once.
  m.addEndpoint.mockImplementation(async (body: { name: string; url: string; events: string[]; tables: string[] }) => {
    const made = endpoint({ id: `e${server.endpoints.length + 1}`, ...body });
    server = { ...server, endpoints: [...server.endpoints, made] };
    return { endpoint: made, secret: SECRET };
  });
  m.changeEndpoint.mockImplementation(async (id: string, body: Partial<Endpoint>) => {
    server = { ...server, endpoints: server.endpoints.map((e) => (e.id === id ? { ...e, ...body, ...(body.enabled ? { failures: 0, pausedAt: null } : {}) } : e)) };
    return { endpoint: server.endpoints.find((e) => e.id === id)! };
  });
  m.renewSecret.mockImplementation(async (id: string) => ({ endpoint: server.endpoints.find((e) => e.id === id)!, secret: `${SECRET}-renewed` }));
  m.removeEndpoint.mockImplementation(async (id: string) => {
    server = { ...server, endpoints: server.endpoints.filter((e) => e.id !== id) };
  });
  m.pingEndpoint.mockResolvedValue({ ok: true, code: 200, ms: 37, error: null, delivery: "d9" });
  m.getDeliveries.mockResolvedValue({ deliveries: [], next: null });
  m.resendDelivery.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The page's words", () => {
  test("every event and state has a name in the three languages; one the page doesn't know is shown as it is", () => {
    for (const id of [...events.rows, ...events.store, events.ping]) expect([id, EVENT_NAME[id]?.split("|").filter(Boolean).length]).toEqual([id, 3]);
    expect(en(eventName("order.created"))).toBe("A new order");
    expect(en(eventName("gift.sent"))).toBe("gift.sent");
    expect([stateOf({ enabled: true, pausedAt: null }), stateOf({ enabled: false, pausedAt: null }), stateOf({ enabled: false, pausedAt: "2026-11-17T10:00:00Z" })]).toEqual(["on", "off", "paused"]);
    for (const s of ["on", "off", "paused"] as const) expect(STATE_NAME[s].split("|")).toHaveLength(3);
    expect([en(deliveryState({ status: "sent", attempts: 1 })), en(deliveryState({ status: "failed", attempts: 8 })), en(deliveryState({ status: "waiting", attempts: 0 })), en(deliveryState({ status: "waiting", attempts: 2 }))]).toEqual(["Sent", "Failed", "Queued", "Waiting for another try"]);
  });

  test("why a delivery wasn't taken, and why an endpoint wasn't saved", () => {
    expect(errorText("It answered 500: boom try later", "en")).toBe("The address answered 500: boom try later");
    expect(errorText("It answered 410", "ar")).toBe("العنوان جاوب 410");
    expect(errorText('"hooks.example.test" didn\'t answer in time', "en")).toBe("“hooks.example.test” didn't answer in time");
    expect(errorText('"x.example.test" points inside the network: it isn\'t called', "en")).toContain("points inside the network");
    expect(errorText('No site is found at "x.example.test"', "en")).toBe("No site is found at “x.example.test”");
    expect(errorText('"x.example.test" couldn\'t be reached', "en")).toBe("“x.example.test” couldn't be reached");
    expect(errorText("The endpoint was switched off before this was sent", "en")).toContain("switched off");
    expect(errorText("More than 1000 deliveries are waiting: new events aren't queued until it catches up", "en")).toContain("More than 1000");
    expect(errorText("Something new", "en")).toBe("Something new");
    expect(errorText(null, "en")).toBe("");
    const refused = (data: unknown) => en(refusalText({ response: { data } }, "fallback|fallback|fallback"));
    expect(refused({ error: "VALIDATION_ERROR", details: { issues: [{ path: "url", message: "A site is called by its name" }] } })).toBe("An address is a site's name (not an IP number, not localhost)");
    expect(refused({ error: "TOO_MANY" })).toBe("That is as many endpoints as there can be");
    expect(refused({ error: "ENDPOINT_OFF" })).toContain("switch it on first");
    // One the page has no words for: the server's own.
    expect(refusalText({ response: { data: { error: "VALIDATION_ERROR", details: { issues: [{ message: "Something else" }] } } } }, "fallback")).toBe("Something else");
    expect(refusalText(new Error("x"), "The fallback")).toBe("The fallback");
  });

  test("an address is checked as it is typed; waits are said in words", () => {
    expect(urlProblem("")).toBeNull();
    expect(urlProblem(" https://hooks.example.test/in?x=1 ")).toBeNull();
    expect(en(urlProblem("http://hooks.example.test/in"))).toBe("The address starts with https://");
    expect(en(urlProblem("hooks.example.test/in"))).toBe("The address starts with https://");
    expect(en(urlProblem("https://10.0.0.5/in"))).toContain("site's name");
    expect(en(urlProblem("https://localhost/in"))).toContain("site's name");
    expect(en(urlProblem("https://[::1]/in"))).toContain("site's name");
    expect(en(urlProblem("https://hooks.example.test:8443/in"))).toContain("standard https port");
    expect(en(urlProblem("https://me:pw@hooks.example.test/in"))).toContain("name and password");
    expect(en(urlProblem("https://hooks.example.test/a b"))).toContain("no spaces or braces");
    expect(en(urlProblem("https://hooks.example.test/{{x}}"))).toContain("no spaces or braces");
    expect([waitText(30, "en"), waitText(480, "en"), waitText(7680, "en"), waitText(21600, "he")]).toEqual(["30 seconds", "8 minutes", "2.1 hours", "6 שעות"]);
    // Arabic counts: one, two, a few, many.
    expect([30, 120, 480, 1920, 7680, 21600, 3600, 60].map((s) => waitText(s, "ar"))).toEqual(["30 ثانية", "دقيقتين", "8 دقايق", "32 دقيقة", "2.1 ساعة", "6 ساعات", "ساعة", "دقيقة"]);
    expect(waitText(totalWait(limits.waits), "en")).toBe("14.8 hours");
    const names = new Map([["t1", "Notes"]]);
    expect(tablesText({ events: ["row.added"], tables: [] }, names, "en")).toBe("Every table of yours");
    expect(tablesText({ events: ["row.added"], tables: ["t1", "gone"] }, names, "en")).toBe("Notes, a deleted table");
    expect(tablesText({ events: ["order.created"], tables: ["t1"] }, names, "en")).toBe("");
    // What a receiver is handed: the three headers and the same HMAC.
    for (const piece of ["webhook-id", "webhook-timestamp", "webhook-signature", 'createHmac("sha256"', "timingSafeEqual", '"v1,"']) expect(VERIFY_SNIPPET).toContain(piece);
  });
});

describe("The page", () => {
  test("an endpoint is made: its events and tables chosen, its secret on screen once", async () => {
    show();
    expect(await screen.findByTestId("endpoints-empty")).toBeTruthy();
    const save = screen.getByTestId("new-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    type("new-name", " Accounts ");
    type("new-url", "http://hooks.example.test/in");
    expect(screen.getByTestId("new-url-problem").textContent).toBe("The address starts with https://");
    type("new-url", "https://hooks.example.test/in");
    expect(screen.queryByTestId("new-url-problem")).toBeNull();
    // No event yet: nothing to save. A row event asks which tables.
    expect(save.disabled).toBe(true);
    expect(screen.queryByTestId("new-tables")).toBeNull();
    fireEvent.click(screen.getByTestId("new-event-row.added"));
    fireEvent.click(screen.getByTestId("new-event-order.created"));
    expect(screen.getByTestId("new-tables")).toBeTruthy();
    expect(save.disabled).toBe(false);
    // Chosen tables: at least one.
    fireEvent.click(screen.getByTestId("new-tables-some"));
    expect(save.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("new-table-notes"));
    fireEvent.click(save);
    await waitFor(() => expect(m.addEndpoint).toHaveBeenCalledWith({ name: "Accounts", url: "https://hooks.example.test/in", events: ["row.added", "order.created"], tables: ["t1"] }));
    // The secret, this once; the form is empty again; the endpoint is in the list.
    expect(((await screen.findByTestId("secret-value")) as HTMLInputElement).value).toBe(SECRET);
    expect(screen.getByTestId("secret-box").textContent).toContain("the only time it is shown");
    expect((screen.getByTestId("new-name") as HTMLInputElement).value).toBe("");
    const card = await screen.findByTestId("endpoint-e1");
    expect(card.getAttribute("data-state")).toBe("on");
    expect(card.textContent).toContain("A row was added");
    expect(card.textContent).toContain("A new order");
    expect(card.textContent).toContain("Tables: Notes");
    expect(card.textContent).toContain("…test");
    expect(card.textContent).not.toContain(SECRET);
    fireEvent.click(screen.getByTestId("secret-done"));
    expect(screen.queryByTestId("secret-box")).toBeNull();
    expect(document.body.textContent).not.toContain(SECRET);
    // What a receiver needs is on the page.
    expect(screen.getByTestId("how-retries").textContent).toBe("Tries: 8. The waits between them: 30 seconds, 2 minutes, 8 minutes, 32 minutes, 2.1 hours, 6 hours, 6 hours (about 14.8 hours).");
    expect(screen.getByTestId("verify-snippet").textContent).toContain("webhook-signature");
  });

  test("it is tried, changed, switched off, given a new secret and deleted", async () => {
    server = { ...server, endpoints: [endpoint()] };
    show();
    // A try: said, and the log opens.
    fireEvent.click(await screen.findByTestId("ping-e1"));
    await waitFor(() => expect(m.pingEndpoint).toHaveBeenCalledWith("e1"));
    await waitFor(() => expect(m.toastOk).toHaveBeenCalledWith("The test arrived", { description: "200 · 37 ms" }));
    expect(await screen.findByTestId("log-e1")).toBeTruthy();
    m.pingEndpoint.mockResolvedValueOnce({ ok: false, code: 401, ms: 12, error: "It answered 401: bad signature", delivery: "d10" });
    fireEvent.click(screen.getByTestId("ping-e1"));
    await waitFor(() => expect(m.toastError).toHaveBeenCalledWith("The test didn't arrive", { description: "The address answered 401: bad signature" }));
    // Changed: the form starts with what it has.
    fireEvent.click(screen.getByTestId("edit-e1"));
    expect((screen.getByTestId("edit-name") as HTMLInputElement).value).toBe("Accounts");
    expect((screen.getByTestId("edit-event-order.created") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId("edit-table-notes") as HTMLInputElement).checked).toBe(true);
    type("edit-name", "Accounts 2");
    fireEvent.click(screen.getByTestId("edit-tables-all"));
    fireEvent.click(screen.getByTestId("edit-save"));
    await waitFor(() => expect(m.changeEndpoint).toHaveBeenCalledWith("e1", { name: "Accounts 2", url: "https://hooks.example.test/in", events: ["row.added", "order.created"], tables: [] }));
    await waitFor(() => expect(screen.getByTestId("endpoint-e1").textContent).toContain("Tables: Every table of yours"));
    // Off and on.
    fireEvent.click(screen.getByTestId("toggle-e1"));
    await waitFor(() => expect(screen.getByTestId("endpoint-e1").getAttribute("data-state")).toBe("off"));
    expect(m.changeEndpoint).toHaveBeenLastCalledWith("e1", { enabled: false });
    fireEvent.click(screen.getByTestId("toggle-e1"));
    await waitFor(() => expect(screen.getByTestId("endpoint-e1").getAttribute("data-state")).toBe("on"));
    // A new secret: asked first (the old one stops at once), then on screen once.
    fireEvent.click(screen.getByTestId("renew-e1"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Renew the secret" }));
    expect(((await screen.findByTestId("secret-value")) as HTMLInputElement).value).toBe(`${SECRET}-renewed`);
    // Deleted: asked first.
    fireEvent.click(screen.getByTestId("remove-e1"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(m.removeEndpoint).toHaveBeenCalledWith("e1"));
    expect(await screen.findByTestId("endpoints-empty")).toBeTruthy();
  });

  test("one the server paused says why, and is switched on again; a refusal is said in the page's words", async () => {
    server = { ...server, endpoints: [endpoint({ enabled: false, pausedAt: "2026-11-17T12:00:00Z", failures: 10, lastErrorAt: "2026-11-17T12:00:00Z", lastError: "It answered 503", waiting: 3 })] };
    show();
    const card = await screen.findByTestId("endpoint-e1");
    expect(card.getAttribute("data-state")).toBe("paused");
    expect(screen.getByTestId("state-e1").textContent).toBe("Paused (it kept failing)");
    expect(screen.getByTestId("error-e1").textContent).toContain("The address answered 503");
    expect(card.textContent).toContain("10 deliveries in a row failed for good");
    expect(card.textContent).toContain("3 waiting");
    fireEvent.click(screen.getByTestId("toggle-e1"));
    await waitFor(() => expect(m.changeEndpoint).toHaveBeenCalledWith("e1", { enabled: true }));
    await waitFor(() => expect(screen.getByTestId("endpoint-e1").getAttribute("data-state")).toBe("on"));
    // The server refuses an address: said as the page says it.
    m.addEndpoint.mockRejectedValueOnce({ response: { data: { error: "VALIDATION_ERROR", details: { issues: [{ path: "url", message: "A site is called by its name" }] } } } });
    type("new-name", "Other");
    type("new-url", "https://intranet.example.test/in");
    fireEvent.click(screen.getByTestId("new-event-stock.low"));
    fireEvent.click(screen.getByTestId("new-save"));
    await waitFor(() => expect(m.toastError).toHaveBeenCalledWith("An address is a site's name (not an IP number, not localhost)"));
    expect(screen.queryByTestId("secret-box")).toBeNull();
  });

  test("the log: how each delivery went, what was sent, older ones, and one sent again", async () => {
    server = { ...server, endpoints: [endpoint()] };
    m.getDeliveries.mockImplementation(async (_id: string, before?: string | null) =>
      before
        ? { deliveries: [delivery({ id: "d0", event: "ping", createdAt: "2026-11-16T10:00:00Z" })], next: null }
        : {
            deliveries: [
              delivery({ id: "d3", status: "waiting", attempts: 2, code: 500, error: "It answered 500: boom", nextAt: "2026-11-17T10:20:00Z", finishedAt: null }),
              delivery({ id: "d2", event: "order.created", status: "failed", attempts: 8, code: null, ms: 8000, error: '"hooks.example.test" didn\'t answer in time' }),
              delivery({ id: "d1" }),
            ],
            next: "2026-11-17T10:05:00Z",
          },
    );
    m.getDelivery.mockResolvedValue({ ...delivery({ id: "d2" }), body: '{"id":"evt_2","event":"order.created","data":{"total":240}}' });
    show();
    fireEvent.click(await screen.findByTestId("log-open-e1"));
    const waiting = await screen.findByTestId("delivery-d3");
    expect(waiting.getAttribute("data-status")).toBe("waiting");
    expect(waiting.textContent).toContain("Waiting for another try");
    expect(waiting.textContent).toContain("The address answered 500: boom");
    expect(waiting.textContent).toContain("Next try");
    expect(screen.getByTestId("delivery-d2").textContent).toContain("A new order");
    expect(screen.getByTestId("delivery-d2").textContent).toContain("“hooks.example.test” didn't answer in time");
    expect(screen.getByTestId("delivery-d1").textContent).toContain("200 · 41 ms");
    // One still waiting isn't sent again by hand; the others are.
    expect(screen.queryByTestId("delivery-resend-d3")).toBeNull();
    // What was sent, set out to read.
    fireEvent.click(screen.getByTestId("delivery-body-d2"));
    expect((await screen.findByTestId("delivery-sent")).textContent).toContain('"total": 240');
    expect(m.getDelivery).toHaveBeenCalledWith("e1", "d2");
    fireEvent.click(screen.getByTestId("delivery-body-d2"));
    expect(screen.queryByTestId("delivery-sent")).toBeNull();
    // Older ones.
    fireEvent.click(screen.getByTestId("log-more-e1"));
    expect(await screen.findByTestId("delivery-d0")).toBeTruthy();
    expect(m.getDeliveries).toHaveBeenLastCalledWith("e1", "2026-11-17T10:05:00Z");
    expect(screen.queryByTestId("log-more-e1")).toBeNull();
    // Sent again.
    fireEvent.click(screen.getByTestId("delivery-resend-d2"));
    await waitFor(() => expect(m.resendDelivery).toHaveBeenCalledWith("e1", "d2"));
    await waitFor(() => expect(m.toastOk).toHaveBeenCalledWith("Back in the queue: it is being sent"));
    // Nothing sent yet: said.
    m.getDeliveries.mockResolvedValue({ deliveries: [], next: null });
    fireEvent.click(screen.getByTestId("log-refresh-e1"));
    expect(await screen.findByTestId("log-empty-e1")).toBeTruthy();
  });

  test("who may only look: the endpoints and their logs, nothing to change", async () => {
    m.may = new Set(["connections:read"]);
    server = { ...server, endpoints: [endpoint()] };
    m.getDeliveries.mockResolvedValue({ deliveries: [delivery({ id: "d2", status: "failed" })], next: null });
    show();
    await screen.findByTestId("endpoint-e1");
    for (const id of ["ping-e1", "edit-e1", "toggle-e1", "renew-e1", "remove-e1", "new"]) expect([id, screen.queryByTestId(id)]).toEqual([id, null]);
    fireEvent.click(screen.getByTestId("log-open-e1"));
    await screen.findByTestId("delivery-d2");
    expect(screen.queryByTestId("delivery-resend-d2")).toBeNull();
    expect(screen.getByTestId("delivery-body-d2")).toBeTruthy();
  });
});
