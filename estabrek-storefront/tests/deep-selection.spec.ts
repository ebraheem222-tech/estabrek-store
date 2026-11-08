import { expect, test, type Page, type Locator } from "@playwright/test";
const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');
async function canvasPoint(page: Page, element: Locator) {
  const rect = await element.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const box = await page.getByTestId("studio-frame").boundingBox();
  const width = await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w);
  const scale = box!.width / width;
  return { x: box!.x + rect.x * scale, y: box!.y + rect.y * scale };
}
async function clickPart(page: Page, selector: string, modifiers?: ("Alt" | "Control")[]) {
  const target = frame(page).locator(selector).first();
  const p = await canvasPoint(page, target);
  if (modifiers) for (const mod of modifiers) await page.keyboard.down(mod);
  await page.mouse.click(p.x, p.y);
  if (modifiers) for (const mod of modifiers) await page.keyboard.up(mod);
}
test("Shop card parts are individually picked; a title edit saves on the owner, updates all cards and undoes without a document reload", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&commerce=shop`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await frame(page).locator("html").evaluate(() => { (window as any).__deepDocument = "retained"; });
  await clickPart(page, '[data-cms-part="card-name"]');
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", "n:commerce-shop/@card-name");
  await page.getByTestId("studio-style-size").fill("29"); await page.getByTestId("studio-style-size").blur();
  await expect(frame(page).locator('[data-cms-part="card-name"]').first()).toHaveCSS("font-size", "29px");
  await expect(frame(page).locator('[data-cms-part="card-name"]').last()).toHaveCSS("font-size", "29px");
  const node = await page.evaluate(() => (window as any).__canvasHarness.getNode("commerce-shop").node);
  expect(node.props.partLooks["@card-name"].style.base.size).toBe(29);
  expect(await frame(page).locator("html").evaluate(() => (window as any).__deepDocument)).toBe("retained");
  await page.getByTestId("studio-undo").click();
  await expect(frame(page).locator('[data-cms-part="card-name"]').first()).toHaveCSS("font-size", "17px");
  for (const part of ["card-image", "card-price", "card-swatch", "card-add"]) {
    await clickPart(page, `[data-cms-part="${part}"]`);
    await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", `n:commerce-shop/@${part}`);
  }
  await page.getByTestId("studio-part-owner").click();
  await expect(page.getByTestId("studio-commerce")).toBeVisible();
});
test("a hidden part remains selected and can be restored from its style controls", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&commerce=shop`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '[data-cms-part="card-name"]');
  const visible = page.getByTestId("studio-show-on").locator('input[data-screen="base"]');
  await visible.uncheck();
  await expect(frame(page).locator('[data-cms-part="card-name"]').first()).toBeHidden();
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", "n:commerce-shop/@card-name");
  await visible.check();
  await expect(frame(page).locator('[data-cms-part="card-name"]').first()).toBeVisible();
});
test("generic widgets expose nested text, respect paint order and let locked widgets pass selection through", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&deepWidgets`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '[data-tree-node="reviews"] blockquote');
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", /^n:reviews\/~.+blockquote\.1$/);
  await page.getByTestId("studio-style-size").fill("26"); await page.getByTestId("studio-style-size").blur();
  await expect(frame(page).locator('[data-tree-node="reviews"] blockquote')).toHaveCSS("font-size", "26px");
  await clickPart(page, '[data-tree-node="questions"] summary');
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", /^n:questions\/~.+summary\.1$/);
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator('[data-testid="studio-layer"][data-node="over-front"]').click();
  const p = await canvasPoint(page, frame(page).locator('[data-tree-node="over-front"] > div > div'));
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", /^n:over-front\//);
  await page.mouse.click(p.x, p.y, { button: "right" });
  await expect(page.getByRole("menu")).toContainText("Behind widget");
  await page.keyboard.press("Escape");
  const row = page.locator('[data-testid="studio-layer"][data-node="over-front"]');
  await row.locator("..").getByTestId("studio-layer-lock").click();
  await page.mouse.click(p.x, p.y);
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", /^n:over-back\//);
});
test("published part styles reach real catalog cards and preserve the live add-to-cart control", async ({ page }) => {
  const origin = "http://127.0.0.1:4100";
  await page.request.post(`${origin}/__test/commerce`, { data: { on: true, shopProps: { partLooks: { "@card-name": { kind: "text", style: { base: { size: 30 } } }, "@card-body": { kind: "box", style: { base: { radius: 21 } } }, "@card-actions": { kind: "box", style: { base: { gap: 13 } } }, "@card-swatches": { kind: "box", style: { base: { gap: 14 } } }, "@card-swatch": { kind: "button", style: { base: { radius: 9 } } } } } } });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages", "cms:bootstrap", "settings"], paths: ["/shop"] } });
  try {
    await page.goto("/en/shop");
    const title = page.locator('[data-tree-node="fixture-shop"] [data-cms-part="card-name"]').first();
    await expect(title).toHaveCSS("font-size", "30px");
    for (const [part, css, value] of [["card-body", "border-radius", "21px"], ["card-actions", "gap", "13px"], ["card-swatches", "gap", "14px"], ["card-swatch", "border-radius", "9px"]]) {
      await expect(page.locator(`[data-tree-node="fixture-shop"] [data-cms-part="${part}"]`).first()).toHaveCSS(css, value);
    }
    await page.locator('[data-tree-node="fixture-shop"] [data-cms-part="card-add"]').first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
  } finally { await page.request.post(`${origin}/__test/commerce`, { data: { on: false } }); }
});
test("deep mode, Alt cycling and the point chooser can select both internals and their owning Shop widget", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&commerce=shop`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '[data-cms-part="card-name"]');
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", "n:commerce-shop/@card-name");
  await clickPart(page, '[data-cms-part="card-name"]', ["Alt"]);
  await expect(page.getByTestId("studio-look-target")).not.toHaveAttribute("data-target", "n:commerce-shop/@card-name");
  await page.getByTestId("studio-pick-objects").click();
  await expect(page.getByRole("menu")).toContainText("Product name");
  await page.getByRole("menuitem", { name: "Product name", exact: true }).first().click();
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", "n:commerce-shop/@card-name");
  await page.getByTestId("studio-deep-selection").click();
  await clickPart(page, '[data-cms-part="card-name"]');
  await expect(page.getByTestId("studio-commerce")).toBeVisible();
});

test("a legacy inner object stays in the inspector after hiding and can be restored", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&legacyParts`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '[data-cms-section="old"] p');
  await expect(page.getByTestId("studio-look-target")).toHaveAttribute("data-target", /^s:old\/~.+p\.1$/);
  const visible = page.getByTestId("studio-show-on").locator('input[data-screen="base"]');
  await visible.uncheck();
  await expect(frame(page).locator('[data-cms-section="old"] p')).toBeHidden();
  await expect(page.getByTestId("studio-look-target")).toBeVisible();
  await visible.check();
  await expect(frame(page).locator('[data-cms-section="old"] p')).toBeVisible();
});
test("part appearance edits keep the functional widget DOM and its open state", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&deepWidgets`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await frame(page).locator('[data-tree-node="questions"] details').evaluate(el => { el.removeAttribute("open"); (el as any).__identity = "same-widget"; });
  await clickPart(page, '[data-tree-node="questions"] summary');
  await page.getByTestId("studio-style-size").fill("25"); await page.getByTestId("studio-style-size").blur();
  await expect(frame(page).locator('[data-tree-node="questions"] summary')).toHaveCSS("font-size", "25px");
  expect(await frame(page).locator('[data-tree-node="questions"] details').evaluate(el => ({ open: el.hasAttribute("open"), identity: (el as any).__identity }))).toEqual({ open: false, identity: "same-widget" });
});
test("an inner appearance edit preserves the Shop search client state", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&commerce=shop`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const search = frame(page).locator('[data-cms-part="shop-search"]');
  await search.fill("1");
  await expect(frame(page).locator('[data-cms-part="card-name"]')).toHaveCount(1);
  await clickPart(page, '[data-cms-part="card-name"]');
  await page.getByTestId("studio-style-size").fill("28"); await page.getByTestId("studio-style-size").blur();
  await expect(frame(page).locator('[data-cms-part="card-name"]').first()).toHaveCSS("font-size", "28px");
  await expect(search).toHaveValue("1");
  await expect(frame(page).locator('[data-cms-part="card-name"]')).toHaveCount(1);
});
