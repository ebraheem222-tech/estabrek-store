import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { PageTreeNode } from "../api/pages.api";
import { accepts, idMaker } from "./columns";
import { insertOps, makeNode, type InsertCtx } from "./insert";
import { LIB_ITEMS, LIB_KINDS, isLibKind, libItemOf, makeLibNode } from "./library";
import { LibraryPanel } from "./LibraryPanel";
import { indexTree } from "./treeIndex";

afterEach(cleanup);

// The owner's theme library in the editor (docs/themes-library-plan.ar.md): the shop's list of pieces, read by path.
describe("the library's pieces", () => {
  it("are the shop's own list, each a kind of the Add panel", () => {
    expect(LIB_ITEMS.length).toBeGreaterThanOrEqual(11);
    expect(LIB_KINDS).toContain("lib:site-maison");
    for (const i of LIB_ITEMS) {
      expect(i.name.ar && i.name.en && i.name.he).toBeTruthy();
      expect(i.words.length).toBeGreaterThan(0);
      for (const h of i.hexes) expect(h).toMatch(/^[0-9a-f]{6}$/);
    }
    expect(isLibKind("lib:faq-classic")).toBe(true);
    expect(isLibKind("lib:nothing-like-it")).toBe(false);
    expect(isLibKind("faq-classic")).toBe(false);
  });

  it("a new piece is the item alone, named in the language being edited", () => {
    let n = 0;
    const ids = (p: string) => `${p}-${++n}`;
    expect(makeLibNode("lib:faq-classic", "ar", ids)).toEqual({ id: "lib-1", type: "lib", name: "أسئلة بأكورديون", props: { item: "faq-classic" } });
    expect(makeNode("lib:site-maison", "en", ids)).toMatchObject({ type: "lib", name: "Maison Lune: luxury fashion store", props: { item: "site-maison" } });
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

describe("a piece's panel", () => {
  const node = (props: Record<string, unknown>): PageTreeNode => ({ id: "lib1", type: "lib", props });
  const lastProps = (onOps: ReturnType<typeof vi.fn>) => (onOps.mock.calls.at(-1)![1] as Array<{ props: Record<string, unknown> }>)[0].props;

  it("changes a word in the language being edited, and the same words again put it back", () => {
    const onOps = vi.fn();
    const { rerender } = render(<LibraryPanel node={node({ item: "faq-classic" })} lang="ar" busy={false} onOps={onOps} />);
    const row = screen.getAllByTestId("studio-lib-word").find((el) => el.dataset.word === "Frequently asked questions")!;
    const box = within(row).getByRole("textbox");
    fireEvent.change(box, { target: { value: "أسئلة عن متجرنا" } });
    fireEvent.blur(box);
    expect(lastProps(onOps)).toEqual({ item: "faq-classic", words: { "Frequently asked questions": { ar: "أسئلة عن متجرنا" } } });
    // In English too, keeping the Arabic.
    rerender(<LibraryPanel node={node({ item: "faq-classic", words: { "Frequently asked questions": { ar: "أسئلة عن متجرنا" } } })} lang="en" busy={false} onOps={onOps} />);
    const en = within(screen.getAllByTestId("studio-lib-word").find((el) => el.dataset.word === "Frequently asked questions")!).getByRole("textbox");
    fireEvent.change(en, { target: { value: "Questions about our store" } });
    fireEvent.blur(en);
    expect(lastProps(onOps).words).toEqual({ "Frequently asked questions": { ar: "أسئلة عن متجرنا", en: "Questions about our store" } });
    // Emptied in Arabic, and only Arabic was there: the word is the library's again.
    rerender(<LibraryPanel node={node({ item: "faq-classic", words: { "Frequently asked questions": { ar: "أسئلة عن متجرنا" } } })} lang="ar" busy={false} onOps={onOps} />);
    const ar = within(screen.getAllByTestId("studio-lib-word").find((el) => el.dataset.word === "Frequently asked questions")!).getByRole("textbox");
    fireEvent.change(ar, { target: { value: "" } });
    fireEvent.blur(ar);
    expect(lastProps(onOps)).toEqual({ item: "faq-classic", words: undefined });
  });

  it("finds a word, and shows the changed ones first", () => {
    render(<LibraryPanel node={node({ item: "faq-classic", words: { "Is my data secure?": { en: "Safe?" } } })} lang="en" busy={false} onOps={vi.fn()} />);
    expect(screen.getAllByTestId("studio-lib-word")[0].dataset.word).toBe("Is my data secure?");
    fireEvent.change(screen.getByTestId("studio-lib-search"), { target: { value: "export" } });
    expect(screen.getAllByTestId("studio-lib-word").map((el) => el.dataset.word)).toEqual(["Can I export my data?"]);
  });

  it("a colour family from the theme or one colour; a colour as the library wrote it; the store's name", () => {
    const onOps = vi.fn();
    render(<LibraryPanel node={node({ item: "site-maison" })} lang="en" busy={false} onOps={onOps} />);
    expect(screen.getByTestId("studio-lib-brand")).toBeTruthy();
    // The made-up name isn't offered as a word: the store's name takes its place.
    expect(screen.queryAllByTestId("studio-lib-word").some((el) => el.dataset.word === "MAISON LUNE")).toBe(false);
    fireEvent.change(screen.getByTestId("studio-lib-brand"), { target: { value: "Noor Store" } });
    fireEvent.blur(screen.getByTestId("studio-lib-brand"));
    expect(lastProps(onOps).brand).toEqual({ en: "Noor Store" });
    const stone = screen.getAllByTestId("studio-lib-family").find((el) => el.dataset.family === "stone")!;
    fireEvent.click(within(stone).getByTestId("studio-lib-family-theme"));
    expect(lastProps(onOps).families).toEqual({ stone: "theme" });
    fireEvent.change(within(stone).getByTestId("studio-lib-family-colour"), { target: { value: "#16a34a" } });
    expect(lastProps(onOps).families).toEqual({ stone: "#16a34a" });
    const gold = screen.getAllByTestId("studio-lib-colour").find((el) => el.dataset.hex === "c8a75d")!;
    fireEvent.change(gold, { target: { value: "#2563eb" } });
    expect(lastProps(onOps).colours).toEqual({ c8a75d: "#2563eb" });
  });

  it("puts everything back in one click; a piece the library doesn't have says so", () => {
    const onOps = vi.fn();
    render(<LibraryPanel node={node({ item: "faq-classic", words: { General: { en: "All" } }, families: { indigo: "theme" } })} lang="en" busy={false} onOps={onOps} />);
    fireEvent.click(screen.getByTestId("studio-lib-reset"));
    expect(lastProps(onOps)).toEqual({ item: "faq-classic", words: undefined, colours: undefined, families: undefined, brand: undefined });
    cleanup();
    expect(libItemOf("gone")).toBeNull();
    render(<LibraryPanel node={node({ item: "gone" })} lang="en" busy={false} onOps={vi.fn()} />);
    expect(screen.queryByTestId("studio-lib-panel")).toBeNull();
  });
});
