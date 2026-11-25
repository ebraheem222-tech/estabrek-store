import { expect, test, type Page } from "@playwright/test";

// The shop's games (plan 3.6): a scratch card and a memory game that give a coupon, which the bag then takes.
const API = "http://127.0.0.1:4100";
const PATH = "/en/publication-fixture-en";

const games = (more: Record<string, unknown> = {}) => ({
  id: "games-fixture", slug: "/publication-fixture-en", name: "Games", status: "PUBLISHED", format: 2, sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {}, children: [{
        id: "sec", type: "section", props: { contained: true }, children: [
          { id: "scratch", type: "scratchCard", props: { title: { en: "Scratch and win" }, prize: { en: "10% off your order" }, coupon: "ROSE10", look: "gold", height: 220, once: true, save: true, ...more } },
          { id: "memory", type: "memoryGame", props: { title: { en: "Match the pairs" }, prize: { en: "10% off your order" }, coupon: "ROSE10", faces: [{ icon: "heart" }, { icon: "star" }], once: true, save: true } },
        ],
      }],
    },
  },
});
const publish = async (page: Page, more?: Record<string, unknown>) => {
  const res = await page.request.post(`${API}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: games(more) } });
  expect(res.ok()).toBeTruthy();
};
const won = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("estabrek_won_coupon") || "null")?.code ?? null);
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);

/** Scratches back and forth across the card's cover, row by row. */
async function scratch(page: Page) {
  const canvas = node(page, "scratch").locator("[data-pt-scratch]");
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 6, box.y + 6);
  await page.mouse.down();
  for (let y = 10; y < box.height; y += 22) {
    await page.mouse.move(box.x + box.width - 6, box.y + y, { steps: 6 });
    await page.mouse.move(box.x + 6, box.y + y + 11, { steps: 6 });
  }
  await page.mouse.up();
}

test.describe.configure({ mode: "serial" });
test.afterEach(async ({ request }) => {
  await request.post(`${API}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
});

test("scratched away, the card shows its prize and code, keeps it in the bag's place, and stays scratched", async ({ page }) => {
  await publish(page);
  await page.goto(PATH);
  const card = node(page, "scratch");
  await expect(card.locator(".pt-game-title")).toHaveText("Scratch and win");
  await expect(card.locator("[data-pt-prize]")).toHaveCount(0);
  // The page wakes up before the cover takes a finger.
  await expect(async () => {
    await scratch(page);
    await expect(card.locator("[data-pt-prize]")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await expect(card.locator(".pt-game-code b")).toHaveText("ROSE10");
  await expect(card.locator(".pt-game-note")).toContainText(/bag/);
  expect(await won(page)).toBe("ROSE10");
  // Next visit: already scratched.
  await page.reload();
  await expect(card.locator("[data-pt-prize]")).toBeVisible();
  await expect(card.locator("[data-pt-scratch]")).toHaveCount(0);
});

test("without a finger or a mouse: the reveal button shows the prize", async ({ page }) => {
  await publish(page, { once: false });
  await page.goto(PATH);
  const card = node(page, "scratch");
  const button = card.getByRole("button", { name: "Reveal the prize" });
  await expect(async () => {
    if (await button.isVisible()) await button.click();
    await expect(card.locator("[data-pt-prize]")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await expect(card.locator(".pt-game-code b")).toHaveText("ROSE10");
});

test("the memory game: all the pairs found wins the prize; the bag then takes its coupon by itself", async ({ page }) => {
  await publish(page);
  await page.goto(PATH);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const game = node(page, "memory");
  const cards = game.locator(".pt-mem-card");
  await expect(cards).toHaveCount(4);
  // Matching pairs by their face (shuffled once the page wakes up), turned two at a time.
  await expect(async () => {
    for (const face of ["0", "1"]) {
      const pair = game.locator(`.pt-mem-card[data-face="${face}"]:not([disabled])`);
      if ((await pair.count()) < 2) continue;
      await pair.nth(0).click();
      await pair.nth(1).click();
    }
    await expect(game.locator("[data-pt-prize]")).toBeVisible({ timeout: 2500 });
  }).toPass({ timeout: 30_000 });
  await expect(game.locator(".pt-game-code b")).toHaveText("ROSE10");
  expect(await won(page)).toBe("ROSE10");

  // A piece in the bag: its price comes with the coupon in.
  await page.goto("/en/p/rose-dress");
  await page.locator(".rose-pdp-add").click();
  await page.goto("/en/cart");
  await expect(page.getByText(/Coupon ROSE10 applied/)).toBeVisible({ timeout: 20_000 });
});

test("a code the store doesn't take is forgotten by the bag", async ({ page }) => {
  await page.goto("/en");
  await page.evaluate(() => localStorage.setItem("estabrek_won_coupon", JSON.stringify({ code: "NOPE99", at: Date.now() })));
  await page.goto("/en/p/rose-dress");
  await page.locator(".rose-pdp-add").click();
  await page.goto("/en/cart");
  await expect.poll(() => won(page), { timeout: 20_000 }).toBeNull();
  await expect(page.getByText(/Coupon NOPE99 applied/)).toHaveCount(0);
});
