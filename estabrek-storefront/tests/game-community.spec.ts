import { expect, test, type Page } from "@playwright/test";

// Gamers' community sites (sites wave G7c; backend lib/gameStatus.ts and lib/gameSites.ts). Their status card shows the
// community's own pulse: a Discord server's online and members, a Roblox game's players now; both are reached by their
// link, so there is no address to copy. A Roblox game's codes are a list read in the visitor's browser (the fixture
// backend tests/catalog-server.mjs stands in for the table): each card's button copies its own row's code, and a code
// with no last day says so.

const MOCK = "http://127.0.0.1:4100";
const pageWith = (children: unknown[]) => ({
  id: "community-fixture",
  slug: "/publication-fixture-en",
  name: "Community",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [60, 24, 60, 24], gap: 32 } }, children }] } },
});
const hours = Array.from({ length: 24 }, (_, i) => ({ hour: new Date(Date.now() - (23 - i) * 3_600_000).toISOString(), players: 40 + i, online: true }));
const live = (game: string, more: Record<string, unknown>) => ({ featureId: `${game}-fixture`, game, online: true, players: null, max: null, name: null, map: null, version: null, at: new Date().toISOString(), join: { href: null, address: "" }, history: hours, discord: null, servers: null, ...more });
const status = (id: string, l: unknown) => ({ id, type: "gameStatus", props: { size: "big", chart: true, join: { en: "Join" }, live: l } });
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
const publish = (page: Page, data: unknown) => page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: data } });

const text = (id: string, words: string, bind?: Record<string, string>) => ({ id, type: "text", props: { text: { en: words }, ...(bind ? { bind } : {}) } });
const codeCard = {
  id: "card", type: "stack", props: {}, style: { base: { gap: 8 } }, children: [
    { id: "code", type: "heading", props: { text: { en: "CODE" }, level: 3, bind: { text: "code" } } },
    text("reward", "What it gives", { text: "reward" }),
    text("until", "{{row_until|No last day}}"),
    { id: "copy", type: "button", props: { label: { en: "Copy the code" }, href: "#", variant: "solid", triggers: [{ on: "click", do: [{ act: "copy", text: { en: "{{row_code}}" }, note: { en: "Copied! Paste it in the game." } }] }] } },
  ],
};
const codesList = (id: string, state: string) => ({ id, type: "grid", props: { live: { table: "codes", feed: "live", limit: 24, sort: "-createdAt", where: [{ field: "status", op: "is", value: state }], empty: { en: "No working codes right now." } } }, style: { base: { columns: 3, gap: 16 } }, children: [codeCard] });

test.describe("a community's pulse and its codes", () => {
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("a Discord server's online and members, a Roblox game's players now, each joined by its link with no address to copy", async ({ page }) => {
    const discord = live("discord", { players: 128, max: 1450, name: "Gamers' Diwan", join: { href: "https://discord.gg/gamersdiwan", address: "discord.gg/gamersdiwan" } });
    const roblox = live("roblox", { players: 4321, name: "Cloud Tower", join: { href: "https://www.roblox.com/games/1234567890", address: "roblox.com/games/1234567890" } });
    const dead = live("discord", { online: false, join: { href: "https://discord.gg/gone", address: "discord.gg/gone" } });
    expect((await publish(page, pageWith([status("dc", discord), status("rb", roblox), status("dead", dead)]))).ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.goto("/en/publication-fixture-en");
    const dc = node(page, "dc");
    await expect(dc.getByTestId("game-players")).toHaveText("128 online · 1,450 members");
    await expect(dc.getByTestId("game-join")).toHaveAttribute("href", "https://discord.gg/gamersdiwan");
    await expect(dc.getByTestId("game-copy")).toHaveCount(0);
    await expect(dc).toContainText("Gamers' Diwan");
    // Its chart's top is its own busiest hour, not its members (far more than are ever on).
    await expect(dc.locator('[data-gp="bar"]').last()).toHaveAttribute("style", /height: 100%/);
    const rb = node(page, "rb");
    await expect(rb.getByTestId("game-players")).toHaveText("4,321 playing now");
    await expect(rb.getByTestId("game-join")).toHaveAttribute("href", "https://www.roblox.com/games/1234567890");
    await expect(rb.getByTestId("game-copy")).toHaveCount(0);
    // A dead invite says so, not "offline".
    await expect(node(page, "dead")).toContainText("The invite doesn't work");
  });

  test("the working codes, each copied by its own button; a code with no last day says so; the expired ones apart", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    expect((await publish(page, pageWith([codesList("working", "active"), codesList("over", "expired")]))).ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/en/publication-fixture-en");
    const working = node(page, "working").locator("[data-pt-row]");
    await expect(working).toHaveCount(2);
    await expect(working.nth(0)).toContainText("FLOOR100");
    await expect(working.nth(0)).toContainText("31 December 2026");
    await expect(working.nth(1)).toContainText("GOLDWINGS");
    await expect(working.nth(1)).toContainText("No last day");
    await working.nth(1).getByRole("link", { name: "Copy the code" }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("GOLDWINGS");
    await expect(page.getByText("Copied! Paste it in the game.")).toBeVisible();
    // The page stayed where it was (the button's "#" is not followed).
    expect(new URL(page.url()).hash).toBe("");
    const over = node(page, "over").locator("[data-pt-row]");
    await expect(over).toHaveCount(1);
    await expect(over.nth(0)).toContainText("SUMMER26");
  });
});
