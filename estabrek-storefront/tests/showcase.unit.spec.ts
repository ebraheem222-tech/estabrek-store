import { expect, test } from "@playwright/test";
import { showcaseOf } from "../src/pageTree/showcase";

test("untrusted showcase props keep safe media and localized text while bounding the active panel", () => {
  const spec = showcaseOf({ items: [null, { title: { en: " First ", he: { invalid: true } }, image: "javascript:alert(1)", href: "//evil.test", text: { ar: "نص" } }, { title: { en: "Second" }, image: "/art/panel.svg", href: "/shop" }], initial: 999, ratio: Infinity, duration: -3, height: "800" });
  expect(spec).toMatchObject({ initial: 1, ratio: 4, duration: 0.55, height: 480, layout: "horizontal", activation: "click", overlay: 0.5 });
  expect(spec!.items).toEqual([{ title: { en: "First" }, text: { ar: "نص" }, image: undefined, href: undefined, cta: {} }, { title: { en: "Second" }, text: {}, image: "/art/panel.svg", href: "/shop", cta: {} }]);
  expect(showcaseOf({ items: [] })).toBeNull();
  expect(showcaseOf({ items: "bad" })).toBeNull();
});

test("showcase limits panels and words and preserves motion-off and overlay boundaries", () => {
  const spec = showcaseOf({ items: Array.from({ length: 10 }, () => ({ title: { en: "x".repeat(200) }, text: { en: "x".repeat(1300) }, cta: { en: "x".repeat(100) } })), initial: -5, layout: "vertical", activation: "hover", ratio: 6, duration: 0, height: 800, overlay: 0.9 });
  expect(spec!.items).toHaveLength(8);
  expect(spec!.items[0].title.en).toHaveLength(160);
  expect(spec!.items[0].text.en).toHaveLength(1200);
  expect(spec!.items[0].cta.en).toHaveLength(60);
  expect(spec).toMatchObject({ initial: 0, layout: "vertical", activation: "hover", ratio: 6, duration: 0, height: 800, overlay: 0.9 });
});
