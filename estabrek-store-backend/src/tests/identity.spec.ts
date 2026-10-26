import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { identityOf, pick, storeBrief, storeName } from "../modules/identity/identity.js";
import { currencySign } from "../lib/currency.js";
import { render, DEFAULT_TEXT, SAMPLES } from "../lib/automations.js";

// The store's own identity (admin → هوية المتجر) instead of the platform's name.

const estabrek = {
  siteName: "متجر استبرق",
  header: {
    identity: {
      name: { ar: "متجر استبرق", en: "Estabrek", he: "" },
      shortName: { ar: "استبرق", en: "Estabrek", he: "" },
      about: { ar: "حجاب، عبايات، فساتين وملابس محتشمة للنساء.", en: "Hijabs, abayas, dresses and modest clothing for women.", he: "" },
      industry: "fashion",
      audience: "women",
    },
  },
};

describe("Store identity", () => {
  test("before the owner fills it in, the name is the site name; nothing at all → a plain word", () => {
    expect(storeName({ siteName: "متجر نور", header: null })).toBe("متجر نور");
    expect(storeName({ siteName: "My Store", header: {} })).toBe("المتجر");
    expect(storeName(null, "en")).toBe("Store");
    expect(storeName(null, "he")).toBe("החנות");
    const id = identityOf({ siteName: "Noor", header: { identity: { industry: "electronics" } } });
    expect(id).toMatchObject({ industry: "electronics", audience: "everyone", name: { ar: "Noor", en: "Noor", he: "Noor" } });
  });

  test("a broken value only loses itself", () => {
    const id = identityOf({ siteName: "x", header: { identity: { industry: "spaceships", audience: "women", name: { ar: 5, en: "Nour" } } } });
    expect(id.industry).toBe("general");
    expect(id.audience).toBe("women");
    expect(id.name.en).toBe("x"); // the whole broken name falls back
  });

  test("one language, else the others", () => {
    expect(pick({ ar: "", en: "Noor", he: "" }, "ar")).toBe("Noor");
    expect(pick({ ar: "نور", en: "", he: "נור" }, "he")).toBe("נור");
  });

  test("AI prompts speak for the store: what it sells and who it talks to", () => {
    expect(storeBrief(estabrek)).toBe("Estabrek is a fashion and clothing shop (Hijabs, abayas, dresses and modest clothing for women.). Address the shopper as a woman (feminine forms).");
    expect(storeBrief({ siteName: "Noor", header: { identity: { industry: "phones" } } })).toBe("Noor is a mobile phones and accessories shop. Address shoppers in a way that suits everyone.");
  });

  test("messages show the store's currency", () => {
    expect(currencySign("ILS")).toBe("₪");
    expect(currencySign("usd")).toBe("$");
    expect(currencySign("XYZ")).toBe("XYZ");
    expect(render(DEFAULT_TEXT["order.created"], SAMPLES["order.created"])).toContain("240 ₪");
    expect(render(DEFAULT_TEXT["order.created"], { ...SAMPLES["order.created"], currency: "$" })).toContain("240 $");
  });
});

// Words the platform must never show a client's shoppers from its own code.
describe("No platform name in what shoppers get", () => {
  const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "tests" && e.name !== "scripts") walk(p); }
      else if (/\.ts$/.test(e.name)) files.push(p);
    }
  };
  walk(src);
  // Platform pieces that may say its name: the launcher it ships, and this rule's own list.
  const allowed = [/protected[\\/]launcher\.service\.ts$/, /modules[\\/]identity[\\/]identity\.ts$/];

  test("no «استبرق» / Estabrek in strings (comments and internal keys aside)", () => {
    const hits: string[] = [];
    for (const f of files) {
      if (allowed.some((r) => r.test(f))) continue;
      fs.readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
        const code = line.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
        for (const m of code.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)) {
          if (/استبرق|Estabrek|ESTABREK/.test(m[2])) hits.push(`${path.relative(src, f)}:${i + 1}: ${m[2].slice(0, 80)}`);
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
