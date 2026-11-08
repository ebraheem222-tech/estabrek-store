import { expect, test } from "vitest";
import { contentBinding, replaceContent, bindingLink } from "./partContent";
const props = { items: [{ label: { en: "First link", ar: "الأول" }, href: "/shop" }, { label: { en: "Second link", ar: "الثاني" }, href: "/about" }] };
test("a selected nested label binds its source item and preserves other locales and siblings", () => {
  const binding = contentBinding(props, "Second link", "en", "ar", "items.1.label")!;
  expect(binding.path).toEqual(["items", 1, "label"]);
  expect(bindingLink(props, binding)).toEqual({ path: ["items", 1, "href"], value: "/about" });
  const next = replaceContent(props, binding, "en", "Changed second")!;
  expect(next.items[1].label).toEqual({ en: "Changed second", ar: "الثاني" });
  expect(next.items[0]).toEqual(props.items[0]);
  expect(props.items[1].label.en).toBe("Second link");
});
test("ambiguous words, catalog-only text and unsafe paths cannot change unrelated props", () => {
  expect(contentBinding({ items: [{ label: { en: "Same" } }, { label: { en: "Same" } }] }, "Same", "en", "ar")).toBeNull();
  expect(contentBinding({ columns: 3, showPrice: true }, "Product from catalog", "en", "ar")).toBeNull();
  expect(contentBinding({ title: { en: "Dresses" } }, "Dresses", "en", "ar")).toBeNull();
  expect(replaceContent(props, { path: ["__proto__", "polluted"], value: "" }, "en", "bad")).toBeNull();
});
test("a selected list line edits only that line and creates the selected locale from its fallback", () => {
  const original = { items: [{ features: { ar: "One\n\nTwo\nThree" } }] };
  const binding = contentBinding(original, "Two", "en", "ar", "items.0.features", 2)!;
  expect(binding.line).toBe(2);
  const next = replaceContent(original, binding, "en", "Changed")!;
  expect(next.items[0].features).toEqual({ ar: "One\n\nTwo\nThree", en: "One\n\nChanged\nThree" });
});

test("explicit source identity distinguishes equal item labels", () => {
  const data = { items: [{ label: { en: "Same" } }, { label: { en: "Same" } }] };
  expect(contentBinding(data, "Same", "en", "ar", "items.1.label")?.path).toEqual(["items", 1, "label"]);
  expect(contentBinding(data, "Other", "en", "ar", "items.1.label")).toBeNull();
});
