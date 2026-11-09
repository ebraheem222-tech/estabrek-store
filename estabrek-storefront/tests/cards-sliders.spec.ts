import { expect, test, type Page } from "@playwright/test";

// Product cards with motion (a second picture, lifting, coming in one after another, a sale badge,
// button shapes) and slider shapes (a phone, three at once, arrows and dots).

async function configure(page: Page, patch = {}) {
  await page.request.post("http://127.0.0.1:4100/__test/commerce", { data: { on: true, ...patch } });
  await page.request.post("/api/revalidate", { headers: { "x-revalidate-secret": "fixture-publishing-only" }, data: { tags: ["cms", "cms:pages", "cms:bootstrap", "settings"], paths: ["/shop"] } });
}

test.describe("product cards", () => {
  test.afterEach(async ({ page }) => { await configure(page, { on: false }); });

  test("a card's picture, the card and its button move as designed, and cards come in one after another", async ({ page }) => {
    await configure(page, { visualControls: { version: 1, revision: 1, cardDesign: { hover: "swap", cardHover: "lift", enter: "up", buttonStyle: "pill", align: "center", titleLines: 2, showBadge: true, badgeStyle: "ribbon", imageRatio: "tall" } } });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en/shop");
    const cards = page.locator(".configured-product-card");
    const card = cards.first();
    await expect(card).toHaveAttribute("data-card-enter", "up");
    // In view: it comes in (and the ones below wait for the scroll).
    await expect(card).toHaveAttribute("data-card-in", "");
    await expect.poll(() => card.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
    await expect(card).toHaveCSS("text-align", "center");
    await expect(card.locator('[data-card-part="title"]')).toHaveCSS("-webkit-line-clamp", "2");
    await expect(card.locator('[data-card-part="image"]')).toHaveCSS("aspect-ratio", "2 / 3");
    await expect(card.locator('[data-card-part="button"] button')).toHaveCSS("border-radius", "999px");
    // A second picture turns in on hover (or, with only one, it zooms).
    const hover = await card.getAttribute("data-card-hover");
    expect(["swap", "zoom"]).toContain(hover);
    await page.mouse.move(5, 5);
    await card.hover();
    if (hover === "swap") await expect.poll(() => card.locator(".cpc-second").evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.9);
    else await expect.poll(() => card.locator(".cpc-first").evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
    // The whole card lifts.
    await expect.poll(() => card.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)).toBeLessThan(-3);
  });

  test("a button over the picture, an icon button and a badge on sample cards in the editor's preview", async ({ page }) => {
    await page.request.post("http://127.0.0.1:4100/__test/preview-draft", { data: { pageId: "cards-preview", sections: [], rev: 1, updatedAt: "", slug: "/shop", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: { contained: true }, children: [
      { id: "shop", type: "shop", props: { columns: 3, gap: 40, filtersSide: "end", cardDesign: { buttonStyle: "hover", showBadge: true, badgeStyle: "circle", cardHover: "tilt" } } },
    ] }] } } } });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/studio-frame?token=good-draft");
    const grid = page.locator(".cms-shop-preview-grid");
    await expect(grid).toHaveCSS("column-gap", "40px");
    // The filters sit at the end.
    const aside = page.locator(".cms-shop-preview-layout > aside");
    expect(await aside.evaluate((el) => getComputedStyle(el).order)).toBe("2");
    const card = page.locator(".configured-product-card").first();
    await expect(card.locator(".cpc-badge")).toHaveText("-20%");
    await expect(card.locator(".cpc-badge")).toHaveCSS("border-radius", "50%");
    // The button waits over the picture until the pointer comes.
    const button = card.locator(".cpc-media > [data-card-part=button]");
    await expect(button).toHaveCSS("opacity", "0");
    await card.hover();
    await expect(button).toHaveCSS("opacity", "1");
  });
});

const SLIDES = [1, 2, 3, 1, 2].map((n) => ({ src: `/templates/photo-${n}.svg`, kind: "image" }));
const slidersPage = {
  id: "slider-looks-fixture", slug: "/publication-fixture-en", name: "Slider looks", status: "PUBLISHED", format: 2, sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, children: [
    { id: "phone", type: "slider", props: { slides: SLIDES, look: "phone", arrowLook: "glass", dotLook: "numbers" } },
    { id: "trio", type: "slider", props: { slides: SLIDES, look: "trio", dotLook: "bars" }, style: { base: { width: "900px", maxWidth: "100%" } } },
    { id: "polaroid", type: "slider", props: { slides: SLIDES, look: "polaroid", effect: "fade", arrowLook: "corner" } },
  ] }] } },
};

test.describe("slider shapes", () => {
  test.afterEach(async ({ request }) => {
    await request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("a phone, three at once and a polaroid, with their arrows and dots", async ({ page }) => {
    await page.request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: slidersPage } });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/publication-fixture-en");
    const phone = page.locator('[data-tree-node="phone"]');
    await expect(phone).toHaveAttribute("data-look", "phone");
    const box = (await phone.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(341);
    expect(box.height / box.width).toBeGreaterThan(2);
    await expect(phone.locator(".pt-slider-arrow").first()).toHaveCSS("backdrop-filter", "blur(10px)");
    // Numbers for dots: a counter (01, 02…), not a round dot.
    const dot = await phone.locator(".pt-slider-dot").first().evaluate((el) => { const s = getComputedStyle(el, "::before"); return [s.content, s.backgroundColor]; });
    expect(dot[0]).toContain("counter(pt-sl-dot");
    expect(dot[1]).toBe("rgba(0, 0, 0, 0)");

    // Three slides side by side.
    const trio = page.locator('[data-tree-node="trio"]');
    await expect(trio).toHaveAttribute("data-ready", "");
    const [w, slide] = await trio.evaluate((el) => [el.getBoundingClientRect().width, (el.querySelector(".pt-slide") as HTMLElement).getBoundingClientRect().width]);
    expect(Math.abs(slide - (w - 28) / 3)).toBeLessThan(2);

    // A polaroid leans a little; its arrows sit together in the corner.
    const polaroid = page.locator('[data-tree-node="polaroid"]');
    expect(await polaroid.evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
    const [prev, next] = await polaroid.locator(".pt-slider-arrow").evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
    expect(Math.abs(prev.top - next.top)).toBeLessThan(4); // the polaroid leans 1.6°
    expect(Math.abs(prev.left - next.left)).toBeLessThan(60);
  });
});
