import { test, expect, type Page } from "@playwright/test";

// «شو كنتِ شايفة» — Razan's history (admin → رزان) against the mock API.
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

const panelButton = (page: Page) => page.locator(".rose-companion").getByRole("button", { name: /رزان|Rose/ }).first();

test("she remembers the pieces with colour and size, offers them when the shopper seems lost, and reopens them as left", async ({ page }) => {
  await setRazan(page, { history: { enabled: true, ttlHours: 24, offer: true }, seasonal: { mode: "off" } });
  await page.goto("/p/rose-dress");
  await page.getByRole("radio", { name: /Berry/ }).click();
  await page.locator(".rose-pdp-sizes").getByRole("radio", { name: /^L/ }).click();
  await page.waitForTimeout(700);
  await page.goto("/p/rose-hijab");
  await expect(page.locator(".rose-pdp-add").first()).toBeVisible();
  await page.goto("/search?q=" + encodeURIComponent("حجاب"));
  await expect(page.locator("input[type='search'], input").first()).toBeVisible();
  await page.goto("/p/abaya-pattern");
  await expect(page.locator(".rose-pdp-add").first()).toBeVisible();
  // Back to the first piece after two others: Razan offers the history.
  await page.goto("/p/rose-dress");
  const offer = page.getByTestId("razan-offer");
  await expect(offer).toBeVisible({ timeout: 8000 });
  await expect(offer).toContainText("بتدوّري على إشي شفتيه قبل شوي");
  await offer.getByRole("button", { name: /أيوه/ }).click();

  const history = page.getByTestId("razan-history");
  await expect(history).toBeVisible();
  await expect(history).toContainText("فستان الورد");
  await expect(history).toContainText("Berry · L");
  await expect(history).toContainText("باترون عباية");
  await expect(history.getByRole("link", { name: /حجاب/ }).last()).toHaveAttribute("href", /\/search\?q=/);
  const dressLink = history.getByRole("link", { name: /فستان الورد/ }).first();
  await expect(dressLink).toHaveAttribute("href", "/p/rose-dress?c=Berry&s=L");

  // Reopened as she left it.
  await page.goto("/p/rose-hijab");
  await page.goto("/p/rose-dress?c=Berry&s=L");
  await expect(page.getByRole("radio", { name: /Berry/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".rose-pdp-sizes").getByRole("radio", { name: /^L/ })).toHaveAttribute("aria-checked", "true");

  // The offer comes once a visit; "clear my history" empties it.
  await panelButton(page).click();
  await page.getByRole("tab", { name: "شو كنتِ شايفة" }).click();
  await page.getByRole("button", { name: "امسحي سجلّي" }).click();
  await expect(page.getByTestId("razan-history")).toContainText("لسا ما شفتي إشي");
  const events = await (await page.request.get(`${API}/__test/razan-events`)).json();
  expect(events).toEqual(expect.arrayContaining(["offer:history", "accept:history"]));
});

test("old pieces expire; with the history off there is no tab", async ({ page }) => {
  await setRazan(page, { history: { enabled: true, ttlHours: 1, offer: false } });
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() =>
    localStorage.setItem(
      "estabrek_recently_viewed",
      JSON.stringify([
        { id: "bag", title: "شال قديم", slug: "rose-hijab", viewedAt: Date.now() - 3 * 3600_000 },
        { id: "coat", title: "فستان جديد", slug: "rose-dress", viewedAt: Date.now() - 10 * 60_000 },
      ]),
    ),
  );
  await page.reload();
  await panelButton(page).click();
  await page.getByRole("tab", { name: "شو كنتِ شايفة" }).click();
  const history = page.getByTestId("razan-history");
  await expect(history).toContainText("فستان جديد");
  await expect(history).not.toContainText("شال قديم");

  await setRazan(page, { history: { enabled: false } });
  await page.goto("/shop");
  await panelButton(page).click();
  await expect(page.getByRole("tab", { name: "شو كنتِ شايفة" })).toHaveCount(0);
});

test("phone: the history fits the screen", async ({ page }) => {
  await setRazan(page, { history: { enabled: true, ttlHours: 24, offer: true } });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/p/rose-dress");
  await page.goto("/p/rose-hijab");
  await panelButton(page).click();
  await page.getByRole("tab", { name: "شو كنتِ شايفة" }).click();
  await expect(page.getByTestId("razan-history")).toContainText("شال وردي");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "/tmp/claude-0/shots/razan-history-phone.png" });
});
