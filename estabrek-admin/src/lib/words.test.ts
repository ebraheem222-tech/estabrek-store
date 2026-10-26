import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { tr } from "./words";
import { HE } from "./words.he";
import { followAccountLanguage, loc, setLangForTests } from "./lang";

afterEach(() => {
  setLangForTests("ar");
  vi.restoreAllMocks();
});

describe("the admin's words", () => {
  it("Arabic as written, English, and Hebrew from the dictionary, with values", () => {
    expect(tr("حفظ", "Save")).toBe("حفظ");
    setLangForTests("en");
    expect(tr("حفظ", "Save")).toBe("Save");
    expect(tr(`باقي ${3}`, "Only {0} left", [3])).toBe("Only 3 left");
    setLangForTests("he");
    expect(tr("حفظ", "Save")).toBe("שמירה");
    expect(tr("x", "{0} new", [4])).toBe("4 חדשות");
    // Not in the dictionary yet: the English shows.
    expect(tr("س", "Something not translated")).toBe("Something not translated");
  });

  it("dates and numbers: Arabic keeps each place's format; English and Hebrew get theirs", () => {
    expect(loc()).toBe("ar");
    expect(loc("ar-EG-u-nu-latn")).toBe("ar-EG-u-nu-latn");
    setLangForTests("en");
    expect(loc("ar-EG-u-nu-latn")).toBe("en-GB");
    setLangForTests("he");
    expect(loc()).toBe("he-IL");
  });

  it("after sign-in, the account's choice wins; without one, this browser's choice stays", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    localStorage.removeItem("admin-lang");
    followAccountLanguage({ locale: "en", localeChosen: false }); // no choice here yet: the store's language
    expect(localStorage.getItem("admin-lang")).toBe("en");
    expect(reload).toHaveBeenCalledTimes(1);
    followAccountLanguage({ locale: "he", localeChosen: false }); // this browser chose English: it stays
    expect(localStorage.getItem("admin-lang")).toBe("en");
    followAccountLanguage({ locale: "he", localeChosen: true }); // the account chose Hebrew
    expect(localStorage.getItem("admin-lang")).toBe("he");
    vi.unstubAllGlobals();
    localStorage.removeItem("admin-lang");
  });
});

// Every English line in the admin has its Hebrew (scratchpad a3/build_he.py writes words.he.ts).
describe("the Hebrew dictionary", () => {
  it("covers every tr(…) in the admin", () => {
    const src = path.resolve(__dirname, "..");
    const call = /\btr\(\s*(?:"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*,\s*("(?:[^"\\\n]|\\.)*")/g;
    const missing: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !/^words/.test(e.name) && !/\.test\./.test(e.name)) {
          for (const m of fs.readFileSync(p, "utf8").matchAll(call)) {
            const key = JSON.parse(m[1]) as string;
            if (!(key in HE)) missing.push(`${path.relative(src, p)}: ${key}`);
          }
        }
      }
    };
    walk(src);
    expect(missing).toEqual([]);
  });
});
