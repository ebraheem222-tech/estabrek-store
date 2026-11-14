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
import { TextStylePanel } from "./StylePanels";

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

  it("says how a colour reads, adds its tones and its mates, and puts the spaces on a scale", () => {
    setLangForTests("en");
    const save = vi.fn(async () => true);
    const tokens = starterTokens([]);
    const api = { tokens, hasDraft: false, busy: false, save, publish: vi.fn(), drop: vi.fn() };
    const wrap = (a: typeof api) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}><VariablesPanel api={a as never} canPublish /></QueryClientProvider>;
    const view = render(wrap(api));
    // Each colour against the paper and the ink: the rose is an edge on the paper, and takes dark words.
    const read = screen.getAllByTestId("variable-reading");
    expect(read).toHaveLength(10);
    expect([read[0].dataset.on, read[0].dataset.grade, read[0].dataset.best]).toEqual(["paper", "large", undefined]);
    expect([read[1].dataset.on, read[1].dataset.grade, read[1].dataset.best]).toEqual(["ink", "AA", "1"]);
    expect(read[1].textContent).toContain("Good for text");
    expect(screen.queryByTestId("variables-weak")).toBeNull();
    // Its tones: nine more colours by its id.
    const tones = screen.getAllByTestId("variable-tones")[0];
    expect(tones.textContent).toContain("+9");
    fireEvent.click(tones);
    const withTones = (save.mock.calls.at(-1) as unknown as [{ colors: Array<{ id: string; name?: { en?: string } }> }])[0].colors;
    expect(withTones).toHaveLength(14);
    expect(withTones.at(-1)).toMatchObject({ id: "brand-900", name: { en: "Brand 900" } });
    // What goes with it: its opposite.
    fireEvent.change(screen.getAllByTestId("variable-mates")[0], { target: { value: "complement" } });
    const withMate = (save.mock.calls.at(-1) as unknown as [{ colors: Array<{ id: string; name?: { en?: string } }> }])[0].colors;
    expect(withMate.at(-1)).toMatchObject({ id: "brand-opposite", name: { en: "Brand · Its opposite" } });
    // The spaces on a scale: seen before it is applied, then saved.
    fireEvent.click(screen.getByTestId("variables-tab-spaces"));
    expect(screen.getByTestId("variables-scale-preview").textContent).toBe("4 · 6 · 9 · 14 · 20");
    fireEvent.change(screen.getByTestId("variables-scale-ratio"), { target: { value: "2" } });
    expect(screen.getByTestId("variables-scale-preview").textContent).toBe("4 · 8 · 16 · 32 · 64");
    fireEvent.click(screen.getByTestId("variables-scale-apply"));
    const spaced = (save.mock.calls.at(-1) as unknown as [{ spaces: Array<{ id: string; value: number }> }])[0].spaces;
    expect(spaced.map((x) => [x.id, x.value])).toEqual([["xs", 4], ["sm", 8], ["md", 16], ["lg", 32], ["xl", 64]]);
    // The numbers shown follow the new values.
    view.rerender(wrap({ ...api, tokens: { ...tokens, spaces: spaced } }));
    expect(screen.getAllByTestId("variable-number").map((el) => (el as HTMLInputElement).value)).toEqual(["4", "8", "16", "32", "64"]);
    // A scale that passes the most a space can be isn't applied.
    fireEvent.change(screen.getByTestId("variables-scale-base"), { target: { value: "64" } });
    expect((screen.getByTestId("variables-scale-apply") as HTMLButtonElement).disabled).toBe(true);
    // Ink that hardly reads on the paper is said.
    view.rerender(wrap({ ...api, tokens: { ...tokens, colors: tokens.colors.map((c) => (c.id === "ink" ? { ...c, value: "#9a9a9a" } : c)) } }));
    fireEvent.click(screen.getByTestId("variables-tab-colors"));
    expect(screen.getByTestId("variables-weak").textContent).toContain("2.6");
  });

  it("font sizes: each shown at its size, kept between 8 and 200, and put on a scale of their own", () => {
    setLangForTests("en");
    const save = vi.fn(async () => true);
    const tokens = starterTokens([]);
    const api = { tokens, hasDraft: false, busy: false, save, publish: vi.fn(), drop: vi.fn() };
    const wrap = (a: typeof api) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}><VariablesPanel api={a as never} canPublish /></QueryClientProvider>;
    const view = render(wrap(api));
    const saved = () => (save.mock.calls.at(-1) as unknown as [{ sizes: Array<{ id: string; value: number; name?: Record<string, string> }> }])[0].sizes;
    fireEvent.click(screen.getByTestId("variables-tab-sizes"));
    expect(screen.getByTestId("variables-tab-sizes").textContent).toContain("Font sizes");
    expect(screen.getAllByTestId("variable-number").map((el) => (el as HTMLInputElement).value)).toEqual(["13", "16", "20", "25", "32", "40", "50"]);
    // A sample of each at its size (a very big one is drawn no bigger than the panel takes).
    expect(screen.getAllByTestId("variable-size-sample").map((el) => el.style.fontSize)).toEqual(["13px", "16px", "20px", "25px", "32px", "40px", "44px"]);
    // A size under the smallest is brought up to it.
    const first = screen.getAllByTestId("variable-number")[0] as HTMLInputElement;
    fireEvent.change(first, { target: { value: "4" } });
    fireEvent.blur(first);
    expect(saved()[0]).toMatchObject({ id: "small", value: 8 });
    // The scale: seen first, then applied; ids and names stay.
    expect(screen.getByTestId("variables-size-scale-preview").textContent).toBe("13 · 16 · 20 · 25 · 32 · 40 · 50");
    fireEvent.change(screen.getByTestId("variables-size-scale-ratio"), { target: { value: "1.5" } });
    fireEvent.change(screen.getByTestId("variables-size-scale-base"), { target: { value: "12" } });
    expect(screen.getByTestId("variables-size-scale-preview").textContent).toBe("12 · 18 · 27 · 41 · 61 · 91 · 137");
    fireEvent.click(screen.getByTestId("variables-size-scale-apply"));
    expect(saved().map((x) => [x.id, x.value])).toEqual([["small", 12], ["body", 18], ["lead", 27], ["h3", 41], ["h2", 61], ["h1", 91], ["display", 137]]);
    expect(saved()[5].name).toEqual(tokens.sizes[5].name);
    view.rerender(wrap({ ...api, tokens: { ...tokens, sizes: saved() as never } }));
    expect(screen.getAllByTestId("variable-number").map((el) => (el as HTMLInputElement).value)).toEqual(["12", "18", "27", "41", "61", "91", "137"]);
    // A ratio that passes 200 before the last size isn't applied.
    fireEvent.change(screen.getByTestId("variables-size-scale-ratio"), { target: { value: "2" } });
    expect((screen.getByTestId("variables-size-scale-apply") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("variables-size-scale-preview").textContent).toContain("200");
    // One more size, by hand.
    fireEvent.click(screen.getByTestId("variables-add-sizes"));
    expect(saved()).toHaveLength(8);
    expect(saved().at(-1)).toMatchObject({ id: "size", value: 16, name: { en: "New font size" } });
    // A store with variables but no sizes yet: the scale gives it the seven, with their names.
    view.rerender(wrap({ ...api, tokens: { ...tokens, sizes: [] } }));
    expect(screen.queryAllByTestId("variable-number")).toHaveLength(0);
    fireEvent.change(screen.getByTestId("variables-size-scale-ratio"), { target: { value: "1.25" } });
    fireEvent.change(screen.getByTestId("variables-size-scale-base"), { target: { value: "13" } });
    fireEvent.click(screen.getByTestId("variables-size-scale-apply"));
    expect(saved()).toEqual(tokens.sizes);
  });

  it("words take a font size from the variables by name, and go back to a number or to none", () => {
    setLangForTests("en");
    const edits: unknown[] = [];
    const panel = (base: Record<string, unknown>) => (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}>
        <TokensContext.Provider value={starterTokens([])}>
          <TextStylePanel node={{ id: "h", type: "heading", props: { text: { en: "Hello" } }, style: { base } } as PageTreeNode} screen="base" busy={false} onOps={(_l, ops) => edits.push(ops[0])} only={["size"]} />
        </TokensContext.Provider>
      </QueryClientProvider>
    );
    const view = render(panel({ size: 30, color: "#111111" }));
    const select = () => screen.getByTestId("studio-style-size-variable") as HTMLSelectElement;
    // A number: no variable is picked, and the seven sizes are offered by name.
    expect(select().value).toBe("");
    expect([...select().options].map((o) => o.value)).toEqual(["", "$small", "$body", "$lead", "$h3", "$h2", "$h1", "$display"]);
    expect((screen.getByTestId("studio-style-size") as HTMLInputElement).value).toBe("30");
    fireEvent.change(select(), { target: { value: "$h1" } });
    expect(edits.at(-1)).toEqual({ op: "setStyle", nodeId: "h", screen: "base", style: { size: "$h1", color: "#111111" } });
    // By name: the picker shows it, and the number field is empty.
    view.rerender(panel({ size: "$h1", color: "#111111" }));
    expect(select().value).toBe("$h1");
    expect((screen.getByTestId("studio-style-size") as HTMLInputElement).value).toBe("");
    // "None" takes the size off (as designed).
    fireEvent.change(select(), { target: { value: "" } });
    expect(edits.at(-1)).toEqual({ op: "setStyle", nodeId: "h", screen: "base", style: { color: "#111111" } });
  });

  it("a store without font sizes offers no size picker", () => {
    setLangForTests("en");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}>
        <TokensContext.Provider value={EMPTY_TOKENS}>
          <TextStylePanel node={{ id: "h", type: "heading", props: { text: { en: "Hello" } } } as PageTreeNode} screen="base" busy={false} onOps={() => {}} only={["size"]} />
        </TokensContext.Provider>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("studio-style-size")).toBeTruthy();
    expect(screen.queryByTestId("studio-style-size-variable")).toBeNull();
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
