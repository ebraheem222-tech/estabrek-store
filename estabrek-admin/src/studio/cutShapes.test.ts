import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CUT_SHAPES, PATTERN_KINDS, patternCss } from "./cutShapes";

// The shop draws the same shapes and patterns (estabrek-storefront src/pageTree/css.ts), and the backend lists them (src/lib/pageTree.ts).
const root = path.resolve(__dirname, "../../..");
const shopCss = fs.readFileSync(path.join(root, "estabrek-storefront/src/pageTree/css.ts"), "utf8");
const backend = fs.readFileSync(path.join(root, "estabrek-store-backend/src/lib/pageTree.ts"), "utf8");
const listOf = (name: string) => JSON.parse(`[${new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(backend)![1].replace(/,\s*$/, "")}]`) as string[];

describe("shapes and patterns, the same in the editor, the shop and the backend", () => {
  it("every shape the backend takes, with the shop's own outline", () => {
    expect(CUT_SHAPES.map(([k]) => k).sort()).toEqual(listOf("SHAPES").sort());
    const masks = new Map([...shopCss.matchAll(/^ {2}(\w+): "(M[^"]+)",$/gm)].map((m) => [m[1], m[2]]));
    expect(masks.size).toBe(20);
    for (const [k, , d] of CUT_SHAPES) if (masks.has(k)) expect(d, k).toBe(masks.get(k));
  });

  it("every pattern the backend takes, drawn as the shop draws it", () => {
    expect(PATTERN_KINDS.map(([k]) => k)).toEqual(listOf("PATTERNS"));
    for (const [k] of PATTERN_KINDS) expect(patternCss(k, "#ff0000", 20).backgroundImage, k).toMatch(/gradient\(/);
    // The shop's own test draws dots at 20px the same way (tests/page-tree.spec.ts).
    expect(patternCss("dots", "#ff0000", 20)).toEqual({ backgroundImage: "radial-gradient(#ff0000 2.4px,transparent 3px)", backgroundSize: "20px 20px", backgroundPosition: "0 0" });
  });
});
