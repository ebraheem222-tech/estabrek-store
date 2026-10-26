import { test, expect, type Page } from "@playwright/test";

// The admin's new editor frames the shop (app/[lang]/studio-frame + pageTree/StudioBridge):
// the frame opens one page's draft with its ticket, says where every element is, scrolls
// when asked, and keeps links from leaving. The test API's harness page stands in for the admin.
const HARNESS = "http://127.0.0.1:4100/__studio-harness";
type Msg = { origin: string; data: any };
const messages = (page: Page) => page.evaluate(() => (window as any).__msgs as Msg[]);
const lastLayout = async (page: Page) => (await messages(page)).filter((m) => m.data.type === "layout").at(-1)?.data;

test("only the admin may frame it, and search engines keep out", async ({ request }) => {
  const res = await request.get("/studio-frame?token=good");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(res.headers()["content-security-policy"]).toContain("http://127.0.0.1:4100");
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
  expect(await res.text()).toContain("عنوان من الشجرة");
  expect((await request.get("/studio-frame?token=wrong")).status()).toBe(404);
  expect((await request.get("/studio-frame")).status()).toBe(404);
});

test("says where every element and old section is, and follows the editor's scrolling", async ({ page }) => {
  await page.goto(`${HARNESS}?src=${encodeURIComponent("/studio-frame?token=good")}`);
  await expect.poll(async () => (await messages(page)).some((m) => m.data.type === "ready"), { timeout: 30_000 }).toBe(true);
  await expect.poll(async () => (await lastLayout(page))?.items?.length ?? 0, { timeout: 30_000 }).toBeGreaterThan(6);
  const layout = await lastLayout(page);
  expect((await messages(page)).every((m) => m.origin === "http://127.0.0.1:3000")).toBe(true);
  expect(layout).toMatchObject({ pageId: "tree-demo", lang: "ar", dir: "rtl", viewport: { w: 1280, h: 900 } });
  const ids = layout.items.filter((i: any) => i.kind === "node").map((i: any) => i.id);
  for (const id of ["intro", "title", "cols", "wide", "go", "picks"]) expect(ids).toContain(id);
  expect(layout.items.find((i: any) => i.kind === "legacy")).toMatchObject({ sectionId: "demo-faq" });
  // A child sits inside its parent.
  const at = (id: string) => layout.items.find((i: any) => i.id === id).rect;
  const [cols, wide] = [at("cols"), at("wide")];
  expect(wide.x).toBeGreaterThanOrEqual(cols.x - 1);
  expect(wide.x + wide.w).toBeLessThanOrEqual(cols.x + cols.w + 1);
  // Columns' cells, and what's in them, are measured inside their parent.
  for (const id of ["two", "cell-a", "cell-b", "cell-a-go", "three", "n3"]) expect(ids).toContain(id);
  const within = (child: string, parent: string) => {
    const [c, p] = [at(child), at(parent)];
    return c.x >= p.x - 1 && c.y >= p.y - 1 && c.x + c.w <= p.x + p.w + 1 && c.y + c.h <= p.y + p.h + 1;
  };
  expect(within("cell-a", "two") && within("cell-b", "two") && within("cell-a-go", "cell-a") && within("n3", "three") && within("three", "cell-b")).toBe(true);
  // A slider is measured inside its cell, as wide as the cell's inside (16px of padding each side).
  for (const id of ["gallery", "slide-cell"]) expect(ids).toContain(id);
  expect(within("gallery", "slide-cell")).toBe(true);
  expect(Math.abs(at("slide-cell").w - 32 - at("gallery").w)).toBeLessThan(2);
  expect(layout.doc.h).toBeGreaterThan(layout.viewport.h);

  await page.evaluate(() => (window as any).send({ type: "scrollBy", dx: 0, dy: 400 }));
  await expect.poll(async () => (await lastLayout(page))?.scroll?.y ?? 0).toBeGreaterThan(300);

  // Links stay put inside the editor.
  const frame = page.frameLocator("#f");
  await page.evaluate(() => (window as any).send({ type: "scrollTo", y: 0 }));
  await frame.locator('[data-tree-node="go"]').click();
  await page.waitForTimeout(800);
  expect(page.frames().find((f) => f !== page.mainFrame())?.url()).toBe("http://127.0.0.1:3000/studio-frame?token=good");
});

test("in the editor's frame nothing waits unseen, and a look can be tried before it's saved", async ({ page }) => {
  await page.goto(`${HARNESS}?src=${encodeURIComponent("/studio-frame?token=good")}`);
  await expect.poll(async () => (await lastLayout(page))?.items?.length ?? 0, { timeout: 30_000 }).toBeGreaterThan(6);
  const frame = page.frameLocator("#f");
  const title = frame.locator('[data-tree-node="tilt-title"]');
  await title.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  // Things come in only when the editor asks: here the title is simply there.
  expect(await title.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  await page.evaluate(() => (window as any).send({ type: "previewLook", nodeId: "tilt-badge", vars: { "--pt-rx": "40deg", "--pt-s": "1.5", "--pt-bad": "x", opacity: 0.8 } }));
  const badge = frame.locator('[data-tree-node="tilt-badge"]');
  await expect.poll(() => badge.evaluate((el) => el.style.getPropertyValue("--pt-rx"))).toBe("40deg");
  expect(await badge.evaluate((el) => [el.style.getPropertyValue("--pt-s"), el.style.getPropertyValue("--pt-bad"), el.style.opacity].join("|"))).toBe("1.5||0.8");
  // Asked to play one element, its coming in runs.
  await page.evaluate(() => (window as any).send({ type: "motionPlay", nodeId: "tilt-title" }));
  await expect.poll(() => title.evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 5000 }).toBeLessThan(1);
  await expect.poll(() => title.evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 5000 }).toBe(1);
});

test("inside the home's sections and scenes: each word, button and card is measured, and the home looks as the home", async ({ page, request }) => {
  await request.get("http://127.0.0.1:4100/__test/scenes?on=1");
  try {
    await page.goto(`${HARNESS}?src=${encodeURIComponent("/studio-frame?token=good-home")}`);
    const has = (match: (i: any) => boolean) => async () => Boolean((await lastLayout(page))?.items?.some(match));
    await expect.poll(has((i) => i.kind === "block" && i.block === "seasons"), { timeout: 45_000 }).toBe(true);
    // A scene's words are kept in the opening's data, each language its own; the scene is their owner.
    await expect.poll(has((i) => i.kind === "slot" && i.owner === "b:seasons" && i.sectionId === "hero" && i.path === "roseScenes.seasons.winter.title.ar" && i.edit === "lines")).toBe(true);
    // A button is measured whole, with its link's field (once it has come in, as the page scrolls to it).
    await page.frameLocator("#f").locator('[data-cms-section="cta"]').scrollIntoViewIfNeeded();
    await expect.poll(has((i) => i.kind === "slot" && i.owner === "s:cta" && i.path === "buttonLabel" && i.link === "buttonHref")).toBe(true);
    const layout = await lastLayout(page);
    // Product cards, and what's inside each one under it.
    const card = layout.items.find((i: any) => i.kind === "part" && i.owner === "s:products" && i.name === "card" && i.n === 0);
    expect(card?.count).toBeGreaterThan(0);
    expect(layout.items.find((i: any) => i.kind === "part" && i.owner === "s:products" && i.name === "card-name" && i.n === 0)?.within).toBe("p:card:0");
    // Anything else that shows can be picked too.
    expect(layout.items.some((i: any) => i.kind === "auto" && i.owner.startsWith("s:"))).toBe(true);
    // The editor's frame shows the home as the home does.
    await expect.poll(() => page.frameLocator("#f").locator("html").getAttribute("data-cinematic-home")).toBe("true");
  } finally {
    await request.get("http://127.0.0.1:4100/__test/scenes?on=0");
  }
});

test("objects placed over an old section show on a layer over it, measured with that layer as their holder", async ({ page, request }) => {
  const home = await (await request.get("http://127.0.0.1:4100/v1/storefront/page?slug=/")).json();
  const sections = home.sections.map((s: any) => ({ id: s.id, type: s.type, data: s.data, isVisible: s.isVisible !== false, tr: {} }));
  const words = { id: "over-faq", type: "heading", props: { level: 2, text: { ar: "كلام فوق الأسئلة" } }, style: { base: { layer: { x: 20, y: 30, anchor: "center" } } } };
  const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: home.sections.map((s: any) => ({ id: `s-${s.id}`, type: "legacy", props: { sectionId: s.id }, ...(s.id === "faq" ? { children: [words] } : {}) })) } };
  await request.post("http://127.0.0.1:4100/__test/preview-draft", { data: { pageId: "home", sections, tree, rev: 1, updatedAt: "" } });
  await page.goto(`${HARNESS}?src=${encodeURIComponent("/studio-frame?token=good-draft")}`);
  const frame = page.frameLocator("#f");
  const over = frame.locator('[data-cms-section="faq"] > .pt-over [data-tree-node="over-faq"]');
  await expect(over).toHaveText("كلام فوق الأسئلة");
  expect(await over.evaluate((el) => getComputedStyle(el).position)).toBe("absolute");
  await over.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await lastLayout(page))?.items?.find((i: any) => i.kind === "node" && i.id === "over-faq")?.holder?.w ?? 0, { timeout: 30_000 }).toBeGreaterThan(600);
  // Its section is still measured whole, and the layer lets clicks through to it.
  const layout = await lastLayout(page);
  expect(layout.items.some((i: any) => i.kind === "legacy" && i.sectionId === "faq")).toBe(true);
  expect(await frame.locator('[data-cms-section="faq"] > .pt-over').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
});

test("the home page as a tree, in English: old sections are measured as whole blocks", async ({ page }) => {
  await page.goto(`${HARNESS}?src=${encodeURIComponent("/en/studio-frame?token=good-home")}`);
  await expect.poll(async () => (await lastLayout(page))?.items?.length ?? 0, { timeout: 45_000 }).toBeGreaterThan(2);
  const layout = await lastLayout(page);
  expect(layout).toMatchObject({ pageId: "home", lang: "en", dir: "ltr" });
  const legacy = layout.items.filter((i: any) => i.kind === "legacy").map((i: any) => i.sectionId);
  expect(legacy).toContain("hero");
  expect(new Set(legacy).size).toBe(legacy.length);
});
