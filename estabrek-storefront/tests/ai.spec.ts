import { test, expect, type Page } from "@playwright/test";

// AI for shoppers (admin → الذكاء الاصطناعي), against the mock API.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
test.describe.configure({ mode: "serial" });

async function setAi(page: Page, ai: Record<string, unknown>) {
  await page.request.post(`${API}/__test/ai`, { data: ai });
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/ai`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
});

test("off by default: no AI calls, nothing extra on the page", async ({ page }) => {
  await setAi(page, {});
  await page.goto("/p/rose-dress");
  await expect(page.locator(".rose-pdp-add").first()).toBeVisible();
  await page.goto("/search?q=" + encodeURIComponent("بدي فستان سهرة خمري"));
  await page.waitForTimeout(800);
  await expect(page.getByText(/مش متأكدة من مقاسك/)).toHaveCount(0);
  expect(await (await page.request.get(`${API}/__test/ai-log`)).json()).toEqual([]);
});

test("product page: size advice picks her size, complete the look, what shoppers say (AR/EN)", async ({ page }) => {
  await setAi(page, { sizeAdvice: true, shopTheLook: true, reviewSummary: true });
  await page.goto("/p/rose-dress");
  await page.getByRole("radio", { name: /Berry/ }).click();
  await page.getByRole("button", { name: /مش متأكدة من مقاسك/ }).click();
  const box = page.getByTestId("size-advice");
  await box.getByLabel("الطول (سم)").fill("165");
  await box.getByLabel("الوزن (كغ)").fill("70");
  await box.getByRole("radio", { name: "واسعة" }).click();
  await box.getByRole("button", { name: "شو مقاسي؟" }).click();
  await expect(box).toContainText("مقاسكِ: L");
  await box.getByRole("button", { name: "اختاري L" }).click();
  await expect(page.locator(".rose-pdp-sizes").getByRole("radio", { name: /^L/ })).toHaveAttribute("aria-checked", "true");
  const log = await (await page.request.get(`${API}/__test/ai-log`)).json();
  expect(log.find((x: any) => x.feature === "sizeAdvice")).toMatchObject({ productId: "coat", height: 165, weight: 70, fit: "loose" });

  const look = page.getByTestId("shop-the-look");
  await expect(look).toContainText("كمّلي اللبسة");
  await expect(look.getByRole("link", { name: /شال وردي/ })).toHaveAttribute("href", "/p/rose-hijab");
  const reviews = page.getByTestId("review-summary");
  await expect(reviews).toContainText("القماش ناعم والمقاس مزبوط.");
  await reviews.getByRole("button", { name: "English" }).click();
  await expect(reviews).toContainText("Soft fabric, true to size.");
});

test("search in her words: Razan shows what she understood, one tap applies it", async ({ page }) => {
  await setAi(page, { smartSearch: true });
  await page.goto("/search?q=" + encodeURIComponent("بدي فستان بيري لحد 400"));
  const chip = page.getByTestId("smart-search");
  await expect(chip).toContainText("فستان Berry لحد ₪400");
  await chip.getByRole("link").click();
  await expect(page).toHaveURL(/maxPrice=400/);
  await expect(page).toHaveURL(/colors=Berry/);
  await expect(page.getByTestId("smart-search")).toHaveCount(0); // filters are on: no second offer
  // Short searches stay plain.
  await page.goto("/search?q=" + encodeURIComponent("حجاب"));
  await page.waitForTimeout(600);
  await expect(page.getByTestId("smart-search")).toHaveCount(0);
});
