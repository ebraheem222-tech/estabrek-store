import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Collection } from "../../api/collections.api";
import type { GridMeta, GridPage, GridRow } from "../../api/data.api";

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
}));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../api/collections.api", () => ({ listCollections: m.listCollections }));
vi.mock("../../api/data.api", () => ({ gridMeta: m.gridMeta, getRows: m.getRows, patchRow: m.patchRow, bulkRows: m.bulkRows, addRow: m.addRow, importRows: m.importRows, exportRows: m.exportRows }));
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
};
const row = (slug: string, data: Record<string, unknown>, over: Partial<GridRow> = {}): GridRow => ({ id: `id-${slug}`, collectionId: "c1", slug, status: "DRAFT", data, sort: 0, publishedAt: null, createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-13T10:00:00Z", deletedAt: null, ...over });
const rows = [row("spring", { title: { en: "Spring dress" }, price: 1200, kind: "new" }, { status: "PUBLISHED" }), row("summer", { title: { en: "Summer hat" }, price: 80 }), row("winter", { title: { en: "Winter scarf" } })];
const page = (over: Partial<GridPage> = {}): GridPage => ({ rows, total: 3, page: 1, pageSize: 50, counts: { all: 3, draft: 2, published: 1, archived: 0, trash: 1 }, ms: 4, ...over });

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DataPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
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

  test("no tables yet: where to make the first", async () => {
    m.listCollections.mockResolvedValue([]);
    show();
    expect((await screen.findByTestId("data-empty")).textContent).toContain("Collections");
    expect(m.getRows).not.toHaveBeenCalled();
  });
});
