import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { checkDesignTokens, storedDesignTokens } from "../lib/designTokens.js";
import { designTokensOf, tokensCss } from "../../../estabrek-storefront/src/pageTree/designTokens";
import { declarations } from "../../../estabrek-storefront/src/pageTree/css";
import { starterTokens } from "../../../estabrek-admin/src/studio/tokenSets";

// Design variables (W2): named colours, fonts, font sizes, spaces, corners and shadows taken by name ("$brand").

const page = (style: Record<string, unknown>, type = "heading", props: Record<string, unknown> = { text: { en: "Hi" } }) => ({
  version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "x", type, props, style: { base: style } }] }] },
});
const ok = (tree: unknown) => { const r = checkTree(tree); return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`); };

describe("design variables", () => {
  test("the editor's ready set is valid, reads back the same in the shop, and becomes CSS variables", () => {
    const set = starterTokens(["inter", "amiri"]);
    const checked = checkDesignTokens(set);
    expect(checked.ok).toBe(true);
    expect(designTokensOf(set)).toEqual(JSON.parse(JSON.stringify({ ...set, fonts: set.fonts, shadows: set.shadows.map((s) => ({ ...s })) })));
    const css = tokensCss(designTokensOf(set));
    expect(css).toContain(":root{--tk-c-brand:#c86b98");
    expect(css).toContain("--tk-s-md:16px");
    expect(css).toContain("--tk-r-pill:999px");
    expect(css).toContain("--tk-sh-soft:0px 8px 24px -8px #00000033");
    // The font sizes: a scale of seven, 13 px times 1.25 at each step.
    expect(checked.ok && checked.tokens.sizes.map((z) => [z.id, z.value])).toEqual([["small", 13], ["body", 16], ["lead", 20], ["h3", 25], ["h2", 32], ["h1", 40], ["display", 50]]);
    expect(css).toContain("--tk-z-small:13px");
    expect(css).toContain("--tk-z-h1:40px");
  });

  test("font sizes are kept between 8 and 200, each with its own id; a set saved before them has none", () => {
    const base = { version: 1, colors: [], fonts: [], spaces: [], radii: [], shadows: [] };
    expect(checkDesignTokens({ ...base, sizes: [{ id: "h1", value: 40 }, { id: "body", name: { ar: "نص" }, value: 16.5 }] }).ok).toBe(true);
    for (const bad of [[{ id: "a", value: 4 }], [{ id: "a", value: 201 }], [{ id: "a", value: "40" }], [{ id: "a", value: 20 }, { id: "a", value: 30 }], [{ id: "A", value: 20 }], Array.from({ length: 21 }, (_, i) => ({ id: `s${i}`, value: 20 }))]) {
      expect(checkDesignTokens({ ...base, sizes: bad }).ok, JSON.stringify(bad).slice(0, 80)).toBe(false);
    }
    // What was stored before sizes existed still reads, in the API and in the shop.
    expect(storedDesignTokens(base)!.sizes).toEqual([]);
    expect(designTokensOf(base)!.sizes).toEqual([]);
    // The shop keeps the sizes it can draw.
    expect(designTokensOf({ ...base, sizes: [{ id: "ok", value: 24 }, { id: "tiny", value: 2 }, { id: "bad id", value: 24 }] })!.sizes).toEqual([{ id: "ok", name: undefined, value: 24 }]);
  });

  test("bad ids, colours, numbers and doubles are refused; a broken stored set is ignored", () => {
    const base = { version: 1, colors: [], fonts: [], spaces: [], radii: [], shadows: [] };
    for (const bad of [{ colors: [{ id: "Brand", value: "#fff" }] }, { colors: [{ id: "a", value: "red" }] }, { spaces: [{ id: "a", value: 999 }] }, { radii: [{ id: "a", value: 1 }, { id: "a", value: 2 }] }, { fonts: [{ id: "a", family: "Bad Font" }] }, { extra: 1 }]) {
      expect(checkDesignTokens({ ...base, ...bad }).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(storedDesignTokens({ version: 2 })).toBeNull();
    expect(designTokensOf({ version: 1, colors: [{ id: "ok", value: "#fff" }, { id: "bad", value: "url(x)" }] })!.colors).toEqual([{ id: "ok", name: undefined, value: "#fff" }]);
  });

  test("elements take colours, fonts, corners, shadows and spaces by name", () => {
    expect(ok(page({ color: "$brand", bg: "$paper", radius: "$md", shadow: "$soft", family: "$display", border: { width: 1, color: "$ink" } }))).toEqual([]);
    expect(ok(page({ gap: "$md", rowGap: "$sm", space: "$lg" }, "stack", {}))).toEqual([]);
    for (const bad of [{ color: "$Brand" }, { radius: "$" }, { shadow: "big" }, { gap: "md" }, { space: 16 }, { family: "$bad name" }]) expect(ok(page(bad)), JSON.stringify(bad)).not.toEqual([]);
  });

  test("words take a font size by name, or a number as before", () => {
    expect(ok(page({ size: "$h1" }))).toEqual([]);
    expect(ok(page({ size: 40, sizeMin: 24 }))).toEqual([]);
    expect(ok({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "x", type: "heading", props: { text: { en: "Hi" } }, style: { base: { size: "$h1" }, mobile: { size: "$h3" } } }] }] } })).toEqual([]);
    for (const bad of [{ size: "big" }, { size: "$" }, { size: "$H1" }, { size: 4 }, { size: "40px" }, { sizeMin: "$body" }]) expect(ok(page(bad)), JSON.stringify(bad)).not.toEqual([]);
    // The shop: the name is its variable (a smallest size is for numbers only); a number is as it was.
    expect(declarations({ size: "$h1" } as never, "heading")).toContain("font-size:var(--tk-z-h1)");
    expect(declarations({ size: "$h1", sizeMin: 20 } as never, "heading").filter((x) => x.startsWith("font-size:"))).toEqual(["font-size:var(--tk-z-h1)"]);
    expect(declarations({ size: 40 } as never, "heading")).toContain("font-size:40px");
    expect(declarations({ size: 40, sizeMin: 24 } as never, "heading").find((x) => x.startsWith("font-size:"))).toMatch(/^font-size:clamp\(/);
    expect(declarations({ size: "big" } as never, "heading").some((x) => x.startsWith("font-size:"))).toBe(false);
  });

  test("the shop writes a name as its CSS variable", () => {
    const d = declarations({ color: "$brand", bg: "$paper", radius: "$md", shadow: "$soft", family: "$display", gap: "$md", space: "$lg" } as never, "stack");
    expect(d).toEqual(expect.arrayContaining(["color:var(--tk-c-brand)", "background:var(--tk-c-paper)", "border-radius:var(--tk-r-md)", "font-family:var(--tk-f-display)", "gap:var(--tk-s-md)", "padding:var(--tk-s-lg)"]));
    expect(d.some((x) => x.startsWith("box-shadow:") && x.includes("var(--tk-sh-soft)"))).toBe(true);
    // Its own padding wins over a space variable; numbers still work as before.
    expect(declarations({ space: "$lg", pad: [4, 4, 4, 4], radius: 8, gap: 10 } as never, "stack")).toEqual(expect.arrayContaining(["padding-block:4px 4px", "border-radius:8px", "gap:10px"]));
    expect(declarations({ space: "$lg", pad: [4, 4, 4, 4] } as never, "stack").some((x) => x.startsWith("padding:var"))).toBe(false);
  });
});
