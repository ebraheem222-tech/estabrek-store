import { test, expect, type Page } from "@playwright/test";
import { checkoutTermsOf, termsWords } from "../src/lib/checkoutTerms";

// "I agree to the store's terms" in the bag, and the invoice in the shopper's account, against the mock API
// (tests/catalog-server.mjs; its port CATALOG_PORT when a second run sits beside another session's).
const MOCK = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;

async function setTerms(page: Page, on: boolean) {
  await page.request.get(`${MOCK}/__test/checkout-terms?on=${on ? 1 : 0}&url=/policies`);
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}
async function setAccounts(page: Page, on: boolean) {
  await page.request.get(`${MOCK}/__test/accounts?on=${on ? 1 : 0}`);
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}

test("the public settings' terms are read with care", () => {
  expect(checkoutTermsOf({ required: true, url: "/policies", text: { ar: " قرأت ", fr: "x" } })).toEqual({ required: true, url: "/policies", text: { ar: "قرأت" } });
  expect(checkoutTermsOf({ required: "yes", url: "javascript:alert(1)" })).toEqual({ required: false, url: null, text: null });
  expect(checkoutTermsOf(null).required).toBe(false);
  expect(termsWords({ required: true, url: null, text: { en: "I accept" } }, "en")).toMatchObject({ own: "I accept", terms: "the store's terms" });
  expect(termsWords({ required: true, url: null, text: null }, "fr").agree).toBe("قرأت ووافقت على");
});

test.describe.serial("checkout terms in the bag", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setTerms(page, false);
    await page.close();
  });

  test("not asked for: no box; asked for: the order waits for the box, then goes with it", async ({ page }) => {
    await setTerms(page, false);
    await page.goto("/cart");
    await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));
    await page.reload();
    await expect(page.locator(".rose-cart-line")).toHaveCount(1);
    await expect(page.getByTestId("terms-agree")).toHaveCount(0);

    await setTerms(page, true);
    await page.reload();
    const box = page.getByTestId("terms-agree");
    await expect(box).toBeVisible();
    await expect(box.getByRole("link", { name: "شروط المتجر" })).toHaveAttribute("href", "/policies");
    await expect(box.getByRole("link")).toHaveAttribute("target", "_blank");
    await page.getByLabel(/الاسم/).fill("سارة");
    await page.getByLabel(/رقم الهاتف/).fill("0599123456");
    const send = page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ });
    await send.click();
    await expect(page.locator(".rose-cart-error")).toContainText("لازم توافقي على شروط المتجر");
    await expect(box).toHaveClass(/terms-agree-invalid/);
    await page.getByTestId("terms-agree-box").check();
    await expect(page.locator(".rose-cart-error")).toHaveCount(0);
    await send.click();
    await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();
    const order = await page.request.get(`${MOCK}/__test/last-order`).then((r) => r.json());
    expect(order).toMatchObject({ customerName: "سارة", termsAccepted: true });
  });
});

test.describe.serial("the invoice in the shopper's account", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await setAccounts(page, false);
    await page.close();
  });

  test("each order has its invoice, opened in a new tab to print", async ({ page, request }) => {
    await request.get(`${MOCK}/__test/customer-reset`);
    await setAccounts(page, true);
    await setTerms(page, false);
    await page.goto("/account");
    await page.getByPlaceholder("name@example.com").fill("sara@example.com");
    await page.getByRole("button", { name: "ابعتيلي الكود" }).click();
    await page.getByPlaceholder("••••••").fill("123456");
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page.getByTestId("account-home")).toBeVisible();
    // An order placed while signed in.
    await page.goto("/cart");
    await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));
    await page.reload();
    await page.getByLabel(/الاسم/).fill("سارة");
    await page.getByLabel(/رقم الهاتف/).fill("0599123456");
    await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
    await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();

    await page.goto("/account");
    const invoice = page.getByTestId("account-invoice");
    await expect(invoice).toHaveText("الفاتورة 🧾");
    const [tab] = await Promise.all([page.waitForEvent("popup"), invoice.click()]);
    await expect(tab.locator("h1")).toHaveText("فاتورة ORD-1042");
    expect(tab.url()).toMatch(/^blob:/);
  });
});
