import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { gameOf } from "../../../estabrek-storefront/src/pageTree/gameSpec";
import { READY_GAMES } from "../../../estabrek-storefront/src/pageTree/gameReady";
import { ADDABLE, newElement } from "./columns";
import { GameStagePanel } from "./GameStagePanel";

vi.mock("../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: ({ open, onSelect }: { open: boolean; onSelect: (u: string) => void }) => (open ? <button type="button" onClick={() => onSelect("https://cdn.example.com/p.jpg")} data-testid="pick-media">pick</button> : null) }));

// G0 of the games stage (docs/game-engine-plan.ar.md): the editor adds a game and sets it up.
afterEach(cleanup);
const ids = () => {
  let n = 0;
  return (p: string) => `${p}-${n++}`;
};
const say = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>).ar ?? "" : "");
/** The panel on a node that takes each change, as the editor's draft does. */
function Harness({ start, onOps }: { start: PageTreeNode; onOps: (label: string, ops: PageDraftOp[]) => void }) {
  const [node, setNode] = useState(start);
  return <GameStagePanel node={node} lang="ar" busy={false} onOps={(label, ops) => { onOps(label, ops); for (const op of ops) if (op.op === "setProps") setNode((n) => ({ ...n, props: op.props })); }} />;
}
const mount = (node: PageTreeNode) => {
  const onOps = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><Harness start={node} onOps={onOps} /></QueryClientProvider>);
  const last = () => (onOps.mock.calls.at(-1)![1][0] as { props: { game: Record<string, unknown> } }).props.game;
  return { onOps, last };
};

describe("the games stage in the editor", () => {
  test("a new game element is the first ready game, whole width, and plays", () => {
    expect(ADDABLE).toContain("game");
    const node = newElement("game", "ar", ids()) as PageTreeNode;
    expect(node.type).toBe("game");
    expect((node.style as { base: { width: string } }).base.width).toBe("100%");
    const spec = gameOf((node.props as { game: unknown }).game, say);
    expect(spec?.words.title).toBe(say(READY_GAMES[0].game.words && (READY_GAMES[0].game.words as Record<string, unknown>).title));
    expect(spec?.things.length).toBeGreaterThan(1);
  });

  test("a ready game replaces the game, keeping its coupon", () => {
    const node = newElement("game", "ar", ids()) as PageTreeNode;
    (node.props.game as Record<string, unknown>).coupon = "WIN10";
    const { last } = mount(node);
    const cards = screen.getAllByTestId("studio-game-ready");
    expect(cards.map((c) => c.getAttribute("data-game"))).toEqual(READY_GAMES.map((g) => g.key));
    fireEvent.click(cards.find((c) => c.getAttribute("data-game") === "bricks")!);
    const game = last();
    expect((game.things as unknown[]).length).toBe((READY_GAMES.find((g) => g.key === "bricks")!.game.things as unknown[]).length);
    expect(game.coupon).toBe("WIN10");
  });

  test("its words in the language being edited, its lives, and a thing's look from the store's pictures", () => {
    const node = newElement("game", "ar", ids()) as PageTreeNode;
    const { onOps, last } = mount(node);
    const title = screen.getByTestId("studio-game-word-title");
    fireEvent.change(title, { target: { value: "العب واربح" } });
    fireEvent.blur(title);
    const words = last().words as Record<string, Record<string, string>>;
    expect(words.title.ar).toBe("العب واربح");
    expect(words.title.en).toBe("Catch the gifts");
    // The second thing (the gift that falls): a picture of the store's instead of the emoji.
    fireEvent.click(screen.getAllByTestId("studio-game-thing")[1]);
    fireEvent.click(screen.getByTestId("studio-game-look-kind").querySelector('[data-value="image"]')!);
    const afterKind = last().things as Array<Record<string, Record<string, unknown>>>;
    expect(afterKind[1].look.kind).toBe("image");
    onOps.mockClear();
    fireEvent.click(screen.getByTestId("studio-game-picture"));
    fireEvent.click(screen.getByTestId("pick-media"));
    const things = last().things as Array<Record<string, Record<string, unknown>>>;
    expect(things[1].look).toMatchObject({ kind: "image", src: "https://cdn.example.com/p.jpg" });
  });
});
