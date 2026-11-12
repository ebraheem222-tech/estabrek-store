import { expect, test, type Page } from "@playwright/test";
import { hiddenFrom, triggersOf } from "../src/pageTree/pieces";
import { compareVar } from "../src/pageTree/recipeVars";

// Recipes on any element (phase D of the engine plan): when → who → if → do, else, on fail. Conditions, groups
// and variables; a long press and keys; asking first; the bag; who may run it and what the others get.

const link = (h: unknown) => (typeof h === "string" && h.startsWith("/") ? `/en${h}` : typeof h === "string" && h.startsWith("https://") ? h : null);
const say = (w: unknown) => (w && typeof w === "object" ? String((w as Record<string, string>).en ?? "") : "");

test.describe("recipes as data", () => {
  test("what the shop doesn't know drops out; who may, the key and the fail steps are kept", () => {
    const [t] = triggersOf([{
      on: "click", who: "customer", deny: "signin", note: { en: "Sign in first" },
      if: [{ if: "signedIn", value: true }, { if: "bag", cmp: "gte", value: 1 }, { if: "bag", cmp: "every", value: 1 }, { if: "moon" }],
      do: [
        { act: "confirm", text: { en: "Sure?" } }, { act: "bag", productId: "bag", quantity: 2 }, { act: "bag" }, { act: "wish", productId: "coat", value: "toggle" },
        { act: "call" }, { act: "call", phone: "not a number" }, { act: "whatsapp", text: { en: "Hi" } }, { act: "share" }, { act: "back" },
        { act: "download", href: "javascript:alert(1)" }, { act: "download", href: "/uploads/guide.pdf", name: "My/guide.pdf" }, { act: "explode" },
      ],
      else: [{ act: "toast", text: { en: "No" } }],
      fail: [{ act: "toast", text: { en: "Stopped" } }],
    }], link, say);
    expect(t.who).toBe("customer");
    expect(t.deny).toBe("signin");
    expect(t.signin).toBe("/en/account");
    expect(t.if).toEqual([{ if: "signedIn", value: true }, { if: "bag", cmp: "gte", value: 1 }]);
    expect(t.do).toEqual([
      { act: "confirm", text: "Sure?", yes: "", no: "" }, { act: "bag", productId: "bag", quantity: 2 }, { act: "wish", productId: "coat", value: "toggle" },
      { act: "call", phone: "" }, { act: "whatsapp", phone: "", text: "Hi" }, { act: "share", title: "", href: "" }, { act: "back" },
      { act: "download", href: "/uploads/guide.pdf", name: "Myguide.pdf" },
    ]);
    expect(t.else).toEqual([{ act: "toast", text: "No" }]);
    expect(t.fail).toEqual([{ act: "toast", text: "Stopped" }]);
  });

  test("a key recipe needs a key we know; who may defaults to locked; hiding marks the element", () => {
    const list = triggersOf([
      { on: "key", key: "Enter", do: [{ act: "vibrate" }] },
      { on: "key", key: "F13", do: [{ act: "vibrate" }] },
      { on: "key", do: [{ act: "vibrate" }] },
      { on: "longpress", who: "guest", do: [{ act: "vibrate" }] },
      { on: "click", who: "staff", deny: "hide", do: [{ act: "vibrate" }] },
    ], link, say);
    expect(list.map((t) => [t.on, t.key, t.who, t.deny])).toEqual([["key", "Enter", undefined, undefined], ["longpress", undefined, "guest", "lock"], ["click", undefined, undefined, undefined]]);
    expect(hiddenFrom(list)).toBeUndefined();
    expect(hiddenFrom(triggersOf([{ on: "click", who: "customer", deny: "hide", do: [{ act: "vibrate" }] }], link, say))).toBe("customer");
  });

  test("a variable is compared as a number when both are numbers, else as words", () => {
    expect(compareVar(3, "gte", 3)).toBe(true);
    expect(compareVar("3", "eq", 3)).toBe(true);
    expect(compareVar("abc", "gt", 1)).toBe(false);
    expect(compareVar(undefined, "unset")).toBe(true);
    expect(compareVar(undefined, "eq", 0)).toBe(false);
    expect(compareVar(true, "eq", true)).toBe(true);
    expect(compareVar("red", "ne", "blue")).toBe(true);
  });
});

const button = (id: string, label: string, triggers: unknown[]) => ({ id, type: "button", props: { label: { en: label }, href: "#", triggers } });
const toastOf = (text: string) => ({ act: "toast", text: { en: text } });
const RECIPES_PAGE = {
  id: "recipes-fixture",
  slug: "/publication-fixture-en",
  name: "Recipes",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {}, children: [
        { id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [120, 24, 120, 24], gap: 14 } }, children: [
          { id: "count-text", type: "text", props: { text: { en: "You clicked {{clicks|0}} times" } } },
          button("counter", "Count", [{ on: "click", do: [{ act: "set", name: "clicks", op: "add", value: 1 }, toastOf("Clicked {{clicks}}")] }]),
          button("third", "Every third", [{ on: "click", if: [{ if: "count", cmp: "every", value: 3 }], do: [toastOf("Third!")], else: [toastOf("Not yet")] }]),
          button("group", "Group", [{ on: "click", do: [{ act: "together", do: [{ act: "set", name: "a", op: "set", value: 1 }, { act: "set", name: "b", op: "set", value: 2 }] }, { act: "repeat", times: 3, do: [{ act: "set", name: "n", op: "add", value: 1 }] }, toastOf("a{{a}} b{{b}} n{{n}}")] }]),
          button("ask", "Ask", [{ on: "click", do: [{ act: "confirm", text: { en: "Leave the page?" }, yes: { en: "Leave" }, no: { en: "Stay" } }, toastOf("Went")], fail: [toastOf("Stayed")] }]),
          button("slow", "Slow", [{ on: "click", do: [{ act: "wait", seconds: 0.7 }, { act: "set", name: "slow", op: "add", value: 1 }, toastOf("Slow {{slow}}")] }]),
          button("bag-one", "One choice", [{ on: "click", do: [{ act: "bag", productId: "bag" }, toastOf("In the bag")], fail: [toastOf("Sold out")] }]),
          button("bag-many", "Many choices", [{ on: "click", do: [{ act: "bag", productId: "coat" }, toastOf("In the bag")], fail: [toastOf("Sold out")] }]),
          button("bag-none", "No such product", [{ on: "click", do: [{ act: "bag", productId: "nope" }, toastOf("In the bag")], fail: [toastOf("Sold out")] }]),
          button("bag-if", "Bag?", [{ on: "click", if: [{ if: "bag", cmp: "gte", value: 1 }], do: [toastOf("Has pieces")], else: [toastOf("Empty bag")] }]),
          button("held", "Hold me", [{ on: "longpress", do: [toastOf("Held")] }]),
          button("keyed", "Press k", [{ on: "key", key: "k", do: [toastOf("Key k")] }]),
          button("members", "Members", [{ on: "click", who: "customer", deny: "hide", do: [toastOf("Welcome back")] }]),
          button("locked", "Locked", [{ on: "click", who: "customer", deny: "lock", note: { en: "Sign in first" }, do: [toastOf("Opened")] }]),
          button("join", "Join", [{ on: "click", who: "guest", deny: "hide", do: [toastOf("Join us")] }]),
          button("gate", "Gate", [{ on: "click", who: "customer", deny: "signin", do: [toastOf("Inside")] }]),
        ] },
      ],
    },
  },
};

const el = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
const toast = (page: Page) => page.locator("#pt-toast");
/** The recipes are listening (their runtime loads after the page shows). */
const ready = (page: Page) => expect(page.locator("html")).toHaveAttribute("data-pt-recipes", "");

test.describe("recipes on a page", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: RECIPES_PAGE } });
    expect(res.ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/publication-fixture-en");
    await expect(el(page, "count-text")).toHaveText("You clicked 0 times");
    await ready(page);
  });
  test.afterEach(async ({ request }) => {
    await request.post("http://127.0.0.1:4100/__test/published-page", { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("variables count and show in words; conditions pick do or else; groups run at once and again", async ({ page }) => {
    await el(page, "counter").click();
    await expect(toast(page)).toHaveText("Clicked 1");
    await el(page, "counter").click();
    await expect(toast(page)).toHaveText("Clicked 2");
    await expect(el(page, "count-text")).toHaveText("You clicked 2 times");

    await el(page, "third").click();
    await expect(toast(page)).toHaveText("Not yet");
    await el(page, "third").click();
    await el(page, "third").click();
    await expect(toast(page)).toHaveText("Third!");

    await el(page, "group").click();
    await expect(toast(page)).toHaveText("a1 b2 n3");
  });

  test("a question first: «no» runs the fail steps, «yes» goes on; it never runs over itself", async ({ page }, testInfo) => {
    await el(page, "ask").click();
    const ask = page.locator("#pt-ask");
    await expect(ask).toContainText("Leave the page?");
    await page.screenshot({ path: testInfo.outputPath("recipe-question.png") });
    // The "no" button holds the focus.
    await expect(ask.locator('[data-pt-ask="no"]')).toBeFocused();
    await ask.locator('[data-pt-ask="no"]').click();
    await expect(toast(page)).toHaveText("Stayed");
    await expect(ask).toHaveCount(0);

    await el(page, "ask").click();
    await page.locator('#pt-ask [data-pt-ask="yes"]').click();
    await expect(toast(page)).toHaveText("Went");

    // Escape is a "no".
    await el(page, "ask").click();
    await expect(page.locator("#pt-ask")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(toast(page)).toHaveText("Stayed");

    // Pressed three times while it's still waiting: it ran once, and showed busy meanwhile.
    await el(page, "slow").click();
    await el(page, "slow").click();
    await expect(el(page, "slow")).toHaveAttribute("data-pt-busy", "");
    await el(page, "slow").click();
    await expect(toast(page)).toHaveText("Slow 1");
    await expect(el(page, "slow")).not.toHaveAttribute("data-pt-busy", "");
  });

  test("the bag: one choice is added, several open the quick view, a missing product fails", async ({ page }) => {
    const pieces = () => page.evaluate(() => JSON.parse(localStorage.getItem("estabrak_cart_v1") || "[]") as Array<{ variantId: string; quantity: number }>);
    await el(page, "bag-if").click();
    await expect(toast(page)).toHaveText("Empty bag");

    await el(page, "bag-none").click();
    await expect(toast(page)).toHaveText("Sold out");
    expect(await pieces()).toEqual([]);

    await el(page, "bag-one").click();
    await expect(toast(page)).toHaveText("In the bag");
    expect(await pieces()).toEqual([{ variantId: "one", quantity: 1 }]);

    await page.keyboard.press("Escape"); // the small bag that opened on the add
    await el(page, "bag-if").click({ force: true });
    await expect(toast(page)).toHaveText("Has pieces");

    // Colours and sizes to choose from: its quick view opens, and the steps after it don't run.
    await el(page, "bag-many").click({ force: true });
    await expect(page.getByRole("dialog").filter({ hasText: "فستان الورد" }).first()).toBeVisible();
    await expect(toast(page)).toHaveText("Has pieces");
    expect(await pieces()).toEqual([{ variantId: "one", quantity: 1 }]);
  });

  test("a long press and a key start a recipe", async ({ page }) => {
    const box = (await el(page, "held").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    // Not long enough yet.
    await expect(toast(page)).toHaveCount(0);
    await page.waitForTimeout(500);
    await page.mouse.up();
    await expect(toast(page)).toHaveText("Held");

    await page.keyboard.press("k");
    await expect(toast(page)).toHaveText("Key k");
  });

  test("who may: guests don't see what's for customers, a locked one says why, a gate sends to sign in", async ({ page, context }) => {
    await expect(el(page, "members")).toBeHidden();
    await expect(el(page, "join")).toBeVisible();
    await expect(el(page, "locked")).toHaveAttribute("data-pt-denied", "lock");
    await el(page, "locked").click();
    await expect(toast(page)).toHaveText("Sign in first");
    await el(page, "join").click();
    await expect(toast(page)).toHaveText("Join us");

    // Signed in (the storefront's readable flag): the other way round, with nothing flashing first.
    await context.addCookies([{ name: "estabrek_signed_in", value: "1", url: "http://127.0.0.1:3000" }]);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-pt-in", "");
    await ready(page);
    await expect(el(page, "members")).toBeVisible();
    await expect(el(page, "join")).toBeHidden();
    await expect(el(page, "count-text")).toBeVisible();
    await expect(el(page, "locked")).not.toHaveAttribute("data-pt-denied", "lock");
    await el(page, "locked").click();
    await expect(toast(page)).toHaveText("Opened");
    await el(page, "gate").click();
    await expect(toast(page)).toHaveText("Inside");

    // A guest at the gate goes to sign in.
    await context.clearCookies();
    await page.reload();
    await ready(page);
    await expect(el(page, "gate")).toBeVisible();
    // (Accounts are off in this test shop, so its account page sends the visitor back: the request is the proof.)
    const asked = page.waitForRequest((r) => r.isNavigationRequest() && /\/en\/account$/.test(r.url()));
    await el(page, "gate").click();
    await asked;
  });
});
