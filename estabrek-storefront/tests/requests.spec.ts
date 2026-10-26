import { test, expect, type Page } from "@playwright/test";

// «اطلبي قطعتكِ» — special requests (admin → الطلبات الخاصة) against the mock API.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
test.describe.configure({ mode: "serial" });

// A 2×2 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");

async function setRequests(page: Page, requests: Record<string, unknown>) {
  await page.request.post(`${API}/__test/requests`);
  await page.request.post(`${API}/__test/requests-settings`, { data: requests });
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
const sent = async (page: Page) => (await (await page.request.get(`${API}/__test/requests`)).json()) as Array<Record<string, unknown>>;

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/requests-settings`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
});

test("off by default: nothing on the piece, and the page points to contact", async ({ page }) => {
  await setRequests(page, {});
  await page.goto("/p/rose-dress");
  await expect(page.locator(".rose-pdp-add").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /اطلبيه منّا/ })).toHaveCount(0);
  await page.goto("/request");
  await expect(page.getByTestId("request-page")).toContainText("صفحة التواصل");
  await expect(page.getByTestId("request-form")).toHaveCount(0);
});

test("from the piece: a missing size with a photo", async ({ page }) => {
  await setRequests(page, { enabled: true, maxPhotos: 2, photoDays: 60, kinds: { size: true, color: true, newPiece: true } });
  await page.goto("/p/rose-dress");
  await page.getByRole("button", { name: "مقاسكِ أو لونكِ مش موجود؟ اطلبيه منّا" }).click();
  const form = page.getByTestId("request-form");
  await expect(form).toContainText("فستان الورد");
  await expect(form.getByRole("radio", { name: "مقاس مش موجود" })).toHaveAttribute("aria-checked", "true");
  await expect(form).toContainText("بتنمسح لحالها بعد 60 يوم");
  await form.getByRole("button", { name: "ابعتي الطلب" }).click();
  await expect(form.getByRole("alert")).toContainText("شو المقاس");
  await form.getByLabel("المقاس اللي بدك").fill("XL");
  await form.getByLabel("الاسم").fill("سارة");
  await form.getByLabel("رقم الهاتف").fill("0599123456");
  await page.getByTestId("request-photos").setInputFiles({ name: "abaya.png", mimeType: "image/png", buffer: PNG });
  await expect(form.getByRole("img", { name: "صورة 1" })).toBeVisible();
  await form.getByRole("button", { name: "ابعتي الطلب" }).click();
  await expect(page.getByTestId("request-done")).toContainText("وصلنا طلبكِ");
  expect((await sent(page)).at(-1)).toMatchObject({ kind: "SIZE", wantedSize: "XL", name: "سارة", phone: "0599123456", productId: "coat", source: "PRODUCT", photos: 1 });
});

test("from a search with no luck: the words come along", async ({ page }) => {
  await setRequests(page, { enabled: true, maxPhotos: 0, kinds: { size: false, color: false, newPiece: true } });
  await page.goto("/search?q=" + encodeURIComponent("عباية مخمل زيتي"));
  await page.getByRole("link", { name: /اطلبيها منّا/ }).click();
  await expect(page).toHaveURL(/\/request\?q=/);
  const form = page.getByTestId("request-form");
  await expect(form.getByLabel("احكيلنا عن القطعة")).toHaveValue("عباية مخمل زيتي");
  // One kind only, no photos: no choices to make.
  await expect(form.getByRole("radiogroup")).toHaveCount(0);
  await expect(page.getByTestId("request-photos")).toHaveCount(0);
  await form.getByLabel("الاسم").fill("ليلى");
  await form.getByLabel("رقم الهاتف").fill("0599777888");
  await form.getByRole("button", { name: "ابعتي الطلب" }).click();
  await expect(page.getByTestId("request-done")).toBeVisible();
  expect((await sent(page)).at(-1)).toMatchObject({ kind: "NEW_PIECE", details: "عباية مخمل زيتي", source: "SEARCH", photos: 0 });
  const events = await (await page.request.get(`${API}/__test/razan-events`)).json();
  expect(events).toContain("request:sent");
});
