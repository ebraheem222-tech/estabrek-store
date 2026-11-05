import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PageDraft, PageDraftOp, PageTreeNode } from "../api/pages.api";
import { ContentBlocksPanel } from "./ContentBlocksPanel";
import { newElement, accepts } from "./columns";
import { simulate, undoOf } from "./draft";
import { makeNode } from "./insert";

afterEach(cleanup);
const node: PageTreeNode = { id: "gallery", type: "showcase", props: { items: [{ title: { en: "First", he: "ראשון" }, image: "/first.svg", href: "/shop" }, { title: { en: "Second" }, image: "/second.svg" }], initial: 1 } };
const initial: PageDraft = { version: 1, rev: 1, baseHash: "x", sections: [], trash: [], startedAt: "", updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [node] }] } } };
function Editor() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { enabled: false } } }));
  const [state, setState] = useState(initial);
  const [undo, setUndo] = useState<PageDraftOp[]>([]);
  const shown = state.tree.root.children![0].children![0];
  return <QueryClientProvider client={client}><ContentBlocksPanel node={shown} lang="en" busy={false} onOps={(_, ops) => { setUndo(undoOf(ops, state, "en")); setState(ops.reduce(simulate, state)); }} /><button onClick={() => setState(undo.reduce(simulate, state))}>Undo</button><output data-testid="props">{JSON.stringify(shown.props)}</output></QueryClientProvider>;
}
const props = () => JSON.parse(screen.getByTestId("props").textContent!);

describe("merchant showcase editor", () => {
  it("adds a standalone editable block with localized panels and safe defaults", () => {
    let count = 0;
    const created = makeNode("showcase" as never, "he", (prefix) => `${prefix}${++count}`);
    expect(created).toMatchObject({ type: "showcase", props: { layout: "horizontal", activation: "click", initial: 0, ratio: 4, height: 480, duration: 0.55, overlay: 0.5 } });
    expect((created.props.items as unknown[])).toHaveLength(3);
    expect(JSON.stringify(created.props)).not.toMatch(/"en":|"ar":/);
    expect(accepts("section", "showcase")).toBe(true);
    expect(newElement("showcase" as never, "en", (prefix) => prefix).type).toBe("showcase");
  });

  it("edits one language, reorders panels with the initial panel, and undoes a change", () => {
    render(<Editor />);
    fireEvent.change(screen.getByTestId("block-item-title"), { target: { value: "Changed" } });
    fireEvent.blur(screen.getByTestId("block-item-title"));
    expect(props().items[0].title).toEqual({ en: "Changed", he: "ראשון" });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(props().items[0].title.en).toBe("First");
    fireEvent.click(screen.getAllByLabelText(/Down|لتحت/)[0]);
    expect(props().items.map((item: { title: { en: string } }) => item.title.en)).toEqual(["Second", "First"]);
    expect(props().initial).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(props()).toEqual(node.props);
  });

  it("exposes every gallery setting and keeps at least one panel", () => {
    render(<Editor />);
    for (const [key, value] of [["layout", "vertical"], ["activation", "hover"], ["initial", "0"]]) {
      fireEvent.click(screen.getByTestId(`showcase-${key}`).querySelector(`[data-value="${value}"]`)!);
      expect(props()[key]).toBe(key === "initial" ? 0 : value);
    }
    for (const [key, value] of [["ratio", "5"], ["height", "600"], ["duration", "0"], ["overlay", "0.8"]]) {
      const input = screen.getByTestId(`showcase-${key}`);
      fireEvent.change(input, { target: { value } });
      fireEvent.keyUp(input, { key: "ArrowRight" });
      expect(props()[key]).toBe(Number(value));
    }
    fireEvent.click(screen.getAllByTestId("block-item-remove")[1]);
    expect(props().items).toHaveLength(1);
    expect(props().initial).toBe(0);
    expect(screen.getByTestId("block-item-remove")).toBeDisabled();
    fireEvent.click(screen.getByTestId("block-item-add"));
    expect(props().items).toHaveLength(2);
  });
});
