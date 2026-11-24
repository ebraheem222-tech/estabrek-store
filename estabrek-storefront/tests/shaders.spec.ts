import { expect, test, type Page } from "@playwright/test";

// The theme library's WebGL backgrounds on a section (docs/themes-library-plan.ar.md, phase 3): drawn by the shop
// (pageTree/ShaderView.tsx), in the owner's colours, still for whoever asked for less motion; set in the editor.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
const editor = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=en&editingRegression";

const section = (id: string, shader: Record<string, unknown>) => ({
  id, type: "section", props: { contained: true, shader }, style: { base: { minHeight: "420px" } },
  children: [{ id: `${id}-h`, type: "heading", props: { text: { en: `Over ${id}` }, level: 2 } }],
});
async function showSections(page: Page, nodes: unknown[]) {
  await page.request.post(`${API}/__test/library-page`, { data: { nodes } });
  await page.request.post(`${SITE}/api/revalidate`, { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
});

test("a section's shader runs near the screen, in the owner's colours, behind its words, and is still for less motion", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await showSections(page, [section("a", { kind: "aurora" }), section("b", { kind: "aurora", bg: "#000000", c1: "#16a34a", c2: "#16a34a", c3: "#16a34a" }), section("c", { kind: "tunnel", rainbow: false, veil: 0.5, grain: 0.2 })]);
  await page.context().addCookies([{ name: "shop-lang", value: "en", url: SITE }]);
  await page.goto("/library-demo");
  const a = page.locator('[data-pt-shader="aurora"]').first();
  await expect(a).toHaveAttribute("data-shader-state", "running", { timeout: 90_000 });
  // Behind the section's words: they stay on top and keep every click.
  expect(await a.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  const words = page.getByText("Over a");
  await expect(words).toBeVisible();
  expect(await words.evaluate((el) => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el || el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); })).toBe(true);
  // The owner's colours make another picture of the same shader.
  const own = page.locator('[data-pt-shader="aurora"]').nth(1);
  await own.scrollIntoViewIfNeeded();
  await expect(own).toHaveAttribute("data-shader-state", "running");
  await a.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const first = await a.screenshot();
  await own.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const second = await own.screenshot();
  expect(first.equals(second)).toBe(false);
  // Its veil and grain over the colours.
  const t = page.locator('[data-pt-shader="tunnel"]');
  await t.scrollIntoViewIfNeeded();
  await expect(t).toHaveAttribute("data-shader-state", "running");
  await expect(t.locator(".pt-shader-veil")).toHaveCSS("opacity", "0.5");
  await expect(t.locator(".pt-shader-grain")).toHaveCount(1);
  expect(errors).toEqual([]);

  // Less motion: one still frame.
  const calm = await browser.newContext({ reducedMotion: "reduce" });
  const still = await calm.newPage();
  await still.goto(`${SITE}/en/library-demo`);
  await expect(still.locator('[data-pt-shader="aurora"]').first()).toHaveAttribute("data-shader-state", "still", { timeout: 90_000 });
  await calm.close();
});

test("from the editor: a section's WebGL background picked from its panel, shown in the preview", async ({ page }) => {
  test.setTimeout(240_000);
  const draft = () => page.evaluate(() => (window as any).__canvasHarness.getDraft().tree.root);
  const ready = () => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90_000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(editor);
  await ready();
  const sec = ((await draft()).children as any[]).find((n) => n.type === "section");
  expect(sec).toBeTruthy();
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator(`[data-testid="studio-layer"][data-node="${sec.id}"]`).click();
  const panel = page.getByTestId("studio-shader");
  await panel.scrollIntoViewIfNeeded();
  await panel.getByRole("button", { expanded: false }).click();
  await expect(panel.getByTestId("studio-shader-kind")).toHaveCount(21);
  await panel.locator('[data-testid="studio-shader-kind"][data-kind="ocean"]').click();
  await expect.poll(async () => ((await draft()).children as any[]).find((n) => n.id === sec.id).props.shader).toEqual({ kind: "ocean" });
  await ready();
  await expect(page.frameLocator('[data-testid="studio-frame"]').locator(`[data-tree-node="${sec.id}"] [data-pt-shader="ocean"]`)).toHaveCount(1, { timeout: 60_000 });
  // Its settings: a colour from the theme, and gone in one click.
  await panel.getByTestId("studio-shader-c1").selectOption("accent");
  await expect.poll(async () => ((await draft()).children as any[]).find((n) => n.id === sec.id).props.shader).toEqual({ kind: "ocean", c1: "accent" });
  await panel.getByTestId("studio-shader-remove").click();
  await expect.poll(async () => ((await draft()).children as any[]).find((n) => n.id === sec.id).props.shader).toBeUndefined();
});
