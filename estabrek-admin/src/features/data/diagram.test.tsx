// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Collection, CollectionField } from "../../api/collections.api";

// The relations diagram: the tables as cards and the relations as lines (the pure parts), then the
// page itself over a stand-in API: cards, lines, a line read in words, a card moved and its place
// remembered, and a relation added by pulling a line from one table to another.

const m = vi.hoisted(() => ({
  may: new Set<string>(),
  listCollections: vi.fn(),
  updateCollection: vi.fn(),
  storeTables: vi.fn(),
  toastOk: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));
vi.mock("../../api/collections.api", () => ({ listCollections: m.listCollections, updateCollection: m.updateCollection }));
vi.mock("../../api/data.api", () => ({ storeTables: m.storeTables, lookupRows: vi.fn() }));
vi.mock("../../lib/toast", () => ({ toast: { success: m.toastOk, error: m.toastError, info: vi.fn() } }));
vi.mock("../../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));

import { setLangForTests } from "../../lib/lang";
import { CARD, autoLayout, diagramOf, edgeLine, extent, readPlaces } from "./diagram";
import RelationsDiagramPage from "./RelationsDiagramPage";
import { STORE_LINKS } from "./storeLinks";

const text = (id: string, name: string): CollectionField => ({ id, type: "text", name: { en: name } });
const table = (id: string, slug: string, name: string, fields: CollectionField[], items = 0): Collection => ({ id, slug, name: { en: name, ar: `${name} بالعربي` }, fields, templateId: null, items, published: 0, createdAt: "", updatedAt: "" });
// Books link an author (many books an author) and several tags; an author has one best book; a note is about a store product and one order only.
const authors = table("a1", "authors", "Authors", [text("name", "Name"), { id: "best", type: "relation", name: { en: "Best book" }, to: "b1", exclusive: true }], 2);
const books = table("b1", "books", "Books", [text("title", "Title"), { id: "author", type: "relation", name: { en: "Author" }, to: "a1", onDelete: "restrict" }, { id: "tags", type: "relation", to: "t1", many: true }], 5);
const tags = table("t1", "tags", "Tags", [text("label", "Label"), { id: "parent", type: "relation", name: { en: "Parent" }, to: "t1" }]);
const notes = table("n1", "notes", "Notes", [text("title", "Title"), { id: "about", type: "relation", name: { en: "About" }, to: "store:products" }, { id: "order", type: "relation", to: "store:orders", exclusive: true }, { id: "gone", type: "relation", to: "deleted-table" }]);
const ALL = [authors, books, tags, notes];

beforeEach(() => {
  setLangForTests("en");
  m.may = new Set(["pages:read", "pages:write"]);
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
  vi.clearAllMocks();
});

describe("The diagram's cards and lines", () => {
  test("a card for each table, its fields by kind, a relation marked with both sides; a line for each relation", () => {
    const d = diagramOf(ALL, "en");
    expect(d.nodes.map((n) => [n.id, n.store, n.name, n.items, n.rows.length])).toEqual([
      ["a1", false, "Authors", 2, 2],
      ["b1", false, "Books", 5, 3],
      ["t1", false, "Tags", 0, 2],
      ["n1", false, "Notes", 0, 4],
      // The store's: only the ones something links, in the grid's order, by name alone.
      ["store:products", true, "The store's products", undefined, 0],
      ["store:orders", true, "The store's orders", undefined, 0],
    ]);
    const book = d.nodes[1];
    expect(book.rows).toEqual([
      { id: "title", name: "Title", kind: "Short words" },
      { id: "author", name: "Author", kind: "Link to a table", to: "a1", marks: ["∞", "1"] },
      { id: "tags", name: "tags", kind: "Link to a table", to: "t1", marks: ["∞", "∞"] },
    ]);
    expect([book.w, book.h]).toEqual([CARD.width, CARD.head + 3 * CARD.row + CARD.foot]);
    expect(d.nodes[4].h).toBe(CARD.head);
    // A relation to a table that is gone: said on its row, and no line.
    expect(d.nodes[3].rows[3]).toMatchObject({ id: "gone", to: null });
    expect(d.edges.map((e) => [e.id, e.to, e.kind, e.onDelete, e.row, e.fieldName])).toEqual([
      ["a1.best", "b1", "oneToOne", "unlink", 1, "Best book"],
      ["b1.author", "a1", "manyToOne", "restrict", 1, "Author"],
      ["b1.tags", "t1", "manyToMany", "unlink", 2, "tags"],
      ["t1.parent", "t1", "manyToOne", "unlink", 1, "Parent"],
      ["n1.about", "store:products", "manyToOne", "unlink", 1, "About"],
      ["n1.order", "store:orders", "oneToOne", "unlink", 2, "order"],
    ]);
    // In the page's language.
    expect(diagramOf([authors], "ar").nodes[0].name).toBe("Authors بالعربي");
    expect(diagramOf(ALL, "ar").nodes[4].name).toBe("منتجات المتجر");
    // Every store table on request, with how many rows each holds where that is known.
    const all = diagramOf(ALL, "en", { allStore: true, counts: { products: 12, coupons: 3 } });
    expect(all.nodes.filter((n) => n.store).map((n) => n.slug)).toEqual([...STORE_LINKS]);
    expect(all.nodes.filter((n) => n.items !== undefined && n.store).map((n) => [n.slug, n.items])).toEqual([["products", 12], ["coupons", 3]]);
    // A long table: the first twelve fields, then how many more; a relation among those isn't lost.
    const many = table("m1", "many", "Many", [...Array.from({ length: 14 }, (_, i) => text(`f${i}`, `F${i}`)), { id: "late", type: "relation", to: "a1" }]);
    const long = diagramOf([many, authors], "en");
    expect([long.nodes[0].rows.length, long.nodes[0].more, long.nodes[0].h]).toEqual([12, 3, CARD.head + 13 * CARD.row + CARD.foot]);
    expect(long.edges[0]).toMatchObject({ id: "m1.late", row: -1 });
    expect(diagramOf([], "en")).toEqual({ nodes: [], edges: [] });
  });

  test("where the cards stand to begin with: who links before who is linked, the store's last; mirrored where the page reads right to left", () => {
    const d = diagramOf(ALL, "en");
    const at = autoLayout(d);
    const step = CARD.width + CARD.gapX;
    const column = (id: string) => (at[id].x - CARD.margin) / step;
    // Books link authors and tags; authors link a book back (a ring: the line that closes it runs backward); notes link only the store.
    expect(["a1", "b1", "t1", "n1", "store:products", "store:orders"].map(column)).toEqual([1, 0, 1, 0, 2, 2]);
    // In one column: one under the other, a gap between.
    expect(at.n1.y).toBe(at.b1.y + d.nodes[1].h + CARD.gapY);
    expect(at.t1.y).toBe(at.a1.y + d.nodes[0].h + CARD.gapY);
    expect(at["store:orders"].y).toBe(CARD.margin + CARD.head + CARD.gapY);
    expect(Object.keys(at)).toHaveLength(d.nodes.length);
    // Right to left: the same columns from the other side, nothing off the canvas.
    const rtl = autoLayout(d, { rtl: true });
    expect(rtl.b1.x).toBe(at["store:products"].x);
    expect(rtl["store:products"].x).toBe(at.b1.x);
    expect(rtl.a1.x).toBe(at.a1.x);
    expect(rtl.b1.y).toBe(at.b1.y);
    expect(Math.min(...Object.values(rtl).map((p) => p.x))).toBe(CARD.margin);
    // Every store table: columns of eight.
    const all = diagramOf([authors], "en", { allStore: true });
    const places = autoLayout(all);
    expect([...new Set(all.nodes.filter((n) => n.store).map((n) => (places[n.id].x - CARD.margin) / step))]).toEqual([1, 2, 3]);
    expect(extent(d.nodes, at)).toEqual({ w: at["store:products"].x + CARD.width + CARD.margin + 160, h: at.n1.y + d.nodes[3].h + CARD.margin + 160 });
    expect(extent([], {})).toEqual({ w: CARD.margin + 160, h: CARD.margin + 160 });
  });

  test("a relation's line: from its row to the linked card's head, on the sides that face each other", () => {
    const d = diagramOf(ALL, "en");
    const [a, b, t] = d.nodes;
    const pa = { x: 100, y: 100 };
    const pb = { x: 500, y: 300 };
    // Forward: out of the right edge at the row's height, into the other's left edge at its head.
    const fwd = edgeLine(d.edges[0], a, pa, b, pb);
    expect(fwd.start).toEqual({ x: 100 + CARD.width, y: 100 + CARD.head + 1 * CARD.row + CARD.row / 2 });
    expect(fwd.end).toEqual({ x: 500, y: 300 + CARD.head / 2 });
    expect(fwd.d.startsWith(`M ${100 + CARD.width} ${fwd.start.y} C `)).toBe(true);
    expect([fwd.markA.x > fwd.start.x, fwd.markB.x < fwd.end.x]).toEqual([true, true]);
    // Backward: the other sides.
    const back = edgeLine(d.edges[1], b, pb, a, pa);
    expect([back.start.x, back.end.x]).toEqual([500, 100 + CARD.width]);
    // One above the other: out and in on the same side.
    const stacked = edgeLine(d.edges[0], a, pa, b, { x: 120, y: 400 });
    expect([stacked.start.x, stacked.end.x]).toEqual([100 + CARD.width, 120 + CARD.width]);
    // Its own table: a loop out of the side and back to the head.
    const self = edgeLine(d.edges[3], t, pa, t, pa);
    expect([self.start.x, self.end.x, self.end.y]).toEqual([100 + CARD.width, 100 + CARD.width, 100 + CARD.head / 2]);
    expect(self.mid.x).toBeGreaterThan(100 + CARD.width);
    // Several lines into one card are spread along its head, never past it.
    const ys = [0, 1, 2].map((i) => edgeLine(d.edges[0], a, pa, b, pb, i, 3).end.y);
    expect(ys).toEqual([300 + CARD.head / 2 - 9, 300 + CARD.head / 2, 300 + CARD.head / 2 + 9]);
    expect(edgeLine(d.edges[0], a, pa, b, pb, 0, 40).end.y).toBe(300 + 8);
    // A relation among the fields that aren't shown leaves from the "more" row.
    expect(edgeLine({ row: -1, from: "a1", to: "b1" }, a, pa, b, pb).start.y).toBe(100 + CARD.head + 2 * CARD.row + CARD.row / 2);
  });

  test("the places as they were left are read back, and nothing else", () => {
    expect(readPlaces(JSON.stringify({ pos: { a1: { x: 10, y: 20 }, b1: { x: -5, y: "x" }, c1: { x: -4, y: 7 } }, allStore: true }))).toEqual({ pos: { a1: { x: 10, y: 20 }, c1: { x: 0, y: 7 } }, allStore: true });
    for (const junk of [null, "", "not json", "[]", "{\"pos\":5}"]) expect(readPlaces(junk)).toEqual({ pos: {}, allStore: false });
  });
});

describe("The diagram page", () => {
  function show(list: Collection[] = ALL) {
    m.listCollections.mockResolvedValue(list);
    m.storeTables.mockResolvedValue([{ id: "$products", slug: "products", name: { en: "Products" }, items: 12, readOnly: true, fields: [] }]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/admin/data/diagram"]}>
          <RelationsDiagramPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }
  const pointer = (type: string, x: number, y: number) => new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  const place = (id: string) => {
    const el = screen.getByTestId(id);
    return [parseFloat(el.style.left), parseFloat(el.style.top)];
  };

  test("the tables as cards and the relations as lines; every store table on request", async () => {
    show();
    const canvas = await screen.findByTestId("diagram-canvas");
    expect([canvas.getAttribute("data-tables"), canvas.getAttribute("data-relations")]).toEqual(["6", "6"]);
    expect(screen.getByTestId("node-books").textContent).toContain("Books");
    expect(screen.getByTestId("node-books").textContent).toContain("Your table · 5 rows");
    await waitFor(() => expect(screen.getByTestId("node-store-products").textContent).toBe("The store's productsA store table · 12 rows↗"));
    expect(screen.getByTestId("row-books-author").textContent).toBe("Author∞ ─ 1");
    expect(screen.getByTestId("row-books-title").textContent).toBe("TitleShort words");
    expect(screen.getByTestId("row-notes-gone").textContent).toBe("gone?");
    expect(screen.getByTestId("edge-books-author").getAttribute("data-to")).toBe("a1");
    expect(screen.getByTestId("edge-notes-about").getAttribute("d")).toMatch(/^M [\d.]+ [\d.]+ C /);
    expect((screen.getByTestId("open-books") as HTMLAnchorElement).getAttribute("href")).toBe("/admin/data?table=books");
    expect((screen.getByTestId("open-store-products") as HTMLAnchorElement).getAttribute("href")).toBe("/admin/data?store=products");
    expect(screen.queryByTestId("node-store-coupons")).toBeNull();
    fireEvent.click(screen.getByTestId("diagram-all-store"));
    expect(screen.getByTestId("node-store-coupons")).toBeTruthy();
    expect(screen.getByTestId("diagram-canvas").getAttribute("data-tables")).toBe(String(4 + STORE_LINKS.length));
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("estabrek.diagram.v1")!).allStore).toBe(true));
    // Zoom.
    fireEvent.click(screen.getByTestId("diagram-zoom-out"));
    expect(screen.getByTestId("diagram-zoom").textContent).toBe("80%");
    fireEvent.click(screen.getByTestId("diagram-zoom-in"));
    fireEvent.click(screen.getByTestId("diagram-zoom-in"));
    expect([screen.getByTestId("diagram-zoom").textContent, (screen.getByTestId("diagram-zoom-in") as HTMLButtonElement).disabled]).toEqual(["125%", true]);
  });

  test("a line is pressed to read the relation in words, with the ways to its tables", async () => {
    show();
    fireEvent.click(await screen.findByTestId("edge-hit-books-author"));
    const box = within(screen.getByTestId("edge-details"));
    expect(screen.getByTestId("edge-details").textContent).toContain("Books∞─1Authors");
    expect(screen.getByTestId("edge-details").textContent).toContain("Field: Author · many to one");
    expect(screen.getByTestId("edge-details").textContent).toContain("When the linked row is deleted: It can't be deleted while rows link it.");
    expect([box.getByTestId("edge-open-from").getAttribute("href"), box.getByTestId("edge-open-to").getAttribute("href"), box.getByTestId("edge-edit").getAttribute("href")]).toEqual(["/admin/data?table=books", "/admin/data?table=authors", "/admin/collections"]);
    // Another line: a store table says what deleting does there.
    fireEvent.click(screen.getByTestId("edge-hit-notes-order"));
    expect(screen.getByTestId("edge-details").textContent).toContain("Notes1─1The store's orders");
    expect(screen.getByTestId("edge-details").textContent).toContain("If the store's row is deleted, the link is dropped.");
    expect(within(screen.getByTestId("edge-details")).getByTestId("edge-open-to").getAttribute("href")).toBe("/admin/data?store=orders");
    // Pressed again, or closed: gone.
    fireEvent.click(screen.getByTestId("edge-hit-notes-order"));
    expect(screen.queryByTestId("edge-details")).toBeNull();
    fireEvent.click(screen.getByTestId("edge-hit-t1-parent".replace("t1", "tags")));
    fireEvent.click(screen.getByTestId("edge-close"));
    expect(screen.queryByTestId("edge-details")).toBeNull();
  });

  test("a card is moved by its head; its place is kept on this device, and given back by 'arrange'", async () => {
    const { unmount } = show();
    await screen.findByTestId("node-books");
    const was = place("node-books");
    expect((screen.getByTestId("diagram-arrange") as HTMLButtonElement).disabled).toBe(true);
    fireEvent(screen.getByTestId("head-books"), pointer("pointerdown", 400, 300));
    fireEvent(window, pointer("pointermove", 460, 345));
    fireEvent(window, pointer("pointerup", 460, 345));
    expect(place("node-books")).toEqual([was[0] + 60, was[1] + 45]);
    // Let go: moving the pointer moves nothing any more.
    fireEvent(window, pointer("pointermove", 900, 900));
    expect(place("node-books")).toEqual([was[0] + 60, was[1] + 45]);
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("estabrek.diagram.v1")!).pos.b1).toEqual({ x: was[0] + 60, y: was[1] + 45 }));
    // Its line follows it.
    const line = screen.getByTestId("edge-books-author").getAttribute("d");
    // Opened again: where it was left.
    unmount();
    show();
    await screen.findByTestId("node-books");
    expect(place("node-books")).toEqual([was[0] + 60, was[1] + 45]);
    expect(screen.getByTestId("edge-books-author").getAttribute("d")).toBe(line);
    fireEvent.click(screen.getByTestId("diagram-arrange"));
    expect(place("node-books")).toEqual(was);
    expect(screen.getByTestId("edge-books-author").getAttribute("d")).not.toBe(line);
    // Pressing the card's link to its grid isn't a move.
    fireEvent(screen.getByTestId("open-books"), pointer("pointerdown", 10, 10));
    fireEvent(window, pointer("pointermove", 300, 300));
    fireEvent(window, pointer("pointerup", 300, 300));
    expect(place("node-books")).toEqual(was);
  });

  test("a relation is added by pulling a line from a table's ＋ to another card; pressed, the window opens as on the Tables page", async () => {
    m.updateCollection.mockImplementation(async (_id: string, body: { fields: CollectionField[] }) => ({ ...tags, fields: body.fields }));
    show();
    // Pulled from Tags onto the store's products.
    fireEvent(await screen.findByTestId("link-tags"), pointer("pointerdown", 100, 100));
    expect(screen.queryByTestId("diagram-pull")).toBeNull();
    fireEvent(window, pointer("pointermove", 180, 160));
    expect([screen.getByTestId("diagram-pull").getAttribute("x2"), screen.getByTestId("diagram-pull").getAttribute("y2")]).toEqual(["180", "160"]);
    fireEvent(screen.getByTestId("node-store-products"), pointer("pointerup", 600, 200));
    expect(screen.queryByTestId("diagram-pull")).toBeNull();
    const box = within(await screen.findByTestId("relation-dialog"));
    expect((box.getByTestId("relation-to") as HTMLSelectElement).value).toBe("store:products");
    expect(box.getByTestId("relation-kind-manyToOne").textContent).toContain("Tags∞─1The store's products");
    fireEvent.click(box.getByTestId("relation-kind-manyToMany"));
    fireEvent.click(screen.getByTestId("relation-save"));
    await waitFor(() => expect(m.updateCollection).toHaveBeenCalledTimes(1));
    expect(m.updateCollection.mock.calls[0][0]).toBe("t1");
    expect(m.updateCollection.mock.calls[0][1].fields.at(-1)).toEqual({ id: "product", type: "relation", name: { ar: "المنتج", en: "Product", he: "מוצר" }, to: "store:products", many: true });
    // The window closes and the tables are read again (the new line is drawn from them).
    await waitFor(() => expect(screen.queryByTestId("relation-dialog")).toBeNull());
    await waitFor(() => expect(m.listCollections.mock.calls.length).toBeGreaterThan(1));
    // Pulled onto one of the owner's tables.
    fireEvent(screen.getByTestId("link-notes"), pointer("pointerdown", 100, 100));
    fireEvent(window, pointer("pointermove", 140, 140));
    fireEvent(screen.getByTestId("row-authors-name"), pointer("pointerup", 300, 300));
    expect((within(await screen.findByTestId("relation-dialog")).getByTestId("relation-to") as HTMLSelectElement).value).toBe("a1");
    fireEvent.click(screen.getByText("Close"));
    // Pulled into the open: nothing.
    fireEvent(screen.getByTestId("link-notes"), pointer("pointerdown", 100, 100));
    fireEvent(window, pointer("pointermove", 400, 400));
    fireEvent(screen.getByTestId("diagram-canvas"), pointer("pointerup", 400, 400));
    expect(screen.queryByTestId("relation-dialog")).toBeNull();
    // Pressed without a pull (or Enter on it): the window, with the first table to link.
    fireEvent(screen.getByTestId("link-notes"), pointer("pointerdown", 100, 100));
    fireEvent(window, pointer("pointerup", 101, 100));
    expect((within(await screen.findByTestId("relation-dialog")).getByTestId("relation-to") as HTMLSelectElement).value).toBe("a1");
    fireEvent.click(screen.getByText("Close"));
    fireEvent.keyDown(screen.getByTestId("link-books"), { key: "Enter" });
    expect(await screen.findByTestId("relation-dialog")).toBeTruthy();
  });

  test("who may only look: no ＋ and no way to the fields; no tables yet: said", async () => {
    m.may = new Set(["pages:read"]);
    const { unmount } = show();
    await screen.findByTestId("node-books");
    expect(screen.queryByTestId("link-books")).toBeNull();
    fireEvent.click(screen.getByTestId("edge-hit-books-author"));
    expect(screen.getByTestId("edge-details")).toBeTruthy();
    expect(screen.queryByTestId("edge-edit")).toBeNull();
    expect(screen.getByTestId("diagram-back").getAttribute("href")).toBe("/admin/data");
    unmount();
    show([]);
    expect(await screen.findByTestId("diagram-empty")).toBeTruthy();
    expect(screen.queryByTestId("diagram-canvas")).toBeNull();
  });
});
