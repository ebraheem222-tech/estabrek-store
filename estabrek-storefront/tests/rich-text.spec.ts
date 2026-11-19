import { expect, test } from "@playwright/test";
import { parseRich, richHref, richInline, richPlain } from "../src/pageTree/richText";

// Formatted words (a table's richText field, backend lib/collectionTree.ts): kept as the owner wrote them, drawn by
// the shop as real elements (src/pageTree/richText.ts), never as HTML. On a page drawn with its rows, and in a list
// read in the visitor's browser (the fixture backend stands in: tests/catalog-server.mjs, table "rich-notes").

const MOCK = "http://127.0.0.1:4100";

test.describe("reading formatted words", () => {
  test("marks, blocks, and links a page may open", () => {
    expect(richInline("**bold** and *it* and `x*y` and ~~gone~~")).toEqual([
      { t: "b", kids: [{ t: "text", v: "bold" }] },
      { t: "text", v: " and " },
      { t: "i", kids: [{ t: "text", v: "it" }] },
      { t: "text", v: " and " },
      { t: "code", kids: [{ t: "text", v: "x*y" }] },
      { t: "text", v: " and " },
      { t: "s", kids: [{ t: "text", v: "gone" }] },
    ]);
    // A star between numbers, a word with underscores: words, not marks.
    expect(richInline("2 * 3 * 4")).toEqual([{ t: "text", v: "2 * 3 * 4" }]);
    expect(richInline("snake_case_word")).toEqual([{ t: "text", v: "snake_case_word" }]);
    expect(richInline("**ناعم** جداً")).toEqual([{ t: "b", kids: [{ t: "text", v: "ناعم" }] }, { t: "text", v: " جداً" }]);
    expect(parseRich("## Care\nWash cold\ngently\n\n- one\n- two\n1. first\n> said\n---")).toEqual([
      { t: "h", level: 3, kids: [{ t: "text", v: "Care" }] },
      { t: "p", lines: [[{ t: "text", v: "Wash cold" }], [{ t: "text", v: "gently" }]] },
      { t: "ul", items: [[{ t: "text", v: "one" }], [{ t: "text", v: "two" }]] },
      { t: "ol", items: [[{ t: "text", v: "first" }]] },
      { t: "quote", lines: [[{ t: "text", v: "said" }]] },
      { t: "hr" },
    ]);
    expect(richPlain("## Care\n- **one**\n[two](https://x.test)")).toBe("Care\none\ntwo");
    for (const ok of ["https://example.com/a", "/shop", "#top", "mailto:a@b.co", "tel:+970599000000"]) expect(richHref(ok)).toBe(ok);
    for (const no of ["javascript:alert(1)", "JAVASCRIPT:x", "data:text/html,x", "//evil.test", "vbscript:x", "https:// x", "/a b"]) expect(richHref(no)).toBeNull();
    expect(richInline("[x](javascript:alert(1))")).toEqual([{ t: "text", v: "x" }]);
    expect(parseRich(undefined)).toEqual([]);
    expect(parseRich("   \n\n")).toEqual([]);
  });
});

const PAGE = {
  id: "rich-fixture",
  slug: "/publication-fixture-en",
  name: "Rich",
  status: "PUBLISHED",
  format: 2,
  sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {}, children: [
        { id: "sec", type: "section", props: { contained: true }, style: { base: { pad: [60, 24, 60, 24], gap: 28 } }, children: [
          // Drawn with the page: the server filled it from a row and marked it.
          { id: "drawn", type: "text", props: { text: { en: "**Hand** made\n\n- one\n- two\n\n### Care\n> keep dry" }, formatted: true } },
          { id: "plain", type: "text", props: { text: { en: "**not marked**" } } },
          // The editor's own inline marks (`rich`, pageTree/rich.ts) are another thing, drawn as before.
          { id: "editor-marks", type: "text", props: { text: { en: "[i]soft[/i] and [b]warm[/b]" }, rich: true } },
          { id: "notes", type: "grid", props: { live: { table: "rich-notes", feed: "live", limit: 6, sort: "-createdAt" } }, style: { base: { columns: 3, gap: 16 } }, children: [
            { id: "card", type: "stack", props: {}, children: [
              { id: "card-title", type: "heading", props: { level: 3, text: { en: "Sample" }, bind: { text: "title" } } },
              { id: "card-body", type: "text", props: { text: { en: "Sample words" }, bind: { text: "body" }, formatted: true } },
              { id: "card-total", type: "text", props: { text: { en: "0" }, bind: { text: "total" } } },
            ] },
          ] },
        ] },
      ],
    },
  },
};

test.describe("formatted words on a page", () => {
  test.beforeEach(async ({ page }) => {
    expect((await page.request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: PAGE } })).ok()).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 1000 });
  });
  test.afterEach(async ({ request }) => {
    await request.post(`${MOCK}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
  });

  test("drawn with their marks, on the page and in each row; anything else stays words", async ({ page }, testInfo) => {
    await page.goto("/en/publication-fixture-en");
    const node = (id: string) => page.locator(`[data-tree-node="${id}"]`);
    // On the page: a block of its own (lists and headings can't sit in a paragraph).
    await expect(node("drawn")).toHaveJSProperty("tagName", "DIV");
    await expect(node("drawn").locator("strong")).toHaveText("Hand");
    await expect(node("drawn").locator("ul > li")).toHaveText(["one", "two"]);
    await expect(node("drawn").locator("h4")).toHaveText("Care");
    await expect(node("drawn").locator("blockquote")).toHaveText("keep dry");
    // Lists are drawn as lists (the page's reset takes their bullets off).
    expect(await node("drawn").locator("ul").evaluate((el) => getComputedStyle(el).listStyleType)).toBe("disc");
    // A text that isn't connected to formatted words shows its marks as written.
    await expect(node("plain")).toHaveText("**not marked**");
    await expect(node("editor-marks")).toHaveJSProperty("tagName", "P");
    await expect(node("editor-marks")).toHaveText("soft and warm");
    await expect(node("editor-marks").locator("em, i")).toHaveText("soft");

    // In a list read in the browser: each copy of the card, from the row's words.
    const rows = page.locator('[data-pt-rows="rich-notes"] > [data-pt-row]');
    await expect(rows).toHaveCount(3);
    const body = (at: number) => rows.nth(at).locator('[data-tree-node="card-body"]');
    await expect(body(0).locator("strong")).toHaveText("Soft");
    await expect(body(0).locator("em")).toHaveText("light");
    await expect(body(0).locator("li")).toHaveText(["washes cold", "dries flat"]);
    const link = body(0).locator("a");
    await expect(link).toHaveAttribute("href", "https://example.com/care");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(rows.nth(0).locator('[data-tree-node="card-total"]')).toHaveText("₪120.00");
    // Words that try to be HTML or a script link stay words: no element, nothing run.
    await expect(body(1)).toContainText("<b>not bold</b>");
    await expect(body(1).locator("b, script, a")).toHaveCount(0);
    await expect(body(1)).toContainText("x");
    expect(await page.evaluate(() => (window as unknown as { __hit?: number }).__hit)).toBeUndefined();
    // A row that doesn't say its words are formatted: shown as written.
    await expect(body(2)).toHaveText("**stays as written**");
    await expect(body(2).locator("strong")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("rich-text.png"), fullPage: true });
  });
});
