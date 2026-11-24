import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { PageTreeNode } from "../api/pages.api";
import { accepts, idMaker } from "./columns";
import { insertOps, makeNode, type InsertCtx } from "./insert";
import { LIB_ITEMS, LIB_KINDS, isLibKind, libDetails, libItemOf, makeLibNode } from "./library";
import { LibraryPanel } from "./LibraryPanel";
import { LibraryShelf, libFilter } from "./LibraryBrowser";
import { indexTree } from "./treeIndex";

afterEach(cleanup);

// The owner's theme library in the editor (docs/themes-library-plan.ar.md): the shop's list of pieces, read by path.
describe("the library's pieces", () => {
  it("are the whole library: every kind named, every piece with its details", async () => {
    expect(LIB_ITEMS.length).toBeGreaterThanOrEqual(1000);
    const kinds = new Set(LIB_ITEMS.map((i) => i.kind));
    expect([...kinds].sort()).toEqual(LIB_KINDS.map(([k]) => k).sort());
    expect(LIB_ITEMS.filter((i) => i.kind === "site").length).toBe(260);
    for (const i of LIB_ITEMS) {
      expect(i.id).toMatch(/^[a-z][a-z0-9-]{1,60}$/);
      expect(i.name).toBeTruthy();
      expect(i.minH).toBeGreaterThan(0);
    }
    // A site's made-up name is the store's to replace, and not one of its words.
    const maison = libItemOf("site-maison")!;
    expect(maison.brand).toBe("Maison Lune");
    const d = (await libDetails("site-maison"))!;
    expect(d.words.length).toBeGreaterThan(50);
    expect(d.words).not.toContain("Maison Lune");
    for (const h of d.hexes) expect(h).toMatch(/^[0-9a-f]{6}$/);
    expect(await libDetails("nothing-like-it")).toBeNull();
    expect(isLibKind("lib:faq-classic")).toBe(true);
    expect(isLibKind("lib:nothing-like-it")).toBe(false);
    expect(isLibKind("faq-classic")).toBe(false);
  });

  it("a new piece is the item alone, named for the layers list", () => {
    let n = 0;
    const ids = (p: string) => `${p}-${++n}`;
    expect(makeLibNode("lib:faq-classic", "ar", ids)).toEqual({ id: "lib-1", type: "lib", name: "Classic Accordion", props: { item: "faq-classic" } });
    expect(makeNode("lib:site-maison", "en", ids)).toMatchObject({ type: "lib", name: "Maison Lune", props: { item: "site-maison" } });
    expect(makeLibNode("heading", "en", ids)).toBeNull();
  });

  it("goes straight on the page, as it is, never inside a section", () => {
    expect(accepts("page", "lib")).toBe(true);
    expect(accepts("section", "lib")).toBe(false);
    expect(accepts("lib", "heading")).toBe(false);
    const tree = { version: 1 as const, root: { id: "page", type: "page", props: {}, children: [
      { id: "sec1", type: "section", props: { contained: true }, children: [{ id: "h1", type: "heading", props: {} }] },
      { id: "lib1", type: "lib", props: { item: "faq-classic" } },
    ] as PageTreeNode[] } };
    const index = indexTree(tree);
    const ctx: InsertCtx = { index, up: new Map(), extras: new Map(), pageIndex: () => 0, ids: idMaker((x) => index.nodes.has(x)) };
    const piece = { id: "new", type: "lib", props: { item: "cta-conic" } };
    // Beside a heading inside a section: after that section, on the page.
    expect(insertOps(ctx, "h1", piece, "after")?.ops).toEqual([{ op: "insert", parentId: "page", index: 1, node: piece }]);
    expect(insertOps(ctx, "sec1", piece, "inside")).toBeNull();
    expect(insertOps(ctx, null, piece, "after")?.ops).toEqual([{ op: "insert", parentId: "page", index: 2, node: piece }]);
    // Something beside a piece goes on the page after it, in a section of its own.
    const r = insertOps(ctx, "lib1", { id: "t", type: "text", props: {} }, "after")!;
    expect(r.ops[0]).toMatchObject({ op: "insert", parentId: "page", index: 2, node: { type: "section", children: [{ id: "t" }] } });
    expect(insertOps(ctx, "lib1", { id: "t", type: "text", props: {} }, "inside")).toBeNull();
  });
});

describe("the library's browser", () => {
  it("shows a kind, a site category, or what a search finds across all of it", () => {
    expect(libFilter(LIB_ITEMS, "faq", "", "").length).toBe(50);
    const shopping = libFilter(LIB_ITEMS, "site", "Shopping", "");
    expect(shopping.length).toBeGreaterThan(10);
    expect(shopping.every((i) => i.kind === "site" && i.cat === "Shopping")).toBe(true);
    // A search looks in names, kinds, categories, descriptions and tags: everywhere (the browser), or in one kind.
    expect(libFilter(LIB_ITEMS, "all", "", "maison").map((i) => i.id)).toContain("site-maison");
    expect(libFilter(LIB_ITEMS, "all", "", "accordion").some((i) => i.id === "faq-classic")).toBe(true);
    expect(libFilter(LIB_ITEMS, "faq", "", "maison")).toEqual([]);
  });

  it("opens on the sites, moves between kinds and picks a piece", () => {
    const onPick = vi.fn();
    render(<LibraryShelf busy={false} onPick={onPick} pickLabel="Add" />);
    expect(screen.getAllByTestId("lib-card").every((el) => el.dataset.kind === "site")).toBe(true);
    expect(screen.getAllByTestId("lib-card")).toHaveLength(48);
    fireEvent.click(screen.getByTestId("lib-more"));
    expect(screen.getAllByTestId("lib-card")).toHaveLength(96);
    fireEvent.click(screen.getAllByTestId("lib-kind").find((el) => el.dataset.kind === "pricing")!);
    expect(screen.getAllByTestId("lib-card")).toHaveLength(48);
    expect(screen.getAllByTestId("lib-card").every((el) => el.dataset.kind === "pricing")).toBe(true);
    fireEvent.change(screen.getByTestId("lib-search"), { target: { value: "three tiers" } });
    const card = screen.getAllByTestId("lib-card").find((el) => el.dataset.item === "pricing-three-tiers")!;
    fireEvent.click(within(card).getByTestId("lib-pick"));
    expect(onPick).toHaveBeenCalledWith("pricing-three-tiers");
  });
});

describe("a piece's panel", () => {
  const node = (props: Record<string, unknown>): PageTreeNode => ({ id: "lib1", type: "lib", props });
  const lastProps = (onOps: ReturnType<typeof vi.fn>) => (onOps.mock.calls.at(-1)![1] as Array<{ props: Record<string, unknown> }>)[0].props;
  const wordBox = async (w: string) => within((await screen.findAllByTestId("studio-lib-word")).find((el) => el.dataset.word === w)!).getByRole("textbox");

  it("changes a word in the language being edited, and emptied it is the library's again", async () => {
    const onOps = vi.fn();
    const { rerender } = render(<LibraryPanel node={node({ item: "faq-classic" })} lang="ar" busy={false} onOps={onOps} />);
    const box = await wordBox("Frequently asked questions");
    fireEvent.change(box, { target: { value: "أسئلة عن متجرنا" } });
    fireEvent.blur(box);
    expect(lastProps(onOps)).toEqual({ item: "faq-classic", words: { "Frequently asked questions": { ar: "أسئلة عن متجرنا" } } });
    // In English too, keeping the Arabic.
    rerender(<LibraryPanel node={node({ item: "faq-classic", words: { "Frequently asked questions": { ar: "أسئلة عن متجرنا" } } })} lang="en" busy={false} onOps={onOps} />);
    const en = await wordBox("Frequently asked questions");
    fireEvent.change(en, { target: { value: "Questions about our store" } });
    fireEvent.blur(en);
    expect(lastProps(onOps).words).toEqual({ "Frequently asked questions": { ar: "أسئلة عن متجرنا", en: "Questions about our store" } });
    rerender(<LibraryPanel node={node({ item: "faq-classic", words: { "Frequently asked questions": { ar: "أسئلة عن متجرنا" } } })} lang="ar" busy={false} onOps={onOps} />);
    const ar = await wordBox("Frequently asked questions");
    fireEvent.change(ar, { target: { value: "" } });
    fireEvent.blur(ar);
    expect(lastProps(onOps)).toEqual({ item: "faq-classic", words: undefined });
  });

  it("finds a word, and shows the changed ones first", async () => {
    render(<LibraryPanel node={node({ item: "faq-classic", words: { "Is my data secure?": { en: "Safe?" } } })} lang="en" busy={false} onOps={vi.fn()} />);
    expect((await screen.findAllByTestId("studio-lib-word"))[0].dataset.word).toBe("Is my data secure?");
    fireEvent.change(screen.getByTestId("studio-lib-search"), { target: { value: "export" } });
    expect(screen.getAllByTestId("studio-lib-word").map((el) => el.dataset.word)).toEqual(["Can I export my data?"]);
  });

  it("a colour family from the theme or one colour; a colour as the library wrote it; the store's name", async () => {
    const onOps = vi.fn();
    render(<LibraryPanel node={node({ item: "site-maison" })} lang="en" busy={false} onOps={onOps} />);
    expect(screen.getByTestId("studio-lib-brand")).toBeTruthy();
    fireEvent.change(screen.getByTestId("studio-lib-brand"), { target: { value: "Noor Store" } });
    fireEvent.blur(screen.getByTestId("studio-lib-brand"));
    expect(lastProps(onOps).brand).toEqual({ en: "Noor Store" });
    const stone = (await screen.findAllByTestId("studio-lib-family")).find((el) => el.dataset.family === "stone")!;
    fireEvent.click(within(stone).getByTestId("studio-lib-family-theme"));
    expect(lastProps(onOps).families).toEqual({ stone: "theme" });
    fireEvent.change(within(stone).getByTestId("studio-lib-family-colour"), { target: { value: "#16a34a" } });
    expect(lastProps(onOps).families).toEqual({ stone: "#16a34a" });
    const gold = screen.getAllByTestId("studio-lib-colour").find((el) => el.dataset.hex === "c8a75d")!;
    fireEvent.change(gold, { target: { value: "#2563eb" } });
    expect(lastProps(onOps).colours).toEqual({ c8a75d: "#2563eb" });
  });

  it("turns a piece right to left, and back as it was made", () => {
    const onOps = vi.fn();
    const { rerender } = render(<LibraryPanel node={node({ item: "faq-classic" })} lang="ar" busy={false} onOps={onOps} />);
    const dir = screen.getByTestId("studio-lib-dir");
    expect(within(dir).getByRole("button", { pressed: true }).dataset.dir).toBe("ltr");
    fireEvent.click(dir.querySelector('[data-dir="rtl"]')!);
    expect(lastProps(onOps)).toEqual({ item: "faq-classic", dir: "rtl" });
    rerender(<LibraryPanel node={node({ item: "faq-classic", dir: "rtl" })} lang="ar" busy={false} onOps={onOps} />);
    fireEvent.click(screen.getByTestId("studio-lib-dir").querySelector('[data-dir="ltr"]')!);
    expect(lastProps(onOps)).toEqual({ item: "faq-classic", dir: undefined });
  });

  it("puts everything back in one click; a piece the library doesn't have says so", () => {
    const onOps = vi.fn();
    render(<LibraryPanel node={node({ item: "faq-classic", words: { General: { en: "All" } }, families: { indigo: "theme" } })} lang="en" busy={false} onOps={onOps} />);
    fireEvent.click(screen.getByTestId("studio-lib-reset"));
    expect(lastProps(onOps)).toEqual({ item: "faq-classic", words: undefined, colours: undefined, families: undefined, brand: undefined, dir: undefined });
    cleanup();
    expect(libItemOf("gone")).toBeNull();
    render(<LibraryPanel node={node({ item: "gone" })} lang="en" busy={false} onOps={vi.fn()} />);
    expect(screen.queryByTestId("studio-lib-panel")).toBeNull();
  });
});
