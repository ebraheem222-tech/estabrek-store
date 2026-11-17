// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Connections, ReadyKind } from "../../api/connections.api";

// A generic API ("another system") as a ready connection, on the page: its base address is needed,
// how the key is sent is picked from a list, a header's name is asked only when the key goes in one,
// and the words of its settings, its ways of asking, and its refusals. The server's part is tested
// with the database.

const m = vi.hoisted(() => ({ getConnections: vi.fn(), addReady: vi.fn(), saveReady: vi.fn(), removeReady: vi.fn(), tryReady: vi.fn(), addSite: vi.fn(), removeSite: vi.fn(), addSecret: vi.fn(), saveSecret: vi.fn(), removeSecret: vi.fn(), may: new Set<string>(), toastError: vi.fn() }));
vi.mock("../../api/connections.api", () => m);
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: m.toastError, info: vi.fn() } }));

import { setLangForTests } from "../../lib/lang";
import ConnectionsPage, { refusalText } from "./ConnectionsPage";
import { actionName, choiceName, fieldName, keyName, kindHow, kindName, settingName } from "./readyText";
import { failText, stepLine } from "../functions/fnText";

// As the server says it (backend lib/fnKinds.ts).
const api: ReadyKind = {
  kind: "api",
  label: "API",
  host: "",
  settings: [
    { id: "base", max: 300, required: true },
    { id: "auth", max: 10, choices: ["bearer", "header", "basic"] },
    { id: "header", max: 60, shownWhen: ["auth", "header"] },
    { id: "check", max: 200 },
  ],
  actions: ["get", "post", "put", "patch", "delete"].map((id) => ({ id, fields: [{ id: "path", required: true, long: false }, ...(id === "get" || id === "delete" ? [] : [{ id: "body", required: false, long: true }])] })),
  test: { sends: false },
};
const slack: ReadyKind = { kind: "slack", label: "Slack", host: "hooks.slack.com", settings: [], actions: [{ id: "message", fields: [{ id: "text", required: true, long: true }] }], test: { sends: true } };
// Made up, and not in the shape of any real service's key.
const KEY = "made-up-erp-key-for-a-test";
let server: Connections;

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ConnectionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const type = (testid: string, value: string) => fireEvent.change(screen.getByTestId(testid), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["connections:read", "connections:write"]);
  server = { sites: [], secrets: [], ready: [], kinds: [slack, api], limits: { sites: 50, secrets: 50, value: 4000, ms: 8000, calls: 10, ready: 20 } };
  m.getConnections.mockImplementation(async () => server);
  m.addReady.mockImplementation(async (body: { kind: string; name: string; key: string; settings?: Record<string, string> }) => {
    server = { ...server, ready: [...(server.ready ?? []), { id: "a1", kind: body.kind, name: body.name, settings: body.settings ?? {}, updatedAt: "2026-11-17T10:00:00Z", lastUsedAt: null, usedBy: [] }] };
    return server;
  });
  m.tryReady.mockResolvedValue({ ok: true, status: 200, said: "Estabrek ERP", why: null, sends: false });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("Another system's words", () => {
  test("the kind, its key, its settings and choices, its ways of asking and what they ask for, in the three languages", () => {
    expect([kindName("api"), keyName("api")]).toEqual(["Another system (API)", "The API key"]);
    expect(["base", "auth", "header", "check"].map((s) => settingName("api", s))).toEqual(["The base address", "How the key is sent", "The header's name", "A path to try"]);
    expect(["bearer", "header", "basic"].map((c) => choiceName("api", "auth", c))).toEqual(["Authorization: Bearer <the key>", "In a header of yours (like X-API-Key)", "A name and password (Basic)"]);
    expect(choiceName("api", "auth", "oauth")).toBe("oauth");
    expect(["get", "post", "put", "patch", "delete"].map((a) => actionName("api", a))).toEqual(["Fetch (GET)", "Send something new (POST)", "Replace (PUT)", "Change (PATCH)", "Delete (DELETE)"]);
    expect([fieldName("api", "path"), fieldName("api", "body")]).toEqual(["The path after the base address (like /orders)", "What is sent (a line a field, name: value; or JSON)"]);
    expect(kindHow("api")).toContain("https");
    setLangForTests("ar");
    expect([kindName("api"), actionName("api", "post"), choiceName("api", "auth", "basic")]).toEqual(["نظام تاني (API)", "ابعت جديد (POST)", "اسم وكلمة سر (Basic)"]);
    setLangForTests("he");
    expect(settingName("api", "base")).toBe("הכתובת הבסיסית");
  });

  test("a setting refused is said by its name; a step's problems and the system's no, in the page's words", () => {
    const refused = (message: string, at: string) => refusalText({ response: { data: { error: "SETTING_INVALID", message, details: { at } } } });
    expect(refused("The base address is needed", "settings.base")).toBe("The system's base address is needed (like https://erp.example.com/api)");
    expect(refused("The base address is https://…", "settings.base")).toContain("with no ?, # or port");
    expect(refused("A header's name…", "settings.header")).toContain("X-API-Key");
    expect(refused("The path to try…", "settings.check")).toContain("/me");
    // A setting the page has no words for: the general ones, as before.
    expect(refusalText({ response: { data: { error: "SETTING_INVALID", message: "A setting is a short plain value", details: { at: "settings" } } } })).toContain("short plain value");
    expect(failText("The path is empty", "en")).toBe("There is no path (like /orders)");
    expect(failText("The path comes after the base address: /orders, not a whole address", "ar")).toContain("مش عنوان كامل");
    expect(failText("Each line of what is sent is name: value", "ar")).toBe("كل سطر باللي بينبعت: اسم: قيمة");
    expect(failText('What is sent isn\'t JSON (a run\'s name in it goes in quotes: "{{input.total}}")', "en")).toContain("a line a field");
    expect(failText('"ERP" has no address', "en")).toBe("“ERP” has no address: give it one in the connection");
    expect(failText('API "ERP" answered 404: Order not found', "ar")).toBe("«ERP» (API) جاوب 404: Order not found");
    const ctx = { tables: [], fns: [], outside: { ready: [{ id: "a1", name: "ERP", kind: "api", set: ["base"] }] } } as never;
    expect(stepLine({ act: "ready", via: "a1", what: "post", give: { path: "/orders", body: "total: {{input.total}}" }, as: "made" }, ctx, "en")).toBe("ERP · /orders ← made");
  });
});

describe("Connecting another system", () => {
  test("its base address is needed; how the key is sent is a choice; the header's name is asked only for a header", async () => {
    show();
    fireEvent.click(await screen.findByTestId("ready-new-kind-api"));
    expect(screen.getByTestId("ready-new-how").textContent).toContain("base address");
    // A typed key (not a file); the base marked as needed.
    expect((screen.getByTestId("ready-new-key") as HTMLInputElement).type).toBe("password");
    expect(screen.getByTestId("ready-new-setting-base").closest("label")?.textContent).toContain("The base address *");
    // The choice starts at the first one; no header's name is asked for it.
    const auth = screen.getByTestId("ready-new-setting-auth") as HTMLSelectElement;
    expect([auth.tagName, auth.value, [...auth.options].map((o) => o.textContent)]).toEqual(["SELECT", "bearer", ["Authorization: Bearer <the key>", "In a header of yours (like X-API-Key)", "A name and password (Basic)"]]);
    expect(screen.queryByTestId("ready-new-setting-header")).toBeNull();
    fireEvent.change(auth, { target: { value: "header" } });
    expect(screen.getByTestId("ready-new-setting-header")).toBeTruthy();
    fireEvent.change(auth, { target: { value: "basic" } });
    expect(screen.queryByTestId("ready-new-setting-header")).toBeNull();
    fireEvent.change(auth, { target: { value: "header" } });
    // Nothing is sent without its base.
    type("ready-new-name", "ERP");
    type("ready-new-key", KEY);
    type("ready-new-setting-header", "X-API-Key");
    expect((screen.getByTestId("ready-add") as HTMLButtonElement).disabled).toBe(true);
    type("ready-new-setting-base", "https://erp.example.test/api");
    type("ready-new-setting-check", "/me");
    expect((screen.getByTestId("ready-add") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId("ready-add"));
    await waitFor(() => expect(m.addReady).toHaveBeenCalledWith({ kind: "api", name: "ERP", key: KEY, settings: { auth: "header", header: "X-API-Key", base: "https://erp.example.test/api", check: "/me" } }));
    // Made: its settings, and a try.
    const row = await screen.findByTestId("ready-a1");
    expect(row.textContent).toContain("The base address: https://erp.example.test/api");
    // A choice by its name, not as it is kept.
    expect(row.textContent).toContain("How the key is sent: In a header of yours (like X-API-Key)");
    expect(row.textContent).not.toContain(KEY);
    fireEvent.click(screen.getByTestId("ready-a1-try"));
    expect((await screen.findByTestId("ready-a1-tried")).textContent).toBe("It works: Estabrek ERP");
  });

  test("a setting the server refuses is said by its name, and what was typed stays", async () => {
    m.addReady.mockRejectedValueOnce({ response: { status: 400, data: { error: "SETTING_INVALID", message: "The base address is https://…", details: { at: "settings.base" } } } });
    show();
    fireEvent.click(await screen.findByTestId("ready-new-kind-api"));
    type("ready-new-name", "ERP");
    type("ready-new-key", KEY);
    type("ready-new-setting-base", "https://erp.example.test:8069");
    fireEvent.click(screen.getByTestId("ready-add"));
    await waitFor(() => expect(m.toastError).toHaveBeenCalledTimes(1));
    expect(m.toastError.mock.calls[0][1].description).toContain("with no ?, # or port");
    expect((screen.getByTestId("ready-new-setting-base") as HTMLInputElement).value).toBe("https://erp.example.test:8069");
  });
});
