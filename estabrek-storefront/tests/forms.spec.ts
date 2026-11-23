import { expect, test, type Page } from "@playwright/test";
import { formOf, problemOf, valuesFor, type FormFieldSpec } from "../src/pageTree/formSpec";

// A form the owner builds in the page editor (the form element, kind "custom"): fields of their choosing, sent to
// one of their functions or added as a row of one of their tables, as whoever is signed in. The fixture backend
// stands in for both ends (tests/catalog-server.mjs: /v1/fn/*, /v1/data/*).

const say = (w: unknown) => (w && typeof w === "object" ? String((w as Record<string, string>).en ?? "") : "");
const MOCK = "http://127.0.0.1:4100";

test.describe("a form as data", () => {
  test("what isn't a field drops out; where it goes needs a real address", () => {
    const spec = formOf({
      kind: "custom", title: { en: "Ask" }, button: { en: "Send it" }, done: { en: "Sent" },
      fields: [
        { name: "to", kind: "email", label: { en: "Her email" }, required: true, hint: { en: "Only for this" } },
        { name: "to", kind: "text", label: { en: "Twice" } }, { name: "Bad Name", kind: "text", label: { en: "x" } }, { name: "x", kind: "colour", label: { en: "x" } },
        { name: "size", kind: "select", label: { en: "Size" }, options: [{ value: "s", label: { en: "Small" } }, { value: "m" }, { value: "" }, "junk"] },
        { name: "age", kind: "number", label: {}, min: 13, max: 120 },
      ],
      send: { to: "fn", fn: "friend-request", as: "req" },
    }, say);
    expect(spec.fields.map((f) => f.name)).toEqual(["to", "size", "age"]);
    expect(spec.fields[0]).toEqual({ name: "to", kind: "email", label: "Her email", hint: "Only for this", required: true, options: [] });
    expect(spec.fields[1].options).toEqual([{ value: "s", label: "Small" }, { value: "m", label: "m" }]);
    // No label written: its name stands in.
    expect(spec.fields[2]).toMatchObject({ label: "age", min: 13, max: 120 });
    expect(spec.send).toEqual({ to: "fn", fn: "friend-request", as: "req" });
    expect([spec.title, spec.button, spec.done]).toEqual(["Ask", "Send it", "Sent"]);
    expect(formOf({ kind: "custom", send: { to: "fn", fn: "Not An Address" } }, say).send).toBeNull();
    expect(formOf({ kind: "custom", send: { to: "table", table: "friend-requests" } }, say).send).toEqual({ to: "table", table: "friend-requests" });
    // Values the row always gets (a site's form for one job): a field's id each, a short value; anything else drops out.
    expect(formOf({ kind: "custom", send: { to: "table", table: "applications", set: { kind: "police", Bad: "x", age: 3, long: "y".repeat(81) } } }, say).send).toEqual({ to: "table", table: "applications", set: { kind: "police", age: 3 } });
    expect(formOf({ kind: "custom", send: { to: "email" } }, say).send).toBeNull();
  });

  test("what was typed is checked by the field's kind; what is sent is typed for where it goes", () => {
    const f = (kind: FormFieldSpec["kind"], more: Partial<FormFieldSpec> = {}): FormFieldSpec => ({ name: "x", kind, label: "X", hint: "", required: false, options: [], ...more });
    expect(problemOf(f("text", { required: true }), "  ", "en")).toBe("This is needed");
    expect(problemOf(f("text"), "", "en")).toBeNull();
    expect(problemOf(f("email"), "not an email", "en")).toBe("This isn't an email address");
    expect(problemOf(f("email"), "lina@example.com", "en")).toBeNull();
    expect(problemOf(f("phone"), "abc", "ar")).toBe("رقم التلفون مش صحيح");
    expect(problemOf(f("phone"), "+972 50 000 0000", "en")).toBeNull();
    expect(problemOf(f("number", { min: 13, max: 120 }), "12", "en")).toBe("At least 13");
    expect(problemOf(f("number", { min: 13, max: 120 }), "121", "he")).toBe("לכל היותר 120");
    expect(problemOf(f("number"), "1.5", "en")).toBeNull();
    expect(problemOf(f("text", { min: 3 }), "ab", "en")).toBe("At least 3 letters");
    expect(problemOf(f("select", { options: [{ value: "s", label: "Small" }] }), "xl", "en")).toBe("This isn't one of the choices");
    expect(problemOf(f("date"), "2026-13-40", "en")).toBe("This isn't a date");
    expect(problemOf(f("date"), "2026-11-16", "en")).toBeNull();
    expect(problemOf(f("check", { required: true }), false, "en")).toBe("This is needed");
    expect(problemOf(f("check"), false, "en")).toBeNull();

    const fields = [f("text", { name: "name" }), f("number", { name: "age" }), f("check", { name: "agree" }), f("long", { name: "note" })];
    const typed = { name: " Rana ", age: "30", agree: true, note: "" };
    expect(valuesFor(fields, typed, "fn")).toEqual({ name: "Rana", age: "30", agree: "true" });
    expect(valuesFor(fields, typed, "table")).toEqual({ name: "Rana", age: 30, agree: true });
  });
});

const field = (name: string, kind: string, label: string, more: Record<string, unknown> = {}) => ({ name, kind, label: { en: label }, ...more });
const form = (id: string, props: Record<string, unknown>) => ({ id, type: "form", props: { kind: "custom", ...props } });
const FORMS_PAGE = {
  id: "forms-fixture",
  slug: "/publication-fixture-en",
  name: "Forms",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {}, children: [
        { id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [80, 24, 80, 24], gap: 40 } }, children: [
          { id: "last", type: "text", props: { text: { en: "Last request: {{req_to|none yet}}" } } },
          // To a function for signed-in shoppers; its answer is a row; a recipe waits for it to be sent.
          form("ask", {
            title: { en: "Add a friend" }, button: { en: "Ask her" }, done: { en: "Asked {{req_to}} ✓" }, send: { to: "fn", fn: "friend-request", as: "req" },
            fields: [
              field("to", "email", "Her email", { required: true, hint: { en: "We only use it for this request" } }),
              field("note", "long", "A few words", { max: 200 }),
              field("size", "select", "Circle", { options: [{ value: "close", label: { en: "Close friends" } }, { value: "all", label: { en: "Everyone" } }] }),
              field("agree", "check", "I know her", { required: true }),
            ],
            triggers: [{ on: "sent", do: [{ act: "toast", text: { en: "Thanks!" } }] }],
          }),
          // To a table anyone may add to; the table has rules of its own.
          form("write", {
            send: { to: "table", table: "messages", set: { source: "page" } },
            fields: [field("name", "text", "Your name", { required: true }), field("age", "number", "Age", { min: 1, max: 120 }), field("news", "check", "Send me news"), field("day", "date", "A day")],
          }),
          // To a function that stops by itself; to a table for signed-in shoppers; and one not set up yet.
          form("stops", { send: { to: "fn", fn: "full" }, fields: [field("to", "text", "To")] }),
          form("members", { send: { to: "table", table: "members" }, fields: [field("nick", "text", "Nickname", { required: true })] }),
          form("unset", { fields: [field("x", "text", "Anything")] }),
        ] },
      ],
    },
  },
};

const el = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
const box = (page: Page, id: string, name: string) => el(page, id).locator(`[name="${name}"]`);
const bad = (page: Page, id: string, name: string) => el(page, id).locator(`[data-field="${name}"] [role="alert"]`);
const note = (page: Page, id: string) => el(page, id).locator("[data-pt-form-note]");
const send = (page: Page, id: string) => el(page, id).locator('button[type="submit"]').click();
const ready = (page: Page) => expect(page.locator("html")).toHaveAttribute("data-pt-recipes", "");

test.describe("a form on a page", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: FORMS_PAGE } });
    expect(res.ok()).toBeTruthy();
    await page.request.post(`${MOCK}/__test/fn-calls`);
    await page.request.post(`${MOCK}/__test/data-rows`);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/en/publication-fixture-en");
    await expect(el(page, "ask").locator("form[data-pt-form]")).toBeVisible();
    await ready(page);
  });
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("it is drawn with its labels; what is wrong is said under the field and nothing is sent", async ({ page }, testInfo) => {
    const ask = el(page, "ask");
    await expect(ask.locator("h2")).toHaveText("Add a friend");
    await expect(ask.getByLabel("Her email *")).toHaveAttribute("type", "email");
    await expect(ask.locator("#" + (await box(page, "ask", "to").getAttribute("aria-describedby"))!.split(" ")[0].replace(/:/g, "\\:"))).toHaveText("We only use it for this request");
    await expect(box(page, "ask", "size").locator("option")).toHaveText(["Choose…", "Close friends", "Everyone"]);
    await expect(ask.locator('button[type="submit"]')).toHaveText("Ask her");

    await send(page, "ask");
    await expect(bad(page, "ask", "to")).toHaveText("This is needed");
    await expect(bad(page, "ask", "agree")).toHaveText("This is needed");
    await expect(box(page, "ask", "to")).toBeFocused();
    await expect(box(page, "ask", "to")).toHaveAttribute("aria-invalid", "true");
    await box(page, "ask", "to").fill("not an email");
    // Typing again takes the old complaint away; sending brings the new one.
    await expect(bad(page, "ask", "to")).toHaveCount(0);
    await send(page, "ask");
    await expect(bad(page, "ask", "to")).toHaveText("This isn't an email address");
    await page.screenshot({ path: testInfo.outputPath("form-problems.png") });
    expect((await (await page.request.get(`${MOCK}/__test/fn-calls`)).json()).calls).toEqual([]);

    // One that goes nowhere yet says so.
    await box(page, "unset", "x").fill("hello");
    await send(page, "unset");
    await expect(note(page, "unset")).toHaveText("This form isn't ready yet");
  });

  test("to a function: a guest is asked to sign in; signed in, it runs as her, empties, says so and tells its recipe", async ({ page }) => {
    const fill = async () => {
      await box(page, "ask", "to").fill("lina@example.com");
      await box(page, "ask", "note").fill("Hi Lina");
      await box(page, "ask", "size").selectOption("close");
      await box(page, "ask", "agree").check();
    };
    await fill();
    await send(page, "ask");
    await expect(note(page, "ask")).toContainText("Sign in first.");
    await expect(note(page, "ask").locator("a")).toHaveAttribute("href", "/en/account");
    // What she typed is still there.
    await expect(box(page, "ask", "to")).toHaveValue("lina@example.com");

    await page.request.get(`${MOCK}/__test/customer-reset`);
    await page.request.get(`${MOCK}/__test/accounts?on=1`);
    try {
      await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
      expect((await page.request.post("/api/account/verify", { data: { email: "sara@example.com", code: "123456" } })).ok()).toBeTruthy();
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-pt-in", "");
      await ready(page);
      await page.request.post(`${MOCK}/__test/fn-calls`);
      await fill();
      await send(page, "ask");
      await expect(note(page, "ask")).toHaveText("Asked lina@example.com ✓");
      await expect(note(page, "ask")).toHaveAttribute("data-is", "done");
      // Its answer fills the page's words, the form is empty again, and the recipe that waited for it ran.
      await expect(el(page, "last")).toHaveText("Last request: lina@example.com");
      await expect(box(page, "ask", "to")).toHaveValue("");
      await expect(box(page, "ask", "agree")).not.toBeChecked();
      await expect(page.locator("#pt-toast")).toHaveText("Thanks!");
      expect((await (await page.request.get(`${MOCK}/__test/fn-calls`)).json()).calls).toEqual([
        { address: "friend-request", input: { to: "lina@example.com", note: "Hi Lina", size: "close", agree: "true" }, shopper: "sara@example.com" },
      ]);

      // A table for signed-in shoppers takes her row too.
      await box(page, "members", "nick").fill("Sara");
      await send(page, "members");
      await expect(note(page, "members")).toHaveText("Sent ✓");
      expect((await (await page.request.get(`${MOCK}/__test/data-rows`)).json()).rows).toEqual([{ table: "members", values: { nick: "Sara" }, lang: "en", shopper: "sara@example.com" }]);
    } finally {
      await page.request.get(`${MOCK}/__test/accounts?on=0`);
      await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
      await page.request.get(`${MOCK}/__test/customer-reset`);
    }
  });

  test("to a table: the table's own rules are said under their fields, then the row is added with its kinds", async ({ page }) => {
    await box(page, "write", "name").fill("Taken");
    await box(page, "write", "age").fill("12");
    await send(page, "write");
    // The owner's own words for one rule, the server's for the other.
    await expect(bad(page, "write", "name")).toHaveText("This name is taken");
    await expect(bad(page, "write", "age")).toHaveText("At least 18");
    await expect(box(page, "write", "name")).toBeFocused();
    expect((await (await page.request.get(`${MOCK}/__test/data-rows`)).json()).rows).toEqual([]);

    await box(page, "write", "name").fill("Rana");
    await box(page, "write", "age").fill("30");
    await box(page, "write", "news").check();
    await box(page, "write", "day").fill("2026-11-16");
    await send(page, "write");
    await expect(note(page, "write")).toHaveText("Sent ✓");
    await expect(box(page, "write", "name")).toHaveValue("");
    expect((await (await page.request.get(`${MOCK}/__test/data-rows`)).json()).rows).toEqual([
      // With the value the form always sends.
      { table: "messages", values: { name: "Rana", age: 30, news: true, day: "2026-11-16", source: "page" }, lang: "en", shopper: null },
    ]);

    // A guest at a table for signed-in shoppers.
    await box(page, "members", "nick").fill("Guest");
    await send(page, "members");
    await expect(note(page, "members")).toContainText("Sign in first.");
  });

  test("a function that stops says its own words; a robot's fill goes nowhere", async ({ page }) => {
    await box(page, "stops", "to").fill("lina");
    await send(page, "stops");
    await expect(note(page, "stops")).toHaveText("You already asked her");
    await expect(note(page, "stops")).toHaveAttribute("data-is", "failed");
    await expect(box(page, "stops", "to")).toHaveValue("lina");

    // The box no person sees is filled: the form says "sent" and nothing reaches the table.
    await el(page, "write").locator('[name="pt-leave-empty"]').evaluate((input) => { (input as HTMLInputElement).value = "http://spam.example"; });
    await box(page, "write", "name").fill("Robot");
    await send(page, "write");
    await expect(note(page, "write")).toHaveText("Sent ✓");
    expect((await (await page.request.get(`${MOCK}/__test/data-rows`)).json()).rows).toEqual([]);
  });
});
