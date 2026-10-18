import { test, expect, type Page } from "@playwright/test";
import { MOTION_DEFAULTS, decodeMotionPreview, encodeMotionPreview, lazyMargin, normalizeMotion, prebuildAfter } from "../src/lib/motionSettings";

// The admin's motion settings (السرعة والكاش → الحركة والتحميل) on their way to the
// shop, the owner's preview, and the popularity signals (lib/signals.ts).

const MOCK = "http://127.0.0.1:4100";

async function usePerformance(page: Page, performance: unknown | null) {
  if (performance) await page.request.post(`${MOCK}/__test/performance`, { data: performance });
  else await page.request.get(`${MOCK}/__test/performance?off=1`);
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}

async function useFilm(page: Page, on: boolean) {
  await page.request.get(`${MOCK}/__test/hero-film?on=${on ? 1 : 0}`);
  await page.request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
}

test.describe("Motion settings: the values", () => {
  test("anything is brought into range; the defaults are what the shop did before", () => {
    expect(normalizeMotion(null)).toEqual(MOTION_DEFAULTS);
    const n = normalizeMotion({
      sections: { hero: { on: false, smoothMs: 5 } },
      maxFps: 75,
      lazyPercent: 9999,
      videoPreload: "everything",
      phoneGlass: "yes",
    });
    expect(n.sections.hero).toEqual({ on: false, smoothMs: 30 });
    expect(n.sections.seasons).toEqual(MOTION_DEFAULTS.sections.seasons);
    expect(n.maxFps).toBe(120);
    expect(n.lazyPercent).toBe(400);
    expect(n.videoPreload).toBe("auto");
    expect(n.phoneGlass).toBe(false);
  });

  test("a preview link carries the settings exactly (and junk is ignored)", () => {
    const s = normalizeMotion({ maxFps: 60, sections: { seasons: { on: false, smoothMs: 140 } } });
    const link = encodeMotionPreview(s);
    expect(link).not.toMatch(/[+/=]/);
    expect(normalizeMotion(decodeMotionPreview(link))).toEqual(s);
    expect(decodeMotionPreview("%%%")).toBeNull();
  });

  test("outside a browser: the same loading distances and build times as before", () => {
    expect(lazyMargin(600)).toBe("600px 0px");
    expect(prebuildAfter(0)).toBe(1500);
    expect(prebuildAfter(2)).toBe(3500);
  });
});

test.describe("Motion settings in the shop", () => {
  test.afterEach(async ({ page }) => {
    await usePerformance(page, null);
    await useFilm(page, false);
  });

  test("the admin's settings are in the page before any scene starts", async ({ page }) => {
    await usePerformance(page, { maxFps: 60, phoneGlass: true, sections: { campaign: { on: false, smoothMs: 90 } } });
    await page.goto("/");
    const motion = await page.evaluate(() => (window as unknown as { __estabrekMotion: typeof MOTION_DEFAULTS }).__estabrekMotion);
    expect(motion.maxFps).toBe(60);
    expect(motion.sections.campaign.on).toBe(false);
    expect(motion.sections.hero).toEqual(MOTION_DEFAULTS.sections.hero);
    await expect(page.locator("html")).toHaveAttribute("data-phone-glass", "");
  });

  test("with nothing set, the shop moves as before", async ({ page }) => {
    await page.goto("/");
    const motion = await page.evaluate(() => (window as unknown as { __estabrekMotion: unknown }).__estabrekMotion);
    expect(motion).toEqual(MOTION_DEFAULTS);
    expect(await page.locator("html").getAttribute("data-phone-glass")).toBeNull();
  });

  test("a scene switched off shows its still version", async ({ page }) => {
    await useFilm(page, true);
    await page.goto("/");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-motion", "true");

    await usePerformance(page, { sections: { hero: { on: false, smoothMs: 110 } } });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-motion", "false");
  });

  test("the owner's preview applies to this visit only, with a way out", async ({ page }) => {
    const draft = normalizeMotion({ maxFps: 45 });
    await page.goto(`/?motion-preview=${encodeMotionPreview(draft)}`);
    await expect(page.locator(".motion-preview-note")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __estabrekMotion: { maxFps: number } }).__estabrekMotion.maxFps)).toBe(120); // the saved ones stay
    await page.goto("/shop");
    await expect(page.locator(".motion-preview-note")).toBeVisible();
    await page.getByRole("button", { name: "إنهاء المعاينة" }).click();
    await page.waitForURL(/motion-preview=off/);
    await expect(page.locator(".motion-preview-note")).toHaveCount(0);
  });
});

test.describe("Popularity signals", () => {
  test("a product view is counted: product id only, no cookies, as a simple text request", async ({ page }) => {
    await page.request.get(`${MOCK}/__test/signals?reset=1`);
    await page.goto("/p/rose-dress");
    // The batch goes a few seconds after the page is ready (or when it's left); counted once.
    await expect
      .poll(async () => (await page.request.get(`${MOCK}/__test/signals`)).json(), { timeout: 30_000 })
      .toEqual([expect.objectContaining({ e: [{ k: "view", p: "coat" }] })]);
    const [sent] = await (await page.request.get(`${MOCK}/__test/signals`)).json();
    expect(sent.type).toMatch(/^text\/plain/);
    expect(sent.cookie).toBe("");
  });
});
