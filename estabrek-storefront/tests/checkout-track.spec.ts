import { test, expect, type Page } from "@playwright/test";

// The bag's details made easy (saved addresses for an account, remembered details on this device without one),
// and where an order is: in her account, and «تابعي طلبكِ» by number and phone.
const MOCK = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";

test.describe.configure({ mode: "serial" });

async function setAccounts(page: Page, on: boolean) {
  await page.request.get(`${MOCK}/__test/accounts?on=${on ? 1 : 0}`);
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
async function setDelivery(page: Page, on: boolean) {
  await page.request.get(`${MOCK}/__test/delivery?on=${on ? 1 : 0}`);
  await page.request.post(SITE + "/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["settings", "cms:bootstrap"] } });
}
const bagOf = (page: Page) => page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ baseURL: SITE });
  await setAccounts(page, false);
  await setDelivery(page, false);
  await page.close();
});

test("without an account: details remembered when she asks, and the order followed by its number and phone", async ({ page }) => {
  await setAccounts(page, false);
  await setDelivery(page, true);
  await page.goto("/cart");
  await bagOf(page);
  await page.reload();
  await page.getByLabel(/الاسم/).fill("سارة");
  await page.getByLabel(/رقم الهاتف/).fill("0599123456");
  await page.getByTestId("cart-city").selectOption("حيفا");
  await page.getByLabel("العنوان").fill("شارع البحر 4");
  await page.getByTestId("cart-remember").check();
  await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
  await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();
  const track = page.getByTestId("cart-track");
  await expect(track).toHaveAttribute("href", "/track?o=ORD-1042");

  // Next time on this device: her details are there.
  await page.goto("/cart");
  await bagOf(page);
  await page.reload();
  await expect(page.getByLabel(/الاسم/)).toHaveValue("سارة");
  await expect(page.getByLabel(/رقم الهاتف/)).toHaveValue("0599123456");
  await expect(page.getByLabel("العنوان")).toHaveValue("شارع البحر 4");
  // Unticked, the next order forgets them.
  await page.getByTestId("cart-remember").uncheck();
  await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
  await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("estabrak_checkout_v1"))).toBeNull();

  // «تابعي طلبكِ»: the number comes from the order page, the phone she types.
  await page.goto("/track?o=ORD-1042");
  const form = page.getByTestId("track-form");
  await expect(form.getByLabel("رقم الطلب")).toHaveValue("ORD-1042");
  await form.getByLabel("رقم التلفون").fill("0599000000");
  await form.getByRole("button", { name: "وين طلبي؟" }).click();
  await expect(form.getByRole("alert")).toContainText("ما لقينا طلب");
  await form.getByLabel("رقم التلفون").fill("0599123456");
  await form.getByRole("button", { name: "وين طلبي؟" }).click();
  const found = page.getByTestId("track-found");
  await expect(found.getByTestId("order-tracker")).toHaveAttribute("data-status", "NEW");
  await expect(found.locator('[aria-current="step"]')).toContainText("وصلنا طلبكِ");
  await expect(found).toContainText("فستان الورد");

  // On its way: the step and the days to Haifa (its area: 3–5 days).
  await page.request.post(`${MOCK}/__test/order-status`, { data: { status: "SHIPPED" } });
  await form.getByRole("button", { name: "وين طلبي؟" }).click();
  await expect(found.getByTestId("order-tracker")).toHaveAttribute("data-status", "SHIPPED");
  await expect(found.locator('[aria-current="step"]')).toContainText("بالطريق إليكِ");
  await expect(found.getByTestId("order-arrival")).toContainText("بيوصل بين");
});

test("with an account: a new address kept with the order, picked in one tap next time; the order's steps in her account", async ({ browser }) => {
  const page = await (await browser.newContext({ baseURL: SITE, viewport: { width: 1280, height: 800 } })).newPage();
  await page.request.get(`${MOCK}/__test/customer-reset`);
  await setAccounts(page, true);
  await setDelivery(page, true);
  await page.goto("/account");
  await page.getByPlaceholder("name@example.com").fill("sara@example.com");
  await page.getByRole("button", { name: "ابعتيلي الكود" }).click();
  await page.getByPlaceholder("••••••").fill("123456");
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page.getByTestId("account-home")).toBeVisible();

  await page.goto("/cart");
  await bagOf(page);
  await page.reload();
  await expect(page.getByTestId("cart-signed-in")).toBeVisible();
  await page.getByLabel(/الاسم/).fill("سارة حداد");
  await page.getByLabel(/رقم الهاتف/).fill("0599123456");
  await page.getByTestId("cart-city").selectOption("القدس");
  await page.getByLabel("العنوان").fill("بيت حنينا، شارع 9");
  await expect(page.getByTestId("cart-keep-address")).toBeChecked();
  await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
  await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();

  // Next order: her address is a tap away.
  await page.goto("/cart");
  await bagOf(page);
  await page.reload();
  const chips = page.getByTestId("cart-addresses");
  await expect(chips.getByRole("radio", { name: /القدس/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("العنوان")).toHaveValue("بيت حنينا، شارع 9");
  await chips.getByRole("radio", { name: "عنوان جديد" }).click();
  await expect(page.getByLabel("العنوان")).toHaveValue("");
  await chips.getByRole("radio", { name: /القدس/ }).click();
  await expect(page.getByLabel("العنوان")).toHaveValue("بيت حنينا، شارع 9");
  await expect(page.getByTestId("cart-city")).toHaveValue("القدس");
  // It's saved already: nothing to keep.
  await expect(page.getByTestId("cart-keep-address")).toHaveCount(0);

  // Her account: the order's steps.
  await page.request.post(`${MOCK}/__test/order-status`, { data: { status: "ACCEPTED" } });
  await page.goto("/account");
  const tracker = page.getByTestId("account-orders").getByTestId("order-tracker").first();
  await expect(tracker).toHaveAttribute("data-status", "ACCEPTED");
  await expect(tracker.locator('[aria-current="step"]')).toContainText("قيد التجهيز");
  await page.context().close();
});
