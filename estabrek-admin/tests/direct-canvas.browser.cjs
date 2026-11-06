/**
 * Actual StudioPage + actual StudioBridge regression with isolated merchant data.
 * Prerequisites (this script never starts servers):
 *   catalog-server:4100, storefront:3000 with ADMIN_ORIGIN including admin:5178,
 *   Vite admin:5178. Run from repository root: node estabrek-admin/tests/direct-canvas.browser.cjs
 * Optional: CANVAS_SCENARIOS=flow-return|desktop|rtl-touch|scaled,
 * CANVAS_BROWSER_CHANNEL=chrome. The scaled scenario checks top/bottom origins.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium, expect } = require("../../estabrek-storefront/node_modules/@playwright/test");

const HARNESS = process.env.CANVAS_HARNESS_URL || "http://127.0.0.1:5178/tests/fixtures/canvas-editor-harness.html";
const OUTPUT_DIR = path.resolve(__dirname, "../../.tmp");
const OUTPUT = path.join(OUTPUT_DIR, "direct-canvas-browser-results.json");
const results = { harness: HARNESS, startedAt: new Date().toISOString(), scenarios: [], errors: [] };
const close = (actual, wanted, tolerance = 1.6, label = "coordinate") => assert.ok(Math.abs(actual - wanted) <= tolerance, `${label}: expected ${wanted}, received ${actual}`);
const inside = (point, box) => point.x > box.x && point.x < box.x + box.w && point.y > box.y && point.y < box.y + box.h;
const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

async function open(browser, lang, variant = {}) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on("pageerror", (error) => results.errors.push({ lang, message: error.message }));
  page.on("request", (request) => {
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(request.url()) && request.method() !== "GET") {
      results.errors.push({ lang, message: `Unexpected external write: ${request.method()} ${request.url()}` });
    }
  });
  const url = new URL(HARNESS);
  url.searchParams.set("lang", lang);
  for (const [key, value] of Object.entries(variant)) url.searchParams.set(key, String(value));
  await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("studio"), "real admin editor loads").toBeVisible({ timeout: 45_000 });
  await expect.poll(() => page.evaluate(() => window.__canvasHarness?.getLayout()?.items?.length ?? 0), { timeout: 90_000, message: "the real storefront bridge reports the fixture" }).toBeGreaterThanOrEqual(8);
  const frame = page.frameLocator('[data-testid="studio-frame"]');
  await expect(frame.locator('[data-tree-node="canvas-image"]')).toBeVisible();
  const mode = page.getByTestId("studio-canvas-mode-free");
  await expect(mode, "free mode is the default").toHaveAttribute("aria-pressed", "true");
  assert.equal(await writes(page), 0, "opening the editor does not write a draft");
  return { page, context, frame };
}
const writes = (page) => page.evaluate(() => window.__canvasHarness.getWrites().length);
const model = (page, id) => page.evaluate((nodeId) => {
  const at = window.__canvasHarness.getNode(nodeId);
  return { parentId: at?.parent?.id ?? null, node: at?.node ?? null };
}, id);
async function box(frame, id) {
  return frame.locator(`[data-tree-node="${id}"]`).evaluate((element) => {
    const r = element.getBoundingClientRect(), s = getComputedStyle(element);
    return { x: r.x, y: r.y, w: r.width, h: r.height, position: s.position, width: s.width, height: s.height, scroll: window.scrollY };
  });
}
async function screen(page, point) {
  const f = await page.getByTestId("studio-frame").boundingBox();
  assert.ok(f, "frame has a screen box");
  const viewport = await page.evaluate(() => window.__canvasHarness.getLayout().viewport);
  const scale = f.width / viewport.w;
  return { x: f.x + point.x * scale, y: f.y + point.y * scale, scale };
}
async function select(page, frame, id) {
  const point = await screen(page, center(await box(frame, id)));
  const before = await page.evaluate(({ point, id }) => {
    const rect = (el) => { const r = el?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; };
    return { point, frame: rect(document.querySelector('[data-testid="studio-frame"]')), canvas: rect(document.querySelector('[data-testid="studio-canvas"]')), underPoint: document.elementFromPoint(point.x, point.y)?.outerHTML.slice(0, 450), layout: window.__canvasHarness.getLayout(), node: window.__canvasHarness.getNode(id), info: document.querySelector('[data-testid="studio-info"]')?.textContent };
  }, { point, id });
  await page.mouse.click(point.x, point.y);
  try { await expect(page.getByTestId("studio-info")).toContainText(id); }
  catch (error) {
    const after = await page.evaluate(() => ({ info: document.querySelector('[data-testid="studio-info"]')?.textContent, shapes: document.querySelector('[data-testid="studio-overlay"]')?.getAttribute('data-shapes'), hovered: document.querySelector('[data-testid="studio-hover"]')?.outerHTML, selected: document.querySelector('[data-testid="studio-selected"]')?.outerHTML, layout: window.__canvasHarness.getLayout() }));
    await fs.writeFile(path.join(OUTPUT_DIR, 'direct-canvas-selection-failure.json'), JSON.stringify({ before, after, object: await box(frame, id) }, null, 2));
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'direct-canvas-selection-failure.png'), fullPage: true });
    throw error;
  }
  await expect(page.locator('[data-testid="studio-handle"][data-handle="w"]')).toBeVisible();
}
async function mutation(page, before, label) {
  await expect.poll(() => writes(page), { timeout: 30_000, message: label }).toBe(before + 1);
  // A frame can display its new DOM before hydration reports the layout. StudioPage
  // deliberately clears shapes during that gap, so DOM visibility alone is insufficient.
  await expect.poll(() => page.evaluate(() => {
    const layout = window.__canvasHarness.getLayout();
    const shapes = Number(document.querySelector('[data-testid="studio-overlay"]')?.getAttribute("data-shapes") || 0);
    return Boolean(layout?.items?.length >= 8 && shapes >= 8);
  }), { timeout: 45_000, message: `${label}: the current iframe bridge reaches the editor` }).toBe(true);
}
async function drag(page, frame, id, to, label, beforeEnd = null) {
  await select(page, frame, id);
  const before = await writes(page);
  const from = await screen(page, center(await box(frame, id))), target = await screen(page, to);
  await page.keyboard.down("Control");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });
  if (beforeEnd) await beforeEnd();
  await page.mouse.up();
  await page.keyboard.up("Control");
  await mutation(page, before, label);
  return box(frame, id);
}
async function travel(page, direction) {
  const before = await writes(page);
  await page.getByTestId(`studio-${direction}`).click();
  await mutation(page, before, `${direction} is one draft transaction`);
}
function sameBox(actual, wanted, label) {
  for (const key of ["x", "y", "w", "h"]) close(actual[key], wanted[key], 1.8, `${label}.${key}`);
}
async function resize(page, frame, id, handle, dx, dy) {
  await select(page, frame, id);
  const before = await writes(page), initial = await box(frame, id);
  const h = page.locator(`[data-testid="studio-handle"][data-handle="${handle}"]`);
  const rect = await h.boundingBox();
  assert.ok(rect);
  const scale = (await screen(page, { x: 0, y: 0 })).scale;
  const from = center({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx * scale, from.y + dy * scale, { steps: 10 });
  const preview = await box(frame, id);
  if (handle.includes("w")) close(preview.x + preview.w, initial.x + initial.w, 1.8, "live west opposite edge");
  if (handle.includes("n")) close(preview.y + preview.h, initial.y + initial.h, 1.8, "live north opposite edge");
  assert.ok(Math.abs(preview.w - initial.w) > 10 || Math.abs(preview.h - initial.h) > 10, "the real iframe object resizes before release");
  assert.equal(await writes(page), before, "resize preview does not persist");
  await page.mouse.up();
  await mutation(page, before, `${handle} resize commits once`);
  const final = await box(frame, id);
  if (handle.includes("w")) close(final.x + final.w, initial.x + initial.w, 2, "committed west opposite edge");
  if (handle.includes("n")) close(final.y + final.h, initial.y + initial.h, 2, "committed north opposite edge");
  return { initial, preview, final };
}

async function flowReturn(browser) {
  const { page, context, frame } = await open(browser, "en");
  const out = { name: "flow-return", checks: [] };
  results.scenarios.push(out);
  try {
    const ids = ["canvas-image", "canvas-parent", "canvas-button", "canvas-inner"];
    out.before = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await box(frame, id)])));
    const draftBefore = await page.evaluate(() => window.__canvasHarness.getDraft());
    await select(page, frame, "canvas-image");
    const from = await screen(page, center(out.before["canvas-image"]));
    await page.keyboard.down("Control");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 80 * from.scale, from.y + 20 * from.scale, { steps: 8 });
    assert.equal((await box(frame, "canvas-image")).position, "absolute", "away gesture previews free placement");
    await page.mouse.move(from.x, from.y, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up("Control");
    await page.waitForTimeout(400);
    out.after = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await box(frame, id)])));
    out.writes = await writes(page);
    out.previewCss = await frame.locator("#pt-geometry-preview").textContent().catch(() => null);
    assert.equal(out.writes, 0, "returning to the original pointer does not persist a draft");
    assert.deepEqual(await page.evaluate(() => window.__canvasHarness.getDraft()), draftBefore, "no-op release preserves the complete original draft");
    await expect(frame.locator("#pt-geometry-preview"), "no-op release clears temporary geometry CSS").toHaveCount(0, { timeout: 2_000 });
    assert.equal(out.after["canvas-image"].position, out.before["canvas-image"].position, "no-op release restores ordinary flow positioning");
    for (const id of ids) sameBox(out.after[id], out.before[id], `no-op original flow ${id}`);
    out.checks.push("dragging away and returning to the original pointer clears preview CSS, restores all flow geometry and creates zero transactions");
    out.status = "passed";
  } catch (error) {
    await page.screenshot({ path: path.join(OUTPUT_DIR, "direct-canvas-flow-return-failure.png"), fullPage: true });
    throw error;
  } finally { await context.close(); }
}

async function scaled(browser, origin) {
  const variant = { ancestorScale: 1.25, objectScale: 1.1, objectOrigin: origin };
  const { page, context, frame } = await open(browser, "en", variant);
  const out = { name: `scaled-${origin}`, checks: [] };
  results.scenarios.push(out);
  try {
    const original = await box(frame, "canvas-image"), parent = await box(frame, "canvas-parent");
    close(original.w, 180 * 1.25 * 1.1, 1, "fixture has a real scaled ancestor and child");
    const target = { x: parent.x + parent.w * 0.6, y: parent.y + 150 };
    const moved = await drag(page, frame, "canvas-image", target, `scaled ${origin} drag`, async () => {
      out.preview = await box(frame, "canvas-image");
      close(out.preview.w, original.w, 1.6, "scaled live drag preserves displayed width");
      close(out.preview.h, original.h, 1.6, "scaled live drag preserves displayed height");
      close(out.preview.x + out.preview.w / 2, target.x, 2.2, "scaled live drag pointer x");
      close(out.preview.y + out.preview.h / 2, target.y, 2.2, "scaled live drag pointer y");
      assert.equal(await writes(page), 0, "scaled drag preview does not persist");
    });
    close(moved.x + moved.w / 2, target.x, 2.2, "scaled drag displayed pointer x");
    close(moved.y + moved.h / 2, target.y, 2.2, "scaled drag displayed pointer y");
    close(moved.w, original.w, 1.6, "scaled drag preserves displayed width");
    close(moved.h, original.h, 1.6, "scaled drag preserves displayed height");
    close(parseFloat(moved.width), 180, 1, "scaled drag preserves native width");
    close(parseFloat(moved.height), 120, 1, "scaled drag preserves native height");
    close((await box(frame, "canvas-parent")).h, parent.h, 1.8, "scaled parent extent");
    out.checks.push("scaled ancestor and scaled child preserve native dimensions and displayed pointer position when flow becomes free");
    const west = await resize(page, frame, "canvas-image", "w", -44, 0);
    close(west.preview.w, west.initial.w + 44, 2.2, "scale-correct live resize width");
    close(west.final.w, west.initial.w + 44, 2.2, "scale-correct displayed resize width");
    close(parseFloat(west.final.width), Math.round((west.initial.w + 44) / (1.25 * 1.1)), 1, "scale-correct native resize width");
    const north = await resize(page, frame, "canvas-image", "n", 0, -32);
    close(north.preview.h, north.initial.h + 32, 2.2, "scale-correct live resize height");
    close(north.final.h, north.initial.h + 32, 2.2, "scale-correct displayed resize height");
    close(parseFloat(north.final.height), Math.round((north.initial.h + 32) / (1.25 * 1.1)), 1, "scale-correct native resize height");
    await travel(page, "undo");
    await travel(page, "undo");
    sameBox(await box(frame, "canvas-image"), moved, "scaled resize undo");
    await travel(page, "undo");
    sameBox(await box(frame, "canvas-image"), original, "scaled free conversion undo");
    out.checks.push(`west/north resize honors native units and opposite edges with the child's ${origin} transform origin; all geometry undoes`);
    out.writes = await writes(page);
    out.status = "passed";
  } catch (error) {
    out.object = await box(frame, "canvas-image");
    out.model = await model(page, "canvas-image");
    await page.screenshot({ path: path.join(OUTPUT_DIR, `direct-canvas-scaled-${origin}-failure.png`), fullPage: true });
    throw error;
  } finally { await context.close(); }
}

async function transfer(browser) {
  const { page, context, frame } = await open(browser, "en", { ancestorScale: 1.25 });
  const out = { name: "scaled-container-transfer", checks: [] };
  results.scenarios.push(out);
  try {
    await page.getByTestId("studio-tab-layers").click();
    await page.locator('[data-testid="studio-layer"][data-node="canvas-inner"]').click();
    await expect(page.getByTestId("studio-info")).toContainText("canvas-inner");
    // Selecting a layer intentionally scrolls the preview to that object.
    await page.waitForTimeout(350);
    const original = await box(frame, "canvas-inner"), child = await box(frame, "canvas-inner-label");
    const outside = await box(frame, "canvas-outside");
    const from = await screen(page, { x: original.x + original.w / 2, y: original.y + 8 });
    const target = await screen(page, { x: outside.x + outside.w * .65, y: outside.y + outside.h * .6 });
    out.before = { original, child, outside, from, target, layout: await page.evaluate(() => window.__canvasHarness.getLayout()) };
    await page.keyboard.down("Control");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 12 });
    await page.mouse.up();
    await page.keyboard.up("Control");
    await mutation(page, 0, "container transfer between differently scaled parents");
    const moved = await box(frame, "canvas-inner"), movedChild = await box(frame, "canvas-inner-label");
    out.after = { moved, movedChild, model: await model(page, "canvas-inner"), writes: await page.evaluate(() => window.__canvasHarness.getWrites()) };
    assert.equal((await model(page, "canvas-inner")).parentId, "canvas-outside");
    close(moved.w, original.w, 1.8, "transferred container width");
    close(moved.h, original.h, 1.8, "transferred container height");
    close(movedChild.w, child.w, 1.8, "transferred descendant width");
    close(movedChild.h, child.h, 1.8, "transferred descendant height");
    close(movedChild.x - moved.x, child.x - original.x, 1.8, "descendant local x");
    close(movedChild.y - moved.y, child.y - original.y, 1.8, "descendant local y");
    await travel(page, "undo");
    const restored = await box(frame, "canvas-inner"), restoredChild = await box(frame, "canvas-inner-label");
    // The rebuilt frame may scroll to its selection. Compare document coordinates.
    sameBox({ ...restored, y: restored.y + restored.scroll }, { ...original, y: original.y + original.scroll }, "container transfer undo");
    sameBox({ ...restoredChild, y: restoredChild.y + restoredChild.scroll }, { ...child, y: child.y + child.scroll }, "descendant transfer undo");
    out.checks.push("cross-scale container transfer preserves its whole subtree and undoes once");
    out.status = "passed";
    out.writes = await writes(page);
  } catch (error) {
    await page.screenshot({ path: path.join(OUTPUT_DIR, "direct-canvas-transfer-failure.png"), fullPage: true });
    throw error;
  } finally { await context.close(); }
}

async function safety(browser) {
  const { page, context, frame } = await open(browser, "en", { ancestorRotation: 12, objectPlaced: 1 });
  const out = { name: "rotated-holder-safety", checks: [] };
  results.scenarios.push(out);
  try {
    await page.getByTestId("studio-tab-layers").click();
    await page.locator('[data-testid="studio-layer"][data-node="canvas-image"]').click();
    await expect(page.getByTestId("studio-info")).toContainText("canvas-image");
    await page.waitForTimeout(350);
    const initial = await box(frame, "canvas-image");
    await expect(page.locator('[role="status"]')).toContainText("layout controls");
    assert.equal(await page.getByTestId("studio-handle").count(), 0);
    for (const mode of ["free", "flow"]) {
      await page.getByTestId(`studio-canvas-mode-${mode}`).click();
      await page.locator('[data-testid="studio-layer"][data-node="canvas-image"]').click();
      await expect(page.getByTestId("studio-info")).toContainText("canvas-image");
      await page.waitForTimeout(350);
      const current = await box(frame, "canvas-image");
      // The fixture intentionally overlaps the image's centre with an inner text.
      // Start on the image's unobscured right side, so this tests the placed image.
      const hit = { x: current.x + current.w * .8, y: current.y + current.h * .6 };
      assert.equal(await frame.locator("html").evaluate((_, point) => document.elementFromPoint(point.x, point.y)?.closest("[data-tree-node]")?.getAttribute("data-tree-node"), hit), "canvas-image");
      const from = await screen(page, hit);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + 40, from.y + 20, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      out[mode] = { writes: await page.evaluate(() => window.__canvasHarness.getWrites()) };
      assert.equal(await writes(page), 0, `unsupported ${mode} gesture does not save guessed coordinates`);
      sameBox(await box(frame, "canvas-image"), current, `unsupported ${mode} gesture`);
    }
    out.checks.push("placed objects under rotated holders cannot save guessed free coordinates in either canvas mode");
    out.status = "passed";
    out.writes = await writes(page);
  } finally { await context.close(); }
}

async function desktop(browser) {
  const { page, context, frame } = await open(browser, "en");
  const out = { name: "desktop", checks: [] };
  results.scenarios.push(out);
  try {
    await page.getByTestId("studio-canvas-mode-flow").click();
    await expect(page.getByTestId("studio-canvas-mode-flow")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("studio-canvas-mode-free").click();
    assert.equal(await writes(page), 0, "changing canvas modes does not mutate merchant data");
    out.checks.push("flow mode remains available; free is the default");
    const original = await box(frame, "canvas-image"), parent = await box(frame, "canvas-parent");
    assert.notEqual(original.position, "absolute", "fixture begins as an ordinary flow object");
    const target = { x: parent.x + 520, y: parent.y + 100 };
    const moved = await drag(page, frame, "canvas-image", target, "normal flow object moves freely");
    assert.equal((await model(page, "canvas-image")).parentId, "canvas-parent");
    assert.ok((await model(page, "canvas-image")).node.style.base.layer, "flow move becomes free placement");
    close(moved.x + moved.w / 2, target.x, 2.2, "free pointer x");
    close(moved.y + moved.h / 2, target.y, 2.2, "free pointer y");
    close(moved.w, original.w, 1, "flow width preserved");
    close(moved.h, original.h, 1, "flow height preserved");
    close((await box(frame, "canvas-parent")).h, parent.h, 1.8, "flow parent extent preserved");
    out.checks.push("ordinary flow image becomes free at the displayed pointer; size and parent extent preserved");
    await travel(page, "undo");
    assert.equal((await model(page, "canvas-image")).node.style.base.layer, undefined);
    sameBox(await box(frame, "canvas-image"), original, "undo initial free move");
    await travel(page, "redo");
    sameBox(await box(frame, "canvas-image"), moved, "redo initial free move");
    const inner = await box(frame, "canvas-inner"), oldParent = await box(frame, "canvas-parent");
    const into = { x: inner.x + inner.w * 0.66, y: inner.y + 110 };
    assert.ok(inside(into, oldParent), "nested drop pointer stays inside its original parent");
    const nested = await drag(page, frame, "canvas-image", into, "nested reparent inside original parent");
    assert.equal((await model(page, "canvas-image")).parentId, "canvas-inner");
    close(nested.x + nested.w / 2, into.x, 2.2, "nested pointer x");
    close(nested.y + nested.h / 2, into.y, 2.2, "nested pointer y");
    await travel(page, "undo");
    assert.equal((await model(page, "canvas-image")).parentId, "canvas-parent");
    sameBox(await box(frame, "canvas-image"), moved, "undo nested parent and position");
    await travel(page, "redo");
    assert.equal((await model(page, "canvas-image")).parentId, "canvas-inner");
    out.checks.push("nested container accepts its sibling inside the original parent; undo/redo restores both parent and position");
    const outer = await box(frame, "canvas-outside");
    const outside = await drag(page, frame, "canvas-image", { x: outer.x + 520, y: outer.y + 130 }, "drag out of nested container");
    assert.equal((await model(page, "canvas-image")).parentId, "canvas-outside");
    await travel(page, "undo");
    assert.equal((await model(page, "canvas-image")).parentId, "canvas-inner");
    sameBox(await box(frame, "canvas-image"), nested, "undo drag out");
    await travel(page, "redo");
    assert.equal((await model(page, "canvas-image")).parentId, "canvas-outside");
    out.checks.push("drag out into another container is one undoable move");
    const west = await resize(page, frame, "canvas-image", "w", -44, 0);
    const north = await resize(page, frame, "canvas-image", "n", 0, -32);
    await travel(page, "undo");
    sameBox(await box(frame, "canvas-image"), west.final, "undo north resize");
    await travel(page, "undo");
    sameBox(await box(frame, "canvas-image"), outside, "undo west resize");
    await travel(page, "redo");
    await travel(page, "redo");
    sameBox(await box(frame, "canvas-image"), north.final, "redo both resizes");
    out.checks.push("west/north resize previews the actual object, preserves the opposite edges and undoes size plus position atomically");
    await select(page, frame, "canvas-image");
    const cancelBefore = await writes(page), cancelBox = await box(frame, "canvas-image");
    const handle = page.locator('[data-testid="studio-handle"][data-handle="nw"]');
    const h = await handle.boundingBox(), scale = (await screen(page, { x: 0, y: 0 })).scale;
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x - 25 * scale, h.y - 20 * scale, { steps: 5 });
    await handle.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse", bubbles: true });
    await page.mouse.up();
    await page.waitForTimeout(300);
    assert.equal(await writes(page), cancelBefore, "pointer-cancelled resize has no writes");
    sameBox(await box(frame, "canvas-image"), cancelBox, "cancel restores actual size and position");
    const from = await screen(page, center(cancelBox));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x - 40 * scale, from.y + 15 * scale, { steps: 5 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.waitForTimeout(300);
    assert.equal(await writes(page), cancelBefore, "Escape-cancelled drag has no writes");
    sameBox(await box(frame, "canvas-image"), cancelBox, "cancel restores actual free position");
    out.checks.push("pointer cancellation and Escape restore preview without persisting writes");
    const beforeAdd = await page.evaluate(() => {
      const ids = [], visit = (node) => { ids.push(node.id); for (const child of node.children || []) visit(child); };
      visit(window.__canvasHarness.getDraft().tree.root);
      return ids;
    });
    const addWrites = await writes(page);
    await page.getByTestId("studio-tab-add").click();
    await page.locator('[data-testid="studio-add-item"][data-kind="stack"]').click();
    await mutation(page, addWrites, "add an empty native container");
    const added = await page.evaluate((known) => {
      let found = null;
      const visit = (node) => { if (!known.includes(node.id) && node.type === "stack") found = node; for (const child of node.children || []) visit(child); };
      visit(window.__canvasHarness.getDraft().tree.root);
      return found;
    }, beforeAdd);
    assert.ok(added, "Add panel inserts a native stack container");
    assert.equal((added.children || []).length, 0, "added container begins empty");
    assert.ok((await box(frame, added.id)).h >= 96, "empty real-frame container has a usable drop area");
    await travel(page, "undo");
    assert.equal((await model(page, added.id)).node, null, "one undo removes the added container");
    out.checks.push("the Add panel creates an empty native container with a visible drop area and a single undo");
    await select(page, frame, "canvas-image");
    out.writes = await writes(page);
    out.finalNode = await model(page, "canvas-image");
    await page.screenshot({ path: path.join(OUTPUT_DIR, "direct-canvas-desktop.png"), fullPage: true });
    out.status = "passed";
  } finally { await context.close(); }
}

async function touchGesture(cdp, from, to, cancel = false, beforeEnd = null) {
  const point = (p) => ({ x: p.x, y: p.y, radiusX: 1, radiusY: 1, force: 1, id: 1 });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point(from)] });
  for (let step = 1; step <= 10; step++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point({ x: from.x + (to.x - from.x) * step / 10, y: from.y + (to.y - from.y) * step / 10 })] });
  }
  if (beforeEnd) await beforeEnd();
  await cdp.send("Input.dispatchTouchEvent", { type: cancel ? "touchCancel" : "touchEnd", touchPoints: [] });
}
async function rtlTouch(browser) {
  const { page, context, frame } = await open(browser, "ar");
  const out = { name: "rtl-touch", checks: [] };
  results.scenarios.push(out);
  try {
    await expect(page.getByTestId("studio"), "RTL admin").toHaveAttribute("dir", "rtl");
    assert.equal(await page.evaluate(() => window.__canvasHarness.getLayout().dir), "rtl", "real storefront is RTL too");
    const cdp = await context.newCDPSession(page);
    const original = await box(frame, "canvas-button"), parent = await box(frame, "canvas-parent");
    const target = { x: parent.x + 500, y: parent.y + 95 };
    const from = await screen(page, center(original)), to = await screen(page, target), before = await writes(page);
    // Touch preserves scrolling until an element is selected, so use the real
    // editor's tap-to-select interaction before the direct manipulation gesture.
    await page.touchscreen.tap(from.x, from.y);
    await expect(page.getByTestId("studio-info")).toContainText("canvas-button");
    await touchGesture(cdp, from, to);
    await mutation(page, before, "native touch converts a flow button to free placement");
    const after = await box(frame, "canvas-button");
    assert.ok((await model(page, "canvas-button")).node.style.base.layer);
    close(after.w, original.w, 1.8, "touch width preserved");
    close(after.h, original.h, 1.8, "touch height preserved");
    close(after.x + after.w / 2, target.x, 8.5, "RTL touch x");
    close(after.y + after.h / 2, target.y, 8.5, "RTL touch y");
    out.checks.push("native touch freely moves a normal button in an RTL real-frame editor");
    const beforeCancel = await writes(page), startCancel = await screen(page, center(after));
    await touchGesture(cdp, startCancel, { x: startCancel.x - 45, y: startCancel.y + 20 }, true);
    await page.waitForTimeout(350);
    assert.equal(await writes(page), beforeCancel, "native touch cancellation does not persist");
    sameBox(await box(frame, "canvas-button"), after, "native touch cancellation restores position");
    const touchAction = await page.locator('[data-testid="studio-handle"][data-handle="w"]').evaluate((el) => getComputedStyle(el).touchAction);
    assert.equal(touchAction, "none", "resize controls reserve touch gestures");
    const handle = await page.locator('[data-testid="studio-handle"][data-handle="w"]').boundingBox();
    const handleStart = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    await touchGesture(cdp, handleStart, { x: handleStart.x - 36 * from.scale, y: handleStart.y }, false, async () => {
      const live = await box(frame, "canvas-button");
      assert.ok(live.w > after.w + 20, "native touch resizes the real object live");
      close(live.x + live.w, after.x + after.w, 1.8, "native touch live opposite edge");
      assert.equal(await writes(page), beforeCancel, "native touch size preview has no writes");
    });
    await mutation(page, beforeCancel, "native touch west resize");
    const resized = await box(frame, "canvas-button");
    close(resized.x + resized.w, after.x + after.w, 2, "native touch committed opposite edge");
    await travel(page, "undo");
    sameBox(await box(frame, "canvas-button"), after, "touch resize undo");
    await travel(page, "undo");
    sameBox(await box(frame, "canvas-button"), original, "touch move undo");
    out.checks.push("native touchCancel restores without writes; native west resize previews and commits the real object, preserves its opposite edge and undoes in one action");
    out.writes = await writes(page);
    await page.screenshot({ path: path.join(OUTPUT_DIR, "direct-canvas-rtl-touch.png"), fullPage: true });
    out.status = "passed";
  } finally { await context.close(); }
}

(async () => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.CANVAS_BROWSER_CHANNEL || "chrome", headless: true });
  try {
    const selected = (process.env.CANVAS_SCENARIOS || "flow-return,desktop,rtl-touch,scaled,transfer,safety").split(",");
    if (selected.includes("flow-return")) await flowReturn(browser);
    if (selected.includes("desktop")) await desktop(browser);
    if (selected.includes("rtl-touch")) await rtlTouch(browser);
    if (selected.includes("scaled")) { await scaled(browser, "top"); await scaled(browser, "bottom"); }
    if (selected.includes("transfer")) await transfer(browser);
    if (selected.includes("safety")) await safety(browser);
    assert.deepEqual(results.errors, [], "no runtime errors or external writes");
    results.status = "passed";
  } catch (error) {
    results.status = "failed";
    results.failure = { message: error.message, stack: error.stack };
    process.exitCode = 1;
  } finally {
    await browser.close();
    results.finishedAt = new Date().toISOString();
    await fs.writeFile(OUTPUT, JSON.stringify(results, null, 2));
    process.stdout.write(`Direct canvas browser ${results.status}: ${results.scenarios.map((scenario) => `${scenario.name} (${scenario.checks.length} checks)`).join(", ")}.\nReport: ${OUTPUT}\n`);
    if (results.failure) process.stderr.write(`${results.failure.message}\n`);
  }
})();
