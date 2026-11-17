// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Collection, CollectionField, Linked } from "../../api/collections.api";
import type { GridMeta, GridPage, GridRow, GridTable } from "../../api/data.api";

// A relation to the store's own tables, and "+ relation" on the Tables page: the names, a linked
// store row in a cell and in the box (one this member may not see too), the fields editor's list,
// and the window that adds a relation of any of the four kinds. The server's part is tested with
// the database (backend storeLinks.spec.ts).

const m = vi.hoisted(() => ({
  may: new Set<string>(),
  listCollections: vi.fn(),
  updateCollection: vi.fn(),
  gridMeta: vi.fn(),
  getRows: vi.fn(),
  storeTables: vi.fn(),
  getStoreRows: vi.fn(),
  lookupRows: vi.fn(),
  toastOk: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../api/collections.api", () => ({ listCollections: m.listCollections, updateCollection: m.updateCollection }));
vi.mock("../../api/data.api", () => ({ gridMeta: m.gridMeta, getRows: m.getRows, storeTables: m.storeTables, getStoreRows: m.getStoreRows, lookupRows: m.lookupRows }));
vi.mock("../../lib/toast", () => ({ toast: { success: m.toastOk, error: m.toastError, info: vi.fn() } }));
vi.mock("../../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));

import { setLangForTests } from "../../lib/lang";
import { FieldRulesEditor } from "../collections/FieldRulesEditor";
import { LINK_KINDS, linkParts, setLinkTo } from "../collections/fieldRules";
import DataPage from "./DataPage";
import { CellView } from "./GridCells";
import { columnsOf, filterColumns, issueWords, storePage } from "./dataText";
import { draftLinks, linkedName, linkedOf, linksDraft, shownText } from "./kinds";
import { LINK_MARKS, relationField } from "./relationField";
import { RelationInput } from "./RelationInput";
import { HIDDEN_ROW, STORE_AREAS, STORE_FIELD_NAME, STORE_LINKS, STORE_LINK_NAME, storeAreas, storeLinkTables, storeTarget } from "./storeLinks";

beforeEach(() => {
  setLangForTests("en");
  m.may = new Set(["pages:read", "pages:write"]);
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
  vi.clearAllMocks();
});

const p1: Linked = { id: "p1", slug: "blue-shirt", title: { ar: "Blue Shirt", en: "Blue Shirt", he: "Blue Shirt" }, store: "products" };
const hidden: Linked = { id: "u1", slug: "u1", title: null, store: "customers", hidden: true };
const product: CollectionField = { id: "product", type: "relation", name: { en: "Product" }, to: "store:products" };
const who: CollectionField = { id: "who", type: "relation", name: { en: "Who" }, to: "store:customers", many: true };
const fit = { unique: false, limits: null, shape: false, default: false } as const;
const row = (data: Record<string, unknown>): GridRow => ({ id: "r1", collectionId: "c1", slug: "n1", status: "DRAFT", data, sort: 0, publishedAt: null, createdAt: "", updatedAt: "", deletedAt: null });

describe("The store's tables as a relation's other end", () => {
  test("which they are and what each is called", () => {
    // Every table the grid shows as the store's, in the grid's order (backend storeTablesRest.spec.ts checks the server's list).
    expect(STORE_LINKS).toEqual(["products", "categories", "types", "sizes", "variants", "movements", "alerts", "orders", "lines", "requests", "customers", "addresses", "wishlist", "subscribers", "coupons", "redemptions", "reviews", "comments"]);
    expect(storeTarget("store:orders")).toBe("orders");
    expect(storeTarget("store:coupons")).toBe("coupons");
    for (const not of ["orders", "store:", "store:pages", "tbl-1", "", undefined, null, 4]) expect(storeTarget(not)).toBeNull();
    expect(storeLinkTables().map((t) => t.id)).toEqual(STORE_LINKS.map((s) => `store:${s}`));
    // No two are called the same; a new column's first name gives an id of its own.
    expect(new Set(STORE_LINKS.map((s) => STORE_LINK_NAME[s])).size).toBe(STORE_LINKS.length);
    expect(new Set(STORE_LINKS.map((s) => relationField({ fields: [] }, { to: `store:${s}`, kind: "manyToOne", onDelete: "unlink", name: "", lang: "en" }, null).id)).size).toBe(STORE_LINKS.length);
    expect(relationField({ fields: [] }, { to: "store:variants", kind: "manyToMany", onDelete: "unlink", name: "", lang: "ar" }, null)).toEqual({ id: "colourAndSize", type: "relation", name: { ar: "اللون والمقاس", en: "Colour and size", he: "צבע ומידה" }, to: "store:variants", many: true });
    for (const s of STORE_LINKS) for (const words of [STORE_LINK_NAME[s], STORE_FIELD_NAME[s]]) expect(words.split("|").filter(Boolean)).toHaveLength(3);
    expect(HIDDEN_ROW.split("|")).toHaveLength(3);
  });

  test("a linked store row keeps its table; one this member may not see says only that it is linked", () => {
    expect(linkedOf([p1, hidden, { id: "x", slug: "x", title: null, store: 5, hidden: "yes" }])).toEqual([p1, hidden, { id: "x", slug: "x", title: null }]);
    expect(linkedName(p1, "ar")).toBe("Blue Shirt");
    expect(linkedName(hidden, "en")).toBe("A linked row (its name needs a permission)");
    expect(linkedName(hidden, "ar")).toBe(HIDDEN_ROW.split("|")[0]);
    // The box keeps the marks, so a chip reads the same after a round trip.
    expect(draftLinks(linksDraft([p1, hidden]))).toEqual([p1, hidden]);
    expect(shownText(who, [hidden], "en")).toBe("A linked row (its name needs a permission)");
    const [, , column] = columnsOf({ fields: [who] }, "en");
    render(<CellView column={column} row={row({ who: [{ ...p1, store: "customers" }, hidden] })} lang="en" />);
    expect(screen.getByText("Blue Shirt").closest("[data-hidden]")).toBeNull();
    expect(screen.getByText("A linked row (its name needs a permission)").closest("[data-hidden]")).not.toBeNull();
  });

  test("the box searches the store's table, and what it picks is sent as that row's id", async () => {
    m.lookupRows.mockResolvedValue({ rows: [p1], total: 1 });
    const onChange = vi.fn();
    render(<RelationInput field={product} value="" onChange={onChange} lang="en" autoFocus testId="box" />);
    fireEvent.click(await screen.findByTestId("box-pick-blue-shirt"));
    expect(m.lookupRows).toHaveBeenCalledWith("store:products", "");
    expect(onChange).toHaveBeenLastCalledWith(linksDraft([p1]));
    cleanup();
    // The table isn't this member's to see: the box says the rows couldn't be read; what is linked stays, and can be let go.
    m.lookupRows.mockRejectedValue(new Error("403"));
    render(<RelationInput field={who} value={linksDraft([hidden])} onChange={onChange} lang="en" autoFocus testId="box" />);
    expect(await screen.findByText("The rows couldn't be read.")).toBeTruthy();
    expect(screen.getByTestId("box-chosen-u1").textContent).toContain("A linked row");
    fireEvent.click(screen.getByTestId("box-remove-u1"));
    expect(onChange).toHaveBeenLastCalledWith("");
    // …and the server's refusal of a row picked some other way is said in the admin's words.
    expect(issueWords("Linking this table's rows needs the permission to see it").split("|")[1]).toContain("needs the permission to see it");
  });

  test("the fields editor: the store's tables after the owner's; nothing is asked about deleting", () => {
    const tables = [{ id: "tbl-authors", name: "Authors" }, { id: "tbl-tags", name: "Tags" }, ...storeLinkTables().map((t) => ({ ...t, name: t.name.split("|")[1] }))];
    const author: CollectionField = { id: "author", type: "relation", name: { en: "Author" }, to: "tbl-authors", onDelete: "restrict" };
    const onChange = vi.fn();
    render(<FieldRulesEditor field={author} lang="en" fit={fit} shapes={[]} onChange={onChange} tables={tables} />);
    const to = screen.getByTestId("rule-author-to") as HTMLSelectElement;
    expect([...to.options].map((o) => o.textContent)).toEqual(["Authors", "Tags", ...STORE_LINKS.map((s) => STORE_LINK_NAME[s].split("|")[1])]);
    expect(to.querySelector("optgroup")?.getAttribute("label")).toBe("The store's tables");
    expect(screen.getByTestId("rule-author-ondelete")).toBeTruthy();
    // Pointed at the store: "can't be deleted while linked" goes with it (a store row is never held back).
    fireEvent.change(to, { target: { value: "store:orders" } });
    expect(onChange).toHaveBeenLastCalledWith({ id: "author", type: "relation", name: { en: "Author" }, to: "store:orders" });
    expect(setLinkTo(author, "tbl-tags")).toEqual({ ...author, to: "tbl-tags" });
    cleanup();
    render(<FieldRulesEditor field={{ ...product, exclusive: true }} lang="en" fit={fit} shapes={[]} onChange={onChange} tables={tables} />);
    expect((screen.getByTestId("rule-product-to") as HTMLSelectElement).selectedOptions[0].textContent).toBe("The store's products");
    expect(screen.queryByTestId("rule-product-ondelete")).toBeNull();
    expect(screen.getByTestId("rule-product-store-note").textContent).toContain("never changed from here");
    expect((screen.getByTestId("rule-product-pairing") as HTMLSelectElement).value).toBe("oneToOne");
    expect(linkParts({ ...product, exclusive: true }).map((x) => x.split("|")[1])).toEqual(["one to one"]);
  });
});

describe("The store's other tables in the grid", () => {
  const name: CollectionField = { id: "name", type: "text", name: { en: "Size" } };

  test("a table shows and asks about the dates its rows keep", () => {
    // Sizes keep no dates; a stock movement is made once and never changes; a coupon keeps both.
    const sizes = { readOnly: true, hasAddress: false, made: false, changed: false, fields: [name] };
    expect(columnsOf(sizes, "en").map((c) => c.id)).toEqual(["$slug", "name"]);
    expect(filterColumns(columnsOf(sizes, "en"), true, sizes).map((c) => c.id)).toEqual(["$slug", "name"]);
    const moves = { readOnly: true, hasAddress: false, made: true, changed: false, fields: [name] };
    expect(columnsOf(moves, "en").map((c) => c.id)).toEqual(["$slug", "name", "$createdAt"]);
    expect(filterColumns(columnsOf(moves, "en"), true, moves).map((c) => c.id)).toEqual(["$slug", "name", "$createdAt"]);
    const coupons: Pick<GridTable, "readOnly" | "hasAddress" | "fields" | "made" | "changed"> = { readOnly: true, hasAddress: false, fields: [name] };
    expect(filterColumns(columnsOf(coupons, "en"), true, coupons).map((c) => c.id)).toEqual(["$slug", "name", "$createdAt", "$updatedAt"]);
  });

  test("the list is read area by area: only the tables a member sees, an area with none left out", () => {
    // Every table is in one area, once, in the grid's order.
    expect(STORE_AREAS.flatMap((a) => a.tables)).toEqual([...STORE_LINKS]);
    for (const a of STORE_AREAS) expect(a.name.split("|").filter(Boolean)).toHaveLength(3);
    const t = (slug: string) => ({ slug });
    expect(storeAreas([t("products"), t("sizes"), t("coupons"), t("orders")]).map((a) => [a.id, a.list.map((x) => x.slug)])).toEqual([["catalogue", ["products", "sizes"]], ["orders", ["orders"]], ["discounts", ["coupons"]]]);
    expect(storeAreas([])).toEqual([]);
    // One the admin doesn't know yet (a newer server) still shows, last.
    expect(storeAreas([t("gifts"), t("reviews")]).map((a) => [a.id, a.list.map((x) => x.slug)])).toEqual([["words", ["reviews"]], ["other", ["gifts"]]]);
  });

  test("where each is changed: its own page, or the page its rows belong to", () => {
    expect(storePage("coupons")).toEqual({ to: "/admin/discounts/coupons", name: "الكوبونات|Coupons|קופונים" });
    expect(storePage("reviews")?.to).toBe("/admin/ugc/reviews");
    expect(storePage("sizes")?.to).toBe("/admin/catalog/sizes");
    expect(storePage("variants")?.to).toBe("/admin/catalog/products");
    expect(storePage("addresses")?.to).toBe("/admin/customers");
    // Newsletter subscribers have no page; a row of these has no page of its own (a product and an order do).
    expect(storePage("subscribers")).toBeNull();
    for (const s of STORE_LINKS.filter((x) => x !== "products" && x !== "orders")) expect([s, storePage(s, "row1")]).toEqual([s, null]);
    for (const s of STORE_LINKS.filter((x) => x !== "subscribers")) expect([s, storePage(s)?.name.split("|").filter(Boolean).length]).toEqual([s, 3]);
  });
});

describe("A relation added from the Tables page", () => {
  const title: CollectionField = { id: "title", type: "text", name: { en: "Title" } };

  test("the field it becomes: its kind, its name, its id", () => {
    expect(LINK_KINDS.map((k) => LINK_MARKS[k].join("-"))).toEqual(["∞-1", "1-1", "∞-∞", "1-∞"]);
    // One of the owner's tables: called by that table; what deleting does is kept.
    expect(relationField({ fields: [title] }, { to: "tbl-authors", kind: "manyToOne", onDelete: "restrict", name: "", lang: "en" }, { name: { en: "Authors", ar: "المؤلفين" }, slug: "authors" })).toEqual({
      id: "authors",
      type: "relation",
      name: { en: "Authors", ar: "المؤلفين" },
      to: "tbl-authors",
      onDelete: "restrict",
    });
    expect(relationField({ fields: [title] }, { to: "tbl-x", kind: "manyToMany", onDelete: "unlink", name: " Writers ", lang: "en" }, { name: { ar: "الكتّاب" }, slug: "the-writers" })).toEqual({ id: "theWriters", type: "relation", name: { ar: "الكتّاب", en: "Writers" }, to: "tbl-x", many: true });
    // One of the store's: its usual name in the three languages, an id that isn't taken, and nothing about deleting.
    expect(relationField({ fields: [title, product] }, { to: "store:products", kind: "oneToMany", onDelete: "cascade", name: "منتج الملاحظة", lang: "ar" }, null)).toEqual({
      id: "product2",
      type: "relation",
      name: { ar: "منتج الملاحظة", en: "Product", he: "מוצר" },
      to: "store:products",
      many: true,
      exclusive: true,
    });
    expect(relationField({ fields: [] }, { to: "store:customers", kind: "oneToOne", onDelete: "unlink", name: "", lang: "he" }, null)).toEqual({ id: "customer", type: "relation", name: { ar: "الزبون", en: "Customer", he: "לקוח" }, to: "store:customers", exclusive: true });
  });

  const notes: Collection = { id: "c1", slug: "notes", name: { en: "Notes" }, templateId: null, items: 1, published: 0, createdAt: "", updatedAt: "", fields: [title, { id: "author", type: "relation", name: { en: "Author" }, to: "c2" }] };
  const authors: Collection = { id: "c2", slug: "authors", name: { en: "Authors" }, templateId: null, items: 2, published: 0, createdAt: "", updatedAt: "", fields: [{ id: "name", type: "text", name: { en: "Name" } }, { id: "best", type: "relation", name: { en: "Best note" }, to: "c1", exclusive: true }] };
  const orders: GridTable = { id: "$orders", slug: "orders", name: { en: "Orders" }, templateId: null, items: 4, published: 0, createdAt: "", updatedAt: "", readOnly: true, fields: [{ id: "customerName", type: "text", name: { en: "Customer" } }] };
  const ops = ["contains", "is", "empty", "notEmpty", "anyOf"] as never[];
  const meta: GridMeta = {
    ops: { text: ops, relation: ops, $slug: ops, $status: ops, $date: ops, $from: ops } as unknown as GridMeta["ops"],
    systemColumns: ["$slug", "$status", "$createdAt", "$updatedAt", "$publishedAt"],
    views: ["all", "draft", "published", "archived", "trash"],
    limits: { pageSize: 200, filters: 12, sorts: 3, search: 100, value: 200, anyOf: 30, rows: 50_000, importRows: 500, bulkIds: 500, trashDays: 30 },
    rules: {} as GridMeta["rules"],
    shapes: [],
  };
  const page: GridPage = { rows: [row({ title: { en: "First" } })], total: 1, page: 1, pageSize: 50, counts: { all: 1, draft: 1, published: 0, archived: 0, trash: 0 }, ms: 3 };
  function show(at = "/admin/data") {
    m.listCollections.mockResolvedValue([notes, authors]);
    m.gridMeta.mockResolvedValue(meta);
    m.getRows.mockResolvedValue(page);
    m.getStoreRows.mockResolvedValue({ ...page, rows: [] });
    m.storeTables.mockResolvedValue([orders]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[at]}>
          <DataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  test("the window: the relations as they stand, every table to link, the four kinds; saved as a new field", async () => {
    m.updateCollection.mockImplementation(async (_id: string, body: { fields: CollectionField[] }) => ({ ...notes, fields: body.fields }));
    show();
    fireEvent.click(await screen.findByTestId("relation-add"));
    const box = within(await screen.findByTestId("relation-dialog"));
    // What is there now: this table's own relation, and the one that links it from the other table.
    expect(box.getByTestId("relation-has-author").textContent).toBe("Author∞─1Authors· many to one");
    expect(box.getByTestId("relation-from-authors-best").textContent).toBe("Linked fromAuthors · Best note· one to one");
    // Every table: the owner's (this one too), then the store's.
    const to = box.getByTestId("relation-to") as HTMLSelectElement;
    expect([...to.querySelectorAll("optgroup")].map((g) => [g.label, [...g.querySelectorAll("option")].map((o) => o.textContent)])).toEqual([
      ["Your tables", ["Notes (this table)", "Authors"]],
      ["The store's tables", STORE_LINKS.map((s) => STORE_LINK_NAME[s].split("|")[1])],
    ]);
    // It begins with another of the owner's tables, many to one; all four kinds are there, drawn with both names.
    expect(to.value).toBe("c2");
    expect(LINK_KINDS.map((k) => box.getByTestId(`relation-kind-${k}`).getAttribute("aria-checked"))).toEqual(["true", "false", "false", "false"]);
    expect(box.getByTestId("relation-kind-oneToMany").textContent).toContain("Notes1─∞Authors");
    expect(box.getByTestId("relation-ondelete")).toBeTruthy();
    // One of the store's: nothing about deleting; the column is called by what it links.
    fireEvent.change(to, { target: { value: "store:products" } });
    expect(box.queryByTestId("relation-ondelete")).toBeNull();
    expect(box.getByTestId("relation-store-note").textContent).toContain("never changed from here");
    expect((box.getByTestId("relation-name") as HTMLInputElement).placeholder).toBe("Product");
    expect(box.getByTestId("relation-kind-oneToOne").textContent).toContain("Notes1─1The store's products");
    fireEvent.click(box.getByTestId("relation-kind-oneToOne"));
    fireEvent.click(screen.getByTestId("relation-save"));
    await waitFor(() => expect(m.updateCollection).toHaveBeenCalledTimes(1));
    expect(m.updateCollection).toHaveBeenCalledWith("c1", { slug: "notes", name: { en: "Notes" }, fields: [...notes.fields, { id: "product", type: "relation", name: { ar: "المنتج", en: "Product", he: "מוצר" }, to: "store:products", exclusive: true }] });
    // The window closes, the table and its rows are read again.
    await waitFor(() => expect(screen.queryByTestId("relation-dialog")).toBeNull());
    expect(m.toastOk).toHaveBeenCalledWith("The relation was added", { description: "Notes 1 ─ 1 The store's products" });
    await waitFor(() => expect(m.listCollections.mock.calls.length).toBeGreaterThan(1));
  });

  test("a refusal is said and the window stays; a typed name and what deleting does go with one of the owner's tables", async () => {
    m.updateCollection.mockRejectedValueOnce({ response: { data: { message: "Too many fields" } } });
    show();
    fireEvent.click(await screen.findByTestId("relation-add"));
    const box = within(await screen.findByTestId("relation-dialog"));
    fireEvent.change(box.getByTestId("relation-to"), { target: { value: "c1" } });
    fireEvent.change(box.getByTestId("relation-name"), { target: { value: "Follows" } });
    fireEvent.click(box.getByTestId("relation-kind-manyToMany"));
    fireEvent.change(box.getByTestId("relation-ondelete"), { target: { value: "restrict" } });
    fireEvent.click(screen.getByTestId("relation-save"));
    await waitFor(() => expect(m.toastError).toHaveBeenCalledTimes(1));
    expect(m.toastError.mock.calls[0][0]).toBe("The relation wasn't added");
    expect(screen.getByTestId("relation-dialog")).toBeTruthy();
    expect(m.updateCollection.mock.calls[0][1].fields.at(-1)).toEqual({ id: "notes", type: "relation", name: { en: "Follows" }, to: "c1", many: true, onDelete: "restrict" });
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("relation-dialog")).toBeNull();
  });

  test("the button is for whoever may change every table's fields, on the owner's tables only", async () => {
    m.may = new Set(["pages:read"]);
    show();
    await screen.findByTestId("data-grid");
    expect(screen.queryByTestId("relation-add")).toBeNull();
    cleanup();
    m.may = new Set(["pages:read", "pages:write", "orders:read"]);
    show("/admin/data?store=orders");
    await waitFor(() => expect(screen.getByTestId("data-grid").getAttribute("data-table")).toBe("orders"));
    expect(screen.queryByTestId("relation-add")).toBeNull();
  });
});
