import { describe, expect, test } from "vitest";
import { checkTree, SLIDER_ARROW_LOOKS, SLIDER_DOT_LOOKS, SLIDER_LOOKS } from "../lib/pageTree.js";
import { CARD_BADGES, CARD_BUTTONS, CARD_ENTERS, CARD_HOVERS, CARD_LIFTS, CardDesign } from "../lib/visualControls.js";
import * as shop from "../../../estabrek-storefront/src/lib/visualControls";
import * as shopSlider from "../../../estabrek-storefront/src/pageTree/sliderEffects";
import { CARD_BADGE_NAMES, CARD_BUTTON_NAMES, CARD_ENTER_NAMES, CARD_HOVER_NAMES, CARD_LIFT_NAMES, CARD_PRESETS, CARD_RATIO_NAMES, withPreset } from "../../../estabrek-admin/src/features/settings/cardPresets";
import { SLIDER_ARROW_LOOK_NAMES, SLIDER_DOT_LOOK_NAMES, SLIDER_LOOK_NAMES } from "../../../estabrek-admin/src/studio/sliderLooks";
import { newElement, START_WIDTH, type NewKind } from "../../../estabrek-admin/src/studio/columns";

// Slider shapes, the product card's motion and ready designs, the shop page's settings, and the
// width new pieces start at: the API, the shop and the editor keep the same lists.

type Node = { id: string; type: string; props: Record<string, unknown>; style?: Record<string, unknown>; children?: Node[] };
const page = (...children: Node[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: {}, children }] } });
const ok = (tree: unknown) => {
  const r = checkTree(tree);
  return r.ok ? [] : r.issues.map((i) => `${i.path}: ${i.message}`);
};
const keys = (named: [string, ...unknown[]][]) => named.map(([k]) => k);
const ids = () => {
  let n = 0;
  return (p: string) => `${p}-${n++}`;
};

describe("slider shapes", () => {
  test("the API, the shop and the editor have the same shapes, arrows and dots", () => {
    expect([...shopSlider.SLIDER_LOOKS]).toEqual([...SLIDER_LOOKS]);
    expect([...shopSlider.SLIDER_ARROW_LOOKS]).toEqual([...SLIDER_ARROW_LOOKS]);
    expect([...shopSlider.SLIDER_DOT_LOOKS]).toEqual([...SLIDER_DOT_LOOKS]);
    expect(keys(SLIDER_LOOK_NAMES)).toEqual([...SLIDER_LOOKS]);
    expect(keys(SLIDER_ARROW_LOOK_NAMES)).toEqual([...SLIDER_ARROW_LOOKS]);
    expect(keys(SLIDER_DOT_LOOK_NAMES)).toEqual([...SLIDER_DOT_LOOKS]);
  });

  test("every shape saves; something else is refused; the shop draws only what it knows", () => {
    const slider = (props: Record<string, unknown>): Node => ({ id: "sl", type: "slider", props: { slides: [{ src: "https://res.cloudinary.com/x/image/upload/a.jpg", kind: "image" }], ...props } });
    for (const look of SLIDER_LOOKS) for (const [i, arrowLook] of SLIDER_ARROW_LOOKS.entries()) expect(ok(page(slider({ look, arrowLook, dotLook: SLIDER_DOT_LOOKS[i % SLIDER_DOT_LOOKS.length] }))), look).toEqual([]);
    expect(ok(page(slider({ look: "hexagon" })))).not.toEqual([]);
    expect(ok(page(slider({ dotLook: "url(x)" })))).not.toEqual([]);
    expect(shopSlider.sliderLooksOf({ look: "phone", arrowLook: "glass", dotLook: "numbers" })).toEqual({ look: "phone", arrows: "glass", dots: "numbers" });
    // The usual ones draw nothing extra; unknown ones are left out.
    expect(shopSlider.sliderLooksOf({ look: "plain", arrowLook: "round", dotLook: "dots" })).toEqual({ look: undefined, arrows: undefined, dots: undefined });
    expect(shopSlider.sliderLooksOf({ look: "javascript:x" }).look).toBeUndefined();
  });
});

describe("product cards", () => {
  test("the API, the shop and the editor name the same motions", () => {
    expect([...shop.CARD_HOVERS]).toEqual([...CARD_HOVERS]);
    expect([...shop.CARD_LIFTS]).toEqual([...CARD_LIFTS]);
    expect([...shop.CARD_ENTERS]).toEqual([...CARD_ENTERS]);
    expect([...shop.CARD_BUTTONS]).toEqual([...CARD_BUTTONS]);
    expect([...shop.CARD_BADGES]).toEqual([...CARD_BADGES]);
    expect(keys(CARD_HOVER_NAMES).sort()).toEqual([...CARD_HOVERS].sort());
    expect(keys(CARD_LIFT_NAMES)).toEqual([...CARD_LIFTS]);
    expect(keys(CARD_ENTER_NAMES)).toEqual([...CARD_ENTERS]);
    expect(keys(CARD_BUTTON_NAMES)).toEqual([...CARD_BUTTONS]);
    expect(keys(CARD_BADGE_NAMES)).toEqual([...CARD_BADGES]);
    expect(keys(CARD_RATIO_NAMES)).toEqual([...shop.CARD_RATIOS]);
  });

  test("every ready design saves on the page, the shop and a product row, and reads back the same", () => {
    expect(CARD_PRESETS.length).toBeGreaterThanOrEqual(10);
    for (const { key, design } of CARD_PRESETS) {
      expect(CardDesign.safeParse(design).success, key).toBe(true);
      expect(shop.readCardDesign(design), key).toEqual(design);
      const tree = { version: 1, root: { id: "page", type: "page", props: { cardDesign: design }, children: [{ id: "sec", type: "section", props: {}, children: [
        { id: "shop", type: "shop", props: { columns: 3, cardDesign: design } },
        { id: "row", type: "products", props: { source: "new", limit: 4, layout: "grid", cardDesign: design } },
      ] }] } };
      expect(ok(tree), key).toEqual([]);
    }
  });

  test("a ready design keeps the merchant's colours unless it brings its own", () => {
    const mine = { background: "#ffeeee", buttonColor: "#aa0000", hover: "zoom" as const };
    expect(withPreset(mine, CARD_PRESETS.find((p) => p.key === "boutique")!.design)).toMatchObject({ background: "#ffeeee", buttonColor: "#aa0000", hover: "zoomSwap" });
    expect(withPreset(mine, CARD_PRESETS.find((p) => p.key === "luxury")!.design)).toMatchObject({ background: "#111111", buttonColor: "#c9a96e" });
  });

  test("bad values are refused by the API and left out by the shop", () => {
    for (const bad of [{ hover: "explode" }, { enter: "url(x)" }, { titleLines: 4 }, { titleLines: 1.5 }, { badgeStyle: "<b>" }, { imageRatio: "21/9" }]) {
      expect(CardDesign.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
      expect(shop.readCardDesign(bad), JSON.stringify(bad)).toEqual({});
    }
  });
});

describe("the shop page", () => {
  test("space between the cards, the filters' side and sticky filters save; too much space is refused", () => {
    expect(ok(page({ id: "shop", type: "shop", props: { columns: 4, gap: 32, filtersSide: "end", stickyFilters: true } }))).toEqual([]);
    expect(ok(page({ id: "shop", type: "shop", props: { gap: 99 } }))).not.toEqual([]);
    expect(ok(page({ id: "shop", type: "shop", props: { filtersSide: "left" } }))).not.toEqual([]);
  });
});

describe("new pieces start at a size that fits", () => {
  test.each(Object.keys(START_WIDTH) as NewKind[])("%s starts at its width, never wider than its place, and saves", (kind) => {
    const made = newElement(kind, "en", ids(), kind === "video" ? "https://res.cloudinary.com/x/video/upload/a.mp4" : "https://res.cloudinary.com/x/image/upload/a.jpg") as Node;
    const base = (made.style as { base: Record<string, unknown> }).base;
    expect(base.width).toBe(START_WIDTH[kind]);
    expect(base.maxWidth).toBe("100%");
    expect(base.self).toBe("center");
    expect(ok(page(made)), kind).toEqual([]);
  });

  test("the rest keep their own size", () => {
    expect((newElement("heading", "en", ids()) as Node).style).toBeUndefined();
    expect(((newElement("stack", "en", ids()) as Node).style as { base: Record<string, unknown> }).base.width).toBe("100%");
  });
});
