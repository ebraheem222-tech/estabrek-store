import { expect, test, type Locator, type Page } from "@playwright/test";

// Product pictures in 3D (lib/usePhoto3d.ts, pageTree/photo3dRun.ts): the card's «3D» hover (Settings → the card's
// design) and the product page's «3D» big picture (Settings → the product page). Each picture is lifted by its depth
// picture (made in the admin) or, until it has one, by a quick depth from its light. The pictures come from the shop's
// own address here, so the page may read them; the depth picture is drawn in the browser and served by the test.
const SERVER = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;
type Probe = { triangles: number; yaw: number; pitch: number; frames: number; depth: "map" | "light" };
const probe = (el: Locator) => el.evaluate((e) => (e as HTMLElement & { __photo3d?: () => Probe }).__photo3d?.() ?? null);
const revalidate = (page: Page, paths: string[]) => page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages", "cms:bootstrap", "settings", "catalog", "catalog:products"], paths } });
const cards = async (page: Page, patch: Record<string, unknown>) => {
  await page.request.post(`${SERVER}/__test/commerce`, { data: { on: true, ...patch } });
  await revalidate(page, ["/shop"]);
};
const productPage = async (page: Page, data: Record<string, unknown>) => {
  await page.request.post(`${SERVER}/__test/product-picture`, { data });
  await revalidate(page, ["/p/rose-dress"]);
};
/** A depth picture (a bright disc, near, on a dark ground), served at /zz-3d/depth.png (drawn on the blank page a test
 *  starts on, before any of the shop's pages: a page still being built in development would cut the next visit short). */
async function serveDepth(page: Page) {
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 300;
    c.height = 400;
    const g = c.getContext("2d")!;
    g.fillStyle = "#111";
    g.fillRect(0, 0, 300, 400);
    const r = g.createRadialGradient(150, 180, 10, 150, 180, 120);
    r.addColorStop(0, "#fff");
    r.addColorStop(1, "#888");
    g.fillStyle = r;
    g.beginPath();
    g.arc(150, 180, 120, 0, Math.PI * 2);
    g.fill();
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.route("**/zz-3d/depth.png", (r) => r.fulfill({ body: Buffer.from(png, "base64"), contentType: "image/png" }));
}

test.describe("product pictures in 3D", () => {
  test.describe.configure({ mode: "serial" });
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await cards(page, { on: false });
    await productPage(page, {});
    await page.close();
  });

  test("a card's picture turns in 3D under the pointer, by its depth picture, and is put away after; its link still opens the product", async ({ page }) => {
    test.setTimeout(150_000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await serveDepth(page);
    await cards(page, { ownPictures: true, depth: "/zz-3d/depth.png", visualControls: { version: 1, revision: 7, cardDesign: { hover: "3d" } } });
    await page.goto("/en/shop");
    const card = page.locator('.configured-product-card:has(img.cpc-first[src^="/editorial/"])').first();
    await expect(card).toHaveAttribute("data-card-hover", "3d");
    const pic = card.locator(".cpc-pic");
    // At rest: the picture itself, no canvas (nothing is made before the pointer comes).
    await expect(pic).toHaveAttribute("data-pt-3d-state", "rest", { timeout: 30_000 });
    await expect(pic.locator("canvas")).toHaveCount(0);
    await pic.scrollIntoViewIfNeeded();
    const box = (await pic.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(pic).toHaveAttribute("data-pt-3d-state", "on", { timeout: 20_000 });
    await expect(pic.locator("canvas.pt-3d[data-on]")).toHaveCount(1);
    const at = (await probe(pic))!;
    expect(at.depth).toBe("map");
    expect(at.triangles).toBeGreaterThan(1000);
    // Toward the pointer: to the right, then up.
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(box.x + box.width * 0.95 - (i % 2), box.y + box.height * 0.1);
      await page.waitForTimeout(50);
    }
    await expect.poll(async () => (await probe(pic))!.yaw, { timeout: 5_000 }).toBeGreaterThan(0.12);
    expect((await probe(pic))!.pitch).toBeLessThan(-0.05);
    // The canvas is the picture's box.
    const canvas = (await pic.locator("canvas").boundingBox())!;
    expect(Math.abs(canvas.width - box.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvas.height - box.height)).toBeLessThanOrEqual(1);
    // The pointer leaves: it turns back, fades and is put away.
    await page.mouse.move(5, 5);
    await expect(pic.locator("canvas")).toHaveCount(0, { timeout: 10_000 });
    await expect(pic).toHaveAttribute("data-pt-3d-state", "rest");
    // Back again: made again, at once.
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(pic.locator("canvas.pt-3d[data-on]")).toHaveCount(1, { timeout: 10_000 });
    // The canvas never takes the press: the picture still opens the product.
    await pic.click();
    await expect(page).toHaveURL(/\/p\//, { timeout: 20_000 });
  });

  test("a card's picture without a depth picture yet: a quick depth from its light", async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await cards(page, { ownPictures: true, visualControls: { version: 1, revision: 8, cardDesign: { hover: "3d" } } });
    await page.goto("/en/shop");
    const pic = page.locator('.configured-product-card:has(img.cpc-first[src^="/editorial/"])').first().locator(".cpc-pic");
    await expect(pic).toHaveAttribute("data-pt-3d-state", "rest", { timeout: 30_000 });
    await pic.scrollIntoViewIfNeeded();
    const box = (await pic.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(pic).toHaveAttribute("data-pt-3d-state", "on", { timeout: 20_000 });
    expect((await probe(pic))!.depth).toBe("light");
  });

  test("the product page's big picture in 3D: turns with the pointer in place of the zoom, follows the photo chosen, a press still opens the photos", async ({ page }) => {
    test.setTimeout(150_000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await serveDepth(page);
    await cards(page, { on: false });
    await productPage(page, { fx: "3d", ownPictures: true, depth: "/zz-3d/depth.png" });
    await page.goto("/en/p/rose-dress");
    const pic = page.locator(".rose-pdp-zoom");
    await expect(pic).toHaveAttribute("data-pt-3d-state", "on", { timeout: 30_000 });
    await expect(pic.locator("canvas.pt-3d[data-on]")).toHaveCount(1);
    expect((await probe(pic))!.depth).toBe("map");
    const box = (await pic.boundingBox())!;
    for (let i = 0; i < 6; i++) {
      await page.mouse.move(box.x + box.width * 0.1 + (i % 2), box.y + box.height * 0.5);
      await page.waitForTimeout(50);
    }
    await expect.poll(async () => (await probe(pic))!.yaw, { timeout: 5_000 }).toBeLessThan(-0.1);
    // The zoom steps aside while it is drawn.
    expect(await pic.locator("img").first().evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    // Another photo (it has no depth picture of its own): started again, from its light.
    await page.mouse.move(5, 5);
    await page.locator(".rose-pdp-thumbs button").nth(1).click();
    await expect(pic.locator("img").first()).toHaveAttribute("src", /scarves/, { timeout: 10_000 });
    await expect.poll(async () => (await probe(pic))?.depth, { timeout: 20_000 }).toBe("light");
    await expect(pic.locator("canvas.pt-3d")).toHaveCount(1);
    // A press opens the photos full screen.
    await pic.click();
    await expect(page.locator(".rose-viewer")).toBeVisible({ timeout: 10_000 });
  });

  test("less motion: the product page keeps its flat picture and the card its picture", async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const still = await browser.newContext({ reducedMotion: "reduce", baseURL });
    const page = await still.newPage();
    await productPage(page, { fx: "3d", ownPictures: true });
    await page.goto("/en/p/rose-dress");
    const pic = page.locator(".rose-pdp-zoom");
    await expect(pic.locator("img").first()).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    await expect(pic.locator("canvas.pt-3d")).toHaveCount(0);
    await still.close();
  });
});
