import { test, expect, type Page } from "@playwright/test";

// Phase 5 of the clean platform plan (docs/clean-platform-plan.ar.md): nothing of Estabrek reaches another store.
// A phone shop on two themes (its kind's classic one, and a design theme) walks every page a shopper can open:
// no piece of the rose design, none of its words, its films or its pinks. Estabrek's own catalog in the mock (its
// hijab pieces and categories) is the owner's data, so "حجاب" and its kin are looked for on the pages that show none
// of it; the rose design's own words are looked for everywhere.
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

/** Every page a shopper can open (with the mock's own category and piece). */
const CATALOG_PAGES = ["/", "/shop", "/c/dresses", "/p/rose-dress", "/search", "/search?q=x"];
const OTHER_PAGES = ["/cart", "/about", "/contact", "/request", "/wishlist", "/track", "/account", "/policies", "/stock-alert", "/order/no-such-order", "/pay/no-such-payment", "/nothing-here"];

/** The rose design's pieces, as the page has them. */
const ROSE_PIECES = [
  ".rose-film", ".hero-mascot", ".rose-companion", ".rose-chat-face", ".rose-wave", ".rose-pdp-backdrop", ".rose-motif",
  ".rose-card-arch", ".rose-card-spark", ".rose-product-tile", ".rose-stage-film", "[data-rose-block]", ".rose-particles",
  ".rose-rooms", ".rose-world", ".rose-story-rail", ".rose-page-hero", ".season-rack", ".rose-collections-scroll",
  ".rose-secret", ".hero-campaign-image", ".rose-about-fabric", ".rose-about-portrait",
].join(", ");
/** The rose design's own words: never on another store's pages. */
const ROSE_WORDS = /رزان|Razan|استبرق|Estabrek|MODESTLY|أناقة تليق بكِ|عالم الأقمشة|إطلالتكِ|حقيبتكِ|حقيبة التسوق|🌸/;
/** A clothes shop's words: never on the pages that show no products. */
const SHOP_WORDS = /حجاب|عباي|إطلال|قماش|أقمشة|محتشم|حقيب|الشال/;
/** The rose design's films: never asked for. */
const ROSE_FILMS = /hero-film|rose-campaign/;

async function settle(page: Page) {
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
}

/** All a shopper can see or hear on the page, without the mock owner's own words (its email, its CMS page's line). */
async function everything(page: Page) {
  const text = await page.evaluate(() => {
    const seen: string[] = [document.title, document.body.innerText];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      for (const a of ["alt", "title", "aria-label", "placeholder"]) {
        const v = el.getAttribute(a);
        if (v) seen.push(v);
      }
    }
    for (const m of Array.from(document.querySelectorAll("meta[name=description],meta[property^='og:']"))) seen.push(m.getAttribute("content") || "");
    return seen.join("\n");
  });
  return text.replaceAll("hello@estabrek.test", "").replaceAll("حملة استبرق", "").replace(/^أناقة تليق بكِ$/gm, "");
}

/** What on the page is painted in the rose design's pinks, apart from the products' own colours (theme-shell.spec). */
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
      if (el.closest('.color-chip-swatch, .rose-pdp-swatches, .th-card-swatches, .th-card-colours, [style*="--swatch-color"], img, video, picture, canvas') || /background|--swatch/.test(el.getAttribute("style") || "")) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
      for (const p of [own ? cs.color : "", cs.backgroundColor, cs.borderTopWidth !== "0px" ? cs.borderTopColor : "", /^(svg|path|circle)$/i.test(el.tagName) ? `${cs.fill} ${cs.stroke}` : ""]) {
        const hit = (p.match(/rgba?\([^)]*\)/g) || []).find(pink);
        if (hit) { found.push(`${el.tagName.toLowerCase()}.${String(el.getAttribute("class") || "").split(/\s+/).slice(0, 2).join(".")} ${hit}`); break; }
      }
    }
    return [...new Set(found)];
  });
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/identity`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
});

test("the check sees the rose design where it belongs: Estabrek's own store", async ({ page }) => {
  test.setTimeout(240_000);
  await page.request.post(`${API}/__test/identity`, { data: {} });
  await settle(page);
  await page.context().addCookies([{ name: "shop-lang", value: "ar", url: SITE }]);
  await page.goto("/shop");
  await page.waitForLoadState("networkidle");
  expect(await page.locator(ROSE_PIECES).count()).toBeGreaterThan(0);
  expect(await everything(page)).toMatch(ROSE_WORDS);
  expect((await rosePinks(page)).length).toBeGreaterThan(0);
});

for (const theme of [undefined, "eyewear"] as const) {
  test(`another store (${theme ?? "its kind's theme"}): nothing of Estabrek on any page`, async ({ page }) => {
    test.setTimeout(600_000);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.request.post(`${API}/__test/identity`, { data: theme ? { ...NOOR, theme } : NOOR });
    await settle(page);
    const films: string[] = [];
    page.on("request", (r) => { if (ROSE_FILMS.test(r.url())) films.push(r.url()); });
    await page.context().addCookies([{ name: "shop-lang", value: "ar", url: SITE }]);
    const walk = async (path: string, strict: boolean) => {
      // A page the local dev server was still building can come out as its error page: opened once more then.
      // Some pages never go quiet on the network (a live list, a poll): the wait for it is bounded.
      for (let tries = 0; tries < 3; tries++) {
        await page.goto(path, { waitUntil: "load", timeout: 120_000 });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(600);
        if (await page.locator("html").getAttribute("data-store-theme")) break;
        await page.waitForTimeout(2000);
      }
      await expect(page.locator("html"), path).toHaveAttribute("data-store-theme", /.+/);
      expect.soft(await page.locator(ROSE_PIECES).count(), `${path}: a piece of the rose design`).toBe(0);
      const all = await everything(page);
      expect.soft(all.match(ROSE_WORDS)?.[0] ?? null, `${path}: the rose design's words`).toBeNull();
      if (strict) expect.soft(all.match(SHOP_WORDS)?.[0] ?? null, `${path}: a clothes shop's words`).toBeNull();
      expect.soft(await rosePinks(page), `${path}: the rose design's pinks`).toEqual([]);
    };
    for (const path of CATALOG_PAGES) await walk(path, false);
    for (const path of OTHER_PAGES) await walk(path, true);
    // And the bag with pieces in it.
    await page.evaluate(() => localStorage.setItem("estabrak_cart_v1", JSON.stringify([{ variantId: "m", quantity: 1 }, { variantId: "one", quantity: 2 }])));
    await walk("/cart", false);
    await page.evaluate(() => localStorage.removeItem("estabrak_cart_v1"));
    expect(films, "the rose design's films").toEqual([]);
  });
}
