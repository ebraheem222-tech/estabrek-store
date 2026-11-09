// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";
import { detached, newInstance, overrideFields, placeOnly, withOverride } from "./ComponentsPanel";
import { EMPTY_TOKENS, newTokenId, TokenSelect, TokensContext } from "./designTokens";
import { starterTokens } from "./tokenSets";
import { VariablesPanel } from "./VariablesPanel";
import { ColourPick } from "./StudioTreePanels";

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});
const ids = () => { let n = 0; return (p: string) => `${p}-${n++}`; };
const card: PageTreeNode = { id: "card", type: "stack", name: "Card", props: {}, style: { base: { pad: [20, 20, 20, 20], layer: { x: 1, y: 2 } } }, children: [
  { id: "t", type: "heading", name: "Title", props: { text: { en: "Title", ar: "عنوان" } } },
  { id: "go", type: "button", props: { label: { en: "Open" }, href: "/shop" } },
] };

describe("main components in the editor", () => {
  it("lists what an instance can change, and keeps only real changes", () => {
    const fields = overrideFields(card);
    expect(fields.map((f) => `${f.nodeId}.${f.key}`)).toEqual(["t.text", "go.label", "go.href"]);
    let o = withOverride({}, fields[0], "en", "Summer");
    expect(o).toEqual({ t: { text: { en: "Summer", ar: "عنوان" } } });
    o = withOverride(o, fields[2], "en", "/c/summer");
    expect(o.go).toEqual({ href: "/c/summer" });
    // Back to the main component's words: the change goes.
    o = withOverride(o, fields[0], "en", "Title");
    expect(o.t).toBeUndefined();
    expect(withOverride(o, fields[2], "en", "/shop")).toEqual({});
  });

  it("a detached copy has the instance's changes, new inner ids, its own place over the variant's look", () => {
    const inst: PageTreeNode = { id: "inst", type: "component", props: { componentId: "c1", overrides: { t: { text: { en: "Mine" } } } }, style: { base: { layer: { x: 50, y: 60 } } } };
    const copy = detached(inst, card, ids());
    expect(copy.id).toBe("inst");
    expect(copy.type).toBe("stack");
    expect(copy.children!.map((c) => c.id)).toEqual(["head-0", "butt-1"]);
    expect(copy.children![0].props.text).toEqual({ en: "Mine" });
    expect((copy.style as any).base).toEqual({ pad: [20, 20, 20, 20], layer: { x: 50, y: 60 } });
    expect(placeOnly(card.style)).toEqual({ base: { layer: { x: 1, y: 2 } } });
    expect(newInstance({ id: "c1", name: "Card", updatedAt: "", hasDraft: false, variants: [], uses: 0 }, ids())).toMatchObject({ type: "component", props: { componentId: "c1" } });
  });
});

describe("design variables in the editor", () => {
  it("new ids never clash", () => {
    const t = starterTokens(["inter"]);
    expect(newTokenId(t, "colors", "Brand")).toBe("brand-2");
    expect(newTokenId(t, "spaces", "عربي")).toBe("space");
  });

  it("starts from a ready set, adds and deletes", () => {
    setLangForTests("en");
    const save = vi.fn(async () => true);
    const api = { tokens: EMPTY_TOKENS, hasDraft: false, busy: false, save, publish: vi.fn(), drop: vi.fn() };
    const view = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}><VariablesPanel api={api as never} canPublish /></QueryClientProvider>);
    fireEvent.click(screen.getByTestId("variables-starter"));
    expect((save.mock.calls[0] as unknown as [{ colors: unknown[] }])[0].colors).toHaveLength(5);
    view.rerender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}><VariablesPanel api={{ ...api, tokens: starterTokens([]), hasDraft: true } as never} canPublish /></QueryClientProvider>);
    fireEvent.click(screen.getByTestId("variables-add-colors"));
    expect((save.mock.calls.at(-1) as unknown as [{ colors: Array<{ id: string }> }])[0].colors.at(-1)!.id).toBe("colour");
    fireEvent.click(screen.getAllByTestId("variable-delete")[0]);
    expect((save.mock.calls.at(-1) as unknown as [{ colors: Array<{ id: string }> }])[0].colors.map((c) => c.id)).not.toContain("brand");
    expect(screen.getByTestId("variables-publish")).toBeTruthy();
  });

  it("pickers offer the variables by name and write $id", () => {
    setLangForTests("en");
    const picks: Array<string | null> = [];
    render(<TokensContext.Provider value={starterTokens(["inter"])}>
      <ColourPick label="Colour" value="$brand" busy={false} onPick={(v) => picks.push(v)} testId="c" />
      <TokenSelect group="radii" value={12} busy={false} onPick={(v) => picks.push(v)} />
    </TokensContext.Provider>);
    expect((screen.getByTestId("c") as HTMLSelectElement).value).toBe("$brand");
    fireEvent.change(screen.getByTestId("c"), { target: { value: "$ink" } });
    fireEvent.change(screen.getByTestId("token-select-radii"), { target: { value: "$pill" } });
    expect(picks).toEqual(["$ink", "$pill"]);
  });
});
