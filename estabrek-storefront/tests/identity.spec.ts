import { test, expect, type Page } from "@playwright/test";

// Every shop on the platform shows its own name (admin → هوية المتجر), never Estabrek's,
// and its guide can carry another name (admin → رزان). Against the mock API.
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

async function settle(page: Page) {
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
}

/** All a shopper can see or hear on the page: text, labels, alt text, the title and sharing tags. */
async function everything(page: Page) {
  return page.evaluate(() => {
    const seen: string[] = [document.title, document.body.innerText];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      for (const a of ["alt", "title", "aria-label", "placeholder"]) { const v = el.getAttribute(a); if (v) seen.push(v); }
    }
    for (const m of Array.from(document.querySelectorAll("meta[name=description],meta[property^='og:']"))) seen.push(m.getAttribute("content") || "");
    return seen.join("\n");
  });
}

/** The shopper's language is a cookie (src/middleware.ts): a plain address shows the page in it. */
async function open(page: Page, path: string, lang: "ar" | "en") {
  await page.context().addCookies([{ name: "shop-lang", value: lang, url: SITE }]);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/identity`, { data: {} });
  await request.post(`${API}/__test/razan`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
});

test("another store: its own name everywhere, nothing of Estabrek", async ({ page }) => {
  test.setTimeout(300_000);
  await page.request.post(`${API}/__test/identity`, { data: NOOR });
  await page.request.post(`${API}/__test/razan`, { data: { name: { ar: "سما", en: "Sama" } } });
  await settle(page);
  for (const lang of ["ar", "en"] as const) {
    for (const path of ["/", "/shop", "/p/rose-dress", "/about", "/contact", "/cart"]) {
      await open(page, path, lang);
      // The mock's own content and contact email are the owner's words, not the shop's code.
      const all = (await everything(page))
        .replaceAll("hello@estabrek.test", "")
        .replaceAll("حملة استبرق", "")
        // The mock's contact form is written by its owner too.
        .replaceAll("نساعدكِ باختيار تفاصيلكِ", "")
        .replaceAll("اكتبي لنا", "")
        .replaceAll("أرسلي الرسالة", "");
      expect(all, `${lang} ${path}`).not.toMatch(/استبرق|estabrek/i);
      expect(all, `${lang} ${path}: the guide`).not.toMatch(/رزان|رَزان|\bRose (is|understood|presents|through|,)/);
      // A shop for everyone doesn't speak Arabic to women only (src/lib/words.tone.ts). The home
      // carries the mock's own words (the owner's), so it is left out.
      if (lang === "ar" && path !== "/") expect(all, `${path}: to everyone`).not.toMatch(/تسوّقي|اختاري|أضيفي|ابحثي|حقيبتكِ|اكتبي|جرّبي|عندكِ|تواصلي|لأجلكِ/);
      // Hijabs and fabrics are the modest fashion store's (the shop's own pages, not the mock's products).
      if (["/about", "/contact", "/cart"].includes(path)) expect(all, `${lang} ${path}: nothing of a hijab shop`).not.toMatch(/حجاب|محتشم|أقمشة|قماش|hijab|modest|fabric/i);
    }
  }
  await open(page, "/cart", "ar");
  // A store on any theme but the rose design has a cart, not a bag (lib/words.plain.ts).
  await expect(page.locator("main")).toContainText("السلة فارغة حالياً.");
  await open(page, "/", "ar");
  await expect(page.locator(".atelier-brand .brand-arabic").first()).toHaveText("نور");
  await expect(page.locator(".atelier-brand .brand-english").first()).toHaveText("ALL TECH IN ONE PLACE");
  await expect(page.locator(".footer-wordmark")).toHaveText("نور");
  expect(await page.title()).toBe("متجر نور");
  // Not a modest fashion store: its kind's theme (electronics), never the rose design's hijab film or guide.
  await expect(page.locator("html")).toHaveAttribute("data-store-theme", "circuit");
  await expect(page.locator(".th-home").first()).toBeVisible();
  await expect(page.locator(".hero-mascot, .rose-companion")).toHaveCount(0);
  await open(page, "/", "en");
  await expect(page.locator(".atelier-brand .brand-arabic").first()).toHaveText("Noor");
});

// Another hijab shop on the platform: it sells what Estabrek sells, but Estabrek's design (its film, its
// guide, its words) is Estabrek's own theme. With no theme picked it wears its kind's library theme.
const LAMA = {
  name: { ar: "متجر لمى", en: "Lama Store", he: "" },
  shortName: { ar: "لمى", en: "Lama", he: "" },
  tagline: { ar: "", en: "", he: "" },
  about: { ar: "", en: "", he: "" },
  industry: "fashion",
  audience: "women",
  legalName: "",
};

test("another hijab shop: its kind's theme, nothing of Estabrek's design or guide", async ({ page }) => {
  test.setTimeout(240_000);
  await page.request.post(`${API}/__test/identity`, { data: LAMA });
  await settle(page);
  for (const path of ["/", "/shop", "/search?q=x", "/about", "/contact", "/cart", "/request"]) {
    await open(page, path, "ar");
    await expect(page.locator("html"), path).toHaveAttribute("data-store-theme", "runway-3d");
    await expect(page.locator(".hero-mascot, .rose-companion, .rose-film"), path).toHaveCount(0);
    const all = (await everything(page))
      .replaceAll("hello@estabrek.test", "")
      .replaceAll("حملة استبرق", "")
      // The mock's home has its owner's own hero title (a line of its own); the rose design's lines end otherwise.
      .replace(/^أناقة تليق بكِ$/gm, "");
    expect(all, path).not.toMatch(/استبرق|estabrek|رزان|أناقة تليق بكِ|عالم الأقمشة|متجر للحجاب والملابس المحتشمة/i);
    // The clothes shop's words in the shop's own lines: a cart, not a bag; no looks or fabrics. (The mock's
    // products and their fabric filter are its owner's words, so the pages listing them are checked line by line.)
    // (A fashion theme from the library speaks of looks in its own copy: that's the picked theme's voice.)
    if (["/about", "/contact", "/cart", "/request"].includes(path)) expect(all, path).not.toMatch(/حقيب|القماش|عباية|حجاب/);
    else expect(all, path).not.toMatch(/طرق أخرى لاكتشاف|اكتبي اسم القطعة، اللون أو القماش|للحقيبة|الحقيبة/);
  }
  // Its home's title is its own name, without Estabrek's line.
  await open(page, "/", "ar");
  expect(await page.title()).toBe("متجر لمى");
  // The sharing picture isn't Estabrek's hijab campaign.
  await expect(page.locator('meta[property="og:image"][content*="hijab-campaign"]')).toHaveCount(0);
  // Nor can an address show it: a preview of the rose design (or of no theme at all) is its owner's alone.
  for (const query of ["?storeTheme=rose", "?storeTheme=no-such-theme"]) {
    await open(page, `/${query}`, "ar");
    await page.waitForTimeout(1500);
    await expect(page.locator("html"), query).toHaveAttribute("data-store-theme", "runway-3d");
    await expect(page.locator(".rose-film, .hero-mascot"), query).toHaveCount(0);
    await expect(page.locator(".th-home").first(), query).toBeVisible();
  }
});

test("Estabrek itself is unchanged", async ({ page }) => {
  await page.request.post(`${API}/__test/identity`, { data: {} });
  await page.request.post(`${API}/__test/razan`, { data: {} });
  await settle(page);
  await open(page, "/", "ar");
  await expect(page.locator(".atelier-brand .brand-arabic").first()).toHaveText("استبرق");
  await expect(page.locator(".atelier-brand .brand-english").first()).toHaveText("MODESTLY, BEAUTIFULLY YOU");
  expect(await page.title()).toBe("متجر استبرق — أناقة تليق بكِ");
  await open(page, "/", "en");
  await expect(page.locator(".footer-wordmark")).toHaveText("Estabrek");
});
