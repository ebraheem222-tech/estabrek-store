import { describe, expect, test } from "vitest";
import { plainText, storeFrom, TEBEX_TOKEN } from "../lib/tebex.js";

// A game server's Tebex webstore as its site shows it (wave G4 of docs/sites-300-plan.ar.md), by itself: Tebex's
// Headless API answers (the webstore, its categories with their packages) as words, prices and links on its webstore.

const WEBSTORE = { data: { id: 1, name: "Dew City <b>Store</b>", currency: "EUR", webstore_url: "https://dewcity.tebex.io/", lang: "en" } };
const pkg = (id: number, order: number, more: Record<string, unknown> = {}) => ({ id, name: `Pack ${id}`, order, total_price: 10, base_price: 10, currency: "EUR", image: `https://dunb17ur4ymx4.cloudfront.net/packages/${id}.png`, description: "<p>Fast <b>cars</b> &amp; a garage.</p><script>alert(1)</script>", ...more });

describe("Tebex's answers as a site shows them", () => {
  test("its categories and packages in Tebex's order, with words, prices and the way to each on the webstore", () => {
    const store = storeFrom(WEBSTORE, {
      data: [
        { id: 20, name: "Cars", order: 2, packages: [pkg(7, 2), pkg(5, 1, { total_price: 8, base_price: 12, image: "http://insecure.example/x.png" })] },
        { id: 10, name: "VIP", order: 1, packages: [pkg(3, 1, { total_price: "4.99" })] },
        { id: 30, name: "Empty", order: 3, packages: [] },
        { id: "x", name: "Broken" },
      ],
    });
    expect(store).toMatchObject({ name: "Dew City Store", currency: "EUR", url: "https://dewcity.tebex.io" });
    expect(store!.categories.map((c) => [c.name, c.packages.map((p) => p.id)])).toEqual([["VIP", [3]], ["Cars", [5, 7]]]);
    const sale = store!.categories[1].packages[0];
    expect(sale).toMatchObject({ price: 8, base: 12, image: null, href: "https://dewcity.tebex.io/package/5" });
    // Its words without Tebex's HTML (nor what a script would say).
    expect(sale.text).toBe("Fast cars & a garage.");
    expect(store!.categories[0].packages[0].price).toBe(4.99);
  });

  test("what isn't a webstore's isn't shown; words are cut; a token is Tebex's shape", () => {
    expect(storeFrom({ data: { name: "x", currency: "EUR", webstore_url: "http://plain.example" } }, { data: [] })).toBeNull();
    expect(storeFrom({}, {})).toBeNull();
    expect(plainText("a".repeat(400), 280)).toHaveLength(280);
    expect(plainText("<p>one</p><p>two</p>", 50)).toBe("one two");
    expect(TEBEX_TOKEN.test("t66x-7cd928b1e9399ce6a2d8e1df2f9cb0f1d4c0")).toBe(true);
    expect(TEBEX_TOKEN.test("../accounts")).toBe(false);
  });
});
