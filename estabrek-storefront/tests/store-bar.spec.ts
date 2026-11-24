import { expect, test, type APIRequestContext } from "@playwright/test";
import { importDesign } from "../src/storeThemes/kits/importDesign";

// A store with a header its owner designed in the editor (a game server's site, like the owner's own on 2026-11-24):
// that header takes the store's own header's place, so with accounts switched on there was no way to sign in or open
// an account, the cart wasn't on a computer at all (only in a phone's bottom bar), and a store with no email set up
// answered "code sent" for a code nobody would get. Against the mock API (tests/catalog-server.mjs): code 123456.

const MOCK = `http://127.0.0.1:${process.env.CATALOG_PORT || 4100}`;
const text = (en: string) => ({ en, ar: en, he: en });
/** A header like the owner's: its name, a search box and a menu, with no cart and no account. */
const bareHeader = (extra: unknown[] = []) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [
  { id: "header_1", type: "section", name: "Header", props: { tag: "header", contained: true }, style: { base: { pad: [12, 0, 12, 0] } }, children: [
    { id: "header_2", type: "stack", props: {}, style: { base: { direction: "row", justify: "between", align: "center", gap: 24 } }, children: [
      { id: "header_3", type: "heading", props: { level: 3, text: text("Night City") } },
      { id: "header_4", type: "search", props: { look: "pill" } },
      { id: "header_5", type: "menu", props: { items: [{ label: text("Home"), href: "/" }, { label: text("About"), href: "/about" }], layout: "row" } },
      ...extra,
    ] },
  ] },
] } });
const footer = { version: 1, root: { id: "page", type: "page", props: {}, children: [
  { id: "footer_1", type: "section", props: { tag: "footer", contained: true }, children: [{ id: "footer_2", type: "text", props: { text: text("Night City, all rights kept") } }] },
] } };

async function ownDesign(request: APIRequestContext, header: unknown) {
  const theme = { ...importDesign("fashion-quiet")!.design.theme, id: "night-city" };
  const page = { id: "owned-home", name: "Home", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [
    { id: "home_1", type: "section", props: { contained: true }, children: [{ id: "home_2", type: "heading", props: { level: 1, text: text("Live your story") } }] },
  ] } } };
  await request.post(`${MOCK}/__test/owned-design`, { data: { name: "Night City", theme, regions: { header, footer }, page } });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages"], paths: ["/", "/account", "/account/login", "/account/register"] } });
}
async function accounts(request: APIRequestContext, on: boolean) {
  await request.get(`${MOCK}/__test/accounts?on=${on ? 1 : 0}`);
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
}

test.describe.serial("the store's bar over a header the owner designed", () => {
  test.afterAll(async ({ request }) => {
    await request.get(`${MOCK}/__test/customer-email`);
    await request.get(`${MOCK}/__test/customer-reset`);
    await request.post(`${MOCK}/__test/owned-design`, { data: {} });
    await accounts(request, false);
  });

  test("on a computer: sign in, a new account and the cart; a new account keeps the name it was given", async ({ page, request }) => {
    test.setTimeout(120000);
    await request.get(`${MOCK}/__test/customer-reset`);
    await ownDesign(request, bareHeader());
    await accounts(request, true);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en");
    const bar = page.getByTestId("store-bar");
    await expect(page.locator("[data-store-design-region=header]")).toContainText("Night City");
    await expect(bar.getByTestId("store-bar-login")).toBeVisible();
    await expect(bar.getByTestId("store-bar-login")).toHaveAttribute("href", /\/account\/login$/);
    await expect(bar.getByTestId("store-bar-register")).toBeVisible();
    await expect(bar.getByTestId("store-bar-cart")).toBeVisible();
    await expect(bar.getByTestId("store-bar-cart")).toHaveAttribute("href", /\/cart$/);
    // It sits over the owner's header, not on it.
    const barBox = (await bar.boundingBox())!, head = (await page.locator('[data-tree-node="header_1"]').boundingBox())!;
    expect(barBox.y + barBox.height).toBeLessThanOrEqual(head.y + 1);
    await page.screenshot({ path: test.info().outputPath("bar-on-a-computer.png") });

    // A new account: a name and an email, then the code.
    await bar.getByTestId("store-bar-register").click();
    await expect(page).toHaveURL(/\/account\/register$/);
    const signIn = page.getByTestId("account-signin");
    await expect(signIn).toHaveAttribute("data-mode", "register");
    await expect(signIn.getByRole("heading", { level: 1 })).toHaveText("Open your account.");
    await signIn.getByRole("button", { name: /Send me a code/ }).click();
    await expect(signIn.getByRole("alert")).toHaveText("Enter your name.");
    await page.getByTestId("account-name").fill("Layla Night");
    await signIn.getByLabel("Email").fill("layla@night.test");
    await signIn.getByRole("button", { name: /Send me a code/ }).click();
    await signIn.getByLabel("Code").fill("123456");
    await signIn.getByRole("button", { name: /Sign in/ }).click();
    await expect.poll(async () => (await (await request.get(`${MOCK}/__test/customer-state`)).json()).user?.name).toBe("Layla Night");
    // Signed in, the bar says who she is and leads to her account.
    await page.goto("/en");
    await expect(page.getByTestId("store-bar-account")).toContainText("Layla");
    await expect(page.getByTestId("store-bar-login")).toHaveCount(0);
  });

  test("signing in and a new account lead to each other", async ({ page, request }) => {
    await ownDesign(request, bareHeader());
    await accounts(request, true);
    await page.goto("/en/account/login");
    const signIn = page.getByTestId("account-signin");
    await expect(signIn).toHaveAttribute("data-mode", "login");
    await expect(page.getByTestId("account-name")).toHaveCount(0);
    await page.getByTestId("account-switch").getByRole("link", { name: "New account" }).click();
    await expect(page).toHaveURL(/\/account\/register$/);
    await page.getByTestId("account-switch").getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account\/login$/);
  });

  test("the shopper is told when the store can't email the code, instead of waiting for it", async ({ page, request }) => {
    await ownDesign(request, bareHeader());
    await accounts(request, true);
    await page.goto("/en/account/login");
    const signIn = page.getByTestId("account-signin");
    await request.get(`${MOCK}/__test/customer-email?state=missing`);
    await signIn.getByLabel("Email").fill("sam@night.test");
    await signIn.getByRole("button", { name: /Send me a code/ }).click();
    await expect(signIn.getByRole("alert")).toContainText("can't send emails yet");
    await expect(signIn.getByLabel("Code")).toHaveCount(0);
    await request.get(`${MOCK}/__test/customer-email?state=failed`);
    await signIn.getByRole("button", { name: /Send me a code/ }).click();
    await expect(signIn.getByRole("alert")).toContainText("couldn't email the code");
    await request.get(`${MOCK}/__test/customer-email`);
  });

  test("a header with its own cart and account links gets no bar; with accounts off, only the cart", async ({ page, request }) => {
    await ownDesign(request, bareHeader([
      { id: "header_6", type: "button", props: { label: text("Bag"), href: "/cart" } },
      { id: "header_7", type: "button", props: { label: text("Me"), href: "/en/account" } },
    ]));
    await accounts(request, true);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en");
    await expect(page.locator("[data-store-design-region=header]")).toContainText("Night City");
    await expect(page.getByTestId("store-bar")).toHaveCount(0);

    await ownDesign(request, bareHeader());
    await accounts(request, false);
    await page.goto("/en");
    await expect(page.getByTestId("store-bar-cart")).toBeVisible();
    await expect(page.getByTestId("store-bar-login")).toHaveCount(0);
    await expect(page.getByTestId("store-bar-register")).toHaveCount(0);
  });
});
