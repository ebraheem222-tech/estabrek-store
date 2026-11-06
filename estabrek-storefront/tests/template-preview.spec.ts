import { expect, test } from "@playwright/test";
import { templateThemeId } from "../src/storeThemes/kits";
import { TEMPLATE_THEMES } from "../src/storeThemes/kits/themes";
import { themePalette } from "../src/storeThemes/css";
import { CATALOG_EDITIONS } from "../src/storeThemes/kits/templates/catalogEditions";

test("ready template APIs provide editable pages and local artwork for every industry", async ({ request }) => {
  const response = await request.get("/api/templates");
  expect(response.ok()).toBe(true);
  const catalog = await response.json();
  expect(catalog.templates).toHaveLength(2000);
  expect(catalog.categories).toHaveLength(20);
  for (const category of catalog.categories) {
    const item = catalog.templates.find((t: { category: string; source?: unknown }) => !t.source && t.category === category.id);
    const page = await request.get(`/api/templates/${item.id}`);
    expect(page.ok(), item.id).toBe(true);
    const data = await page.json();
    expect(data.theme).toBe(item.theme);
    expect(data.sections.length).toBeGreaterThanOrEqual(6);
    if (category.id !== "shoes") expect((await request.get(`/templates/${category.id}/hero.svg`)).ok()).toBe(true);
  }
  expect((await request.get("/api/templates/does-not-exist")).status()).toBe(404);
  expect((await request.get("/api/templates/fashion-quiet?page=does-not-exist")).status()).toBe(404);
});

test("template previews render for RTL and mobile without broken local pictures", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const examples = [
    { id: "fashion-quiet", lang: "ar", width: 1280, mode: "light", title: "قطع بتشبهك" },
    { id: "electronics-lab", lang: "en", width: 390, mode: "dark", title: "Tech that fits your day" },
    { id: "kids-playground", lang: "he", width: 390, mode: "light", title: "דברים קטנים, דמיון גדול" },
    { id: "fashion-boutique", lang: "ar", width: 390, mode: "light", title: "قطع بتشبهك" },
    { id: "electronics-prism", lang: "en", width: 390, mode: "dark", title: "Tech that fits your day" },
    { id: "kids-mosaic", lang: "he", width: 390, mode: "light", title: "דברים קטנים, דמיון גדול" },
  ];
  for (const example of examples) {
    await page.setViewportSize({ width: example.width, height: 900 });
    const response = await page.goto(`/${example.lang}/design-frame?template=${example.id}&themeMode=${example.mode}`, { waitUntil: "networkidle" });
    expect(response?.ok(), example.id).toBe(true);
    await expect(page).toHaveURL(new RegExp(`/${example.lang}/design-frame`));
    await expect(page.locator("html")).toHaveAttribute("data-store-theme", `tpl-${example.id}`);
    await expect(page.locator("html")).toHaveAttribute("lang", example.lang);
    const theme = TEMPLATE_THEMES.find((t) => t.id === templateThemeId(example.id))!;
    const { palette } = themePalette(theme, example.mode as "light" | "dark");
    expect(await page.locator("[data-page-store-theme]").evaluate((el) => getComputedStyle(el).getPropertyValue("--bg").trim())).toBe(palette.bg);
    await expect(page.locator("h1").first()).toContainText(example.title);
    await expect(page.locator("h1").first()).toBeAttached();
    await expect(page.locator('img[src*="/templates/"]').first()).toBeVisible();
    expect(await page.locator('img[src*="/templates/"]').evaluateAll((images) => images.filter((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth === 0).length), example.id).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${example.id} horizontal overflow`).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `../.tmp/${example.id}-${example.lang}.png` });
  }
  expect(errors).toEqual([]);
});

test("customizer colours reach the actual template content", async ({ page }) => {
  const custom = encodeURIComponent(JSON.stringify({ palette: { light: { bg: "#e0f2f1", strong: "#004d40", ink: "#10201f" } } }));
  await page.goto(`/en/design-frame?template=fashion-quiet&storeTheme=tpl-fashion-quiet&themeMode=light&themeCustom=${custom}`);
  const content = page.locator('[data-page-store-theme="tpl-fashion-quiet"]');
  await expect(content).toHaveCSS("background-color", "rgb(224, 242, 241)");
  expect(await content.evaluate((el) => getComputedStyle(el).getPropertyValue("--accent").trim())).toBe("#004d40");
});

test("every added visual edition fits a phone and renders its own editable opening", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const edition of CATALOG_EDITIONS) {
    const id = `fashion-${edition.id}`;
    await page.goto(`/en/design-frame?template=${id}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first(), id).toContainText("Wear your own story");
    await expect(page.locator("[data-page-store-theme]"), id).toHaveAttribute("data-page-store-theme", `tpl-${id}`);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { message: `${id} horizontal overflow` }).toBeLessThanOrEqual(1);
    await expect(page.locator('img[src*="/templates/"]').first(), id).toBeVisible();
  }
  expect(errors).toEqual([]);
});
