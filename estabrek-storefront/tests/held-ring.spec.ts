import { expect, test, type Page } from "@playwright/test";

// A ring that turns with the scroll and has a length is held on the screen for that length: the page scrolls on
// through the room left for its turn while the ring stays where it was caught, then it goes on with the page.

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });

test("a ring with a length stays on the screen while it turns, then goes on with the page", async ({ page }) => {
  test.setTimeout(150000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  await ready(page);
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.locator('[data-testid="studio-add-item"][data-kind="ready-orbit"]').click();
  await ready(page);
  const ring = frame(page).locator("[data-pt-orbit]").first();
  await expect(ring).toBeVisible();
  // The ready ring is held for one and a half screens: its holder keeps that much room under it.
  const holder = frame(page).locator(".pin-spacer");
  await expect(holder).toHaveCount(1);
  // The editor shows the new section for a few moments after adding it, and the page settles.
  await page.waitForTimeout(3000);
  const room = await holder.evaluate((el) => parseFloat((el as HTMLElement).style.paddingBottom));
  expect(room).toBeGreaterThan(600);
  const start = await holder.evaluate((el) => Math.round(window.scrollY + el.getBoundingClientRect().top));

  // Where the ring is on the screen once the page stands `by` px past the place the ring is caught at.
  const scrollPast = (by: number) => ring.evaluate((_, y) => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }), start + by);
  // (+ 0: a top a hair above the screen's edge rounds to -0, which is not 0 to the test.)
  const box = () => ring.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top) + 0, left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }; });
  const top = async () => (await box()).top;
  const spot = () => ring.locator(":scope > [data-tree-node]").first().evaluate((el) => (el as HTMLElement).style.translate);

  // Before its place it scrolls with the page.
  await scrollPast(-120);
  await expect.poll(top).toBe(120);
  const free = await box();
  const rest = await spot();

  // Through its length it stays at the top of the screen, the same size and not moved sideways, and its
  // things travel round (it used to scroll away with the page here: its own CSS undid the hold).
  await scrollPast(300);
  await expect.poll(top).toBe(0);
  expect(await box()).toEqual({ ...free, top: 0 });
  await expect.poll(spot).not.toBe(rest);
  const early = await spot();
  await scrollPast(room - 300);
  await expect.poll(top).toBe(0);
  await expect.poll(spot).not.toBe(early);
  expect(await box()).toEqual({ ...free, top: 0 });

  // Past its length it is let go and goes on with the page; scrolling back catches it again.
  await scrollPast(room + 100);
  await expect.poll(top).toBe(-100);
  await scrollPast(300);
  await expect.poll(top).toBe(0);
  await scrollPast(-120);
  await expect.poll(top).toBe(120);
  expect(await box()).toEqual(free);
});
