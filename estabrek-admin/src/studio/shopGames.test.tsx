import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PageDraft, PageDraftOp, PageTreeNode } from "../api/pages.api";
import { ContentBlocksPanel } from "./ContentBlocksPanel";
import { newElement } from "./columns";
import { simulate } from "./draft";

// The shop's games (the scratch card and the memory game, plan 3.6): what the editor adds, and their settings.
afterEach(cleanup);
function Editor({ node }: { node: PageTreeNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { enabled: false } } }));
  const [state, setState] = useState<PageDraft>({ version: 1, rev: 1, baseHash: "x", sections: [], trash: [], startedAt: "", updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [node] }] } } });
  const shown = state.tree.root.children![0].children![0];
  return <QueryClientProvider client={client}><ContentBlocksPanel node={shown} lang="en" busy={false} onOps={(_, ops: PageDraftOp[]) => setState(ops.reduce(simulate, state))} /><output data-testid="props">{JSON.stringify(shown.props)}</output></QueryClientProvider>;
}
const props = () => JSON.parse(screen.getByTestId("props").textContent!);
const edit = (id: string, value: string) => { fireEvent.change(screen.getByTestId(id), { target: { value } }); fireEvent.blur(screen.getByTestId(id)); };
const ids = () => { let n = 0; return (p: string) => `${p}-${++n}`; };

describe("the shop's games in the editor", () => {
  it("a new scratch card and a new memory game come with a prize, once per shopper, into the bag, and no coupon yet", () => {
    const card = newElement("scratchCard", "en", ids()) as PageTreeNode;
    expect(card.props).toMatchObject({ prize: { en: "10% off your order" }, once: true, save: true, look: "silver" });
    expect(card.props).not.toHaveProperty("coupon");
    const game = newElement("memoryGame", "ar", ids()) as PageTreeNode;
    expect((game.props as { faces: unknown[] }).faces).toHaveLength(6);
    expect(game.props).toMatchObject({ moves: 14, once: true, save: true });
  });

  it("the coupon is kept only as a code (letters, digits, - and _), and emptied away", () => {
    render(<Editor node={newElement("scratchCard", "en", ids()) as PageTreeNode} />);
    edit("block-game-code", "ROSE 10");
    expect(props()).not.toHaveProperty("coupon");
    edit("block-game-code", " ROSE10 ");
    expect(props().coupon).toBe("ROSE10");
    edit("block-game-code", "");
    expect(props()).not.toHaveProperty("coupon");
    fireEvent.click(screen.getByTestId("block-game-look").querySelector('[data-value="gold"]')!);
    expect(props().look).toBe("gold");
  });

  it("pairs are added up to 8 and removed down to 2; moves under the pairs mean no limit", () => {
    render(<Editor node={newElement("memoryGame", "en", ids()) as PageTreeNode} />);
    fireEvent.click(screen.getByTestId("block-game-add"));
    fireEvent.click(screen.getByTestId("block-game-add"));
    expect(props().faces).toHaveLength(8);
    expect(screen.queryByTestId("block-game-add")).toBeNull();
    const icons = props().faces.map((f: { icon: string }) => f.icon);
    expect(new Set(icons).size).toBe(8);
    const removers = () => screen.getAllByRole("button", { name: /Remove this pair|شيلي هالزوج|הסרת הזוג/ });
    for (let i = 0; i < 6; i++) fireEvent.click(removers()[0]);
    expect(props().faces).toHaveLength(2);
    expect(removers()[0]).toBeDisabled();
  });

  it("a new gift card and configurator wait for their product; the configurator's parts are added and taken away", () => {
    const gift = newElement("giftCard", "en", ids()) as PageTreeNode;
    expect(gift.props).toMatchObject({ title: { en: "A gift card" }, look: "rose" });
    expect(gift.props).not.toHaveProperty("product");
    const build = newElement("configurator", "en", ids()) as PageTreeNode;
    expect((build.props as { parts: Array<{ options: unknown[] }> }).parts[0].options).toHaveLength(3);

    render(<Editor node={build} />);
    fireEvent.click(screen.getByTestId("build-part-add"));
    expect(props().parts).toHaveLength(2);
    fireEvent.click(screen.getAllByTestId("build-option-add")[1]);
    expect(props().parts[1].options).toHaveLength(2);
    fireEvent.change(screen.getAllByTestId("build-part-name")[1], { target: { value: "The box" } });
    fireEvent.blur(screen.getAllByTestId("build-part-name")[1]);
    expect(props().parts[1].name.en).toBe("The box");
    fireEvent.click(screen.getAllByRole("button", { name: /Remove the part|شيلي القطعة|הסרת החלק/ })[0]);
    expect(props().parts).toHaveLength(1);
    expect(props().parts[0].name.en).toBe("The box");
  });
});
