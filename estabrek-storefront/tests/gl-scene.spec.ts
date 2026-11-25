import { expect, test, type Locator, type Page } from "@playwright/test";

// A WebGL scene the owner builds in the editor (pageTree/glScene.ts, glEngine.ts, GlSceneView.tsx; the admin's
// GlScenePanel.tsx): particles holding forms (the owner's words, a sphere…) that morph, or moving in flows, drawn by
// the graphics card; the pointer pushes them, a press bursts them; a section's background keeps its words clickable.
const API = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;
const EDITOR = `http://127.0.0.1:${process.env.ADMIN_PORT || 5178}/tests/fixtures/editor-controls.html?lang=en&editingRegression`;

type Run = { sample(): Array<{ n: number; cx: number; cy: number; inside: number; spread: number }>; near(x: number, y: number, r: number): number; stats(): { t: number; queued: number; frames: number } };
const scene = (id: string, gl: Record<string, unknown>, height = 420) => ({ id: `s-${id}`, type: "section", props: { contained: true }, children: [{ id, type: "glScene", props: { gl, height } }] });
async function show(page: Page, nodes: unknown[]) {
  await page.request.post(`${API}/__test/library-page`, { data: { nodes } });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.goto("/en/library-demo");
}
const box = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"] [data-pt-gl]`).first();
/** Brought to the middle of the window (scrolling "if needed" leaves a half-seen box where it is: a press at its middle missed). */
const centre = (el: Locator) => el.evaluate((e) => e.scrollIntoView({ block: "center" }));
/**
 * A press at a point of the scene (0…1 of its box), as the browser hands it to the scene's canvas; then the scene
 * stepped `seconds` of its own time at once (so what follows doesn't hang on how often the machine draws). Gives the
 * presses the scene was holding for its next step right after the press (1: it took it).
 */
const press = (el: Locator, seconds: number, x = 0.5, y = 0.5) => el.evaluate((e, [px, py, s]) => {
  const c = e.querySelector("canvas")!, r = c.getBoundingClientRect(), at = { bubbles: true, clientX: r.left + r.width * px, clientY: r.top + r.height * py, pointerId: 1, isPrimary: true };
  c.dispatchEvent(new PointerEvent("pointerdown", at));
  c.dispatchEvent(new PointerEvent("pointerup", at));
  const g = (e as HTMLElement & { __glRun: { stats(): { queued: number }; warm(s: number): void } }).__glRun;
  const queued = g.stats().queued;
  g.warm(s);
  return queued;
}, [x, y, seconds]);
const run = <T,>(el: Locator, fn: (r: Run) => T) => el.evaluate((e, src) => new Function("r", `return (${src})(r)`)((e as HTMLElement & { __glRun: Run }).__glRun), fn.toString()) as Promise<T>;

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
  await request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
});

test("the owner's words in stars: they gather, flee the pointer and come back, a press bursts them, and a press morphs", async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await show(page, [
    scene("word", { bg: { kind: "radial" }, layers: [{ shapes: ["text"], text: { en: "HELLO" }, count: 4000, size: 2.4, wander: 0, twinkle: 0, spin: 0 }], pointer: { mode: "repel", radius: 0.3, strength: 2 }, click: "burst" }),
    scene("burst", { bg: { kind: "color", c1: "#000000" }, layers: [{ shapes: ["ball"], count: 3000, wander: 0, spin: 0 }], pointer: { mode: "none" }, click: "burst" }),
    scene("morph", { bg: { kind: "color", c1: "#000000" }, layers: [{ shapes: ["cloud", "grid"], count: 3000, wander: 0, spin: 0 }], morph: { by: "click", time: 0.6 }, click: "next", pointer: { mode: "none" } }),
  ]);
  const word = box(page, "word");
  await expect(word).toHaveAttribute("data-gl-state", "running", { timeout: 90_000 });
  await expect(word).toHaveAttribute("data-gl-particles", /^\d+$/);
  // Gathered into the word: all on the screen, in the middle, wider than tall.
  await expect.poll(() => run(word, (r) => r.sample()[0].inside), { timeout: 20_000 }).toBeGreaterThan(0.99);
  await page.waitForTimeout(2500);
  const settled = await run(word, (r) => r.sample()[0]);
  expect(Math.abs(settled.cx - 0.5)).toBeLessThan(0.05);
  expect(Math.abs(settled.cy - 0.5)).toBeLessThan(0.05);
  // Under the pointer they flee; away from it they come back.
  const b = (await word.boundingBox())!;
  const before = await run(word, (r) => r.near(0.5, 0.5, 0.12));
  expect(before).toBeGreaterThan(0.01);
  for (let i = 0; i < 12; i++) {
    await page.mouse.move(b.x + b.width * 0.5 + (i % 2), b.y + b.height * 0.5);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(500);
  expect(await run(word, (r) => r.near(0.5, 0.5, 0.12))).toBeLessThan(before * 0.4);
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height + 300);
  await expect.poll(() => run(word, (r) => r.near(0.5, 0.5, 0.12)), { timeout: 10_000 }).toBeGreaterThan(before * 0.8);
  // A press bursts them apart from where it was, then they gather again (a ball, the pointer doing nothing else).
  const ball = box(page, "burst");
  await centre(ball);
  await expect(ball).toHaveAttribute("data-gl-state", "running", { timeout: 30_000 });
  await page.waitForTimeout(2500);
  const middle = await run(ball, (r) => r.near(0.5, 0.5, 0.15));
  expect(middle).toBeGreaterThan(0.1);
  // It runs (its own time goes on, it draws), and the press is taken at its next step.
  const ran = await run(ball, (r) => r.stats());
  await expect.poll(() => run(ball, (r) => r.stats().t), { timeout: 5_000 }).toBeGreaterThan(ran.t);
  expect(await press(ball, 0.15)).toBe(1);
  expect(await run(ball, (r) => r.near(0.5, 0.5, 0.15))).toBeLessThan(middle * 0.5);
  await expect.poll(() => run(ball, (r) => r.near(0.5, 0.5, 0.15)), { timeout: 15_000 }).toBeGreaterThan(middle * 0.85);

  // A press takes the next form: a small cloud becomes a wide grid.
  const morph = box(page, "morph");
  await centre(morph);
  await expect(morph).toHaveAttribute("data-gl-state", "running", { timeout: 30_000 });
  await page.waitForTimeout(2500);
  const cloud = await run(morph, (r) => r.sample()[0].spread);
  expect(await press(morph, 1.2)).toBe(1);
  await expect.poll(() => run(morph, (r) => r.sample()[0].spread), { timeout: 10_000 }).toBeGreaterThan(cloud * 1.4);
});

test("flows with trails draw and move, a section's background keeps its words, and less motion is a still frame", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // No WebGL errors on the way (a texture drawn into while read once left every trail black).
  const warnings: string[] = [];
  page.on("console", (m) => { if (/INVALID_OPERATION|Feedback loop/i.test(m.text())) warnings.push(m.text()); });
  const nodes = [
    scene("fire", { bg: { kind: "color", c1: "#05030a" }, trails: 0.8, layers: [{ shapes: ["fireworks"], count: 2000, colouring: "random" }], pointer: { mode: "none" } }),
    scene("warp", { bg: { kind: "color", c1: "#000000" }, trails: 0.6, layers: [{ shapes: ["warp"], count: 2000 }], pointer: { mode: "none" } }),
    scene("code", { bg: { kind: "shader", shader: "aurora" }, trails: 0.8, layers: [{ shapes: ["rain"], count: 600, size: 14, sprite: "glyph", glyphs: "01" }] }),
    { id: "bg", type: "section", props: { contained: true, gl: { bg: { kind: "radial" }, layers: [{ shapes: ["fireflies"], count: 200, size: 6 }] } }, style: { base: { minHeight: "360px" } }, children: [{ id: "bg-b", type: "button", props: { label: { en: "Over the scene" }, href: "/shop" } }] },
  ];
  await show(page, nodes);
  for (const id of ["fire", "warp", "code"]) {
    const el = box(page, id);
    await centre(el);
    await expect(el).toHaveAttribute("data-gl-state", "running", { timeout: 60_000 });
    await page.waitForTimeout(1200);
    // Drawn and moving: two moments differ (a scene whose particles were never drawn stays one flat colour).
    const one = await el.screenshot();
    await page.waitForTimeout(400);
    const two = await el.screenshot();
    expect(one.equals(two), id).toBe(false);
  }
  // Behind a section's words, which keep every click.
  const bg = page.locator('[data-tree-node="bg"] > [data-pt-gl="bg"]');
  await centre(bg);
  await expect(bg).toHaveAttribute("data-gl-state", "running", { timeout: 60_000 });
  expect(await bg.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  const button = page.getByText("Over the scene");
  expect(await button.evaluate((el) => { const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === at || el.contains(at); })).toBe(true);
  expect(warnings).toEqual([]);

  // Less motion: one still frame.
  const still = await browser.newContext({ reducedMotion: "reduce", baseURL: page.url().replace(/\/en\/library-demo.*$/, "") });
  const p2 = await still.newPage();
  await p2.goto("/en/library-demo");
  await expect(box(p2, "fire")).toHaveAttribute("data-gl-state", "still", { timeout: 60_000 });
  await still.close();
});

test("from the editor: added from the Add panel, built from a ready design, its form changed", async ({ page }) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const root = () => page.evaluate(() => (window as any).__canvasHarness.getDraft().tree.root);
  const glNode = async () => {
    const all: any[] = [];
    const walk = (n: any) => { all.push(n); (n.children ?? []).forEach(walk); };
    walk(await root());
    return all.find((n) => n.type === "glScene");
  };
  const ready = () => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90_000 });
  const frame = page.frameLocator('[data-testid="studio-frame"]');
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(EDITOR);
  await ready();
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.locator('[data-testid="studio-add-item"][data-kind="glScene"]').click();
  await expect.poll(async () => Boolean(await glNode())).toBe(true);
  await ready();
  const shown = frame.locator('[data-pt-gl="element"]');
  await expect(shown).toHaveAttribute("data-gl-state", "running", { timeout: 90_000 });
  // Its tool goes to the builder; a ready design makes the whole scene.
  await page.locator('[data-testid="studio-tool"][data-tool="gl-build"]').click();
  const panel = page.getByTestId("studio-gl");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("studio-gl-preset")).toHaveCount(38);
  await panel.locator('[data-testid="studio-gl-preset"][data-preset="galaxy"]').click();
  await expect.poll(async () => (await glNode()).props.gl.layers[0].shapes).toEqual(["galaxy"]);
  await ready();
  await expect(frame.locator('[data-pt-gl="element"]')).toHaveAttribute("data-gl-particles", "16000", { timeout: 60_000 });
  // A form of its own, then words it morphs into.
  await panel.locator('[data-testid="studio-gl-shape"][data-shape="heart"]').click();
  await expect.poll(async () => (await glNode()).props.gl.layers[0].shapes).toEqual(["heart"]);
  await panel.getByTestId("studio-gl-morph-add").selectOption("text");
  await expect.poll(async () => (await glNode()).props.gl.layers[0].shapes).toEqual(["heart", "text"]);
  await panel.getByTestId("studio-gl-text").fill("Our name");
  await panel.getByTestId("studio-gl-text").blur();
  await expect.poll(async () => (await glNode()).props.gl.layers[0].text).toEqual({ en: "Our name" });
  await ready();
  await expect(frame.locator('[data-pt-gl="element"]')).toHaveAttribute("data-gl-state", "running", { timeout: 60_000 });
});

test("maths and physics: an attractor with bloom, pendulums a hair apart part ways, the pointer as a sun, streaks in a still frame", async ({ page, browser }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const warnings: string[] = [];
  page.on("console", (m) => { if (/INVALID_OPERATION|Feedback loop|WebGL/i.test(m.text())) warnings.push(m.text()); });
  const black = { kind: "color", c1: "#000000" };
  await show(page, [
    scene("lorenz", { bg: black, bloom: 0.6, chroma: 0.5, layers: [{ shapes: ["lorenz"], count: 6000 }], pointer: { mode: "none" } }),
    scene("pend", { bg: black, layers: [{ shapes: ["pendulum"], count: 400, twinkle: 0 }], click: "none", pointer: { mode: "none" } }),
    scene("sun", { bg: black, layers: [{ shapes: ["cloud"], count: 3000, wander: 0, spin: 0 }], pointer: { mode: "gravity", strength: 2 } }),
    scene("streak", { bg: black, layers: [{ shapes: ["rain"], count: 600, sprite: "streak", size: 3 }] }),
  ]);
  // The Lorenz attractor, drawn off the screen and finished with bloom and colour fringes: on the screen, and moving.
  const lorenz = box(page, "lorenz");
  await expect(lorenz).toHaveAttribute("data-gl-state", "running", { timeout: 90_000 });
  await page.waitForTimeout(1500);
  expect((await run(lorenz, (r) => r.sample()[0])).inside).toBeGreaterThan(0.95);
  const one = await lorenz.screenshot();
  await page.waitForTimeout(400);
  expect(one.equals(await lorenz.screenshot())).toBe(false);

  // Pendulums started a ten-thousandth of a radian apart: one tip at first, then all over (chaos).
  const pend = box(page, "pend");
  await centre(pend);
  await expect(pend).toHaveAttribute("data-gl-state", "running", { timeout: 30_000 });
  // A press starts them all again (it may have begun before it came into view).
  expect(await press(pend, 1 / 60)).toBe(1);
  expect((await run(pend, (r) => r.sample()[0])).spread).toBeLessThan(0.02);
  await expect.poll(() => run(pend, (r) => r.sample()[0].spread), { timeout: 30_000, intervals: [1000] }).toBeGreaterThan(0.05);

  // The pointer as a small sun: particles are drawn to it.
  const sun = box(page, "sun");
  await centre(sun);
  await expect(sun).toHaveAttribute("data-gl-state", "running", { timeout: 30_000 });
  await page.waitForTimeout(2500);
  const before = await run(sun, (r) => r.near(0.62, 0.5, 0.08));
  const sb = (await sun.boundingBox())!;
  for (let i = 0; i < 30; i++) {
    await page.mouse.move(sb.x + sb.width * 0.62 + (i % 2), sb.y + sb.height * 0.5);
    await page.waitForTimeout(80);
  }
  expect(await run(sun, (r) => r.near(0.62, 0.5, 0.08))).toBeGreaterThan(Math.max(0.01, before * 1.4));
  expect(warnings).toEqual([]);

  // Less motion: the streaks still drawn in the one still frame (each knows where it was a step before).
  const still = await browser.newContext({ reducedMotion: "reduce", baseURL: page.url().replace(/\/en\/library-demo.*$/, "") });
  const p2 = await still.newPage();
  await p2.goto("/en/library-demo");
  const streak = box(p2, "streak");
  await centre(streak);
  await expect(streak).toHaveAttribute("data-gl-state", "still", { timeout: 60_000 });
  const lit = await streak.evaluate(async (e) => {
    const c = e.querySelector("canvas") as HTMLCanvasElement;
    const img = new Image();
    img.src = c.toDataURL("image/png");
    await img.decode();
    const k = document.createElement("canvas");
    k.width = c.width;
    k.height = c.height;
    const x = k.getContext("2d")!;
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, k.width, k.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 120) n++;
    return n;
  });
  expect(lit).toBeGreaterThan(200);
  await still.close();
});
