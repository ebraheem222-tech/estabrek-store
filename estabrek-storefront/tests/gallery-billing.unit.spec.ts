import { expect, test } from "@playwright/test";
import { galleryOf, filterGalleryItems } from "../src/pageTree/gallery";
import { planBilling } from "../src/pageTree/billing";

test("gallery drops unsafe media, retains safe content and bounds options", () => {
  const spec = galleryOf({ items: [null, { title: { en: "Unsafe" }, image: "//evil.test/a.svg" }, { title: { en: " First ", he: { bad: true } }, image: "/one.svg", href: "javascript:alert(1)", category: { en: " Art " } }, { title: { he: "שני" }, image: "https://example.test/two.jpg", href: "/shop" }], columns: 99, gap: Infinity, layout: "custom", hoverEffect: "script", activation: "auto", searchable: "true" });
  expect(spec).toMatchObject({ layout: "grid", columns: 3, gap: 20, hoverEffect: "none", activation: "click", lightbox: false, searchable: false });
  expect(spec!.items).toEqual([{ title: { en: "First" }, text: {}, category: { en: "Art" }, cta: {}, image: "/one.svg", href: undefined, source: 2 }, { title: { he: "שני" }, text: {}, category: {}, cta: {}, image: "https://example.test/two.jpg", href: "/shop", source: 3 }]);
  expect(galleryOf({ items: [] })).toBeNull();
});

test("gallery caps accepted items and localized text while preserving zero gap and chosen modes", () => {
  expect(galleryOf({ items: [{ image: "/own.jpg" }], layout: "bento", presentation: "index", initial: -1, filters: false, showCount: false })).toMatchObject({ layout: "bento", presentation: "index", initial: -1, filters: false, showCount: false });
  const spec = galleryOf({ items: Array.from({ length: 45 }, () => ({ image: "/one.svg", title: { en: "a".repeat(170) }, text: { en: "b".repeat(1300) }, category: { ar: "ج".repeat(90) }, cta: { he: "ק".repeat(70) } })), label: { he: "תמונות" }, layout: "masonry", columns: 6, gap: 0, hoverEffect: "reveal", lightbox: true, searchable: true, activation: "hover" });
  expect(spec).toMatchObject({ layout: "masonry", columns: 6, gap: 0, hoverEffect: "reveal", lightbox: true, searchable: true, activation: "hover", label: { he: "תמונות" } });
  expect(spec!.items).toHaveLength(40);
  expect(spec!.items[0].title.en).toHaveLength(160);
  expect(spec!.items[0].text.en).toHaveLength(1200);
  expect(spec!.items[0].category.ar).toHaveLength(80);
  expect(spec!.items[0].cta.he).toHaveLength(60);
});

test("category and search combine against shopper-visible localized fields", () => {
  const items = [{ title: "Alpha", text: "Blue ceramic", category: "Art" }, { title: "Beta", text: "Green wool", category: "Design" }, { title: "Gamma", text: "Blue wool", category: "Art" }];
  expect(filterGalleryItems(items, "Art", "  BLUE  ", "en").map((item) => item.title)).toEqual(["Alpha", "Gamma"]);
  expect(filterGalleryItems(items, "Design", "blue", "en")).toEqual([]);
  expect(filterGalleryItems([{ title: "כלי", text: "עבודת יד", category: "אמנות" }], "אמנות", "יד", "he")).toHaveLength(1);
});

test("yearly billing never fabricates a missing price or borrows a monthly period", () => {
  expect(planBilling({ price: "Contact", period: "/month", yearlyPrice: "Annual quote", yearlyPeriod: "/year" }, "yearly")).toEqual({ price: "Annual quote", period: "/year" });
  expect(planBilling({ price: "Contact", period: "/month" }, "yearly")).toEqual({ price: "", period: "" });
  expect(planBilling({ price: "Contact", period: "/month", yearlyPrice: "Annual quote" }, "yearly")).toEqual({ price: "Annual quote", period: "" });
  expect(planBilling({ price: "Contact", period: "/month", yearlyPrice: "Annual quote" }, "monthly")).toEqual({ price: "Contact", period: "/month" });
});
