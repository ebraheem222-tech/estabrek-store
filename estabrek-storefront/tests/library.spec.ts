import { expect, test, type Page } from "@playwright/test";

// The owner's theme library (docs/themes-library-plan.ar.md): a piece of it on a page, in the owner's words and
// colours, drawn by the shop (src/library); added and changed from the editor's Add panel and the piece's panel.
// The test API, the shop and the editor's page: their usual ports, or a second run's beside another session's.
const API = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;
const SITE = `http://127.0.0.1:${process.env.SHOP_PORT || 3000}`;
const editor = `http://127.0.0.1:${process.env.ADMIN_PORT || 5178}/tests/fixtures/editor-controls.html?lang=en&editingRegression`;

/** Whether any element inside `sel` is painted in `rgb` (its words, its fill or its frame). */
const painted = (page: Page, sel: string, rgb: string) =>
  page.evaluate(([sel, rgb]) => Array.from(document.querySelectorAll(`${sel} *`)).some((el) => {
    const cs = getComputedStyle(el);
    return [cs.color, cs.backgroundColor, cs.borderTopColor, cs.fill, cs.stroke].includes(rgb);
  }), [sel, rgb] as const);
/** The library's stylesheets on the page (their addresses, without the version): its shared one and its pieces' files'. */
const libStyles = (page: Page) =>
  page.evaluate(() => Array.from(document.styleSheets).map((s) => s.href ?? "").filter((h) => h.includes("/library/")).map((h) => new URL(h).pathname));

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/library-page`, { data: {} });
  await request.post(`${SITE}/api/revalidate`, { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
});

test("a whole website and two sections from the library, in the store's name, the owner's words and colours", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.request.post(`${API}/__test/library-page`, { data: {} });
  await page.request.post(`${SITE}/api/revalidate`, { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.context().addCookies([{ name: "shop-lang", value: "en", url: SITE }]);
  await page.goto("/library-demo");
  const site = page.locator('[data-lib="site-maison"]');
  await expect(site).toBeVisible({ timeout: 90_000 });
  await expect(site).toContainText("NOOR STORE");
  await expect(site).not.toContainText(/maison lune/i);
  // The owner's words for one of its lines; the rest as the library wrote them.
  await expect(site.getByText("Shop what's new", { exact: false }).first()).toBeVisible();
  await expect(site).not.toContainText("Shop the collection");
  await expect(site).toContainText("Lookbook");
  // Its gold, the owner's blue, wherever it used it.
  expect(await site.evaluate((el) => getComputedStyle(el).getPropertyValue("--lx-c8a75d").trim())).toBe("#2563eb");
  expect(await painted(page, '[data-lib="site-maison"]', "rgb(37, 99, 235)")).toBe(true);
  expect(await painted(page, '[data-lib="site-maison"]', "rgb(200, 167, 93)")).toBe(false);
  // A whole website brings its own bar and footer: the store's step aside on its page.
  for (const chrome of [".atelier-header", ".atelier-footer"]) {
    const n = await page.locator(chrome).count();
    for (let i = 0; i < n; i++) await expect(page.locator(chrome).nth(i)).toBeHidden();
  }
  // White words on its dark parts stay white (the shop's light theme doesn't repaint the library's).
  const pricing = page.locator('[data-lib="pricing-three-tiers"]');
  await pricing.scrollIntoViewIfNeeded();
  await expect(pricing).toContainText(/month|mo/i);
  // Its indigo family is the owner's green, all its shades made from it.
  expect(await pricing.evaluate((el) => getComputedStyle(el).getPropertyValue("--color-indigo-500").trim())).toBe("#16a34a");
  expect(await pricing.evaluate((el) => getComputedStyle(el).getPropertyValue("--color-indigo-700"))).toContain("#16a34a");
  // Its button wears the 600 made from it (whatever the browser writes that colour as).
  const shade600 = await pricing.evaluate((el) => {
    const probe = document.createElement("i");
    probe.style.background = "var(--color-indigo-600)";
    el.appendChild(probe);
    const c = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return c;
  });
  expect(shade600).not.toBe("rgba(0, 0, 0, 0)");
  expect(await painted(page, '[data-lib="pricing-three-tiers"]', shade600)).toBe(true);
  // A section with nothing changed is as the library made it.
  const faq = page.locator('[data-lib="faq-classic"]');
  await faq.scrollIntoViewIfNeeded();
  await expect(faq).toContainText("Frequently asked questions");
  // Once, however many pieces the page shows.
  // The shared one once, however many pieces the page shows; each piece file's own once.
  const sheets = await libStyles(page);
  expect(sheets.filter((h) => h === "/library/lib.css")).toHaveLength(1);
  expect([...sheets].sort()).toEqual(["/library/css/faq-faq.css", "/library/css/pricing-pricing.css", "/library/css/templates-sites-maison.css", "/library/lib.css"]);
  expect(errors).toEqual([]);

  // A page without library pieces never loads its styles, and the store wears its own bar there.
  // (The dev server, building the page the first time, can cut the first visit short.)
  await page.goto("/shop").catch(() => page.goto("/shop"));
  await page.waitForLoadState("networkidle").catch(() => {});
  await expect(page.locator(".lx-scope")).toHaveCount(0);
  expect(await libStyles(page)).toEqual([]);
  await expect(page.locator(".atelier-header").first()).toBeVisible();
});

test("a piece turned right to left in Arabic words; any piece on its own at its preview address, as a file of its own", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.request.post(`${API}/__test/library-page`, { data: { nodes: [
    { id: "lib-faq", type: "lib", props: { item: "faq-classic", dir: "rtl", words: { "Frequently asked questions": { ar: "أسئلة شائعة", en: "Questions" } } } },
  ] } });
  await page.request.post(`${SITE}/api/revalidate`, { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages"] } });
  await page.context().addCookies([{ name: "shop-lang", value: "ar", url: SITE }]);
  await page.goto("/ar/library-demo");
  const faq = page.locator('[data-lib="faq-classic"]');
  await expect(faq).toHaveAttribute("data-lib-ready", "", { timeout: 90_000 });
  await expect(faq).toHaveAttribute("dir", "rtl");
  await expect(faq.getByText("أسئلة شائعة")).toBeVisible();
  // Its question sits at the right, its button at the left.
  const row = await faq.evaluate((el) => {
    const q = Array.from(el.querySelectorAll("button")).find((b) => /free trial/.test(b.textContent ?? ""))!;
    const r = q.getBoundingClientRect();
    // The question's own words (a text in the button, wherever it sits).
    const walker = document.createTreeWalker(q, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode()) && !/free trial/.test(node.textContent ?? ""));
    const range = document.createRange();
    range.selectNodeContents(node!);
    const text = range.getBoundingClientRect();
    return { textRight: Math.round(r.right - text.right), textLeft: Math.round(text.left - r.left) };
  });
  expect(row.textRight).toBeLessThan(row.textLeft);

  // The preview address: one piece alone, nothing of the store's around it, its own file and styles.
  const files: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/library/")) files.push(r.url().split("/library/")[1]); });
  await page.goto("/en/lib-preview?item=cta-conic");
  await expect(page.locator('[data-lib="cta-conic"]')).toHaveAttribute("data-lib-ready", "", { timeout: 90_000 });
  await expect(page.locator(".atelier-header")).toBeHidden();
  expect(files.some((f) => /^js\/cta-conic-[A-Z0-9]+\.js$/.test(f))).toBe(true);
  expect(files.some((f) => f.startsWith("css/cta-cta.css"))).toBe(true);
  expect(files.filter((f) => f.startsWith("js/") && !f.startsWith("js/c/") && !f.startsWith("js/cta-conic-"))).toEqual([]);
  expect((await page.goto("/en/lib-preview?item=no-such-piece"))?.status()).toBe(404);
  expect(errors).toEqual([]);
});

test("from the editor: a library piece added from the Add panel, its words and colours changed in its panel", async ({ page }) => {
  test.setTimeout(240_000);
  const draft = () => page.evaluate(() => (window as any).__canvasHarness.getDraft().tree.root);
  const ready = () => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90_000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(editor);
  await ready();
  await page.getByRole("tab", { name: "+ Add" }).click();
  // The Add panel's search finds the library's pieces too.
  await page.getByRole("searchbox", { name: "Find a section or element" }).fill("classic accordion");
  await expect(page.locator('[data-testid="studio-add-item"][data-kind="lib:faq-classic"]')).toBeVisible();
  // The library itself: its kinds, the FAQs among them, a piece put on the page.
  await page.getByTestId("studio-lib-browse").click();
  const shelf = page.getByTestId("lib-shelf");
  await expect(shelf.locator('[data-testid="lib-card"]').first()).toHaveAttribute("data-kind", "site");
  await shelf.locator('[data-testid="lib-kind"][data-kind="faq"]').click();
  await expect(shelf.locator('[data-testid="lib-card"]')).toHaveCount(48);
  await shelf.locator('[data-testid="lib-card"][data-item="faq-classic"] [data-testid="lib-pick"]').click();
  await expect(shelf).toBeHidden();
  // It goes on the page as it is (a whole section of its own), named for the layers list.
  await expect.poll(async () => ((await draft()).children as any[]).some((n) => n.type === "lib")).toBe(true);
  const piece = ((await draft()).children as any[]).find((n) => n.type === "lib");
  expect(piece.props).toEqual({ item: "faq-classic" });
  expect(piece.name).toBe("Classic Accordion");
  expect(piece.children ?? []).toEqual([]);

  const panel = page.getByTestId("studio-lib-panel").first();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-item", "faq-classic");
  // One of its words, found and changed in the language being edited.
  await panel.getByTestId("studio-lib-search").fill("frequently");
  const word = panel.locator('[data-testid="studio-lib-word"][data-word="Frequently asked questions"] input');
  await word.fill("Questions about our store");
  await word.press("Enter");
  await expect.poll(async () => ((await draft()).children as any[]).find((n) => n.id === piece.id).props.words).toEqual({ "Frequently asked questions": { en: "Questions about our store" } });
  // Its indigo family from the store theme's colour, then from one of the owner's own.
  const indigo = panel.locator('[data-testid="studio-lib-family"][data-family="indigo"]');
  await indigo.getByTestId("studio-lib-family-theme").click();
  await expect.poll(async () => ((await draft()).children as any[]).find((n) => n.id === piece.id).props.families).toEqual({ indigo: "theme" });
  await indigo.getByTestId("studio-lib-family-colour").fill("#16a34a");
  await expect.poll(async () => ((await draft()).children as any[]).find((n) => n.id === piece.id).props.families).toEqual({ indigo: "#16a34a" });

  // The preview draws it, in the owner's words and colours.
  await ready();
  const shown = page.frameLocator('[data-testid="studio-frame"]').locator(`[data-tree-node="${piece.id}"] [data-lib="faq-classic"]`);
  await expect(shown).toContainText("Questions about our store", { timeout: 60_000 });
  await expect(shown).not.toContainText("Frequently asked questions");
  expect(await shown.evaluate((el) => getComputedStyle(el).getPropertyValue("--color-indigo-500").trim())).toBe("#16a34a");

  // Back as it was, in one click.
  await panel.getByTestId("studio-lib-reset").click();
  await expect.poll(async () => ((await draft()).children as any[]).find((n) => n.id === piece.id).props).toEqual({ item: "faq-classic" });
});

test("from the editor: a library piece's words written over on the page, a whole site fitting the frame with no bars", async ({ page }) => {
  test.setTimeout(240_000);
  const draft = () => page.evaluate(() => (window as any).__canvasHarness.getDraft().tree.root);
  const ready = () => expect(page.getByTestId("studio-refresh-view")).toBeEnabled({ timeout: 90_000 });
  const frame = page.frameLocator('[data-testid="studio-frame"]');
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(editor);
  await ready();
  const add = async (item: string, name: string) => {
    await page.getByRole("tab", { name: "+ Add" }).click();
    await page.getByTestId("studio-lib-browse").click();
    const shelf = page.getByTestId("lib-shelf");
    await shelf.getByTestId("lib-search").fill(name);
    await shelf.locator(`[data-testid="lib-card"][data-item="${item}"] [data-testid="lib-pick"]`).click();
    await expect.poll(async () => ((await draft()).children as any[]).some((n) => n.type === "lib" && n.props.item === item)).toBe(true);
    await ready();
    return ((await draft()).children as any[]).find((n) => n.type === "lib" && n.props.item === item).id as string;
  };
  // Double-clicks a text of a piece where it shows (its marker takes no room: its words' own place).
  const dblclickWord = async (from: string) => {
    const word = frame.locator(`[data-lx-src="${from}"]`).first();
    await expect(word).toHaveCount(1, { timeout: 60_000 });
    await word.evaluate((el) => el.parentElement!.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1500);
    const r = await word.evaluate((el) => { const range = document.createRange(); range.selectNodeContents(el); const b = range.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
    const box = (await page.getByTestId("studio-frame").boundingBox())!;
    const scale = box.width / (await page.evaluate(() => (window as any).__canvasHarness.getLayout().viewport.w));
    await page.mouse.dblclick(box.x + r.x * scale, box.y + r.y * scale);
    return word;
  };

  const id = await add("faq-classic", "Classic Accordion");
  await page.waitForTimeout(3000);
  // Written over in place: the words become writable where they are, what's typed is the piece's own words for them.
  const word = await dblclickWord("Frequently asked questions");
  await expect(word).toHaveAttribute("contenteditable", /plaintext-only|true/);
  await page.keyboard.type("Questions about our store");
  await page.keyboard.press("Enter");
  await expect.poll(async () => ((await draft()).children as any[]).find((n) => n.id === id).props.words).toEqual({ "Frequently asked questions": { en: "Questions about our store" } });
  await ready();
  await expect(frame.locator(`[data-tree-node="${id}"]`)).toContainText("Questions about our store", { timeout: 60_000 });
  // Esc leaves another as it was.
  const second = await dblclickWord("How does the free trial work?");
  await expect(second).toHaveAttribute("contenteditable", /plaintext-only|true/);
  await page.keyboard.type("Not these words");
  await page.keyboard.press("Escape");
  await expect(second).not.toHaveAttribute("contenteditable", /.+/);
  await expect(second).toHaveText("How does the free trial work?");
  expect(Object.keys(((await draft()).children as any[]).find((n) => n.id === id).props.words)).toEqual(["Frequently asked questions"]);

  // A whole site spans the frame exactly (no page bar in the editor, none counted in its width); what scrolls inside
  // it shows no bar either.
  const site = await add("site-maison", "Maison Lune");
  const shown = frame.locator(`[data-tree-node="${site}"] [data-lib="site-maison"]`);
  await expect(shown).toHaveAttribute("data-lib-ready", "", { timeout: 90_000 });
  const fit = await shown.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const bars = Array.from(el.querySelectorAll<HTMLElement>("*")).filter((e) => e.offsetWidth - e.clientWidth > 0 && /(auto|scroll)/.test(getComputedStyle(e).overflowY) || e.offsetHeight - e.clientHeight > 0 && /(auto|scroll)/.test(getComputedStyle(e).overflowX)).length;
    return { left: Math.round(r.left), width: Math.round(r.width), page: document.documentElement.clientWidth, inner: window.innerWidth, bars };
  });
  expect(fit).toEqual({ left: 0, width: fit.inner, page: fit.inner, inner: fit.inner, bars: 0 });
});
