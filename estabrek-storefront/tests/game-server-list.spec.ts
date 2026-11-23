import { expect, test, type Page } from "@playwright/test";

// A network's or a community's own servers (sites wave G7b; backend lib/gameSites.ts fills the element with the site's
// status as the page is served). The fixture backend (tests/catalog-server.mjs) serves the page as the backend would,
// with the status already in it: each server up or down with its players, what it is, a way in (the game's own link
// at its own address, or the network's one address to copy and what to type there), one column on a phone.

const MOCK = "http://127.0.0.1:4100";
const pageWith = (slug: string, children: unknown[]) => ({
  id: `${slug}-fixture`,
  slug,
  name: "Servers",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [80, 24, 80, 24], gap: 40 } }, children }] } },
});
const listEl = (id: string, live: unknown, columns = 3) => ({ id, type: "serverList", props: { join: { en: "Join it" }, copy: { en: "Copy the address" }, empty: { en: "The servers show here soon." }, columns, size: "big", live } });
const sub = (key: string, more: Record<string, unknown>) => ({ key, title: { en: key }, line: null, hint: null, game: "steam", online: null, players: null, max: null, map: null, at: null, from: null, join: { href: null, address: "" }, ...more });
const community = {
  featureId: "cs2-fixture",
  servers: [
    sub("retake", { title: { en: "Retake", ar: "ريتيك" }, line: { en: "Five against four: the bomb is planted." }, online: true, players: 8, max: 10, map: "de_inferno", from: "asked", join: { href: "steam://connect/cs.example:27015", address: "cs.example:27015" } }),
    sub("surf", { title: { en: "Surf" }, online: false, from: "asked", join: { href: "steam://connect/cs.example:27016", address: "cs.example:27016" } }),
    sub("awp", { title: { en: "AWP only" }, join: { href: "steam://connect/cs.example:27018", address: "cs.example:27018" } }),
  ],
};
const network = {
  featureId: "net-fixture",
  servers: [sub("bedwars", { title: { en: "Bed Wars" }, game: "minecraft", hint: { en: "/server bedwars" }, online: true, players: 2, max: 16, from: "link", join: { href: null, address: "play.arenas.example" } })],
};
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
const publish = (page: Page, slug: string, data: unknown) => page.request.post(`${MOCK}/__test/published-page`, { data: { slug, page: data } });

test.describe("a site's own servers", () => {
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("each server with its status and players, what it is, and a way in; a network's through its one address", async ({ page }) => {
    expect((await publish(page, "/publication-fixture-en", pageWith("/publication-fixture-en", [listEl("cs", community), listEl("net", network, 1), listEl("none", null)]))).ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/en/publication-fixture-en");
    const cards = node(page, "cs").locator("article");
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toHaveAttribute("data-state", "on");
    await expect(cards.nth(0)).toContainText("Retake");
    await expect(cards.nth(0)).toContainText("Five against four: the bomb is planted.");
    await expect(cards.nth(0)).toContainText("de_inferno");
    await expect(cards.nth(0).getByTestId("server-players")).toHaveText("8 / 10 players");
    await expect(cards.nth(0).getByRole("link", { name: "Join it" })).toHaveAttribute("href", "steam://connect/cs.example:27015");
    await expect(cards.nth(1)).toHaveAttribute("data-state", "off");
    await expect(cards.nth(1)).toContainText("Offline");
    await expect(cards.nth(2)).toHaveAttribute("data-state", "unknown");
    await expect(cards.nth(2)).toContainText("Not checked yet");
    // Three side by side.
    const [a, b] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    // A network's game: no link of its own, its one address to copy, and what to type there.
    const bed = node(page, "net").locator("article");
    await expect(bed).toHaveCount(1);
    await expect(bed.getByRole("link")).toHaveCount(0);
    await expect(bed.getByTestId("server-copy")).toContainText("play.arenas.example");
    await expect(bed).toContainText("Then type /server bedwars");
    await expect(bed.getByTestId("server-players")).toHaveText("2 / 16 players");
    // None yet: the owner's words.
    await expect(node(page, "none")).toHaveText("The servers show here soon.");
  });

  test("on a phone, one server a row, nothing wider than the screen", async ({ page }) => {
    expect((await publish(page, "/publication-fixture-en", pageWith("/publication-fixture-en", [listEl("cs", community)]))).ok()).toBeTruthy();
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/en/publication-fixture-en");
    const cards = node(page, "cs").locator("article");
    await expect(cards).toHaveCount(3);
    const [a, b] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
    expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
