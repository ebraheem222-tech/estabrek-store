import { expect, test, type Page } from "@playwright/test";
import { liveOf, rowBind, rowScope, rowsOf, rowsQuery, rowWords } from "../src/pageTree/rowsSpec";

// A list read in the visitor's browser (the backend's lib/collectionTree.ts LIST_FEEDS): the page is drawn the same
// for everyone, with the list's card once; the rows are each visitor's own question to the table's API, and the
// card is repeated for each. A button in a row acts on that row. The fixture backend stands in for the table and
// the function (tests/catalog-server.mjs: GET /v1/data/*, /v1/fn/accept).

const say = (w: unknown) => (w && typeof w === "object" ? String((w as Record<string, string>).en ?? "") : "");
const MOCK = "http://127.0.0.1:4100";

test.describe("a list's question as data", () => {
  test("what isn't a list drops out; its question is written as the table's API reads it", () => {
    expect(liveOf(undefined, say)).toBeNull();
    expect(liveOf({ table: "Not A Table", feed: "mine" }, say)).toBeNull();
    expect(liveOf({ table: "friend-requests", feed: "everyone" }, say)).toBeNull();
    const spec = liveOf({
      table: "friend-requests", feed: "tome", limit: 4, sort: "createdAt", empty: { en: "No requests" }, signin: { en: "Sign in to see them" },
      where: [{ field: "state", op: "is", value: "waiting" }, { field: "Bad Field", op: "is", value: "x" }, { field: "note", op: "sounds-like", value: "x" }, { field: "seen", op: "isFalse" }, { field: "note", op: "contains" }],
    }, say)!;
    expect(spec).toEqual({ table: "friend-requests", feed: "tome", limit: 4, sort: "createdAt", empty: "No requests", signin: "Sign in to see them", where: [{ field: "state", op: "is", value: "waiting" }, { field: "seen", op: "isFalse", value: "" }, { field: "note", op: "contains", value: "" }] });
    // A question with nothing to compare with isn't asked.
    expect(decodeURIComponent(rowsQuery(spec, "en", 2))).toBe("lang=en&shown=1&pageSize=4&page=2&sort=createdAt&mine=tome&state[is]=waiting&seen[isFalse]=1");
    expect(rowsQuery({ ...spec, feed: "mine", where: [] }, "ar", 1)).toBe("lang=ar&shown=1&pageSize=4&page=1&sort=createdAt&mine=1");
    expect(rowsQuery({ ...spec, feed: "live", where: [] }, "he", 1)).not.toContain("mine");
    // Anything else: six newest.
    expect(liveOf({ table: "notes", feed: "live", limit: 500, sort: "title" }, say)).toMatchObject({ limit: 6, sort: "-createdAt", where: [], empty: "", signin: "" });
  });

  test("a row as a card and a recipe see it", () => {
    expect(rowBind({ text: "note", href: "$url", src: "photo", alt: "$by", label: "not a field!", width: "note" })).toEqual({ text: "note", href: "$url", src: "photo", alt: "$by" });
    expect(rowBind("note")).toEqual({});
    const [row, ...rest] = rowsOf([
      { id: "r1", slug: "r-1", status: "PUBLISHED", values: { note: "Hi", count: 3, done: false, photo: "/a.png", to: { name: "Lina", me: false }, aVeryLongFieldNameIndeedYes: "x" }, shown: { note: "Hi", count: "3", to: "Lina", $by: "Sara", odd: 7 }, links: { site: "/shop" } },
      { id: "bad id!" }, null, "junk",
    ]);
    expect(rest).toEqual([]);
    expect(row.shown).toEqual({ note: "Hi", count: "3", to: "Lina", $by: "Sara" });
    expect([rowWords(row, "note"), rowWords(row, "$slug"), rowWords(row, "$by"), rowWords(row, "$url"), rowWords(row, "gone")]).toEqual(["Hi", "r-1", "Sara", "", ""]);
    // The field's words where it has them, its plain value where it has none; nothing for what isn't plain.
    expect(rowScope(row)).toEqual({ row_id: "r1", row_slug: "r-1", row_by: "Sara", row_note: "Hi", row_count: "3", row_done: false, row_photo: "/a.png", row_to: "Lina" });
  });
});

const text = (id: string, words: string, more: Record<string, unknown> = {}) => ({ id, type: "text", props: { text: { en: words }, ...more } });
const list = (id: string, live: Record<string, unknown>, card: unknown, columns = 2) => ({ id, type: "grid", props: { live }, style: { base: { columns, gap: 16 } }, children: [card] });
const ROWS_PAGE = {
  id: "rows-fixture",
  slug: "/publication-fixture-en",
  name: "Rows",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {}, children: [
        { id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [60, 24, 60, 24], gap: 28 } }, children: [
          // Sent to the shopper and still waiting: who sent it, its words, and a button that accepts that row.
          list("inbox", { table: "friend-requests", feed: "tome", limit: 6, sort: "-createdAt", where: [{ field: "state", op: "is", value: "waiting" }], empty: { en: "No requests waiting" }, signin: { en: "Sign in to see who asked" } }, {
            id: "req", type: "stack", props: {}, style: { base: { gap: 8, pad: [16, 16, 16, 16] } }, children: [
              { id: "req-from", type: "heading", props: { level: 3, text: { en: "Someone" }, bind: { text: "$by" } } },
              text("req-note", "Sample words", { bind: { text: "note" } }),
              text("req-line", "{{row_by|Somebody}} wrote: {{row_note}}"),
              { id: "req-yes", type: "button", props: { label: { en: "Accept" }, triggers: [{ on: "click", do: [{ act: "fn", fn: "accept", input: { id: "{{row_id}}" }, as: "ok" }, { act: "wait", seconds: 0.6 }, { act: "toast", text: { en: "You and {{row_by}} are friends" } }] }] } },
              { id: "req-hide", type: "button", props: { label: { en: "Not now" }, variant: "link", triggers: [{ on: "click", do: [{ act: "visible", target: "req", value: "hide" }] }] } },
            ],
          }),
          // Every row that is hers and accepted: the ones she sent and the ones sent to her.
          list("friends", { table: "friend-requests", feed: "mine", limit: 6, sort: "-createdAt", where: [{ field: "state", op: "is", value: "accepted" }] }, {
            id: "friend", type: "stack", props: {}, children: [text("friend-who", "A friend", { bind: { text: "$by" } }), text("friend-state", "State", { bind: { text: "state" } })],
          }),
          // What everyone reads: words, a formatted price, a picture, a link, the row's own page; two at a time.
          list("notes", { table: "notes", feed: "live", limit: 2, sort: "-createdAt" }, {
            id: "note", type: "stack", props: {}, children: [
              { id: "note-pic", type: "image", props: { src: "/templates/photo-5.svg", alt: { en: "Sample" }, bind: { src: "photo", alt: "title", href: "$url" } }, style: { base: { width: "120px" } } },
              { id: "note-title", type: "heading", props: { level: 3, text: { en: "Sample title" }, bind: { text: "title" } }, motion: { enter: { kind: "fade", duration: 0.6 } } },
              text("note-price", "Price", { bind: { text: "price" } }),
              { id: "note-site", type: "button", props: { label: { en: "Open" }, href: "/", variant: "link", bind: { href: "site" } } },
            ],
          }),
          list("none", { table: "nothing", feed: "live", limit: 3, sort: "-createdAt", empty: { en: "Nothing written yet" } }, text("none-card", "Sample")),
          list("closed", { table: "not-open", feed: "live", limit: 3, sort: "-createdAt" }, text("closed-card", "Sample")),
          list("broken", { table: "broken", feed: "live", limit: 3, sort: "-createdAt" }, text("broken-card", "Sample")),
        ] },
      ],
    },
  },
};

const el = (page: Page, id: string) => page.locator(`[data-tree-node="${id}"]`);
const rows = (page: Page, id: string) => el(page, id).locator("[data-pt-rows] > [data-pt-row]");
const note = (page: Page, id: string) => el(page, id).locator("[data-pt-rows-note]");
const inRow = (page: Page, list: string, at: number, id: string) => rows(page, list).nth(at).locator(`[data-tree-node="${id}"]`);
const ready = (page: Page) => expect(page.locator("html")).toHaveAttribute("data-pt-recipes", "");
const reads = async (page: Page) => (await (await page.request.get(`${MOCK}/__test/list-rows`)).json()).reads as Array<{ table: string; query: Record<string, string>; shopper: string | null }>;

test.describe("a list on a page", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: ROWS_PAGE } });
    expect(res.ok()).toBeTruthy();
    await page.request.post(`${MOCK}/__test/list-rows`);
    await page.request.post(`${MOCK}/__test/fn-calls`);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/en/publication-fixture-en");
    await ready(page);
  });
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("a visitor: the open list's rows fill the card; a shopper's lists ask them to sign in; the card itself is never seen", async ({ page }, testInfo) => {
    // The card as designed is on the page once, unseen; each row is a copy of it.
    await expect(rows(page, "notes")).toHaveCount(2);
    await expect(page.locator("[data-pt-row-card]").first()).toBeHidden();
    await expect(page.getByText("Sample title")).toBeHidden();
    await expect(inRow(page, "notes", 0, "note-title")).toHaveText("Note 1");
    await expect(inRow(page, "notes", 1, "note-title")).toHaveText("Note 2");
    await expect(inRow(page, "notes", 0, "note-price")).toHaveText("₪10.00");
    // The row's picture and its description; a row with no picture keeps the design's own.
    const pic = (at: number) => rows(page, "notes").nth(at).locator("img");
    await expect(pic(0)).toHaveAttribute("src", "/templates/photo-1.svg");
    await expect(pic(0)).toHaveAttribute("alt", "Note 1");
    await expect(pic(1)).toHaveAttribute("src", "/templates/photo-5.svg");
    // Links: a path on the shop gets the page's language; a published row has a page of its own, a draft has none.
    await expect(inRow(page, "notes", 0, "note-site")).toHaveAttribute("href", "/en/shop");
    await expect(inRow(page, "notes", 1, "note-site")).toHaveAttribute("href", "https://example.com/n");
    await expect(rows(page, "notes").nth(0).locator("a.pt-image-link")).toHaveAttribute("href", "/en/notes/note-1");
    await expect(rows(page, "notes").nth(1).locator("a.pt-image-link")).toHaveAttribute("href", "#");
    // Laid out by the grid itself: two across, side by side.
    const [a, b] = [await rows(page, "notes").nth(0).boundingBox(), await rows(page, "notes").nth(1).boundingBox()];
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
    // Nothing in a copy waits for the motion engine.
    await expect(inRow(page, "notes", 0, "note-title")).not.toHaveAttribute("data-pt-enter", "");
    await expect(inRow(page, "notes", 0, "note-title")).toHaveCSS("opacity", "1");

    // More, two at a time, until they are all there.
    const more = el(page, "notes").locator("[data-pt-rows-more]");
    await expect(more).toHaveText("Show more");
    await more.click();
    await expect(rows(page, "notes")).toHaveCount(4);
    await more.click();
    await expect(rows(page, "notes")).toHaveCount(5);
    await expect(more).toHaveCount(0);
    // A row whose field opens nothing: its link goes nowhere.
    await expect(inRow(page, "notes", 2, "note-site")).toHaveAttribute("href", "#");

    // A shopper's own rows: not asked for without a shopper; said in the owner's words, with the way in.
    await expect(note(page, "inbox")).toHaveText("Sign in to see who asked Sign in");
    await expect(note(page, "inbox").locator("a")).toHaveAttribute("href", "/en/account");
    await expect(note(page, "friends")).toHaveText("Sign in to see this list. Sign in");
    await expect(rows(page, "inbox")).toHaveCount(0);
    expect((await reads(page)).filter((r) => r.table === "friend-requests")).toEqual([]);

    // No rows: the owner's words, or ours; a table that isn't open is an empty list; a question the table refuses says so.
    await expect(note(page, "none")).toHaveText("Nothing written yet");
    await expect(note(page, "closed")).toHaveText("Nothing here yet");
    await expect(note(page, "broken")).toContainText("The list couldn't be loaded.");
    await expect(note(page, "broken").locator("button")).toHaveText("Try again");
    await page.screenshot({ path: testInfo.outputPath("rows-visitor.png"), fullPage: true });
  });

  test("a shopper: the rows sent to her, a button that accepts that row, and both lists read again", async ({ page }, testInfo) => {
    // The page she opened as a visitor has settled (a list still loading would ask again as she signs in).
    await expect(note(page, "inbox")).toContainText("Sign in to see who asked");
    await expect(rows(page, "notes")).toHaveCount(2);
    await page.request.get(`${MOCK}/__test/customer-reset`);
    await page.request.get(`${MOCK}/__test/accounts?on=1`);
    try {
      await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
      expect((await page.request.post("/api/account/verify", { data: { email: "sara@example.com", code: "123456" } })).ok()).toBeTruthy();
      await page.request.post(`${MOCK}/__test/list-rows`);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-pt-in", "");
      await ready(page);

      // The two requests waiting for her: who sent each (never the sample words), in the row and in a text's {{row_…}}.
      await expect(rows(page, "inbox")).toHaveCount(2);
      await expect(inRow(page, "inbox", 0, "req-from")).toHaveText("Lina");
      await expect(inRow(page, "inbox", 0, "req-note")).toHaveText("Hi Sara");
      await expect(inRow(page, "inbox", 0, "req-line")).toHaveText("Lina wrote: Hi Sara");
      // Each value keeps its own direction inside the page's words; and it is the row's, not one of the visit's variables.
      await expect(inRow(page, "inbox", 0, "req-line").locator('[data-pt-row-var="row_by"]')).toHaveAttribute("dir", "auto");
      await expect(inRow(page, "inbox", 0, "req-line").locator("[data-pt-var]")).toHaveCount(0);
      await expect(inRow(page, "inbox", 1, "req-from")).toHaveText("Dana");
      await expect(rows(page, "friends")).toHaveCount(1);
      await expect(inRow(page, "friends", 0, "friend-who")).toHaveText("Maya");
      await expect(note(page, "inbox")).toHaveCount(0);
      // Asked as her, once each: the half of her rows the list is about, and its filter.
      const asked = (await reads(page)).filter((r) => r.table === "friend-requests").sort((a, b) => b.query.mine.localeCompare(a.query.mine));
      expect(asked).toEqual([
        { table: "friend-requests", query: { lang: "en", shown: "1", pageSize: "6", page: "1", sort: "-createdAt", mine: "tome", "state[is]": "waiting" }, shopper: "sara@example.com" },
        { table: "friend-requests", query: { lang: "en", shown: "1", pageSize: "6", page: "1", sort: "-createdAt", mine: "1", "state[is]": "accepted" }, shopper: "sara@example.com" },
      ]);
      await page.screenshot({ path: testInfo.outputPath("rows-shopper.png"), fullPage: true });

      // A step that reaches for an element reaches this row's copy of it: "not now" hides Dana's card only.
      await inRow(page, "inbox", 1, "req-hide").click();
      await expect(rows(page, "inbox").nth(1)).toBeHidden();
      await expect(rows(page, "inbox").nth(0)).toBeVisible();

      // Accept on Lina's row: the function gets that row's id and both lists read again; the recipe goes on to its
      // end though its row is gone by then (its words come a moment later, and still name her).
      await inRow(page, "inbox", 0, "req-yes").click();
      await expect(rows(page, "inbox")).toHaveCount(1);
      await expect(page.locator("#pt-toast")).toHaveText("You and Lina are friends");
      expect((await (await page.request.get(`${MOCK}/__test/fn-calls`)).json()).calls).toEqual([{ address: "accept", input: { id: "req1" }, shopper: "sara@example.com" }]);
      await expect(rows(page, "inbox")).toHaveCount(1);
      await expect(inRow(page, "inbox", 0, "req-from")).toHaveText("Dana");
      await expect(rows(page, "friends")).toHaveCount(2);
      await expect(rows(page, "friends").locator('[data-tree-node="friend-who"]')).toHaveText(["Lina", "Maya"]);
      await expect(inRow(page, "friends", 0, "friend-state")).toHaveText("Accepted");

      // The rows drawn again answer too: Dana's button works on Dana's row.
      await inRow(page, "inbox", 0, "req-yes").click();
      await expect(page.locator("#pt-toast")).toHaveText("You and Dana are friends");
      await expect(note(page, "inbox")).toHaveText("No requests waiting");
      await expect(rows(page, "friends")).toHaveCount(3);
    } finally {
      await page.request.get(`${MOCK}/__test/accounts?on=0`);
      await page.request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
      await page.request.get(`${MOCK}/__test/customer-reset`);
      await page.request.post(`${MOCK}/__test/list-rows`);
    }
  });
});
