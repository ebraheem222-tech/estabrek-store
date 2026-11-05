import { expect, test } from "@playwright/test";

test("gallery category and search intersect, empty state recovers, and instances stay independent", async ({ page }) => {
  await page.goto("/en/expanded-demo");
  const gallery = page.locator('[data-tree-node="gallery-grid"]');
  const other = page.locator('[data-tree-node="gallery-masonry"]');
  await expect(gallery.locator(".pt-fg-item")).toHaveCount(3);
  await gallery.getByRole("button", { name: "Art", exact: true }).click();
  await expect(gallery.locator(".pt-fg-item")).toHaveCount(2);
  await gallery.getByRole("searchbox").fill("Gamma");
  await expect(gallery.locator(".pt-fg-item")).toHaveCount(1);
  await expect(gallery.locator(".pt-fg-item")).toContainText("Gamma");
  await gallery.getByRole("searchbox").fill("missing-thing");
  await expect(gallery.getByText("No matching items")).toBeVisible();
  await gallery.getByRole("searchbox").fill("");
  await gallery.getByRole("button", { name: "All", exact: true }).click();
  await expect(gallery.locator(".pt-fg-item")).toHaveCount(3);
  await expect(other.locator(".pt-fg-item")).toHaveCount(3);
  await expect(gallery.locator("button a, a button")).toHaveCount(0);
});

test("lightbox navigates the filtered set, traps focus and restores its opener", async ({ page }) => {
  await page.goto("/en/expanded-demo");
  const gallery = page.locator('[data-tree-node="gallery-grid"]');
  await gallery.getByRole("button", { name: "Art", exact: true }).click();
  const opener = gallery.getByRole("button", { name: "Open image: Alpha", exact: true });
  await opener.click();
  const modal = gallery.getByRole("dialog");
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("heading")).toHaveText("Alpha");
  await expect(modal.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await modal.press("ArrowRight");
  await expect(modal.getByRole("heading")).toHaveText("Gamma");
  await modal.getByRole("button", { name: "Next image", exact: true }).click();
  await expect(modal.getByRole("heading")).toHaveText("Alpha");
  for (let index = 0; index < 7; index++) await page.keyboard.press("Tab");
  expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await expect(opener).toBeFocused();
});

test("split preview supports hover, keyboard and destinations without moving focused links", async ({ page }) => {
  await page.goto("/en/expanded-demo");
  const gallery = page.locator('[data-tree-node="gallery-split"]');
  const controls = gallery.locator(".pt-fg-select");
  await controls.nth(1).hover();
  await expect(controls.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(gallery.locator(".pt-fg-preview img")).toHaveAttribute("alt", "Beta");
  const link = gallery.locator(".pt-fg-item").nth(1).getByRole("link");
  await link.focus();
  await controls.nth(0).hover();
  await expect(link).toBeFocused();
  await expect(controls.nth(1)).toHaveAttribute("aria-pressed", "true");
  await controls.nth(0).focus();
  await controls.nth(0).press("End");
  await expect(controls.nth(2)).toBeFocused();
  await expect(controls.nth(2)).toHaveAttribute("aria-pressed", "true");
  await controls.nth(2).press("ArrowUp");
  await expect(controls.nth(1)).toBeFocused();
  await expect(link).toHaveAttribute("href", "/en/shop");
});

test("billing switches real item content and missing yearly amounts stay unspecified", async ({ page }) => {
  await page.goto("/en/expanded-demo");
  const pricing = page.locator('[data-tree-node="pricing-billing"]');
  const monthlyPrice = await pricing.locator(".pt-plan-price").first().textContent();
  await pricing.getByRole("button", { name: "Yearly", exact: true }).click();
  await expect(pricing.getByRole("button", { name: "Yearly", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(pricing.locator(".pt-plan-price").first()).toHaveText("Annual quote");
  await expect(pricing.locator(".pt-plan").nth(1)).toContainText("Price not specified");
  await expect(pricing.locator(".pt-plan").nth(1).locator(".pt-plan-period")).toHaveCount(0);
  await pricing.getByRole("button", { name: "Monthly", exact: true }).click();
  await expect(pricing.locator(".pt-plan-price").first()).toHaveText(monthlyPrice!);
});

test("FAQ group controls operate only within their own multi-open group", async ({ page }) => {
  await page.goto("/en/expanded-demo");
  const group = page.locator('[data-tree-node="faq-controls"]');
  const single = page.locator('[data-tree-node="faq-single"]');
  await group.getByRole("button", { name: "Expand all", exact: true }).click();
  await expect(group.locator("details:not([open])")).toHaveCount(0);
  await expect(single.getByRole("button", { name: "Expand all", exact: true })).toHaveCount(0);
  await group.getByRole("button", { name: "Collapse all", exact: true }).click();
  await expect(group.locator("details[open]")).toHaveCount(0);
  await group.locator("summary").first().click();
  await expect(group.locator("details[open]")).toHaveCount(1);
});

test("gallery mobile touch selection and reduced motion fit the viewport", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3000/en/expanded-demo");
    const gallery = page.locator('[data-tree-node="gallery-split"]');
    const control = gallery.locator(".pt-fg-select").nth(1);
    await control.tap();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(gallery.locator(".pt-fg-preview img")).toHaveAttribute("alt", "Beta");
    await expect(gallery.locator(".pt-fg-preview img")).toHaveCSS("transition-duration", "0s");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});
