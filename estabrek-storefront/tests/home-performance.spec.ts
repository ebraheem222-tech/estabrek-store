import { test, expect } from "@playwright/test";
import { sceneFrameGap } from "../src/lib/motionBudget";

test("90Hz displays respect the 60fps scene budget", () => {
  expect(sceneFrameGap()).toBeGreaterThan(1000 / 90);
});

// A hover preview colours the hovered section and the header only (themePreview.ts):
// the page shell is never written, so the rest of the page is not restyled.
test("category hover changes the palette without animating every page element", async ({ page }) => {
  await page.goto("/?motion=full");
  const card = page.locator(".editorial-collection-card").first();
  const shell = page.locator(".cinematic-shell");
  const header = page.locator(".atelier-header");
  await card.scrollIntoViewIfNeeded();
  await page.mouse.move(10, 150);
  await page.waitForTimeout(1200);
  const original = await header.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => {
    const state = window as typeof window & { paletteWrites: number };
    state.paletteWrites = 0;
    new MutationObserver(list => { state.paletteWrites += list.filter(m => m.attributeName === "style").length; })
      .observe(document.querySelector(".cinematic-shell")!, { attributes: true });
  });
  await card.hover();
  await expect(shell).toHaveAttribute("data-theme-preview", "true");
  await expect.poll(() => header.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(original);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as typeof window & { paletteWrites: number }).paletteWrites)).toBe(0);
  await page.mouse.move(10, 150);
  await expect(shell).not.toHaveAttribute("data-theme-preview", /.*/);
  await expect.poll(() => header.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(original);
});

test("quick category changes restore the shopper's colour without stale transitions", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#2f3b57" })));
  const shell = page.locator(".cinematic-shell");
  await expect(shell).toHaveAttribute("data-storefront-color", "#2f3b57");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-crossfade", /.*/);
  const background = await shell.evaluate(el => getComputedStyle(el).backgroundColor);
  const cards = page.locator(".editorial-collection-card");
  await cards.first().scrollIntoViewIfNeeded();
  await cards.first().hover();
  await expect(shell).toHaveAttribute("data-theme-preview", "true");
  await cards.nth(1).hover();
  await page.waitForTimeout(160);
  await page.mouse.move(10, 150);
  await expect(shell).not.toHaveAttribute("data-theme-preview", /.*/);
  await expect.poll(() => shell.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(background);
  await expect.poll(() => page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(47, 59, 87)");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-crossfade", /.*/);
  expect(errors).toEqual([]);
});

test("a colour pick survives a hover before its snapshot is ready", async ({ page }) => {
  await page.addInitScript(() => {
    const doc = document as Document & { startViewTransition: (update: () => void) => unknown };
    const start = doc.startViewTransition.bind(doc);
    doc.startViewTransition = update => start(() => new Promise<void>((resolve, reject) => {
      setTimeout(() => { try { update(); resolve(); } catch (error) { reject(error); } }, 700);
    }));
  });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  const shell = page.locator(".cinematic-shell");
  await expect(shell).toHaveAttribute("data-color-selection-ready", "true");
  const card = page.locator(".editorial-collection-card").first();
  await card.scrollIntoViewIfNeeded();
  await page.mouse.move(10, 150);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#2f3b57" })));
  await card.hover();
  await expect(shell).toHaveAttribute("data-theme-preview", "true");
  await page.mouse.move(10, 150);
  await expect(shell).toHaveAttribute("data-storefront-color", "#2f3b57");
  await expect(shell).not.toHaveAttribute("data-theme-preview", /.*/);
  await expect.poll(() => page.locator(".atelier-header").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(47, 59, 87)");
  await expect.poll(() => page.locator("html").evaluate(el => getComputedStyle(el).getPropertyValue("--selection-seed").trim())).toBe("#2f3b57");
  expect(errors).toEqual([]);
});

// A hover preview colours the hovered section and the header only (themePreview.ts):
// the page shell is never written, so the rest of the page is not restyled.
test("category hover also avoids page-wide animation without view transitions", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(document, "startViewTransition", { value: undefined }); });
  await page.goto("/");
  const card = page.locator(".editorial-collection-card").first();
  const shell = page.locator(".cinematic-shell");
  const header = page.locator(".atelier-header");
  await card.scrollIntoViewIfNeeded();
  await page.mouse.move(10, 150);
  await page.waitForTimeout(1200);
  const original = await header.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => {
    const state = window as typeof window & { paletteWrites: number };
    state.paletteWrites = 0;
    new MutationObserver(list => { state.paletteWrites += list.filter(m => m.attributeName === "style").length; })
      .observe(document.querySelector(".cinematic-shell")!, { attributes: true });
  });
  await card.hover();
  await expect(shell).toHaveAttribute("data-theme-preview", "true");
  await expect.poll(() => header.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(original);
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as typeof window & { paletteWrites: number }).paletteWrites)).toBe(0);
  await page.mouse.move(10, 150);
  await expect(shell).not.toHaveAttribute("data-theme-preview", /.*/);
  await expect.poll(() => header.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(original);
});

test("the hero film is the 120 fps file, played from memory", async ({ page }) => {
  await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=1");
  await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  try {
    await page.goto("/");
    await expect(page.locator(".film-canvas")).toHaveAttribute("data-ready", "true");
    expect(await page.locator(".film-canvas").evaluate((v: HTMLCanvasElement) => [v.width, v.height])).toEqual([1280, 720]);
    await expect(page.locator(".rose-film")).toHaveAttribute("data-playback", "full");
    // Fetched whole, then played from memory: a scroll never waits for the network.
    expect(await page.locator(".film-video").evaluate((v: HTMLVideoElement) => v.currentSrc.startsWith("blob:"))).toBe(true);
    for (const file of ["hero-film-120.webm", "hero-film-120.mp4", "hero-film-mobile-120.webm", "hero-film-mobile-120.mp4"]) {
      const res = await page.request.get(`/editorial/${file}`);
      expect(res.status(), file).toBe(200);
      expect((await res.body()).length, file).toBeLessThan(4_000_000);
    }
  } finally {
    await page.request.get("http://127.0.0.1:4100/__test/hero-film?on=0");
    await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
  }
});

test.describe("fabric scene on a dense mobile screen", () => {
  test.use({ viewport: { width: 393, height: 873 }, deviceScaleFactor: 3 });
  test("lite rendering limits the backing canvas to the visible resolution", async ({ page }) => {
    await page.goto("/?motion=lite");
    await page.locator(".design-study").scrollIntoViewIfNeeded();
    const canvas = page.locator(".model-canvas-wrap canvas");
    await expect(canvas).toHaveCount(1, { timeout: 30000 });
    const ratio = await canvas.evaluate((c: HTMLCanvasElement) => c.width / c.clientWidth);
    expect(ratio).toBeLessThanOrEqual(1.05);
  });
});
