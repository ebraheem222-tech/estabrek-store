import { expect, test, type Page } from "@playwright/test";

// A game server site's ranking (sites wave G6a; backend lib/ranking.ts fills the element as the page is served). The
// fixture backend (tests/catalog-server.mjs) serves the page as the backend would, with the numbers already in it: the
// windows as tabs (the owner's words for them), each player's place, name and number in the board's unit (play time as
// hours and minutes, a lap as minutes, seconds and thousandths), the first three marked; with no numbers, the owner's words.

const MOCK = "http://127.0.0.1:4100";
const playtime = {
  key: "playtime",
  unit: "minutes",
  best: "high",
  windows: {
    week: [{ n: 1, name: "Sara_K", value: 754 }, { n: 2, name: "<b>Omar</b>", value: 61 }, { n: 3, name: "Rami", value: 45 }, { n: 4, name: "Lina", value: 3 }],
    month: [{ n: 1, name: "Omar", value: 4321 }],
    all: [],
  },
};
const parkour = { key: "parkour", unit: "lap", best: "low", windows: { all: [{ n: 1, name: "Fast", value: 83_456 }, { n: 2, name: "Slow", value: 3_725_004 }] } };
const el = (id: string, props: Record<string, unknown>) => ({ id, type: "leaderboard", props: { board: "playtime", windows: ["week", "month", "all"], size: 10, empty: { en: "No numbers yet: play a while." }, week: { en: "Last 7 days" }, ...props } });
const PAGE = {
  id: "ranks-fixture",
  slug: "/publication-fixture-en",
  name: "Rankings",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [80, 24, 80, 24], gap: 40 } }, children: [el("time", { ranks: playtime }), el("lap", { board: "parkour", windows: ["all"], ranks: parkour }), el("none", { ranks: null })] }] } },
};
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);

test.describe("a game server's ranking", () => {
  test.beforeEach(async ({ page }) => {
    expect((await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: PAGE } })).ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/en/publication-fixture-en");
    await expect(node(page, "time").locator("[data-ranks=playtime]")).toBeVisible();
  });
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("the windows as tabs in the owner's words; each player's place, name and time played; the first three marked", async ({ page }) => {
    const box = node(page, "time");
    await expect(box.getByRole("tab")).toHaveText(["Last 7 days", "This month", "All time"]);
    await expect(box.getByRole("tab", { name: "Last 7 days" })).toHaveAttribute("aria-selected", "true");
    const rows = box.locator("ol > li");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText("Sara_K");
    await expect(rows.nth(0).locator("[dir=ltr]")).toHaveText("12h 34m");
    await expect(rows.nth(1).locator("[dir=ltr]")).toHaveText("1h 1m");
    await expect(rows.nth(3).locator("[dir=ltr]")).toHaveText("3m");
    // A name is words, never markup.
    await expect(rows.nth(1)).toContainText("<b>Omar</b>");
    await expect(box.locator("ol b")).toHaveCount(0);
    await expect(rows.nth(0)).toHaveAttribute("data-top", "1");
    await expect(rows.nth(2)).toHaveAttribute("data-top", "3");
    await expect(rows.nth(3)).not.toHaveAttribute("data-top", /./);
    // Another window; one with nobody yet says so.
    await box.getByRole("tab", { name: "This month" }).click();
    await expect(box.locator("ol > li")).toHaveCount(1);
    await expect(box.locator("ol > li [dir=ltr]")).toHaveText("72h 1m");
    await box.getByRole("tab", { name: "All time" }).click();
    await expect(box.locator("[data-ranks=empty]")).toHaveText("No numbers yet: play a while.");
  });

  test("a lap reads as minutes, seconds and thousandths; one window has no tabs; no numbers: the owner's words", async ({ page }) => {
    const lap = node(page, "lap");
    await expect(lap.getByRole("tab")).toHaveCount(0);
    await expect(lap.locator("ol > li [dir=ltr]")).toHaveText(["1:23.456", "1:02:05.004"]);
    await expect(node(page, "none").locator("[data-ranks=none]")).toHaveText("No numbers yet: play a while.");
  });

  test("in Arabic, on a phone: its own words for the windows and the time, and nothing wider than the screen", async ({ page }) => {
    const arabic = { ...PAGE, slug: "/publication-fixture-ar", tree: { ...PAGE.tree, root: { ...PAGE.tree.root, children: [{ ...PAGE.tree.root.children[0], children: [el("time", { ranks: playtime, week: undefined, empty: undefined })] }] } } };
    expect((await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-ar", page: arabic } })).ok()).toBeTruthy();
    await page.setViewportSize({ width: 375, height: 800 });
    // The English page before this one kept the visitor's language.
    await page.context().clearCookies();
    await page.goto("/publication-fixture-ar");
    const box = node(page, "time");
    await expect(box.getByRole("tab")).toHaveText(["هالأسبوع", "هالشهر", "من الأول"]);
    await expect(box.locator("ol > li").first().locator("[dir=ltr]")).toHaveText("12 س 34 د");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-ar", page: null } });
  });
});
