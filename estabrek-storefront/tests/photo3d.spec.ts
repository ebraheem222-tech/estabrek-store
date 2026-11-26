import { expect, test, type Locator, type Page } from "@playwright/test";

// «صورة 3D» (shared/photo3d.ts, pageTree/photo3dRun.ts): a picture lifted by its depth picture, drawn with WebGL over
// the picture, turning by itself, with the pointer or the scroll; the flat picture for less motion or when the depth
// can't be read. The depth is made in the editor (by a model on the owner's device): here a drawn one stands in.
const API = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;
type Probe = { triangles: number; cut: number; yaw: number; pitch: number; frames: number; look: string };

/** A picture (colours, a disc in the middle) and its depth (the disc near), as PNGs made in a browser. */
async function pictures(page: Page) {
  const made = await page.evaluate(() => {
    const draw = (paint: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement("canvas"); c.width = 400; c.height = 300; paint(c.getContext("2d")!); return c.toDataURL("image/png").split(",")[1]; };
    return {
      pic: draw((g) => { const l = g.createLinearGradient(0, 0, 400, 300); l.addColorStop(0, "#1d4ed8"); l.addColorStop(1, "#f472b6"); g.fillStyle = l; g.fillRect(0, 0, 400, 300); g.fillStyle = "#fde047"; g.beginPath(); g.arc(200, 150, 80, 0, Math.PI * 2); g.fill(); }),
      depth: draw((g) => { g.fillStyle = "#000"; g.fillRect(0, 0, 400, 300); const r = g.createRadialGradient(200, 150, 10, 200, 150, 80); r.addColorStop(0, "#fff"); r.addColorStop(1, "#ccc"); g.fillStyle = r; g.beginPath(); g.arc(200, 150, 80, 0, Math.PI * 2); g.fill(); }),
    };
  });
  return { pic: Buffer.from(made.pic, "base64"), depth: Buffer.from(made.depth, "base64") };
}
async function show(page: Page, files: { pic: Buffer; depth: Buffer }, items: Array<{ id: string; photo3d: Record<string, unknown> }>) {
  await page.route("**/zz-3d/pic.png", (r) => r.fulfill({ body: files.pic, contentType: "image/png" }));
  await page.route("**/zz-3d/depth.png", (r) => r.fulfill({ body: files.depth, contentType: "image/png" }));
  await page.route("**/zz-3d/missing.png", (r) => r.fulfill({ status: 404, body: "" }));
  const nodes = items.map(({ id, photo3d }) => ({ id: `s-${id}`, type: "section", props: { contained: true }, children: [{ id, type: "image", props: { src: "/zz-3d/pic.png", alt: { en: id }, photo3d }, style: { base: { width: "100%", height: "360px", fit: "cover" } } }] }));
  await page.request.post(`${API}/__test/library-page`, { data: { nodes } });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.goto("/en/library-demo");
}
const frameOf = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`).first();
const probe = (el: Locator) => el.evaluate((e) => (e as HTMLElement & { __photo3d?: () => Probe }).__photo3d?.() ?? null);
const centre = (el: Locator) => el.evaluate((e) => e.scrollIntoView({ block: "center" }));

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
  await request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
});

test("a picture in 3D: lifted by its depth, turning by itself, with the pointer, as dots; plain without its depth", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en");
  const files = await pictures(page);
  await show(page, files, [
    { id: "auto", photo3d: { map: "/zz-3d/depth.png", move: "auto", turn: 1, depth: 0.8 } },
    { id: "hand", photo3d: { map: "/zz-3d/depth.png", turn: 1, light: 0.8 } },
    { id: "dots", photo3d: { map: "/zz-3d/depth.png", look: "points", move: "auto" } },
    { id: "lost", photo3d: { map: "/zz-3d/missing.png", move: "auto" } },
  ]);

  // Turning by itself: drawn over the picture, its near disc lifted (the edge round it marked), never still.
  const auto = frameOf(page, "auto");
  await centre(auto);
  await expect(auto).toHaveAttribute("data-pt-3d-state", "on", { timeout: 60_000 });
  await expect(auto.locator("canvas.pt-3d[data-on]")).toHaveCount(1);
  await expect(auto.locator("img")).toBeVisible();
  const a = (await probe(auto))!;
  expect(a.triangles).toBeGreaterThan(1000);
  expect(a.cut).toBeGreaterThan(0);
  await page.waitForTimeout(700);
  const b = (await probe(auto))!;
  expect(Math.abs(b.yaw - a.yaw) + Math.abs(b.pitch - a.pitch)).toBeGreaterThan(0.005);
  expect(b.frames).toBeGreaterThan(a.frames);

  // With the pointer: it turns towards it, and back when it leaves.
  const hand = frameOf(page, "hand");
  await centre(hand);
  await expect(hand).toHaveAttribute("data-pt-3d-state", "on", { timeout: 30_000 });
  const box = (await hand.boundingBox())!;
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(box.x + box.width * 0.92 + (i % 2), box.y + box.height * 0.5);
    await page.waitForTimeout(60);
  }
  await expect.poll(async () => (await probe(hand))!.yaw, { timeout: 5_000 }).toBeGreaterThan(0.15);
  await page.mouse.move(box.x + box.width * 0.5, box.y - 150);
  await expect.poll(async () => Math.abs((await probe(hand))!.yaw), { timeout: 5_000 }).toBeLessThan(0.02);

  // As dots.
  const dots = frameOf(page, "dots");
  await centre(dots);
  await expect(dots).toHaveAttribute("data-pt-3d-state", "on", { timeout: 30_000 });
  expect((await probe(dots))!.look).toBe("points");

  // A depth picture that can't be had: the picture stays as it is.
  const lost = frameOf(page, "lost");
  await centre(lost);
  await expect(lost).toHaveAttribute("data-pt-3d-state", "plain", { timeout: 30_000 });
  await expect(lost.locator("canvas.pt-3d")).toHaveCount(0);
  await expect(lost.locator("img")).toBeVisible();
});

test("less motion: the flat picture, no canvas", async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const still = await browser.newContext({ reducedMotion: "reduce", baseURL });
  const page = await still.newPage();
  await page.goto("/en");
  const files = await pictures(page);
  await show(page, files, [{ id: "auto", photo3d: { map: "/zz-3d/depth.png", move: "auto" } }]);
  const auto = frameOf(page, "auto");
  await centre(auto);
  await expect(auto.locator("img")).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(auto.locator("canvas.pt-3d")).toHaveCount(0);
  await still.close();
});
