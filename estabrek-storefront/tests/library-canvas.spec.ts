import { expect, test, type Page } from "@playwright/test";

// Words a library piece draws on a canvas (src/library/runtime.tsx canvasText, convert.mjs): "Particle Text" draws a
// word in dots. The owner (2026-11-25) changed that word and the dots still spelled the library's; it was cut at
// both sides of a narrower box; it couldn't be written over in the preview, and nothing in the piece had a size.
const API = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;
const EDITOR = `http://127.0.0.1:${process.env.ADMIN_PORT || 5178}/tests/fixtures/editor-controls.html?lang=en&editingRegression`;
const ITEM = "premium-particle-text";

type Draw = { t: string; px: number; w: number; a: number; wide: number };
/** Every text drawn on a canvas, with its size and the canvas's width (as the browser draws it). */
const spyOnCanvases = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __drawn: unknown[] };
    w.__drawn = [];
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t: string, x: number, y: number, ...rest: number[]) {
      try {
        const s = String(t);
        if (s.length > 1) w.__drawn.push({ t: s, px: Number(/(\d*\.?\d+)px/.exec(this.font)?.[1]), w: this.canvas.width, a: this.getTransform().a, wide: this.measureText(s).width });
        if (w.__drawn.length > 400) w.__drawn.splice(0, 200);
      } catch {}
      return fill.call(this, t, x, y, ...rest);
    };
  });
const drawn = (page: Page) => page.evaluate(() => (window as unknown as { __drawn: Draw[] }).__drawn.slice());

async function showPiece(page: Page, props: Record<string, unknown>) {
  await page.request.post(`${API}/__test/library-page`, { data: { nodes: [{ id: "lib-ptext", type: "lib", props: { item: ITEM, ...props } }] } });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.goto("/library-demo");
  await expect(page.locator(`[data-lib="${ITEM}"]`)).toHaveAttribute("data-lib-ready", "", { timeout: 90_000 });
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
  await request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
});

test("a word drawn in dots: the owner's, inside its box, in the owner's sizes; the piece's other words sized too", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await spyOnCanvases(page);
  await page.context().addCookies([{ name: "shop-lang", value: "en", url: String(test.info().project.use.baseURL) }]);
  // The owner's own box: 1263 wide, narrower than the library's page.
  await page.setViewportSize({ width: 1263, height: 900 });

  // The owner's words for it, longer than the library's: drawn in theirs, never wider than the canvas.
  await showPiece(page, { words: { DESIGN: { en: "Ebraheem studio" } } });
  await expect.poll(async () => (await drawn(page)).some((d) => d.t === "Ebraheem studio"), { timeout: 30_000 }).toBe(true);
  const own = (await drawn(page)).filter((d) => d.t === "Ebraheem studio");
  expect((await drawn(page)).some((d) => d.t === "DESIGN")).toBe(false);
  for (const d of own) expect(d.wide * d.a).toBeLessThanOrEqual(d.w * 0.95);
  // Its buttons show the same words (they choose which one the dots spell).
  await expect(page.locator(`[data-lib="${ITEM}"] button`).first()).toContainText("Ebraheem studio");
  const textPx = () => page.locator(`[data-lib="${ITEM}"] p`).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(await textPx()).toBe(12);

  // A short word in the library's own size, then in the owner's (60%): only the drawn word's size changes.
  await showPiece(page, { words: { DESIGN: { en: "Hi" } } });
  await expect.poll(async () => (await drawn(page)).some((d) => d.t === "Hi"), { timeout: 30_000 }).toBe(true);
  const made = (await drawn(page)).find((d) => d.t === "Hi")!.px;
  await showPiece(page, { words: { DESIGN: { en: "Hi" } }, drawnSize: 0.6 });
  await expect.poll(async () => (await drawn(page)).some((d) => d.t === "Hi"), { timeout: 30_000 }).toBe(true);
  expect((await drawn(page)).find((d) => d.t === "Hi")!.px / made).toBeCloseTo(0.6, 2);
  expect(await textPx()).toBe(12);

  // All its words half as big again: what its classes size (text-xs, 12px) and what it takes from the page.
  await showPiece(page, { textSize: 1.5 });
  expect(await textPx()).toBe(18);
  expect(await page.locator(`[data-lib="${ITEM}"] button span`).last().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBe(18);
  expect(errors).toEqual([]);
});

test("from the editor: the drawn word written over where it shows, and the piece's sizes in its panel", async ({ page }) => {
  test.setTimeout(300_000);
  const draft = () => page.evaluate(() => (window as any).__canvasHarness.getDraft().tree.root);
  const node = async () => ((await draft()).children as any[]).find((n) => n.type === "lib" && n.props.item === ITEM);
  const ready = () => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90_000 });
  const frame = page.frameLocator('[data-testid="studio-frame"]');
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(EDITOR);
  await ready();
  await page.getByRole("tab", { name: "+ Add" }).click();
  await page.getByTestId("studio-lib-browse").click();
  const shelf = page.getByTestId("lib-shelf");
  await shelf.getByTestId("lib-search").fill("Particle Text");
  await shelf.locator(`[data-testid="lib-card"][data-item="${ITEM}"] [data-testid="lib-pick"]`).click();
  await expect.poll(async () => Boolean(await node())).toBe(true);
  const id = (await node()).id as string;
  await ready();
  const shown = frame.locator(`[data-tree-node="${id}"] [data-lib="${ITEM}"]`);
  await expect(shown).toHaveAttribute("data-lib-ready", "", { timeout: 90_000 });
  await shown.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(2500);

  // A double-click on the dots: a box to write in, holding the word they spell now.
  const at = await shown.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = (await page.getByTestId("studio-frame").boundingBox())!;
  const scale = box.width / (await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w));
  await page.mouse.dblclick(box.x + at.x * scale, box.y + at.y * scale);
  const writing = frame.locator("[data-lx-drawn]");
  await expect(writing).toBeVisible();
  await expect(writing).toHaveAttribute("contenteditable", /plaintext-only|true/);
  const was = ((await writing.textContent()) ?? "").trim();
  expect(["DESIGN", "MOTION", "MAGIC", "YOU"]).toContain(was);
  await page.keyboard.type("Samoray");
  await page.keyboard.press("Enter");
  await expect(writing).toHaveCount(0);
  await expect.poll(async () => (await node()).props.words).toEqual({ [was]: { en: "Samoray" } });
  await ready();
  await expect(shown.locator("button").filter({ hasText: "Samoray" })).toHaveCount(1, { timeout: 60_000 });
  // Esc leaves it as it was.
  await page.waitForTimeout(1500);
  await page.mouse.dblclick(box.x + at.x * scale, box.y + at.y * scale);
  await expect(writing).toBeVisible();
  await page.keyboard.type("Not these");
  await page.keyboard.press("Escape");
  await expect(writing).toHaveCount(0);
  expect(Object.keys((await node()).props.words)).toEqual([was]);

  // Its panel: the size of all its words, and of the drawn word (only a piece that draws words has that one).
  const panel = page.getByTestId("studio-lib-panel").first();
  await expect(panel.getByTestId("studio-lib-drawn-size")).toBeVisible();
  const slide = async (testId: string, value: number) => {
    const input = panel.getByTestId(testId);
    await input.evaluate((el: HTMLInputElement, v) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      set.call(el, String(v));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
    await input.dispatchEvent("pointerup");
  };
  await slide("studio-lib-drawn-size", 70);
  await expect.poll(async () => (await node()).props.drawnSize).toBe(0.7);
  await slide("studio-lib-text-size", 125);
  await expect.poll(async () => (await node()).props.textSize).toBe(1.25);
  await ready();
  await expect.poll(() => shown.evaluate((el) => getComputedStyle(el).getPropertyValue("--lx-ts").trim()), { timeout: 60_000 }).toBe("1.25");
  await panel.getByTestId("studio-lib-sizes-reset").click();
  await expect.poll(async () => [(await node()).props.textSize, (await node()).props.drawnSize]).toEqual([undefined, undefined]);
});
