import { test, expect } from "@playwright/test";

// Digital products and bookings against the mock API (tests/catalog-server.mjs).
const API = "http://127.0.0.1:4100";

test("a digital product: no shipping, an email for the link, and the order says the link is coming", async ({ page }) => {
  await page.goto("/p/abaya-pattern");
  await expect(page.getByTestId("product-digital")).toContainText("منتج رقمي");
  await expect(page.locator(".rose-pdp-trust")).toHaveCount(0);
  await expect(page.locator(".rose-pdp-add")).toBeEnabled();
  await page.goto("/cart");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "pattern-v", quantity: 1 }])));
  await page.reload();
  await expect(page.getByTestId("cart-digital")).toBeVisible();
  await expect(page.getByTestId("cart-delivery")).toContainText("ما في توصيل");
  await expect(page.locator(".rose-cart-form").getByText("العنوان")).toHaveCount(0);
  await expect(page.getByTestId("cart-email")).toBeVisible();

  await page.locator(".rose-cart-form input[autocomplete='name']").fill("سارة أحمد");
  await page.locator(".rose-cart-form input[type='tel']").fill("0599123456");
  await page.getByTestId("cart-email").fill("bad-email");
  await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
  await expect(page.locator(".rose-cart-error")).toContainText("الإيميل");
  await page.getByTestId("cart-email").fill("sara@example.com");
  await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
  await expect(page.getByTestId("cart-handover")).toContainText("رابط الملفات");
  const order = await (await page.request.get(`${API}/__test/last-order`)).json();
  expect(order.email).toBe("sara@example.com");
  expect(order.address).toBeUndefined();
  expect(order.city).toBeUndefined();
});

test("a booking shows when and where; a passed one can't be booked", async ({ page }) => {
  await page.goto("/p/sewing-workshop");
  const box = page.getByTestId("product-booking");
  await expect(box).toContainText("سخنين، قاعة البلدية");
  await expect(box).toContainText("الموعد");
  await expect(page.locator(".rose-pdp-add")).toContainText("احجزي");

  await page.goto("/p/past-workshop");
  await expect(page.locator(".rose-pdp-add")).toBeDisabled();
  await expect(page.locator(".rose-pdp-add")).toContainText("انتهى الموعد");
});

test("the private order page: tickets with a QR, files to download, and a cancelled order", async ({ page }) => {
  await page.goto("/order/tok-ready-1234567890abcdefghijkl");
  await expect(page.getByTestId("order-access")).toContainText("أهلاً سارة");
  const tickets = page.getByTestId("order-tickets");
  await expect(tickets.getByTestId("ticket-code")).toHaveText(["K7QM-2XHP", "R4TW-9BNC"]);
  await expect(tickets.locator("svg.rose-order-qr")).toHaveCount(2);
  await expect(tickets).toContainText("استُخدمت للدخول");
  const files = page.getByTestId("order-files");
  await expect(files).toContainText("باترون عباية.pdf");
  await expect(files).toContainText("باقي 10 من 10");
  const before = (await (await page.request.get(`${API}/__test/downloads`)).json()).downloads;
  await files.getByRole("button", { name: "نزّلي" }).click();
  await expect.poll(async () => (await (await page.request.get(`${API}/__test/downloads`)).json()).downloads).toBe(before + 1);
  // The page then goes to the file: let it, or it can cut the next visit short.
  await page.waitForURL(/hijab-campaign/);

  await page.goto("/order/tok-closed-1234567890abcdefghijk");
  await expect(page.getByTestId("order-access")).toContainText("انلغى");
  await page.goto("/order/nope-1234567890abcdefghijklmnop");
  await expect(page.getByTestId("order-access")).toContainText("مش شغّال");
});

test("phone: the order page and a booking fit the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/order/tok-ready-1234567890abcdefghijkl");
  await expect(page.getByTestId("order-tickets")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const qr = await page.locator("svg.rose-order-qr").first().boundingBox();
  expect(qr!.width).toBeGreaterThan(180);
  await page.screenshot({ path: "/tmp/claude-0/shots/sf-order-phone.png", fullPage: true });
  await page.goto("/p/sewing-workshop");
  await expect(page.getByTestId("product-booking")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "/tmp/claude-0/shots/sf-booking-phone.png" });
});

test("a shipped product says when it arrives and where from; digital ones don't", async ({ page }) => {
  await page.goto("/p/rose-dress");
  await expect(page.getByTestId("product-delivery")).toHaveText("بيوصل خلال 2–4 أيام · بينشحن من رام الله");
  await page.goto("/p/abaya-pattern");
  await expect(page.getByTestId("product-digital")).toContainText("الملفات أو الكود");
  await expect(page.getByTestId("product-delivery")).toHaveCount(0);
});

test("the order page shows her codes once with how to redeem, and copies them", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/order/tok-codes-12345678901234567890abc");
  const box = page.getByTestId("order-codes");
  await expect(box.locator("h2")).toHaveText("أكوادكِ (2)");
  await expect(box.getByTestId("order-code")).toHaveText(["STEAM-AAAA-1111", "STEAM-BBBB-2222"]);
  // One product: its how-to shows once.
  await expect(box.getByText(/طريقة التفعيل/)).toHaveCount(1);
  await box.getByRole("button", { name: "انسخي الكود STEAM-BBBB-2222" }).click();
  await expect(box.getByRole("button", { name: "انسخي الكود STEAM-BBBB-2222" })).toHaveText("✓ انسخ");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("STEAM-BBBB-2222");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "/tmp/claude-0/shots/sf-order-codes-phone.png", fullPage: true });
});

test("a protected product says she gets a serial and an encrypted copy", async ({ page }) => {
  await page.goto("/p/orders-script");
  await expect(page.getByTestId("product-protected")).toContainText("سيريال خاص فيكِ");
  await expect(page.getByTestId("product-protected")).toContainText("7-Zip");
});

test("the order page: her serial with copy, the time left, the download, and the limit", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/order/tok-licence-123456789012345678ab");
  const box = page.getByTestId("order-licences");
  await expect(box.locator("h2")).toHaveText("نسخكِ المحمية (2)");
  const [ok, late] = [box.getByTestId("order-licence").nth(0), box.getByTestId("order-licence").nth(1)];
  await expect(ok.getByTestId("order-code")).toHaveText("ESTB-7KQ2-M9XD-4HFA-PZ3C-W8RT");
  await expect(ok.getByTestId("licence-window")).toHaveText("باقي 5 ساعات للتنزيل · 1 من 3 تنزيلات باقية");
  await ok.getByRole("button", { name: "انسخي الكود ESTB-7KQ2-M9XD-4HFA-PZ3C-W8RT" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("ESTB-7KQ2-M9XD-4HFA-PZ3C-W8RT");
  // Over: no button, a way to ask.
  await expect(late.getByTestId("licence-window")).toContainText("انتهت مدة التنزيل");
  await expect(late.getByRole("button", { name: /نزّلي/ })).toHaveCount(0);

  const [file] = await Promise.all([page.waitForEvent("download"), ok.getByRole("button", { name: "نزّلي النسخة المشفّرة" }).click()]);
  expect(file.suggestedFilename()).toBe("orders-script-K1L2M3.zip");
  await expect(ok.getByTestId("licence-window")).toContainText("0 من 3 تنزيلات باقية");
  await expect(ok.getByRole("button", { name: "نزّلي النسخة المشفّرة" })).toBeDisabled();
  await expect(box).toContainText("WinRAR");
  // The launcher: how many PCs, where to get it, what to do.
  await expect(ok.getByTestId("licence-devices")).toHaveText("💻 مفعّل على 0 من 1 جهاز");
  await expect(page.getByTestId("launcher-link")).toHaveAttribute("href", "http://127.0.0.1:4100/v1/licences/launcher/download");
  await expect(page.getByTestId("order-launcher")).toContainText("إضافة منتج");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "/tmp/claude-0/shots/sf-order-licence-phone.png", fullPage: true });
});
