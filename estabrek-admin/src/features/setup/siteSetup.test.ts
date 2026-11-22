import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { SITES, withChoices } from "../../studio/templates/sites";
import { choicesOf, siteForm, stillSample } from "../myFeatures/siteForm";
import { SITE_THEMES, packOfSite, siteSetupRequest } from "./siteSetup";
import { PACKS } from "./packs";

// A new copy set up as a whole site (sites wave 0.4): the store's part of the setup, and the site's form.

const THEMES_DIR = resolve(__dirname, "../../../../estabrek-storefront/src/storeThemes/themes");
/** The shop's own theme ids (each theme file's `id: "…"` lines). */
const shopThemes = new Set(readdirSync(THEMES_DIR).flatMap((f) => [...readFileSync(resolve(THEMES_DIR, f), "utf8").matchAll(/\bid: "([a-z0-9-]+)"/g)].map((m) => m[1])));

describe("A store set up as a whole site", () => {
  test("every site starts with one of the shop's own themes, and is set up as a kind of store the setup knows", () => {
    expect(shopThemes.size).toBeGreaterThan(50);
    for (const s of SITES) {
      expect(SITE_THEMES[s.key], s.key).toBeTruthy();
      expect(shopThemes.has(SITE_THEMES[s.key]), `${s.key}: ${SITE_THEMES[s.key]}`).toBe(true);
      expect(PACKS.some((p) => p.id === s.fam), `${s.key}: ${s.fam}`).toBe(true);
    }
    expect(Object.keys(SITE_THEMES).sort()).toEqual(SITES.map((s) => s.key).sort());
  });

  test("the setup's request: the business's name as the store's, the site's theme, the assistant, and nothing a store sells", () => {
    const restaurant = SITES.find((s) => s.key === "site-restaurant")!;
    const body = siteSetupRequest({ bp: restaurant, name: { ar: "أبو سمير", en: "Abu Samir's", he: "" }, logoUrl: "https://example.com/logo.png", assistant: { enabled: true, persona: "sami" } });
    expect(body).toMatchObject({
      industry: packOfSite(restaurant).industry,
      name: { ar: "أبو سمير", en: "Abu Samir's" },
      logoUrl: "https://example.com/logo.png",
      theme: { id: "coffee-roast", mode: null },
      categories: [],
      types: [],
      pages: [],
      menu: [],
      replaceHome: false,
      assistant: { enabled: true, persona: "sami" },
    });
    expect(body.name).not.toHaveProperty("he");
    expect(body.design).toBeUndefined();
  });
});

describe("A site's form", () => {
  const clinic = SITES.find((s) => s.key === "site-dental-clinic")!;
  test("untouched, it chooses nothing; the store's own name in one language is the name in all three", () => {
    expect(choicesOf(clinic, siteForm(clinic))).toEqual({});
    const f = siteForm(clinic, { ar: "عيادة الشفاء", en: "", he: "" });
    expect(f.name.v).toEqual({ ar: "عيادة الشفاء", en: "عيادة الشفاء", he: "عيادة الشفاء" });
    expect(f.name.own).toEqual({ ar: true, en: false, he: false });
    expect(choicesOf(clinic, f).biz?.name).toEqual({ ar: "عيادة الشفاء", en: "عيادة الشفاء", he: "عيادة الشفاء" });
    expect(withChoices(clinic, choicesOf(clinic, f)).name.ar).toContain("عيادة الشفاء");
  });

  test("says which details are still the sample's", () => {
    const f = siteForm(clinic);
    expect([...stillSample(clinic, f)].sort()).toEqual(["address", "city", "email", "hours", "name", "phone"]);
    const mine = { ...f, contact: { ...f.contact, phone: "050-000-0000", email: "" } };
    expect(stillSample(clinic, mine).has("phone")).toBe(false);
    // Left empty: the sample's stays, so it is said too.
    expect(stillSample(clinic, mine).has("email")).toBe(true);
  });
});
