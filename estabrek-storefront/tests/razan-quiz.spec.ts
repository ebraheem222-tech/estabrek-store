import { test, expect, type Page } from "@playwright/test";

// «رزان بتختارلك» — the style quiz in Razan's panel, against the mock API.
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

const quiz = (page: Page) => page.getByTestId("razan-quiz");

test("from the shop page: a few taps, pieces with reasons, 👍/👎, and her taste kept on the device", async ({ page }) => {
  await setRazan(page, { styleQuiz: { enabled: true, results: 6, variety: "medium" }, seasonal: { mode: "off" } });
  await page.goto("/shop");
  await page.getByRole("button", { name: /رزان بتختارلك/ }).click();
  await expect(quiz(page)).toBeVisible();
  await quiz(page).getByRole("button", { name: "يلا نبلّش" }).click();
  await quiz(page).getByRole("button", { name: /الأعراس/ }).click();
  await quiz(page).getByRole("button", { name: /شتوي/ }).click();
  await quiz(page).getByRole("button", { name: "خمري" }).click();
  await quiz(page).getByRole("button", { name: "زهري" }).click();
  await quiz(page).getByRole("button", { name: "التالي" }).click();
  await quiz(page).getByRole("button", { name: /لبسة كاملة/ }).click();
  await quiz(page).getByRole("button", { name: "L", exact: true }).click();
  await quiz(page).getByRole("button", { name: "ما بتفرق معي" }).click(); // budget
  await quiz(page).getByRole("button", { name: "فستان الورد" }).click(); // a photo she likes
  await quiz(page).getByRole("button", { name: /ورجيني/ }).click();

  await expect(quiz(page)).toHaveAttribute("data-step", "results");
  await expect(quiz(page)).toContainText("بتنفع لـالأعراس");
  const sent = await (await page.request.get(`${API}/__test/last-quiz`)).json();
  expect(sent).toMatchObject({ occasion: "wedding", season: "winter", colors: ["wine", "pink"], look: "full", size: "L", budgetMax: null, liked: ["coat"], final: true });

  // 👎 takes it away; then she can ask again from her opinion.
  await quiz(page).getByRole("button", { name: "مش ذوقي" }).nth(1).click();
  await expect(quiz(page)).not.toContainText("شال وردي");
  await quiz(page).getByRole("button", { name: /اختاريلي من جديد/ }).click();
  const again = await (await page.request.get(`${API}/__test/last-quiz`)).json();
  expect(again.disliked).toEqual(["bag"]);
  expect(again.final).toBeUndefined();
  const taste = await page.evaluate(() => JSON.parse(localStorage.getItem("razan_taste") || "null"));
  expect(taste).toMatchObject({ answers: { occasion: "wedding" }, disliked: ["bag"] });

  // A piece opens its page.
  await quiz(page).getByRole("link", { name: /فستان الورد/ }).click();
  await expect(page).toHaveURL(/\/p\/rose-dress/);
  const events = await (await page.request.get(`${API}/__test/razan-events`)).json();
  expect(events).toEqual(expect.arrayContaining(["quiz:start", "quiz:dislike"]));
});

test("next time she can reuse her answers; nothing close points to «اطلبي قطعتكِ» or contact", async ({ page }) => {
  await setRazan(page, { styleQuiz: { enabled: true }, seasonal: { mode: "off" } });
  await page.goto("/shop");
  await page.evaluate(() => localStorage.setItem("razan_taste", JSON.stringify({ answers: { colors: [], budgetMax: 20 }, liked: [], disliked: [], at: Date.now() })));
  await page.getByRole("button", { name: /رزان بتختارلك/ }).click();
  await quiz(page).getByRole("button", { name: /اختياراتي من آخر مرة/ }).click();
  await expect(quiz(page)).toContainText("ما لقيت إشي");
  await expect(quiz(page).getByRole("link", { name: "احكي معنا" })).toHaveAttribute("href", "/contact");
});

test("off by default: no button on the shop page and no tab", async ({ page }) => {
  await setRazan(page, { seasonal: { mode: "off" } });
  await page.goto("/shop");
  await expect(page.locator(".rose-shop-intro")).toBeVisible();
  await expect(page.getByRole("button", { name: /رزان بتختارلك/ })).toHaveCount(0);
});
