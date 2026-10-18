import { test, expect, type Page } from "@playwright/test";

// Scroll scenes must not jump back to their start when the page re-measures
// itself (a phone's address bar showing/hiding, images or fonts arriving late).
// Before the fix a finished film, seasons scene or collection story replayed
// from the beginning after such a re-measure.
async function setScenes(page: Page, on: boolean) {
  await page.request.get(`http://127.0.0.1:4100/__test/hero-film?on=${on ? 1 : 0}`);
  await page.request.get(`http://127.0.0.1:4100/__test/scenes?on=${on ? 1 : 0}`);
  await page.request.post("/api/revalidate", { data: { tags: ["cms:pages", "catalog"] } });
}

/** Scrolls down step by step (like a person) until just past the end of `selector`. */
async function scrollPast(page: Page, selector: string) {
  const end = await page.evaluate((s) => {
    const el = document.querySelector<HTMLElement>(s)!;
    return el.getBoundingClientRect().top + scrollY + el.offsetHeight - innerHeight + 150;
  }, selector);
  // Big steps: the 3D scenes draw slowly in the test browser (software rendering).
  for (let y = await page.evaluate(() => scrollY); y < end; y += 700) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), Math.min(y + 700, end));
    await page.waitForTimeout(60);
  }
}

/** What the page does on its own: re-measure after a viewport change and after `load`. */
async function remeasure(page: Page) {
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width, height: size.height - 60 });
  await page.waitForTimeout(500);
  await page.setViewportSize(size);
  await page.evaluate(() => window.dispatchEvent(new Event("load")));
  await page.waitForTimeout(1200);
}

test.describe.serial("scroll scenes", () => {
  test.beforeEach(async ({ page }) => { await setScenes(page, true); });
  test.afterEach(async ({ page }) => { await setScenes(page, false); });

  test("a finished scene stays finished when the page re-measures", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-motion", "true");
    const video = page.locator(".film-video");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(1);

    await scrollPast(page, ".rose-film");
    await expect(page.locator(".rose-film")).toHaveAttribute("data-final", "true");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(9);
    await remeasure(page);
    await expect(page.locator(".rose-film")).toHaveAttribute("data-final", "true");
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(9);

    const seasons = page.locator(".rose-seasons");
    await expect(seasons).toHaveAttribute("data-motion", "true");
    await scrollPast(page, ".rose-seasons");
    await expect(seasons).toHaveAttribute("data-season", "spring");
    await remeasure(page);
    await expect(seasons).toHaveAttribute("data-season", "spring");

    const stories = page.locator(".rose-stories");
    await expect(stories).toHaveAttribute("data-motion", "true");
    await scrollPast(page, ".rose-stories");
    await expect(stories).toHaveAttribute("data-chapter", "incense");
    await remeasure(page);
    await expect(stories).toHaveAttribute("data-chapter", "incense");
  });

  test("?perf=1 shows the device numbers and ?motion=lite turns on the light mode", async ({ page }) => {
    await page.goto("/?perf=1&motion=lite");
    await expect(page.getByTestId("perf-overlay")).toContainText("fps");
    await expect(page.getByTestId("perf-overlay")).toContainText("mode lite");
    await expect(page.locator("html")).toHaveAttribute("data-motion-level", "lite");
    // Remembered for the visit.
    await page.goto("/");
    await expect(page.getByTestId("perf-overlay")).toContainText("mode lite");
  });
});

test.describe("collection worlds on a phone", () => {
  test.use({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 });
  test.beforeEach(async ({ page }) => { await setScenes(page, true); });
  test.afterEach(async ({ page }) => { await setScenes(page, false); });

  test("the 3D models carry no blur filter on phones (redrawn for every frame)", async ({ page }) => {
    await page.goto("/");
    const stories = page.locator(".rose-stories");
    await stories.scrollIntoViewIfNeeded();
    await expect(page.locator(".story-canvas canvas")).toHaveCount(1, { timeout: 30000 });
    expect(await page.locator(".story-canvas canvas").evaluate((el) => getComputedStyle(el).filter)).toBe("none");
  });
});
