import { expect, test, type Page } from "@playwright/test";

// The theme library's scroll scenes as any element's scroll motion (docs/themes-library-plan.ar.md, 3.4): a deck that fans
// out, columns that drift at different speeds, a depth tunnel the page flies through, a big word the page dives into, and
// a timeline that draws itself and lights each step (pageTree/scrollTricksLib.ts).
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";

const card = (id: string, word: string) => ({ id, type: "stack", props: {}, style: { base: { width: "180px", height: "240px", bg: "surface", radius: 18, padding: 16 } }, children: [{ id: `${id}-t`, type: "text", props: { text: { en: word } } }] });
const NODES = [
  { id: "s0", type: "section", props: { contained: true }, style: { base: { minHeight: "900px" } }, children: [{ id: "top", type: "heading", props: { text: { en: "SCROLL" }, level: 1 } }] },
  { id: "s1", type: "section", props: { contained: true }, style: { base: { minHeight: "700px" } }, children: [
    { id: "deck", type: "stack", props: {}, style: { base: { direction: "row", gap: 24 } }, motion: { scroll: { kind: "fan" } }, children: ["A", "B", "C", "D"].map((w, i) => card(`c${i}`, w)) },
  ] },
  { id: "s2", type: "section", props: { contained: true }, style: { base: { minHeight: "700px" } }, children: [
    { id: "cols", type: "stack", props: {}, style: { base: { direction: "row", gap: 24 } }, motion: { scroll: { kind: "drift", speed: 1 } }, children: ["E", "F", "G"].map((w, i) => card(`d${i}`, w)) },
  ] },
  { id: "s3", type: "section", props: {}, style: { base: { minHeight: "600px" } }, children: [
    { id: "tunnel", type: "stack", props: {}, motion: { scroll: { kind: "depth", length: 300 } }, children: ["ONE", "TWO", "THREE", "FOUR"].map((w, i) => card(`t${i}`, w)) },
  ] },
  { id: "s4", type: "section", props: {}, style: { base: { minHeight: "800px" } }, children: [
    { id: "dive", type: "heading", props: { text: { en: "DIVE" }, level: 1 }, style: { base: { fontSize: "120px" } }, motion: { scroll: { kind: "through", length: 250 } } },
    { id: "after", type: "text", props: { text: { en: "Inside the word" } } },
  ] },
  { id: "s5", type: "section", props: { contained: true }, children: [
    { id: "tl", type: "stack", props: {}, style: { base: { gap: 120 } }, motion: { scroll: { kind: "timeline" } }, children: ["2019", "2021", "2024"].map((w, i) => ({ id: `y${i}`, type: "heading", props: { text: { en: w }, level: 3 } })) },
  ] },
  { id: "s6", type: "section", props: { contained: true }, style: { base: { minHeight: "1200px" } }, children: [] },
];

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
  await request.post(`${SITE}/api/revalidate`, { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
});

const open = async (page: Page, reduced: boolean) => {
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.request.post(`${API}/__test/library-page`, { data: { nodes: NODES } });
  await page.request.post(`${SITE}/api/revalidate`, { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.context().addCookies([{ name: "shop-lang", value: "en", url: SITE }]);
  await page.goto("/library-demo");
  await expect(page.locator('[data-tree-node="deck"]')).toBeVisible({ timeout: 90_000 });
};
// Scrolls the page so this element's top is this far down the screen (0 = the screen's top), in small steps.
const bring = async (page: Page, id: string, at: number) => {
  await page.evaluate(async ([id, at]) => {
    const el = document.querySelector<HTMLElement>(`[data-tree-node="${id}"]`)!;
    const goal = window.scrollY + el.getBoundingClientRect().top - innerHeight * (at as number);
    for (let i = 1; i <= 12; i++) {
      window.scrollTo(0, window.scrollY + (goal - window.scrollY) / (13 - i));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
  }, [id, at] as const);
};
const turnOf = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`).evaluate((el) => Math.abs(parseFloat(el.style.rotate || "0")));

test("the library's scroll scenes on a page of the shop", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, false);

  // The deck starts fanned out at its middle (the outer cards turned), and spreads to its places as it comes up.
  await expect.poll(() => turnOf(page, "c0"), { timeout: 20_000 }).toBeGreaterThan(10);
  await bring(page, "deck", 0.2);
  await expect.poll(() => turnOf(page, "c0"), { timeout: 10_000 }).toBeLessThan(0.5);
  await bring(page, "deck", 0.95);
  await expect.poll(() => turnOf(page, "c0"), { timeout: 10_000 }).toBeGreaterThan(5);

  // The columns drift apart: some up, some down, and they change as the page goes on.
  const drift = () => page.evaluate(() => ["d0", "d1"].map((id) => parseFloat((document.querySelector<HTMLElement>(`[data-tree-node="${id}"]`)!.style.translate || "0 0").split(" ")[1] ?? "0")));
  await bring(page, "cols", 0.8);
  await expect.poll(async () => { const [a, b] = await drift(); return Math.sign(a) !== Math.sign(b) && Math.abs(a) > 10; }, { timeout: 10_000 }).toBe(true);
  const first = (await drift())[0];
  await bring(page, "cols", 0.1);
  await expect.poll(async () => (await drift())[0], { timeout: 10_000 }).not.toBeCloseTo(first, 0);

  // The tunnel holds on the screen while its cards come out of the depth one after another.
  const tunnel = page.locator('[data-tree-node="tunnel"]');
  await expect(tunnel).toHaveAttribute("data-pt-depth", "");
  const near = () => page.evaluate(() => ["t0", "t1", "t2", "t3"].map((id) => Number(document.querySelector<HTMLElement>(`[data-tree-node="${id}"]`)!.style.opacity || "0")));
  await bring(page, "tunnel", 0);
  const atStart = await near();
  expect(atStart[0]).toBeGreaterThan(atStart[3]);
  await page.evaluate(() => window.scrollBy(0, innerHeight * 1.6));
  await expect.poll(async () => { const o = await near(); return o[2] > atStart[2] + 0.2; }, { timeout: 10_000 }).toBe(true);
  expect(Math.abs((await tunnel.boundingBox())!.y)).toBeLessThan(4);

  // The page dives into the big word: held, it grows past the screen, then what's around it comes in.
  const dive = page.locator('[data-tree-node="dive"]');
  const after = page.locator('[data-tree-node="after"]');
  await bring(page, "s4", 0);
  await expect.poll(() => after.evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
  await page.evaluate(() => window.scrollBy(0, innerHeight * 1.5));
  await expect.poll(() => dive.evaluate((el) => parseFloat(el.style.scale || "1")), { timeout: 10_000 }).toBeGreaterThan(8);
  await page.evaluate(() => window.scrollBy(0, innerHeight * 0.9));
  await expect.poll(() => after.evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 10_000 }).toBeGreaterThan(0.9);

  // The timeline draws its line, and each year lights up as the page reaches it.
  const tl = page.locator('[data-tree-node="tl"]');
  await expect(tl.locator(".pt-tl-line")).toHaveCount(1);
  await bring(page, "tl", 0.7);
  expect(await page.locator('[data-tree-node="y2"]').evaluate((el) => el.classList.contains("pt-tl-on"))).toBe(false);
  await bring(page, "tl", -0.1);
  await expect(page.locator('[data-tree-node="y1"]')).toHaveClass(/pt-tl-on/);
  await bring(page, "y2", 0.3);
  await expect(page.locator('[data-tree-node="y2"]')).toHaveClass(/pt-tl-on/);
  expect(await tl.locator(".pt-tl-line").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d)).toBeGreaterThan(0.5);

  expect(errors).toEqual([]);
});

test("for less motion: the scroll scenes leave everything in its place", async ({ page }) => {
  test.setTimeout(180_000);
  await open(page, true);
  await bring(page, "deck", 0.95);
  expect(await turnOf(page, "c0")).toBe(0);
  await expect(page.locator('[data-tree-node="tunnel"]')).not.toHaveAttribute("data-pt-depth", "");
  await expect(page.locator('[data-tree-node="after"]')).toBeVisible();
  await expect(page.locator('[data-tree-node="tl"] .pt-tl-line')).toHaveCount(0);
});
