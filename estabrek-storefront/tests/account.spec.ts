import { test, expect, type Page } from "@playwright/test";

// Shopper accounts against the mock API (tests/catalog-server.mjs): code 123456 signs in.
const MOCK = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
const state = (page: Page) => page.request.get(`${MOCK}/__test/customer-state`).then((r) => r.json());

/** Admin → Settings → حسابات الزبائن (off by default). */
async function setAccounts(page: Page, on: boolean) {
  await page.request.get(`${MOCK}/__test/accounts?on=${on ? 1 : 0}`);
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms"] } });
}

test.describe.serial("shopper account", () => {
  // One browser for the whole story (the sign-in cookie carries over between steps).
  let page: Page;
  test.beforeAll(async ({ browser, request }) => {
    await request.get(`${MOCK}/__test/customer-reset`);
    page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await setAccounts(page, true);
  });
  test.afterAll(async () => {
    await setAccounts(page, false);
  });

  test("sign in with an email code; favourites saved before join the account; stays signed in", async () => {
    await page.goto(SITE + "/wishlist");
    await page.evaluate(() =>
      localStorage.setItem("estabrek_wishlist", JSON.stringify([{ id: "coat", title: "فستان الورد", slug: "rose-dress", price: 320.5, addedAt: Date.now() }])),
    );

    await page.reload();
    await expect(page.locator(".rose-wish-card")).toHaveCount(1);

    await page.goto(SITE + "/account");
    await expect(page.getByTestId("account-signin")).toBeVisible();
    await page.getByPlaceholder("name@example.com").fill("Sara@Example.com");
    await page.getByRole("button", { name: "ابعتيلي الكود" }).click();
    await expect(page.getByText("بعتنا كود من 6 أرقام")).toBeVisible();

    const code = page.getByPlaceholder("••••••");
    await code.fill("000000");
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page.locator(".rose-form-error")).toContainText("الكود مش صحيح");
    await code.fill("123456");
    await page.getByRole("button", { name: "دخول" }).click();

    await expect(page.getByTestId("account-home")).toBeVisible();
    await expect(page.getByRole("tab", { name: "طلباتي" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("ما في طلبات بحسابكِ بعد.")).toBeVisible();
    await expect.poll(async () => (await state(page)).wishlist).toEqual(["coat"]);

    // The refresh token is httpOnly: the page can't read it, but a reload keeps her signed in.
    expect(await page.evaluate(() => document.cookie)).not.toContain("estabrek_rt");
    await page.reload();
    await expect(page.getByTestId("account-home")).toBeVisible();
  });

  test("details and an address; the bag fills itself in and the order shows in her account", async () => {
    await page.goto(SITE + "/account");
    await page.getByRole("tab", { name: "معلوماتي" }).click();
    await page.getByTestId("account-details").getByLabel("الاسم").fill("سارة أحمد");
    await page.getByRole("button", { name: "حفظ", exact: true }).click();
    await expect(page.getByText("انحفظت معلوماتكِ.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("أهلاً سارة");

    await page.getByRole("tab", { name: "عناويني" }).click();
    await page.getByRole("button", { name: "إضافة عنوان" }).click();
    const form = page.getByTestId("account-addresses");
    await form.getByLabel(/رقم الهاتف/).fill("0599123456");
    await form.getByLabel(/المدينة/).fill("سخنين");
    await form.getByLabel(/^العنوان \*/).fill("شارع الورد 5");
    await page.getByRole("button", { name: "حفظ العنوان" }).click();
    await expect(page.locator(".rose-account-card")).toContainText("سخنين");
    await expect(page.locator(".rose-account-card")).toContainText("الأساسي");

    await page.goto(SITE + "/cart");
    await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));
    await page.reload();
    await expect(page.getByTestId("cart-signed-in")).toContainText("sara@example.com");
    await expect(page.getByLabel(/الاسم/)).toHaveValue("سارة أحمد");
    await expect(page.getByLabel(/رقم الهاتف/)).toHaveValue("0599123456");
    await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
    await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();
    const order = await page.request.get(`${MOCK}/__test/last-order`).then((r) => r.json());
    expect(order).toMatchObject({ signedIn: true, customerName: "سارة أحمد", city: "سخنين" });

    await page.goto(SITE + "/account");
    await expect(page.getByTestId("account-orders")).toContainText("وصلنا طلبكِ");
    await expect(page.getByTestId("account-orders")).toContainText("فستان الورد");
  });

  test("signing out forgets this device (and its favourites)", async () => {
    await page.goto(SITE + "/account");
    await expect(page.getByTestId("account-home")).toBeVisible();
    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await expect(page.getByTestId("account-signin")).toBeVisible();
    await page.goto(SITE + "/wishlist");
    await expect(page.getByRole("heading", { name: "لم تحفظي أي قطعة بعد." })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "لم تحفظي أي قطعة بعد." })).toBeVisible();
  });

  test("phone: the account page fits the screen", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(SITE + "/account");
    await expect(page.getByTestId("account-signin")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});

test("accounts switched off in the admin: visitors only (no account links, no account page, guest checkout)", async ({ page }) => {
  await setAccounts(page, false);
  await page.goto(SITE + "/");
  await expect(page.locator(".cart-link")).toBeVisible();
  await expect(page.locator(".account-link")).toHaveCount(0);
  await expect(page.locator('footer a[href="/account"]')).toHaveCount(0);
  const res = await page.goto(SITE + "/account");
  expect(res?.status()).toBe(404);
  await page.goto(SITE + "/cart");
  await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));
  await page.reload();
  await expect(page.getByLabel(/الاسم/)).toBeVisible();
  await expect(page.locator(".rose-cart-account")).toHaveCount(0);
});
