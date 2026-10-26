import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Arabic, English and Hebrew (src/lib/i18n.ts, src/middleware.ts, src/lib/words.ts) against the mock API.
const API = "http://127.0.0.1:4100";
const SITE = "http://127.0.0.1:3000";
test.describe.configure({ mode: "serial" });

async function setLanguages(page: Page, languages: Record<string, unknown>) {
  await page.request.post(`${API}/__test/languages`, { data: languages });
  await page.request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
  await page.waitForTimeout(1200); // the middleware re-reads the store's languages
}
const html = (page: Page) => page.locator("html");

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/languages`, { data: {} });
  await request.post(SITE + "/api/revalidate", { data: { tags: ["settings", "cms", "catalog"] } });
});

test("Arabic first; the button switches to English and the choice stays", async ({ page, context }) => {
  await setLanguages(page, {});
  await context.clearCookies();
  await page.goto("/shop");
  await expect(html(page)).toHaveAttribute("lang", "ar");
  await expect(html(page)).toHaveAttribute("dir", "rtl");
  await page.locator(".language-button").first().click();
  await expect(html(page)).toHaveAttribute("lang", "en");
  await expect(html(page)).toHaveAttribute("dir", "ltr");
  expect((await context.cookies()).find((c) => c.name === "shop-lang")?.value).toBe("en");
  await page.reload();
  await expect(html(page)).toHaveAttribute("lang", "en");
  await expect(page.locator(".atelier-header")).toHaveAttribute("dir", "ltr");
});

test("/en/… is its own English page with its other languages for search engines", async ({ page, context }) => {
  await context.clearCookies();
  const res = await page.goto("/en/p/rose-dress");
  expect(res?.status()).toBe(200);
  await expect(html(page)).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: /Add to bag/ }).first()).toBeVisible();
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toMatch(/\/en\/p\/rose-dress$/);
  const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => [e.getAttribute("hreflang"), e.getAttribute("href")]));
  expect(alternates).toEqual(expect.arrayContaining([["ar", expect.stringMatching(/\/p\/rose-dress$/)], ["en", expect.stringMatching(/\/en\/p\/rose-dress$/)]]));
  expect(alternates.find(([l]) => l === "he")).toBeUndefined();
  // A plain address now opens in English too (the cookie).
  await page.goto("/cart");
  await expect(html(page)).toHaveAttribute("lang", "en");
});

test("Hebrew only when the store offers it", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/he/shop");
  expect(new URL(page.url()).pathname).toBe("/shop");
  await expect(html(page)).toHaveAttribute("lang", "ar");
});

test("a store with Hebrew: right to left, Hebrew words, and a short list to pick from", async ({ page, context }) => {
  await setLanguages(page, { enabled: ["ar", "en", "he"], default: "ar" });
  await context.clearCookies();
  await page.goto("/he/p/rose-dress");
  await expect(html(page)).toHaveAttribute("lang", "he");
  await expect(html(page)).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("button", { name: /הוספה לתיק/ }).first()).toBeVisible();
  await expect(page.locator(".atelier-header")).toHaveAttribute("dir", "rtl");
  expect(await page.title()).toContain("فستان الورد"); // the product's own name (its translation comes from the admin)
  const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute("hreflang")));
  expect(alternates).toEqual(expect.arrayContaining(["ar", "en", "he", "x-default"]));
  // The header's button opens the three languages.
  await page.locator(".language-button").first().click();
  const menu = page.getByTestId("language-menu");
  await expect(menu.getByRole("menuitemradio")).toHaveText(["العربية", "English", "עברית"]);
  await menu.getByRole("menuitemradio", { name: "English" }).click();
  await expect(html(page)).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL(/\/en\/p\/rose-dress$/);
  await expect(page.getByRole("button", { name: /Add to bag/ }).first()).toBeVisible();
});

test("a Hebrew bag and shop read in Hebrew", async ({ page, context }) => {
  await context.addCookies([{ name: "shop-lang", value: "he", url: SITE }]);
  await page.goto("/cart");
  await expect(html(page)).toHaveAttribute("lang", "he");
  await expect(page.getByRole("heading", { name: "התיק ריק." })).toBeVisible();
  // The store's name: its Hebrew one, else the English (not Arabic letters).
  await expect(page.locator(".footer-wordmark")).toHaveText("Estabrek");
  await expect(page.locator(".atelier-announcement")).toContainText("ברוכים הבאים ל־Estabrek");
  await page.goto("/shop");
  await expect(page.locator("main")).not.toContainText("تسوّقي");
});

// The store's own content (admin → each product, category, type), src/lib/localize.ts.
test("the store's content in Hebrew and English: names, details, colours, filters and the bag", async ({ page, context }) => {
  await page.request.post(`${API}/__test/content-translations`, { data: { on: true } });
  try {
    await setLanguages(page, { enabled: ["ar", "en", "he"], default: "ar" });
    await context.clearCookies();
    await page.goto("/he/p/rose-dress");
    await expect(page.locator("#pdp-title")).toHaveText("שמלת ורד");
    expect(await page.title()).toContain("שמלת ורד");
    const specs = page.getByTestId("product-specs");
    await expect(specs).toContainText("בד");
    await expect(specs).toContainText("שיפון");
    await expect(specs).toContainText("140 ס״מ");
    await expect(specs).toContainText("ערב, חתונה");
    // The type's labels and the colour's name, as the owner wrote them.
    await expect(page.locator(".rose-pdp-sizes")).toHaveAttribute("aria-label", "מידה");
    await expect(page.getByRole("radiogroup", { name: "צבע" }).getByRole("radio", { name: /ורוד/ })).toBeVisible();
    await page.locator(".rose-pdp-sizes").getByRole("radio", { name: /^M/ }).first().click();
    await page.getByRole("button", { name: /הוספה לתיק/ }).first().click();
    await page.goto("/he/cart");
    await expect(page.locator(".rose-cart-line").first()).toContainText("שמלת ורד");
    await expect(page.locator(".rose-cart-line").first()).toContainText("ורוד");

    // English: its own words where it has them, the store's own where it doesn't.
    await page.goto("/en/p/rose-dress");
    await expect(page.locator("#pdp-title")).toHaveText("Rose dress");
    expect(await page.title()).toBe("The rose dress");
    await expect(page.locator(".rose-pdp-sizes")).toHaveAttribute("aria-label", "Size");
    await expect(page.getByTestId("product-specs")).toContainText("القماش");

    // The category and its filters.
    await page.goto("/he/c/dresses");
    await expect(page.locator("h1").first()).toContainText("שמלות");
    const filters = page.getByTestId("attribute-filters").first();
    await expect(filters).toContainText("בד");
    await expect(filters.getByRole("button", { name: /שיפון/ })).toBeVisible();
  } finally {
    await page.request.post(`${API}/__test/content-translations`, { data: { on: false } });
  }
});

// Every English line the shop shows has its Hebrew (src/lib/words.he.ts).
test("no English line is missing its Hebrew", async () => {
  const src = path.resolve(process.cwd(), "src");
  const he = fs.readFileSync(path.join(src, "lib", "words.he.ts"), "utf8");
  const known = new Set(Array.from(he.matchAll(/^\s*("(?:[^"\\]|\\.)*"):/gm), (m) => JSON.parse(m[1])));
  const call = /\btr\(\s*(?:lang|routeLang\(params\))\s*,\s*(?:"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)\s*,\s*("(?:[^"\\\n]|\\.)*")/g;
  const missing: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && !p.endsWith(path.join("lib", "words.ts"))) {
        const text = fs.readFileSync(p, "utf8");
        // tr(lang, "…", "English"), and the loading screens' <LoadingText ar="…" en="English" />.
        for (const m of [...text.matchAll(call), ...text.matchAll(/<LoadingText\s+ar="[^"]*"\s+en=("(?:[^"\\]|\\.)*")/g)]) {
          const key = JSON.parse(m[1]);
          if (key && !known.has(key)) missing.push(`${path.relative(src, p)}: ${key}`);
        }
      }
    }
  };
  walk(src);
  expect(missing).toEqual([]);
});

// The store's way of speaking Arabic (admin → هوية المتجر → who it speaks to).
test("Arabic to her, to him, or to everyone", async () => {
  const { toneAr } = await import("../src/lib/words");
  expect(toneAr("أضيفي للحقيبة", "women")).toBe("أضيفي للحقيبة");
  expect(toneAr("أضيفي للحقيبة", "men")).toBe("أضف للحقيبة");
  expect(toneAr("أضيفي للحقيبة", "everyone")).toBe("إضافة للحقيبة");
  // A line with values in it keeps them.
  expect(toneAr("أضيفي فستان الورد للحقيبة", "men")).toBe("أضف فستان الورد للحقيبة");
  expect(toneAr("وصلتِ للحد (3 تنزيلات). تواصلي معنا إذا بدكِ كمان.", "everyone")).toBe("وصلتوا للحد (3 تنزيلات). تواصلوا معنا إذا بدكم كمان.");
  // Words it doesn't know stay as they are.
  expect(toneAr("قيد التجهيز", "men")).toBe("قيد التجهيز");
});
