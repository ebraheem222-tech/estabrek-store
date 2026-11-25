import { expect, test, type Page } from "@playwright/test";

// Plan 3.6b: a gift card and a configurator that sell one of the store's products with the shopper's own words or
// choices, which stay with the line in the bag (store/cart.tsx details) and go to the order.
const API = "http://127.0.0.1:4100";
const PATH = "/en/publication-fixture-en";

const pageWith = (...nodes: unknown[]) => ({
  id: "build-fixture", slug: "/publication-fixture-en", name: "Build", status: "PUBLISHED", format: 2, sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, children: nodes }] } },
});
const publish = async (page: Page, ...nodes: unknown[]) => {
  const res = await page.request.post(`${API}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: pageWith(...nodes) } });
  expect(res.ok()).toBeTruthy();
};
const node = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
const gift = { id: "gift", type: "giftCard", props: { title: { en: "A gift card" }, product: "rose-dress", look: "night" } };
const build = {
  id: "build", type: "configurator",
  props: { title: { en: "Make it yours" }, product: "rose-dress", parts: [{ name: { en: "The ribbon" }, options: [{ name: { en: "Pink" }, color: "#e7a3bd" }, { name: { en: "Gold" }, color: "#d4b35a" }] }] },
};

test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.evaluate(() => localStorage.removeItem("estabrak_cart_v1"));
});
test.afterEach(async ({ request }) => {
  await request.post(`${API}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
});

test("the gift card is drawn as she writes; two cards for two people are two lines with their words", async ({ page }) => {
  await publish(page, gift);
  await page.goto(PATH);
  const card = node(page, "gift");
  await expect(card.locator("[data-pt-amount]")).toHaveCount(1);
  await expect(card.locator("[data-pt-gift-amount]")).toHaveText("M");
  const add = card.locator("[data-pt-build-add]");
  // Nothing to add until it says who it's for.
  await expect(add).toBeDisabled();
  await card.locator('[data-pt-gift="to"]').fill("Sara");
  await card.locator('[data-pt-gift="from"]').fill("Lina");
  await card.locator('[data-pt-gift="message"]').fill("Happy birthday!");
  await expect(card.locator(".pt-gift-to")).toHaveText("To: Sara");
  await expect(card.locator(".pt-gift-message")).toHaveText("Happy birthday!");
  await add.click();
  await expect(add).toHaveText(/Added/);
  // The small bag opens on it, as for any piece: closed, she writes the next card.
  await expect(page.locator(".rose-minibag[data-open=true]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".rose-minibag[data-open=true]")).toHaveCount(0);
  await card.locator('[data-pt-gift="to"]').fill("Huda");
  await add.click();

  // The bag: two lines of the same amount, each with its own words; the details go out with the price request.
  const quote = page.waitForRequest((r) => r.url().includes("/catalog/cart-quote") && r.method() === "POST");
  await page.goto("/en/cart");
  const body = JSON.parse((await quote).postData() || "{}");
  expect(body.items).toHaveLength(2);
  expect(body.items.map((i: { details: Array<{ label: string; value: string }> }) => i.details[0])).toEqual([{ label: "To", value: "Sara" }, { label: "To", value: "Huda" }]);
  const lines = page.locator(".rose-cart-line");
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0).getByTestId("cart-detail")).toHaveText(["To: Sara", "From: Lina", "Message: Happy birthday!"]);
  await expect(lines.nth(1).getByTestId("cart-detail").first()).toHaveText("To: Huda");
  // Each line on its own: removing Sara's card leaves Huda's.
  await lines.nth(0).locator(".rose-cart-remove").click();
  await expect(lines).toHaveCount(1);
  await expect(lines.first().getByTestId("cart-detail").first()).toHaveText("To: Huda");
});

test("the configurator: its colours and sizes, and the owner's parts, go to the bag with her choices", async ({ page }) => {
  await publish(page, build);
  await page.goto(PATH);
  const cfg = node(page, "build");
  await expect(cfg.locator("[data-pt-colour]")).toHaveCount(2);
  await cfg.locator('[data-pt-colour="1"]').click();
  await expect(cfg.locator("[data-pt-size]")).toHaveCount(2);
  await cfg.locator('[data-pt-size="berry-l"]').click();
  await cfg.locator('[data-pt-part="0-1"]').click();
  await expect(cfg.locator(".pt-build-label").last()).toContainText("Gold");
  await expect(cfg.locator("[data-pt-build-price]")).not.toHaveText("");
  await cfg.locator("[data-pt-build-add]").click();
  await page.goto("/en/cart");
  const line = page.locator(".rose-cart-line");
  await expect(line).toHaveCount(1);
  await expect(line).toHaveAttribute("data-variant", "berry-l");
  await expect(line.getByTestId("cart-detail")).toHaveText("The ribbon: Gold");
});

test("without a product picked, shoppers see nothing of it", async ({ page }) => {
  await publish(page, { ...gift, props: { ...gift.props, product: undefined } }, { ...build, props: { ...build.props, product: undefined } });
  await page.goto(PATH);
  await page.waitForTimeout(1500);
  await expect(node(page, "gift")).toBeHidden();
  await expect(node(page, "build")).toBeHidden();
  await expect(page.locator(".pt-build-missing")).toHaveCount(0);
});
