import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PageDraft, PageDraftOp, PageTreeNode } from "../api/pages.api";
import { ContentBlocksPanel } from "./ContentBlocksPanel";
import { simulate, undoOf } from "./draft";

afterEach(cleanup);
function Editor({ node }: { node: PageTreeNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { enabled: false } } }));
  const [state, setState] = useState<PageDraft>({ version: 1, rev: 1, baseHash: "x", sections: [], trash: [], startedAt: "", updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [node] }] } } });
  const [undo, setUndo] = useState<PageDraftOp[]>([]);
  const shown = state.tree.root.children![0].children![0];
  return <QueryClientProvider client={client}><ContentBlocksPanel node={shown} lang="en" busy={false} onOps={(_, ops) => { setUndo(undoOf(ops, state, "en")); setState(ops.reduce(simulate, state)); }} /><button onClick={() => setState(undo.reduce(simulate, state))}>Undo</button><output data-testid="props">{JSON.stringify(shown.props)}</output></QueryClientProvider>;
}
const props = () => JSON.parse(screen.getByTestId("props").textContent!);
const edit = (id: string, value: string) => { fireEvent.change(screen.getByTestId(id), { target: { value } }); fireEvent.blur(screen.getByTestId(id)); };
const gallery: PageTreeNode = { id: "gallery", type: "filterGallery", props: { items: [{ title: { en: "First", he: "ראשון" }, image: "/one.svg", category: { en: "Art", he: "אמנות" } }, { title: { en: "Second" }, image: "/two.svg" }] } };

describe("gallery and billing editor", () => {
  it("edits localized categories, preserves other languages, reorders and undoes", () => {
    render(<Editor node={gallery} />);
    edit("block-item-category", "Design");
    expect(props().items[0].category).toEqual({ en: "Design", he: "אמנות" });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(props().items[0].category.en).toBe("Art");
    fireEvent.click(screen.getAllByLabelText(/Down|لتحت/)[0]);
    expect(props().items.map((item: { title: { en: string } }) => item.title.en)).toEqual(["Second", "First"]);
    fireEvent.click(screen.getAllByTestId("block-item-remove")[1]);
    expect(screen.getByTestId("block-item-remove")).toBeDisabled();
  });

  it("saves every gallery setting through reversible operations", () => {
    render(<Editor node={gallery} />);
    for (const [key, value] of [["layout", "split"], ["hoverEffect", "reveal"], ["activation", "hover"]]) {
      fireEvent.click(screen.getByTestId(`filterGallery-${key}`).querySelector(`[data-value="${value}"]`)!);
      expect(props()[key]).toBe(value);
    }
    for (const [key, value] of [["columns", "6"], ["gap", "0"]]) {
      const input = screen.getByTestId(`filterGallery-${key}`);
      fireEvent.change(input, { target: { value } }); fireEvent.keyUp(input, { key: "ArrowRight" });
      expect(props()[key]).toBe(Number(value));
    }
    for (const key of ["lightbox", "searchable"]) { fireEvent.click(screen.getByTestId(`block-${key}`)); expect(props()[key]).toBe(true); }
    edit("filterGallery-label", "Selected work");
    expect(props().label.en).toBe("Selected work");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(props().label).toBeUndefined();
  });

  it("edits yearly prices and initial billing without losing monthly or localized data", () => {
    render(<Editor node={{ id: "plans", type: "pricing", props: { items: [{ name: { en: "Plan" }, price: { en: "Contact" }, yearlyPrice: { he: "צרו קשר" } }] } }} />);
    edit("block-item-yearlyPrice", "Annual quote");
    edit("block-item-yearlyPeriod", "/year");
    fireEvent.click(screen.getByTestId("block-billing"));
    fireEvent.click(screen.getByTestId("pricing-initialBilling").querySelector('[data-value="yearly"]')!);
    expect(props()).toMatchObject({ billing: true, initialBilling: "yearly", items: [{ price: { en: "Contact" }, yearlyPrice: { en: "Annual quote", he: "צרו קשר" }, yearlyPeriod: { en: "/year" } }] });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(props().initialBilling).toBeUndefined();
  });

  it("offers FAQ group controls only when multiple answers may stay open", () => {
    render(<Editor node={{ id: "faq", type: "accordion", props: { items: [{ q: { en: "Question" }, a: { en: "Answer" } }] } }} />);
    fireEvent.click(screen.getByTestId("block-controls"));
    expect(props().controls).toBe(true);
    fireEvent.click(screen.getByTestId("block-single"));
    expect(screen.queryByTestId("block-controls")).toBeNull();
  });
});
