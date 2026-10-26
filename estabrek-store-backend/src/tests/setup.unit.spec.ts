import { describe, test, expect } from "vitest";
import { SetupBody, SetupError, otherLangs, sectionRows, wordIn } from "../modules/setup/setup.js";

// Setting up a new store (src/modules/setup/setup.ts): the starter content is checked before
// any row is made; no database needed.
const hero = (title: string) => ({ title, subtitle: "", primaryButton: { label: "Shop", href: "/shop" } });

describe("store setup: the starter content is checked", () => {
  test("a text in a language: its own, else the main language's", () => {
    expect(wordIn({ ar: "هواتف", en: "Phones" }, "en", "ar")).toBe("Phones");
    expect(wordIn({ ar: "هواتف" }, "he", "ar")).toBe("هواتف");
    expect(wordIn(undefined, "ar", "ar")).toBe("");
    expect(otherLangs("name", { ar: "هواتف", en: "Phones", he: " " }, "ar")).toEqual({ en: { name: "Phones" } });
  });

  test("a section becomes its main language's data and the others' translations, each checked like the editor checks it", () => {
    const rows = sectionRows({ type: "HERO", data: { ar: hero("أهلاً"), en: hero("Welcome"), he: hero("ברוכים הבאים") } }, "ar");
    expect(rows.type).toBe("HERO");
    expect(rows.data.title).toBe("أهلاً");
    expect(rows.translations.map((t) => [t.locale, t.data.title])).toEqual([
      ["en", "Welcome"],
      ["he", "ברוכים הבאים"],
    ]);
    // A store whose main language is English keeps English in the section.
    expect(sectionRows({ type: "HERO", data: { ar: hero("أهلاً"), en: hero("Welcome") } }, "en").data.title).toBe("Welcome");
    // A language without its own words simply shows the main one (no row).
    expect(sectionRows({ type: "HERO", data: { ar: hero("أهلاً") } }, "ar").translations).toEqual([]);
  });

  test("a section that couldn't be published is refused before anything is written", () => {
    expect(() => sectionRows({ type: "HERO", data: { ar: { title: "", subtitle: "" } } }, "ar")).toThrow(SetupError);
    expect(() => sectionRows({ type: "FAQ", data: { ar: { title: "أسئلة", items: [] } } }, "ar")).toThrow(SetupError);
    expect(() => sectionRows({ type: "HERO", data: {} }, "ar")).toThrow(SetupError);
  });

  test("the request: known industries, tidy addresses, links that stay in the shop or use https", () => {
    const ok = SetupBody.safeParse({
      industry: "phones",
      theme: { id: "phone-hub", mode: "dark" },
      categories: [{ slug: "phones", name: { ar: "موبايلات", en: "Phones" }, children: [{ slug: "chargers", name: { ar: "شواحن" } }] }],
      pages: [{ slug: "/", name: { ar: "الرئيسية" }, sections: [{ type: "HERO", data: { ar: hero("أهلاً") } }] }],
      menu: [{ label: { ar: "موبايلات" }, href: "/c/phones" }],
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.replaceHome).toBe(false);
      expect(ok.data.types).toEqual([]);
    }
    const bad = (patch: Record<string, unknown>) => SetupBody.safeParse({ industry: "phones", theme: { id: null }, ...patch }).success;
    expect(bad({ industry: "weapons" })).toBe(false);
    expect(bad({ categories: [{ slug: "Bad Slug", name: { ar: "x" } }] })).toBe(false);
    expect(bad({ menu: [{ label: { ar: "x" }, href: "http://evil.example" }] })).toBe(false);
    expect(bad({ menu: [{ label: { ar: "x" }, href: "//evil.example" }] })).toBe(false);
    expect(bad({ menu: [{ label: { ar: "x" }, href: "javascript:alert(1)" }] })).toBe(false);
    expect(bad({ pages: [{ slug: "about", name: { ar: "x" }, sections: [{ type: "HERO", data: { ar: hero("x") } }] }] })).toBe(false);
    expect(bad({ menu: [{ label: { ar: "x" }, href: "https://wa.me/1" }] })).toBe(true);
  });
});
