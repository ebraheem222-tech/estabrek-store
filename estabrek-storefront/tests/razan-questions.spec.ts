import { test, expect, type Page } from "@playwright/test";

// «سؤال وجواب» — the questions quiz with a coupon prize, against the mock API.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
test.describe.configure({ mode: "serial" });

async function setQuiz(page: Page, quiz: Record<string, unknown>) {
  await page.request.post(`${API}/__test/quiz`, { data: quiz });
  await page.request.post(`${API}/__test/razan`, { data: { seasonal: { mode: "off" } } });
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/quiz`, { data: {} });
  await request.post(`${API}/__test/razan`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
});

const qz = (page: Page) => page.getByTestId("razan-questions");

test("a chance is offered (opt-in); all right → a coupon for her phone", async ({ page }) => {
  await setQuiz(page, { enabled: true });
  await page.goto("/shop");
  const offer = page.getByTestId("razan-offer");
  await expect(offer).toBeVisible({ timeout: 12000 });
  await expect(offer).toContainText("عندك فرصة تربحي كوبون خصم 10%");
  await offer.getByRole("button", { name: /بدي ألعب/ }).click();
  await expect(qz(page)).toContainText("لرقمكِ بس، لمرة وحدة، صالح 48 ساعة");
  await qz(page).getByRole("button", { name: "يلا نبلّش" }).click();
  await qz(page).getByRole("radio", { name: "114" }).click();
  await qz(page).getByRole("radio", { name: "أبو بكر الصديق" }).click();
  await qz(page).getByRole("radio", { name: "النمل" }).click();
  await expect(qz(page)).toContainText("كلها صح");
  await qz(page).getByLabel("رقم الهاتف").fill("0599123456");
  await qz(page).getByRole("button", { name: /بدي الكوبون/ }).click();
  await expect(page.getByTestId("quiz-code")).toHaveText("RZN-ABC234");

  const log = await (await page.request.get(`${API}/__test/quiz-log`)).json();
  expect(log.map((x: any) => x.step)).toEqual(["visit", "start", "answer", "claim"]);
  expect(log[2].answers).toEqual([1, 0, 2]);
  expect(log[3]).toMatchObject({ token: "tok-1234567890", phone: "0599123456" });
  expect(log[0].device).toBe(log[1].device);
  // One go: the chance is spent for this visit.
  await page.getByRole("button", { name: "تمام" }).click();
  await page.reload();
  await page.waitForTimeout(1500);
  await page.locator(".rose-companion").getByRole("button", { name: /رزان|Rose/ }).first().click();
  await expect(page.getByRole("tab", { name: /سؤال وجواب/ })).toHaveCount(0);
});

test("a wrong answer shows the right ones; «مش هلأ» keeps the tab for later", async ({ page }) => {
  await setQuiz(page, { enabled: true });
  await page.goto("/shop");
  const offer = page.getByTestId("razan-offer");
  await expect(offer).toBeVisible({ timeout: 12000 });
  await offer.getByRole("button", { name: "مش هلأ" }).click();
  await page.locator(".rose-companion").getByRole("button", { name: /رزان|Rose/ }).first().click();
  await page.getByRole("tab", { name: /سؤال وجواب/ }).click();
  await qz(page).getByRole("button", { name: "يلا نبلّش" }).click();
  await qz(page).getByRole("radio", { name: "110" }).click();
  await qz(page).getByRole("radio", { name: "أبو بكر الصديق" }).click();
  await qz(page).getByRole("radio", { name: "النمل" }).click();
  await expect(qz(page)).toContainText("جاوبتي 2 من 3 صح");
  await expect(qz(page)).toContainText("114");
});

test("off: nobody is asked", async ({ page }) => {
  await setQuiz(page, {});
  await page.goto("/shop");
  await page.waitForTimeout(7500);
  await expect(page.getByTestId("razan-offer")).toHaveCount(0);
  const log = await (await page.request.get(`${API}/__test/quiz-log`)).json();
  expect(log).toEqual([]);
});
