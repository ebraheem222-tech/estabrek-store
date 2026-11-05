import { describe, expect, it } from "vitest";
import { checkTree } from "../lib/pageTree.js";

const item = { title: { en: "  First panel  ", ar: "الأول" }, text: { en: "Details" }, image: "/art/first.svg", href: "/shop", cta: { en: "Explore" } };
const check = (props: Record<string, unknown>) => checkTree({ version: 1, root: { id: "page", type: "page", children: [{ id: "section", type: "section", children: [{ id: "gallery", type: "showcase", props }] }] } });

describe("editable expanding showcase", () => {
  it("normalizes localized items and fills usable defaults", () => {
    const result = check({ items: [item] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tree.root.children![0].children![0].props).toEqual({
      items: [{ ...item, title: { en: "First panel", ar: "الأول" } }], layout: "horizontal", activation: "click", initial: 0, ratio: 4, height: 480, duration: 0.55, overlay: 0.5,
    });
  });

  it("clamps the initial panel to the available list and accepts boundary settings", () => {
    const result = check({ items: [item, { title: { he: "שני" } }], initial: 7, label: { en: "Gallery" }, layout: "vertical", activation: "hover", ratio: 6, height: 800, duration: 0, overlay: 0.9 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tree.root.children![0].children![0].props).toMatchObject({ initial: 1, layout: "vertical", activation: "hover", duration: 0 });
  });

  it.each([
    { items: [] }, { items: Array.from({ length: 9 }, () => item) },
    { items: [{ ...item, image: "javascript:alert(1)" }] },
    { items: [{ ...item, image: "//evil.test/a.jpg" }] },
    { items: [{ ...item, href: "data:text/html,x" }] },
    { items: [{ ...item, title: { en: "x".repeat(161) } }] },
    { items: [{ ...item, text: { en: "x".repeat(1201) } }] },
    { items: [{ ...item, cta: { en: "x".repeat(61) } }] },
    { label: { en: "x".repeat(161) } }, { layout: "grid" }, { activation: "auto" },
    { initial: 1.5 }, { initial: -1 }, { initial: 8 }, { ratio: 1 }, { ratio: 7 },
    { height: 239 }, { height: 801 }, { height: 480.5 }, { duration: -1 }, { duration: 1.6 }, { overlay: -0.1 }, { overlay: 1 },
  ])("rejects malformed or unsafe props %#", (patch) => {
    expect(check({ items: [item], ...patch }).ok).toBe(false);
  });
});
