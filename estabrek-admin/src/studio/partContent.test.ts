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

test("old countdown defaults become editable localized words without freezing timer values", () => {
  const timer = { until: "2099-12-31T23:59:00Z" };
  const binding = contentBinding(timer, "دقيقة", "ar", "ar", "minuteLabel", undefined, "countdown")!;
  expect(binding?.value).toBe("دقيقة");
  const next = replaceContent(timer, binding, "ar", "دقائق", "ar", "countdown")!;
  expect(next).toEqual({ until: timer.until, minuteLabel: { ar: "دقائق" } });
  expect(contentBinding(timer, "19", "ar", "ar", "until", undefined, "countdown")).toBeNull();
  expect(contentBinding(timer, "دقيقة", "ar", "ar", "minuteLabel", undefined, "shop")).toBeNull();
  expect(replaceContent(timer, { path: ["missing", "label"], value: "" }, "ar", "bad", "ar", "countdown")).toBeNull();
});

test("empty or missing default fields can be edited while other locales survive", () => {
  const props = { beforeLabel: { ar: "" }, afterLabel: { en: "Custom after" } };
  const binding = contentBinding(props, "قبل", "ar", "ar", "beforeLabel", undefined, "beforeAfter")!;
  expect(binding?.value).toBe("قبل");
  expect(replaceContent(props, binding, "ar", "قديم", "ar", "beforeAfter")).toEqual({ beforeLabel: { ar: "قديم" }, afterLabel: { en: "Custom after" } });
});
