import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Collection } from "../../api/collections.api";
import type { GridMeta, GridPage, GridRow, GridTable } from "../../api/data.api";

// الجداول: the grid over a stand-in API (the server's own work is tested with the database).
const m = vi.hoisted(() => ({
  may: new Set<string>(),
  listCollections: vi.fn(),
  gridMeta: vi.fn(),
  getRows: vi.fn(),
  patchRow: vi.fn(),
  bulkRows: vi.fn(),
  addRow: vi.fn(),
  importRows: vi.fn(),
  exportRows: vi.fn(),
  storeTables: vi.fn(),
  getStoreRows: vi.fn(),
  exportStoreRows: vi.fn(),
}));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../api/collections.api", () => ({ listCollections: m.listCollections }));
vi.mock("../../api/data.api", () => ({ gridMeta: m.gridMeta, getRows: m.getRows, patchRow: m.patchRow, bulkRows: m.bulkRows, addRow: m.addRow, importRows: m.importRows, exportRows: m.exportRows, storeTables: m.storeTables, getStoreRows: m.getStoreRows, exportStoreRows: m.exportStoreRows }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));

import { setLangForTests } from "../../lib/lang";
import DataPage from "./DataPage";

const table: Collection = {
  id: "c1",
  slug: "products",
  name: { en: "Products" },
  templateId: null,
  items: 3,
  published: 1,
  createdAt: "",
  updatedAt: "",
  fields: [
    { id: "title", type: "text", name: { en: "Title" }, required: true },
    { id: "price", type: "number", name: { en: "Price" } },
    { id: "kind", type: "select", name: { en: "Kind" }, options: [{ id: "new", name: { en: "New" } }, { id: "sale", name: { en: "On sale" } }] },
  ],
};
const meta: GridMeta = {
  ops: { text: ["contains", "is", "empty"], longText: ["contains"], number: ["is", "gt", "between", "empty"], date: ["is"], boolean: ["isTrue", "isFalse"], select: ["is", "anyOf"], image: ["empty"], link: ["contains"], color: ["is"], $slug: ["contains"], $status: ["is"], $date: ["gt"] },
  systemColumns: ["$slug", "$status", "$createdAt", "$updatedAt", "$publishedAt"],
  views: ["all", "draft", "published", "archived", "trash"],
  limits: { pageSize: 200, filters: 12, sorts: 3, search: 100, value: 200, anyOf: 30, rows: 50_000, importRows: 500, bulkIds: 500, trashDays: 30 },
  rules: {} as GridMeta["rules"],
  shapes: [],
};
const row = (slug: string, data: Record<string, unknown>, over: Partial<GridRow> = {}): GridRow => ({ id: `id-${slug}`, collectionId: "c1", slug, status: "DRAFT", data, sort: 0, publishedAt: null, createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-13T10:00:00Z", deletedAt: null, ...over });
const rows = [row("spring", { title: { en: "Spring dress" }, price: 1200, kind: "new" }, { status: "PUBLISHED" }), row("summer", { title: { en: "Summer hat" }, price: 80 }), row("winter", { title: { en: "Winter scarf" } })];
const page = (over: Partial<GridPage> = {}): GridPage => ({ rows, total: 3, page: 1, pageSize: 50, counts: { all: 3, draft: 2, published: 1, archived: 0, trash: 1 }, ms: 4, ...over });

function show(at = "/admin/data") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[at]}>
        <DataPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const orders: GridTable = {
  id: "$orders",
  slug: "orders",
  name: { en: "Orders" },
  templateId: null,
  items: 2,
  published: 2,
  createdAt: "",
  updatedAt: "",
  readOnly: true,
  hasAddress: false,
  fields: [
    { id: "customer", type: "text", name: { en: "Customer" } },
    { id: "total", type: "number", name: { en: "Total" } },
    { id: "state", type: "select", name: { en: "State" }, options: [{ id: "NEW", name: { en: "New" } }, { id: "SHIPPED", name: { en: "Shipped" } }] },
    { id: "pieces", type: "number", name: { en: "Pieces" }, computed: true },
  ],
};
const orderRows = [row("or2", { customer: "Lina", total: 120, state: "SHIPPED", pieces: 1 }, { status: "PUBLISHED" }), row("or1", { customer: "Sara", total: 100, state: "NEW", pieces: 2 }, { status: "PUBLISHED" })];
const lastQuery = () => m.getRows.mock.calls[m.getRows.mock.calls.length - 1][1];

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["pages:read", "pages:write"]);
  m.listCollections.mockResolvedValue([table]);
  m.gridMeta.mockResolvedValue(meta);
  m.getRows.mockImplementation(async () => page());
  m.patchRow.mockImplementation(async (_t: string, id: string, body: { values?: Record<string, unknown>; status?: string }) => ({ ...rows.find((r) => r.id === id)!, ...(body.status ? { status: body.status } : {}), data: { ...rows.find((r) => r.id === id)!.data, ...(body.values ?? {}), ...(body.values?.price ? { price: Number(body.values.price) } : {}) } }));
  m.bulkRows.mockResolvedValue({ changed: 2, counts: page().counts });
  m.storeTables.mockResolvedValue([]);
  m.getStoreRows.mockImplementation(async () => page({ rows: orderRows, total: 2, counts: { all: 2, draft: 0, published: 0, archived: 0, trash: 0 } }));
});

describe("The data grid", () => {
  test("a table's rows with their columns, the tabs' numbers and the pages", async () => {
    show();
    expect(await screen.findByTestId("row-spring")).toBeTruthy();
    expect(screen.getByTestId("data-table-products").textContent).toContain("Products");
    expect(screen.getByTestId("cell-spring-title").textContent).toBe("Spring dress");
    expect(screen.getByTestId("cell-spring-price").textContent).toBe("1,200");
    expect(screen.getByTestId("cell-spring-kind").textContent).toBe("New");
    expect(screen.getByTestId("cell-spring-$status").textContent).toBe("Published");
    expect(screen.getByTestId("count-all").textContent).toBe("3");
    expect(screen.getByTestId("count-trash").textContent).toBe("1");
    expect(screen.getByTestId("data-total").textContent).toBe("1–3 of 3");
    expect(m.getRows).toHaveBeenLastCalledWith("c1", { page: 1, pageSize: 50, view: "all", lang: "en" });
  });

  test("a tab, a column's head, the search and a filter each ask the server again, from the first page", async () => {
    show();
    await screen.findByTestId("row-spring");
    fireEvent.click(screen.getByTestId("view-draft"));
    await waitFor(() => expect(lastQuery()).toMatchObject({ view: "draft", page: 1 }));
    fireEvent.click(screen.getByTestId("sort-price"));
    await waitFor(() => expect(lastQuery().sort).toEqual([{ field: "price", dir: "asc" }]));
    fireEvent.click(screen.getByTestId("sort-price"));
    await waitFor(() => expect(lastQuery().sort).toEqual([{ field: "price", dir: "desc" }]));
    fireEvent.change(screen.getByTestId("data-search"), { target: { value: "hat" } });
    await waitFor(() => expect(lastQuery().search).toBe("hat"));
    // A filter is only sent once its value is written.
    fireEvent.click(screen.getByTestId("filter-add"));
    fireEvent.change(screen.getByTestId("filter-0-field"), { target: { value: "price" } });
    fireEvent.change(screen.getByTestId("filter-0-op"), { target: { value: "gt" } });
    const before = m.getRows.mock.calls.length;
    expect(lastQuery().filters).toBeUndefined();
    fireEvent.change(screen.getByTestId("filter-0-value"), { target: { value: "100" } });
    await waitFor(() => expect(lastQuery().filters).toEqual([{ field: "price", op: "gt", value: 100 }]));
    expect(m.getRows.mock.calls.length).toBeGreaterThan(before);
    fireEvent.click(screen.getByTestId("filter-0-remove"));
    await waitFor(() => expect(lastQuery().filters).toBeUndefined());
  });

  test("a cell is written in place: Enter saves what changed, Escape leaves it", async () => {
    show();
    const cell = await screen.findByTestId("cell-summer-price");
    fireEvent.doubleClick(cell);
    const editor = within(cell).getByTestId("cell-editor") as HTMLInputElement;
    expect(editor.value).toBe("80");
    fireEvent.change(editor, { target: { value: "95" } });
    fireEvent.keyDown(editor, { key: "Enter" });
    await waitFor(() => expect(m.patchRow).toHaveBeenCalledWith("c1", "id-summer", { values: { price: "95" }, lang: "en" }));
    await waitFor(() => expect(screen.getByTestId("cell-summer-price").textContent).toBe("95"));
    // Words: the other languages stay.
    fireEvent.doubleClick(screen.getByTestId("cell-winter-title"));
    const words = within(screen.getByTestId("cell-winter-title")).getByTestId("cell-editor");
    fireEvent.change(words, { target: { value: "Winter shawl" } });
    fireEvent.keyDown(words, { key: "Escape" });
    expect(m.patchRow).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("cell-winter-title").textContent).toBe("Winter scarf");
    // A choice is saved as soon as it's made.
    fireEvent.doubleClick(screen.getByTestId("cell-winter-kind"));
    fireEvent.change(within(screen.getByTestId("cell-winter-kind")).getByTestId("cell-editor"), { target: { value: "sale" } });
    await waitFor(() => expect(m.patchRow).toHaveBeenLastCalledWith("c1", "id-winter", { values: { kind: "sale" }, lang: "en" }));
  });

  test("ticked rows change together; \"all in the result\" sends the question instead of ids", async () => {
    m.getRows.mockImplementation(async () => page({ total: 240 }));
    show();
    await screen.findByTestId("row-spring");
    expect(screen.queryByTestId("bulk-bar")).toBeNull();
    fireEvent.click(screen.getByTestId("pick-summer"));
    fireEvent.click(screen.getByTestId("pick-winter"));
    expect(screen.getByTestId("bulk-count").textContent).toBe("2 chosen");
    fireEvent.click(screen.getByTestId("bulk-publish"));
    await waitFor(() => expect(m.bulkRows).toHaveBeenCalledWith("c1", { ids: ["id-summer", "id-winter"], op: "publish", field: undefined, value: undefined, lang: "en" }));
    await waitFor(() => expect(screen.queryByTestId("bulk-bar")).toBeNull());
    // The whole page ticked, then everything the question matches.
    fireEvent.click(screen.getByTestId("pick-page"));
    fireEvent.click(screen.getByTestId("bulk-all"));
    expect(screen.getByTestId("bulk-count").textContent).toBe("240 chosen");
    fireEvent.click(screen.getByTestId("bulk-set"));
    fireEvent.change(screen.getByTestId("bulk-set-field"), { target: { value: "kind" } });
    fireEvent.change(screen.getByTestId("bulk-set-value"), { target: { value: "sale" } });
    fireEvent.click(screen.getByTestId("bulk-set-apply"));
    await waitFor(() => expect(m.bulkRows).toHaveBeenLastCalledWith("c1", { query: { page: 1, pageSize: 50, view: "all", lang: "en" }, op: "set", field: "kind", value: "sale", lang: "en" }));
  });

  test("the trash: its rows aren't written in; they go back, or for good after a question", async () => {
    show();
    await screen.findByTestId("row-spring");
    fireEvent.click(screen.getByTestId("view-trash"));
    await waitFor(() => expect(lastQuery().view).toBe("trash"));
    fireEvent.doubleClick(screen.getByTestId("cell-spring-price"));
    expect(screen.queryByTestId("cell-editor")).toBeNull();
    expect(screen.queryByTestId("row-add")).toBeNull();
    fireEvent.click(screen.getByTestId("pick-spring"));
    expect(screen.queryByTestId("bulk-publish")).toBeNull();
    fireEvent.click(screen.getByTestId("bulk-purge"));
    // Nothing is deleted before the answer.
    expect(m.bulkRows).not.toHaveBeenCalled();
    expect(screen.getByText("Delete for good", { selector: "h2, h3, [role=heading], div" })).toBeTruthy();
    fireEvent.click(screen.getByTestId("bulk-restore"));
    await waitFor(() => expect(m.bulkRows).toHaveBeenCalledWith("c1", expect.objectContaining({ ids: ["id-spring"], op: "restore" })));
  });

  test("without the right to change: reading only", async () => {
    m.may = new Set(["pages:read"]);
    show();
    await screen.findByTestId("row-spring");
    fireEvent.doubleClick(screen.getByTestId("cell-summer-price"));
    expect(screen.queryByTestId("cell-editor")).toBeNull();
    expect(screen.queryByTestId("row-add")).toBeNull();
    expect(screen.queryByTestId("data-import")).toBeNull();
    fireEvent.click(screen.getByTestId("pick-summer"));
    expect((screen.getByTestId("bulk-publish") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("data-export")).toBeTruthy();
  });

  test("one of the store's own tables: looked at, filtered and sorted, never written", async () => {
    m.storeTables.mockResolvedValue([orders]);
    show();
    fireEvent.click(await screen.findByTestId("store-table-orders"));
    expect(await screen.findByTestId("row-or2")).toBeTruthy();
    expect(m.getStoreRows).toHaveBeenLastCalledWith("orders", { page: 1, pageSize: 50, view: "all", lang: "en" });
    // Its words are plain, its choices named, its id in the first column; no status column, no other tabs.
    expect(screen.getByTestId("cell-or2-customer").textContent).toBe("Lina");
    expect(screen.getByTestId("cell-or2-state").textContent).toBe("Shipped");
    expect(screen.getByTestId("sort-$slug").textContent).toContain("ID");
    expect(screen.queryByTestId("sort-$status")).toBeNull();
    expect(screen.queryByTestId("view-trash")).toBeNull();
    expect(screen.getByTestId("data-read-only")).toBeTruthy();
    // Nothing to write with.
    fireEvent.doubleClick(screen.getByTestId("cell-or2-customer"));
    expect(screen.queryByTestId("cell-editor")).toBeNull();
    expect(screen.queryByTestId("row-add")).toBeNull();
    expect(screen.queryByTestId("data-import")).toBeNull();
    expect(screen.queryByTestId("open-or2")).toBeNull();
    // Sorted and filtered by the server; a worked-out column can't be asked.
    fireEvent.click(screen.getByTestId("sort-total"));
    await waitFor(() => expect(m.getStoreRows.mock.calls[m.getStoreRows.mock.calls.length - 1][1].sort).toEqual([{ field: "total", dir: "asc" }]));
    expect((screen.getByTestId("sort-pieces") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("filter-add"));
    const offered = [...(screen.getByTestId("filter-0-field") as HTMLSelectElement).options].map((o) => o.value);
    expect(offered).toEqual(["$slug", "customer", "total", "state", "$createdAt", "$updatedAt"]);
    expect(m.getRows).toHaveBeenCalledTimes(1);
  });

  test("the address says which table is open: a link from elsewhere lands on it", async () => {
    const blog = { ...table, id: "c2", slug: "blog", name: { en: "Blog" } };
    m.listCollections.mockResolvedValue([table, blog]);
    m.storeTables.mockResolvedValue([orders]);
    show("/admin/data?table=blog");
    await waitFor(() => expect(m.getRows).toHaveBeenCalledWith("c2", expect.anything()));
    expect(screen.getByTestId("data-table-blog").getAttribute("aria-current")).toBe("true");
    expect(m.getRows).not.toHaveBeenCalledWith("c1", expect.anything());
    fireEvent.click(await screen.findByTestId("store-table-orders"));
    await waitFor(() => expect(m.getStoreRows).toHaveBeenCalledWith("orders", expect.anything()));
    expect(screen.getByTestId("store-table-orders").getAttribute("aria-current")).toBe("true");
  });

  test("no tables yet: where to make the first", async () => {
    m.listCollections.mockResolvedValue([]);
    show();
    expect((await screen.findByTestId("data-empty")).textContent).toContain("Collections");
    expect(m.getRows).not.toHaveBeenCalled();
  });
});
