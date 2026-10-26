import { describe, test, expect } from "vitest";
import { CategoryTranslations, ProductTranslations, TypeTranslations, mainLanguage, translationsOf } from "../lib/translations.js";

// The shop's content in its other languages (src/lib/translations.ts); no database needed.
describe("content translations", () => {
  test("only what was written is kept: empty boxes and languages drop out", () => {
    expect(
      ProductTranslations.parse({
        en: { title: "  Rose dress ", description: "", seoTitle: "   ", attributes: { care: "Hand wash", note: "" }, colors: { "توتي": "Berry", "وردي": "" } },
        he: { title: "", attributes: {} },
      }),
    ).toEqual({ en: { title: "Rose dress", attributes: { care: "Hand wash" }, colors: { "توتي": "Berry" } } });
    expect(ProductTranslations.parse({})).toEqual({});
    expect(CategoryTranslations.parse({ en: { name: "Dresses" }, he: { name: "" } })).toEqual({ en: { name: "Dresses" } });
  });

  test("a product type: its labels and each field's label and choices", () => {
    expect(
      TypeTranslations.parse({
        he: { colorLabel: "צבע", fields: { fabric: { label: "בד", options: { "شيفون": "שיפון", "كريب": "" } }, length: { label: "" } } },
      }),
    ).toEqual({ he: { colorLabel: "צבע", fields: { fabric: { label: "בד", options: { "شيفون": "שיפון" } } } } });
  });

  test("an unknown language or too long a text is refused when saving", () => {
    expect(ProductTranslations.safeParse({ en: { title: "x".repeat(161) } }).success).toBe(false);
    expect(ProductTranslations.parse({ fr: { title: "Robe" } })).toEqual({});
  });

  test("a broken saved value reads as none; the main language defaults to Arabic", () => {
    expect(translationsOf(ProductTranslations, "oops")).toEqual({});
    expect(translationsOf(ProductTranslations, null)).toEqual({});
    expect(mainLanguage({})).toBe("ar");
    expect(mainLanguage({ languages: { enabled: ["en", "he"], default: "he" } })).toBe("he");
    expect(mainLanguage({ languages: { default: "fr" } })).toBe("ar");
  });
});
