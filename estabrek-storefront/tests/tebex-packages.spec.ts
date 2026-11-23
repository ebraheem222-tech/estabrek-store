import { expect, test, type Page } from "@playwright/test";

// A game server site's packages from its owner's Tebex webstore (sites wave G4; backend lib/tebex.ts fills the element
// as the page is served). The fixture backend (tests/catalog-server.mjs) serves the page as the backend would, with
// the webstore already in it: its categories as tabs, each package with its price (and the price before a sale) and a
// button to it on the webstore in a new tab; with no webstore, the owner's words.

const MOCK = "http://127.0.0.1:4100";
const store = {
  name: "Dew City",
  currency: "EUR",
  url: "https://dewcity.tebex.io",
  categories: [
    { id: 1, name: "VIP", packages: [{ id: 42, name: "VIP Gold", price: 15, base: 20, currency: "EUR", image: null, text: "A gold tag.", href: "https://dewcity.tebex.io/package/42" }, { id: 43, name: "VIP Silver", price: 9.5, base: 9.5, currency: "EUR", image: null, text: "", href: "https://dewcity.tebex.io/package/43" }] },
    { id: 2, name: "Cars", packages: [{ id: 51, name: "Sports car", price: 25, base: 25, currency: "EUR", image: null, text: "Fast.", href: "https://dewcity.tebex.io/package/51" }] },
  ],
};
const el = (id: string, props: Record<string, unknown>) => ({ id, type: "tebexPackages", props: { buy: { en: "Buy on Tebex" }, all: { en: "The whole store on Tebex" }, empty: { en: "The store is coming soon." }, note: { en: "Payment and delivery are with Tebex." }, columns: 3, ...props } });
const PAGE = {
  id: "tebex-fixture",
  slug: "/publication-fixture-en",
  name: "Packages",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [80, 24, 80, 24], gap: 40 } }, children: [el("store", { store }), el("none", { store: null })] }] } },
};
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);

test.describe("a game server's Tebex packages", () => {
  test.beforeEach(async ({ page }) => {
    expect((await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: PAGE } })).ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/en/publication-fixture-en");
    await expect(node(page, "store").locator("[data-tebex=store]")).toBeVisible();
  });
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("the webstore's categories as tabs, each package with its price and a way to it on the webstore", async ({ page }) => {
    const box = node(page, "store");
    await expect(box.getByRole("tab")).toHaveText(["VIP", "Cars"]);
    await expect(box.getByRole("tab", { name: "VIP" })).toHaveAttribute("aria-selected", "true");
    const gold = box.locator("[data-package='42']");
    await expect(gold.locator("h3")).toHaveText("VIP Gold");
    // A sale: the price now, the price before, and the word for it.
    await expect(gold.locator("b")).toHaveText("€15");
    await expect(gold.locator("s")).toHaveText("€20");
    await expect(box.locator("[data-package='43'] b")).toHaveText("€9.50");
    await expect(box.locator("[data-package='43'] s")).toHaveCount(0);
    // To the package on the webstore, in a new tab, telling it nothing of the site.
    const buy = gold.getByRole("link", { name: "Buy on Tebex" });
    await expect(buy).toHaveAttribute("href", "https://dewcity.tebex.io/package/42");
    await expect(buy).toHaveAttribute("target", "_blank");
    await expect(buy).toHaveAttribute("rel", "noopener noreferrer");
    await expect(box.getByRole("link", { name: "The whole store on Tebex" })).toHaveAttribute("href", "https://dewcity.tebex.io");
    await expect(box).toContainText("Payment and delivery are with Tebex.");
    // Another category.
    await box.getByRole("tab", { name: "Cars" }).click();
    await expect(box.locator("[data-package]")).toHaveCount(1);
    await expect(box.locator("[data-package='51'] h3")).toHaveText("Sports car");
  });

  test("no webstore yet: the owner's words", async ({ page }) => {
    await expect(node(page, "none").locator("[data-tebex=empty]")).toHaveText("The store is coming soon.");
  });
});
