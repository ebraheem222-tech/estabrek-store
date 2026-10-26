import { describe, expect, it } from "vitest";
import { countDone, readPath, tidyTranslations, translationLangs, writePath, type TranslationRow } from "./translations";

describe("content translations (admin)", () => {
  it("translates into the shop's other languages", () => {
    expect(translationLangs({})).toEqual({ main: "ar", others: ["en"] });
    expect(translationLangs({ languages: { enabled: ["ar", "en", "he"], default: "he" } })).toEqual({ main: "he", others: ["ar", "en"] });
    expect(translationLangs({ languages: { enabled: ["ar"], default: "ar" } }).others).toEqual([]);
  });

  it("reads and writes nested boxes without touching the rest", () => {
    let tr = writePath({}, "he", ["title"], "שמלת ורד");
    tr = writePath(tr, "he", ["fields", "fabric", "options", "شيفون"], "שיפון");
    tr = writePath(tr, "en", ["colors", "Berry"], "Berry");
    expect(tr).toEqual({ he: { title: "שמלת ורד", fields: { fabric: { options: { "شيفون": "שיפון" } } } }, en: { colors: { Berry: "Berry" } } });
    expect(readPath(tr, "he", ["fields", "fabric", "options", "شيفون"])).toBe("שיפון");
    expect(readPath(tr, "he", ["nothing", "here"])).toBe("");
  });

  it("saves only what was written, and counts it", () => {
    const tr = { he: { title: " שמלה ", description: "  ", colors: { Rose: "" } }, en: {} };
    expect(tidyTranslations(tr)).toEqual({ he: { title: "שמלה" } });
    const rows: TranslationRow[] = [
      { path: ["title"], label: "الاسم", base: "فستان", max: 160 },
      { path: ["description"], label: "الوصف", base: "وصف", max: 5000 },
      { path: ["seoTitle"], label: "جوجل", base: "", max: 120 },
    ];
    expect(countDone(tr, "he", rows)).toBe(1);
  });
});
