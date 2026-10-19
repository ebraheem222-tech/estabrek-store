import { test, expect, type Page } from "@playwright/test";

// "آخر قطعة" / "باقي قطعتان" from the admin (header.scarcity) against the mock API:
// the rose hijab has 4 pieces left, the rose dress's Berry L has 3.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
test.describe.configure({ mode: "serial" });

async function setScarcity(page: Page, scarcity: Record<string, unknown>) {
  await page.request.post(`${API}/__test/scarcity`, { data: scarcity });
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
}

const photoBadge = (page: Page) => page.locator(".rose-pdp-frame .rose-badge-limited");
const stock = (page: Page) => page.locator(".rose-pdp-stock");

async function openBerryL(page: Page) {
  await page.goto("/p/rose-dress");
  await page.locator(".rose-pdp-swatch[aria-label*='Berry']").click();
  await page.locator(".rose-pdp-sizes button", { hasText: "L" }).click();
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/scarcity`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
});

test("as before when the owner hasn't touched it: 3 pieces or fewer", async ({ page }) => {
  await setScarcity(page, {});
  await page.goto("/p/rose-hijab");
  await expect(stock(page)).toHaveText("متوفر");
  await expect(photoBadge(page)).toHaveCount(0);
  await openBerryL(page);
  await expect(stock(page)).toHaveText("باقي 3 قطع");
});

test("a higher count shows it on the photo, the shop card and next to the price", async ({ page }) => {
  await setScarcity(page, { enabled: true, showAt: 5, onPhoto: true, nearPrice: true });
  await page.goto("/p/rose-hijab");
  await expect(photoBadge(page)).toHaveText("باقي 4 قطع");
  await expect(stock(page)).toHaveText("باقي 4 قطع");
  await page.goto("/shop");
  const card = page.locator(".rose-product-tile").filter({ has: page.locator("a[href='/p/rose-hijab']") }).first();
  await expect(card.locator(".rose-badge-limited")).toHaveText("باقي 4 قطع");
});

test("only next to the price", async ({ page }) => {
  await setScarcity(page, { enabled: true, showAt: 5, onPhoto: false, nearPrice: true });
  await page.goto("/p/rose-hijab");
  await expect(stock(page)).toHaveText("باقي 4 قطع");
  await expect(photoBadge(page)).toHaveCount(0);
});

test("only on the photo", async ({ page }) => {
  await setScarcity(page, { enabled: true, showAt: 5, onPhoto: true, nearPrice: false });
  await page.goto("/p/rose-hijab");
  await expect(photoBadge(page)).toHaveText("باقي 4 قطع");
  await expect(stock(page)).toHaveText("متوفر");
});

test("switched off: no counts anywhere", async ({ page }) => {
  await setScarcity(page, { enabled: false, showAt: 5, onPhoto: true, nearPrice: true });
  await page.goto("/p/rose-hijab");
  await expect(stock(page)).toHaveText("متوفر");
  await expect(photoBadge(page)).toHaveCount(0);
  await openBerryL(page);
  await expect(stock(page)).toHaveText("متوفر");
  await page.goto("/shop");
  await expect(page.locator(".rose-badge-limited")).toHaveCount(0);
});
