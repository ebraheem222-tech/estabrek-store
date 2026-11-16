// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Feature, FeatureLite } from "../../api/myFeatures.api";

// ميزاتي: the list and one feature's page over a stand-in API, and the pages' words. A feature is
// a name over tables, functions and pages; they are added from what exists or made new, taken
// out, and the whole feature is switched on or off.

const m = vi.hoisted(() => ({ listFeatures: vi.fn(), getFeature: vi.fn(), createFeature: vi.fn(), saveFeature: vi.fn(), deleteFeature: vi.fn(), addFeatureItem: vi.fn(), removeFeatureItem: vi.fn(), createCollection: vi.fn(), createFunction: vi.fn(), may: new Set<string>() }));
vi.mock("../../api/myFeatures.api", () => m);
vi.mock("../../api/collections.api", () => ({ createCollection: m.createCollection }));
vi.mock("../../api/functions.api", () => ({ createFunction: m.createFunction }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import MyFeaturesPage from "./MyFeaturesPage";
import FeaturePage from "./FeaturePage";
import { apiLine, countText, countsLine, fieldsText, rowsText, slugFrom, stepsDone, triggersText } from "./featuresText";

const closed = { read: "off", create: "off", update: "off", delete: "off" } as const;
const feature = (over: Partial<Feature> = {}): Feature => ({
  id: "m1",
  name: "Friend requests",
  note: null,
  enabled: true,
  createdAt: "2026-11-16T10:00:00Z",
  updatedAt: "2026-11-16T10:00:00Z",
  tables: [],
  functions: [],
  pages: [],
  free: { tables: [{ id: "t9", slug: "posts", name: { en: "Posts" } }], functions: [{ id: "f9", name: "Welcome" }], pages: [{ id: "p9", name: "About", slug: "/about" }] },
  limits: { features: 100, items: 60 },
  ...over,
});
const built = (): Feature =>
  feature({
    note: "Shoppers ask each other",
    tables: [
      { id: "t1", slug: "requests", name: { en: "Requests", ar: "الطلبات" }, fields: 4, rows: 12, api: { ...closed, read: "customer", create: "public" } },
      { id: "t2", slug: "friends", name: null, fields: 1, rows: 0, api: closed },
    ],
    functions: [
      { id: "f1", name: "Send a request", note: "From the shop's button", enabled: true, published: true, changed: false, triggers: 1, runs: 40, lastRunAt: "2026-11-16T09:00:00Z" },
      { id: "f2", name: "Accept", note: null, enabled: true, published: false, changed: true, triggers: 0, runs: 0, lastRunAt: null },
    ],
    pages: [{ id: "p1", name: "My friends", slug: "/my-friends", status: "PUBLISHED", hasDraft: true }],
  });

let server: Feature;
function show(path = "/admin/my-features/m1") {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/my-features" element={<MyFeaturesPage />} />
          <Route path="/admin/my-features/:id" element={<FeaturePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const pick = (testid: string, value: string) => fireEvent.change(screen.getByTestId(testid), { target: { value } });
const lite = (f: Feature): FeatureLite => ({ id: f.id, name: f.name, note: f.note, enabled: f.enabled, updatedAt: f.updatedAt, counts: { table: f.tables.length, function: f.functions.length, page: f.pages.length } });
const bump = () => new Date(Date.parse(server.updatedAt) + 1000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["features:read", "features:write", "pages:write", "functions:write"]);
  server = built();
  m.listFeatures.mockImplementation(async () => ({ features: [lite(server), lite(feature({ id: "m2", name: "Waiting list", enabled: false }))], limits: { features: 100, items: 60 } }));
  m.getFeature.mockImplementation(async () => server);
  m.saveFeature.mockImplementation(async (_id: string, body: { name?: string; note?: string | null; enabled?: boolean }) => {
    server = { ...server, ...body, updatedAt: bump() } as Feature;
    // As the server answers: a feature's pages are hidden from the shop while it is off.
    server = { ...server, pages: server.pages.map((p) => ({ ...p, hidden: !server.enabled })) };
    return server;
  });
  m.addFeatureItem.mockImplementation(async (_id: string, kind: string, refId: string) => {
    if (kind === "table") server = { ...server, tables: [...server.tables, { id: refId, slug: refId === "t9" ? "posts" : "new-table", name: { en: refId === "t9" ? "Posts" : "New table" }, fields: 1, rows: 0, api: closed }], free: { ...server.free, tables: server.free.tables.filter((t) => t.id !== refId) } };
    if (kind === "function") server = { ...server, functions: [...server.functions, { id: refId, name: refId === "f9" ? "Welcome" : "Brand new", note: null, enabled: true, published: false, changed: true, triggers: 0, runs: 0, lastRunAt: null }], free: { ...server.free, functions: server.free.functions.filter((x) => x.id !== refId) } };
    if (kind === "page") server = { ...server, pages: [...server.pages, { id: refId, name: "About", slug: "/about", status: "DRAFT", hasDraft: false }], free: { ...server.free, pages: server.free.pages.filter((p) => p.id !== refId) } };
    return server;
  });
  m.removeFeatureItem.mockImplementation(async (_id: string, kind: string, refId: string) => (server = { ...server, tables: kind === "table" ? server.tables.filter((t) => t.id !== refId) : server.tables, functions: kind === "function" ? server.functions.filter((x) => x.id !== refId) : server.functions, pages: kind === "page" ? server.pages.filter((p) => p.id !== refId) : server.pages }));
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The pages' words", () => {
  test("what a feature holds, counted the way each language counts", () => {
    expect(countsLine({ table: 2, function: 3, page: 1 }, "en")).toBe("2 tables · 3 functions · 1 page");
    expect(countsLine({ table: 1, function: 0, page: 0 }, "en")).toBe("1 table");
    expect(countsLine({ table: 0, function: 0, page: 0 }, "en")).toBe("Nothing in it yet");
    expect(countsLine({ table: 2, function: 1, page: 3 }, "ar")).toBe("جدولين · function · 3 صفحات");
    expect([1, 2, 5, 12].map((n) => countText("table", n, "ar"))).toEqual(["جدول", "جدولين", "5 جداول", "12 جدول"]);
    expect([1, 4].map((n) => countText("page", n, "he"))).toEqual(["עמוד אחד", "4 עמודים"]);
    expect([0, 1, 2, 7, 40].map((n) => rowsText(n, "ar"))).toEqual(["ما فيه سطور", "سطر", "سطرين", "7 سطور", "40 سطر"]);
    expect([rowsText(1, "en"), rowsText(1200, "en"), fieldsText(1, "en"), fieldsText(4, "en"), triggersText(0, "en"), triggersText(1, "en"), triggersText(3, "ar")]).toEqual(["1 row", "1,200 rows", "1 field", "4 fields", "nothing starts it by itself", "1 trigger", "3 مشغّلات"]);
  });

  test("who reaches a table's API, in a line; how far a feature is built; a table's address from its name", () => {
    expect(apiLine(closed, "en")).toBe("API closed");
    expect(apiLine({ ...closed, read: "customer", create: "public" }, "en")).toBe("API: read the shopper (their own rows), add anyone");
    expect(apiLine({ read: "key", create: "key", update: "key", delete: "off" }, "ar")).toBe("API: قراءة بمفتاح، إضافة بمفتاح، تعديل بمفتاح");
    expect(stepsDone(built())).toEqual({ table: true, function: true, page: true });
    expect(stepsDone(feature())).toEqual({ table: false, function: false, page: false });
    expect(slugFrom("Friend Requests!")).toBe("friend-requests");
    expect(slugFrom("  2nd list ")).toBe("2nd-list");
    // A name with no Latin letters gives no address: the owner types one.
    expect(slugFrom("طلبات الصداقة")).toBe("");
  });
});

describe("The list", () => {
  test("each feature with what it holds and whether it is on; a new one opens its page", async () => {
    m.createFeature.mockImplementation(async ({ name }: { name: string }) => (server = feature({ id: "m9", name })));
    show("/admin/my-features");
    const list = await screen.findByTestId("features-list");
    expect([...list.querySelectorAll("li")].map((li) => [li.getAttribute("data-testid"), li.getAttribute("data-on")])).toEqual([["feature-m1", "true"], ["feature-m2", "false"]]);
    expect(screen.getByTestId("feature-m1").textContent).toContain("2 tables · 2 functions · 1 page");
    expect(screen.getByTestId("feature-m2").textContent).toContain("Nothing in it yet");
    fireEvent.change(screen.getByTestId("feature-new-name"), { target: { value: " Waiting list " } });
    fireEvent.click(screen.getByTestId("feature-new"));
    await waitFor(() => expect(m.createFeature).toHaveBeenCalledWith({ name: "Waiting list" }));
    // (The name is put in its box a moment after the page is drawn.)
    await screen.findByTestId("feature-name");
    await waitFor(() => expect((screen.getByTestId("feature-name") as HTMLInputElement).value).toBe("Waiting list"));
    // Nothing in it: none of its three parts is done.
    expect(["table", "function", "page"].map((k) => screen.getByTestId(`feature-step-${k}`).getAttribute("data-done"))).toEqual(["false", "false", "false"]);
  });
});

describe("One feature", () => {
  test("its tables, functions and pages as they are now, each with the way into its own builder", async () => {
    show();
    await screen.findByTestId("feature-page");
    expect(["table", "function", "page"].map((k) => screen.getByTestId(`feature-step-${k}`).getAttribute("data-done"))).toEqual(["true", "true", "true"]);
    const t1 = screen.getByTestId("feature-table-t1");
    expect(t1.textContent).toContain("Requests");
    expect(t1.textContent).toContain("12 rows · 4 fields · API: read the shopper (their own rows), add anyone");
    expect([...t1.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["/admin/data?table=requests", "/admin/collections", "/admin/data-api"]);
    // A table with no name of its own is called by its address.
    expect(screen.getByTestId("feature-table-t2").textContent).toContain("friends");
    expect(screen.getByTestId("feature-table-t2-api").textContent).toBe("API closed");
    const f1 = screen.getByTestId("feature-function-f1");
    expect(f1.getAttribute("data-state")).toBe("live");
    expect(f1.textContent).toContain("1 trigger · ran 40 times");
    expect(f1.querySelector("a")?.getAttribute("href")).toBe("/admin/functions/f1");
    expect(screen.getByTestId("feature-function-f2").getAttribute("data-state")).toBe("draft");
    expect(screen.getByTestId("feature-function-f2").textContent).toContain("nothing starts it by itself");
    const p1 = screen.getByTestId("feature-page-p1");
    expect(p1.textContent).toContain("/my-friends");
    expect(p1.textContent).toContain("has changes not published");
    expect(p1.querySelector("a")?.getAttribute("href")).toBe("/admin/pages/p1");
  });

  test("things join from what exists, or are made new here; and are taken out", async () => {
    m.createCollection.mockResolvedValue({ id: "tnew" });
    m.createFunction.mockResolvedValue({ id: "fnew" });
    show();
    await screen.findByTestId("feature-page");
    pick("feature-table-add", "t9");
    await waitFor(() => expect(m.addFeatureItem).toHaveBeenCalledWith("m1", "table", "t9"));
    await screen.findByTestId("feature-table-t9");
    // What joined isn't offered again (nothing else is free: the menu goes).
    await waitFor(() => expect(screen.queryByTestId("feature-table-add")).toBeNull());
    pick("feature-function-add", "f9");
    await screen.findByTestId("feature-function-f9");
    pick("feature-page-add", "p9");
    await screen.findByTestId("feature-page-p9");

    // A new table: the address follows the name, and can be typed over.
    fireEvent.change(screen.getByTestId("feature-table-new-name"), { target: { value: "Friend list" } });
    expect((screen.getByTestId("feature-table-new-slug") as HTMLInputElement).value).toBe("friend-list");
    fireEvent.change(screen.getByTestId("feature-table-new-slug"), { target: { value: "Friends" } });
    fireEvent.click(screen.getByTestId("feature-table-new"));
    await waitFor(() => expect(m.createCollection).toHaveBeenCalledWith({ slug: "friends", name: { ar: "Friend list", en: "Friend list", he: "Friend list" }, fields: [{ id: "title", type: "text", name: { ar: "العنوان", en: "Title", he: "כותרת" }, required: true }] }));
    await waitFor(() => expect(m.addFeatureItem).toHaveBeenCalledWith("m1", "table", "tnew"));
    // A name with no Latin letters: no address yet, so the button waits for one.
    fireEvent.change(screen.getByTestId("feature-table-new-name"), { target: { value: "قائمة الأصحاب" } });
    expect((screen.getByTestId("feature-table-new") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId("feature-table-new-slug"), { target: { value: "not an address" } });
    expect((screen.getByTestId("feature-table-new") as HTMLButtonElement).disabled).toBe(true);
    // A new function by its name.
    fireEvent.change(screen.getByTestId("feature-function-new-name"), { target: { value: "Brand new" } });
    fireEvent.click(screen.getByTestId("feature-function-new"));
    await waitFor(() => expect(m.createFunction).toHaveBeenCalledWith({ name: "Brand new" }));
    await waitFor(() => expect(m.addFeatureItem).toHaveBeenCalledWith("m1", "function", "fnew"));

    fireEvent.click(screen.getByTestId("feature-table-t2-remove"));
    await waitFor(() => expect(m.removeFeatureItem).toHaveBeenCalledWith("m1", "table", "t2"));
    await waitFor(() => expect(screen.queryByTestId("feature-table-t2")).toBeNull());
  });

  test("switched off with one press, and it says what that means; its name and note are saved; deleting asks first", async () => {
    m.deleteFeature.mockResolvedValue({ ok: true });
    show();
    await screen.findByTestId("feature-page");
    expect(screen.getByTestId("feature-state").textContent).toBe("On");
    expect(screen.queryByTestId("feature-off")).toBeNull();
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(m.saveFeature).toHaveBeenCalledWith("m1", { enabled: false }));
    expect((await screen.findByTestId("feature-off")).textContent).toContain("its tables' API answers as closed");
    expect(screen.getByTestId("feature-state").textContent).toBe("Off");
    // Its pages hide with it, and each says so; nothing is deleted.
    expect(screen.getByTestId("feature-off").textContent).toContain("its pages are hidden from the shop");
    expect(screen.getByTestId("feature-off").textContent).toContain("Nothing is deleted");
    expect(screen.getByTestId("feature-page-hidden-p1").textContent).toBe("Hidden from the shop");
    // Switched on again: they show.
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(m.saveFeature).toHaveBeenLastCalledWith("m1", { enabled: true }));
    await waitFor(() => expect(screen.queryByTestId("feature-page-hidden-p1")).toBeNull());
    expect(screen.queryByTestId("feature-off")).toBeNull();
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(screen.getByTestId("feature-state").textContent).toBe("Off"));
    // The name and the note: saved together, once they changed.
    expect(screen.queryByTestId("feature-save")).toBeNull();
    fireEvent.change(screen.getByTestId("feature-name"), { target: { value: "Friendship" } });
    fireEvent.change(screen.getByTestId("feature-note"), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("feature-save"));
    await waitFor(() => expect(m.saveFeature).toHaveBeenLastCalledWith("m1", { name: "Friendship", note: null }));
    await waitFor(() => expect(screen.queryByTestId("feature-save")).toBeNull());
    fireEvent.click(screen.getByTestId("feature-delete"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("“Friendship” is deleted as a name only");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(m.deleteFeature).toHaveBeenCalledWith("m1"));
    // Back at the list.
    await screen.findByTestId("features-page");
  });

  test("a member who can only look changes nothing; making a table or a function needs their own permission", async () => {
    m.may = new Set(["features:read"]);
    show();
    await screen.findByTestId("feature-page");
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
    for (const id of ["feature-table-add", "feature-table-new", "feature-function-new", "feature-page-add", "feature-table-t1-remove", "feature-delete"]) expect(screen.queryByTestId(id)).toBeNull();
    cleanup();
    m.may = new Set(["features:read", "features:write"]);
    show();
    await screen.findByTestId("feature-page");
    expect(screen.getByTestId("feature-table-add")).toBeTruthy();
    expect(screen.queryByTestId("feature-table-new")).toBeNull();
    expect(screen.queryByTestId("feature-function-new")).toBeNull();
  });
});
