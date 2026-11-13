import { expect, test } from "@playwright/test";
import { CORNER_PARTS, treeCss } from "../src/pageTree/css";
import type { PageTree, TreeNode } from "../src/pageTree/tree";

// An element's corners reach what it draws inside itself (pageTree/css.ts CORNER_PARTS): a reviews block's cards, a
// chart's panel, a form's box. Rounding only the element's own box showed nothing on most kinds, which have no
// surface of their own there.

const page = (...children: TreeNode[]): PageTree => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: {}, children }] } });
const node = (id: string, type: string, style?: Record<string, unknown>): TreeNode => ({ id, type, props: {}, ...(style ? { style } : {}) } as TreeNode);

test("corners set on a block reach its cards, on each screen that sets them", () => {
  const css = treeCss(page(node("tst", "testimonials", { base: { radius: 40 }, mobile: { radius: 12 } })));
  // The element's own box, and its cards.
  expect(css).toContain(".pt-tst{border-radius:40px}");
  expect(css).toContain(".pt-tst.pt .pt-tst-card{border-radius:40px}");
  // The phone's own corners, in the phone's rules.
  const phone = css.slice(css.lastIndexOf("@media (max-width:"));
  expect(phone).toContain(".pt-tst.pt .pt-tst-card{border-radius:12px}");
  expect(css.indexOf(".pt-tst.pt .pt-tst-card{border-radius:40px}")).toBeLessThan(css.lastIndexOf("@media (max-width:"));
});

test("each kind's own parts: its direct child, a part of one look, several parts", () => {
  const css = treeCss(page(
    node("ins", "instrument", { base: { radius: 30 } }),
    node("acc", "accordion", { base: { radius: 30 } }),
    node("cat", "categories", { base: { radius: 30 } }),
    node("frm", "form", { base: { radius: 30 } }),
  ));
  expect(css).toContain(".pt-ins.pt>div{border-radius:30px}");
  // Only the look that draws cards (a list of lines has nothing to round).
  expect(css).toContain(".pt-acc.pt.pt-acc-cards .pt-acc-item{border-radius:30px}");
  expect(css).toContain(".pt-cat.pt .pt-tile img,.pt-cat.pt .pt-tile-blank,.pt-cat.pt .pt-tiles-overlay .pt-tile{border-radius:30px}");
  expect(css).toContain(".pt-frm.pt section{border-radius:30px}");
});

test("no corners set, or a kind with a surface of its own: nothing is added; what's inside a box isn't touched", () => {
  const plain = treeCss(page(node("tst", "testimonials"), node("btn", "button", { base: { radius: 40 } })));
  expect(plain).not.toContain(".pt-tst.pt");
  expect(plain).not.toContain(".pt-btn.pt");
  expect(plain).toContain(".pt-btn{border-radius:40px}");
  // A rounded box with a block inside: the block keeps its own corners.
  const box: TreeNode = { id: "box", type: "stack", props: {}, style: { base: { radius: 40, bg: "surface" } }, children: [node("tst", "testimonials")] } as TreeNode;
  const nested = treeCss(page(box));
  expect(nested).toContain("border-radius:40px");
  expect(nested).not.toContain(".pt-tst.pt");
});

test("a drawing is cut to its corners, unless it says how what sticks out shows", () => {
  const rule = (css: string) => css.match(/\.pt-art\{[^}]*\}/)?.[0] ?? "";
  expect(rule(treeCss(page(node("art", "svg", { base: { radius: 24 } }))))).toContain("border-radius:24px;overflow:hidden");
  expect(rule(treeCss(page(node("art", "svg", { base: { width: "200px" } }))))).not.toContain("overflow");
  // Its own choice comes later in the rule, so it wins.
  const own = rule(treeCss(page(node("art", "svg", { base: { radius: 24, overflow: "visible" } }))));
  expect(own.lastIndexOf("overflow:visible")).toBeGreaterThan(own.indexOf("overflow:hidden"));
  // A picture is cut by its own corners already: nothing is added.
  expect(treeCss(page(node("pic", "image", { base: { radius: 24 } }))).match(/\.pt-pic\{[^}]*\}/)?.[0]).not.toContain("overflow");
});

test("every kind listed names real parts", () => {
  for (const [kind, parts] of Object.entries(CORNER_PARTS)) {
    expect(parts.length, kind).toBeGreaterThan(0);
    for (const part of parts) expect(part, kind).toMatch(/^(>| |\.)[a-z0-9.> -]+$/);
  }
});
