import { expect, test, type Page } from "@playwright/test";
import { triggersOf } from "../src/pageTree/pieces";

// A recipe's «link» step taking its address from a variable (sites wave G4): a Minecraft server's «اشتري» runs the
// site's function, which asks for a payment and answers its link; the step goes there. Only a safe address is taken
// (a path on the shop, the shop's own address, or https), whatever the function said. The fixture backend
// (tests/catalog-server.mjs) answers the function with the link the test hands it.

const MOCK = "http://127.0.0.1:4100";
const link = (h: unknown) => (typeof h === "string" && h.startsWith("/") ? `/en${h}` : typeof h === "string" && h.startsWith("https://") ? h : null);
const say = (w: unknown) => (w && typeof w === "object" ? String((w as Record<string, string>).en ?? "") : "");

test.describe("a link step as data", () => {
  test("it takes its address from a variable, or from its own href; with neither it isn't a step", () => {
    const [t] = triggersOf([{ on: "click", do: [{ act: "link", to: "order_link" }, { act: "link", href: "/shop" }, { act: "link" }, { act: "link", to: "1bad" }] }], link, say);
    expect(t.do).toEqual([
      { act: "link", href: "", to: "order_link", newTab: false },
      { act: "link", href: "/en/shop", newTab: false },
    ]);
  });
});

const buy = (id: string, to: string) => ({ id, type: "button", props: { label: { en: id }, href: "#", triggers: [{ on: "click", do: [{ act: "fn", fn: "pay-for", input: { to }, as: "order" }, { act: "link", to: "order_link" }] }] } });
const PAGE = {
  id: "recipe-link-fixture",
  slug: "/publication-fixture-en",
  name: "Recipe link",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [80, 24, 80, 24], gap: 24 } }, children: [buy("safe", "/en/publication-fixture-en?paid=1"), buy("elsewhere", "//evil.example/pay"), buy("script", "javascript:alert(1)")] }] } },
};
const ready = (page: Page) => expect(page.locator("html")).toHaveAttribute("data-pt-recipes", "");

test.describe("a link to a function's answer", () => {
  test.beforeEach(async ({ page }) => {
    expect((await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: PAGE } })).ok()).toBeTruthy();
    await page.request.post(`${MOCK}/__test/fn-calls`);
    await page.goto("/en/publication-fixture-en");
    await ready(page);
  });
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("a path on the shop is followed; another site's or a script isn't", async ({ page }) => {
    const at = page.url();
    await page.getByRole("link", { name: "elsewhere" }).click();
    await page.getByRole("link", { name: "script" }).click();
    await expect.poll(async () => ((await (await page.request.get(`${MOCK}/__test/fn-calls`)).json()).calls as unknown[]).length).toBe(2);
    expect(page.url()).toBe(at);
    await page.getByRole("link", { name: "safe" }).click();
    await page.waitForURL(/\?paid=1$/);
  });
});
