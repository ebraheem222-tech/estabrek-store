import { test, expect, type APIRequestContext } from "@playwright/test";
import { declarations, sliderAspect, treeCss } from "../src/pageTree/css";
import { TREE_TRANSFORM, asTree, motionOf, pickText, sliderSeconds, sliderSlides } from "../src/pageTree/tree";
import { artHasLines, safeArt } from "../src/pageTree/svgArt";

// The new CMS's page tree (src/pageTree): a converted page draws exactly as before,
// and a page of new elements draws on the server in three languages.
const API = "http://127.0.0.1:4100";
const setTree = async (request: APIRequestContext, on: boolean) => {
  await request.post(`${API}/__test/page-tree`, { data: { on } });
  await request.post("/api/revalidate", { data: { tags: ["cms:pages"] } });
};
/** The page's server HTML, from <main> to its end (no scripts run). */
const mainHtml = async (request: APIRequestContext, path: string) => {
  const html = await (await request.get(path)).text();
  const start = html.indexOf("<main");
  const end = html.lastIndexOf("</main>");
  expect(start, `${path} has a <main>`).toBeGreaterThan(-1);
  // Next's dev-mode "client rendering" notes carry a stack trace and timestamps that change per request.
  return html
    .slice(start, end + 7)
    .replace(/<template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"[^>]*><\/template>/g, "<template/>")
    .replace(/\?v=\d+/g, "");
};

test.describe("styles become safe CSS", () => {
  test("sides follow the text direction; bad values are dropped", () => {
    expect(declarations({ pad: [8, 16, 24, 32], margin: [0, 0, 12, 0], bg: "accent", color: "#fff", col: "1 / 3", weight: 600, textAlign: "end" }, "section")).toEqual([
      "padding-block:8px 24px",
      "padding-inline:32px 16px",
      "margin-block:0px 12px",
      "margin-inline:0px 0px",
      "grid-column:1 / 3",
      "background:var(--accent)",
      "color:#fff",
      "font-weight:600",
      "text-align:end",
    ]);
    expect(declarations({ bg: "red;background:url(x)", width: "calc(1px)", size: 999, weight: 450, col: "1/3;x" } as any, "text")).toEqual([]);
  });

  test("grids get fewer columns on smaller screens by themselves", () => {
    const css = treeCss({
      version: 1,
      root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "g", type: "grid", props: {}, style: { base: { columns: 4 } }, children: [{ id: "c", type: "text", props: {}, style: { base: { col: "span 2" } } }] }] }] },
    });
    expect(css).toContain(".pt-g{grid-template-columns:repeat(4,minmax(0,1fr))}");
    expect(css).toMatch(/@media \(max-width:1023\.98px\)\{[^@]*\.pt-g\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
    expect(css).toMatch(/@media \(max-width:639\.98px\)\{[^@]*\.pt-g\{grid-template-columns:minmax\(0,1fr\)\}\.pt-c\{grid-column:auto\}/);
    // Only old sections: nothing to add.
    expect(treeCss({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "l", type: "legacy", props: { sectionId: "x" } }] } })).toBe("");
  });

  test("columns: shares become tracks, shapes clip, and smaller screens get their own layout", () => {
    const cell = (id: string) => ({ id, type: "cell", props: {}, children: [] });
    const tree = (cols: Record<string, unknown>) => ({ version: 1 as const, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "c", type: "columns", props: {}, children: [cell("a"), cell("b"), cell("x")], ...cols }] }] } });
    expect(declarations({ widths: [1, 2], shape: "arch" }, "columns")).toEqual(["grid-template-columns:minmax(0,1fr) minmax(0,2fr)", "border-radius:999px 999px 0 0", "overflow:hidden"]);
    expect(declarations({ shape: "circle" }, "cell")).toEqual(["border-radius:50%", "aspect-ratio:1/1", "overflow:hidden"]);
    expect(declarations({ widths: [0, 2], shape: "star" } as any, "columns")).toEqual([]);

    // Three equal cells: two on a tablet with the last one across, one under the other on a phone.
    const css = treeCss(tree({}));
    expect(css).toContain(".pt-c{grid-template-columns:repeat(3,minmax(0,1fr))}");
    expect(css).toMatch(/@media \(max-width:1023\.98px\)\{[^@]*\.pt-c\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}[^@]*\.pt-c>\.pt-cell:last-child\{grid-column:1 \/ -1\}/);
    expect(css).toMatch(/@media \(max-width:639\.98px\)\{[^@]*\.pt-c\{grid-template-columns:minmax\(0,1fr\)\}[^@]*\.pt-c>\.pt-cell:last-child\{grid-column:auto\}/);
    // The last first on a phone, or side by side as on a computer.
    expect(treeCss(tree({ props: { phone: "reverse" } }))).toMatch(/639\.98px\)\{[^@]*\.pt-c\{display:flex;flex-direction:column-reverse\}/);
    expect(treeCss(tree({ props: { phone: "keep" }, style: { base: { widths: [1, 2, 1] } } }))).toMatch(/639\.98px\)\{[^@]*\.pt-c\{grid-template-columns:minmax\(0,1fr\) minmax\(0,2fr\) minmax\(0,1fr\)\}/);
    // A screen's own shares win over the automatic ones.
    const own = treeCss(tree({ style: { base: { widths: [1, 1, 1] }, tablet: { widths: [2, 1, 1] }, mobile: { widths: [1, 1] } } }));
    expect(own).toMatch(/1023\.98px\)\{[^@]*\.pt-c\{grid-template-columns:minmax\(0,2fr\) minmax\(0,1fr\) minmax\(0,1fr\)\}/);
    expect(own).not.toContain(".pt-c{grid-template-columns:repeat(2,minmax(0,1fr))}");
    expect(own).not.toContain(".pt-c{display:flex");
  });

  test("a slider: safe slides only, at most 12, and its frame from its settings", () => {
    const slides = sliderSlides({ slides: [{ src: "/a.webp", caption: { ar: "أ" } }, { src: "javascript:alert(1)" }, "junk", { src: "https://x.test/c.mp4", kind: "video", href: "javascript:x" }, { src: "//evil.com/a.jpg" }] });
    expect(slides).toEqual([{ src: "/a.webp", kind: "image", caption: { ar: "أ" } }, { src: "https://x.test/c.mp4", kind: "video" }]);
    expect(sliderSlides({ slides: Array.from({ length: 20 }, (_, i) => ({ src: `/p/${i}.webp` })) })).toHaveLength(12);
    expect(sliderSlides({})).toEqual([]);
    expect([sliderSeconds(5), sliderSeconds(1), sliderSeconds(2.5), sliderSeconds("5")]).toEqual([5, 0, 0, 0]);
    expect([sliderAspect("4 / 3"), sliderAspect("0 / 3"), sliderAspect("4/3;x"), sliderAspect(43)]).toEqual(["4/3", undefined, undefined, undefined]);
    const css = treeCss({
      version: 1,
      root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [{ id: "sl", type: "slider", props: { aspect: "4 / 5", slides: [] }, style: { mobile: { aspect: "1 / 1" } } }] }] },
    });
    expect(css).toContain(".pt-sl{aspect-ratio:4/5}");
    expect(css).toMatch(/639\.98px\)\{[^@]*\.pt-sl\{aspect-ratio:1\/1\}/);
    // A slider in a cell takes the cell's whole width.
    expect(css).toMatch(/\.pt-cell>:is\([^)]*\.pt-slider[^)]*\)\{align-self:stretch\}/);
  });

  test("turns, moves, colour layers, shadows and free places become safe CSS", () => {
    expect(declarations({ rotateX: 20, rotateZ: -5, perspective: 900, scale: 1.1, moveX: 10, origin: "top" }, "video")).toEqual(["--pt-rx:20deg", "--pt-rz:-5deg", "--pt-p:900px", "--pt-s:1.1", "--pt-x:10px", "transform-origin:50% 0%"]);
    expect(declarations({ overlay: { color: "#000000", to: "accent", angle: 180, opacity: 0.45, blend: "multiply" } }, "video")).toEqual(["--pt-ov:linear-gradient(180deg,#000000,var(--accent))", "--pt-ovo:0.45", "--pt-ovb:multiply"]);
    expect(declarations({ shadow: "md", shade: { x: 0, y: 12, blur: 30, color: "#00000066" }, glow: { color: "accent", size: 20 } }, "cell")).toEqual(["box-shadow:0 8px 24px rgba(0,0,0,.10),0px 12px 30px #00000066,0 0 20px var(--accent)"]);
    expect(declarations({ shade: { x: 2, y: 8, blur: 16, color: "black", follow: true }, glow: { color: "white", size: 12 } }, "heading")).toEqual(["filter:drop-shadow(2px 8px 16px #000)", "text-shadow:0 0 12px #fff"]);
    expect(declarations({ layer: { x: 50, y: 100, anchor: "bottom" }, z: 3 }, "text")).toEqual(["position:absolute", "inset-inline-start:50%", "top:100%", "margin:0", "--pt-ax:calc(var(--pt-flip,1) * -50%)", "--pt-ay:-100%", "z-index:3"]);
    expect(declarations({ layer: false }, "text")).toEqual(["position:relative", "inset:auto", "--pt-ax:0%", "--pt-ay:0%"]);
    expect(declarations({ rotateX: 999, perspective: 50, overlay: { color: "red;x", opacity: 0.5 }, shade: { x: 0, y: 0, blur: 9999, color: "#000" }, layer: { x: 200, y: 0 }, z: 1.5 } as any, "text")).toEqual([]);

    const tree = {
      version: 1 as const,
      root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, motion: { enter: { kind: "up", stagger: 0.1 } }, children: [
        { id: "v", type: "video", props: { src: "/a.mp4" }, style: { base: { overlay: { color: "#000", opacity: 0.4 } } }, motion: { fx: { kind: "shine", color: "white", speed: 2 } } },
        { id: "t", type: "text", props: {}, style: { base: { overlay: { color: "accent", opacity: 0.2 } } } },
        { id: "n", type: "text", props: {} },
      ] }] },
    };
    const css = treeCss(tree);
    // The moving ones (and what a stagger brings in) get the transform, at rest before their own values.
    expect(css).toContain(`.pt-s,.pt-v,.pt-t,.pt-n{--pt-ax:0%;`);
    expect(css).toContain(`transform:${TREE_TRANSFORM}}`);
    // A clip's colour layer goes over it; a text's under its words.
    expect(css).toContain(".pt-v::after{content:\"\";position:absolute;inset:0;");
    expect(css).toContain(".pt-t::before{content:\"\";position:absolute;inset:0;");
    expect(css).toMatch(/\.pt-t::before\{[^}]*z-index:-1\}/);
    expect(css).toContain(".pt-v,.pt-t{position:relative;isolation:isolate}");
    expect(css).toContain(".pt-v>.pt-fx{--pt-fxc:#fff;--pt-fxs:1.50s}");
    // Unknown motion is dropped before it reaches the page.
    expect(motionOf({ id: "x", type: "text", props: {}, motion: { enter: { kind: "explode" }, loop: { kind: "float", duration: 99 }, hover: { kind: "tilt", amount: 2 } } })).toEqual({ loop: { kind: "float" }, hover: { kind: "tilt", amount: 2 } });
    expect(motionOf({ id: "x", type: "text", props: {}, motion: "nope" })).toBeNull();
  });

  test("a drawing is checked again: what isn't allowed drops out", () => {
    const art = safeArt({ viewBox: "0 0 10 10", morph: "M0 0 L 1 1 <x>", nodes: [
      { t: "script", a: {} },
      { t: "g", a: { transform: "rotate(5)", onload: "x" }, c: [{ t: "circle", a: { r: "4", fill: "url(javascript:x)", stroke: "accent", href: "https://x.test" } }, { t: "foreignObject", a: {} }] },
    ] });
    expect(art).toEqual({ viewBox: "0 0 10 10", nodes: [{ t: "g", a: { transform: "rotate(5)" }, c: [{ t: "circle", a: { r: "4", stroke: "accent" } }] }] });
    expect(artHasLines(art!)).toBe(true);
    expect(safeArt({ viewBox: "0 0 10 10", nodes: [{ t: "script", a: {} }] })).toBeNull();
    expect(safeArt({ viewBox: "javascript:alert(1)", nodes: [{ t: "path", a: { d: "M0 0" } }] })).toBeNull();
  });

  test("words fall back to the store's main language; a broken tree reads as none", () => {
    expect(pickText({ ar: "مرحبا", en: "Hi" }, "he", "ar")).toBe("مرحبا");
    expect(pickText({ en: "Hi" }, "he", "ar")).toBe("Hi");
    expect(asTree({ version: 1, root: { id: "x", type: "section" } })).toBeNull();
  });
});

test.describe.serial("a converted page", () => {
  test.afterAll(async ({ request }) => setTree(request, false));

  for (const path of ["/", "/contact", "/native-templates"]) {
    test(`${path} draws exactly as before`, async ({ request }) => {
      await setTree(request, false);
      const before = await mainHtml(request, path);
      await setTree(request, true);
      const after = await mainHtml(request, path);
      expect(after).toBe(before);
      expect(after).not.toContain("data-page-tree");
    });
  }
});

test.describe.serial("a page of new elements", () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${API}/__test/languages`, { data: { enabled: ["ar", "en", "he"], default: "ar" } });
    await request.post("/api/revalidate", { data: { tags: ["cms:pages", "cms:bootstrap", "settings"] } });
  });
  test.afterAll(async ({ request }) => {
    await request.post(`${API}/__test/languages`, { data: {} });
    await request.post("/api/revalidate", { data: { tags: ["cms:bootstrap", "settings"] } });
  });

  test("draws on the server in each language, with the old section in its place", async ({ page }) => {
    for (const [path, title, wide, shop, dir] of [
      ["/tree-demo", "عنوان من الشجرة", "خلية عريضة", "/shop", "rtl"],
      ["/en/tree-demo", "A title from the tree", "A wide cell", "/en/shop", "ltr"],
      ["/he/tree-demo", "כותרת מהעץ", "תא רחב", "/he/shop", "rtl"],
    ] as const) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator('[data-tree-node="title"]')).toHaveText(title);
      await expect(page.locator('[data-tree-node="wide"]')).toHaveText(wide);
      // A language with no words of its own shows the main language's.
      await expect(page.locator('[data-tree-node="only-ar"]')).toHaveText("نص بالعربي بس");
      await expect(page.locator('[data-tree-node="go"]')).toHaveAttribute("href", shop);
      // The old section sits between the two new ones.
      const order = await page.evaluate(() => {
        const at = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top;
        return [at('[data-tree-node="intro"]'), at('[data-cms-section="demo-faq"], #demo-faq, [data-section-id="demo-faq"]') || 0, at('[data-tree-node="shop"]')];
      }).catch(() => null);
      if (order) expect(order[0]).toBeLessThan(order[2]);
      await expect(page.getByText("أسئلة القسم القديم")).toBeVisible();
    }
  });

  test("links are checked, the grid follows the screen, products come from the store", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tree-demo");
    await expect(page.locator('[data-tree-node="bad"]')).toHaveAttribute("href", "#");
    await expect(page.locator('[data-tree-node="away"]')).toHaveAttribute("target", "_blank");
    const cols = () => page.locator('[data-tree-node="cols"]').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(await cols()).toBe(3);
    const wideSpan = await page.locator('[data-tree-node="wide"]').evaluate((el) => getComputedStyle(el).gridColumnEnd);
    expect(wideSpan).toBe("3");
    await expect(page.locator('[data-tree-node="picks"]')).toContainText("قطع مختارة");
    await expect(page.locator('[data-tree-node="picks"] a[href*="rose-dress"]').first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await cols()).toBe(1);
    const titleSize = await page.locator('[data-tree-node="title"]').evaluate((el) => getComputedStyle(el).fontSize);
    expect(titleSize).toBe("30px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test("a tilted clip straightens with the scroll; a title sits over it; layers, shadows and loops show", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tree-demo");
    const node = (id: string) => page.locator(`[data-tree-node="${id}"]`);
    const rect = (id: string) => node(id).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const cssVar = (id: string, name: string) => node(id).evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);
    // The clip sits in a frame with its colour layer over it.
    await expect(node("tilt-clip")).toHaveClass(/pt-frame/);
    expect(await node("tilt-clip").locator("video").count()).toBe(1);
    const layer = await node("tilt-clip").evaluate((el) => { const s = getComputedStyle(el, "::after"); return [s.opacity, s.mixBlendMode, s.backgroundImage.startsWith("linear-gradient")].join(" "); });
    expect(layer).toBe("0.45 multiply true");
    // Far below: tilted and smaller. At 35 % of the screen: flat.
    const stageTop = await node("tilt-stage").evaluate((el) => el.getBoundingClientRect().top + scrollY);
    await page.evaluate((y) => scrollTo(0, y - innerHeight + 2), stageTop);
    await expect.poll(async () => parseFloat(await cssVar("tilt-stage", "--pt-mrx")), { timeout: 15_000 }).toBeGreaterThan(20);
    expect(parseFloat(await cssVar("tilt-stage", "--pt-ms"))).toBeLessThan(0.95);
    await page.evaluate((y) => scrollTo(0, y - innerHeight * 0.2), stageTop);
    await expect.poll(async () => parseFloat(await cssVar("tilt-stage", "--pt-mrx")), { timeout: 10_000 }).toBeLessThan(1);
    // The title came in and sits in the middle of the clip, glowing.
    await expect.poll(async () => Number(await node("tilt-title").evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
    const [t, c] = [await rect("tilt-title"), await rect("tilt-clip")];
    expect(await node("tilt-title").evaluate((el) => getComputedStyle(el).position)).toBe("absolute");
    expect(Math.abs(t.x + t.w / 2 - (c.x + c.w / 2))).toBeLessThan(3);
    expect(Math.abs(t.y + t.h / 2 - (c.y + c.h / 2))).toBeLessThan(3);
    expect(await node("tilt-title").evaluate((el) => getComputedStyle(el).textShadow)).toContain("24px");
    // The badge: tilted, half seen, its own shadow, and it floats.
    const badge = await node("tilt-badge").evaluate((el) => { const s = getComputedStyle(el); return { t: s.transform, o: s.opacity, b: s.boxShadow }; });
    expect(badge.t).not.toBe("none");
    expect(badge.o).toBe("0.5");
    expect(badge.b).toContain("12px 30px");
    const ly1 = await cssVar("tilt-badge", "--pt-ly");
    await page.waitForTimeout(500);
    expect(await cssVar("tilt-badge", "--pt-ly")).not.toBe(ly1);
    // The picture: framed, a shine running inside, a zoom on hover.
    await expect(node("tilt-pic")).toHaveClass(/pt-hv-zoom/);
    expect(await node("tilt-pic").locator(".pt-fx-shine").count()).toBe(1);
    // On a phone the title goes back under the clip.
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await node("tilt-title").evaluate((el) => getComputedStyle(el).position)).toBe("relative");
    const [pt, pc] = [await rect("tilt-title"), await rect("tilt-clip")];
    expect(pt.y).toBeGreaterThanOrEqual(pc.y + pc.h - 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test("drawings: shapes from data, ids of their own, a morph and a line that draws itself", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tree-demo");
    const blob = page.locator('[data-tree-node="art-blob"]');
    await expect(blob).toHaveAttribute("role", "img");
    await expect(blob).toHaveAttribute("aria-label", "فقاعة");
    expect(await blob.evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(220);
    // A theme colour goes through the CSS variable.
    expect(await blob.locator("path").evaluate((el) => (el as SVGPathElement).style.fill)).toBe("var(--accent-soft)");
    // The line's gradient carries the element's id, and the line points at it.
    const line = page.locator('[data-tree-node="art-line"]');
    await expect(line).toHaveAttribute("aria-hidden", "true");
    expect(await line.locator("linearGradient").getAttribute("id")).toBe("art-line-g");
    expect(await line.locator("path").getAttribute("stroke")).toBe("url(#art-line-g)");
    // What isn't allowed never reaches the page.
    const bad = page.locator('[data-tree-node="art-bad"]');
    expect(await bad.locator("script").count()).toBe(0);
    expect(await bad.locator("circle").evaluate((el) => [el.getAttribute("onclick"), el.getAttribute("href"), getComputedStyle(el).fill].join("|"))).toBe("||rgb(255, 255, 255)");
    // The blob morphs; the line draws itself once it's seen.
    await blob.scrollIntoViewIfNeeded();
    // Drawn in: its line draws, then its fill comes back to full.
    await expect.poll(() => blob.locator("path").evaluate((el) => Number(getComputedStyle(el).fillOpacity)), { timeout: 8000 }).toBe(1);
    const d0 = await blob.locator("path").getAttribute("d");
    await expect.poll(() => blob.locator("path").getAttribute("d"), { timeout: 8000 }).not.toBe(d0);
    await line.scrollIntoViewIfNeeded();
    await expect.poll(() => line.locator("path").evaluate((el) => (el as SVGPathElement).style.strokeDasharray), { timeout: 8000 }).not.toBe("");
  });

  test("a product's 360° view in the page: its colour's own view, turning, in each language", async ({ page }) => {
    await page.request.post("/api/revalidate", { data: { tags: ["catalog", "catalog:products"] } });
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [path, label] of [["/tree-demo", "الفستان بيلف"], ["/en/tree-demo", "The dress turning"]] as const) {
      await page.goto(path);
      const view = page.getByTestId("spin-spin-berry");
      await expect(view).toHaveAttribute("aria-label", label);
      await expect(view).toHaveAttribute("data-ready", "1", { timeout: 15_000 });
      expect(await view.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("c=berry");
      expect(Math.round(await page.locator('[data-tree-node="spin-berry"]').evaluate((el) => el.getBoundingClientRect().width))).toBe(240);
    }
    const view = page.getByTestId("spin-spin-berry");
    await view.scrollIntoViewIfNeeded();
    const f0 = await view.getAttribute("data-frame");
    await expect.poll(() => view.getAttribute("data-frame"), { timeout: 5000 }).not.toBe(f0);
  });

  test("with reduced motion nothing moves and everything shows", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("http://127.0.0.1:3000/tree-demo");
    const title = page.locator('[data-tree-node="tilt-title"]');
    await title.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    expect(await title.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    expect(await page.locator('[data-tree-node="tilt-stage"]').evaluate((el) => el.style.getPropertyValue("--pt-mrx"))).toBe("");
    expect(await page.evaluate(() => document.documentElement.classList.contains("pt-pending"))).toBe(false);
    await ctx.close();
  });

  test("columns: a third and two thirds, each cell its own container, and they stack on a phone", async ({ page }) => {
    const box = (id: string) => page.locator(`[data-tree-node="${id}"]`).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height };
    });
    type Box = { x: number; y: number; w: number; h: number };
    const inside = (a: Box, b: Box) => a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;
    const tracks = (id: string) => page.locator(`[data-tree-node="${id}"]`).evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);

    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [path, first, see] of [["/tree-demo", "خلية أولى", "/shop"], ["/en/tree-demo", "First cell", "/en/shop"], ["/he/tree-demo", "תא ראשון", "/he/shop"]] as const) {
      await page.goto(path);
      await expect(page.locator('[data-tree-node="cell-a-title"]')).toHaveText(first);
      await expect(page.locator('[data-tree-node="cell-a-go"]')).toHaveAttribute("href", see);
    }
    await page.goto("/tree-demo");
    const [a, b, two] = [await box("cell-a"), await box("cell-b"), await box("two")];
    // Side by side, a third and two thirds (the first cell on the right in Arabic).
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(a.x).toBeGreaterThan(b.x);
    expect(a.w / b.w).toBeGreaterThan(0.45);
    expect(a.w / b.w).toBeLessThan(0.55);
    // Each cell holds its own things, in its own shape, aligned its own way.
    expect(inside(await box("cell-a-go"), a)).toBe(true);
    expect(inside(await box("three"), b)).toBe(true);
    expect(inside(a, two) && inside(b, two)).toBe(true);
    const look = await page.locator('[data-tree-node="cell-a"]').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, overflow: cs.overflow, justify: cs.justifyContent, align: cs.alignItems };
    });
    expect(look).toEqual({ radius: "24px", overflow: "hidden", justify: "center", align: "center" });
    expect(await page.locator('[data-tree-node="cell-b"]').evaluate((el) => getComputedStyle(el).borderTopRightRadius)).toBe("999px");
    const go = await box("cell-a-go");
    expect(Math.abs(go.x + go.w / 2 - (a.x + a.w / 2))).toBeLessThan(2);
    expect(await tracks("three")).toBe(3);

    // Tablet: two cells stay side by side; three inside become two, the odd one across.
    await page.setViewportSize({ width: 820, height: 1180 });
    expect(await tracks("two")).toBe(2);
    const [n1, n3, three] = [await box("n1"), await box("n3"), await box("three")];
    expect(await tracks("three")).toBe(2);
    expect(n3.y).toBeGreaterThan(n1.y);
    expect(Math.abs(n3.w - three.w)).toBeLessThan(2);

    // Phone: one under the other, the last first ("reverse"), and nothing sticks out.
    await page.setViewportSize({ width: 390, height: 844 });
    const [pa, pb] = [await box("cell-a"), await box("cell-b")];
    expect(pb.y + pb.h).toBeLessThanOrEqual(pa.y + 1);
    expect(Math.abs(pa.w - pb.w)).toBeLessThan(2);
    expect(await tracks("three")).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test("a slider in a cell: drawn on the server, turned with the arrows, the dots or a swipe, in three languages", async ({ page, request, browser }) => {
    const g = '[data-tree-node="gallery"]';
    const box = (sel: string, p = page) => p.locator(sel).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    /** The slide that fills the frame (by where it sits) and the dot that says so. */
    const shown = (p = page) => p.locator(`${g} .pt-slides`).evaluate((row) => {
      const t = row.getBoundingClientRect();
      return Array.from(row.children).findIndex((s) => Math.abs(s.getBoundingClientRect().left - t.left) < 2);
    });
    const dot = (p = page) => p.locator(`${g} .pt-slider-dot`).evaluateAll((els) => els.findIndex((e) => e.getAttribute("aria-current") === "true"));

    // On the server: a row of slides that snaps (it swipes with no scripts), the bad address left out, no buttons yet.
    const html = await (await request.get("/tree-demo")).text();
    const drawn = html.slice(html.indexOf('data-tree-node="gallery"'), html.indexOf('data-tree-node="slide-note"'));
    expect(drawn.match(/class="pt-slide"/g)).toHaveLength(3);
    expect(drawn).not.toContain("javascript:");
    expect(drawn).not.toContain("pt-slider-arrow");
    expect(drawn).toMatch(/<video[^>]*playsinline/i);
    expect(html).toContain("scroll-snap-type:x mandatory");
    expect(html).toContain(".pt-gallery{aspect-ratio:4/3}");

    // Nothing turns by itself while we look; the clip waits with its own buttons.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [path, first, shop, next] of [
      ["/tree-demo", "حجابات الموسم", "/shop", "الشريحة التالية"],
      ["/en/tree-demo", "This season's hijabs", "/en/shop", "Next slide"],
      ["/he/tree-demo", "חיג'אבים של העונה", "/he/shop", "השקופית הבאה"],
    ] as const) {
      await page.goto(path);
      await expect(page.locator(`${g} .pt-slide`)).toHaveCount(3);
      await expect(page.locator(`${g} .pt-slide-caption`).first()).toHaveText(first);
      // A language with no words of its own shows the main language's.
      await expect(page.locator(`${g} .pt-slide-caption`).nth(2)).toHaveText("بالعربي بس");
      await expect(page.locator(`${g} .pt-slide-link`).first()).toHaveAttribute("href", shop);
      await expect(page.locator(`${g} .pt-slider-dot`)).toHaveCount(3);
      await expect(page.locator(`${g} .pt-slider-next`)).toHaveAttribute("aria-label", next);
    }

    // It fills its cell (inside the cell's padding) although the cell centres its things, in a 4:3 frame.
    const [cell, slider, note] = [await box('[data-tree-node="slide-cell"]'), await box(g), await box('[data-tree-node="slide-note"]')];
    expect(Math.abs(cell.w - 32 - slider.w)).toBeLessThan(2);
    expect(Math.abs(slider.w / slider.h - 4 / 3)).toBeLessThan(0.02);
    expect(note.y).toBeGreaterThanOrEqual(slider.y + slider.h);
    expect(await page.locator(`${g} .pt-slider-pause`).count()).toBe(0);

    // Arabic: the next slide is on the left; arrows, dots, and round again from the end.
    await page.goto("/tree-demo");
    await page.locator(g).scrollIntoViewIfNeeded();
    await expect(page.locator(`${g} .pt-slider-dot`)).toHaveCount(3);
    expect((await box(`${g} .pt-slider-next`)).x).toBeLessThan((await box(`${g} .pt-slider-prev`)).x);
    await page.locator(`${g} .pt-slider-next`).click();
    await expect.poll(() => shown()).toBe(1);
    expect(await dot()).toBe(1);
    const clip = await page.locator(`${g} video`).evaluate((v: HTMLVideoElement) => ({ paused: v.paused, controls: v.controls, muted: v.muted }));
    expect(clip).toEqual({ paused: true, controls: true, muted: true });
    await page.locator(`${g} .pt-slider-dot`).nth(2).click();
    await expect.poll(() => shown()).toBe(2);
    await page.locator(`${g} .pt-slider-next`).click();
    await expect.poll(() => shown()).toBe(0);
    await page.locator(`${g} .pt-slider-prev`).click();
    await expect.poll(() => shown()).toBe(2);
    expect(await dot()).toBe(2);
    // A sideways scroll (a trackpad's swipe) snaps to the next slide: in Arabic that's leftwards.
    await page.locator(`${g} .pt-slider-dot`).first().click();
    await expect.poll(() => shown()).toBe(0);
    const row = await box(`${g} .pt-slides`);
    await page.mouse.move(row.x + row.w / 2, row.y + row.h / 3);
    await page.mouse.wheel(-row.w * 0.6, 0);
    await expect.poll(() => shown()).toBe(1);
    await expect.poll(() => dot()).toBe(1);

    // A phone, by touch, in Hebrew: a finger moving right brings the next slide, and nothing sticks out.
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce", baseURL: "http://127.0.0.1:3000" });
    const p = await phone.newPage();
    await p.goto("/he/tree-demo");
    await p.locator(g).scrollIntoViewIfNeeded();
    await expect(p.locator(`${g} .pt-slider-dot`)).toHaveCount(3);
    expect(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const [pc, ps, prow, pslide] = [await box('[data-tree-node="slide-cell"]', p), await box(g, p), await box(`${g} .pt-slides`, p), await box(`${g} .pt-slide`, p)];
    expect(ps.w).toBeLessThanOrEqual(390);
    expect(Math.abs(pc.w - 32 - ps.w)).toBeLessThan(2);
    expect(Math.abs(pslide.w - prow.w)).toBeLessThan(1);
    const cdp = await phone.newCDPSession(p);
    const [y, x0, x1] = [prow.y + prow.h / 3, prow.x + prow.w * 0.2, prow.x + prow.w * 0.8];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y }] });
    for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / 10, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => shown(p)).toBe(1);
    await expect.poll(() => dot(p)).toBe(1);
    expect(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await phone.close();
  });

  test("a slider turns by itself and plays its clip, and holds under the pointer or the pause button", async ({ page }) => {
    const g = '[data-tree-node="gallery"]';
    const dot = () => page.locator(`${g} .pt-slider-dot`).evaluateAll((els) => els.findIndex((e) => e.getAttribute("aria-current") === "true"));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/tree-demo");
    await page.locator(g).scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await expect(page.locator(`${g} .pt-slider-pause`)).toHaveAttribute("aria-label", "Pause");
    expect(await dot()).toBe(0);
    // Every 3 seconds; the clip on the second slide plays, muted, and only while it shows.
    await expect.poll(dot, { timeout: 8_000 }).toBe(1);
    await expect.poll(() => page.locator(`${g} video`).evaluate((v: HTMLVideoElement) => !v.paused && v.muted && !v.controls), { timeout: 8_000 }).toBe(true);
    // A pointer over it holds it.
    const r = await page.locator(g).boundingBox();
    await page.mouse.move(r!.x + r!.width / 2, r!.y + r!.height / 3);
    await page.waitForTimeout(4_000);
    expect(await dot()).toBe(1);
    // The pause button stops it, the clip too, also once the pointer has gone.
    await page.locator(`${g} .pt-slider-pause`).click();
    await expect(page.locator(`${g} .pt-slider-pause`)).toHaveAttribute("aria-pressed", "true");
    await page.mouse.move(2, 2);
    await page.waitForTimeout(4_000);
    expect(await dot()).toBe(1);
    expect(await page.locator(`${g} video`).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });
});
