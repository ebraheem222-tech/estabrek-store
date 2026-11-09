import { test, expect } from "@playwright/test";

// The store's showpieces (app/rose-showcase.css): the page loader, the cards, the shop's opening.

test("a tap on a piece fills the logo in the colour picked last while the page loads", async ({ page }) => {
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  await page.locator(".rose-product-tile").first().getByRole("button", { name: "Berry", exact: true }).click();
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#6b2446");
  // Hold the next page back a little, so the wait can be seen.
  await page.route(/\/p\/rose-dress(\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.locator('.rose-product-tile a[href="/p/rose-dress"]').first().click();
  const loader = page.locator(".rose-route-loader");
  await expect(loader).toHaveAttribute("data-shown", "true");
  await expect(loader).toHaveAttribute("data-route-colour", "#6b2446");
  // The line and the fill rise while it waits…
  const p1 = Number(await loader.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--route-p")));
  await page.waitForTimeout(400);
  const p2 = Number(await loader.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--route-p")));
  expect(p2).toBeGreaterThan(p1);
  expect(p2).toBeLessThan(1);
  // …and it goes once the piece is there.
  await expect(page).toHaveURL(/\/p\/rose-dress$/);
  await expect(page.locator(".rose-pdp")).toBeVisible();
  await expect(loader).toHaveCount(0, { timeout: 5000 });
});

test("a link to the same page or a part of it shows no loader", async ({ page }) => {
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  await page.locator('a[href="#shop-products"]').first().click();
  await page.waitForTimeout(300);
  await expect(page.locator(".rose-route-loader")).toHaveCount(0);
});

test("a tap on a link that loads nothing (code took it over) lets the loader go at once", async ({ page }) => {
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const a = document.createElement("a");
    a.href = "/contact";
    a.id = "taken-over";
    a.textContent = "panel";
    a.style.cssText = "position:fixed;top:120px;left:20px;z-index:3000;background:#fff;padding:8px";
    a.addEventListener("click", (e) => e.preventDefault());
    document.body.appendChild(a);
  });
  await page.locator("#taken-over").click();
  await expect(page.locator(".rose-route-loader")).toHaveCount(0, { timeout: 1500 });
  await expect(page).toHaveURL(/\/shop$/);
});

test("the cards of the inner pages: an arched photo with a drawn line, a heart that saves the piece", async ({ page }) => {
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  const card = page.locator(".rose-product-tile").first();
  // In the middle of the screen: cards rise while they scroll in, so a card at an edge is still moving.
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await expect(card.locator(".rose-card-arch")).toBeVisible();
  expect(await card.locator(".rose-product-image").evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("50% 40%");
  // The line inside the arch is drawn on hover.
  const offset = () => card.locator(".rose-card-arch path").evaluate((el) => Number(getComputedStyle(el).strokeDashoffset.replace("px", "")));
  expect(await offset()).toBeGreaterThan(0.9);
  await card.hover();
  await expect.poll(offset).toBeLessThan(0.05);
  const heart = card.locator(".rose-card-heart");
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
});

test("the home keeps its own cards", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const tiles = page.locator(".cinematic-home-shell .rose-product-tile");
  if (await tiles.count()) {
    for (const part of [".rose-card-arch", ".rose-card-heart", ".rose-card-sheen"]) {
      expect(await tiles.first().locator(part).evaluate((el) => getComputedStyle(el).display), part).toBe("none");
    }
  }
});

test("the shop's opening: the silk film in an arch and a 3D ring of the pieces that turns, and turns on a drag", async ({ page }) => {
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  const stage = page.locator(".rose-shop-stage");
  await expect(stage).toBeVisible();
  await expect(stage.locator(".rose-stage-arch")).toBeVisible();
  const ring = stage.locator(".rose-ring");
  if (!(await ring.count())) test.skip(true, "fewer than three pieces with a photo in this catalogue");
  const turn = () => ring.evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue("--ring-turn") || "0"));
  const a = await turn();
  await page.waitForTimeout(600);
  expect(await turn()).not.toBe(a);
  // Drag the front piece: the ring turns with the finger.
  const piece = ring.locator(".rose-ring-piece").first();
  const box = (await piece.boundingBox())!;
  const before = await turn();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(Math.abs((await turn()) - before)).toBeGreaterThan(20);
  // A drag doesn't open the piece.
  await expect(page).toHaveURL(/\/shop$/);
});
