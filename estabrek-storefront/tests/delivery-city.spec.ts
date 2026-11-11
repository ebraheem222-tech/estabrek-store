import { test, expect, type Page } from "@playwright/test";
import { arrivalDays } from "../src/lib/deliveryTime";

// The product page's arrival dates by city (RoseDeliveryCity.tsx): the owner's delivery areas (admin → الطلبات →
// أسعار التوصيل) with their days; the dress itself ships in 2–4 days (tests/catalog-server.mjs).
test.describe.configure({ mode: "serial" });

const setDelivery = async (page: Page, on: boolean) => {
  await page.request.get(`http://127.0.0.1:4100/__test/delivery?on=${on ? 1 : 0}`);
  const refreshed = await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["settings", "cms:bootstrap"] } });
  expect(refreshed.ok()).toBe(true);
};

/** The date `n` days from now, as the page writes it (Israel time). */
const dayIn = (page: Page, n: number) =>
  page.evaluate((days) => new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long" }).format(new Date(Date.now() + days * 86400000)), n);

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ baseURL: "http://127.0.0.1:3000" });
  await setDelivery(page, false);
  await page.close();
});

test("the area's days, else the piece's own; a piece made to order keeps its own", () => {
  expect(arrivalDays({ minDays: 1, maxDays: 2 }, { minDays: 2, maxDays: 4 })).toEqual({ min: 1, max: 2 });
  expect(arrivalDays({ minDays: 3, maxDays: 5 }, { minDays: 2, maxDays: 4 })).toEqual({ min: 3, max: 5 });
  // No days for the area: the piece's.
  expect(arrivalDays({ minDays: null, maxDays: null }, { minDays: 2, maxDays: 4 })).toEqual({ min: 2, max: 4 });
  expect(arrivalDays(null, { maxDays: 3 })).toEqual({ min: 3, max: 3 });
  // Made to order (10–14 days) is slower than any area: its own days.
  expect(arrivalDays({ minDays: 1, maxDays: 2 }, { minDays: 10, maxDays: 14 })).toEqual({ min: 10, max: 14 });
  // Nothing known: nothing promised.
  expect(arrivalDays(null, null)).toBeNull();
  expect(arrivalDays({ minDays: 5, maxDays: 2 }, null)).toEqual({ min: 2, max: 5 });
});

test("her city's dates and price on the product page, kept for the next visit and the bag", async ({ page }) => {
  await setDelivery(page, true);
  await page.goto("/p/rose-dress");
  const box = page.getByTestId("delivery-city");
  await expect(box).toBeVisible();
  const city = box.getByRole("combobox", { name: "مدينة التوصيل" });

  // Jerusalem: its area's 1–2 days and its price.
  await city.selectOption("القدس");
  await expect(box).toContainText(`بيوصل بين ${await dayIn(page, 1)} و${await dayIn(page, 2)}`);
  await expect(box).toContainText("التوصيل");
  await expect(box).toContainText("20");
  await expect(box).toContainText("مجاني فوق");

  // Another city: the store's other price and the dress's own 2–4 days.
  await city.selectOption("__other");
  await expect(box).toContainText(`بيوصل بين ${await dayIn(page, 2)} و${await dayIn(page, 4)}`);
  await expect(box).toContainText("50");

  // Haifa: 3–5 days. Kept on this device.
  await city.selectOption("حيفا");
  await expect(box).toContainText(`بيوصل بين ${await dayIn(page, 3)} و${await dayIn(page, 5)}`);
  await page.reload();
  await expect(page.getByTestId("delivery-city").getByRole("combobox")).toHaveValue("حيفا");

  // The bag starts from it.
  await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));
  await page.goto("/cart");
  await expect(page.getByTestId("cart-city")).toHaveValue("حيفا");
  await expect(page.getByTestId("cart-delivery")).toContainText("35");
});

test("no delivery areas: no city picker, only the piece's own line", async ({ page }) => {
  await setDelivery(page, false);
  await page.goto("/p/rose-dress");
  await expect(page.getByTestId("product-delivery")).toBeVisible();
  await expect(page.getByTestId("delivery-city")).toHaveCount(0);
});
