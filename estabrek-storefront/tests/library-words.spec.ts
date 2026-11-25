import { expect, test, type Page } from "@playwright/test";

// Words a library piece doesn't show as written (src/library/runtime.tsx spell, convert.mjs): spelled out in letters
// that move one by one ("LIQUID"), typed out a letter at a time (the typewriter), drawn in an SVG picture (a git
// graph's labels). The owner (2026-11-25) asked for every WebGL/canvas piece to take their words: these kept the
// library's after a change, and an SVG word vanished in the editor (a span shows nothing inside SVG).
const API = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;
const EDITOR = `http://127.0.0.1:${process.env.ADMIN_PORT || 5178}/tests/fixtures/editor-controls.html?lang=en&editingRegression`;

async function showPieces(page: Page, nodes: Array<{ id: string; item: string; words: Record<string, { en: string }>; colours?: Record<string, string> }>) {
  await page.request.post(`${API}/__test/library-page`, { data: { nodes: nodes.map(({ id, item, words, colours }) => ({ id, type: "lib", props: { item, words, ...(colours ? { colours } : {}) } })) } });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.goto("/library-demo");
  for (const n of nodes) await expect(page.locator(`[data-lib="${n.item}"]`)).toHaveAttribute("data-lib-ready", "", { timeout: 90_000 });
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
  await request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
});

test("letters that move one by one, a word typed out and an SVG picture's labels: in the owner's words", async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await showPieces(page, [
    { id: "w-liquid", item: "premium-liquid-chrome", words: { LIQUID: { en: "SAMORAY" } } },
    { id: "w-type", item: "hero-typewriter", words: { "designers.": { en: "makers of Samoray." } } },
    { id: "w-git", item: "hero-git-graph", words: { "feat: auth": { en: "feat: samoray" } } },
  ]);
  // "LIQUID" in letters: the owner's word, letter by letter.
  const liquid = page.locator('[data-lib="premium-liquid-chrome"]');
  await liquid.scrollIntoViewIfNeeded();
  await expect.poll(() => liquid.innerText(), { timeout: 20_000 }).toContain("SAMORAY");
  expect(await liquid.innerText()).not.toContain("LIQUID");
  // The typewriter types the owner's whole word (it stopped at the library's word's length, or never got to it as
  // the word it compares with was the library's), then goes on to the next.
  const typed = page.locator('[data-lib="hero-typewriter"] h1');
  await typed.scrollIntoViewIfNeeded();
  await expect.poll(() => typed.innerText(), { timeout: 30_000, intervals: [100] }).toContain("makers of Samoray.");
  await expect.poll(() => typed.innerText(), { timeout: 30_000, intervals: [200] }).toContain("developers");
  expect(await typed.innerText()).not.toContain("designers");
  // An SVG picture's label.
  const git = page.locator('[data-lib="hero-git-graph"] svg text').filter({ hasText: "feat: samoray" });
  await expect(git).toHaveCount(1);
  await expect(page.locator('[data-lib="hero-git-graph"] svg text').filter({ hasText: "feat: auth" })).toHaveCount(0);
});

// The owner's colours (2026-11-25, "colours don't change either"): the page's CSS followed them, what a canvas or a
// shader paints didn't (runtime.tsx paint, glsl), nor an rgba() of the same colour (build-css.mjs).
test("colours: what a canvas paints, a shader's colours and an rgba() shadow follow the owner's colours", async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const w = window as unknown as { __shaders: string[] };
    w.__shaders = [];
    const keep = WebGLRenderingContext.prototype.shaderSource;
    WebGLRenderingContext.prototype.shaderSource = function (sh: WebGLShader, src: string) {
      w.__shaders.push(String(src));
      return keep.call(this, sh, src);
    };
  });
  await showPieces(page, [
    // Particle Text paints rgba(5, 5, 12, 0.35) over its whole canvas every frame: its background, #05050c.
    { id: "c-dots", item: "premium-particle-text", words: {}, colours: { "05050c": "#1e3a8a" } },
    // The aurora's shader mixes vec3(0.42, 0.14, 0.95): #6b24f2 in the piece's colours.
    { id: "c-aurora", item: "premium-aurora", words: {}, colours: { "6b24f2": "#ff00ff" } },
    // A phone's shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]: black, #000000.
    { id: "c-story", item: "premium-scroll-story", words: {}, colours: { "000000": "#ff0000" } },
  ]);
  // The canvas's corner, where only the trail is painted: the owner's navy, not the library's near black.
  const dots = page.locator('[data-lib="premium-particle-text"] canvas').first();
  await dots.scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const [r, , b] = await dots.evaluate((c: HTMLCanvasElement) => Array.from(c.getContext("2d")!.getImageData(4, 4, 1, 1).data));
    return b > 90 && r < 60;
  }, { timeout: 20_000 }).toBe(true);
  // The shader was handed the owner's colour in place of the library's.
  await page.locator('[data-lib="premium-aurora"]').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shaders: string[] }).__shaders.join("\n")), { timeout: 20_000 }).toContain("vec3(1.0000, 0.0000, 1.0000)");
  expect(await page.evaluate(() => (window as unknown as { __shaders: string[] }).__shaders.join("\n"))).not.toContain("vec3(0.42, 0.14, 0.95)");
  // The rgba() shadow: red at its own 80%.
  const shadow = await page.locator('[data-lib="premium-scroll-story"] [class*="rgba(0,0,0,0.8)"]').first().evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toMatch(/255, 0, 0, 0\.8|srgb 1 0 0 \/ 0\.8/);
});

test("from the editor: letters, an SVG label and a canvas's words written over; a thin line's ring hugs it", async ({ page }) => {
  test.setTimeout(360_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const root = () => page.evaluate(() => (window as any).__canvasHarness.getDraft().tree.root);
  const libNode = async (item: string) => ((await root()).children as any[]).find((n) => n.type === "lib" && n.props.item === item);
  const ready = () => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90_000 });
  const frame = page.frameLocator('[data-testid="studio-frame"]');
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(EDITOR);
  await ready();
  const add = async (name: string, item: string) => {
    await page.getByRole("tab", { name: "+ Add" }).click();
    await page.getByTestId("studio-lib-browse").click();
    const shelf = page.getByTestId("lib-shelf");
    await shelf.getByTestId("lib-search").fill(name);
    await shelf.locator(`[data-testid="lib-card"][data-item="${item}"] [data-testid="lib-pick"]`).click();
    await expect.poll(async () => Boolean(await libNode(item))).toBe(true);
    await ready();
    const shown = frame.locator(`[data-lib="${item}"]`);
    await expect(shown).toHaveAttribute("data-lib-ready", "", { timeout: 90_000 });
    return shown;
  };
  /** A point of the frame's page, on the editor's screen. */
  const onScreen = async (at: { x: number; y: number }) => {
    const box = (await page.getByTestId("studio-frame").boundingBox())!;
    const scale = box.width / (await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w));
    return { x: box.x + at.x * scale, y: box.y + at.y * scale };
  };
  const writing = frame.locator("[data-lx-drawn]");

  // Letters that move one by one: a double-click on one opens a box with the whole word; it's kept as that word's.
  const liquid = await add("Liquid Chrome", "premium-liquid-chrome");
  // Its second letter ("I"): a box of its own beside the others, in a heading that goes on with "METAL".
  const letter = liquid.locator("h1 span, h2 span").filter({ hasText: /^I$/ }).first();
  await letter.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1500);
  const l = await onScreen(await letter.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  await page.mouse.dblclick(l.x, l.y);
  await expect(writing).toBeVisible();
  await expect(writing).toHaveText("LIQUID");
  await page.keyboard.press("Control+A");
  await page.keyboard.type("SAMORAY");
  await page.keyboard.press("Enter");
  await expect(writing).toHaveCount(0);
  await expect.poll(async () => (await libNode("premium-liquid-chrome")).props.words).toEqual({ LIQUID: { en: "SAMORAY" } });
  await ready();
  await expect.poll(() => frame.locator('[data-lib="premium-liquid-chrome"]').innerText(), { timeout: 30_000 }).toContain("SAMORAY");

  // An SVG label: it shows in the editor (a tspan marks it, not a span), and a double-click writes over it in a box.
  const git = await add("Git Graph", "hero-git-graph");
  const label = git.locator("svg text").filter({ hasText: "feat: auth" });
  await expect(label).toHaveCount(1);
  await expect(label.locator('tspan[data-lx-src="feat: auth"]')).toHaveCount(1);
  await label.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(800);
  const g = await onScreen(await label.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  await page.mouse.dblclick(g.x, g.y);
  await expect(writing).toBeVisible();
  await expect(writing).toHaveText("feat: auth");
  await page.keyboard.press("Control+A");
  await page.keyboard.type("feat: samoray");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await libNode("hero-git-graph")).props.words).toEqual({ "feat: auth": { en: "feat: samoray" } });

  // A canvas picked inside a piece: named a live drawing, its drawn words in its panel to change there.
  const dots = await add("Particle Text", "premium-particle-text");
  await dots.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(2500);
  const d = await onScreen(await dots.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.45 }; }));
  await page.mouse.click(d.x, d.y);
  await page.mouse.click(d.x, d.y);
  await expect(page.getByTestId("studio-part-kind")).toHaveAttribute("data-kind", "canvas");
  const drawnHere = page.getByTestId("studio-lib-part-words");
  await expect(drawnHere.locator('[data-testid="studio-lib-part-word"][data-src="DESIGN"]')).toHaveCount(1, { timeout: 15_000 });
  const field = drawnHere.locator('[data-testid="studio-lib-part-word"][data-src="DESIGN"] input');
  await field.fill("Studio");
  await field.press("Enter");
  await expect.poll(async () => (await libNode("premium-particle-text")).props.words).toEqual({ DESIGN: { en: "Studio" } });

  // A thin line of small words across the piece: a pill hugs it (it was a circle as wide as the line).
  await ready();
  const line = frame.locator('[data-lib="premium-particle-text"] p').first();
  const t = await onScreen(await line.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  await page.mouse.click(t.x, t.y);
  await expect(page.getByTestId("studio-part-kind")).toHaveAttribute("data-kind", "text");
  const ring = page.getByTestId("studio-selected-ring");
  await expect(ring).toHaveAttribute("data-pill", "1");
  const r = (await ring.boundingBox())!;
  expect(r.height).toBeLessThan(60);
  await expect(page.getByTestId("studio-lib-part-words")).toContainText("Studio Kinetik");
});
