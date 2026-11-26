import { expect, test, type Locator, type Page } from "@playwright/test";

// Admin → الإعدادات → صفحة المنتج → «الصورة الكبيرة لما يمرّ الماوس عليها» (header.storefront.productPictureFx): the
// product page's big picture takes a live effect drawn by the graphics card (pageTree/pictureFxRun.ts, started by
// lib/usePictureFx.ts) in place of its zoom. The pictures come from the shop's own address here, so the page may
// read them.
const SERVER = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;
const set = async (page: Page, data: Record<string, unknown>) => {
  await page.request.post(`${SERVER}/__test/product-picture`, { data });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["settings", "cms:bootstrap", "catalog", "catalog:products"], paths: ["/p/rose-dress"] } });
};
const over = async (page: Page, pic: Locator) => {
  await pic.scrollIntoViewIfNeeded();
  const box = (await pic.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 4 });
  return box;
};
/** What the canvas drew at a point of the picture's box (fractions across and down): r, g, b, a. */
const drawnAt = async (pic: Locator, x: number, y: number) => {
  await pic.evaluate((el, at) => { el.removeAttribute("data-pt-glfx-probe"); el.dispatchEvent(new CustomEvent("pt:glfx-probe", { detail: at })); }, { x, y });
  await expect(pic).toHaveAttribute("data-pt-glfx-probe", /^\d+,\d+,\d+,\d+$/, { timeout: 5000 });
  return ((await pic.getAttribute("data-pt-glfx-probe")) ?? "").split(",").map(Number);
};
const POINTS: Array<[number, number]> = [[0.15, 0.12], [0.85, 0.2], [0.2, 0.9], [0.8, 0.88]];
const zoomOf = (pic: Locator) => pic.locator("img").first().evaluate((el) => getComputedStyle(el).transform);
/** The photo's fade is over (it runs half a second each time a photo is shown), and it left nothing written on the picture. */
const faded = async (page: Page, pic: Locator) => {
  await page.waitForTimeout(700);
  await expect.poll(() => pic.locator("img").first().evaluate((el) => el.getAnimations().filter((a) => !("animationName" in a) && !("transitionProperty" in a)).length), { timeout: 5000 }).toBe(0);
  expect(await pic.locator("img").first().evaluate((el) => (el as HTMLElement).style.transform)).toBe("");
};
/** The zoom works, and still works for a photo chosen afterwards (once its fade is over). */
const zooms = async (page: Page, pic: Locator) => {
  await over(page, pic);
  await expect.poll(() => zoomOf(pic), { timeout: 8000 }).toContain("1.7");
  await page.mouse.move(5, 5);
  await page.locator(".rose-pdp-thumbs button").nth(1).click();
  await expect(pic.locator("img").first()).toHaveAttribute("src", /scarves/, { timeout: 10000 });
  await faded(page, pic);
  await over(page, pic);
  await expect.poll(() => zoomOf(pic), { timeout: 8000 }).toContain("1.7");
};

test.describe("the product page's big picture under the pointer", () => {
  test.describe.configure({ mode: "serial" });
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await set(page, {});
    await page.close();
  });

  test("with the setting, the graphics card draws it in place of the zoom, it follows the photo chosen, and a press still opens the photos", async ({ page }) => {
    test.setTimeout(150000);
    await set(page, { fx: "ripple", ownPictures: true });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/p/rose-dress");
    const pic = page.locator(".rose-pdp-zoom");
    // At rest: the picture itself, ready for the pointer, with no canvas.
    await expect(pic).toHaveAttribute("data-pt-glfx-state", "rest", { timeout: 30000 });
    await expect(pic.locator("canvas")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    await faded(page, pic);
    const box = await over(page, pic);
    await expect(pic.locator("canvas.pt-glfx[data-on]")).toHaveCount(1, { timeout: 20000 });
    // The canvas is the picture's box; what it drew is the picture (nothing see-through, not one flat colour)…
    const canvas = (await pic.locator("canvas").boundingBox())!;
    expect(Math.abs(canvas.width - box.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvas.height - box.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvas.x - box.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvas.y - box.y)).toBeLessThanOrEqual(1);
    const first: number[][] = [];
    for (const [x, y] of POINTS) first.push(await drawnAt(pic, x, y));
    for (const px of first) expect(px[3]).toBe(255);
    const spread = (list: number[][]) => Math.max(...[0, 1, 2].map((c) => Math.max(...list.map((px) => px[c])) - Math.min(...list.map((px) => px[c]))));
    expect(spread(first)).toBeGreaterThan(8);
    // …and the zoom has stepped aside: the picture under the canvas is not made bigger.
    await expect.poll(() => zoomOf(pic), { timeout: 5000 }).toBe("none");
    expect(await pic.evaluate((el) => el.matches(":hover"))).toBe(true);
    // The pointer leaves: the picture itself again.
    await page.mouse.move(5, 5);
    await expect(pic.locator("canvas.pt-glfx[data-on]")).toHaveCount(0, { timeout: 10000 });

    // Another photo is chosen: the effect starts again with it, and draws that photo.
    await page.locator(".rose-pdp-thumbs button").nth(1).click();
    await expect(pic.locator("img").first()).toHaveAttribute("src", /scarves/, { timeout: 10000 });
    await expect(pic.locator("canvas")).toHaveCount(0);
    await expect(pic).toHaveAttribute("data-pt-glfx-state", "rest", { timeout: 10000 });
    await faded(page, pic);
    await over(page, pic);
    await expect(pic.locator("canvas.pt-glfx[data-on]")).toHaveCount(1, { timeout: 20000 });
    const second: number[][] = [];
    for (const [x, y] of POINTS) second.push(await drawnAt(pic, x, y));
    for (const px of second) expect(px[3]).toBe(255);
    const apart = first.reduce((sum, px, i) => sum + Math.abs(px[0] - second[i][0]) + Math.abs(px[1] - second[i][1]) + Math.abs(px[2] - second[i][2]), 0);
    expect(apart).toBeGreaterThan(60);

    // The canvas never takes the press: the picture still opens the photos full screen.
    await pic.click();
    await expect(page.locator(".rose-viewer")).toBeVisible({ timeout: 10000 });
  });

  test("whoever asked for less motion keeps the picture and its zoom", async ({ page }) => {
    await set(page, { fx: "liquid", ownPictures: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/p/rose-dress");
    const pic = page.locator(".rose-pdp-zoom");
    await expect(pic.locator("img").first()).toBeVisible({ timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await faded(page, pic);
    await zooms(page, pic);
    await expect(pic).not.toHaveAttribute("data-pt-glfx-state", /.*/);
    await expect(pic.locator("canvas")).toHaveCount(0);
  });

  test("without the setting, the picture zooms under the pointer, for a photo chosen later too", async ({ page }) => {
    await set(page, { ownPictures: true });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/p/rose-dress");
    const pic = page.locator(".rose-pdp-zoom");
    await expect(pic.locator("img").first()).toBeVisible({ timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await faded(page, pic);
    await zooms(page, pic);
    await expect(pic).not.toHaveAttribute("data-pt-glfx-state", /.*/);
    await expect(pic.locator("canvas")).toHaveCount(0);
  });
});
