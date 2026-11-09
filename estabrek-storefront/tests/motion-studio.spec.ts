import { expect, test, type Page } from "@playwright/test";
import { cueAmount, cueLook, keySteps, keysSpecOf } from "../src/pageTree/keyframes";
import { layersOf, scrollSceneOf, triggersOf } from "../src/pageTree/pieces";
import { treeCss } from "../src/pageTree/css";
import type { PageTree } from "../src/pageTree/tree";

// The motion studio: scroll scenes (a clip or picture with things at their moments), keyframes for an
// element and its pieces (before/after layers, its inside), triggers, and overflow.

test.describe("keyframes, cues and triggers as data", () => {
  test("a moment that leaves a value out glides between its neighbours, and x follows the reading direction", () => {
    const frames = keysSpecOf({ on: "hover", parts: { self: [{ at: 0, x: 0 }, { at: 50, scale: 2 }, { at: 100, x: 100 }] } })!.parts.self!;
    const ltr = keySteps(frames, { self: true, rtl: false, resolve: (c) => c });
    expect(ltr.map((s) => s.vars["--pt-kx"])).toEqual(["0px", "50px", "100px"]);
    // scale is only at 50 %: at rest (1) at both ends, like CSS.
    expect(ltr.map((s) => s.vars["--pt-ks"])).toEqual(["1", "2", "1"]);
    const rtl = keySteps(frames, { self: true, rtl: true, resolve: (c) => c });
    expect(rtl[2].vars["--pt-kx"]).toBe("-100px");
    // A piece moves by GSAP's own transform, its stretch joined with its size.
    const piece = keySteps([{ at: 0, scale: 2, sx: 0.5 }, { at: 100, sx: 1, clip: [0, 10, 0, 0], color: "accent" }], { self: false, rtl: false, resolve: () => "#c86b98" });
    expect(piece[0].vars).toMatchObject({ scaleX: 1, scaleY: 2 });
    expect(piece[1].vars).toMatchObject({ clipPath: "inset(0% 10% 0% 0%)", color: "#c86b98" });
    expect(keysSpecOf({ on: "hover", parts: { self: [{ at: 0 }] } })).toBeUndefined();
  });

  test("a scene's things come, stay and go at their moments", () => {
    const cue = { from: 20, to: 60, in: "up" as const, out: "fade" as const, soft: 25 };
    expect(cueAmount(cue, 0.1).v).toBe(0);
    expect(cueAmount(cue, 0.25).phase).toBe("in");
    expect(cueAmount(cue, 0.4)).toEqual({ v: 1, phase: "on" });
    expect(cueAmount(cue, 0.58).phase).toBe("out");
    expect(cueAmount(cue, 0.7).v).toBe(0);
    // What starts with the scene is there at once; "stay" never leaves.
    expect(cueAmount({ from: 0, to: 30, in: "up" }, 0).v).toBe(1);
    expect(cueAmount({ from: 70, to: 90, out: "stay" }, 1).v).toBe(1);
    expect(cueLook("up", 0, false)["--pt-ey"]).toBe("70px");
    expect(cueLook("start", 0, true)["--pt-ex"]).toBe("90px");
  });

  test("scene settings, layers and triggers are cleaned for the page", () => {
    const s = scrollSceneOf({ media: { kind: "video", src: "javascript:x" }, length: 99, chapters: 7 });
    expect(s.media.kind).toBe("none");
    expect(s.length).toBe(4);
    expect(s.chapters).toBe(7);
    expect(layersOf({ before: { bg: "url(x)", at: "bottom", h: 2 } })).toEqual({ before: { at: "bottom", h: 2 } });
    const t = triggersOf([{ on: "click", do: [{ act: "link", href: "/shop" }, { act: "toast", text: { ar: "أهلا", en: "Hi" } }, { act: "explode" }, { act: "link", href: "javascript:alert(1)" }] }], (h) => (h === "/shop" ? "/en/shop" : null), (w) => (w as Record<string, string>).en);
    expect(t).toEqual([{ on: "click", once: false, do: [{ act: "link", href: "/en/shop", newTab: false }, { act: "toast", text: "Hi" }] }]);
  });

  test("the CSS draws overflow, the layers' looks and where keyframes turn from", () => {
    const tree: PageTree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: {}, children: [
      { id: "btn", type: "button", props: { label: { en: "Go" }, href: "/shop", layers: { before: { bg: "accent", at: "bottom", h: 2 } } }, style: { base: { overflow: "clip", overflowX: "auto" } }, motion: { keys: { on: "hover", origin: "start", parts: { before: [{ at: 0, sx: 0 }, { at: 100, sx: 1 }] } } } },
    ] }] } };
    const css = treeCss(tree);
    expect(css).toContain("overflow:clip");
    expect(css).toContain("overflow-x:auto");
    expect(css).toMatch(/\.pt-btn>\.pt-pc-before[^{]*\{background:var\(--accent\);inset-block:auto 0px;inset-inline:0px 0px;height:2px/);
    expect(css).toContain(".pt-btn{transform-origin:calc(50% - 50% * var(--pt-flip,1)) 50%}");
    expect(css).toContain(".pt-ss-stage{position:sticky");
  });
});

const SCENE_PAGE = {
  id: "motion-studio-fixture",
  slug: "/publication-fixture-en",
  name: "Motion studio",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {}, children: [
        { id: "intro", type: "section", props: { contained: true }, children: [{ id: "intro-h", type: "heading", props: { level: 1, text: { en: "Before the scene" } }, style: { base: { minHeight: "60vh" } } }] },
        { id: "scene-sec", type: "section", props: { contained: false }, style: { base: { pad: [0, 0, 0, 0] } }, children: [
          { id: "scene", type: "scrollScene", props: { media: { kind: "video", src: "/editorial/hero-film-120.mp4" }, mode: "pin", length: 3, chapters: 10, smooth: 0, fps: 120, blur: { from: 40, to: 60, amount: 10 }, dim: { from: 0, to: 100, opacity: 0.4 }, zoom: { from: 0, to: 100, scale: 1.3 }, progress: "dots" }, children: [
            { id: "first", type: "heading", props: { level: 2, text: { en: "First words" } }, motion: { cue: { from: 0, to: 30, in: "up", out: "fade" } } },
            { id: "middle", type: "text", props: { text: { en: "Middle words" } }, motion: { cue: { from: 40, to: 70, in: "blur", out: "up" } } },
            { id: "go", type: "button", props: { label: { en: "Shop now" }, href: "#", layers: { before: { bg: "#111111" } },
              triggers: [{ on: "click", do: [{ act: "toast", text: { en: "Hello from a trigger" } }, { act: "visible", target: "after-h", value: "hide" }] }] },
              style: { base: { overflow: "hidden" } },
              motion: { cue: { from: 75, to: 100, in: "zoom", out: "stay" }, keys: { on: "hover", duration: 0.2, parts: { before: [{ at: 0, xp: -101 }, { at: 100, xp: 0 }] } } } },
          ] },
        ] },
        { id: "after", type: "section", props: { contained: true }, children: [{ id: "after-h", type: "heading", props: { level: 2, text: { en: "After the scene" } }, style: { base: { minHeight: "80vh" } } }] },
      ],
    },
  },
};

const publish = async (page: Page) => {
  const res = await page.request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: SCENE_PAGE } });
  expect(res.ok()).toBeTruthy();
};
/** Scrolls so the scene is at `p` (0–1) of its run, and waits for the loop to write it. */
const sceneAt = async (page: Page, p: number) => {
  await page.evaluate((at) => {
    const el = document.querySelector('[data-tree-node="scene"]')!;
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + at * (r.height - innerHeight), behavior: "instant" as ScrollBehavior });
  }, p);
  await expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.querySelector('[data-tree-node="scene"]')!).getPropertyValue("--pt-ss-p")))).toBeCloseTo(p, 1);
};
const shown = (page: Page, id: string) => page.evaluate((x) => {
  const el = document.querySelector(`[data-tree-node="${x}"]`) as HTMLElement;
  return getComputedStyle(el).visibility === "visible" && Number(getComputedStyle(el).opacity) > 0.5;
}, id);

test.describe("a scroll scene on a page", () => {
  test.afterEach(async ({ request }) => {
    await request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("its clip and things follow the scroll, its pieces move and its triggers run", async ({ page }) => {
    await publish(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en/publication-fixture-en");
    const scene = page.locator('[data-tree-node="scene"]');
    await expect(scene).toHaveAttribute("data-pt-scroll-scene", /"mode":"pin"/);
    // Pinned for its length: three screens.
    expect(Math.round((await scene.boundingBox())!.height / 800)).toBe(3);
    await expect(scene.locator(".pt-ss-progress-dots > i")).toHaveCount(10);

    await sceneAt(page, 0.05);
    expect(await shown(page, "first")).toBe(true);
    expect(await shown(page, "middle")).toBe(false);
    expect(await shown(page, "go")).toBe(false);

    await sceneAt(page, 0.55);
    expect(await shown(page, "first")).toBe(false);
    expect(await shown(page, "middle")).toBe(true);
    // The picture blurs from 40 % to 60 %, darkens and zooms all along.
    const vars = await scene.evaluate((el) => ["--pt-ss-blur", "--pt-ss-dim", "--pt-ss-zoom"].map((k) => getComputedStyle(el).getPropertyValue(k).trim()));
    expect(parseFloat(vars[0])).toBeGreaterThan(5);
    expect(Number(vars[1])).toBeGreaterThan(0.15);
    expect(Number(vars[2])).toBeGreaterThan(1.1);
    await expect(scene).toHaveAttribute("data-chapter", "6");
    // The clip is moved to its moment (scrubbed, not played).
    await expect.poll(() => scene.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15000 }).toBeGreaterThan(0.5);
    expect(await scene.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);

    await sceneAt(page, 0.95);
    expect(await shown(page, "go")).toBe(true);
    // Its layer behind fills it from the start on hover (keyframes on the "before" piece).
    const fill = page.locator('[data-tree-node="go"] > .pt-pc-before');
    await expect(fill).toHaveCount(1);
    const before = await fill.evaluate((el) => getComputedStyle(el).transform);
    await page.locator('[data-tree-node="go"]').hover();
    await expect.poll(() => fill.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
    // A click runs its trigger: a message, then the heading after the scene is hidden.
    await page.locator('[data-tree-node="go"]').click();
    await expect(page.locator("#pt-toast")).toHaveText("Hello from a trigger");
    await expect(page.locator('[data-tree-node="after-h"]')).toBeHidden();
  });

  test("for whoever asked for less motion everything is still and shown", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await publish(page);
    await page.goto("http://127.0.0.1:3000/en/publication-fixture-en");
    const scene = page.locator('[data-tree-node="scene"]');
    await expect(scene).toHaveClass(/pt-ss-still/);
    for (const id of ["first", "middle", "go"]) await expect(page.locator(`[data-tree-node="${id}"]`)).toBeVisible();
    await ctx.close();
  });
});
