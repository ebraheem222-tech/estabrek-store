import { expect, test, type Page } from "@playwright/test";
import { orbitHeight, orbitSpot } from "../src/pageTree/orbit";
import { coverOf, cursorOf, paintAt, scrollSceneOf } from "../src/pageTree/pieces";
import { motionOf } from "../src/pageTree/tree";

// Scroll tricks: things around a circle, an arc or a wave; numbers counting and lines drawing with the
// scroll; the next section's arched edge; a picture through a growing window; a section colouring the
// page; the page's cursor with an element's word.

test.describe("scroll tricks as data", () => {
  test("a ring, an arc and a wave place their things, and the scroll moves them", () => {
    const ring = [0, 1, 2, 3].map((i) => orbitSpot("circle", i, 4, 0, 1, 1000, 80));
    // The first one is in front: the biggest and on top; across the ring is the one behind.
    expect(ring[0].scale).toBeCloseTo(1, 5);
    expect(ring[0].z).toBe(100);
    expect(ring[2].scale).toBeCloseTo(0.62, 5);
    expect(new Set(ring.map((s) => `${Math.round(s.x)}:${Math.round(s.y)}`)).size).toBe(4);
    // A quarter of a turn later the first one has moved to the side.
    const later = orbitSpot("circle", 0, 4, 0.25, 1, 1000, 80);
    expect(Math.abs(later.x)).toBeCloseTo(400, 0);
    // Right to left, the other way round.
    expect(orbitSpot("circle", 0, 4, 0.25, 1, 1000, 80, true).x).toBeCloseTo(-later.x, 5);
    // Along an arc: at its ends unseen, over the top in full.
    const arc = (t: number) => orbitSpot("arc", 0, 1, t, 1, 1000, 100);
    expect(arc(0).opacity).toBeCloseTo(0, 5);
    expect(arc(0.5).opacity).toBe(1);
    expect(arc(0.5).y).toBeLessThan(arc(0.1).y);
    expect(orbitSpot("wave", 0, 2, 0.5, 1, 1000, 60).x).toBeGreaterThan(-600);
    expect(orbitHeight("circle", 1000, 80, 120)).toBeGreaterThan(120);
  });

  test("settings are cleaned: the orbit, the edge, the window, the cursor and the page's colour", () => {
    expect(motionOf({ id: "k", type: "stack", props: {}, motion: { scroll: { kind: "orbit", orbit: { shape: "spiral", turn: 9 } } } } as any)?.scroll?.orbit).toEqual({ shape: "arc", radius: 45, turn: 0.5 });
    expect(motionOf({ id: "k", type: "heading", props: {}, motion: { scroll: { kind: "count" } } } as any)?.scroll?.kind).toBe("count");
    expect(coverOf({ enter: "arch" })?.enter).toBe("arch");
    expect(coverOf({ enter: "zigzag" })?.enter).toBe("rise");
    expect(scrollSceneOf({ window: { shape: "circle", from: 0, to: 60 } }).window).toEqual({ shape: "circle", from: 0, to: 60 });
    expect(scrollSceneOf({ window: { shape: "star", from: 0, to: 60 } }).window).toBeUndefined();
    expect(cursorOf({ kind: "ring", color: "accent", size: 999 }, (c) => `var(--${c})`)).toEqual({ kind: "ring", color: "var(--accent)" });
    expect(cursorOf({ kind: "laser" }, () => undefined)).toBeNull();
    expect(paintAt([{ top: -100, bottom: 300, paint: "#111" }, { top: 300, bottom: 900, paint: "#222" }], 400)).toBe("#222");
    expect(paintAt([{ top: 500, bottom: 900, paint: "#222" }], 400)).toBeNull();
  });
});

const card = (id: string, bg: string) => ({ id, type: "stack", props: {}, style: { base: { width: "100px", height: "100px", radius: 999, bg } }, children: [] });
const section = (id: string, children: unknown[], props: Record<string, unknown> = {}, base: Record<string, unknown> = {}) => ({ id, type: "section", props: { contained: true, ...props }, style: { base: { minHeight: "70vh", ...base } }, children });
const PAGE = {
  id: "scroll-tricks", slug: "/publication-fixture-en", name: "Scroll tricks", status: "PUBLISHED", format: 2, sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: { cursor: { kind: "ring", size: 20 } }, children: [
    section("intro", [{ id: "intro-h", type: "heading", props: { level: 1, text: { en: "Scroll tricks" } } }]),
    section("orbits", [{ id: "ring", type: "stack", props: {}, style: { base: { width: "100%" } }, motion: { scroll: { kind: "orbit", orbit: { shape: "circle", radius: 70, turn: 1 } } }, children: [card("c1", "#c86b98"), card("c2", "#7d2448"), card("c3", "#e0a458"), card("c4", "#3d5a80")] }]),
    section("stats", [{ id: "num", type: "heading", props: { level: 2, text: { en: "1200" } }, motion: { scroll: { kind: "count" } } }]),
    section("lines", [{ id: "line", type: "svg", props: { art: { viewBox: "0 0 400 100", nodes: [{ t: "path", a: { d: "M0 50 C 100 0 300 100 400 50", fill: "none", stroke: "#1b2a78", "stroke-width": "4" } }] } }, style: { base: { width: "400px" } }, motion: { scroll: { kind: "draw" } } }]),
    section("held", [{ id: "held-h", type: "heading", props: { level: 2, text: { en: "Held" } } }], { cover: { hold: 0, enter: "arch" } }, { minHeight: "100vh", bg: "#2b2140" }),
    section("next", [{ id: "go", type: "button", props: { label: { en: "Shop now" }, href: "#", cursorText: { en: "Shop" } } }], {}, { minHeight: "100vh", bg: "#e9f3ee" }),
    section("painted", [{ id: "painted-h", type: "heading", props: { level: 2, text: { en: "Night" } }, style: { base: { color: "white" } } }], { paint: "#1b2a78" }, { minHeight: "100vh" }),
    section("scene-sec", [{ id: "scene", type: "scrollScene", props: { media: { kind: "image", src: "/editorial/hijab-campaign.webp" }, mode: "pin", length: 3, chapters: 4, smooth: 0, window: { shape: "circle", from: 0, to: 60 } }, children: [] }], { contained: false }, { pad: [0, 0, 0, 0] }),
    section("later", [{ id: "later-h", type: "heading", props: { level: 2, text: { en: "The end" } } }]),
  ] } },
};

const scrollToEl = async (page: Page, id: string, at: number) => {
  // Puts the element's top at `at` (0–1) of the screen down, from where it sits on the page.
  await page.evaluate(([x, f]) => {
    const el = document.querySelector(`[data-tree-node="${x}"]`)!;
    // A held section sits in its own box: where it starts is where its box starts.
    const from = getComputedStyle(el).position === "sticky" ? el.parentElement! : el;
    const top = window.scrollY + from.getBoundingClientRect().top;
    window.scrollTo({ top: top - innerHeight * (f as number), behavior: "instant" as ScrollBehavior });
  }, [id, at] as const);
  await page.waitForTimeout(700);
};

test.describe("scroll tricks on a page", () => {
  test.afterEach(async ({ request }) => {
    await request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("each trick follows the scroll", async ({ page }) => {
    test.setTimeout(120000);
    await page.request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: PAGE } });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en/publication-fixture-en");

    // A ring: its things placed around it, moving as the page scrolls.
    const ring = page.locator('[data-tree-node="ring"]');
    await expect(ring).toHaveAttribute("data-pt-orbit", "circle");
    expect((await ring.boundingBox())!.height).toBeGreaterThan(150);
    const spot = () => page.locator('[data-tree-node="c1"]').evaluate((el) => (el as HTMLElement).style.translate);
    await scrollToEl(page, "ring", 0.8);
    const first = await spot();
    await scrollToEl(page, "ring", 0.2);
    await expect.poll(spot).not.toBe(first);

    // A number counting with the scroll: low as it comes in, all of it higher up the screen.
    const num = page.locator('[data-tree-node="num"]');
    await scrollToEl(page, "num", 0.95);
    await expect.poll(async () => Number((await num.textContent())!.replace(/\D/g, ""))).toBeLessThan(300);
    await scrollToEl(page, "num", 0.2);
    await expect.poll(async () => (await num.textContent())!.trim()).toBe("1200");

    // A line drawing itself: more of it drawn further up the screen.
    const drawn = () => page.locator('[data-tree-node="line"] path').evaluate((p) => getComputedStyle(p).strokeDasharray);
    await scrollToEl(page, "line", 0.95);
    const early = await drawn();
    await scrollToEl(page, "line", 0.3);
    await expect.poll(drawn).not.toBe(early);

    // The next section comes over the held one with an arched edge, straight once it's all over.
    const next = page.locator('[data-tree-node="next"]').locator("xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' pt-cover-next ')][1]");
    await expect(next).toHaveAttribute("data-pt-cv-enter", "arch");
    await scrollToEl(page, "held", 0);
    await page.evaluate(() => window.scrollBy({ top: innerHeight / 2, behavior: "instant" as ScrollBehavior }));
    await page.waitForTimeout(500);
    await expect(next).toHaveAttribute("data-pt-cv-entering", "");
    expect(await next.evaluate((el) => getComputedStyle(el).clipPath)).toMatch(/inset/);

    // The cursor follows the mouse, and over the button it grows and shows its word.
    await page.mouse.move(300, 300);
    await page.mouse.move(320, 320);
    await expect(page.locator(".pt-cursor")).toHaveClass(/pt-cursor-in/);
    await page.locator('[data-tree-node="go"]').hover();
    await expect(page.locator(".pt-cursor")).toHaveClass(/pt-cursor-label/);
    await expect(page.locator(".pt-cursor span")).toHaveText("Shop");

    // The painted section in the middle of the screen gives the page its colour, and the page goes back after.
    await scrollToEl(page, "painted", 0.2);
    await expect(page.locator("html")).toHaveAttribute("data-pt-painting", "");
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(27, 42, 120)");
    await scrollToEl(page, "intro", 0);
    await expect(page.locator("html")).not.toHaveAttribute("data-pt-painting", "");

    // The picture opens through a round window as the scene goes on.
    const scene = page.locator('[data-tree-node="scene"]');
    await expect(scene).toHaveClass(/pt-ss-win-circle/);
    expect(await scene.locator(".pt-ss-frame").evaluate((el) => getComputedStyle(el).clipPath)).toMatch(/circle/);
    const win = () => scene.evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--pt-ss-win")));
    await page.evaluate(() => {
      const el = document.querySelector('[data-tree-node="scene"]')!;
      const r = el.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top + 0.45 * (r.height - innerHeight), behavior: "instant" as ScrollBehavior });
    });
    await expect.poll(win).toBeGreaterThan(0.5);
  });
});
