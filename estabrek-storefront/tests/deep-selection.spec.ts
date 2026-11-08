import { expect, test, type Page, type Locator } from "@playwright/test";
const url = "http://127.0.0.1:5178/tests/fixtures/editor-controls.html";
const frame = (page: Page) => page.frameLocator('[data-testid="studio-frame"]');

test("countdown minute labels expose real content controls for existing documents, save inline and undo", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=ar&partTypes`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const minute = '[data-tree-node="timer"] .pt-count-part:nth-child(3) .pt-count-l';
  await frame(page).locator("html").evaluate(() => { (window as any).__partTypeDocument = "same"; });
  await clickPart(page, minute);
  await expect(page.getByTestId("studio-part-kind")).toHaveAttribute("data-kind", "text");
  await expect(page.getByTestId("studio-part-words")).toHaveValue("دقيقة");
  await page.getByTestId("studio-part-words").fill("دقائق متبقية");
  await page.getByTestId("studio-part-words").blur();
  await expect(frame(page).locator(minute)).toHaveText("دقائق متبقية");
  await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness.getNode("timer").node.props.minuteLabel)).toEqual({ ar: "دقائق متبقية" });
  await page.getByTestId("studio-part-edit-text").click();
  // Chrome keeps contenteditable="plaintext-only"; any editable state counts.
  const editable = frame(page).locator(`${minute}[contenteditable]`);
  await editable.fill("دقائق"); await editable.press("Enter");
  await expect(frame(page).locator(minute)).toHaveText("دقائق");
  await page.getByTestId("studio-undo").click();
  await expect(frame(page).locator(minute)).toHaveText("دقائق متبقية");
  await page.getByTestId("studio-undo").click();
  await expect(frame(page).locator(minute)).toHaveText("دقيقة");
  expect(await frame(page).locator("html").evaluate(() => (window as any).__partTypeDocument)).toBe("same");
  await clickPart(page, '[data-tree-node="timer"] .pt-count-part:nth-child(3) .pt-count-n');
  await expect(page.getByTestId("studio-part-source")).toBeVisible();
  await expect(page.getByTestId("studio-part-kind")).toContainText("قيمة حيّة");
  // Its own type controls come before the size and box settings.
  const order = await page.getByTestId("studio-look-target").evaluate(el => [...el.querySelectorAll("[data-testid]")].map(c => c.getAttribute("data-testid")));
  expect(order.indexOf("studio-text-style")).toBeLessThan(order.indexOf("studio-part-size"));
  await expect(page.getByTestId("studio-part-words")).toHaveCount(0);
  await page.getByTestId("studio-part-owner").click();
  await expect(page.getByTestId("block-until")).toBeVisible();
});

test("internal objects show type-appropriate ready looks and actually preview, save and undo on the selected part", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&partTypes`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '[data-tree-node="timer"] .pt-count-part:nth-child(3) .pt-count-l');
  await page.getByTestId("studio-tab-looks").click();
  await expect(page.getByTestId("studio-looks")).toBeVisible();
  await expect(page.locator('[data-testid="studio-looks-kind"][data-kind="type"]')).toBeVisible();
  await page.getByTestId("studio-looks-find").fill("Light and airy");
  const tile = page.locator('[data-testid="studio-look"][data-id="type-airy"]');
  const minute = frame(page).locator('[data-tree-node="timer"] .pt-count-part:nth-child(3) .pt-count-l');
  const before = await minute.evaluate(el => getComputedStyle(el).fontWeight);
  await tile.hover(); await expect(minute).toHaveCSS("font-weight", "300");
  await page.getByTestId("studio-looks-find").hover(); await expect(minute).toHaveCSS("font-weight", before);
  await tile.click(); await page.getByTestId("studio-looks-find").hover();
  await expect(minute).toHaveCSS("font-weight", "300");
  await expect(frame(page).locator('[data-tree-node="timer"] .pt-count-part:nth-child(2) .pt-count-l')).toHaveCSS("font-weight", before);
  await page.getByTestId("studio-undo").click(); await expect(minute).toHaveCSS("font-weight", before);
  for (const [selector, kind] of [['[data-tree-node="links"] a', "button"], ['[data-tree-node="comparison"] img.pt-ba-after', "frame"], ['[data-tree-node="timer"] .pt-count-part', "card"]]) {
    if (kind === "card") {
      // Pick the exposed padding of the unit box rather than the number or label.
      const target = frame(page).locator(selector).first();
      const p = await canvasPoint(page, target);
      const box = await target.boundingBox();
      await page.mouse.click(p.x, p.y - box!.height / 2 + 3);
    } else await clickPart(page, selector);
    await expect(page.locator(`[data-testid="studio-looks-kind"][data-kind="${kind}"]`)).toBeVisible();
    await expect(page.locator('[data-testid="studio-looks-kind"][data-kind="edge"]')).toHaveCount(0);
    // The inspector names the object first: a link is a button, the slider's photo a picture (seen through its invisible range), the unit a box.
    await expect(page.getByTestId("studio-part-kind")).toHaveAttribute("data-kind", ({ button: "button", frame: "image", card: "box" } as Record<string, string>)[kind]);
    await expect(page.getByTestId("studio-section-objects")).toHaveCount(0);
  }
});
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

test("rich native headings and buttons can actually be typed, saved and undone from the preview", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  for (const [id, selector, value, field] of [["headline", "strong", "Changed heading", "text"], ["action", "strong", "Changed action", "label"]]) {
    await clickPart(page, `[data-tree-node="${id}"] ${selector}`);
    await expect(page.getByTestId("studio-edit-node")).toBeVisible();
    await page.getByTestId("studio-edit-node").click();
    const editable = frame(page).locator(`[data-tree-node="${id}"][contenteditable="true"]`);
    await expect(editable).toBeVisible();
    await editable.fill(value); await editable.press("Enter");
    await expect.poll(() => page.evaluate(({ id, field }) => (window as any).__canvasHarness.getNode(id).node.props[field].en.replace(/\[\/?(?:b|i|u|mark)\]/g, ""), { id, field })).toBe(value);
    await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
    await expect(frame(page).locator(`[data-tree-node="${id}"]`)).toHaveText(value);
    await page.getByTestId("studio-undo").click();
    await expect.poll(() => page.evaluate(({ id, field }) => (window as any).__canvasHarness.getNode(id).node.props[field].en, { id, field })).toContain("[b]");
  }
});
test("an explicitly selected native widget can be dragged from its internal text", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await page.locator('[data-testid="studio-layer"][data-node="reviews"]').click();
  const before = await page.evaluate(() => (window as any).__canvasHarness.getNode("reviews").node.style.base.layer);
  const point = await canvasPoint(page, frame(page).locator('[data-tree-node="reviews"] blockquote'));
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  await page.mouse.move(point.x + 55, point.y + 30, { steps: 12 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness.getNode("reviews").node.style.base.layer)).not.toEqual(before);
  await page.getByTestId("studio-undo").click();
  await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness.getNode("reviews").node.style.base.layer)).toEqual(before);
});

test("selected nested text and menu labels expose working content fields and inline typing", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '[data-tree-node="reviews"] blockquote');
  const words = page.getByTestId("studio-part-words");
  await expect(words).toBeVisible();
  await words.fill("Edited customer quote"); await words.blur();
  await expect(frame(page).locator('[data-tree-node="reviews"] blockquote')).toHaveText("Edited customer quote");
  await page.getByTestId("studio-undo").click();
  await expect(frame(page).locator('[data-tree-node="reviews"] blockquote')).toHaveText("A nested customer quote");
  await clickPart(page, '[data-tree-node="links"] li:nth-child(2) a');
  await expect(words).toHaveValue("Second link");
  await page.getByTestId("studio-part-edit-text").click();
  const editable = frame(page).locator('[data-tree-node="links"] a[contenteditable]');
  await editable.fill("Changed second link"); await editable.press("Enter");
  await expect(frame(page).locator('[data-tree-node="links"] li:nth-child(2) a')).toHaveText("Changed second link");
  await expect(frame(page).locator('[data-tree-node="links"] li:first-child a')).toHaveText("First link");
  const href = page.getByTestId("studio-part-href");
  await href.fill("/contact"); await href.blur();
  await expect(frame(page).locator('[data-tree-node="links"] li:nth-child(2) a')).toHaveAttribute("href", "/en/contact");
  const labels = await page.evaluate(() => (window as any).__canvasHarness.getNode("links").node.props.items);
  expect(labels[1].label.ar).toBe("Second link");
  expect(await frame(page).locator('[data-tree-node="links"] li:nth-child(2) a').evaluate(el => (el as HTMLElement).style.outline)).toBe("");
});

test("an individually selected text part can move by dragging, cancel with Escape and undo", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const selector = '[data-tree-node="reviews"] blockquote';
  await clickPart(page, selector);
  const target = await page.getByTestId("studio-look-target").getAttribute("data-target");
  const initial = await frame(page).locator(selector).boundingBox();
  let point = await canvasPoint(page, frame(page).locator(selector));
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  await page.mouse.move(point.x + 35, point.y + 20, { steps: 10 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness.getNode("reviews").node.props.partLooks)).toBeTruthy();
  await expect(frame(page).locator(selector)).not.toHaveCSS("transform", "none");
  const after = await frame(page).locator(selector).boundingBox();
  expect(after!.x).toBeGreaterThan(initial!.x + 10);
  expect(after!.y).toBeGreaterThan(initial!.y + 5);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
  const firstSaved = await page.evaluate(() => (window as any).__canvasHarness.getNode("reviews").node.props.partLooks);
  point = await canvasPoint(page, frame(page).locator(selector));
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  await page.mouse.move(point.x + 20, point.y + 10, { steps: 6 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness.getNode("reviews").node.props.partLooks)).not.toEqual(firstSaved);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
  const saved = await page.evaluate(() => (window as any).__canvasHarness.getNode("reviews").node.props.partLooks);
  point = await canvasPoint(page, frame(page).locator(selector));
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y + 15, { steps: 6 });
  await expect(frame(page).locator(selector)).not.toHaveCSS("transform", "none");
  await page.keyboard.press("Escape"); await page.mouse.up();
  expect(await page.evaluate(() => (window as any).__canvasHarness.getNode("reviews").node.props.partLooks)).toEqual(saved);
  await page.getByTestId("studio-undo").click();
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
  await page.getByTestId("studio-undo").click();
  await expect(frame(page).locator(selector)).toHaveCSS("transform", "none");
});

test("inline author text really follows the pointer during preview and after saving", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const selector = '[data-tree-node="reviews"] strong';
  await clickPart(page, selector);
  const point = await canvasPoint(page, frame(page).locator(selector));
  const before = await frame(page).locator(selector).boundingBox();
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  await page.mouse.move(point.x + 35, point.y + 20, { steps: 10 });
  const preview = await frame(page).locator(selector).boundingBox();
  expect(preview!.x).toBeGreaterThan(before!.x + 10);
  await page.mouse.up();
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
  await expect.poll(async () => (await frame(page).locator(selector).boundingBox())!.x).toBeCloseTo(preview!.x, 0);
});

test("first part movement previews match release inside a scaled and centered owner", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression&scaledPart`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  const selector = '[data-tree-node="reviews"] blockquote';
  await clickPart(page, selector);
  const point = await canvasPoint(page, frame(page).locator(selector));
  const before = await frame(page).locator(selector).boundingBox();
  await page.mouse.move(point.x, point.y); await page.mouse.down();
  await page.mouse.move(point.x + 35, point.y + 20, { steps: 10 });
  const preview = await frame(page).locator(selector).boundingBox();
  expect(preview!.width).toBeCloseTo(before!.width, 0);
  expect(preview!.x - before!.x).toBeCloseTo(35, 0);
  expect(preview!.y - before!.y).toBeCloseTo(20, 0);
  await page.mouse.up();
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
  await expect.poll(async () => (await frame(page).locator(selector).boundingBox())!.x).toBeCloseTo(preview!.x, 0);
});

test("header and footer can be selected in preview and open their own editing settings", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '.atelier-header .atelier-desktop-nav a');
  await expect(page.getByTestId("studio-region")).toHaveAttribute("data-region", "header");
  await expect(page.getByTestId("studio-region-edit")).toHaveAttribute("href", /\/admin\/settings/);
  await frame(page).locator('.atelier-footer').evaluate(el => el.scrollIntoView({ block: "center" }));
  await expect.poll(() => page.evaluate(() => (window as any).__canvasHarness.getLayout().scroll.y)).toBeGreaterThan(0);
  await clickPart(page, '.atelier-footer p');
  await expect(page.getByTestId("studio-region")).toHaveAttribute("data-region", "footer");
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  await expect(page.locator('[data-testid="studio-layer"][data-node="region:header"]')).toBeVisible();
  await expect(page.locator('[data-testid="studio-layer"][data-node="region:footer"]')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__canvasHarness.getWrites().length)).toBe(0);
});

test("a catalog label identical to the owned heading cannot edit that heading", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression&catalogEquality`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '[data-tree-node="category-equality"] .pt-tile > span:last-child');
  await expect(page.getByTestId("studio-part-content")).toHaveCount(0);
  await clickPart(page, '[data-tree-node="category-equality"] h2');
  await expect(page.getByTestId("studio-part-words")).toHaveValue("فساتين");
  await page.getByTestId("studio-part-words").fill("Owned heading changed"); await page.getByTestId("studio-part-words").blur();
  await expect(frame(page).locator('[data-tree-node="category-equality"] h2')).toHaveText("Owned heading changed");
  await expect(frame(page).locator('[data-tree-node="category-equality"] .pt-tile > span:last-child')).toHaveText("فساتين");
});
test("shared documents open their own editor and a block preview does not duplicate global chrome", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression&ownedRegions`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '.atelier-header .atelier-desktop-nav a');
  await expect(page.getByTestId("studio-region-edit")).toHaveAttribute("href", /\/studio\/owned-header/);
  await page.goto(`${url}?lang=en&editingRegression&blockRegion`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await expect(frame(page).locator('[data-studio-region]')).toHaveCount(0);
  await expect(frame(page).locator('[data-tree-node="headline"]')).toBeVisible();
});

test("opening a shared header starts a distinct preview session with isolated undo history", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${url}?lang=en&editingRegression&ownedRegions`);
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90000 });
  await clickPart(page, '[data-tree-node="headline"]');
  await page.getByTestId("studio-prop-text").fill("Changed original document"); await page.getByTestId("studio-prop-text").blur();
  await expect(page.getByTestId("studio-undo")).toBeEnabled();
  await expect(page.getByTestId("studio-refresh-view")).toBeEnabled();
  await clickPart(page, '.atelier-header .atelier-desktop-nav a');
  await page.getByTestId("studio-region-edit").click();
  await expect(page.getByTestId("studio-frame")).toHaveAttribute("src", /token=good-owned-header/);
  await expect(frame(page).locator('[data-tree-node="shared-header-label"]')).toHaveText("Shared header document");
  await expect(frame(page).locator('[data-tree-node="headline"]')).toHaveCount(0);
  await expect(page.getByTestId("studio-undo")).toBeDisabled();
  await page.getByTestId("studio-canvas").focus(); await page.keyboard.press("Control+z");
  const requests = await page.evaluate(() => (window as any).__canvasHarness.getRequests());
  expect(requests.some((request: any) => request.method === "POST" && request.path === "/admin/pages/owned-header/draft/ops")).toBe(false);
});
