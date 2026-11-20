import { test, expect, type Page } from "@playwright/test";
import { STORE_THEMES, themeById } from "../src/storeThemes/registry";
import { contrast } from "../src/storeThemes/colour";

// A store on a theme (its setup's template): the page's frame (the bar on top, the page behind it) wears the
// theme in its mode, not the old frame's dark default; and a box painted its own colour, its words left to the
// page's, gets the theme's colour that reads on it (a client's shop: a light theme, its template's dark hero
// with a navy heading on it, and a white bar with cream words on it).
const API = "http://127.0.0.1:4100";
test.describe.configure({ mode: "serial" });

const LIGHT = themeById("mega-market")!;
const DARK = STORE_THEMES.find((t) => t.mode === "dark" && t.palettes.dark)!;

const tree = (sections: unknown[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: sections } });
const section = (id: string, bg: string, words: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: "section",
  props: { contained: true },
  style: { base: { bg, minHeight: 240, ...extra } },
  children: [
    { id: `${id}-h`, type: "heading", props: { level: 2, text: { en: words, ar: words } } },
    { id: `${id}-t`, type: "text", props: { text: { en: `${words}: a line under it`, ar: `${words}: سطر` } } },
  ],
});
async function own(page: Page, theme: unknown, mode: "light" | "dark", sections: unknown[]) {
  await page.request.post(`${API}/__test/owned-design`, { data: { name: "Tone Shop", theme, mode, regions: {}, page: { id: "owned-home", name: "Home", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: tree(sections) } } });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/", "/en"] } });
}
/** A computed colour as hex and its alpha: rgb()/rgba(), or color(srgb …) (what a color-mix() computes to). */
const rgb = (css: string) => {
  const hex = (vals: number[]) => `#${vals.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
  const m = css.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
  if (m) return { hex: hex([m[1], m[2], m[3]].map(Number)), alpha: m[4] === undefined ? 1 : Number(m[4]) };
  const c = css.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
  if (c) return { hex: hex([c[1], c[2], c[3]].map((v) => Number(v) * 255)), alpha: c[4] === undefined ? 1 : Number(c[4]) };
  return null;
};
/** What a box shows behind its words: its own colour, else the nearest painted box behind it. */
const behind = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    let e: Element | null = el;
    while (e) {
      const c = getComputedStyle(e).backgroundColor;
      // Its alpha: rgba(…, a) or color(srgb … / a); see-through boxes show what is behind them.
      const a = c.match(/(?:rgba\([^)]*,\s*|\/\s*)([\d.]+)\)$/);
      if (c !== "rgba(0, 0, 0, 0)" && !(a && Number(a[1]) < 0.5)) return c;
      e = e.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  });
const words = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).color);
async function reads(page: Page, wordsAt: string, bgAt: string, at = 4.5) {
  const [w, b] = [rgb(await words(page, wordsAt)), rgb(await behind(page, bgAt))];
  expect(w && b, `${wordsAt} on ${bgAt}`).toBeTruthy();
  const ratio = contrast(w!.hex, b!.hex);
  expect(ratio, `${wordsAt} ${w!.hex} on ${b!.hex}`).toBeGreaterThanOrEqual(at);
  return ratio;
}

test.afterAll(async ({ request }) => {
  await request.post(`${API}/__test/owned-design`, { data: {} });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/", "/en"] } });
});

test("a light theme: the page in its light mode, the bar on top a real colour its words read on, and a dark hero's words light", async ({ page }) => {
  await own(page, LIGHT, "light", [section("hero", "#1e1e1e", "Dark hero"), section("plain", "#ffffff", "White band")]);
  await page.goto("/en");
  await expect(page.locator('[data-tree-node="hero-h"]')).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveClass(/\blight\b/);
  // The bar on top: painted (not see-through over the page) and its words read on it.
  const header = page.locator(".site-header header").first();
  await expect(header).toBeVisible();
  const barBg = rgb(await header.evaluate((el) => getComputedStyle(el).backgroundColor));
  expect(barBg && barBg.alpha).toBeGreaterThan(0.5);
  await reads(page, ".site-header header a", ".site-header header");
  // The hero painted dark, its words left to the page's: light now, as the template meant.
  await reads(page, '[data-tree-node="hero-h"]', '[data-tree-node="hero"]');
  await reads(page, '[data-tree-node="hero-t"]', '[data-tree-node="hero"]');
  // A white band in a light theme keeps the theme's own ink.
  expect(rgb(await words(page, '[data-tree-node="plain-h"]'))!.hex).toBe(LIGHT.palettes.light!.ink.toLowerCase());
  await page.screenshot({ path: "test-results/theme-frame-light.png", fullPage: false });
});

test("a dark theme: the page in its dark mode, and a white card's words dark", async ({ page }) => {
  await own(page, DARK, "dark", [section("night", "#101014", "Night band"), section("card", "#ffffff", "White card")]);
  await page.goto("/en");
  await expect(page.locator('[data-tree-node="card-h"]')).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await reads(page, ".site-header header a", ".site-header header");
  await reads(page, '[data-tree-node="card-h"]', '[data-tree-node="card"]');
  await reads(page, '[data-tree-node="night-h"]', '[data-tree-node="night"]');
  // The footer wears the dark theme too: its words read on the theme's surface.
  const surface = DARK.palettes.dark!.surface;
  for (const at of ["footer .text-base.font-semibold, footer .text-sm.font-semibold", "footer a"]) {
    const w = rgb(await words(page, at))!;
    expect(contrast(w.hex, surface), `${at} ${w.hex} on ${surface}`).toBeGreaterThanOrEqual(3);
  }
  await page.screenshot({ path: "test-results/theme-frame-dark.png", fullPage: false });
});

test("words given their own colour keep it, on any box", async ({ page }) => {
  await own(page, LIGHT, "light", [{ ...section("mine", "#1e1e1e", "My colour"), children: [{ id: "mine-h", type: "heading", props: { level: 2, text: { en: "My colour" } }, style: { base: { color: "#ff0000" } } }] }]);
  await page.goto("/en");
  await expect(page.locator('[data-tree-node="mine-h"]')).toBeVisible();
  expect(rgb(await words(page, '[data-tree-node="mine-h"]'))!.hex).toBe("#ff0000");
});
