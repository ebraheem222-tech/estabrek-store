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
  await expect(page.getByTestId("studio"), `${label}: the updated view commits before editing resumes`).toHaveAttribute("data-busy", "0", { timeout: 45_000 });
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
async function resize(page, frame, id, handle, dx, dy, alreadySelected = false, onPreview = null) {
  if (!alreadySelected) await select(page, frame, id);
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
  if (onPreview) await onPreview(preview, initial);
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
    // A rotated flat holder is supported now; an explicit nonflattened 3D
    // context remains outside the plane-editing contract.
    await frame.locator('[data-tree-node="canvas-parent"]').evaluate(el=>el.style.transformStyle="preserve-3d");
    await expect.poll(()=>page.evaluate(()=>window.__canvasHarness.getLayout()?.items.find(item=>item.id==="canvas-image")?.geometry?.unsupported)).toBe(true);
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
    out.checks.push("unsupported nonflattened 3D contexts cannot save guessed coordinates in either canvas mode");
    out.status = "passed";
    out.writes = await writes(page);
  } finally { await context.close(); }
}

async function analyticEngine(browser,kind="rotated") {
  const {page,context,frame}=await open(browser,"en",{objectPlaced:1,ancestorRotation:kind==="nonuniform"?0:24,...(kind==="perspective"?{objectTilt:35}:{})});
  const out={name:`analytic-${kind}`,checks:[]};results.scenarios.push(out);
  const geometry=()=>page.evaluate(()=>window.__canvasHarness.getLayout()?.items.find(item=>item.id==="canvas-image")?.geometry);
  const point=async(u,v)=>{const data=await geometry(),m=data.plane.matrix,w=data.plane.w,h=data.plane.h;const x=u*w,y=v*h,q=m[6]*x+m[7]*y+m[8];return {x:(m[0]*x+m[1]*y+m[2])/q,y:(m[3]*x+m[4]*y+m[5])/q};};
  const resized=async()=>{
    const fixed=await point(0,0),h=await page.locator('[data-testid="studio-handle"][data-handle="se"]').boundingBox();assert.ok(h,"projected SE handle exists");
    const before=await writes(page);await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+44,h.y+h.height/2+32,{steps:12});await page.mouse.up();await mutation(page,before,"analytic resize commits once");
    const after=await point(0,0);close(after.x,fixed.x,.7,"fixed projected corner x");close(after.y,fixed.y,.7,"fixed projected corner y");
    return before;
  };
  try {
    if(kind==="nonuniform"){
      await frame.locator('[data-tree-node="canvas-parent"]').evaluate(el=>el.style.transform="matrix(1.1,0.25,0.3,0.85,0,0)");
      await expect.poll(()=>page.evaluate(()=>window.__canvasHarness.getLayout()?.items.find(item=>item.id==="canvas-image")?.parentScale)).toBeNull();
    }
    await page.getByTestId("studio-tab-layers").click();await page.locator('[data-testid="studio-layer"][data-node="canvas-image"]').click();
    await expect(page.getByTestId("studio-plane-outline")).toBeVisible();await page.waitForTimeout(350);
    await frame.locator("html").evaluate(()=>{window.__analyticNonce="kept";});
    await resized();out.checks.push("projected local handles resize inside the real transformed holder with a fixed opposite corner");
    await travel(page,"undo");close((await geometry()).plane.w,180,.2,"undo restores local width");
    out.checks.push("undo restores local geometry while keeping the iframe document");
    if(kind==="rotated"){
      let before=await writes(page);await page.getByTestId("studio-movement-horizontal").click();await mutation(page,before,"persistent horizontal mode saves");
      const oldLayer=(await model(page,"canvas-image")).node.style.base.layer;
      const startDoc=await point(.95,.5),scroll=await frame.locator("html").evaluate(()=>window.scrollY),from=await screen(page,{x:startDoc.x,y:startDoc.y-scroll});
      before=await writes(page);await page.keyboard.down("Control");await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(from.x+68,from.y+54,{steps:12});await page.mouse.up();await page.keyboard.up("Control");await mutation(page,before,"holder-local horizontal movement");
      const layer=(await model(page,"canvas-image")).node.style.base.layer;close(layer.y,oldLayer.y,.00001,"horizontal lock keeps local y");assert.ok(Math.abs(layer.x-oldLayer.x)>1,"horizontal motion changes local x");
      before=await writes(page);await page.keyboard.press("Alt+ArrowDown");await page.waitForTimeout(650);assert.equal(await writes(page),before,"keyboard cannot bypass horizontal lock");
      out.checks.push("horizontal motion follows the holder's rotated axis and keyboard cannot move the locked axis");
      before=await writes(page);await page.getByTestId("constraint-maxWidth").fill("200");await page.getByTestId("constraint-maxWidth").press("Enter");await mutation(page,before,"size constraint saves");
      await resized();assert.ok((await geometry()).plane.w<=200.1,"required max width caps direct resize");
      out.checks.push("required size limits persist and constrain the real resize");
      await page.locator('[data-testid="studio-layer"][data-node="canvas-button"]').click();before=await writes(page);await page.getByTestId("studio-movement-horizontal").click();await mutation(page,before,"second constrained keyboard target saves");
      await page.locator('[data-testid="studio-layer"][data-node="canvas-image"]').click();const originalX=(await model(page,"canvas-image")).node.style.base.layer.x;
      before=await writes(page);await page.keyboard.press("Alt+ArrowRight");await page.locator('[data-testid="studio-layer"][data-node="canvas-button"]').click();await page.keyboard.press("Alt+ArrowRight");await mutation(page,before,"switching nudge target saves only the current selection");
      close((await model(page,"canvas-image")).node.style.base.layer.x,originalX,.000001,"cancelled nudge never changes the earlier selection");
      out.checks.push("changing selection cancels a pending keyboard gesture instead of moving the previous object");
    }
    assert.equal(await frame.locator("html").evaluate(()=>window.__analyticNonce),"kept","analytic edits keep preview document identity");
    out.status="passed";out.writes=await writes(page);
  }catch(error){out.geometry=await geometry();out.model=await model(page,"canvas-image");await page.screenshot({path:path.join(OUTPUT_DIR,`analytic-${kind}-failure.png`),fullPage:true});throw error;}
  finally{await context.close();}
}

async function constrainedTransfer(browser){
 const {page,context,frame}=await open(browser,"en",{constrained:1});const out={name:"constrained-free-transfer",checks:[]};results.scenarios.push(out);
 try{const outside=await box(frame,"canvas-outside");await drag(page,frame,"canvas-image",{x:outside.x+outside.w*.65,y:outside.y+outside.h*.55},"a constrained free object can still change containers");assert.equal((await model(page,"canvas-image")).parentId,"canvas-outside");assert.equal((await model(page,"canvas-image")).node.style.base.constraints.minWidth,100);out.checks.push("size constraints preserve representable free reparenting");out.status="passed";}finally{await context.close();}
}

async function analyticGroup(browser,tilted=false){
 const {page,context,frame}=await open(browser,"en",{ancestorRotation:24,percentageGroup:1,...(tilted?{groupTilt:30}:{})});const out={name:tilted?"analytic-group-perspective":"analytic-group-intrinsic",checks:[]};results.scenarios.push(out);
 const geometry=()=>page.evaluate(()=>window.__canvasHarness.getLayout()?.items.find(item=>item.id==="canvas-inner")?.geometry?.plane);
 const fixed=async()=>{const g=await geometry(),m=g.matrix,x=0,y=g.h/2,w=m[6]*x+m[7]*y+m[8];return{x:(m[0]*x+m[1]*y+m[2])/w,y:(m[3]*x+m[4]*y+m[5])/w};};
 try{
  await page.getByTestId("studio-tab-layers").click();await page.locator('[data-testid="studio-layer"][data-node="canvas-inner"]').click();await page.getByTestId("studio-scale-contents").check();await page.waitForTimeout(350);
  const before=await geometry(),beforeStyle=(await model(page,"canvas-inner")).node.style.base,child=await box(frame,"canvas-inner-label"),anchor=await fixed(),h=await page.locator('[data-testid="studio-handle"][data-handle="e"]').boundingBox();assert.ok(h);
  const count=await writes(page);await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+58,h.y+h.height/2+26,{steps:12});await page.mouse.up();await mutation(page,count,"transformed intrinsic content scaling");
  const after=await geometry(),afterStyle=(await model(page,"canvas-inner")).node.style.base,afterAnchor=await fixed();close(after.w,before.w,.1,"group raw width stays intrinsic");close(after.h,before.h,.1,"group raw height stays intrinsic");assert.equal(afterStyle.layer,beforeStyle.layer);assert.equal(afterStyle.width,beforeStyle.width);assert.equal(afterStyle.height,beforeStyle.height);assert.ok(afterStyle.scale>1.05);close(afterAnchor.x,anchor.x,.7,"group fixed edge x");close(afterAnchor.y,anchor.y,.7,"group fixed edge y");assert.ok((await box(frame,"canvas-inner-label")).w>child.w*1.05,"nested content grows with the group");
  await travel(page,"undo");close((await box(frame,"canvas-inner-label")).w,child.w,.7,"undo restores descendant size");out.checks.push("content scaling preserves transformed group's intrinsic context, descendants and fixed edge and undoes once");out.status="passed";
 }finally{await context.close();}
}

async function groupScale(browser, lang) {
  const { page, context, frame } = await open(browser, lang, lang === "ar" ? { ancestorScale: 1.25, ancestorOrigin: "top" } : {});
  const out = { name: `group-scale-${lang}`, checks: [] };
  results.scenarios.push(out);
  const ids = ["canvas-parent", "canvas-image", "canvas-button", "canvas-inner", "canvas-inner-label"];
  const boxes = async () => Object.fromEntries(await Promise.all(ids.map(async id => { const b = await box(frame, id); return [id, { ...b, y: b.y + b.scroll }]; })));
  const compare = (actual, wanted, label) => { for (const id of ids) sameBox(actual[id], wanted[id], `${label}/${id}`); };
  const proportional = (actual, original, label) => {
    const parent = actual[ids[0]], before = original[ids[0]], ratio = parent.w / before.w;
    close(parent.h / before.h, ratio, .01, `${label}/parent aspect ratio`);
    for (const id of ids.slice(1)) {
      close(actual[id].w, original[id].w * ratio, 2, `${label}/${id}/width`);
      close(actual[id].h, original[id].h * ratio, 2, `${label}/${id}/height`);
      close(actual[id].x - parent.x, (original[id].x - before.x) * ratio, 2, `${label}/${id}/local x`);
      close(actual[id].y - parent.y, (original[id].y - before.y) * ratio, 2, `${label}/${id}/local y`);
    }
  };
  try {
    await page.getByTestId("studio-tab-layers").click();
    await page.locator('[data-testid="studio-layer"][data-node="canvas-parent"]').click();
    await page.waitForTimeout(350);
    const option = page.getByTestId("studio-scale-contents");
    await expect(option).not.toBeChecked(); await option.check();
    const original = await boxes(), childStyles = {};
    for (const id of ids.slice(1)) childStyles[id] = (await model(page, id)).node.style;
    await resize(page, frame, "canvas-parent", "e", 100, 0, true, async () => proportional(await boxes(), original, "live growth"));
    const grown = await boxes();
    proportional(grown, original, "committed growth");
    for (const id of ids.slice(1)) assert.deepEqual((await model(page, id)).node.style, childStyles[id], `${id} authored style stays intact`);
    out.checks.push("container resize scales pictures, buttons, nested containers and grandchild text live and after one commit without rewriting child styles");
    await resize(page, frame, "canvas-parent", "w", 80, 0, true, async () => proportional(await boxes(), grown, "live shrink"));
    const shrunk = await boxes();
    proportional(shrunk, grown, "committed shrink");
    assert.ok(shrunk[ids[0]].w < grown[ids[0]].w, "shrinking the container shrinks the subtree");
    await travel(page, "undo"); compare(await boxes(), grown, "undo shrink");
    await travel(page, "redo"); compare(await boxes(), shrunk, "redo shrink");
    await travel(page, "undo"); await travel(page, "undo"); compare(await boxes(), original, "undo group conversion");
    out.checks.push("shrink, undo and redo preserve the whole group's proportions and positions");
    const count = await writes(page), h = await page.locator('[data-testid="studio-handle"][data-handle="e"]').boundingBox();
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
    await page.mouse.move(h.x + 65, h.y + h.height / 2, { steps: 8 });
    await page.keyboard.press("Escape"); await page.mouse.up(); await page.waitForTimeout(150);
    assert.equal(await writes(page), count, "cancelled group resize saves nothing"); compare(await boxes(), original, "cancelled group preview");
    await option.uncheck(); assert.equal(await writes(page), count, "the frame-only option is a browser preference");
    await resize(page, frame, "canvas-parent", "e", 100, 0, true);
    const frameOnly = await boxes();
    close(frameOnly[ids[0]].w, original[ids[0]].w + 100, 2, "frame-only width");
    for (const id of ids.slice(1)) { close(frameOnly[id].w, original[id].w, 2, `${id} keeps width in frame-only mode`); close(frameOnly[id].h, original[id].h, 2, `${id} keeps height in frame-only mode`); }
    await travel(page, "undo"); await option.check();
    out.checks.push("Escape cancels without writes, and frame-only resizing keeps descendant sizes unchanged");
    await page.locator('[data-testid="studio-layer"][data-node="canvas-image"]').click(); await page.waitForTimeout(350);
    const parentBefore = await box(frame, "canvas-parent");
    await resize(page, frame, "canvas-image", "e", 36, 0, true);
    const parentAfter = await box(frame, "canvas-parent");
    close(parentAfter.w, parentBefore.w, 1, "independent child resizing leaves parent width intact");
    close(parentAfter.h, parentBefore.h, 1, "independent child resizing leaves parent height intact");
    out.checks.push("a child remains independently resizable while the parent keeps its dimensions");
    out.status = "passed"; out.writes = await writes(page);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `direct-canvas-group-${lang}.png`), fullPage: true });
  } catch (error) {
    out.draft = await page.evaluate(() => window.__canvasHarness.getDraft());
    await page.screenshot({ path: path.join(OUTPUT_DIR, `direct-canvas-group-${lang}-failure.png`), fullPage: true });
    throw error;
  } finally { await context.close(); }
}

async function intrinsicGroup(browser, placed) {
  const { page, context, frame } = await open(browser, "en", { percentageGroup: 1, groupPlaced: placed ? 1 : 0 });
  const out = { name: `intrinsic-group-${placed ? "free" : "flow"}`, checks: [] };
  results.scenarios.push(out);
  try {
    await page.getByTestId("studio-tab-layers").click();
    await page.locator('[data-testid="studio-layer"][data-node="canvas-inner"]').click();
    await page.waitForTimeout(350);
    await page.getByTestId("studio-scale-contents").check();
    const before = await box(frame, "canvas-inner"), child = await box(frame, "canvas-inner-label"), spacer = await box(frame, "percentage-spacer");
    close(before.h, 184, .1, "intrinsic fixture height"); close(child.h, 60, .1, "percentage-height child begins intrinsic"); close(spacer.h, 60, .1, "spacer begins at authored height");
    const check = async () => {
      close((await box(frame, "canvas-inner-label")).h, child.h * 1.25, 1, "percentage child scales without flex redistribution");
      close((await box(frame, "percentage-spacer")).h, spacer.h * 1.25, 1, "spacer scales without flex shrink");
    };
    await resize(page, frame, "canvas-inner", "e", 100, 0, true, check); await check();
    const saved = (await model(page, "canvas-inner")).node.style.base;
    assert.equal(saved.height, undefined, "auto height is not frozen to pixels"); assert.equal(saved.width, "400px", "raw layout width is retained");
    assert.equal(Boolean(saved.layer), placed, "group scaling preserves its original positioning context");
    await travel(page, "undo");
    close((await box(frame, "canvas-inner-label")).h, child.h, 1, "intrinsic child undo");
    close((await box(frame, "percentage-spacer")).h, spacer.h, 1, "spacer undo");
    out.checks.push("auto-height and percentage-height layouts scale as a whole without redistributing child heights, in preview, commit and undo");
    out.status = "passed"; out.writes = await writes(page);
  } finally { await context.close(); }
}

async function autoWidthGroup(browser) {
  const { page, context, frame } = await open(browser, "en", { autoWidthGroup: 1 });
  const out = { name: "auto-width-free-group", checks: [] }; results.scenarios.push(out);
  try {
    await page.getByTestId("studio-tab-layers").click(); await page.locator('[data-testid="studio-layer"][data-node="canvas-inner"]').click(); await page.waitForTimeout(350);
    await page.getByTestId("studio-scale-contents").check();
    const original = await box(frame, "canvas-inner"), child = await box(frame, "canvas-inner-label");
    const layer = (await model(page, "canvas-inner")).node.style.base.layer;
    close(original.w, 400, 1, "auto-width fixture fills the available inset width");
    const check = async () => { close((await box(frame, "canvas-inner")).w, original.w * 1.25, 1, "auto-width group rendered width"); close((await box(frame, "canvas-inner-label")).w, child.w * 1.25, 1, "auto-width child's width scales faithfully"); };
    await resize(page, frame, "canvas-inner", "e", 100, 0, true, check); await check();
    const saved = (await model(page, "canvas-inner")).node.style.base;
    assert.deepEqual(saved.layer, layer, "automatic-width group keeps its original insets"); assert.equal(saved.width, undefined); assert.equal(saved.height, undefined);
    await travel(page, "undo"); close((await box(frame, "canvas-inner")).w, original.w, 1, "auto-width group undo");
    out.checks.push("an absolute auto-width group keeps its raw shrink-to-fit layout and insets while its full content scales"); out.status = "passed"; out.writes = await writes(page);
  } finally { await context.close(); }
}

async function livePreview(browser) {
  const { page, context, frame } = await open(browser, "en", { liveState: 1 });
  const out = { name: "live-preview-document", checks: [] }; results.scenarios.push(out);
  try {
    const documents = [];
    page.on("request", request => { if (request.isNavigationRequest() && request.resourceType() === "document") documents.push(request.url()); });
    await frame.locator('[data-tree-node="preview-deck"] [role="tab"]').nth(1).evaluate(el => el.click());
    await expect(frame.locator('[data-tree-node="preview-deck"] [data-deck-at]')).toHaveAttribute("data-deck-at", "1");
    const volume = frame.locator('[data-tree-node="preview-instrument"] input[aria-label="Volume"]');
    await volume.press("ArrowRight"); await expect(volume).toHaveValue("0.45");
    await expect(frame.locator('[data-tree-node="canvas-button"]')).toHaveAttribute("data-pt-engine","gsap",{timeout:30000});
    await frame.locator("html").evaluate(() => { window.__previewDocumentNonce = "same-preview-document"; window.__unaffectedNode = document.querySelector('[data-tree-node="canvas-outside-label"]'); window.scrollTo(0,100); });
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelector('[data-testid="studio-frame"]').contentWindow.postMessage({source:"estabrek-studio",type:"previewLook",nodeId:"canvas-image",vars:{opacity:.35}},"http://127.0.0.1:3000"));
    const stable = async (scroll = false) => {
      assert.equal(await frame.locator("html").evaluate(() => window.__previewDocumentNonce), "same-preview-document", "saving keeps the preview document alive");
      assert.equal(await frame.locator("html").evaluate(() => window.__unaffectedNode === document.querySelector('[data-tree-node="canvas-outside-label"]')), true, "an unaffected view keeps its DOM node");
      await expect(frame.locator('[data-tree-node="preview-deck"] [data-deck-at]')).toHaveAttribute("data-deck-at", "1");
      await expect(volume).toHaveValue("0.45");
      assert.deepEqual(documents, [], "edits do not navigate or reload the preview document");
      if (scroll) close(await frame.locator("html").evaluate(() => window.scrollY), 100, 1, "preview scroll stays in place");
    };
    await resize(page, frame, "canvas-image", "e", 40, 0);
    close(Number(await frame.locator('[data-tree-node="canvas-image"]').evaluate(el=>getComputedStyle(el).opacity)),1,.001,"committing a view releases temporary opacity overrides");
    await stable(true); await travel(page,"undo"); await stable(true); await travel(page,"redo"); await stable(true);
    out.checks.push("resize, undo and redo preserve document identity, unaffected DOM, scroll and a client widget's selected tab");
    await page.getByTestId("studio-tab-add").click();
    const beforeAdd = await writes(page);
    await page.locator('[data-testid="studio-add-item"][data-kind="text"]').click(); await mutation(page,beforeAdd,"insert updates the current view");
    const inserted = await page.evaluate(() => window.__canvasHarness.getWrites().at(-1).ops.find(op => op.op === "insert")?.node.id);
    assert.ok(inserted); await expect(frame.locator(`[data-tree-node="${inserted}"]`)).toHaveCount(1); await stable();
    await travel(page,"undo"); await expect(frame.locator(`[data-tree-node="${inserted}"]`)).toHaveCount(0); await stable();
    out.checks.push("inserting/removing a view reconciles only its tree branch and keeps an unrelated client widget alive");
    await page.getByTestId("studio-tab-layers").click();
    for (const [html, text] of [["<strong>New bold label</strong>","New bold label"],["<em>New italic label</em>","New italic label"]]) {
      await page.locator('[data-testid="studio-layer"][data-node="canvas-button"]').click(); await page.getByTestId("studio-edit-node").click();
      const edit = frame.locator('[data-tree-node="canvas-button"][contenteditable="true"]'); await expect(edit).toHaveCount(1);
      await edit.evaluate((el,value) => { el.innerHTML = value; },html);
      const beforeText = await writes(page); await edit.press("Enter"); await mutation(page,beforeText,"formatted text updates its view");
      await expect(frame.locator('[data-tree-node="canvas-button"]')).toContainText(text); await stable();
    }
    out.checks.push("successive formatted inline edits update their text view without resetting the document or unrelated client state");
    await page.locator('[data-testid="studio-layer"][data-node="preview-instrument"]').click();
    const beforeConfig = await writes(page); await page.getByTestId("instrument-melody").getByRole("button",{name:"Jingle Bells",exact:true}).click(); await mutation(page,beforeConfig,"changed widget configuration updates its own view");
    await expect(frame.locator('[data-tree-node="preview-instrument"] [data-instrument-song]')).toHaveValue("jingle");
    assert.equal(await frame.locator("html").evaluate(() => window.__previewDocumentNonce), "same-preview-document");
    await expect(frame.locator('[data-tree-node="preview-deck"] [data-deck-at]')).toHaveAttribute("data-deck-at", "1");
    out.checks.push("a widget's edited configuration updates that widget while preserving unrelated client state");
    const version = await frame.locator("[data-studio-view-version]").getAttribute("data-studio-view-version");
    await page.getByTestId("studio-refresh-view").click(); await expect.poll(() => frame.locator("[data-studio-view-version]").getAttribute("data-studio-view-version")).not.toBe(version);
    await frame.locator('[data-tree-node="canvas-button"]').evaluate(el => { el.setAttribute("data-pt-motion",JSON.stringify({engine:"anime",loop:{kind:"pulse"}})); window.dispatchEvent(new Event("studio-view-updated")); });
    await expect(frame.locator('[data-tree-node="canvas-button"]')).toHaveAttribute("data-pt-engine","anime",{timeout:30000});
    out.checks.push("motion runtime reconciles changed targets/config while the document stays alive");
    out.status = "passed"; out.writes = await writes(page);
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
    const selected = (process.env.CANVAS_SCENARIOS || "flow-return,desktop,rtl-touch,scaled,transfer,safety,group,intrinsic,autowidth,live-preview,analytic").split(",");
    if (selected.includes("flow-return")) await flowReturn(browser);
    if (selected.includes("desktop")) await desktop(browser);
    if (selected.includes("rtl-touch")) await rtlTouch(browser);
    if (selected.includes("scaled")) { await scaled(browser, "top"); await scaled(browser, "bottom"); }
    if (selected.includes("transfer")) await transfer(browser);
    if (selected.includes("safety")) await safety(browser);
    if (selected.includes("group")) { await groupScale(browser, "en"); await groupScale(browser, "ar"); }
    if (selected.includes("intrinsic")) { await intrinsicGroup(browser, false); await intrinsicGroup(browser, true); }
    if (selected.includes("autowidth")) await autoWidthGroup(browser);
    if (selected.includes("live-preview")) await livePreview(browser);
    if(selected.includes("analytic")){await analyticEngine(browser);await analyticEngine(browser,"nonuniform");await analyticEngine(browser,"perspective");await constrainedTransfer(browser);await analyticGroup(browser);await analyticGroup(browser,true);}
    if(selected.includes("analytic-group")){await analyticGroup(browser);await analyticGroup(browser,true);}
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
