import { describe, expect, test } from "vitest";
import type { CollectionField } from "../../api/collections.api";
import type { ColumnKind, GridRow, Op } from "../../api/data.api";
import { parseCsv, separatorOf } from "./csv";
import { cellPatch, cellText, columnsOf, doubledTargets, editable, filterColumns, filterReady, sheetCells, filterValue, guessTarget, issueWords, kindOf, newFilter, nextSort, opName, opNeeds, pageInfo, queryOut, rowsFromCsv, targetName, targetsOf, withWords } from "./dataText";

// The data grid's pure parts: columns, questions, cells, and a CSV file's columns matched to the table's.

const fields: CollectionField[] = [
  { id: "title", type: "text", name: { ar: "العنوان", en: "Title" }, required: true },
  { id: "body", type: "longText", name: { en: "Text" } },
  { id: "price", type: "number", name: { ar: "السعر", en: "Price" } },
  { id: "day", type: "date" },
  { id: "active", type: "boolean" },
  { id: "kind", type: "select", name: { en: "Kind" }, options: [{ id: "new", name: { en: "New", ar: "جديد" } }, { id: "sale", name: { en: "On sale" } }] },
  { id: "cover", type: "image" },
];
const row = (data: Record<string, unknown>, over: Partial<GridRow> = {}): GridRow => ({ id: "r1", collectionId: "c1", slug: "spring", status: "PUBLISHED", data, sort: 0, publishedAt: "2026-11-01T10:00:00Z", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-11-13T10:00:00Z", deletedAt: null, ...over });
const ops = { text: ["contains", "is"], number: ["is", "gt", "between"], $slug: ["contains"], select: ["is", "anyOf"], boolean: ["isTrue", "isFalse"] } as unknown as Record<ColumnKind, Op[]>;

describe("Columns and cells", () => {
  const columns = columnsOf({ fields }, "ar");
  const col = (id: string) => columns.find((c) => c.id === id)!;

  test("the address, the status, each field by its name, then when it changed", () => {
    expect(columns.map((c) => c.id)).toEqual(["$slug", "$status", "title", "body", "price", "day", "active", "kind", "cover", "$updatedAt"]);
    expect(col("title").name).toBe("العنوان");
    expect(col("body").name).toBe("Text");
    expect(col("day").name).toBe("day");
    expect(kindOf("$publishedAt", fields)).toBe("$date");
    expect(kindOf("price", fields)).toBe("number");
    expect(kindOf("nope", fields)).toBeNull();
    expect(editable(col("$updatedAt"))).toBe(false);
    expect(editable(col("$slug"))).toBe(true);
    expect(editable(col("price"))).toBe(true);
    // JSON needs room: it's written in the row's window.
    expect(editable({ id: "extra", kind: "json", name: "Extra" })).toBe(false);
  });

  test("one of the store's tables: its address or id, its columns (worked-out ones marked), when it was made", () => {
    const store = columnsOf({ readOnly: true, hasAddress: false, fields: [{ id: "customer", type: "text", name: { en: "Customer" } }, { id: "pieces", type: "number", computed: true }] }, "en");
    expect(store.map((c) => `${c.id}${c.computed ? ":worked-out" : ""}`)).toEqual(["$slug", "customer", "pieces:worked-out", "$createdAt"]);
    expect(store[0].name).toContain("ID");
    expect(columnsOf({ readOnly: true, hasAddress: true, fields: [] }, "en")[0].name).toContain("Address");
    expect(filterColumns(store, true).map((c) => c.id)).toEqual(["$slug", "customer", "$createdAt", "$updatedAt"]);
    expect(filterColumns(columns, false).map((c) => c.id).slice(-3)).toEqual(["$updatedAt", "$createdAt", "$publishedAt"]);
    // The store's words are plain.
    expect(cellText(store[1], row({ customer: "Lina" }), "ar")).toBe("Lina");
  });

  test("the newer kinds in a cell: shown as words, sent as what they are", () => {
    const tags: CollectionField = { id: "tags", type: "multiSelect", options: [{ id: "new", name: { en: "New" } }, { id: "sale", name: { en: "On sale" } }] };
    const more = columnsOf({ fields: [tags, { id: "price", type: "money", currency: "USD" }, { id: "place", type: "location" }, { id: "mail", type: "email" }] }, "en");
    const c = (id: string) => more.find((x) => x.id === id)!;
    const r = row({ tags: ["new", "sale"], price: 1250.5, place: { lat: 31.7, lng: 35.2, label: "Shop" }, mail: "sara@example.test" });
    expect(cellText(c("tags"), r, "en")).toBe("New, On sale");
    expect(cellText(c("price"), r, "en")).toBe("US$1,250.50");
    expect(cellText(c("place"), r, "en")).toBe("Shop");
    expect(cellPatch(c("tags"), r, "en", "sale")).toEqual({ values: { tags: ["sale"] } });
    expect(cellPatch(c("tags"), r, "en", "")).toEqual({ values: { tags: null } });
    expect(cellPatch(c("place"), r, "en", "32, 34.5, New shop")).toEqual({ values: { place: { lat: 32, lng: 34.5, label: "New shop" } } });
    expect(cellPatch(c("price"), r, "en", "99")).toEqual({ values: { price: 99 } });
    expect(filterValue("money", "50")).toBe(50);
    expect(sheetCells([["slug", "price", "tags"], ["a", "1250.5", "new, sale"]], [{ id: "price", type: "money" }, tags])).toEqual([["slug", "price", "tags"], ["a", 1250.5, "new, sale"]]);
  });

  test("a cell as words", () => {
    const r = row({ title: { en: "Spring", ar: "الربيع" }, price: 1250.5, active: true, kind: "new", day: "2026-03-01", cover: "https://x.test/a.jpg" });
    expect(cellText(col("$slug"), r, "ar")).toBe("spring");
    expect(cellText(col("title"), r, "ar")).toBe("الربيع");
    expect(cellText(col("title"), r, "he")).toBe("الربيع");
    expect(cellText(col("price"), r, "ar")).toBe("1,250.5");
    expect(cellText(col("active"), r, "ar")).toBe("✓");
    expect(cellText(col("kind"), r, "ar")).toBe("جديد");
    expect(cellText(col("kind"), row({ kind: "gone" }), "ar")).toBe("gone");
    expect(cellText(col("day"), r, "ar")).toBe("2026-03-01");
    expect(cellText(col("body"), r, "ar")).toBe("");
    expect(cellText(col("$status"), r, "ar")).toContain("منشور");
    expect(cellText(col("$updatedAt"), r, "en")).toBe("13 Nov 2026");
  });

  test("what a written cell sends: words keep their other languages; empty empties", () => {
    const r = row({ title: { en: "Spring", ar: "الربيع" }, price: 5 });
    expect(cellPatch(col("title"), r, "ar", "ربيع جديد")).toEqual({ values: { title: { en: "Spring", ar: "ربيع جديد" } } });
    expect(cellPatch(col("title"), r, "ar", "  ")).toEqual({ values: { title: { en: "Spring" } } });
    expect(cellPatch(col("body"), r, "ar", "")).toEqual({ values: { body: null } });
    expect(cellPatch(col("price"), r, "ar", " 12.5 ")).toEqual({ values: { price: 12.5 } });
    // What isn't a number goes as written, for the server to say (or to read, like "1,250").
    expect(cellPatch(col("price"), r, "ar", "1,250")).toEqual({ values: { price: "1,250" } });
    expect(cellPatch(col("price"), r, "ar", "")).toEqual({ values: { price: null } });
    expect(cellPatch(col("active"), r, "ar", "true")).toEqual({ values: { active: true } });
    expect(cellPatch(col("active"), r, "ar", "")).toEqual({ values: { active: null } });
    expect(cellPatch(col("$slug"), r, "ar", " new-name ")).toEqual({ slug: "new-name" });
    expect(cellPatch(col("$status"), r, "ar", "DRAFT")).toEqual({ status: "DRAFT" });
    expect(withWords(undefined, "he", "שלום")).toEqual({ he: "שלום" });
    expect(withWords({ ar: "x" }, "ar", "")).toBeNull();
  });
});

describe("The question", () => {
  test("what each question needs, and its words by the kind of column", () => {
    expect(opNeeds("empty")).toBe("none");
    expect(opNeeds("isTrue")).toBe("none");
    expect(opNeeds("contains")).toBe("one");
    expect(opNeeds("between")).toBe("two");
    expect(opNeeds("anyOf")).toBe("list");
    expect(opName("gt", "number")).toBe("أكبر من|more than|גדול מ");
    expect(opName("gt", "date")).toBe("بعد|after|אחרי");
    expect(opName("lte", "$date")).toBe("لحد|up to|עד");
    expect(opName("contains", "text")).toContain("contains");
  });

  test("half-written filters aren't sent; numbers go as numbers", () => {
    expect(filterReady({ field: "title", op: "empty" })).toBe(true);
    expect(filterReady({ field: "title", op: "contains" })).toBe(false);
    expect(filterReady({ field: "title", op: "contains", value: "  " })).toBe(false);
    expect(filterReady({ field: "price", op: "gt", value: 0 })).toBe(true);
    expect(filterReady({ field: "price", op: "gt", value: Number("x") })).toBe(false);
    expect(filterReady({ field: "price", op: "between", value: 1 })).toBe(false);
    expect(filterReady({ field: "price", op: "between", value: 1, value2: 9 })).toBe(true);
    expect(filterReady({ field: "kind", op: "anyOf", value: [] })).toBe(false);
    expect(filterReady({ field: "kind", op: "anyOf", value: ["new"] })).toBe(true);
    expect(filterValue("number", "12.5")).toBe(12.5);
    expect(filterValue("number", "")).toBe("");
    expect(filterValue("text", "12")).toBe("12");
    expect(newFilter("price", "number", ops)).toEqual({ field: "price", op: "is" });
    expect(queryOut({ view: "draft", search: "  ", filters: [{ field: "title", op: "contains" }, { field: "price", op: "gt", value: 5 }], match: "any", sort: [] })).toEqual({ page: 1, pageSize: 50, view: "draft", lang: "ar", filters: [{ field: "price", op: "gt", value: 5 }], match: "any" });
    expect(queryOut({ search: " hat ", page: 3, pageSize: 25, lang: "en", sort: [{ field: "price", dir: "desc" }] })).toEqual({ page: 3, pageSize: 25, view: "all", lang: "en", search: "hat", sort: [{ field: "price", dir: "desc" }] });
  });

  test("a column's head: up, down, then the table's own order; and the pages", () => {
    expect(nextSort([], "price")).toEqual([{ field: "price", dir: "asc" }]);
    expect(nextSort([{ field: "price", dir: "asc" }], "price")).toEqual([{ field: "price", dir: "desc" }]);
    expect(nextSort([{ field: "price", dir: "desc" }], "price")).toEqual([]);
    expect(nextSort([{ field: "price", dir: "desc" }], "title")).toEqual([{ field: "title", dir: "asc" }]);
    expect(pageInfo(2340, 2, 50)).toEqual({ pages: 47, from: 51, to: 100 });
    expect(pageInfo(0, 1, 50)).toEqual({ pages: 1, from: 0, to: 0 });
    expect(pageInfo(120, 3, 50)).toEqual({ pages: 3, from: 101, to: 120 });
    expect(issueWords("A number")).toContain("لازم رقم");
    expect(issueWords("something new")).toBe("something new");
  });
});

describe("A CSV file", () => {
  test("quotes, quotes inside, line breaks inside, the mark at the start, empty lines", () => {
    expect(parseCsv('﻿slug,title\r\nspring,"Spring, again"\r\n\r\nhat,"say ""hi"""\nlong,"two\nlines"\n')).toEqual([
      ["slug", "title"],
      ["spring", "Spring, again"],
      ["hat", 'say "hi"'],
      ["long", "two\nlines"],
    ]);
    expect(parseCsv("a , b \n 1 ,\" 2 \"")).toEqual([["a", "b"], ["1", " 2 "]]);
    expect(parseCsv("a,b\n1")).toEqual([["a", "b"], ["1"]]);
    expect(parseCsv("")).toEqual([]);
  });

  test("the separator is found by itself", () => {
    expect(separatorOf("a;b;c\n1;2;3")).toBe(";");
    expect(separatorOf("a\tb\tc\n")).toBe("\t");
    expect(separatorOf('"a;b",c,d\n')).toBe(",");
    expect(parseCsv("slug;price\nhat;12,5")).toEqual([["slug", "price"], ["hat", "12,5"]]);
  });

  test("its headings find the table's columns: the export's own names, ids, or names in any language", () => {
    expect(targetsOf(fields)).toEqual(["slug", "status", "title.ar", "title.en", "title.he", "body.ar", "body.en", "body.he", "price", "day", "active", "kind", "cover"]);
    const guess = (h: string) => guessTarget(h, fields, "ar");
    expect(guess("slug")).toBe("slug");
    expect(guess("Status")).toBe("status");
    expect(guess("title.en")).toBe("title.en");
    expect(guess("Title")).toBe("title.en");
    expect(guess("العنوان")).toBe("title.ar");
    expect(guess("title")).toBe("title.en");
    expect(guess("body")).toBe("body.ar");
    expect(guess(" السعر ")).toBe("price");
    expect(guess("PRICE")).toBe("price");
    expect(guess("Kind")).toBe("kind");
    expect(guess("something else")).toBe("");
    expect(guess("")).toBe("");
    expect(targetName("title.he", fields, "ar")).toBe("العنوان (עברית)");
    expect(targetName("price", fields, "en")).toBe("Price");
    expect(doubledTargets(["slug", "price", "", "price", ""])).toEqual(["price"]);
  });

  test("the export's lines as a sheet's cells: numbers and yes/no by their field; the formula guard comes off", () => {
    expect(sheetCells([["slug", "status", "title.ar", "price", "active", "kind"], ["spring", "PUBLISHED", "'=SUM(A1)", "1250.5", "true", "new"], ["hat", "DRAFT", "", "", "false", ""], ["odd", "DRAFT", "'quoted", "cheap", "maybe"]], fields)).toEqual([
      ["slug", "status", "title.ar", "price", "active", "kind"],
      ["spring", "PUBLISHED", "=SUM(A1)", 1250.5, true, "new"],
      ["hat", "DRAFT", null, null, false, null],
      ["odd", "DRAFT", "'quoted", "cheap", "maybe", null],
    ]);
    expect(sheetCells([], fields)).toEqual([]);
  });

  test("lines become rows to send: empty cells and unmatched columns are left out", () => {
    expect(rowsFromCsv([["spring", "published", "Spring", "", "12", "x"], ["", "", "Hat", "قبعة", "", "y"]], ["slug", "status", "title.en", "title.ar", "price", ""])).toEqual([
      { slug: "spring", status: "published", values: { "title.en": "Spring", price: "12" } },
      { values: { "title.en": "Hat", "title.ar": "قبعة" } },
    ]);
  });
});
