import { expect, test, type Page } from "@playwright/test";

const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
async function ready(page: Page) {
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
}
async function open(page: Page, lang = "en", extra = "") {
  await page.goto(`http://127.0.0.1:5178/tests/fixtures/editor-controls.html?lang=${lang}${extra}`);
  await expect(page.getByTestId("studio")).toBeVisible();
  await ready(page);
  await page.getByTestId("studio-page-motion-open").click();
  await page.locator('[data-testid="studio-layer"][data-node="objects"]').click();
}
async function add(page: Page, kind: "svg" | "model3d") {
  await page.getByTestId(`studio-section-add-${kind}`).click();
  await expect.poll(() => page.evaluate(type => (window as any).__canvasHarness.getDraft().tree.root.children[0].children.filter((node: any) => node.type === type).length, kind)).toBe(2);
  await ready(page);
  const id = await page.evaluate(type => (window as any).__canvasHarness.getDraft().tree.root.children[0].children.find((node: any) => node.type === type && !["drawing", "model"].includes(node.id)).id, kind);
  await expect(frame(page).locator(`[data-tree-node="${id}"]`)).toBeVisible();
  return id as string;
}
async function bounds(page: Page, id: string) {
  return frame(page).locator(`[data-tree-node="${id}"]`).evaluate(el => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const child = el.querySelector(el.classList.contains("pt-svg") ? "svg" : ".pt-model3d-stage");
    return { outer: box(el), content: child ? box(child) : null, canvas: el.querySelector("canvas") ? box(el.querySelector("canvas")!) : null };
  });
}
async function sameBounds(page: Page, id: string, inset = 0) {
  await expect.poll(async () => {
    const { outer, content } = await bounds(page, id);
    return content ? Math.max(Math.abs(content.x - outer.x - inset), Math.abs(content.y - outer.y - inset), Math.abs(content.w - outer.w + 2 * inset), Math.abs(content.h - outer.h + 2 * inset)) : Infinity;
  }).toBeLessThan(1);
}
async function resize(page: Page, id: string, dx: number, dy: number, inset = 0) {
  await ready(page);
  const handle = page.locator('[data-testid="studio-handle"][data-handle="se"]');
  await expect(handle).toBeVisible();
  const start = await handle.boundingBox();
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const iframe = await page.getByTestId("studio-frame").boundingBox();
  const scale = iframe!.width / viewport.w;
  const before = (await bounds(page, id)).outer;
  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  try {
    await page.mouse.move(start!.x + start!.width / 2 + dx * scale, start!.y + start!.height / 2 + dy * scale, { steps: 10 });
    await expect(page.getByTestId("studio-sizing")).toBeVisible();
    await sameBounds(page, id, inset);
  } finally { await page.mouse.up(); }
  await ready(page);
  const after = (await bounds(page, id)).outer;
  expect(after.w).toBeCloseTo(before.w + dx, 0);
  expect(after.h).toBeCloseTo(before.h + dy, 0);
  await sameBounds(page, id, inset);
}

for (const kind of ["svg", "model3d"] as const) test(`${kind} is added at a usable size instead of filling the section`, async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  const id = await add(page, kind);
  const { outer } = await bounds(page, id);
  expect(outer.w).toBeLessThanOrEqual(kind === "svg" ? 200 : 320);
  expect(outer.h).toBeLessThanOrEqual(kind === "svg" ? 200 : 320);
  expect(outer.w).toBeGreaterThan(100);
  await sameBounds(page, id);
});

for (const lang of ["en", "ar"]) test(`${lang}: a large SVG viewBox stays bounded and its artwork follows the resize frame`, async ({ page }) => {
  test.setTimeout(120000);
  await open(page, lang);
  const id = await add(page, "svg");
  await page.getByTestId("studio-svg-own").locator("summary").click();
  await page.getByTestId("studio-svg-file").setInputFiles({ name: "large.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg viewBox="0 0 4000 2000"><rect width="4000" height="2000" fill="#3366ff"/></svg>') });
  await expect(frame(page).locator(`[data-tree-node="${id}"] svg`)).toHaveAttribute("viewBox", "0 0 4000 2000");
  await ready(page);
  const initial = await bounds(page, id);
  expect(initial.outer.w / initial.outer.h).toBeCloseTo(2, 2);
  await sameBounds(page, id);
  await resize(page, id, 60, 100);
  await resize(page, id, -90, -130);
  const painted = await frame(page).locator(`[data-tree-node="${id}"] svg rect`).evaluate(el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; });
  const final = await bounds(page, id);
  expect(painted.w).toBeCloseTo(final.outer.w, 0);
  expect(painted.h).toBeCloseTo(final.outer.h, 0);
  await page.getByTestId("studio-undo").click();
  await ready(page);
  await sameBounds(page, id);
});

test("3D viewport follows both growing and shrinking the same selection frame", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  const id = await add(page, "model3d");
  await resize(page, id, 80, -90);
  await resize(page, id, -130, 30);
  const value = await bounds(page, id);
  if (value.canvas) {
    expect(value.canvas.w).toBeCloseTo(value.outer.w, 0);
    expect(value.canvas.h).toBeCloseTo(value.outer.h, 0);
  }
});

test("new drawings and models shrink to a narrow container without losing their natural square frame", async ({ page }) => {
  test.setTimeout(120000);
  await open(page, "en", "&narrow=1");
  for (const kind of ["svg", "model3d"] as const) {
    const id = await add(page, kind);
    const { outer } = await bounds(page, id);
    expect(outer.w).toBeLessThanOrEqual(160);
    expect(outer.w).toBeGreaterThan(8);
    expect(outer.w / outer.h).toBeCloseTo(1, 2);
    await sameBounds(page, id);
  }
});

test("authored SVG padding and border remain inside its natural and explicitly resized frame", async ({ page }) => {
  test.setTimeout(120000);
  await open(page, "en", "&padded=1");
  await page.getByTestId("studio-section-objects").locator('[data-node="drawing"]').click();
  await ready(page);
  const initial = await bounds(page, "drawing");
  expect(initial.outer.w).toBeCloseTo(200, 0);
  expect(initial.outer.h).toBeCloseTo(125, 0);
  await sameBounds(page, "drawing", 25);
  await resize(page, "drawing", 80, 60, 25);
  await resize(page, "drawing", -60, -40, 25);
});
