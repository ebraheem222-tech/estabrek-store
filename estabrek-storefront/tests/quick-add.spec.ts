import { test, expect, type Page } from "@playwright/test";

// The rose storefront's quick-add sheet (photo, colour, size, quantity).
const drawer = (page: Page) => page.locator(".rose-sheet-quickadd .rose-sheet");

async function openShop(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("estabrek_recently_viewed", JSON.stringify([
      { id: "coat", slug: "rose-dress", title: "فستان الورد", viewedAt: Date.now() },
    ]));
  });
  await page.route("**/v1/storefront/bootstrap", async route => {
    const response = await route.fetch();
    const data = await response.json();
    Object.assign(data.site.header.storefront, {
      scrollProgressEnabled: true, recentPurchasesPopup: true,
      whatsappEnabled: true, whatsappNumber: "970599123456",
    });
    await route.fulfill({ response, json: data });
  });
  await page.goto("/shop");
  // The rose storefront keeps one floating action — WhatsApp beside Rose — no scroll line, no back-to-top button.
  await expect(page.locator(".rose-companion-wa")).toBeVisible();
  await expect(page.locator(".whatsapp-floating-btn")).toHaveCount(0);
  await expect(page.locator(".scroll-progress")).toHaveCount(0);
  await expect(page.locator(".scroll-to-top")).toHaveCount(0);
  const trigger = page.locator(".rose-product-add > button").first();
  await trigger.scrollIntoViewIfNeeded();
  return trigger;
}

test("quick add covers the viewport above animated cards and hides floating widgets", async ({ page }) => {
  const trigger = await openShop(page);
  // Product reveals and hover transforms must not become the fixed drawer's containing block.
  await page.locator(".rose-product-tile").first().evaluate(el => {
    el.style.transform = "translateZ(0)";
  });
  await trigger.click();
  await expect(drawer(page)).toBeVisible();
  await page.waitForTimeout(500); // let the slide-in finish before measuring
  const bounds = await drawer(page).boundingBox();
  expect.soft(bounds!.y).toBeCloseTo(0, 0);
  expect.soft(bounds!.x + bounds!.width).toBeCloseTo(page.viewportSize()!.width, 0);
  await expect.soft(page.locator(".rose-companion-wa")).not.toBeVisible();
  await expect.soft(page.getByText("نشاط مؤخراً", { exact: true })).not.toBeVisible();
  await expect(drawer(page).locator(".rose-sheet-photo img")).toBeVisible();
  await drawer(page).getByRole("button", { name: "إغلاق", exact: true }).click();
  await expect(drawer(page)).not.toBeVisible();
  await expect(page.locator(".rose-companion-wa")).toBeVisible();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 640 }]) {
  test(`quick add keeps mobile actions free of floating widgets at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const trigger = await openShop(page);
    await trigger.click();
    await expect(drawer(page)).toBeVisible();
    await expect.soft(page.locator(".rose-companion-wa")).not.toBeVisible();
    await expect.soft(page.getByText("نشاط مؤخراً", { exact: true })).not.toBeVisible();
    await drawer(page).getByRole("radio", { name: "Berry", exact: true }).click();
    await drawer(page).getByRole("radio", { name: "L", exact: true }).click();
    const quantity = drawer(page).getByRole("spinbutton");
    await quantity.fill("2");
    const add = drawer(page).getByRole("button", { name: "أضيفي للحقيبة" });
    await add.scrollIntoViewIfNeeded();
    const bounds = await add.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    const unobstructed = await add.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    });
    expect(unobstructed).toBe(true);
    await add.click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("estabrak_cart_v1") || "[]")))
      .toEqual([{ variantId: "berry-l", quantity: 2 }]);
    await expect(drawer(page)).not.toBeVisible();
    await expect(page.locator(".rose-companion-wa")).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  });
}
