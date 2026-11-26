import { expect, test, type Page } from "@playwright/test";

// «طلّع الغرض من الصورة» (admin studio/PopOutPanel.tsx): the thing cut out of a picture lies over it as its front
// layer (pageTree/pieces.ts `image`), laid exactly as the picture is (its fit and focus), and comes toward the viewer
// as the pointer comes or as the page scrolls through it; never for whoever asked for less motion.
const API = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;

/** A picture (colours) and a cut thing (a disc on transparency), as PNGs made in a browser. */
async function pictures(page: Page) {
  const made = await page.evaluate(() => {
    const draw = (paint: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement("canvas"); c.width = 400; c.height = 300; paint(c.getContext("2d")!); return c.toDataURL("image/png").split(",")[1]; };
    return {
      pic: draw((g) => { g.fillStyle = "#1d4ed8"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#fde047"; g.beginPath(); g.arc(200, 150, 80, 0, Math.PI * 2); g.fill(); }),
      cut: draw((g) => { g.fillStyle = "#fde047"; g.beginPath(); g.arc(200, 150, 80, 0, Math.PI * 2); g.fill(); }),
    };
  });
  return { pic: Buffer.from(made.pic, "base64"), cut: Buffer.from(made.cut, "base64") };
}
async function show(page: Page, files: { pic: Buffer; cut: Buffer }, items: Array<{ id: string; pop?: string }>) {
  await page.route("**/zz-pop/pic.png", (r) => r.fulfill({ body: files.pic, contentType: "image/png" }));
  await page.route("**/zz-pop/cut.png", (r) => r.fulfill({ body: files.cut, contentType: "image/png" }));
  const nodes = items.map(({ id, pop }) => ({ id: `s-${id}`, type: "section", props: { contained: true }, children: [{ id, type: "image", props: { src: "/zz-pop/pic.png", alt: { en: id }, layers: { after: { image: "/zz-pop/cut.png", front: true, ...(pop ? { pop } : {}) } } }, style: { base: { width: "100%", height: "360px", fit: "cover", focus: { x: 50, y: 30 } } } }] }));
  await page.request.post(`${API}/__test/library-page`, { data: { nodes } });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.goto("/en/library-demo");
}
const frameOf = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`).first();

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
  await request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
});

test("the cut thing over its picture: laid as the picture is, in front; it comes forward with the pointer, and with the scroll", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const files = await pictures(page);
  await show(page, files, [{ id: "hand", pop: "hover" }, { id: "roll", pop: "scroll" }, { id: "still" }]);
  const hand = frameOf(page, "hand");
  await hand.scrollIntoViewIfNeeded();
  const layer = hand.locator(":scope > .pt-pc-after");
  await expect(layer).toHaveCount(1);
  const look = await layer.evaluate((el) => { const s = getComputedStyle(el); return { image: s.backgroundImage, size: s.backgroundSize, at: s.backgroundPosition, z: s.zIndex, inset: [s.top, s.left], w: el.getBoundingClientRect().width, frameW: el.parentElement!.getBoundingClientRect().width }; });
  expect(look.image).toContain("/zz-pop/cut.png");
  // As the picture is laid: cover, its focus 50 % 30 %; over all of it, in front of the picture.
  expect(look.size).toBe("cover");
  expect(look.at).toBe("50% 30%");
  expect(look.z).toBe("2");
  expect(look.w).toBeCloseTo(look.frameW, 0);
  const transform = () => layer.evaluate((el) => getComputedStyle(el).transform);
  const scale = () => layer.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
  expect(await transform()).toBe("none");
  // The pointer comes: it grows toward the viewer, with a shadow; it goes back as it leaves.
  await hand.hover();
  await expect.poll(scale, { timeout: 5000 }).toBeGreaterThan(1.04);
  expect(await layer.evaluate((el) => getComputedStyle(el).filter)).toContain("drop-shadow");
  await page.mouse.move(2, 2);
  await expect.poll(scale, { timeout: 5000 }).toBeLessThan(1.005);
  // With the scroll: the page's own scroll drives it (a scroll timeline).
  const roll = frameOf(page, "roll").locator(":scope > .pt-pc-after");
  expect(await roll.evaluate((el) => getComputedStyle(el).animationName)).toBe("pt-pop-out");
  // Still: laid over, nothing moves.
  const still = frameOf(page, "still").locator(":scope > .pt-pc-after");
  await frameOf(page, "still").hover();
  await page.waitForTimeout(700);
  expect(await still.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  expect(await still.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});

test("less motion: the cut thing lies still over its picture", async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL });
  const page = await ctx.newPage();
  const files = await pictures(page);
  await show(page, files, [{ id: "hand", pop: "hover" }, { id: "roll", pop: "scroll" }]);
  const hand = frameOf(page, "hand");
  await hand.scrollIntoViewIfNeeded();
  await hand.hover();
  await page.waitForTimeout(800);
  expect(await hand.locator(":scope > .pt-pc-after").evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  expect(await frameOf(page, "roll").locator(":scope > .pt-pc-after").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  await ctx.close();
});
