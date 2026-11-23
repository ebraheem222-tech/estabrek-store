import { expect, test, type Page } from "@playwright/test";
import { SERVER_THEMES } from "../src/storeThemes/themes/servers";
import { themeById } from "../src/storeThemes/registry";
import { contrast } from "../src/storeThemes/colour";
import { deepOf } from "../src/storeThemes/css";

// The game servers' family of themes (sites wave G6c; storeThemes/themes/servers.ts, app/server-themes.css). Each
// paints a game site in its colours and gives the server's own parts and the page's buttons a shape of its own; a game
// site's opening («night», the theme's deepest band) stays dark in a dark theme, and what stands out in it reads there.
// The fixture backend (tests/catalog-server.mjs) serves the page as the backend would, its parts already filled.

const MOCK = "http://127.0.0.1:4100";
const DAY = 86_400_000;
const hourAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const live = { featureId: "f-server", game: "fivem", online: true, players: 42, max: 64, name: "City Nights", map: null, at: hourAgo(0), join: { href: "fivem://connect/play.example:30120", address: "play.example:30120" }, history: [3, 2, 1].map((h) => ({ hour: hourAgo(h), players: 20 + h, online: true })), discord: null };
const ranks = { key: "playtime", unit: "minutes", best: "high", windows: { week: [{ n: 1, name: "Layla", value: 900 }, { n: 2, name: "Abu", value: 600 }] } };
const pageWith = (slug: string) => ({
  id: `${slug}-fixture`,
  slug,
  name: "Server",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {},
      children: [
        { id: "night", type: "section", props: { contained: true }, style: { base: { bg: "deep", color: "on-deep", pad: [80, 24, 80, 24], gap: 24 } }, children: [
          { id: "status", type: "gameStatus", props: { size: "big", chart: true, live } },
          { id: "wipe", type: "wipeCountdown", props: { size: "big", wipe: { every: "weekly", day: "thu", time: "19:00", zone: "UTC", note: null, next: new Date(Date.now() + 2 * DAY).toISOString(), last: null } } },
          { id: "go", type: "button", props: { label: { en: "Join", ar: "فوت" }, href: "/join", variant: "solid" } },
        ] },
        { id: "plain", type: "section", props: { contained: true }, style: { base: { pad: [80, 24, 80, 24], gap: 24 } }, children: [
          { id: "board", type: "leaderboard", props: { ranks } },
          { id: "more", type: "button", props: { label: { en: "Rules", ar: "القوانين" }, href: "/rules", variant: "solid" } },
        ] },
      ],
    },
  },
});
/** The store's theme (the shop's settings are kept: they are told to read them again, as store-themes.spec.ts does). */
const setTheme = async (page: Page, id: string | null, mode?: "light" | "dark") => {
  const res = await page.request.post(`${MOCK}/__test/store-theme`, { data: id ? { id, mode: mode ?? null } : {} });
  await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
  return res;
};
const publish = (page: Page, slug: string) => page.request.post(`${MOCK}/__test/published-page`, { data: { slug, page: pageWith(slug) } });
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
/** A colour as the browser says it, as #rrggbb (it must be opaque). */
const hexOf = (rgb: string) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgb);
  if (!m) throw new Error(`not a colour: ${rgb}`);
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
};
const styleOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { radius: s.borderTopLeftRadius, shadow: s.boxShadow, clip: s.clipPath, borderStyle: s.borderTopStyle, start: s.borderLeftWidth, color: s.color, bg: s.backgroundColor, font: s.fontFamily, fontStyle: s.fontStyle };
  });

test.describe("the game servers' themes", () => {
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/store-theme`, { data: {} });
    await request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
    for (const slug of ["/publication-fixture-en", "/publication-fixture-ar"]) await request.post(`${MOCK}/__test/published-page`, { data: { slug, page: null } });
  });

  test("six of their own, one family, in the theme list; each one's night band reads, whatever its mode", () => {
    expect(SERVER_THEMES.map((t) => t.id)).toEqual(["night-neon", "square-pixel", "rough-survival", "race-stripes", "clean-esports", "fantasy-guild"]);
    for (const t of SERVER_THEMES) {
      expect(themeById(t.id), t.id).toBe(t);
      expect(t.family).toBe("servers");
      for (const mode of ["light", "dark"] as const) {
        const p = t.palettes[mode]!;
        const d = deepOf(p, mode);
        expect(contrast(d.on, d.deep), `${t.id} ${mode}: words on the night band`).toBeGreaterThanOrEqual(7);
        expect(contrast(d.pop, d.deep), `${t.id} ${mode}: what stands out on it`).toBeGreaterThanOrEqual(4.5);
        // In a dark mode the band is a night under the page, not its light text colour.
        if (mode === "dark") expect(contrast(d.deep, "#000000"), `${t.id}: the night is dark`).toBeLessThan(contrast(p.bg, "#000000") + 0.01);
      }
    }
  });

  test("each gives the server's parts and the page's buttons its own shape, and its night band stays dark", async ({ page }) => {
    test.setTimeout(120_000);
    expect((await publish(page, "/publication-fixture-en")).ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 1000 });
    const seen: Record<string, Awaited<ReturnType<typeof styleOf>>> = {};
    for (const t of SERVER_THEMES) {
      expect((await setTheme(page, t.id)).ok()).toBeTruthy();
      await page.goto("/en/publication-fixture-en");
      await expect(page.locator("html")).toHaveAttribute("data-store-theme", t.id);
      const panel = await styleOf(page, '[data-tree-node="status"] [data-gp="panel"]');
      const btn = await styleOf(page, '.pt-btn[data-tree-node="more"]');
      const band = await styleOf(page, '[data-tree-node="night"]');
      const num = await styleOf(page, '[data-tree-node="wipe"] [data-gp="num"]');
      const go = await styleOf(page, '.pt-btn[data-tree-node="go"]');
      seen[t.id] = panel;
      // The night band: a dark theme keeps it dark; its numbers and its button read on it.
      const bandHex = hexOf(band.bg);
      if (t.mode === "dark") expect(contrast(bandHex, "#000000"), `${t.id}: a dark opening`).toBeLessThan(2);
      expect(contrast(hexOf(band.color), bandHex), `${t.id}: words on the band`).toBeGreaterThanOrEqual(7);
      expect(contrast(hexOf(num.color), bandHex), `${t.id}: the countdown's numbers`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hexOf(go.bg), bandHex), `${t.id}: the band's button stands out`).toBeGreaterThanOrEqual(3);
      expect(contrast(hexOf(go.color), hexOf(go.bg)), `${t.id}: its words`).toBeGreaterThanOrEqual(4.5);
      // Its numbers in its display letters.
      expect(num.font.split(",")[0].replace(/"/g, ""), t.id).toBe(t.fonts.display[0]);
      // Each its own shape.
      if (t.id === "night-neon") {
        expect(panel.shadow).toMatch(/30px -12px/);
        expect(btn.shadow).toMatch(/22px -6px/);
      }
      if (t.id === "square-pixel") {
        expect(panel.radius).toBe("0px");
        expect(panel.shadow).toMatch(/ 6px 6px 0px/);
        expect(btn.radius).toBe("0px");
        expect(btn.shadow).toMatch(/ 4px 4px 0px/);
      }
      if (t.id === "rough-survival") {
        expect(panel.clip).toMatch(/^polygon/);
        expect(btn.clip).toMatch(/^polygon\(10px 0px/);
      }
      if (t.id === "race-stripes") {
        expect(panel.start).toBe("6px");
        expect(num.fontStyle).toBe("italic");
        expect(btn.clip).toMatch(/^polygon\(12px 0px/);
      }
      if (t.id === "clean-esports") {
        expect(panel.shadow).toMatch(/inset/);
        expect(btn.radius).toBe("6px");
      }
      if (t.id === "fantasy-guild") {
        expect(panel.borderStyle).toBe("double");
        expect(btn.shadow).toMatch(/inset/);
      }
    }
    // Six looks, none the same.
    expect(new Set(Object.values(seen).map((s) => JSON.stringify([s.radius, s.shadow, s.clip, s.borderStyle, s.start]))).size).toBe(6);
  });

  test("another theme leaves the parts and buttons as they are; a button's own corners win", async ({ page }) => {
    expect((await publish(page, "/publication-fixture-en")).ok()).toBeTruthy();
    await setTheme(page, "pc-builder");
    await page.goto("/en/publication-fixture-en");
    const panel = await styleOf(page, '[data-tree-node="status"] [data-gp="panel"]');
    expect(panel.radius).toBe("20px");
    expect(panel.clip).toBe("none");
    const btn = await styleOf(page, '.pt-btn[data-tree-node="more"]');
    expect(btn.radius).toBe("999px");
    expect(btn.shadow).toBe("none");
  });

  test("in Arabic, on a phone: the pixel shadow falls the reading way, and nothing is wider than the screen", async ({ page }) => {
    expect((await publish(page, "/publication-fixture-ar")).ok()).toBeTruthy();
    await setTheme(page, "square-pixel", "dark");
    await page.setViewportSize({ width: 375, height: 800 });
    await page.context().clearCookies();
    await page.goto("/publication-fixture-ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const panel = await styleOf(page, '[data-tree-node="status"] [data-gp="panel"]');
    expect(panel.shadow).toMatch(/-6px 6px 0px/);
    await expect(node(page, "board").locator('[data-gp="tile"]')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});
