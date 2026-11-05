import { expect, test } from "@playwright/test";

const designs = [
  { id: "electronics-foundry", mode: "dark", title: /مساحة عمل|A workspace|סביבת עבודה/ },
  { id: "art-kinetic", mode: "light", title: /خارج|BEYOND|מחוץ/ },
  { id: "home-lantern", mode: "dark", title: /ضوء صغير|A little light|אור קטן/ },
];

for (const design of designs) test(`${design.id} is an editable, responsive multilingual template`, async ({ page, request }) => {
  test.setTimeout(120_000);
  const imported = await request.get(`/api/templates/${design.id}?motionEngine=anime&motionPreset=rich`);
  expect(imported.ok()).toBe(true);
  const body = await imported.json();
  expect(body.design.templateId).toBe(design.id);
  expect(body.design.header.root.children.length).toBeGreaterThan(0);
  expect(body.sections.length).toBeGreaterThanOrEqual(6);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [lang, width] of [["ar", 1440], ["en", 390], ["he", 390]] as const) {
    await page.setViewportSize({ width, height: 960 });
    const response = await page.goto(`/${lang}/design-frame?template=${design.id}&themeMode=${design.mode}&motionPreset=none`, { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator("h1").first()).toContainText(design.title);
    await expect(page.locator(".pt-showcase-toggle")).toHaveCount(3);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { message: `${design.id}/${lang} overflow` }).toBeLessThanOrEqual(1);
    await page.locator(".pt-showcase-toggle").last().click();
    await expect(page.locator(".pt-showcase-toggle").last()).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".pt-showcase-link:visible")).toHaveAttribute("href", lang === "ar" ? "/shop" : `/${lang}/shop`);
    const images = page.locator('img[src*="/templates/experimental/"]');
    await expect(images.first()).toBeAttached();
    expect(await images.evaluateAll((all) => all.filter((image) => (image as HTMLImageElement).complete && !(image as HTMLImageElement).naturalWidth).length)).toBe(0);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `../.tmp/template-gallery/${design.id}-${lang}.png` });
  }
  expect(errors).toEqual([]);
});
