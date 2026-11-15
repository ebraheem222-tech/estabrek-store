// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ApiKey, ApiPage as Page, ApiTable, TableAccess } from "../../api/dataApi.api";

// الـ API والمفاتيح: the page over a stand-in API. Tables are opened act by act, a new key is
// shown once, and what the member may not change is not offered.

const m = vi.hoisted(() => ({ page: null as unknown, may: new Set<string>(), getApi: vi.fn(), getDocs: vi.fn(), setAccess: vi.fn(), createKey: vi.fn(), updateKey: vi.fn(), revokeKey: vi.fn(), deleteKey: vi.fn(), copied: [] as string[] }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../api/dataApi.api", () => ({ getApi: m.getApi, getDocs: m.getDocs, setAccess: m.setAccess, createKey: m.createKey, updateKey: m.updateKey, revokeKey: m.revokeKey, deleteKey: m.deleteKey }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../../config/env", () => ({ env: { VITE_API_BASE_URL: "https://api.shop.test/v1" } }));

import { setLangForTests } from "../../lib/lang";
import ApiPage from "./ApiPage";

const closed: TableAccess = { read: "off", create: "off", update: "off", delete: "off" };
const posts: ApiTable = { id: "t1", slug: "posts", name: { en: "Posts" }, access: { ...closed, read: "public" }, open: true, fields: [{ id: "title", type: "text", name: null, required: true }, { id: "price", type: "number", name: null, required: false }] };
const notes: ApiTable = { id: "t2", slug: "notes", name: { en: "Notes" }, access: closed, open: false, fields: [{ id: "title", type: "text", name: null, required: true }] };
const key = (over: Partial<ApiKey> = {}): ApiKey => ({ id: "k1", name: "ERP sync", prefix: "ek_Ab12c", scopes: { tables: "*", acts: ["read", "create"] }, perMinute: 60, expiresAt: null, revokedAt: null, lastUsedAt: "2026-11-15T11:40:00Z", lastUsedIp: "10.0.0.1", createdBy: "owner@shop.test", createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z", state: "active", ...over });
const page = (over: Partial<Page> = {}): Page => ({
  base: "/v1/data",
  who: ["off", "key", "public"],
  acts: ["read", "create", "update", "delete"],
  limits: { name: 80, tables: 200, keys: 100, perMinute: { min: 1, max: 1000, default: 60 }, pageSize: 100, publicWritesPerMinute: 10 },
  tables: [posts, notes],
  keys: [key(), key({ id: "k2", name: "Old one", prefix: "ek_Zz99y", state: "revoked", revokedAt: "2026-11-10T10:00:00Z", scopes: { tables: ["t2"], acts: ["read"] } })],
  now: Date.parse("2026-11-15T12:00:00Z"),
  ...over,
});

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ApiPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["api:read", "api:write"]);
  m.page = page();
  m.getApi.mockImplementation(async () => m.page);
  m.getDocs.mockResolvedValue({ tables: 1, openapi: { openapi: "3.1.0" }, types: "export type Lang = string;\n", openapiPath: "/v1/data/openapi.json" });
  m.setAccess.mockImplementation(async (id: string, access: TableAccess) => ({ ...(id === "t1" ? posts : notes), access, open: Object.values(access).some((w) => w !== "off") }));
  m.copied = [];
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t: string) => void m.copied.push(t) } });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The API page", () => {
  test("says where the API is, and shows each table open or closed with who may do what", async () => {
    show();
    expect((await screen.findByTestId("api-base")).textContent).toBe("https://api.shop.test/v1/data");
    expect(screen.getByTestId("table-open-posts").textContent).toBe("Open");
    expect(screen.getByTestId("table-open-notes").textContent).toBe("Closed");
    expect((screen.getByTestId("access-posts-read") as HTMLSelectElement).value).toBe("public");
    // Reading and adding can be for everyone; changing and deleting can't.
    const choices = (id: string) => [...screen.getByTestId(id).querySelectorAll("option")].map((o) => o.textContent);
    expect(choices("access-notes-read")).toEqual(["Closed", "With a key", "Everyone"]);
    expect(choices("access-notes-create")).toEqual(["Closed", "With a key", "Everyone"]);
    expect(choices("access-notes-update")).toEqual(["Closed", "With a key"]);
    expect(choices("access-notes-delete")).toEqual(["Closed", "With a key"]);
    // What is open to everyone is said; a closed table has no examples to show.
    expect(screen.getByTestId("table-warning-posts").textContent).toContain("Anyone can read every field");
    expect(screen.queryByTestId("table-warning-notes")).toBeNull();
    expect(screen.queryByTestId("examples-notes")).toBeNull();
  });

  test("a choice is saved at once, the whole of the table's access with it", async () => {
    show();
    fireEvent.change(await screen.findByTestId("access-notes-create"), { target: { value: "public" } });
    await waitFor(() => expect(m.setAccess).toHaveBeenCalledWith("t2", { read: "off", create: "public", update: "off", delete: "off" }));
    await waitFor(() => expect(screen.getByTestId("table-open-notes").textContent).toBe("Open"));
    // What is open changed: the documents are asked for again.
    await waitFor(() => expect(m.getDocs).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("table-warning-notes").textContent).toContain("Anyone can add rows without a key");
    // Its examples are there now, with no key in them (it is open to everyone).
    fireEvent.click(screen.getByTestId("examples-notes"));
    expect(screen.getByTestId("example-notes-create").textContent).toBe(`curl -X POST "https://api.shop.test/v1/data/notes" -H "Content-Type: application/json" -d '{"values":{"title":"…"}}'`);
    expect(screen.getByTestId("fields-notes").textContent).toBe("title*: text");
  });

  test("the keys: what each reaches and its state; a revoked one can only be deleted", async () => {
    show();
    const live = await screen.findByTestId("key-k1");
    expect(live.textContent).toContain("ERP sync");
    expect(live.textContent).toContain("ek_Ab12c…");
    expect(screen.getByTestId("key-state-k1").textContent).toBe("Active");
    expect(screen.getByTestId("key-scopes-k1").textContent).toBe("Every table: read, add");
    expect(live.textContent).toContain("Last used: 20 min ago");
    expect(screen.getByTestId("key-state-k2").textContent).toBe("Revoked");
    expect(screen.getByTestId("key-scopes-k2").textContent).toBe("Notes: read");
    expect(screen.queryByTestId("key-edit-k2")).toBeNull();
    expect(screen.queryByTestId("key-revoke-k2")).toBeNull();
    expect(screen.getByTestId("key-delete-k2")).toBeTruthy();
  });

  test("a new key: the form says what's missing, then the key is shown once, to copy", async () => {
    m.createKey.mockImplementation(async (body) => ({ key: key({ id: "k9", name: body.name, prefix: "ek_New11", scopes: body.scopes, lastUsedAt: null }), secret: "ek_New11-the-whole-secret-0123456789" }));
    show();
    fireEvent.click(await screen.findByTestId("key-new"));
    fireEvent.click(screen.getByTestId("key-save"));
    expect(screen.getByTestId("key-error").textContent).toBe("Give the key a name (the accounting program, say)");
    expect(m.createKey).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("key-name"), { target: { value: "Accounting" } });
    // Only the notes, to add rows.
    fireEvent.click(screen.getByTestId("key-all"));
    fireEvent.click(screen.getByTestId("key-save"));
    expect(screen.getByTestId("key-error").textContent).toBe("Choose at least one table, or every table");
    fireEvent.click(screen.getByTestId("key-table-notes"));
    fireEvent.click(screen.getByTestId("key-act-create"));
    fireEvent.click(screen.getByTestId("key-act-read"));
    fireEvent.change(screen.getByTestId("key-per-minute"), { target: { value: "30" } });
    fireEvent.click(screen.getByTestId("key-save"));
    await waitFor(() => expect(m.createKey).toHaveBeenCalledWith({ name: "Accounting", scopes: { tables: ["t2"], acts: ["create"] }, perMinute: 30, expiresAt: null }));
    // The key itself, this once.
    const dialog = await screen.findByTestId("secret-dialog");
    expect(within(dialog).getByTestId("secret-value").textContent).toBe("ek_New11-the-whole-secret-0123456789");
    fireEvent.click(screen.getByTestId("secret-copy"));
    await waitFor(() => expect(m.copied).toEqual(["ek_New11-the-whole-secret-0123456789"]));
    fireEvent.click(screen.getByTestId("secret-done"));
    await waitFor(() => expect(screen.queryByTestId("secret-dialog")).toBeNull());
    // It is in the list by its first letters; the whole of it is nowhere on the page any more.
    expect(screen.getByTestId("key-scopes-k9").textContent).toBe("Notes: add");
    expect(document.body.textContent).not.toContain("the-whole-secret");
  });

  test("editing a key opens it as it is; revoking and deleting ask first", async () => {
    m.updateKey.mockImplementation(async (_id, body) => ({ key: key({ name: body.name, perMinute: body.perMinute, scopes: body.scopes }) }));
    m.revokeKey.mockResolvedValue({ key: key({ state: "revoked", revokedAt: "2026-11-15T12:00:00Z" }) });
    m.deleteKey.mockResolvedValue({ ok: true });
    show();
    fireEvent.click(await screen.findByTestId("key-edit-k1"));
    expect((screen.getByTestId("key-name") as HTMLInputElement).value).toBe("ERP sync");
    expect((screen.getByTestId("key-act-read") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByTestId("key-act-delete") as HTMLInputElement).checked).toBe(false);
    fireEvent.change(screen.getByTestId("key-name"), { target: { value: "ERP" } });
    fireEvent.click(screen.getByTestId("key-save"));
    await waitFor(() => expect(m.updateKey).toHaveBeenCalledWith("k1", { name: "ERP", scopes: { tables: "*", acts: ["read", "create"] }, perMinute: 60, expiresAt: null }));
    await waitFor(() => expect(screen.getByTestId("key-k1").textContent).toContain("ERP"));
    expect(screen.queryByTestId("secret-dialog")).toBeNull();

    fireEvent.click(screen.getByTestId("key-revoke-k1"));
    expect(m.revokeKey).not.toHaveBeenCalled();
    // The question is a window of its own; its yes is the one inside it.
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(m.revokeKey).toHaveBeenCalledWith("k1", expect.anything()));
    await waitFor(() => expect(screen.getByTestId("key-state-k1").textContent).toBe("Revoked"));

    fireEvent.click(screen.getByTestId("key-delete-k2"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(m.deleteKey).toHaveBeenCalledWith("k2", expect.anything()));
    await waitFor(() => expect(screen.queryByTestId("key-k2")).toBeNull());
  });

  test("a member who may only look changes nothing", async () => {
    m.may = new Set(["api:read"]);
    show();
    expect(((await screen.findByTestId("access-posts-read")) as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByTestId("key-new") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("key-edit-k1") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("key-revoke-k1") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("key-delete-k2") as HTMLButtonElement).disabled).toBe(true);
  });

  test("no tables and no keys yet: it says what to do", async () => {
    m.page = page({ tables: [], keys: [] });
    show();
    expect((await screen.findByTestId("api-tables")).textContent).toContain("No tables yet");
    expect(screen.getByTestId("keys-empty").textContent).toContain("No keys yet");
  });
});
