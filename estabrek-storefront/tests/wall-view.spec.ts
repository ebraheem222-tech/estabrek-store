import { expect, test, type Page } from "@playwright/test";

// «شوفها على حيطك» (components/cinematic/WallView.tsx, shared/wallArt.ts): a piece for a wall (the product's
// wallWidthCm / wallHeightCm / wallFrame) gets a button on the product page's frame; it opens a drawn room with the
// piece at its real size beside a sofa 210 cm wide, the sizes named by their size, a wall to paint, and the camera:
// a computer shows a code for a phone; an iPhone gets the piece as a USDZ file anchored to a wall (lib/wallAr.ts).
const SERVER = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;
const set = async (page: Page, data: Record<string, unknown>) => {
  await page.request.post(`${SERVER}/__test/wall`, { data });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["catalog", "catalog:products"], paths: ["/p/rose-dress"] } });
};
const boxOf = async (page: Page, testId: string) => (await page.getByTestId(testId).boundingBox())!;

test.describe("a piece for a wall, at its real size", () => {
  test.describe.configure({ mode: "serial" });
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await set(page, {});
    await page.close();
  });

  test("the room: the piece at its size beside the sofa, above it, on the wall's paint; a computer gets a code for a phone", async ({ page }) => {
    test.setTimeout(120_000);
    await set(page, { on: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/p/rose-dress");
    await page.getByTestId("pdp-wall").click();
    const dialog = page.getByTestId("wall-view");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("wall-size")).toHaveText(/50 × 70/);
    // 360 cm of wall across the room: the piece (50 × 70, a wooden frame 3 cm each side) and the sofa (210 cm) to scale.
    const room = await boxOf(page, "wall-room"), art = await boxOf(page, "wall-art"), cm = room.width / 360;
    expect(Math.abs(art.width - 56 * cm)).toBeLessThan(1.5);
    expect(Math.abs(art.height - 76 * cm)).toBeLessThan(1.5);
    const sofa = (await dialog.locator(".wall-sofa").boundingBox())!;
    expect(Math.abs(sofa.width - 210 * cm)).toBeLessThan(1.5);
    // Hung above the sofa's back, in the middle of the wall.
    expect(art.y + art.height).toBeLessThan(sofa.y);
    expect(Math.abs(art.x + art.width / 2 - (room.x + room.width / 2))).toBeLessThan(1.5);
    // The wall takes the paint chosen.
    await dialog.locator(".wall-paint").nth(4).click();
    await expect(page.getByTestId("wall-room")).toHaveCSS("background-color", "rgb(51, 55, 58)");
    // A computer has no camera for walls: a code opens the page (and the room) on a phone.
    const camera = page.getByTestId("wall-camera");
    await expect(camera).toHaveAttribute("data-way", "none");
    await camera.click();
    await expect(page.getByTestId("wall-code").locator("svg")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("a link with ?wall=1 opens the room at once; sizes named by their size hang at their own size and pick the page's size", async ({ page }) => {
    test.setTimeout(120_000);
    await set(page, { on: true, sized: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/p/rose-dress?c=Berry&wall=1");
    await expect(page.getByTestId("wall-view")).toBeVisible({ timeout: 20_000 });
    const sizes = page.getByTestId("wall-sizes");
    await expect(sizes.getByRole("radio")).toHaveText(["50×70", "70×100"]);
    const before = await boxOf(page, "wall-art");
    await sizes.getByRole("radio", { name: "70×100" }).click();
    await expect(page.getByTestId("wall-size")).toHaveText(/70 × 100/);
    const room = await boxOf(page, "wall-room"), after = await boxOf(page, "wall-art"), cm = room.width / 360;
    expect(after.width).toBeGreaterThan(before.width);
    expect(Math.abs(after.width - 76 * cm)).toBeLessThan(1.5);
    // The page's own size follows.
    await page.keyboard.press("Escape");
    await expect(page.locator(".rose-pdp-sizes [aria-checked=true]")).toHaveText("70×100");
  });

  test("an iPhone gets the piece as a USDZ file anchored to a wall, opened by its own viewer", async ({ page }) => {
    test.setTimeout(120_000);
    await set(page, { on: true });
    // Safari's AR Quick Look, stood in for: a link to an AR file is "supported", and its opening is noted.
    await page.addInitScript(() => {
      const supports = DOMTokenList.prototype.supports;
      DOMTokenList.prototype.supports = function (t: string) { return t === "ar" ? true : supports.call(this, t); };
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.rel === "ar") { (window as unknown as { __ar?: string }).__ar = this.href; return; }
        return click.call(this);
      };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/p/rose-dress");
    await page.getByTestId("pdp-wall").click();
    const camera = page.getByTestId("wall-camera");
    await expect(camera).toHaveAttribute("data-way", "quicklook");
    await camera.click();
    const href = await page.waitForFunction(() => (window as unknown as { __ar?: string }).__ar, null, { timeout: 30_000 }).then((h) => h.jsonValue() as Promise<string>);
    expect(href).toMatch(/^blob:.*#allowsContentScaling=0$/);
    const file = await page.evaluate(async (url) => {
      const bytes = new Uint8Array(await (await fetch(url.split("#")[0])).arrayBuffer());
      return { head: String.fromCharCode(bytes[0], bytes[1]), text: new TextDecoder("latin1").decode(bytes) };
    }, href);
    // A zip (USDZ), hung on a wall, its picture inside.
    expect(file.head).toBe("PK");
    expect(file.text).toContain('preliminary:anchoring:type = "plane"');
    expect(file.text).toContain('preliminary:planeAnchoring:alignment = "vertical"');
    expect(file.text).toMatch(/textures\/Texture_\w+\.png/);
  });

  test("a piece that isn't for a wall has no button", async ({ page }) => {
    await set(page, {});
    await page.goto("/en/p/rose-dress");
    await expect(page.locator(".rose-pdp-frame")).toBeVisible();
    await expect(page.getByTestId("pdp-wall")).toHaveCount(0);
  });
});
