import { expect, test, type Page } from "@playwright/test";

// The theme library's 3D pieces as the page tree's own (docs/themes-library-plan.ar.md, 3.5): a box's things on a ring,
// up a helix, on a cube, as a book's pages and a phone's screens (pageTree/Space3D.tsx), and three more live backgrounds
// (a raymarched diamond, a dotted world with flights, a solar system).
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";

const card = (id: string, word: string, bg: string) => ({ id, type: "stack", props: {}, style: { base: { width: "180px", height: "220px", bg, radius: 16, pad: [16, 16, 16, 16] } }, children: [{ id: `${id}-t`, type: "heading", props: { text: { en: word }, level: 3 } }] });
const many = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => card(`${prefix}${i}`, `${prefix.toUpperCase()}${i}`, ["#4f46e5", "#db2777", "#0891b2", "#ca8a04", "#16a34a", "#9333ea"][i % 6]));
const holder = (id: string, space: unknown, kids: unknown[]) => ({ id: `${id}-s`, type: "section", props: { contained: true }, children: [{ id, type: "stack", props: { space }, style: { base: { width: "100%" } }, children: kids }] });
const NODES = [
  holder("ring", { kind: "ring" }, many("r", 6)),
  holder("helix", { kind: "helix", speed: 2 }, many("h", 8)),
  holder("cube", { kind: "cube", tilt: -20 }, many("c", 6)),
  holder("book", { kind: "book" }, many("b", 4)),
  holder("phone", { kind: "phone" }, many("p", 3)),
  { id: "gem-s", type: "section", props: { shader: { kind: "gem" } }, style: { base: { minHeight: "360px" } }, children: [] },
  { id: "earth-s", type: "section", props: { shader: { kind: "earth" } }, style: { base: { minHeight: "360px" } }, children: [] },
  { id: "solar-s", type: "section", props: { shader: { kind: "solar" } }, style: { base: { minHeight: "360px" } }, children: [] },
];

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
  await request.post(`${SITE}/api/revalidate`, { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
});

const open = async (page: Page) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.request.post(`${API}/__test/library-page`, { data: { nodes: NODES } });
  await page.request.post(`${SITE}/api/revalidate`, { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.context().addCookies([{ name: "shop-lang", value: "en", url: SITE }]);
  await page.goto("/library-demo");
};
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
const turnOf = (page: Page, id: string) => node(page, id).evaluate((el) => el.style.transform);

test("the library's 3D pieces on a page of the shop", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page);

  // The ring: its cards around it, turning by themselves; a drag turns it further, and it snaps to a card.
  const ring = node(page, "ring");
  await expect(ring).toHaveAttribute("data-pt-space", "ring", { timeout: 90_000 });
  await ring.scrollIntoViewIfNeeded();
  expect(await turnOf(page, "r0")).toMatch(/rotateY\(.+translateZ\(/);
  const first = await turnOf(page, "r0");
  await expect.poll(() => turnOf(page, "r0")).not.toBe(first);
  // Its card in front is whole; the one behind is faint.
  const front = await page.evaluate(() => Math.max(...[0, 1, 2, 3, 4, 5].map((i) => Number(document.querySelector<HTMLElement>(`[data-tree-node="r${i}"]`)!.style.opacity))));
  const back = await page.evaluate(() => Math.min(...[0, 1, 2, 3, 4, 5].map((i) => Number(document.querySelector<HTMLElement>(`[data-tree-node="r${i}"]`)!.style.opacity))));
  expect(front).toBeGreaterThan(0.9);
  expect(back).toBeLessThan(0.5);
  const rb = (await ring.boundingBox())!;
  const angleOf = async () => Number(/rotateY\((-?[\d.]+)deg\)/.exec(await turnOf(page, "r0"))?.[1]);
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
  const before = await angleOf();
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(rb.x + rb.width / 2 + i * 20, rb.y + rb.height / 2);
  await page.mouse.up();
  expect(Math.abs((await angleOf()) - before)).toBeGreaterThan(40);
  await expect.poll(async () => { const a = ((await angleOf()) % 60 + 60) % 60; return Math.min(a, 60 - a); }, { timeout: 5000 }).toBeLessThan(0.5);
  await page.mouse.move(5, 5);

  // The helix climbs: its first and last are far apart up and down.
  const helix = node(page, "helix");
  await helix.scrollIntoViewIfNeeded();
  await expect(helix).toHaveAttribute("data-pt-space", "helix");
  const ys = await page.evaluate(() => ["h0", "h7"].map((id) => /translateY\((-?[\d.]+)px\)/.exec(document.querySelector<HTMLElement>(`[data-tree-node="${id}"]`)!.style.transform)?.[1]).map(Number));
  expect(ys[1] - ys[0]).toBeGreaterThan(200);

  // The cube: six faces, turning.
  const cube = node(page, "cube");
  await cube.scrollIntoViewIfNeeded();
  await expect(cube).toHaveAttribute("data-pt-space", "cube");
  expect(await turnOf(page, "c4")).toContain("rotateX(90deg)");
  const c0 = await turnOf(page, "c0");
  await expect.poll(() => turnOf(page, "c0")).not.toBe(c0);

  // The book: a click on its first page turns the leaf over, its back now showing; the arrow keys turn it back.
  const book = node(page, "book");
  await book.scrollIntoViewIfNeeded();
  await expect(book).toHaveAttribute("data-pt-space-page", "0");
  await node(page, "b0").click();
  await expect(book).toHaveAttribute("data-pt-space-page", "1");
  await expect.poll(() => turnOf(page, "b0"), { timeout: 5000 }).toMatch(/rotateY\(-180(\.0+)?deg\)/);
  await book.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(book).toHaveAttribute("data-pt-space-page", "0");

  // The phone: one screen at a time, changing as the page scrolls past it, in a phone that turns.
  const phone = node(page, "phone");
  await phone.scrollIntoViewIfNeeded();
  await expect(phone).toHaveAttribute("data-pt-space", "phone");
  await expect(phone.locator(".pt-space-gear .pt-phone-front")).toHaveCount(1);
  const shown = () => phone.getAttribute("data-pt-space-screen");
  const at = async (k: number) => {
    await page.evaluate((k) => {
      const el = document.querySelector<HTMLElement>('[data-tree-node="phone"]')!;
      const r = el.getBoundingClientRect();
      // p = (innerHeight - top) / (innerHeight + height)
      const top = innerHeight - k * (innerHeight + r.height);
      window.scrollBy(0, r.top - top);
    }, k);
  };
  await at(0.25);
  await expect.poll(shown).toBe("0");
  await at(0.75);
  await expect.poll(shown).toBe("2");
  expect(await page.evaluate(() => [0, 1, 2].map((i) => document.querySelector<HTMLElement>(`[data-tree-node="p${i}"]`)!.style.visibility))).toEqual(["hidden", "hidden", ""]);

  // Three more live backgrounds.
  for (const kind of ["gem", "earth", "solar"]) {
    const bg = page.locator(`[data-pt-shader="${kind}"]`);
    await bg.scrollIntoViewIfNeeded();
    await expect(bg).toHaveAttribute("data-shader-state", "running");
  }
  expect(errors).toEqual([]);
});

test("for less motion: what the boxes hold stays flat, where it was", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await expect(node(page, "r0")).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(500);
  for (const id of ["ring", "helix", "cube", "book", "phone"]) await expect(node(page, id)).not.toHaveAttribute("data-pt-space", /.+/);
  expect(await turnOf(page, "r0")).toBe("");
  await expect(node(page, "p2")).toBeVisible();
});
