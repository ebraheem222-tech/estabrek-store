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
      // and about pages also carry the first store's fashion copy (industry packs replace it).
      if (lang === "ar" && !["/", "/about"].includes(path)) expect(all, `${path}: to everyone`).not.toMatch(/تسوّقي|اختاري|أضيفي|ابحثي|حقيبتكِ|اكتبي|جرّبي|عندكِ|تواصلي|لأجلكِ/);
    }
  }
  await open(page, "/cart", "ar");
  await expect(page.locator("main")).toContainText("الحقيبة فارغة حالياً.");
  await open(page, "/", "ar");
  await expect(page.locator(".atelier-brand .brand-arabic").first()).toHaveText("نور");
  await expect(page.locator(".atelier-brand .brand-english").first()).toHaveText("ALL TECH IN ONE PLACE");
  await expect(page.locator(".footer-wordmark")).toHaveText("نور");
  expect(await page.title()).toBe("متجر نور");
  await expect(page.locator(".hero-mascot [aria-label*='سما'], [aria-label*='سما']").first()).toBeAttached();
  await open(page, "/", "en");
  await expect(page.locator(".atelier-brand .brand-arabic").first()).toHaveText("Noor");
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
