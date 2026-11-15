// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Collection } from "../../api/collections.api";
import type { GridMeta, GridPage, GridRow, Incoming, LinkedFrom } from "../../api/data.api";

// The other side of a relation in the admin (B3): for each relation that links a table, its grid
// has a column that says who links each row. It is read, asked about and sorted by; never written.
// The server's part is tested with the database.

const m = vi.hoisted(() => ({ may: new Set<string>(), listCollections: vi.fn(), gridMeta: vi.fn(), getRows: vi.fn(), patchRow: vi.fn(), bulkRows: vi.fn(), storeTables: vi.fn(), lookupRows: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../api/collections.api", () => ({ listCollections: m.listCollections }));
vi.mock("../../api/data.api", () => ({ gridMeta: m.gridMeta, getRows: m.getRows, patchRow: m.patchRow, bulkRows: m.bulkRows, storeTables: m.storeTables, lookupRows: m.lookupRows }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));

import { setLangForTests } from "../../lib/lang";
import DataPage from "./DataPage";
import { CellView, FromCell } from "./GridCells";
import { cellText, columnsOf, editable, filterColumns, fromName, kindOf, opName } from "./dataText";

const author: Incoming = { id: "$from.books.author", table: "tbl-books", slug: "books", name: { en: "Books", ar: "الكتب" }, field: "author", fieldName: { en: "Author", ar: "الكاتب" }, single: false };
const helpers: Incoming = { id: "$from.books.helpers", table: "tbl-books", slug: "books", name: { en: "Books" }, field: "helpers", fieldName: null, single: false };
const table: Collection = { id: "c1", slug: "authors", name: { en: "Authors" }, templateId: null, items: 3, published: 0, createdAt: "", updatedAt: "", fields: [{ id: "title", type: "text", name: { en: "Name" }, required: true }] };
const linked = (n: number, slugs: string[]): LinkedFrom => ({ n, rows: slugs.map((s) => ({ id: `id-${s}`, slug: s, status: "DRAFT", title: { en: s.toUpperCase() } })) });
const row = (slug: string, from?: GridRow["from"]): GridRow => ({ id: `id-${slug}`, collectionId: "c1", slug, status: "DRAFT", data: { title: { en: slug.toUpperCase() } }, sort: 0, publishedAt: null, createdAt: "2026-11-01T10:00:00.000Z", updatedAt: "2026-11-02T10:00:00.000Z", deletedAt: null, ...(from ? { from } : {}) });
const rows = [row("a1", { [author.id]: linked(2, ["b1", "b2"]) }), row("a2", {}), row("a3", { [author.id]: linked(7, ["c1", "c2", "c3", "c4", "c5"]), [helpers.id]: linked(1, ["b1"]) })];
const say = (words: string, i = 1) => words.split("|")[i];

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("A linked-from column", () => {
  test("is named by the table that links and its field, in the three languages", () => {
    // (A language with no name of its own takes the Arabic one, as names do everywhere in the grid.)
    expect(fromName(author)).toBe("مربوط من: الكتب · الكاتب|Linked from: Books · Author|מקושר מ: الكتب · الكاتب");
    // No names given: the table's address and the field's id.
    expect(say(fromName({ ...helpers, name: null }))).toBe("Linked from: books · helpers");
    // The bar that parts the languages can't be part of a name.
    expect(fromName({ ...author, name: { en: "A|B" }, fieldName: { en: "x|y" } }).split("|")).toHaveLength(3);
  });

  test("stands after the table's own fields, is asked about and sorted by, and is never written in", () => {
    const columns = columnsOf(table, "en", [author, helpers]);
    expect(columns.map((c) => c.id)).toEqual(["$slug", "$status", "title", "$from.books.author", "$from.books.helpers", "$updatedAt"]);
    const col = columns[3];
    expect(col).toMatchObject({ kind: "$from", from: author });
    expect(col.computed).toBeUndefined();
    expect(editable(col)).toBe(false);
    expect(filterColumns(columns, false).some((c) => c.id === author.id)).toBe(true);
    expect(kindOf("$from.books.author", table.fields)).toBe("$from");
    // Without any, the grid is as it was.
    expect(columnsOf(table, "en").map((c) => c.id)).toEqual(["$slug", "$status", "title", "$updatedAt"]);
    expect(columnsOf(table, "en", []).map((c) => c.id)).toEqual(["$slug", "$status", "title", "$updatedAt"]);
    expect(say(opName("empty", "$from"))).toBe("nothing links it");
    expect(say(opName("notEmpty", "$from"))).toBe("something links it");
    expect(cellText(col, rows[0], "en")).toBe("2");
    expect(cellText(col, rows[1], "en")).toBe("");
    expect(cellText(col, row("a9"), "en")).toBe("");
  });

  test("its cell: how many rows link it, the first few by name, and how many more", () => {
    const col = columnsOf(table, "en", [author])[3];
    const { container, rerender } = render(<CellView column={col} row={rows[2]} lang="en" />);
    const cell = screen.getByTestId("cell-from");
    expect(cell.getAttribute("data-count")).toBe("7");
    expect(cell.textContent).toBe("7C1C2C3C4C5+2");
    rerender(<CellView column={col} row={rows[0]} lang="en" />);
    expect(screen.getByTestId("cell-from").textContent).toBe("2B1B2");
    // Nobody links it: an empty cell.
    rerender(<CellView column={col} row={rows[1]} lang="en" />);
    expect(container.textContent).toBe("");
    rerender(<FromCell got={{ n: 0, rows: [] }} lang="en" />);
    expect(container.textContent).toBe("");
  });
});

describe("In the grid", () => {
  const meta = {
    ops: { text: ["contains", "is", "empty"], $slug: ["contains"], $status: ["is"], $date: ["gt"], $from: ["empty", "notEmpty"] },
    systemColumns: ["$slug", "$status", "$createdAt", "$updatedAt", "$publishedAt"],
    views: ["all", "draft", "published", "archived", "trash"],
    limits: { pageSize: 200, filters: 12, sorts: 3, search: 100, value: 200, anyOf: 30, rows: 50_000, importRows: 500, bulkIds: 500, trashDays: 30 },
    rules: {},
    shapes: [],
  } as unknown as GridMeta;
  const page = (over: Partial<GridPage> = {}): GridPage => ({ rows, total: 3, page: 1, pageSize: 50, counts: { all: 3, draft: 3, published: 0, archived: 0, trash: 0 }, ms: 3, incoming: [author, helpers], ...over });
  const lastQuery = () => m.getRows.mock.calls[m.getRows.mock.calls.length - 1][1];
  const show = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/admin/data"]}>
          <DataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    setLangForTests("en");
    m.may = new Set(["pages:read", "pages:write"]);
    m.listCollections.mockResolvedValue([table]);
    m.gridMeta.mockResolvedValue(meta);
    m.getRows.mockImplementation(async () => page());
    m.storeTables.mockResolvedValue([]);
  });

  test("the page says which relations link the table: each is a column, with who links every row", async () => {
    show();
    expect(await screen.findByTestId("row-a1")).toBeTruthy();
    expect(screen.getByTestId("sort-$from.books.author").textContent).toContain("Linked from: Books · Author");
    expect(screen.getByTestId("sort-$from.books.helpers").textContent).toContain("Linked from: Books · helpers");
    expect(within(screen.getByTestId("cell-a1-$from.books.author")).getByTestId("cell-from").textContent).toBe("2B1B2");
    expect(screen.getByTestId("cell-a2-$from.books.author").textContent).toBe("");
    expect(within(screen.getByTestId("cell-a3-$from.books.helpers")).getByTestId("cell-from").getAttribute("data-count")).toBe("1");
    // Not a cell to write in: a double click opens nothing, and it isn't one of the values many rows can be given.
    fireEvent.doubleClick(screen.getByTestId("cell-a1-$from.books.author"));
    expect(screen.queryByTestId("cell-editor")).toBeNull();
    expect(screen.getByTestId("cell-a1-$from.books.author").getAttribute("tabindex")).toBeNull();
  });

  test("its head sorts by how many link; a filter asks whether any row links", async () => {
    show();
    await screen.findByTestId("row-a1");
    fireEvent.click(screen.getByTestId("sort-$from.books.author"));
    await waitFor(() => expect(lastQuery().sort).toEqual([{ field: "$from.books.author", dir: "asc" }]));
    fireEvent.click(screen.getByTestId("filter-add"));
    fireEvent.change(screen.getByTestId("filter-0-field"), { target: { value: "$from.books.author" } });
    const ops = [...screen.getByTestId("filter-0-op").querySelectorAll("option")].map((o) => o.textContent);
    expect(ops).toEqual(["nothing links it", "something links it"]);
    // Nothing more to write: the question goes as it is.
    await waitFor(() => expect(lastQuery().filters).toEqual([{ field: "$from.books.author", op: "empty" }]));
    fireEvent.change(screen.getByTestId("filter-0-op"), { target: { value: "notEmpty" } });
    await waitFor(() => expect(lastQuery().filters).toEqual([{ field: "$from.books.author", op: "notEmpty" }]));
    expect(screen.queryByTestId("filter-0-value")).toBeNull();
  });

  test("a row's window shows who links it, to read; a table nothing links has no such columns", async () => {
    show();
    await screen.findByTestId("row-a3");
    fireEvent.click(screen.getByTestId("open-a3"));
    const from = await screen.findByTestId("row-from");
    expect(within(from).getByTestId("row-from-books-author").textContent).toContain("Linked from: Books · Author");
    expect(within(within(from).getByTestId("row-from-books-author")).getByTestId("cell-from").getAttribute("data-count")).toBe("7");
    expect(within(from).getByTestId("row-from-books-helpers")).toBeTruthy();
    expect(from.querySelector("input, select, textarea, button")).toBeNull();
    cleanup();
    // Nothing links this table (an older server says nothing of it either): the grid as it always was.
    m.getRows.mockImplementation(async () => page({ incoming: undefined, rows: [row("a1"), row("a2")], total: 2 }));
    show();
    await screen.findByTestId("row-a1");
    expect(screen.queryByTestId("sort-$from.books.author")).toBeNull();
    fireEvent.click(screen.getByTestId("open-a1"));
    await screen.findByTestId("row-field-title");
    expect(screen.queryByTestId("row-from")).toBeNull();
  });
});
