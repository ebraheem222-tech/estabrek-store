// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";
import { ElementPanel } from "./StudioTreePanels";

afterEach(() => { cleanup(); setLangForTests("ar"); });

const CATEGORIES = [{ id: "c-dresses", name: "Dresses", slug: "dresses" }, { id: "c-scarves", name: "Scarves", slug: "scarves" }, { id: "c-bags", name: "Bags", slug: "bags" }];
const PRODUCTS = [
  { id: "p-rose", title: "Rose dress", slug: "rose-dress", isActive: true, categoryId: "c-dresses" },
  { id: "p-silk", title: "Silk scarf", slug: "silk-scarf", isActive: true, categoryId: "c-scarves" },
  { id: "p-tote", title: "Canvas tote", slug: "canvas-tote", isActive: true, categoryId: "c-bags" },
];

/** The element's panel over a node that keeps what it saves, with the store's catalog already read. */
function open(start: PageTreeNode) {
  setLangForTests("en");
  const client = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  client.setQueryData(["catalog", "categories"], CATEGORIES);
  client.setQueryData(["catalog", "products", "active"], PRODUCTS);
  let last = start;
  function Harness() {
    const [node, setNode] = useState(start);
    return <ElementPanel node={node} lang="en" busy={false} onOps={(_l, ops) => { const op = ops[0]; if (op.op === "setProps") { last = { ...node, props: JSON.parse(JSON.stringify(op.props)) }; setNode(last); } }} />;
  }
  render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  return () => last.props as Record<string, unknown>;
}
const choose = (group: string, value: string) => fireEvent.click(within(screen.getByTestId(group)).getAllByRole("button").find((b) => b.getAttribute("data-value") === value)!);

describe("which products a products block shows", () => {
  const block: PageTreeNode = { id: "prod", type: "products", props: { source: "new", limit: 8, layout: "grid" } } as PageTreeNode;

  it("the newest, the best sellers, a category's or picked by hand", () => {
    open(block);
    expect(within(screen.getByTestId("studio-products-source")).getAllByRole("button").map((b) => b.getAttribute("data-value"))).toEqual(["new", "best", "category", "picked"]);
    expect(screen.queryByTestId("studio-products-category")).toBeNull();
    expect(screen.queryByTestId("studio-products-picked")).toBeNull();
  });

  it("from a category: the store's categories are listed, the first is taken until another is chosen", () => {
    const props = open(block);
    choose("studio-products-source", "category");
    expect(props()).toMatchObject({ source: "category", categoryId: "c-dresses" });
    const list = screen.getByTestId("studio-products-category") as HTMLSelectElement;
    expect([...list.options].map((o) => o.textContent)).toEqual(["Choose a category", "Dresses", "Scarves", "Bags"]);
    fireEvent.change(list, { target: { value: "c-bags" } });
    expect(props().categoryId).toBe("c-bags");
  });

  it("picked by hand: found by name, kept in their order, moved earlier and taken off; as many show as were picked", () => {
    const props = open(block);
    choose("studio-products-source", "picked");
    expect(props().source).toBe("picked");
    fireEvent.change(screen.getByTestId("studio-products-find"), { target: { value: "scarf" } });
    expect(screen.getAllByTestId("studio-products-pick").map((b) => b.getAttribute("data-product"))).toEqual(["p-silk"]);
    fireEvent.click(screen.getByTestId("studio-products-pick"));
    expect(props()).toMatchObject({ source: "picked", productIds: ["p-silk"], limit: 1 });
    fireEvent.change(screen.getByTestId("studio-products-find"), { target: { value: "" } });
    // What's picked already isn't offered again.
    expect(screen.getAllByTestId("studio-products-pick").map((b) => b.getAttribute("data-product"))).toEqual(["p-rose", "p-tote"]);
    fireEvent.click(screen.getAllByTestId("studio-products-pick")[1]);
    expect(props()).toMatchObject({ productIds: ["p-silk", "p-tote"], limit: 2 });
    // The second one earlier.
    fireEvent.click(within(screen.getByTestId("studio-products-picked")).getAllByRole("button", { name: "Earlier" })[1]);
    expect(props().productIds).toEqual(["p-tote", "p-silk"]);
    fireEvent.click(screen.getAllByTestId("studio-products-unpick")[0]);
    expect(props().productIds).toEqual(["p-silk"]);
    expect(screen.getByTestId("studio-products-picked").textContent).toContain("Silk scarf");
  });

  it("a category page's own category stays offered when the design asks for it", () => {
    open({ ...block, props: { source: "category", categoryId: "current", limit: 8 } } as PageTreeNode);
    const list = screen.getByTestId("studio-products-category") as HTMLSelectElement;
    expect(list.value).toBe("current");
  });
});

describe("which categories a categories block shows", () => {
  const block: PageTreeNode = { id: "cats", type: "categories", props: { limit: 6 } } as PageTreeNode;

  it("all of them, or only the ones ticked; back to all clears the list", () => {
    const props = open(block);
    expect(screen.queryByTestId("studio-categories-list")).toBeNull();
    choose("studio-categories-which", "some");
    const boxes = () => [...screen.getByTestId("studio-categories-list").querySelectorAll<HTMLInputElement>("input[type=checkbox]")];
    expect(boxes().map((b) => b.getAttribute("data-category"))).toEqual(["c-dresses", "c-scarves", "c-bags"]);
    fireEvent.click(boxes()[1]);
    fireEvent.click(boxes()[2]);
    expect(props().ids).toEqual(["c-scarves", "c-bags"]);
    fireEvent.click(boxes()[1]);
    expect(props().ids).toEqual(["c-bags"]);
    choose("studio-categories-which", "all");
    expect(props().ids).toBeUndefined();
    expect(screen.queryByTestId("studio-categories-list")).toBeNull();
  });
});

describe("a heading's level", () => {
  it("every level the page takes, from 1 to 6", () => {
    const props = open({ id: "h", type: "heading", props: { text: { en: "Hello" }, level: 2 } } as PageTreeNode);
    for (const level of ["5", "6"]) {
      fireEvent.click(screen.getByRole("button", { name: `H${level}` }));
      expect(props().level).toBe(Number(level));
    }
  });
});
