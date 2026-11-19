import { expect, test, type Page } from "@playwright/test";
import { liveNoteOf, sseEvents } from "../src/pageTree/liveHub";
import { triggersOf } from "../src/pageTree/pieces";
import { liveOf } from "../src/pageTree/rowsSpec";

// Live (the backend's GET /v1/live, played by the fixture: tests/catalog-server.mjs): a page holds one stream for
// all the tables its lists and recipes listen to. A list that updates by itself reads itself again when a row comes
// in, and the new row rises into its place; a recipe waiting for a row ("row") runs with the row's values (an
// in-page notice). The server closes a stream on time; the page opens the next at once, from the last change.

const say = (w: unknown) => (w && typeof w === "object" ? String((w as Record<string, string>).en ?? "") : "");
const MOCK = "http://127.0.0.1:4100";

test.describe("the stream as data", () => {
  test("its events, however they come cut; comments and retry aren't events", () => {
    const first = sseEvents("retry: 3000\n\n: beat\n\nevent: ready\r\ndata: {\"tables\":[\"a\"]}\r\n\r\nid: x.1\nevent: row\ndata: {\"table\":");
    expect(first.events).toEqual([{ event: "ready", id: "", data: "{\"tables\":[\"a\"]}" }]);
    const rest = sseEvents(`${first.rest}"a","op":"added","id":"r1"}\n\nevent: bye\ndata: {}\n\n`);
    expect(rest).toEqual({ events: [{ event: "row", id: "x.1", data: "{\"table\":\"a\",\"op\":\"added\",\"id\":\"r1\"}" }, { event: "bye", id: "", data: "{}" }], rest: "" });
  });

  test("a change checked; anything else is nothing", () => {
    expect(liveNoteOf({ table: "chat", op: "added", id: "r1", mine: true })).toEqual({ table: "chat", op: "added", id: "r1", mine: true });
    expect(liveNoteOf({ table: "chat", op: "many", id: "" })).toEqual({ table: "chat", op: "many", id: "", mine: false });
    expect(liveNoteOf({ table: "chat", op: "added", id: "" })).toBeNull();
    expect(liveNoteOf({ table: "Chat Room", op: "added", id: "r1" })).toBeNull();
    expect(liveNoteOf({ table: "chat", op: "exploded", id: "r1" })).toBeNull();
    expect(liveNoteOf("chat")).toBeNull();
  });

  test("a list that updates by itself; a recipe waiting for a row (a table, what it waits for, the visitor's own)", () => {
    expect(liveOf({ table: "chat", feed: "live", stream: true }, say)).toMatchObject({ table: "chat", stream: true });
    expect(liveOf({ table: "chat", feed: "live", stream: "yes" }, say)).not.toHaveProperty("stream");
    const link = () => "/en";
    const [row, any] = triggersOf([
      { on: "row", table: "chat", do: [{ act: "toast", text: { en: "New" } }] },
      { on: "row", table: "chat", change: "any", own: true, do: [{ act: "toast", text: { en: "Any" } }] },
      { on: "row", do: [{ act: "toast", text: { en: "No table" } }] },
    ], link, say);
    expect(row).toMatchObject({ on: "row", table: "chat", change: "added", own: false });
    expect(any).toMatchObject({ on: "row", table: "chat", change: "any", own: true });
    expect(triggersOf([{ on: "row", do: [{ act: "toast", text: { en: "x" } }] }], link, say)).toEqual([]);
  });
});

const PAGE = {
  id: "live-fixture",
  slug: "/publication-fixture-en",
  name: "Live",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {}, children: [
        { id: "sec", type: "section", props: {
          contained: true,
          // An in-page notice: someone else's new post, with its words.
          triggers: [{ on: "row", table: "live-board", do: [{ act: "toast", text: { en: "New from {{row_author}}: {{row_title}}" } }] }],
        }, style: { base: { pad: [60, 24, 60, 24], gap: 20 } }, children: [
          { id: "board", type: "grid", props: { live: { table: "live-board", feed: "live", limit: 6, sort: "-createdAt", stream: true } }, style: { base: { columns: 1, gap: 12 } }, children: [
            { id: "post", type: "stack", props: {}, children: [
              { id: "post-title", type: "heading", props: { level: 3, text: { en: "Sample" }, bind: { text: "title" } } },
              { id: "post-by", type: "text", props: { text: { en: "Someone" }, bind: { text: "author" } } },
            ] },
          ] },
        ] },
      ],
    },
  },
};

const posts = (page: Page) => page.locator('[data-tree-node="board"] [data-pt-rows] > [data-pt-row]');
const titles = (page: Page) => posts(page).locator('[data-tree-node="post-title"]');
const toastBox = (page: Page) => page.locator("#pt-toast");
const tell = (page: Page, body: Record<string, unknown>) => page.request.post(`${MOCK}/__test/live`, { data: body });
const state = async (page: Page) => (await (await page.request.get(`${MOCK}/__test/live`)).json()) as { open: string[]; opened: Array<{ tables: string; after: string }> };
const reads = async (page: Page) => ((await (await page.request.get(`${MOCK}/__test/list-rows`)).json()).reads as Array<{ table: string }>).filter((r) => r.table === "live-board").length;

test.describe("a live page", () => {
  test.beforeEach(async ({ page }) => {
    expect((await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: PAGE } })).ok()).toBeTruthy();
    await tell(page, { reset: true });
    await page.request.post(`${MOCK}/__test/list-rows`);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en/publication-fixture-en");
    await expect(titles(page)).toHaveText(["Second post", "First post"]);
    // One stream for the list and the recipe both.
    await expect.poll(async () => (await state(page)).open).toEqual(["live-board"]);
  });
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
    await request.post(`${MOCK}/__test/live`, { data: { reset: true } });
  });

  test("a row comes in: the list reads itself again, the new one rises into place, and the page says who wrote it", async ({ page }) => {
    expect((await (await tell(page, { table: "live-board", op: "added", id: "b3", row: { id: "b3", title: "Third post", author: "Maya" } })).json()).told).toBe(1);
    await expect(titles(page)).toHaveText(["Third post", "Second post", "First post"]);
    await expect(posts(page).first()).toHaveAttribute("data-pt-row-new", "");
    await expect(posts(page).nth(1)).not.toHaveAttribute("data-pt-row-new", "");
    await expect(toastBox(page)).toHaveText("New from Maya: Third post");
    expect((await state(page)).opened).toHaveLength(1);
  });

  test("the visitor's own row, or one changed: the list follows, but the notice waits for someone else's new row", async ({ page }) => {
    await tell(page, { table: "live-board", op: "added", id: "b4", mine: true, row: { id: "b4", title: "My own post", author: "Me" } });
    await expect(titles(page).first()).toHaveText("My own post");
    await tell(page, { table: "live-board", op: "changed", id: "b1", row: { id: "b1", title: "First post (edited)", author: "Lina" } });
    await expect(titles(page).last()).toHaveText("First post (edited)");
    await page.waitForTimeout(400);
    await expect(toastBox(page)).toHaveCount(0);
  });

  test("the server closes the stream on time: the next opens at once from the last change, and misses nothing", async ({ page }) => {
    await tell(page, { table: "live-board", op: "added", id: "b5", row: { id: "b5", title: "Before the bye", author: "Noor" } });
    await expect(titles(page).first()).toHaveText("Before the bye");
    const before = await reads(page);
    await page.request.post(`${MOCK}/__test/live-bye`);
    await expect.poll(async () => (await state(page)).opened.length).toBe(2);
    expect((await state(page)).opened[1]).toMatchObject({ tables: "live-board", after: "fixture.1" });
    // Told what it missed (nothing): no need to read again.
    await page.waitForTimeout(400);
    expect(await reads(page)).toBe(before);
    await tell(page, { table: "live-board", op: "added", id: "b6", row: { id: "b6", title: "After the bye", author: "Rana" } });
    await expect(titles(page).first()).toHaveText("After the bye");
    await expect(toastBox(page)).toHaveText("New from Rana: After the bye");
  });
});

// A page whose tables aren't open to a visitor who isn't signed in: a shopper's own list doesn't ask at all, and a
// recipe's stream refused isn't asked for again and again (each refusal would weigh against the visitor).
const SHUT_PAGE = {
  ...PAGE,
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {}, children: [
        { id: "sec", type: "section", props: { contained: true, triggers: [{ on: "row", table: "members-only", do: [{ act: "toast", text: { en: "A member wrote" } }] }] }, children: [
          { id: "mine", type: "grid", props: { live: { table: "my-notes", feed: "mine", limit: 6, sort: "-createdAt", stream: true, signin: { en: "Sign in to see your notes" } } }, children: [
            { id: "mine-card", type: "text", props: { text: { en: "Sample" }, bind: { text: "title" } } },
          ] },
        ] },
      ],
    },
  },
};

test("signed out: a shopper's own list opens no stream; a refused one isn't asked for again", async ({ page }) => {
  expect((await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: SHUT_PAGE } })).ok()).toBeTruthy();
  await page.request.post(`${MOCK}/__test/live`, { data: { reset: true } });
  try {
    await page.goto("/en/publication-fixture-en");
    await expect(page.locator('[data-tree-node="mine"] [data-pt-rows-note]')).toContainText("Sign in to see your notes");
    await expect.poll(async () => (await state(page)).opened.length).toBe(1);
    expect((await state(page)).opened[0]).toMatchObject({ tables: "members-only", signedIn: false });
    // Long past the first tries' waits: still the one.
    await page.waitForTimeout(3500);
    expect((await state(page)).opened).toHaveLength(1);
  } finally {
    await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  }
});
