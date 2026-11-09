import { expect, test, type Page } from "@playwright/test";
import { coverAmount, coverMeasure, coverOf } from "../src/pageTree/pieces";
import { importDesign } from "../src/storeThemes/kits/importDesign";

// A section held on the screen while the page scrolls, then covered by the section after it
// sliding up over it from below.

test.describe("held and covered, as data", () => {
  test("settings are cleaned, and the measures follow the section, the screen and the next one", () => {
    expect(coverOf(null)).toBeNull();
    expect(coverOf({ hold: 9, under: "spin", phone: false })).toEqual({ hold: 0, under: "none", phone: false });
    expect(coverOf({ hold: 1.5, under: "shrink" })).toEqual({ hold: 1.5, under: "shrink", phone: true });
    // A full screen: sticks at the top, the next one comes all the way over it.
    expect(coverMeasure(800, 800, 1200)).toEqual({ top: 0, seen: 800, d: 800 });
    // Taller than the screen: sticks once its end is in sight.
    expect(coverMeasure(1400, 800, 1200)).toEqual({ top: -600, seen: 800, d: 800 });
    // A short next one comes over as far as it's tall.
    expect(coverMeasure(800, 800, 300)).toEqual({ top: 0, seen: 800, d: 300 });
    expect(coverAmount(800, 800, 800)).toBe(0);
    expect(coverAmount(400, 800, 800)).toBe(0.5);
    expect(coverAmount(-50, 800, 800)).toBe(1);
  });
});

const section = (id: string, bg: string, minHeight: string, props: Record<string, unknown> = {}) => ({
  id, type: "section", props: { contained: true, ...props }, style: { base: { bg, minHeight } },
  children: [{ id: `${id}-h`, type: "heading", props: { level: 2, text: { en: `Section ${id}` } } }],
});
const pageOf = (children: unknown[]) => ({
  id: "cover-fixture", slug: "/publication-fixture-en", name: "Held and covered", status: "PUBLISHED", format: 2, sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children } },
});
const publish = async (page: Page, children: unknown[]) => {
  const res = await page.request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: pageOf(children) } });
  expect(res.ok()).toBeTruthy();
};
/** Where it is on the screen, leaving out what it does under (a shrink scales it). */
const box = (page: Page, id: string) => page.evaluate((x) => {
  const el = document.querySelector<HTMLElement>(`[data-tree-node="${x}"]`)!;
  const was = el.style.scale;
  el.style.scale = "none";
  const r = el.getBoundingClientRect();
  el.style.scale = was;
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
}, id);
/** Scrolls to `y` px past where the held section first reaches the screen's top, and lets a frame pass. */
const scrollPast = async (page: Page, docTop: number, y: number) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), docTop + y);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
};
const covered = (page: Page) => page.evaluate(() => Number(getComputedStyle(document.querySelector('[data-tree-node="held"]')!).getPropertyValue("--pt-cv-p")));
const topAt = (page: Page, x: number, y: number) => page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.closest("[data-tree-node]")?.closest("section")?.getAttribute("data-tree-node") ?? null, [x, y] as const);

test.describe("a held section on a page", () => {
  test.afterEach(async ({ request }) => {
    await request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("it stays for its hold, the next one covers it from the bottom up, and the page goes on", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await publish(page, [
      section("intro", "#f4efe8", "60vh"),
      section("held", "#2b2140", "100vh", { cover: { hold: 1, under: "dim", phone: true } }),
      section("next", "#e9f3ee", "110vh"),
      section("later", "#ffffff", "80vh"),
    ]);
    await page.goto("/en/publication-fixture-en");
    const held = page.locator('[data-tree-node="held"]');
    await expect(held).toHaveAttribute("data-pt-cover", /"hold":1/);
    // Measured: the next one comes a whole screen over it, and is pulled up by as much.
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('[data-tree-node="next"]')!.parentElement!).marginTop)).toBe("-800px");
    const start = await page.evaluate(() => window.scrollY + document.querySelector('[data-tree-node="held"]')!.getBoundingClientRect().top);

    // Held: half way through its screen of holding, it hasn't moved and the next one isn't in sight.
    await scrollPast(page, start, 400);
    expect((await box(page, "held")).top).toBe(0);
    expect((await box(page, "next")).top).toBeGreaterThanOrEqual(800);
    expect(await covered(page)).toBe(0);

    // Covered half way: still held, the next one over its lower half, and it darkens.
    await scrollPast(page, start, 800 + 400);
    expect((await box(page, "held")).top).toBe(0);
    expect((await box(page, "next")).top).toBe(400);
    await expect.poll(() => covered(page)).toBeCloseTo(0.5, 1);
    expect(await topAt(page, 640, 200)).toBe("held");
    expect(await topAt(page, 640, 600)).toBe("next");
    const shade = await held.locator(".pt-cover-shade").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(shade).toBeGreaterThan(0.25);
    expect(shade).toBeLessThan(0.4);

    // Covered: it lets go just then, under the next one, and the page scrolls on.
    await scrollPast(page, start, 1600 + 120);
    expect((await box(page, "next")).top).toBe(-120);
    expect((await box(page, "held")).top).toBe(-120);
    expect(await topAt(page, 640, 300)).toBe("next");
    // What comes after is right under the next one, a screen further down than without it (the hold).
    const later = await box(page, "later");
    const nextBox = await box(page, "next");
    expect(later.top - nextBox.bottom).toBeLessThanOrEqual(24);
    expect(later.top - nextBox.bottom).toBeGreaterThanOrEqual(0);
    const laterOnPage = later.top + start + 1600 + 120;
    expect(laterOnPage - start - (800 + 800 + 880)).toBeGreaterThanOrEqual(0);
    expect(laterOnPage - start - (800 + 800 + 880)).toBeLessThanOrEqual(24);
  });

  test("a taller one is seen to its end first; a short next one comes over only as far as it's tall", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await publish(page, [
      section("held", "#2b2140", "1400px", { cover: { hold: 0, under: "shrink" } }),
      section("next", "#e9f3ee", "300px"),
      section("later", "#ffffff", "100vh"),
    ]);
    await page.goto("/en/publication-fixture-en");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('[data-tree-node="held"]')!).getPropertyValue("--pt-cv-top").trim())).toBe("-600px");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('[data-tree-node="next"]')!.parentElement!).marginTop)).toBe("-300px");
    const start = await page.evaluate(() => window.scrollY + document.querySelector('[data-tree-node="held"]')!.getBoundingClientRect().top);
    // Scrolled to its end: held there, its end at the screen's end.
    await scrollPast(page, start, 600 + 150);
    expect((await box(page, "held")).bottom).toBe(800);
    expect((await box(page, "next")).top).toBe(650);
    await expect.poll(() => covered(page)).toBeCloseTo(0.5, 1);
    await expect(page.locator('[data-tree-node="held"]')).toHaveAttribute("data-pt-covering", "");
    // It shrinks back as it's covered, its corners rounding.
    const look = await page.locator('[data-tree-node="held"]').evaluate((el) => ({ scale: Number(getComputedStyle(el).scale), clip: getComputedStyle(el).clipPath }));
    expect(look.scale).toBeGreaterThan(0.9);
    expect(look.scale).toBeLessThan(0.97);
    expect(look.clip).toMatch(/round/);
    // Once the short one is all in, they go on together: what comes after never goes under it.
    await scrollPast(page, start, 600 + 300 + 200);
    const held = await box(page, "held");
    const next = await box(page, "next");
    expect(held.bottom).toBe(next.bottom);
    expect((await box(page, "later")).top - next.bottom).toBeGreaterThanOrEqual(0);
    expect(await topAt(page, 640, next.bottom + 40)).toBe("later");
  });

  test("on a phone it stays put when it says so", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await publish(page, [
      section("held", "#2b2140", "100vh", { cover: { hold: 2, under: "fade", phone: false } }),
      section("next", "#e9f3ee", "100vh"),
    ]);
    await page.goto("/en/publication-fixture-en");
    const held = page.locator('[data-tree-node="held"]');
    await expect(held).toHaveAttribute("data-pt-cover", /"phone":false/);
    expect(await held.evaluate((el) => getComputedStyle(el).position)).toBe("relative");
    expect(await page.locator(".pt-cover-room").evaluate((el) => getComputedStyle(el).display)).toBe("none");
    // The next one follows it as on any page.
    const [h, n] = [await box(page, "held"), await box(page, "next")];
    expect(n.top - h.bottom).toBeGreaterThanOrEqual(0);
    expect(n.top - h.bottom).toBeLessThanOrEqual(24);
  });
});

test("in a store with its own design (the layout's runtime), held and covered too", async ({ page, request }) => {
  const own = importDesign("fashion-quiet")!;
  const prefix = (tree: any, region: string) => {
    let i = 0;
    const walk = (n: any): any => ({ ...n, id: `${region}_${i++}`, ...(n.children ? { children: n.children.map(walk) } : {}) });
    return { ...tree, root: walk(tree.root) };
  };
  const children = [section("held", "#2b2140", "100vh", { cover: { hold: 0, under: "fade" } }), section("next", "#e9f3ee", "100vh"), section("later", "#ffffff", "60vh")];
  const data = { name: "Paper Shop", theme: own.design.theme, regions: { header: prefix(own.design.header, "header"), footer: prefix(own.design.footer, "footer") }, page: { id: "owned-home", name: "My page", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: { version: 1, root: { id: "page", type: "page", props: {}, children } } } };
  try {
    await request.post("http://127.0.0.1:4100/__test/owned-design", { data });
    await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/"] } });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en");
    await expect(page.locator(".rose-home, .cinematic-shell")).toHaveCount(0);
    // The window scrolls (not the body), so what sticks sticks.
    await expect(page.locator("html")).toHaveAttribute("data-store-design", "cms");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('[data-tree-node="next"]')!.parentElement!).marginTop)).toBe("-800px");
    const start = await page.evaluate(() => window.scrollY + document.querySelector('[data-tree-node="held"]')!.getBoundingClientRect().top);
    await scrollPast(page, start, 400);
    expect((await box(page, "held")).top).toBe(0);
    expect((await box(page, "next")).top).toBe(400);
    await expect.poll(() => covered(page)).toBeCloseTo(0.5, 1);
  } finally {
    await request.post("http://127.0.0.1:4100/__test/owned-design", { data: {} });
    await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/"] } });
  }
});
