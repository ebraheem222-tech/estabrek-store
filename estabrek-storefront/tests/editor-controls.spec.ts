import { expect, test, type Page } from "@playwright/test";

const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
const draft = (page: Page) => page.evaluate(() => (window as any).__canvasHarness.getDraft());
const readNode = (page: Page, id: string) => page.evaluate(nodeId => (window as any).__canvasHarness.getNode(nodeId)?.node, id);

async function selectOnCanvas(page: Page, id: string) {
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
  const target = frame(page).locator(`[data-tree-node="${id}"]`);
  // Adding an object reveals it and can scroll older objects outside the frame.
  await target.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
  const scroll = await target.evaluate(() => window.scrollY);
  await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness?.getLayout()?.scroll?.y), { timeout: 30000 }).toBe(scroll);
  // Draft persistence precedes the refreshed bridge geometry. Pick only once it arrives.
  await expect.poll(async () => Number(await page.getByTestId("studio-overlay").getAttribute("data-shapes")), { timeout: 30000 }).toBeGreaterThanOrEqual(4);
  const rect = await frame(page).locator(`[data-tree-node="${id}"]`).evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = await page.getByTestId("studio-frame").boundingBox();
  const viewport = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport);
  const scale = box!.width / viewport.w;
  await page.mouse.click(box!.x + rect.x * scale, box!.y + rect.y * scale);
  await expect(page.getByTestId("studio-info")).toContainText(id);
}

for (const lang of ["en", "ar"]) {
  test(`${lang}: canvas selection, persistent content controls, GLB entry and motion undo`, async ({ page }) => {
    test.setTimeout(120000);
    const externalWrites: string[] = [];
    page.on("request", request => { if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(request.url()) && request.method() !== "GET") externalWrites.push(request.url()); });
    await page.goto(`${url}?lang=${lang}`);
    await expect(page.getByTestId("studio")).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness?.getLayout()?.items?.length ?? 0), { timeout: 90000 }).toBeGreaterThanOrEqual(4);
    await frame(page).locator('[data-tree-node="drawing"]').evaluate(() => { (window as any).__editorDocument = "retained"; });

    await selectOnCanvas(page, "drawing");
    await expect(page.getByTestId("studio-svg")).toBeVisible();
    await page.getByTestId("studio-states").locator('[data-state="hover"]').click();
    await expect(page.getByTestId("studio-svg")).toBeVisible();
    await page.getByTestId("studio-svg-own").locator("summary").click();
    await page.getByTestId("studio-svg-file").setInputFiles({ name: "triangle.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg viewBox="0 0 20 20"><path d="M0 20 L10 0 L20 20 Z" fill="#3366ff"/></svg>') });
    await expect.poll(async () => (await readNode(page, "drawing"))?.props?.art?.viewBox).toBe("0 0 20 20");
    await expect(frame(page).locator('[data-tree-node="drawing"] svg')).toHaveAttribute("viewBox", "0 0 20 20");

    await selectOnCanvas(page, "model");
    await expect(page.getByTestId("studio-model3d")).toBeVisible();
    await page.getByTestId("studio-states").locator('[data-state="focused"]').click();
    await expect(page.getByTestId("studio-model3d")).toBeVisible();
    await page.getByTestId("model3d-file-open").click();
    await expect(page.getByTestId("scene-glb-upload")).toBeVisible();
    await page.getByTestId("scene-glb-file").setInputFiles({ name: "chair.glb", mimeType: "model/gltf-binary", buffer: Buffer.from("isolated multipart upload") });
    await expect.poll(async () => (await readNode(page, "model"))?.props?.file?.url).toBe("/templates/fixture.glb");
    await page.getByTestId("studio-undo").click();
    await expect.poll(async () => (await readNode(page, "model"))?.props?.file ?? null).toBeNull();

    await page.getByTestId("studio-states").locator('[data-state="normal"]').click();
    const preset = page.getByTestId("studio-motion").locator('[data-preset="float"]');
    await preset.click();
    await expect.poll(async () => (await readNode(page, "model"))?.motion?.loop?.kind).toBe("float");
    await preset.click();
    await expect.poll(async () => (await readNode(page, "model"))?.motion ?? null).toBeNull();
    await page.getByTestId("studio-undo").click();
    await expect.poll(async () => (await readNode(page, "model"))?.motion?.loop?.kind).toBe("float");
    await page.getByTestId("studio-redo").click();
    await expect.poll(async () => (await readNode(page, "model"))?.motion ?? null).toBeNull();

    await page.getByTestId("studio-section-add-svg").click();
    await expect.poll(async () => (await draft(page)).tree.root.children[0].children.filter((node: { type: string }) => node.type === "svg").length).toBe(2);
    await expect(page.getByTestId("studio-svg")).toBeVisible();
    await page.getByTestId("studio-undo").click();
    await expect.poll(async () => (await draft(page)).tree.root.children[0].children.filter((node: { type: string }) => node.type === "svg").length).toBe(1);
    await selectOnCanvas(page, "model");
    await page.getByTestId("studio-section-add-model3d").click();
    await expect.poll(async () => (await draft(page)).tree.root.children[0].children.filter((node: { type: string }) => node.type === "model3d").length).toBe(2);
    await expect(page.getByTestId("studio-model3d")).toBeVisible();
    await page.getByTestId("studio-undo").click();
    await expect.poll(async () => (await draft(page)).tree.root.children[0].children.filter((node: { type: string }) => node.type === "model3d").length).toBe(1);

    await expect.poll(async () => frame(page).locator('[data-tree-node="drawing"]').evaluate(() => (window as any).__editorDocument)).toBe("retained");
    expect((await draft(page)).rev).toBeGreaterThan(0);
    expect(externalWrites).toEqual([]);
  });
}

test("the current design restores its saved theme, mode and custom colours after another preview", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&theme=current`);
  await expect(page.getByTestId("studio")).toBeVisible();
  await expect(frame(page).locator("html")).toHaveAttribute("data-store-theme", "circuit", { timeout: 90000 });
  await page.getByTestId("studio-theme-toggle").click();
  await page.locator('[data-testid="studio-theme-option"][data-theme-id="ink-library"]').click();
  await expect(frame(page).locator("html")).toHaveAttribute("data-store-theme", "ink-library");
  await page.locator('[data-testid="studio-theme-option"][data-theme-id="circuit"]').click();
  await expect(frame(page).locator("html")).toHaveAttribute("data-store-theme", "circuit");
  const currentUrl = new URL(await page.getByTestId("studio-frame").getAttribute("src") as string);
  expect(currentUrl.searchParams.get("themeMode")).toBe("dark");
  expect(JSON.parse(currentUrl.searchParams.get("themeCustom")!)).toEqual({ palette: { dark: { accent: "#22cc88" } } });
  await expect.poll(() => frame(page).locator("html").evaluate(el => getComputedStyle(el).getPropertyValue("--th-accent").trim())).toBe("#22cc88");
  await expect(page.getByTestId("studio-theme-save")).toBeDisabled();
  await page.getByRole("button", { name: "As the store" }).click();
  await expect(page.getByRole("button", { name: "As the store" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("studio-theme-save")).toBeEnabled();
});
