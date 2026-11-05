import { expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";

const page = (props: Record<string, unknown>) => ({ version: 1, root: { id: "page", type: "page", children: [{ id: "sec", type: "section", children: [{ id: "slider", type: "slider", props }] }] } });
const slides = [{ src: "/merchant.svg", kind: "image", title: { en: "New work", ar: "عمل جديد", he: "עבודה חדשה" }, text: { en: "A description" }, cta: { en: "Explore" }, caption: { en: "Caption" }, href: "/shop" }];

test("every slider effect and caption position survives saving with localized slide content", () => {
  for (const effect of ["slide", "fade", "zoom", "wipe", "flip", "coverflow", "slices"]) {
    for (const captionPosition of ["bottom", "center", "split"]) {
      const props = { slides, effect, axis: "y", duration: 1.25, zoom: 1.2, thumbnails: true, progress: true, captionPosition, loop: false, arrows: true, dots: false };
      const result = checkTree(page(props));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.tree.root.children![0].children![0].props).toEqual(props);
    }
  }
});

test("coverflow zoom stays within the supported display range", () => {
  expect(checkTree(page({ slides, zoom: 0.69 })).ok).toBe(false);
  expect(checkTree(page({ slides, zoom: 1.51 })).ok).toBe(false);
});

test("slider settings reject arbitrary effects, unsafe media, excessive localized content and invalid ranges", () => {
  for (const patch of [{ effect: "custom-css" }, { axis: "z" }, { duration: -0.1 }, { duration: 2.1 }, { duration: Infinity }, { captionPosition: "anywhere" }, { thumbnails: "yes" }, { progress: 1 }, { slides: [{ src: "javascript:alert(1)" }] }, { slides: [{ src: "/x.svg", title: { en: "x".repeat(161) } }] }, { slides: [{ src: "/x.svg", text: { en: "x".repeat(1201) } }] }, { slides: [{ src: "/x.svg", cta: { en: "x".repeat(61) } }] }, { slides: [{ src: "/x.svg", href: "javascript:alert(1)" }] }]) {
    expect(checkTree(page({ slides, ...patch })).ok, JSON.stringify(patch)).toBe(false);
  }
  const result = checkTree(page({ slides: [{ src: "/legacy.svg" }] }));
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.tree.root.children![0].children![0].props).toEqual({ slides: [{ src: "/legacy.svg", kind: "image" }], loop: true, arrows: true, dots: true });
});
