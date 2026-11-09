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
  await expect(page).toHaveURL(/\/p\/rose-dress$/, { timeout: 60000 });
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

test("a product page stands on its category's mood: a soft panel with drawings that pop in, and a wave", async ({ page }) => {
  await page.goto("/p/rose-dress");
  const backdrop = page.locator(".rose-pdp-backdrop");
  await expect(backdrop).toHaveAttribute("data-mood", /^(dresses|winter|spring|hijab|default)$/);
  await expect(backdrop.locator(".rose-motif")).toHaveCount(10);
  await expect(backdrop.locator(".rose-wave")).toHaveCount(1);
  // The price, the colours and the add-to-bag pop in.
  expect(await page.locator(".rose-pdp-info .rose-pdp-add").evaluate((el) => getComputedStyle(el).animationName)).toContain("rose-pop-in");
});

test("the page flows into the footer on a wave, the home too", async ({ page }) => {
  for (const path of ["/", "/shop"]) {
    await page.goto(path);
    const wave = page.locator(".atelier-footer > .rose-footer-wave");
    await expect(wave).toHaveCount(1);
    expect(await wave.evaluate((el) => getComputedStyle(el).position)).toBe("absolute");
  }
});

test("automated browsers keep plain scrolling (the smooth scroll is for shoppers' mice and trackpads)", async ({ page }) => {
  await page.goto("/shop");
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });

  test("a card shows a round bag on its photo and nothing over its name", async ({ page }) => {
    await page.goto("/shop");
    const card = page.locator(".rose-product-tile").first();
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(card.locator(".rose-product-preview")).toBeHidden();
    const add = card.locator(".rose-product-add > button");
    const box = (await add.boundingBox())!;
    // A finger-sized round button (44px, the store's smallest tap size on phones).
    expect(Math.round(box.width)).toBe(44);
    expect(Math.round(box.height)).toBe(44);
    // The bag sits on the photo, above the name.
    const photo = (await card.locator(".rose-product-image").boundingBox())!;
    const name = (await card.locator("h3").boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(photo.y + photo.height + 1);
    expect(box.y + box.height).toBeLessThan(name.y);
  });

  test("a product's photo stays steady while the details slide up over it", async ({ page }) => {
    await page.goto("/p/rose-dress");
    const gallery = page.locator(".rose-pdp-gallery");
    expect(await gallery.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    const info = page.locator(".rose-pdp-info");
    expect(await info.evaluate((el) => Number(getComputedStyle(el).zIndex))).toBeGreaterThan(0);
    const top = (await gallery.boundingBox())!.y;
    await page.evaluate(() => scrollBy(0, 300));
    await page.waitForTimeout(300);
    // The photo hasn't moved up with the page (it stays under the header).
    expect(Math.abs((await gallery.boundingBox())!.y - Math.min(top, 64))).toBeLessThan(80);
  });
});

test("a product's backdrop is its piece's colour as soft light, and glides to a colour picked", async ({ page }) => {
  await page.goto("/p/rose-dress");
  // Inside the product area, so it keeps the piece's colour also where colours stay with the product.
  const backdrop = page.locator(".rose-pdp-grid > .rose-pdp-backdrop");
  await expect(backdrop).toHaveCount(1);
  await expect(page.locator(".cinematic-shell")).toHaveAttribute("data-storefront-color", "#c97794");
  const paint = () => backdrop.evaluate((el) => getComputedStyle(el).backgroundImage);
  await page.waitForTimeout(900);
  const rose = await paint();
  await page.locator('button.color-swatch[title="Berry"]').first().click();
  await expect.poll(paint).not.toBe(rose);
});

test.describe("the home's collections as a scroll story", () => {
  const story = async (page: import("@playwright/test").Page, on: boolean) => {
    await page.request.get(`http://127.0.0.1:4100/__test/collections-story?on=${on ? 1 : 0}`);
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  };
  test.afterEach(async ({ page }) => story(page, false));

  test("one collection at a time, big, with its model beside it; scrolling brings the next one", async ({ page }) => {
    await story(page, true);
    await page.goto("/");
    const section = page.locator(".rose-collections-scroll");
    await expect(section).toHaveCount(1);
    await expect(page.locator(".editorial-collection-grid")).toHaveCount(0);
    await expect(section.locator(".rose-cs-dots li")).toHaveCount(2);
    await section.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 40));
    await expect(section.locator(".rose-cs-name")).toHaveText("فساتين");
    await expect(section.locator(".rose-cs-dots li").first()).toHaveAttribute("aria-current", "step");
    // Down through the section: the second collection takes its place.
    await section.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.offsetHeight - window.innerHeight - 20));
    await expect(section.locator(".rose-cs-name")).toHaveText("حجاب");
    await expect(section.locator(".rose-cs-dots li").nth(1)).toHaveAttribute("aria-current", "step");
    await expect(section.locator(".rose-cs-cta")).toHaveAttribute("href", "/c/hijabs");
  });

  test("switched off in the opening's settings, the collections stay a grid", async ({ page }) => {
    await story(page, false);
    await page.goto("/");
    await expect(page.locator(".editorial-collection-grid")).toHaveCount(1);
    await expect(page.locator(".rose-collections-scroll")).toHaveCount(0);
  });
});

test("adding a piece opens the small bag on the page: the piece marked, its total, checkout leads to the bag", async ({ page }) => {
  await page.goto("/p/rose-dress");
  await page.getByRole("button", { name: /أضيفي للحقيبة|Add to bag/ }).first().click();
  const bag = page.locator(".rose-minibag");
  await expect(bag).toHaveAttribute("data-open", "true");
  await expect(page).toHaveURL(/\/p\/rose-dress$/);
  const dialog = page.getByRole("dialog", { name: /حقيبتكِ|Your bag/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".rose-minibag-added")).toContainText(/انضافت|Added/);
  await expect(dialog.locator("li[data-fresh]")).toHaveCount(1);
  await expect(dialog.locator("li[data-fresh] strong")).toContainText("فستان الورد");
  await expect(dialog.locator(".rose-minibag-total strong")).not.toHaveText("—");
  // No second note on the rose store.
  await expect(page.getByText("تمت الإضافة للسلة")).toHaveCount(0);
  // One more of it, from the bag.
  await dialog.getByRole("button", { name: /قطعة كمان|One more/ }).click();
  await expect(dialog.locator("li[data-fresh] output")).toHaveText("2");
  // Escape closes it and the page is free again.
  await page.keyboard.press("Escape");
  await expect(bag).not.toHaveAttribute("data-open", "true");
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  // Again, then checkout: the bag page.
  await page.getByRole("button", { name: /أضيفي للحقيبة|Add to bag/ }).first().click();
  await expect(bag).toHaveAttribute("data-open", "true");
  await dialog.getByRole("link", { name: /إتمام الطلب|Checkout/ }).click();
  // (A first visit builds the page on the dev server: give it time.)
  await expect(page).toHaveURL(/\/cart$/, { timeout: 60000 });
  await expect(bag).not.toHaveAttribute("data-open", "true");
});
