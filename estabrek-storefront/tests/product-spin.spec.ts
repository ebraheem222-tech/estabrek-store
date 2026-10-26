import { test, expect } from "@playwright/test";

// A product's 360° view on its page (components/cinematic/ProductSpin.tsx): the sheet
// loads only when it's opened, it turns by itself until touched, by dragging and with the
// arrow keys, each colour shows its own view, the 3D tab opens the model, and with reduced
// motion it stays still. The test API serves rose-dress's views (tests/catalog-server.mjs).
const API = "http://127.0.0.1:4100";
// The product as the test API has it now (not a copy cached before its views were added).
test.beforeAll(async ({ request }) => {
  await request.post("/api/revalidate", { data: { tags: ["catalog", "catalog:products"] } });
});
const hits = async (reset = false) => (await (await fetch(`${API}/__test/spin-hits${reset ? "?reset=1" : ""}`)).json()).hits as number;

test("the 360° view: loads when opened, turns by itself, by hand and by keys, per colour, with 3D", async ({ page }) => {
  await hits(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/p/rose-dress");
  const open = page.getByTestId("pdp-spin");
  await expect(open).toBeVisible();
  await page.waitForTimeout(800);
  expect(await hits()).toBe(0); // nothing loads until it's opened

  await open.click();
  const dialog = page.getByTestId("product-spin-dialog");
  await expect(dialog).toBeVisible();
  const view = page.getByTestId("product-spin");
  await expect(view).toHaveAttribute("data-ready", "1");
  expect(await hits()).toBeGreaterThan(0);
  expect(await view.evaluate((el) => getComputedStyle(el).backgroundSize)).toBe("400% 300%");
  // It turns by itself…
  const f0 = Number(await view.getAttribute("data-frame"));
  await expect.poll(async () => Number(await view.getAttribute("data-frame")), { timeout: 4000 }).not.toBe(f0);
  // …until it's dragged: a third of its width is about a third of a turn.
  const box = (await view.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
  await page.mouse.down();
  const startFrame = Number(await view.getAttribute("data-frame"));
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  const dragged = Number(await view.getAttribute("data-frame"));
  expect((dragged - startFrame + 12) % 12).toBeGreaterThanOrEqual(3);
  await page.waitForTimeout(600);
  expect(Number(await view.getAttribute("data-frame"))).toBe(dragged); // no more turning by itself
  // The arrow keys step it, Home goes back to the front.
  await view.focus();
  await page.keyboard.press("ArrowRight");
  expect(Number(await view.getAttribute("data-frame"))).toBe((dragged + 1) % 12);
  await page.keyboard.press("Home");
  await expect(view).toHaveAttribute("data-frame", "0");
  await expect(view).toHaveAttribute("aria-valuetext", "0°");
  expect(await view.evaluate((el) => getComputedStyle(el).backgroundPosition)).toBe("0% 0%");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  // Frame 4: second row, first column.
  expect(await view.evaluate((el) => getComputedStyle(el).backgroundPosition)).toBe("0% 50%");

  // The 3D tab shows the model.
  await page.getByTestId("product-spin-3d").click();
  await expect(page.getByTestId("product-model").locator("canvas")).toBeVisible({ timeout: 20_000 });
  // Esc closes and gives the focus back.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();

  // Berry has its own view (and no model).
  await page.getByRole("radio", { name: /Berry/ }).click();
  await open.click();
  await expect(view).toHaveAttribute("data-ready", "1");
  expect(await view.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("c=berry");
  expect(await page.getByTestId("product-spin-3d").count()).toBe(0);
});

test("with reduced motion it stays still until it's turned; on a phone it fits", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:3000/p/rose-dress");
  await page.getByTestId("pdp-spin").click();
  const view = page.getByTestId("product-spin");
  await expect(view).toHaveAttribute("data-ready", "1");
  await page.waitForTimeout(1200);
  await expect(view).toHaveAttribute("data-frame", "0");
  const box = (await view.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  // A swipe still turns it.
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  expect(Number(await view.getAttribute("data-frame"))).toBeGreaterThan(3);
  await ctx.close();
});
