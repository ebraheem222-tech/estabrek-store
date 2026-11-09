import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { checkDesignTokens, storedDesignTokens } from "../lib/designTokens.js";
import { designTokensOf, tokensCss } from "../../../estabrek-storefront/src/pageTree/designTokens";
import { declarations } from "../../../estabrek-storefront/src/pageTree/css";
import { starterTokens } from "../../../estabrek-admin/src/studio/tokenSets";

// Design variables (W2): named colours, fonts, spaces, corners and shadows taken by name ("$brand").

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

  test("the shop writes a name as its CSS variable", () => {
    const d = declarations({ color: "$brand", bg: "$paper", radius: "$md", shadow: "$soft", family: "$display", gap: "$md", space: "$lg" } as never, "stack");
    expect(d).toEqual(expect.arrayContaining(["color:var(--tk-c-brand)", "background:var(--tk-c-paper)", "border-radius:var(--tk-r-md)", "font-family:var(--tk-f-display)", "gap:var(--tk-s-md)", "padding:var(--tk-s-lg)"]));
    expect(d.some((x) => x.startsWith("box-shadow:") && x.includes("var(--tk-sh-soft)"))).toBe(true);
    // Its own padding wins over a space variable; numbers still work as before.
    expect(declarations({ space: "$lg", pad: [4, 4, 4, 4], radius: 8, gap: 10 } as never, "stack")).toEqual(expect.arrayContaining(["padding-block:4px 4px", "border-radius:8px", "gap:10px"]));
    expect(declarations({ space: "$lg", pad: [4, 4, 4, 4] } as never, "stack").some((x) => x.startsWith("padding:var"))).toBe(false);
  });
});
