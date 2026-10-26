import { test, expect } from "@playwright/test";

// The preview colours the hovered section and the header (themePreview.ts), never the
// page shell; it settles on one palette and goes back when the pointer leaves.
test("quick-add colour preview commits a palette once and restores the page", async ({ page }) => {
  await page.goto("/");
  const shell = page.locator(".cinematic-shell");
  const header = page.locator(".atelier-header");
  const button = page.locator(".rose-quick-add button").first();
  await button.scrollIntoViewIfNeeded();
  await page.mouse.move(5, 180);
  await page.waitForTimeout(1200);
  const before = await header.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => {
    const state = window as typeof window & { themeWrites: number };
    state.themeWrites = 0;
    new MutationObserver(changes => { state.themeWrites += changes.length; })
      .observe(document.querySelector(".cinematic-shell")!, { attributes: true, attributeFilter: ["style"] });
  });
  await button.hover();
  await expect(shell).toHaveAttribute("data-theme-preview", "true");
  await expect.poll(() => header.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(before);
  // One colour of the hover cycle (a new one every 2.2 s): settled after its 0.28 s glide,
  // then left alone, not written again on every frame.
  await page.waitForTimeout(400);
  const previewColour = await header.evaluate(el => el.style.getPropertyValue("--selection-seed"));
  expect(previewColour).not.toBe("");
  await page.waitForTimeout(700);
  expect(await header.evaluate(el => el.style.getPropertyValue("--selection-seed"))).toBe(previewColour);
  expect(await page.evaluate(() => (window as typeof window & { themeWrites: number }).themeWrites)).toBe(0);
  await page.mouse.move(5, 180);
  await expect(shell).not.toHaveAttribute("data-theme-preview", /.*/);
  await expect.poll(() => header.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(before);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-crossfade", /.*/);
});

test("rapid colour picks cannot be overwritten by a delayed older snapshot", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    let call = 0;
    document.startViewTransition = ((update: () => void) => {
      const delay = ++call === 1 ? 500 : 30;
      return start(() => new Promise<void>(resolve => setTimeout(() => { update(); resolve(); }, delay)));
    }) as typeof document.startViewTransition;
  });
  await page.goto("/");
  const shell = page.locator(".cinematic-shell");
  await expect(shell).toHaveAttribute("data-color-selection-ready", "true");
  await page.evaluate(async () => {
    window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#6b2446" }));
    await new Promise(resolve => setTimeout(resolve, 30));
    window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#2f3b57" }));
  });
  await expect(shell).toHaveAttribute("data-storefront-color", "#2f3b57");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-crossfade", /.*/);
  await page.waitForTimeout(600);
  await expect.poll(() => shell.evaluate(el => getComputedStyle(el).getPropertyValue("--selection-seed").trim())).toBe("#2f3b57");
  await expect(page.locator(".atelier-header")).toHaveCSS("background-color", "rgb(47, 59, 87)");
  expect(errors).toEqual([]);
});

test("hovering during an idle reset keeps the reset and restores the shop palette", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { expireTheme?: () => void; delayNextFade?: boolean };
    const timeout = window.setTimeout.bind(window);
    window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
      if (delay === 180000 && typeof callback === "function") state.expireTheme = () => callback(...args);
      return timeout(callback, delay, ...args);
    }) as typeof window.setTimeout;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((update: () => void) => {
      const delay = state.delayNextFade ? 700 : 0;
      state.delayNextFade = false;
      return start(() => new Promise<void>(resolve => timeout(() => { update(); resolve(); }, delay)));
    }) as typeof document.startViewTransition;
  });
  await page.goto("/");
  const shell = page.locator(".cinematic-shell");
  const card = page.locator(".editorial-collection-card").first();
  await card.scrollIntoViewIfNeeded();
  await page.mouse.move(5, 180);
  await page.waitForTimeout(1200);
  const original = await shell.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#2f3b57" })));
  await expect(page.locator(".atelier-header")).toHaveCSS("background-color", "rgb(47, 59, 87)");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-crossfade", /.*/);
  await page.evaluate(() => {
    const state = window as typeof window & { expireTheme: () => void; delayNextFade: boolean };
    state.delayNextFade = true;
    state.expireTheme();
  });
  await card.hover();
  await expect(shell).toHaveAttribute("data-theme-preview", "true");
  await expect(shell).not.toHaveAttribute("data-storefront-color", /.*/);
  await page.mouse.move(5, 180);
  await expect(shell).not.toHaveAttribute("data-theme-preview", /.*/);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-crossfade", /.*/);
  await expect.poll(() => shell.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(original);
  expect(await page.evaluate(() => localStorage.getItem("estabrek_theme_color"))).toBeNull();
  expect(await page.locator("html").evaluate(el => el.style.getPropertyValue("--selection-seed"))).toBe("");
});
