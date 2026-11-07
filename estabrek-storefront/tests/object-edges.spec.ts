import { expect, test, type Page } from "@playwright/test";
const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const ready = (page: Page) => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
const node = (page: Page, id: string) => page.evaluate(value => (window as any).__canvasHarness.getNode(value)?.node, id);

test("SVG top/bottom render inside each native object's own host, including linked/replaced media and client widgets", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&objectEdges=1`); await ready(page);
  for (const type of ["heading", "text", "button", "image", "video", "svg", "model3d", "accordion", "pricing", "filterGallery", "marquee", "icon", "divider", "spacer", "stack", "chart", "clock", "instrument"]) {
    const host = frame(page).locator(`[data-tree-node="edge-${type}"]`);
    await expect(host, type).toHaveCount(1);
    await expect(host.locator(":scope > .pt-edge-top"), `${type}: SVG top`).toHaveCount(1);
    await expect(host.locator(":scope > .pt-edge-bottom"), `${type}: SVG bottom`).toHaveCount(1);
    const geometry = await host.evaluate(el => {
      const box = el.getBoundingClientRect();
      return { width: box.width, height: box.height, edge: getComputedStyle(el.querySelector(".pt-edge")!).position };
    });
    expect(geometry.width, type).toBeCloseTo(240, 0);
    expect(geometry.height, type).toBeCloseTo(type === "spacer" ? 40 : 140, 0);
    expect(geometry.edge).toBe("absolute");
    const artwork = await host.locator(":scope > .pt-edge-top").evaluate(el => {
      const band = el.getBoundingClientRect(), svg = el.querySelector("svg")!.getBoundingClientRect();
      return { bandW: band.width, bandH: band.height, svgW: svg.width, svgH: svg.height };
    });
    expect(artwork.svgW, `${type}: edge artwork width`).toBeCloseTo(artwork.bandW, 0);
    expect(artwork.svgH, `${type}: edge artwork height`).toBeCloseTo(artwork.bandH, 0);
  }
  await expect(frame(page).locator('[data-tree-node="edge-image"]')).toHaveClass(/pt-frame/);
  await expect(frame(page).locator('[data-tree-node="edge-button"]')).toHaveAttribute("href", /shop/);
});

for (const lang of ["en", "ar"]) test(`${lang}: an object's SVG top and bottom can be edited, removed and undone independently`, async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=${lang}`); await ready(page);
  await page.getByTestId("studio-page-motion-open").click();
  await page.locator('[data-testid="studio-layer"][data-node="objects"]').click();
  await page.locator('[data-testid="studio-layer"][data-node="questions"]').click();
  await frame(page).locator('[data-tree-node="questions"]').evaluate(() => { (window as any).__edgeDocument = "retained"; });
  for (const side of ["top", "bottom"]) {
    await page.getByTestId(`studio-edge-pick-${side}`).click();
    await page.getByTestId("decor-grid").locator("button[data-decor]").first().click();
    await expect.poll(async () => (await node(page, "questions"))?.props?.edges?.[side]?.height).toBe(80);
    await ready(page);
    await expect(frame(page).locator(`[data-tree-node="questions"] > .pt-edge-${side} svg`)).toHaveCount(1);
  }
  const bottom = (await node(page, "questions")).props.edges.bottom;
  await page.getByTestId("studio-edge-remove-top").click();
  await expect.poll(async () => (await node(page, "questions"))?.props?.edges?.top ?? null).toBeNull();
  await ready(page);
  expect((await node(page, "questions")).props.edges.bottom).toEqual(bottom);
  await page.getByTestId("studio-undo").click(); await ready(page);
  await expect(frame(page).locator('[data-tree-node="questions"] > .pt-edge-top')).toHaveCount(1);
  expect(await frame(page).locator("html").evaluate(() => (window as any).__edgeDocument)).toBe("retained");
});

test("popup bands belong to the actual dialog and disappear when it closes", async ({ page }) => {
  const art = { viewBox: "0 0 200 40", nodes: [{ t: "path", a: { d: "M0 20L100 0L200 20V40H0Z", fill: "currentColor" } }] };
  const edge = { art, height: 24, color: "accent", front: true };
  await page.request.post("http://127.0.0.1:4100/__test/preview-draft", { data: { pageId: "popup-edges", sections: [], rev: 1, updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "popup-target", type: "popup", props: { label: { en: "Decorated popup" }, trigger: "click", often: "always", edges: { top: edge, bottom: edge } }, children: [{ id: "popup-copy", type: "text", props: { text: { en: "Popup content" } } }] }] } } } });
  // Top-level visit uses the customer's dialog mode rather than the editor's inline surface.
  await page.goto("http://127.0.0.1:3000/en/studio-frame?token=good-draft");
  const host = page.locator('[data-tree-node="popup-target"]');
  const dialog = host.locator("dialog");
  await expect(dialog).toHaveCount(1);
  await expect(host.locator(":scope > .pt-edge")).toHaveCount(0);
  await expect(dialog.locator(":scope > .pt-edge")).toHaveCount(2);
  await dialog.evaluate(el => (el as HTMLDialogElement).showModal());
  await expect(dialog.locator(":scope > .pt-edge-top")).toBeVisible();
  expect(await dialog.locator(":scope > .pt-edge-top").evaluate(el => (el as HTMLElement).offsetParent?.tagName)).toBe("DIALOG");
  await dialog.evaluate(el => (el as HTMLDialogElement).close());
  await expect(dialog.locator(":scope > .pt-edge-top")).toBeHidden();
});

for (const engine of ["gsap", "anime"]) test(`${engine}: text motion keeps SVG bands outside its masks and restores them on cleanup`, async ({ page }) => {
  test.setTimeout(120000);
  const art = { viewBox: "0 0 200 40", nodes: [{ t: "path", a: { d: "M0 20L100 0L200 20V40H0Z", fill: "currentColor" } }] };
  const edge = { art, height: 24, color: "accent", front: true };
  const content = (moving = true) => ({ pageId: "text-edge-motion", sections: [], rev: moving ? 1 : 2, updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "text-section", type: "section", props: {}, children: ["lines", "typing", "typewriter"].map(kind => ({ id: `edge-${kind}`, type: "heading", props: { text: { en: "Decorated words on more than one line" }, edges: { top: edge, bottom: edge } }, style: { base: { width: "240px", ...(kind === "typewriter" ? {} : { height: "140px" }) } }, ...(moving ? { motion: { engine, ...(kind === "lines" ? { enter: { kind: "lines", duration: .2 } } : kind === "typewriter" ? { enter: { kind: "typewriter", duration: 8 } } : { loop: { kind: "type", duration: .5 } }) } } : {}) })) }] } } });
  await page.request.post("http://127.0.0.1:4100/__test/preview-draft", { data: content() });
  await page.goto(`http://127.0.0.1:4100/__studio-harness?src=${encodeURIComponent("/studio-frame?token=good-draft")}`);
  const view = page.frameLocator("#f");
  await expect(view.locator('[data-tree-node="edge-lines"] > .pt-edge-top')).toHaveCount(1);
  const typewriter = view.locator('[data-tree-node="edge-typewriter"]');
  const originalHeight = await typewriter.evaluate(el => el.getBoundingClientRect().height);
  await page.evaluate(() => (window as any).send({ type: "motionLive", on: true }));
  await expect.poll(() => view.locator('[data-tree-node="edge-lines"] div').count()).toBeGreaterThan(0);
  await expect(typewriter.locator(".pt-typing")).toHaveCount(1);
  expect(await typewriter.evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(originalHeight, 0);
  for (const kind of ["lines", "typing", "typewriter"]) {
    const host = view.locator(`[data-tree-node="edge-${kind}"]`);
    await expect(host.locator(":scope > .pt-edge-top"), kind).toHaveCount(1);
    await expect(host.locator(":scope > .pt-edge-bottom"), kind).toHaveCount(1);
    expect(await host.locator(":scope > .pt-edge-top").evaluate(el => (el as HTMLElement).offsetParent?.getAttribute("data-tree-node"))).toBe(`edge-${kind}`);
  }
  await page.request.post("http://127.0.0.1:4100/__test/preview-draft", { data: content(false) });
  await page.evaluate(() => (window as any).send({ type: "refreshView", requestId: "clear-text-edges" }));
  for (const kind of ["lines", "typing", "typewriter"]) {
    const host = view.locator(`[data-tree-node="edge-${kind}"]`);
    await expect(host).not.toHaveAttribute("data-pt-motion");
    await expect(host.locator(":scope > .pt-edge")).toHaveCount(2);
    await expect(host).toContainText("Decorated words on more than one line");
  }
});
