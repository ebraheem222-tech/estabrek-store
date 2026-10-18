import { test, expect } from "@playwright/test";

const bag = [{ variantId: "m", quantity: 1 }, { variantId: "one", quantity: 2 }];

test("rose bag prices the pieces, applies a coupon and records the order", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "حقيبتكِ فارغة حالياً." })).toBeVisible();
  await page.evaluate((items) => localStorage.setItem("estabrak_cart_v1", JSON.stringify(items)), bag);
  await page.reload();

  await expect(page.locator(".rose-cart-line")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "فستان الورد" }).first()).toBeVisible();
  const total = page.locator(".rose-cart-summary .total dd");
  await expect(total).toContainText("700.50");

  await page.getByRole("button", { name: "عندكِ كوبون خصم؟" }).click();
  await page.getByLabel("رمز الكوبون").fill("rose10");
  await page.getByRole("button", { name: "تطبيق" }).click();
  await expect(page.getByRole("status")).toContainText("ROSE10");
  await expect(total).toContainText("630.45");

  // Name and phone are required before the order is sent.
  const send = page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ });
  await send.click();
  await expect(page.locator(".rose-cart-error")).toContainText("الاسم ورقم الهاتف");

  await page.getByLabel(/الاسم/).fill("سارة");
  await page.getByLabel(/رقم الهاتف/).fill("0599123456");
  await send.click();
  await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();
  await expect(page.locator(".rose-cart-order-id")).toContainText("ORD-1042");
  expect(await page.evaluate(() => localStorage.getItem("estabrak_cart_v1"))).toBe("[]");
});

test("removing the last piece empties the bag", async ({ page }) => {
  await page.goto("/cart");
  await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "one", quantity: 1 }])));
  await page.reload();
  await page.getByRole("button", { name: /^إزالة/ }).click();
  await expect(page.getByRole("heading", { name: "حقيبتكِ فارغة حالياً." })).toBeVisible();
});

test("wishlist and search use the rose pages", async ({ page }) => {
  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { name: "لم تحفظي أي قطعة بعد." })).toBeVisible();
  // Wait for the page to be live, so the empty list it saves on load doesn't overwrite ours.
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => localStorage.setItem("estabrek_wishlist", JSON.stringify([{ id: "coat", title: "فستان الورد", slug: "rose-dress", price: 320.5, addedAt: Date.now() }])));
  await page.reload();
  await expect(page.locator(".rose-wish-card")).toHaveCount(1);
  await page.getByRole("button", { name: /إزالة من المفضلة/ }).click();
  await expect(page.getByRole("heading", { name: "لم تحفظي أي قطعة بعد." })).toBeVisible();

  await page.goto("/search");
  const field = page.getByRole("searchbox", { name: "ابحثي في المتجر" });
  await field.fill("فستان");
  await field.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("فستان");
});

test.describe.serial("delivery prices", () => {
  const setDelivery = async (page: import("@playwright/test").Page, on: boolean) => {
    await page.request.get(`http://127.0.0.1:4100/__test/delivery?on=${on ? 1 : 0}`);
    await page.request.post("/api/revalidate", { data: { tags: ["settings"] } });
  };
  test.afterEach(async ({ page }) => { await setDelivery(page, false); });

  test("the bag adds the fee of the chosen city, shows free delivery progress, and sends the city", async ({ page }) => {
    await setDelivery(page, true);
    await page.goto("/cart");
    await page.evaluate((items) => localStorage.setItem("estabrak_cart_v1", JSON.stringify(items)), bag);
    await page.reload();
    const total = page.getByTestId("cart-total");
    await expect(total).toContainText("700.50");
    // Before a city: the lowest fee and a hint
    await expect(page.getByTestId("cart-delivery")).toContainText("اختاري المدينة");
    await expect(page.getByTestId("cart-free-note")).toContainText("99.50");
    await page.getByTestId("cart-city").selectOption("حيفا");
    await expect(page.getByTestId("cart-delivery")).toContainText("35");
    await expect(total).toContainText("735.50");
    // Another city takes the default fee
    await page.getByTestId("cart-city").selectOption("__other");
    await page.getByPlaceholder("اكتبي اسم المدينة").fill("جنين");
    await expect(total).toContainText("750.50");
    await page.getByLabel(/الاسم/).fill("سارة");
    await page.getByLabel(/رقم الهاتف/).fill("0599123456");
    await page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ }).click();
    await expect(page.getByRole("heading", { name: "شكراً لكِ، طلبكِ عندنا." })).toBeVisible();
    const order = await (await page.request.get("http://127.0.0.1:4100/__test/last-order")).json();
    expect(order.city).toBe("جنين");
  });

  test("over the free-delivery amount the delivery is free", async ({ page }) => {
    await setDelivery(page, true);
    await page.goto("/cart");
    await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 3 }])));
    await page.reload();
    await expect(page.getByTestId("cart-delivery")).toContainText("مجاني");
    await expect(page.getByTestId("cart-free-note")).toHaveCount(0);
    await expect(page.getByTestId("cart-total")).toContainText("961.50");
  });
});

test("more than is left: the bag says so, blocks the order and fits it in one click", async ({ page }) => {
  await page.goto("/cart");
  await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 7 }])));
  await page.reload();
  await expect(page.getByTestId("cart-stock-note")).toContainText("متوفر 5 فقط");
  await expect(page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ })).toBeDisabled();
  await page.getByRole("button", { name: "تعديل للكمية المتوفرة" }).click();
  await expect(page.getByTestId("cart-stock-note")).toHaveCount(0);
  await expect(page.locator(".rose-cart-qty span")).toHaveText("5");
  await expect(page.getByRole("button", { name: /أرسلي الطلب ونتصل بكِ/ })).toBeEnabled();
});
