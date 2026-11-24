import { test, expect, type Page } from "@playwright/test";

// The shop's pages are a clean shell that the store's theme dresses: the rose design's ornaments (its waves,
// the drawings behind a product, the arched cards, the flourishes, its campaign pictures) are its own store's
// alone. Against the mock API: a phone shop on its kind's theme, then Estabrek itself.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
test.describe.configure({ mode: "serial" });

const NOOR = {
  name: { ar: "متجر نور", en: "Noor Store", he: "" },
  shortName: { ar: "نور", en: "Noor", he: "" },
  tagline: { ar: "", en: "ALL TECH IN ONE PLACE", he: "" },
  about: { ar: "هواتف وإلكترونيات وإكسسوارات أصلية.", en: "Phones, electronics and original accessories.", he: "" },
  industry: "electronics",
  audience: "everyone",
  legalName: "",
};

/** The rose design's ornaments, as the page has them. */
const ORNAMENTS = ".rose-wave, .rose-pdp-backdrop, .rose-motif, .rose-card-arch, .rose-card-spark";
/** Where a shared page would put one of the rose design's pictures for want of the store's own. */
const PICTURE_SPOTS = ".rose-about-portrait img, .rose-about-fabric img, .rose-contact-photo img, .rose-stage-arch img, .rose-shop-intro-image img, .hero-campaign-image";

async function settle(page: Page) {
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
}
async function open(page: Page, path: string) {
  await page.context().addCookies([{ name: "shop-lang", value: "ar", url: SITE }]);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/identity`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
});

test("a store on a theme: none of the rose design's ornaments or pictures on its pages", async ({ page }) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.request.post(`${API}/__test/identity`, { data: NOOR });
  await settle(page);
  for (const path of ["/shop", "/c/dresses", "/p/rose-dress", "/search", "/about", "/contact", "/cart", "/request"]) {
    await open(page, path);
    await expect(page.locator("html"), path).toHaveAttribute("data-store-theme", "circuit");
    await expect(page.locator(".atelier-footer").first(), path).toBeVisible();
    await expect(page.locator(ORNAMENTS), path).toHaveCount(0);
    await expect(page.locator(PICTURE_SPOTS), path).toHaveCount(0);
  }
  // The cards: the theme's corners, not the rose design's arch.
  await open(page, "/shop");
  const card = page.locator(".rose-product-tile .rose-product-image").first();
  await expect(card).toBeVisible();
  expect(await card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).not.toContain("%");
  // The contact page: no flourish under its title, and its form isn't an arch.
  await open(page, "/contact");
  expect(await page.locator(".rose-contact-intro h1").first().evaluate((el) => getComputedStyle(el, "::after").content)).toBe("none");
  expect(await page.locator(".rose-contact-form-panel").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).not.toBe("100px");
  // A product: "complete the look" is a clothes shop's; any other store's words are plain.
  await open(page, "/p/rose-dress");
  const look = page.locator('[data-testid="complete-look"]');
  if (await look.count()) {
    await expect(look).toHaveAttribute("aria-label", "بيلبق معه");
    await expect(look.locator("h2")).not.toContainText("اللبسة");
  }
});

test("a store on a theme with no home of its own gets its theme's home, never the rose home", async ({ page }) => {
  test.setTimeout(180_000);
  await page.request.post(`${API}/__test/identity`, { data: { ...NOOR, cmsHome: false } });
  await settle(page);
  await open(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-store-theme", "circuit");
  await expect(page.locator(".th-home").first()).toBeVisible();
  await expect(page.locator(".rose-film, .hero-mascot, .rose-companion, .hero-campaign-image, .rose-seasons, .rose-cs")).toHaveCount(0);
  await expect(page.locator(ORNAMENTS)).toHaveCount(0);
  // Its newest products are on it, drawn by the theme.
  await expect(page.locator(".th-home").first()).toContainText("فستان الورد");
});

test("Estabrek keeps all of its design's ornaments", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.request.post(`${API}/__test/identity`, { data: {} });
  await settle(page);
  await open(page, "/shop");
  await expect(page.locator("html")).not.toHaveAttribute("data-store-theme", /.+/);
  await expect(page.locator(".rose-footer-wave")).toHaveCount(1);
  await expect(page.locator(".rose-product-tile .rose-card-arch").first()).toBeAttached();
  await open(page, "/p/rose-dress");
  await expect(page.locator(".rose-pdp-backdrop")).toHaveCount(1);
  // With no home of its own published, its own rose home.
  await page.request.post(`${API}/__test/identity`, { data: { cmsHome: false } });
  await settle(page);
  await open(page, "/");
  await expect(page.locator(".th-home")).toHaveCount(0);
  await expect(page.locator(".hero-campaign-image, .rose-film").first()).toBeAttached();
});
