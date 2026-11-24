import { test, expect, type Page } from "@playwright/test";

// The shop's pages are a clean shell that the store's theme dresses: the rose design's ornaments (its waves,
// the drawings behind a product, the arched cards, the flourishes, its campaign pictures) are its own store's
// alone. Against the mock API: a phone shop on its kind's theme, then Estabrek itself.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
test.describe.configure({ mode: "serial" });

const NOOR = {
  name: { ar: "متجر نور", en: "Noor Store", he: "" },
  shortName: { ar: "نور", en: "Noor", he: "" },
  tagline: { ar: "", en: "ALL TECH IN ONE PLACE", he: "" },
  about: { ar: "هواتف وإلكترونيات وإكسسوارات أصلية.", en: "Phones, electronics and original accessories.", he: "" },
  industry: "electronics",
  audience: "everyone",
  legalName: "",
};

/** The rose design's ornaments, as the page has them. */
const ORNAMENTS = ".rose-wave, .rose-pdp-backdrop, .rose-motif, .rose-card-arch, .rose-card-spark";
/** Where a shared page would put one of the rose design's pictures for want of the store's own. */
const PICTURE_SPOTS = ".rose-about-portrait img, .rose-about-fabric img, .rose-contact-photo img, .rose-stage-arch img, .rose-shop-intro-image img, .hero-campaign-image";

async function settle(page: Page) {
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
}
async function open(page: Page, path: string) {
  await page.context().addCookies([{ name: "shop-lang", value: "ar", url: SITE }]);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/identity`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
});

test("a store on a theme: none of the rose design's ornaments or pictures on its pages", async ({ page }) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.request.post(`${API}/__test/identity`, { data: NOOR });
  await settle(page);
  for (const path of ["/shop", "/c/dresses", "/p/rose-dress", "/search", "/about", "/contact", "/cart", "/request"]) {
    await open(page, path);
    await expect(page.locator("html"), path).toHaveAttribute("data-store-theme", "circuit");
    await expect(page.locator(".atelier-footer").first(), path).toBeVisible();
    await expect(page.locator(ORNAMENTS), path).toHaveCount(0);
    await expect(page.locator(PICTURE_SPOTS), path).toHaveCount(0);
  }
  // The cards: the theme's own card (the shape it has on its home), not the rose design's arched tile, with the
  // shop's heart, colours, add and preview.
  for (const path of ["/shop", "/c/dresses", "/search"]) {
    await open(page, path);
    await expect(page.locator(".rose-product-tile"), path).toHaveCount(0);
    await expect(page.locator(".th-card-host[data-th-card] .th-shop-card").first(), path).toBeVisible();
  }
  await open(page, "/shop");
  const card = page.locator(".th-card-host[data-th-card] .th-shop-card").first();
  await expect(card.locator(".th-card-title")).not.toBeEmpty();
  await expect(card.locator(".th-card-price")).toContainText(/\d/);
  await expect(card.locator(".th-card-media img").first()).toBeVisible();
  const heart = card.locator(".th-card-heart");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(card.locator(".th-card-actions button").first()).toBeVisible();
  expect(await card.locator(".th-card-media").evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).not.toContain("%");
  // The contact page: no flourish under its title, and its form isn't an arch.
  await open(page, "/contact");
  expect(await page.locator(".rose-contact-intro h1").first().evaluate((el) => getComputedStyle(el, "::after").content)).toBe("none");
  expect(await page.locator(".rose-contact-form-panel").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).not.toBe("100px");
  // A product: "complete the look" is a clothes shop's; any other store's words are plain.
  await open(page, "/p/rose-dress");
  const look = page.locator('[data-testid="complete-look"]');
  await expect(look).toHaveAttribute("aria-label", "بيلبق معه");
  // The big photo takes the theme's card shape, and the pieces that go with it are the theme's cards.
  await expect(page.locator(".rose-pdp[data-th-card]")).toHaveCount(1);
  await look.scrollIntoViewIfNeeded();
  await expect(look.locator(".th-look-grid .th-card").first()).toBeVisible();
  await expect(look.locator("h2")).not.toContainText("اللبسة");
});

/**
 * What on the page is painted in the rose design's pinks (a hue between violet and red), apart from the
 * products' own colours (their swatches, the colour picked). The phone shop's theme is blue: none should be.
 */
async function rosePinks(page: Page) {
  return page.evaluate(() => {
    const pink = (c: string) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m || (m[4] !== undefined && +m[4] < 0.15)) return false;
      const [r, g, b] = [+m[1] / 255, +m[2] / 255, +m[3] / 255];
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (d < 0.06) return false;
      let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
      const l = (max + min) / 2;
      return h >= 290 && h <= 355 && d / (1 - Math.abs(2 * l - 1)) > 0.18;
    };
    const found: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("main *, .atelier-header *, .atelier-footer *"))) {
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) continue;
      // A product's own colours: its swatches and anything painted from them.
      if (el.closest('.color-chip-swatch, .rose-pdp-swatches, .rose-product-swatches, [style*="--swatch-color"], img, video, picture, canvas') || /background|--swatch/.test(el.getAttribute("style") || "")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
      const paints = [own ? cs.color : "", cs.backgroundColor, cs.borderTopWidth !== "0px" ? cs.borderTopColor : "", /^(svg|path|circle)$/i.test(el.tagName) ? `${cs.fill} ${cs.stroke}` : ""];
      for (const p of paints) {
        const hit = (p.match(/rgba?\([^)]*\)/g) || []).find(pink);
        if (hit) { found.push(`${el.tagName.toLowerCase()}.${String(el.getAttribute("class") || "").split(/\s+/).slice(0, 2).join(".")} ${hit}`); break; }
      }
    }
    return [...new Set(found)];
  });
}

test("a store on a theme: its pages wear its theme's colours, not the rose design's pinks", async ({ page }) => {
  test.setTimeout(300_000);
  await page.request.post(`${API}/__test/identity`, { data: NOOR });
  await settle(page);
  for (const path of ["/shop", "/c/dresses", "/search?q=x", "/p/rose-dress", "/cart", "/contact", "/about", "/request", "/wishlist", "/track"]) {
    await open(page, path);
    expect(await rosePinks(page), path).toEqual([]);
  }
});

test("a dark theme's bag and pages stay dark: no light mixed in from the rose design's whites", async ({ page }) => {
  test.setTimeout(240_000);
  await page.request.post(`${API}/__test/identity`, { data: { ...NOOR, theme: "shoes-sneakers" } });
  await settle(page);
  /** How light an element's own background is (0 black … 1 white). */
  const lightness = (selector: string) =>
    page.locator(selector).first().evaluate((el) => {
      const c = getComputedStyle(el).backgroundColor;
      const n = (c.match(/[\d.]+/g) || []).map(Number);
      const [r, g, b] = c.startsWith("color(") ? n.slice(0, 3) : n.slice(0, 3).map((v) => v / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    });
  await open(page, "/cart");
  await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }])));
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".rose-cart-form input").first()).toBeVisible();
  expect(await lightness(".rose-cart-form input")).toBeLessThan(0.2);
  await open(page, "/nothing-here");
  expect(await lightness(".rose-status-card")).toBeLessThan(0.2);
  await page.evaluate(() => localStorage.removeItem("estabrak_cart_v1"));
});

test("a theme's header and footer take the kinds its design gives them", async ({ page }) => {
  test.setTimeout(300_000);
  const kinds = [
    ["womens-fashion", "centered", "newsletter"],
    ["mens-fashion", "split", "block"],
    ["eyewear", "floating", "bigcta"],
  ] as const;
  for (const [theme, header, footer] of kinds) {
    await page.request.post(`${API}/__test/identity`, { data: { ...NOOR, theme } });
    await settle(page);
    await open(page, "/shop");
    await expect(page.locator(".atelier-header"), theme).toHaveAttribute("data-th-header", header);
    await expect(page.locator(".atelier-footer"), theme).toHaveAttribute("data-th-footer", footer);
    const brand = await page.locator(".atelier-header > .atelier-brand").boundingBox();
    const nav = await page.locator(".atelier-header > .atelier-desktop-nav").boundingBox();
    if (header === "centered") {
      // The name in the middle, the menu on a row under it.
      expect(nav!.y, theme).toBeGreaterThanOrEqual(brand!.y + brand!.height - 4);
      expect(Math.abs(brand!.x + brand!.width / 2 - 640), theme).toBeLessThan(60);
    }
    if (header === "split") expect(Math.abs(brand!.x + brand!.width / 2 - 640), theme).toBeLessThan(60);
    if (header === "floating") expect(await page.locator(".atelier-header").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), theme).not.toBe("0px");
    const band = page.locator(".th-footer-band");
    if (footer === "bigcta" || footer === "newsletter") {
      await expect(band, theme).toBeVisible();
      await expect(band.locator('a[href="/shop"]'), theme).toBeVisible();
    } else await expect(band, theme).toHaveCount(0);
  }
});

test("a store on a theme with no home of its own gets its theme's home, never the rose home", async ({ page }) => {
  test.setTimeout(180_000);
  await page.request.post(`${API}/__test/identity`, { data: { ...NOOR, cmsHome: false } });
  await settle(page);
  await open(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-store-theme", "circuit");
  await expect(page.locator(".th-home").first()).toBeVisible();
  await expect(page.locator(".rose-film, .hero-mascot, .rose-companion, .hero-campaign-image, .rose-seasons, .rose-cs")).toHaveCount(0);
  await expect(page.locator(ORNAMENTS)).toHaveCount(0);
  // Its newest products are on it, drawn by the theme.
  await expect(page.locator(".th-home").first()).toContainText("فستان الورد");
});

test("Estabrek keeps all of its design's ornaments", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.request.post(`${API}/__test/identity`, { data: {} });
  await settle(page);
  await open(page, "/shop");
  await expect(page.locator("html")).not.toHaveAttribute("data-store-theme", /.+/);
  await expect(page.locator(".rose-footer-wave")).toHaveCount(1);
  await expect(page.locator(".rose-product-tile .rose-card-arch").first()).toBeAttached();
  // Its own header and footer, as ever.
  await expect(page.locator(".atelier-header[data-th-header], .atelier-footer[data-th-footer], .th-footer-band")).toHaveCount(0);
  // Its own pinks, as ever (and the check above does see them).
  expect((await rosePinks(page)).length).toBeGreaterThan(5);
  await open(page, "/p/rose-dress");
  await expect(page.locator(".rose-pdp-backdrop")).toHaveCount(1);
  await expect(page.locator(".rose-pdp[data-th-card]")).toHaveCount(0);
  // With no home of its own published, its own rose home.
  await page.request.post(`${API}/__test/identity`, { data: { cmsHome: false } });
  await settle(page);
  await open(page, "/");
  await expect(page.locator(".th-home")).toHaveCount(0);
  await expect(page.locator(".hero-campaign-image, .rose-film").first()).toBeAttached();
});
