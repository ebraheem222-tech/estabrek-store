// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Connections } from "../../api/connections.api";

// الاتصالات والأسرار over a stand-in API: the sites functions may call, and the services' keys.
// A key's value goes to the server once and is on the page never again.

const m = vi.hoisted(() => ({ getConnections: vi.fn(), addSite: vi.fn(), removeSite: vi.fn(), addSecret: vi.fn(), saveSecret: vi.fn(), removeSecret: vi.fn(), may: new Set<string>(), toastError: vi.fn() }));
vi.mock("../../api/connections.api", () => m);
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: m.toastError, info: vi.fn() } }));

import { setLangForTests } from "../../lib/lang";
import ConnectionsPage, { refusalText, secretNameOk, siteOk, tidySecretName, tidySite } from "./ConnectionsPage";

const limits = { sites: 50, secrets: 50, value: 4000, ms: 8000, calls: 10 };
let server: Connections;
const VALUE = "123456:AAH-secret-token-value";

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
  server = { sites: [], secrets: [], limits };
  m.getConnections.mockImplementation(async () => server);
  m.addSite.mockImplementation(async (body: { host: string }) => (server = { ...server, sites: [...server.sites, { host: body.host, note: null, createdAt: "2026-11-16T10:00:00Z" }] }));
  m.removeSite.mockImplementation(async (host: string) => (server = { ...server, sites: server.sites.filter((s) => s.host !== host) }));
  // As the server answers: the name and where it goes, never the value.
  m.addSecret.mockImplementation(async (body: { name: string; value: string; sites: string[] }) => (server = { ...server, secrets: [...server.secrets, { id: `s${server.secrets.length + 1}`, name: body.name, sites: body.sites, note: null, updatedAt: "2026-11-16T10:00:00Z", lastUsedAt: null, usedBy: [] }] }));
  m.saveSecret.mockImplementation(async (id: string, body: { sites?: string[] }) => (server = { ...server, secrets: server.secrets.map((s) => (s.id === id ? { ...s, ...(body.sites ? { sites: body.sites } : {}) } : s)) }));
  m.removeSecret.mockImplementation(async (id: string) => (server = { ...server, secrets: server.secrets.filter((s) => s.id !== id) }));
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The page's own sums", () => {
  test("a site as it is typed, and whether it is one", () => {
    expect(tidySite(" https://API.Telegram.org/bot123/x?y=1 ")).toBe("api.telegram.org");
    expect(tidySite("*.Example.com.")).toBe("*.example.com");
    expect(["api.telegram.org", "*.example.com", "a-b.c.co"].map(siteOk)).toEqual([true, true, true]);
    expect(["localhost", "10.0.0.1", "api.x.com:8443", "*.com", "", "a b.com", "api_x.com"].map(siteOk)).toEqual([false, false, false, false, false, false, false]);
  });

  test("a secret's name as it is typed; why the server refused, in the page's words", () => {
    expect(tidySecretName(" telegram token ")).toBe("TELEGRAM_TOKEN");
    expect(tidySecretName("_my-key.v2")).toBe("MY_KEY_V2");
    expect(["TELEGRAM_TOKEN", "A1"].map(secretNameOk)).toEqual([true, true]);
    expect(["A", "1KEY", "", "telegram"].map(secretNameOk)).toEqual([false, false, false, false]);
    expect(refusalText({ response: { data: { error: "SECRET_USED", details: { functions: ["Send", "Notify"] } } } })).toBe("Functions use it: Send، Notify");
    expect(refusalText({ response: { data: { error: "SECRET_TAKEN" } } })).toContain("A secret has this name already");
    expect(refusalText({ response: { data: { error: "SITE_INVALID" } } })).toContain("api.example.com");
  });
});

describe("The sites and the secrets", () => {
  test("a site is allowed by its name; a secret needs a site to go to", async () => {
    show();
    await screen.findByTestId("connections-page");
    expect(screen.getByTestId("sites-empty").textContent).toContain("functions call nowhere");
    expect(screen.getByTestId("secret-needs-site")).toBeTruthy();
    expect(screen.queryByTestId("secret-form")).toBeNull();
    // Not a name: said, and not sent.
    type("site-new", "10.0.0.1");
    expect(screen.getByTestId("site-new-bad")).toBeTruthy();
    expect((screen.getByTestId("site-add") as HTMLButtonElement).disabled).toBe(true);
    // Pasted as an address: only its name is kept.
    type("site-new", "https://API.telegram.org/bot123/sendMessage");
    fireEvent.click(screen.getByTestId("site-add"));
    await waitFor(() => expect(m.addSite).toHaveBeenCalledWith({ host: "api.telegram.org" }));
    expect(await screen.findByTestId("site-api.telegram.org")).toBeTruthy();
    expect(screen.getByTestId("secret-form")).toBeTruthy();
  });

  test("a secret is written once with where it goes; after that only its name is on the page", async () => {
    server = { ...server, sites: [{ host: "api.telegram.org", note: null, createdAt: "" }, { host: "*.example.com", note: null, createdAt: "" }] };
    show();
    await screen.findByTestId("secret-form");
    type("secret-new-name", "telegram token");
    expect(screen.getByTestId("secret-new-as").textContent).toContain("TELEGRAM_TOKEN");
    type("secret-new-value", VALUE);
    // Its box hides what is typed, and the browser isn't asked to remember it.
    expect(screen.getByTestId("secret-new-value").getAttribute("type")).toBe("password");
    expect(screen.getByTestId("secret-new-value").getAttribute("autocomplete")).toBe("new-password");
    // Nowhere to go yet: not kept.
    expect((screen.getByTestId("secret-add") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("secret-new-sites-api.telegram.org"));
    fireEvent.click(screen.getByTestId("secret-add"));
    await waitFor(() => expect(m.addSecret).toHaveBeenCalledWith({ name: "TELEGRAM_TOKEN", value: VALUE, sites: ["api.telegram.org"] }));
    const row = await screen.findByTestId("secret-TELEGRAM_TOKEN");
    expect(row.textContent).toContain("It goes only to: api.telegram.org");
    expect(screen.getByTestId("secret-TELEGRAM_TOKEN-used").textContent).toBe("No function uses it yet · Never sent");
    // The value is gone from the page: the form is empty again, and nothing shows it.
    expect((screen.getByTestId("secret-new-value") as HTMLInputElement).value).toBe("");
    expect(document.body.textContent).not.toContain(VALUE);
    expect([...document.querySelectorAll("input")].some((i) => i.value === VALUE)).toBe(false);
  });

  test("its value is replaced without being shown, its sites changed; one a function uses isn't deleted", async () => {
    server = {
      sites: [{ host: "api.telegram.org", note: null, createdAt: "" }, { host: "hooks.example.com", note: null, createdAt: "" }],
      secrets: [{ id: "s1", name: "TELEGRAM_TOKEN", sites: ["api.telegram.org"], note: null, updatedAt: "2026-11-16T10:00:00Z", lastUsedAt: "2026-11-16T12:00:00Z", usedBy: ["Send a message"] }],
      limits,
    };
    show();
    await screen.findByTestId("secret-TELEGRAM_TOKEN");
    expect(screen.getByTestId("secret-TELEGRAM_TOKEN-used").textContent).toContain("Used by: Send a message · Last sent:");
    fireEvent.click(screen.getByTestId("secret-TELEGRAM_TOKEN-edit"));
    // The kept value isn't on the page: its box is empty.
    expect((screen.getByTestId("secret-TELEGRAM_TOKEN-value") as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByTestId("secret-TELEGRAM_TOKEN-sites-hooks.example.com"));
    fireEvent.click(screen.getByTestId("secret-TELEGRAM_TOKEN-save"));
    // No new value typed: only the sites are sent.
    await waitFor(() => expect(m.saveSecret).toHaveBeenCalledWith("s1", { sites: ["api.telegram.org", "hooks.example.com"] }));
    fireEvent.click(screen.getByTestId("secret-TELEGRAM_TOKEN-edit"));
    type("secret-TELEGRAM_TOKEN-value", "a-new-value");
    fireEvent.click(screen.getByTestId("secret-TELEGRAM_TOKEN-save"));
    await waitFor(() => expect(m.saveSecret).toHaveBeenLastCalledWith("s1", { value: "a-new-value", sites: ["api.telegram.org", "hooks.example.com"] }));
    expect(document.body.textContent).not.toContain("a-new-value");
    // Deleting asks first; the server refuses while a function names it, and the page says which.
    m.removeSecret.mockRejectedValueOnce({ response: { status: 409, data: { error: "SECRET_USED", details: { functions: ["Send a message"] } } } });
    fireEvent.click(screen.getByTestId("secret-TELEGRAM_TOKEN-remove"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete it" }));
    await waitFor(() => expect(m.toastError).toHaveBeenCalledWith("It didn't work", { description: "Functions use it: Send a message" }));
    expect(screen.getByTestId("secret-TELEGRAM_TOKEN")).toBeTruthy();
  });

  test("a site is taken out after asking; a member who can only look changes nothing", async () => {
    server = { sites: [{ host: "api.telegram.org", note: null, createdAt: "" }], secrets: [{ id: "s1", name: "A_KEY", sites: ["api.telegram.org"], note: null, updatedAt: "", lastUsedAt: null, usedBy: [] }], limits };
    show();
    fireEvent.click(await screen.findByTestId("site-api.telegram.org-remove"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Take it out" }));
    await waitFor(() => expect(m.removeSite).toHaveBeenCalledWith("api.telegram.org"));
    // The secret still says where it was for (so it can be unticked), though the site is gone.
    await waitFor(() => expect(screen.queryByTestId("site-api.telegram.org")).toBeNull());
    expect(screen.getByTestId("secret-A_KEY").textContent).toContain("api.telegram.org");

    cleanup();
    m.may = new Set(["connections:read"]);
    server = { ...server, sites: [{ host: "api.telegram.org", note: null, createdAt: "" }] };
    show();
    await screen.findByTestId("site-api.telegram.org");
    expect(screen.queryByTestId("site-add")).toBeNull();
    expect(screen.queryByTestId("site-api.telegram.org-remove")).toBeNull();
    expect(screen.queryByTestId("secret-form")).toBeNull();
    expect(screen.queryByTestId("secret-A_KEY-edit")).toBeNull();
  });
});
