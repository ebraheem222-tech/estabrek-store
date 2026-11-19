import { expect, test } from "@playwright/test";

// A payment the shop asked for (a function's «اطلب دفع» step; backend lib/payLinks.ts): its page at /<lang>/pay/<token>
// shows what it is and how much, with the ways to pay the shop switched on; the gateway sends the shopper back, and
// the page asks the server whether it was paid. The backend and the gateway are stood in for (tests/catalog-server.mjs).

const MOCK = "http://127.0.0.1:4100";
const TOKEN = "pay-spec-token-abcdefghij";
const view = (over: Record<string, unknown> = {}) => ({ title: "حجز: السبت 10:00", amount: 120, currency: "ILS", status: "PENDING", providers: ["stripe", "paypal"], back: "/my-bookings", paidAt: null, ...over });
const put = (request: import("@playwright/test").APIRequestContext, data: Record<string, unknown>) => request.post(`${MOCK}/__test/pay`, { data });
const told = async (request: import("@playwright/test").APIRequestContext) => (await (await put(request, {})).json()).requests[TOKEN] as { starts: string[]; verifies: number; status: string };

test.describe("A payment's page", () => {
  test.beforeEach(async ({ request }) => {
    await put(request, { reset: true });
  });

  test("what it is and how much; paid at the gateway, and back here it says so once the server does", async ({ page, request }) => {
    await put(request, { token: TOKEN, view: view(), lang: "ar", paidOnReturn: true });
    await page.goto(`/ar/pay/${TOKEN}`);
    const box = page.getByTestId("pay-page");
    await expect(box).toHaveAttribute("data-status", "PENDING");
    await expect(page.getByTestId("pay-title")).toHaveText("حجز: السبت 10:00");
    await expect(page.getByTestId("pay-amount")).toContainText("120");
    await expect(page.getByTestId("pay-amount")).toContainText("₪");
    await expect(page.getByTestId("pay-with-stripe")).toHaveText("ادفعي بالبطاقة");
    await expect(page.getByTestId("pay-with-paypal")).toBeVisible();
    // Nothing asked yet, nothing opened.
    expect(await told(request)).toMatchObject({ starts: [], verifies: 0 });

    await page.getByTestId("pay-with-stripe").click();
    // The stand-in gateway sends her back with the provider in the address; the page asks once.
    await page.waitForURL(/provider=stripe/);
    await expect(box).toHaveAttribute("data-status", "PAID");
    await expect(page.getByTestId("pay-done")).toHaveText("وصلت الدفعة. شكراً إلكِ!");
    await expect(page.getByTestId("pay-back")).toHaveAttribute("href", /\/my-bookings$/);
    expect(await told(request)).toMatchObject({ starts: ["stripe"], verifies: 1, status: "PAID" });
    await expect(page.getByTestId("pay-with-stripe")).toHaveCount(0);
  });

  test("back without the payment reaching the server: it says so and offers to pay again", async ({ page, request }) => {
    await put(request, { token: TOKEN, view: view({ providers: ["paypal"] }), lang: "en", paidOnReturn: false });
    await page.goto(`/en/pay/${TOKEN}`);
    await expect(page.getByTestId("pay-with-stripe")).toHaveCount(0);
    await page.getByTestId("pay-with-paypal").click();
    await page.waitForURL(/provider=paypal/);
    await expect(page.getByTestId("pay-note")).toHaveText("The payment hasn't reached us yet. If you paid, wait a moment and open this page again.");
    await expect(page.getByTestId("pay-page")).toHaveAttribute("data-status", "PENDING");
    await expect(page.getByTestId("pay-with-paypal")).toHaveText("Pay with PayPal");
  });

  test("a link that ran out, one called off, one nobody has, and one with no way to pay", async ({ page, request }) => {
    await put(request, { token: TOKEN, view: view({ status: "EXPIRED", providers: [] }) });
    await page.goto(`/ar/pay/${TOKEN}`);
    await expect(page.getByTestId("pay-page")).toHaveAttribute("data-status", "EXPIRED");
    await expect(page.getByTestId("pay-page")).toContainText("خلص وقت هالرابط");
    await expect(page.locator('[data-testid^="pay-with-"]')).toHaveCount(0);

    await put(request, { token: TOKEN, view: view({ status: "CANCELLED", providers: [] }) });
    await page.goto(`/en/pay/${TOKEN}`);
    await expect(page.getByTestId("pay-page")).toContainText("This payment was called off.");

    await put(request, { token: TOKEN, view: view({ providers: [] }) });
    await page.goto(`/en/pay/${TOKEN}?cancelled=1`);
    await expect(page.getByTestId("pay-page")).toContainText("Paying online isn't available right now.");

    await page.goto("/ar/pay/nobody-has-this-link-at-all");
    await expect(page.getByTestId("pay-page")).toHaveAttribute("data-status", "GONE");
    await expect(page.getByTestId("pay-page")).toContainText("هالرابط مش شغّال.");
  });

  test("back from the gateway without paying: said, and the ways to pay are there again", async ({ page, request }) => {
    await put(request, { token: TOKEN, view: view(), lang: "en" });
    await page.goto(`/en/pay/${TOKEN}?cancelled=1`);
    await expect(page.getByTestId("pay-page")).toContainText("You came back before paying. You can try again.");
    await expect(page.getByTestId("pay-with-stripe")).toHaveText("Pay by card");
    expect(await told(request)).toMatchObject({ verifies: 0 });
  });
});
