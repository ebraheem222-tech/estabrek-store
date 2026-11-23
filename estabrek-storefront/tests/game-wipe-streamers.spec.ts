import { expect, test, type Page } from "@playwright/test";

// A game server site's next wipe and its streamers (sites wave G6b; backend lib/wipes.ts and lib/twitch.ts fill them
// as the page is served). The fixture backend (tests/catalog-server.mjs) serves the page as the backend would, with
// them already in it: the countdown running in the browser (then the owner's words when it is here), the schedule in
// words, the last wipe, the note; the live streamers first with their stream and a way to it on Twitch in a new tab.

const MOCK = "http://127.0.0.1:4100";
const DAY = 86_400_000;
const pageWith = (slug: string, children: unknown[]) => ({
  id: `${slug}-fixture`,
  slug,
  name: "Server",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [80, 24, 80, 24], gap: 40 } }, children }] } },
});
const wipeEl = (id: string, wipe: unknown) => ({ id, type: "wipeCountdown", props: { title: { en: "Next wipe" }, done: { en: "Wiped! Come in." }, none: { en: "No wipe set yet." }, size: "big", wipe } });
const crewEl = (id: string, crew: unknown) => ({ id, type: "streamers", props: { live: { en: "On air" }, watch: { en: "Watch" }, channel: { en: "Their channel" }, empty: { en: "No streamers yet." }, columns: 3, crew } });
const crew = {
  live: true,
  list: [
    { name: "Layla", login: "layla_builds", url: "https://www.twitch.tv/layla_builds", picture: "/templates/photo-1.svg", about: null, live: { title: "Day 1: a base that won't break", game: "Rust", viewers: 1234, since: "2026-11-23T10:00:00Z", thumb: "/templates/photo-2.svg" } },
    { name: "<i>Abu</i>", login: "abu_sakhr", url: "https://www.twitch.tv/abu_sakhr", picture: null, about: { en: "Streams the first night after every wipe." }, live: null },
    { name: "Rami", login: null, url: null, picture: null, about: null, live: null },
  ],
};
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
const publish = (page: Page, slug: string, data: unknown) => page.request.post(`${MOCK}/__test/published-page`, { data: { slug, page: data } });

test.describe("a game server's wipe and streamers", () => {
  test.afterEach(async ({ request }) => {
    for (const slug of ["/publication-fixture-en", "/publication-fixture-ar"]) await request.post(`${MOCK}/__test/published-page`, { data: { slug, page: null } });
  });

  test("the next wipe counts down here, with its schedule, the last one and the note; when it comes, the owner's words", async ({ page }) => {
    const now = Date.now();
    const next = new Date(now + 2 * DAY + 3 * 3_600_000 + 4 * 60_000 + 30_000).toISOString();
    const soon = new Date(now + 2_500).toISOString();
    const base = { every: "monthly", day: "thu", time: "19:00", zone: "UTC", note: { en: "Back within 15 minutes." } };
    expect((await publish(page, "/publication-fixture-en", pageWith("/publication-fixture-en", [wipeEl("wipe", { ...base, next, last: new Date(now - 5.5 * DAY).toISOString() }), wipeEl("soon", { ...base, every: "weekly", day: "fri", time: "20:30", next: soon, last: null, note: null }), wipeEl("none", null)]))).ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/en/publication-fixture-en");
    const box = node(page, "wipe");
    await expect(box).toContainText("Next wipe");
    const nums = box.locator("[data-wipe-left] b");
    await expect(nums).toHaveCount(4);
    await expect(nums.nth(0)).toHaveText("2");
    await expect(nums.nth(1)).toHaveText("03");
    await expect(nums.nth(2)).toHaveText(/^0[34]$/);
    await expect(box.locator("[data-wipe-left] small")).toHaveText(["days", "hours", "min", "sec"]);
    await expect(box.locator("[data-wipe-date]")).toContainText("(UTC)");
    await expect(box.locator("[data-wipe-rule]")).toHaveText("The first Thursday of each month at 19:00");
    await expect(box.locator("[data-wipe-last]")).toHaveText("Last wipe: 5 days ago");
    await expect(box).toContainText("Back within 15 minutes.");
    // The seconds run.
    const first = await nums.nth(3).textContent();
    await expect(nums.nth(3)).not.toHaveText(first ?? "", { timeout: 3_000 });
    // One a moment away: then it is here.
    const soonBox = node(page, "soon");
    await expect(soonBox.locator("[data-wipe-rule]")).toHaveText("Every Friday at 20:30");
    await expect(soonBox.locator("[data-wipe-done]")).toHaveText("Wiped! Come in.", { timeout: 8_000 });
    await expect(node(page, "none").locator("[data-wipe=none]")).toHaveText("No wipe set yet.");
  });

  test("the streamers: the live first with their stream; the others with their line and channel; names as words", async ({ page }) => {
    expect((await publish(page, "/publication-fixture-en", pageWith("/publication-fixture-en", [crewEl("crew", crew), crewEl("empty", null)]))).ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/en/publication-fixture-en");
    const cards = node(page, "crew").locator("article");
    await expect(cards).toHaveCount(3);
    const live = cards.nth(0);
    await expect(live).toHaveAttribute("data-live", "yes");
    await expect(live).toContainText("On air");
    await expect(live).toContainText("1,234 watching");
    await expect(live).toContainText("Day 1: a base that won't break");
    await expect(live).toContainText("Rust");
    const watch = live.getByRole("link", { name: "Watch" });
    await expect(watch).toHaveAttribute("href", "https://www.twitch.tv/layla_builds");
    await expect(watch).toHaveAttribute("target", "_blank");
    await expect(watch).toHaveAttribute("rel", "noopener noreferrer");
    // Off air: their line and their channel; a name is words, never markup; one with no channel has no link.
    await expect(cards.nth(1)).not.toHaveAttribute("data-live", /./);
    await expect(cards.nth(1)).toContainText("<i>Abu</i>");
    await expect(cards.nth(1).locator("i")).toHaveCount(0);
    await expect(cards.nth(1)).toContainText("Streams the first night after every wipe.");
    await expect(cards.nth(1).getByRole("link", { name: "Their channel" })).toHaveAttribute("href", "https://www.twitch.tv/abu_sakhr");
    await expect(cards.nth(2).getByRole("link")).toHaveCount(0);
    await expect(node(page, "empty").locator("[data-streamers=empty]")).toHaveText("No streamers yet.");
  });

  test("in Arabic, on a phone: their own words, and nothing wider than the screen", async ({ page }) => {
    const now = Date.now();
    const words = (el: { props: Record<string, unknown> }) => ({ ...el, props: Object.fromEntries(Object.entries(el.props).filter(([, v]) => !(v && typeof v === "object" && "en" in (v as object)))) });
    expect((await publish(page, "/publication-fixture-ar", pageWith("/publication-fixture-ar", [words(wipeEl("wipe", { every: "monthly", day: "thu", time: "19:00", zone: "UTC", note: null, next: new Date(now + 3 * DAY).toISOString(), last: new Date(now - 1.2 * DAY).toISOString() })), words(crewEl("crew", crew))]))).ok()).toBeTruthy();
    await page.setViewportSize({ width: 375, height: 800 });
    await page.context().clearCookies();
    await page.goto("/publication-fixture-ar");
    await expect(node(page, "wipe")).toContainText("المسح الجاي");
    await expect(node(page, "wipe").locator("[data-wipe-rule]")).toHaveText("أول خميس بكل شهر، الساعة 19:00");
    await expect(node(page, "wipe").locator("[data-wipe-last]")).toHaveText("آخر مسح: مبارح");
    await expect(node(page, "crew").locator("article").first()).toContainText("لايف");
    await expect(node(page, "crew").getByRole("link", { name: "شوف البث" })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
});
