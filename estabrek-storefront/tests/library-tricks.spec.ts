import { expect, test } from "@playwright/test";

// The theme library's text and pointer tricks as the page tree's own (docs/themes-library-plan.ar.md, 3.3): a split-flap
// board, letters that answer the pointer, words of particles, a picture's flashlight, a section's trail of pictures, a
// marquee that follows the scroll's speed, and two more live backgrounds (a force field, gooey blobs).
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
const A = "/editorial/hero-film-still.webp", B = "/editorial/hijab-campaign.webp";

const NODES = [
  { id: "s1", type: "section", props: { contained: true, trail: { images: [A, B], size: 120 } }, style: { base: { minHeight: "520px" } }, children: [
    { id: "flap", type: "heading", props: { text: { en: "DEPARTURES 09:40" }, level: 2 }, motion: { enter: { kind: "flap", duration: 0.6 } } },
    { id: "near", type: "heading", props: { text: { en: "MOTION MATTERS" }, level: 2 }, motion: { fx: { kind: "proximity", color: "#16a34a" } } },
  ] },
  { id: "s2", type: "section", props: { contained: true }, style: { base: { minHeight: "420px" } }, children: [
    { id: "dots", type: "heading", props: { text: { en: "PARTICLES" }, level: 1 }, style: { base: { fontSize: "96px" } }, motion: { fx: { kind: "particles", color: "#2563eb" } } },
    { id: "pic", type: "image", props: { src: A, alt: { en: "A still" }, flash: { src: B, radius: 150 } }, style: { base: { width: "480px", height: "300px" } } },
  ] },
  { id: "s3", type: "section", props: { contained: true }, children: [
    { id: "run", type: "marquee", props: { items: [{ en: "FAST" }, { en: "CALM" }, { en: "BOLD" }], velocity: true, speed: 20 } },
  ] },
  { id: "s4", type: "section", props: { shader: { kind: "field" } }, style: { base: { minHeight: "360px" } }, children: [] },
  { id: "s5", type: "section", props: { shader: { kind: "goo" } }, style: { base: { minHeight: "360px" } }, children: [] },
];

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
});

test("the library's text and pointer tricks on a page of the shop", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.request.post(`${API}/__test/library-page`, { data: { nodes: NODES } });
  await page.request.post(`${SITE}/api/revalidate`, { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.context().addCookies([{ name: "shop-lang", value: "en", url: SITE }]);
  await page.goto("/library-demo");
  const node = (id: string) => page.locator(`[data-tree-node="${id}"]`);

  // The split-flap board ends on its own words.
  await expect(node("flap")).toBeVisible({ timeout: 90_000 });
  await expect.poll(() => node("flap").evaluate((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim()), { timeout: 20_000 }).toBe("DEPARTURES 09:40");

  // Letters near the pointer grow and take the colour; far ones stay as they are.
  const near = node("near");
  const nb = (await near.boundingBox())!;
  await page.mouse.move(nb.x + 10, nb.y + nb.height / 2);
  await expect.poll(() => near.evaluate((el) => Array.from(el.querySelectorAll<HTMLElement>(".pt-split-piece")).some((p) => p.style.transform.includes("scaleY")))).toBe(true);
  expect(await near.evaluate((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").includes("MOTION"))).toBe(true);
  await page.mouse.move(5, 5);

  // A section's trail: pictures along the pointer's way.
  const s1 = (await node("s1").boundingBox())!;
  for (let i = 0; i < 10; i++) await page.mouse.move(s1.x + 60 + i * 90, s1.y + s1.height - 60);
  await expect.poll(() => node("s1").locator(".pt-trail-tile").count()).toBeGreaterThan(2);

  // Words of particles where its letters are; its own words stay in the page, unseen.
  await node("s2").scrollIntoViewIfNeeded();
  const dots = node("dots");
  await expect(dots.locator("canvas.pt-fx-dots")).toHaveCount(1);
  await expect.poll(() => dots.locator("canvas.pt-fx-dots").evaluate((c) => Number((c as HTMLCanvasElement).dataset.dots ?? 0)), { timeout: 20_000 }).toBeGreaterThan(40);
  await expect(dots).toHaveClass(/pt-fx-dots-on/);
  expect(await dots.textContent()).toContain("PARTICLES");

  // The flashlight follows the pointer over the picture.
  const pic = node("pic");
  const flash = page.locator("[data-pt-flash]");
  await expect(flash).toHaveCount(1);
  const pb = (await pic.boundingBox())!;
  await page.mouse.move(pb.x + 60, pb.y + 60);
  await page.mouse.move(pb.x + 80, pb.y + 70);
  await expect.poll(() => flash.evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue("--pt-fl-x")))).toBeLessThan(140);

  // The marquee runs faster as the page scrolls.
  const run = node("run");
  await run.scrollIntoViewIfNeeded();
  await expect(run).toHaveAttribute("data-pt-mq-speed", "on");
  const rate = await page.evaluate(async () => {
    const track = document.querySelector<HTMLElement>('[data-tree-node="run"] .pt-mq-track')!;
    let most = 1;
    for (let i = 0; i < 20; i++) {
      window.scrollBy(0, 60);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      for (const a of track.getAnimations()) most = Math.max(most, Math.abs(a.playbackRate));
    }
    return most;
  });
  expect(rate).toBeGreaterThan(1.2);

  // Two more live backgrounds.
  for (const kind of ["field", "goo"]) {
    const bg = page.locator(`[data-pt-shader="${kind}"]`);
    await bg.scrollIntoViewIfNeeded();
    await expect(bg).toHaveAttribute("data-shader-state", "running");
  }
  expect(errors).toEqual([]);
});

test("for less motion: the flap ends on its words at once, no trail, no particles", async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.request.post(`${API}/__test/library-page`, { data: { nodes: NODES } });
  await page.goto(`${SITE}/en/library-demo`);
  await expect(page.locator('[data-tree-node="flap"]')).toHaveText(/DEPARTURES 09:40/, { timeout: 90_000 });
  const s1 = (await page.locator('[data-tree-node="s1"]').boundingBox())!;
  for (let i = 0; i < 6; i++) await page.mouse.move(s1.x + 60 + i * 90, s1.y + 80);
  await page.waitForTimeout(400);
  await expect(page.locator(".pt-trail-tile")).toHaveCount(0);
  await expect(page.locator("canvas.pt-fx-dots")).toHaveCount(0);
  await ctx.close();
});
