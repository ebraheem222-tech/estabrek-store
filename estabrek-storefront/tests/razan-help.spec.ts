import { test, expect, type Page } from "@playwright/test";

// «رزان بتساعدك تطلبي» — guided ordering (admin → رزان) against the mock API.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
test.describe.configure({ mode: "serial" });

async function setRazan(page: Page, razan: Record<string, unknown>) {
  await page.request.post(`${API}/__test/razan`, { data: razan });
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/razan`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
});

const help = (page: Page) => page.getByTestId("razan-help");
const nextStep = (page: Page) => help(page).getByRole("button", { name: "التالي" }).click();

test("picking back and forth brings her offer; she walks the shopper through one question at a time and sends the order", async ({ page }) => {
  await setRazan(page, { helpOrder: { enabled: true, idleSeconds: 300, snoozeDays: 3 }, seasonal: { mode: "off" } });
  await page.goto("/p/rose-dress");
  await expect(page.locator(".rose-pdp-add").first()).toBeVisible();
  await page.getByRole("radio", { name: /Berry/ }).click();
  await page.getByRole("radio", { name: /Rose/ }).click();
  await page.getByRole("radio", { name: /Berry/ }).click();
  await page.locator(".rose-pdp-sizes").getByRole("radio", { name: /^L/ }).click();

  const offer = page.getByTestId("razan-offer");
  await expect(offer).toBeVisible({ timeout: 6000 });
  await expect(offer).toContainText("بتحبي أساعدكِ تطلبي");
  await offer.getByRole("button", { name: /أيوه/ }).click();

  // Starts from what the page had selected.
  await expect(help(page)).toHaveAttribute("data-step", "color");
  await expect(help(page).getByRole("button", { name: /Berry/ })).toHaveAttribute("aria-pressed", "true");
  await nextStep(page);
  await expect(help(page)).toHaveAttribute("data-step", "size");
  await expect(help(page).getByRole("button", { name: /^L/ })).toHaveAttribute("aria-pressed", "true");
  await nextStep(page);
  await help(page).getByRole("button", { name: "أكثر" }).click();
  await expect(help(page).locator("output")).toHaveText("2");
  await nextStep(page);
  const nextBtn = help(page).getByRole("button", { name: "التالي" });
  await expect(nextBtn).toBeDisabled();
  await help(page).getByLabel("الاسم").fill("سارة");
  await nextStep(page);
  await help(page).getByLabel("رقم الهاتف").fill("0599123456");
  await nextStep(page);
  await help(page).getByLabel("المدينة / البلد").fill("رام الله");
  await nextStep(page);
  await expect(help(page)).toHaveAttribute("data-step", "summary");
  await expect(help(page)).toContainText("فستان الورد");
  await expect(help(page)).toContainText("Berry");
  await expect(help(page)).toContainText("رام الله");
  await help(page).getByRole("button", { name: /أكّدي الطلب/ }).click();
  await expect(help(page)).toContainText("وصلنا طلبكِ");
  await expect(help(page)).toContainText("ORD-1042");

  const order = await (await page.request.get(`${API}/__test/last-order`)).json();
  expect(order).toMatchObject({ source: "RAZAN_HELP", customerName: "سارة", phone: "0599123456", city: "رام الله", items: [{ variantId: "berry-l", quantity: 2 }] });
  const events = await (await page.request.get(`${API}/__test/razan-events`)).json();
  expect(events).toEqual(expect.arrayContaining(["offer:help", "accept:help", "order:help"]));
});

test("«بدي حدا يحكيني» on any step sends a call-back request; «لا شكراً» keeps the offer away", async ({ page }) => {
  await page.request.post(`${API}/__test/requests`);
  await setRazan(page, { helpOrder: { enabled: true, idleSeconds: 8, snoozeDays: 3 }, seasonal: { mode: "off" } });
  await page.goto("/p/rose-dress");
  await expect(page.locator(".rose-pdp-add").first()).toBeVisible();
  // Doing nothing for the owner's seconds brings the offer.
  const offer = page.getByTestId("razan-offer");
  await expect(offer).toBeVisible({ timeout: 14000 });
  await offer.getByRole("button", { name: "لا شكراً" }).click();
  await expect(offer).toBeHidden();
  expect(Number(await page.evaluate(() => localStorage.getItem("razan_help_snooze")))).toBeGreaterThan(Date.now() + 2 * 86400_000);

  // It's still one tap away in her panel.
  await page.locator(".rose-companion").getByRole("button", { name: /رزان|Rose/ }).first().click();
  await page.getByRole("tab", { name: "ساعديني أطلب" }).click();
  await expect(help(page)).toBeVisible();
  await help(page).getByRole("button", { name: /بدي حدا يحكيني/ }).click();
  await help(page).getByLabel("الاسم").fill("ليلى");
  await help(page).getByLabel("رقم الهاتف").fill("0599777888");
  await help(page).getByRole("button", { name: "احكوني" }).click();
  await expect(help(page)).toContainText("رح نحكيكِ");
  const sent = await (await page.request.get(`${API}/__test/requests`)).json();
  expect(sent.at(-1)).toMatchObject({ kind: "CALLBACK", name: "ليلى", phone: "0599777888", productId: "coat", source: "RAZAN_HELP" });

  // Snoozed: no offer on the next visit either.
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/p/rose-hijab");
  await page.waitForTimeout(9500);
  await expect(offer).toBeHidden();
});

test("off by default: no offer and no help tab", async ({ page }) => {
  await setRazan(page, { seasonal: { mode: "off" } });
  await page.goto("/p/rose-dress");
  await page.locator(".rose-companion").getByRole("button", { name: /رزان|Rose/ }).first().click();
  await expect(page.getByRole("tab", { name: "ساعديني أطلب" })).toHaveCount(0);
});
