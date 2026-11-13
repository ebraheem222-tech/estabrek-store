import { describe, expect, test } from "vitest";
import type { Field } from "../lib/collectionTree.js";
import { CollectionBody, checkItemData } from "../lib/collections.js";
import { csvLine, exportColumns } from "../lib/dataRows.js";
import { isRelation, namedRows, relationsOf, splitLinks } from "../lib/links.js";
import { planChange, rowEffect, shownRow } from "../lib/schemaChange.js";

// Relations (B3) without a database: what a relation field is, how the rows it is asked to link
// are named, and that links are never among a row's values.

const f = (id: string, type: Field["type"], over: Partial<Field> = {}): Field => ({ id, type, ...over });
const author = f("author", "relation", { to: "tbl-authors" });
const tags = f("tags", "relation", { to: "tbl-tags", many: true });
const fields = [f("title", "text"), author, tags];
const table = (list: unknown[]) => CollectionBody.safeParse({ slug: "books", name: { en: "Books" }, fields: list });
const why = (list: unknown[]) => { const r = table(list); return r.success ? null : r.error.issues[0]?.message; };

describe("A relation field", () => {
  test("needs its table; its rules are its own; nothing else links a table", () => {
    expect(table([author, tags, f("owner", "relation", { to: "x", exclusive: true, onDelete: "restrict", required: true })]).success).toBe(true);
    expect(why([f("author", "relation")])).toBe("A relation needs the table it links");
    expect(why([f("title", "text", { to: "x" })])).toBe("Only a relation links a table");
    expect(why([f("title", "text", { onDelete: "cascade" })])).toBe("Only a relation links a table");
    expect(why([{ ...author, onDelete: "explode" }])).toBeTruthy();
    expect(why([{ ...author, unique: true }])).toBe("This kind of field can't ask for the only value");
    expect(why([{ ...author, default: "a1" }])).toBe("This kind of field has no default");
    expect(why([{ ...author, options: [{ id: "a" }] }])).toBe("A relation has no choices of its own");
    expect(isRelation(author)).toBe(true);
    expect(isRelation(f("author", "relation"))).toBe(false);
    expect(isRelation(f("title", "text"))).toBe(false);
    expect(relationsOf(fields).map((x) => x.id)).toEqual(["author", "tags"]);
  });

  test("is never one of the row's values", () => {
    // Whatever is sent under its id is dropped by the values' check; "required" is asked of the links.
    expect(checkItemData([f("title", "text"), { ...author, required: true }], { title: { en: "B" }, author: ["a1"] })).toEqual({ ok: true, data: { title: { en: "B" } } });
    // A value left under its id from an earlier kind doesn't show.
    expect(shownRow({ id: "r", data: { title: { en: "B" }, author: "old words" } }, fields).data).toEqual({ title: { en: "B" } });
  });
});

describe("The rows a relation is asked to link", () => {
  test("named by address or id: words with separators, a list, a list of rows", () => {
    expect(namedRows("a1, a2")).toEqual(["a1", "a2"]);
    expect(namedRows(" a1 ; a2 | a3 ، a4\na5 ")).toEqual(["a1", "a2", "a3", "a4", "a5"]);
    expect(namedRows(["a1", " a2 ", "a1", ""])).toEqual(["a1", "a2"]);
    expect(namedRows([{ id: "x1", slug: "a1" }, "a2"])).toEqual(["x1", "a2"]);
    expect(namedRows("a1")).toEqual(["a1"]);
    for (const nothing of [null, undefined, "", [], " , "]) expect(namedRows(nothing)).toEqual([]);
    for (const wrong of [5, true, [5], [{ slug: "a1" }], "x".repeat(101)]) expect(namedRows(wrong)).toBeNull();
  });

  test("taken out of the values: a form's empty cell unlinks, a file's says nothing", () => {
    const values = { title: "B", author: "a1", tags: "", other: 1 };
    const form = splitLinks(fields, values, true);
    expect(form.rest).toEqual({ title: "B", other: 1 });
    expect([...form.asked]).toEqual([["author", ["a1"]], ["tags", []]]);
    const file = splitLinks(fields, values, false);
    expect([...file.asked]).toEqual([["author", ["a1"]]]);
    expect(file.rest).toEqual({ title: "B", other: 1 });
    // Not given: not asked.
    expect(splitLinks(fields, { title: "B" }, true).asked.size).toBe(0);
    expect(splitLinks(fields, null, true)).toEqual({ rest: {}, asked: new Map(), issues: [] });
    expect(splitLinks(fields, { author: 5 }, true).issues).toEqual([{ field: "author", message: "Rows by their id or address" }]);
    expect(splitLinks(fields, { tags: Array.from({ length: 201 }, (_, i) => `t${i}`) }, true).issues).toEqual([{ field: "tags", message: "Too many linked rows" }]);
  });

  test("a file's cell: the linked rows' addresses", () => {
    expect(exportColumns(fields)).toEqual(["slug", "status", "title.ar", "title.en", "title.he", "author", "tags"]);
    const row = { slug: "b1", status: "DRAFT" as const, data: { title: { en: "B" }, author: [{ id: "x1", slug: "a1" }], tags: [{ id: "y1", slug: "t1" }, { id: "y2", slug: "t2" }] } };
    expect(csvLine(fields, row)).toBe('b1,DRAFT,,B,,a1,"t1, t2"');
    expect(csvLine(fields, { ...row, data: { title: { en: "B" } } })).toBe("b1,DRAFT,,B,,,");
  });
});

describe("A change of fields and relations", () => {
  test("its table and how many it links are rules; what deleting does isn't", () => {
    expect(planChange([author], [{ ...author, to: "tbl-other" }]).map((p) => p.change)).toEqual(["ruled"]);
    expect(planChange([tags], [{ ...tags, many: false }]).map((p) => p.change)).toEqual(["ruled"]);
    expect(planChange([author], [{ ...author, exclusive: true }]).map((p) => p.change)).toEqual(["ruled"]);
    expect(planChange([author], [{ ...author, onDelete: "restrict", name: { en: "Writer" } }])).toEqual([]);
    expect(planChange([f("note", "text")], [f("note", "relation", { to: "t" })]).map((p) => p.change)).toEqual(["retyped"]);
  });

  test("written values under a field that becomes a relation are put aside, and come back", () => {
    const toLinks = { id: "note", change: "retyped" as const, from: f("note", "text"), to: f("note", "relation", { to: "t" }) };
    expect(rowEffect(toLinks, { note: { en: "words" } }, "en")).toEqual({ has: true, outcome: "lost", patch: { note$was: { en: "words" } }, remove: ["note"], why: "Links to rows, not a written value", shown: { en: "words" } });
    expect(rowEffect(toLinks, {}, "en")).toEqual({ has: false, outcome: "none" });
    const toWords = { id: "note", change: "retyped" as const, from: toLinks.to, to: toLinks.from };
    expect(rowEffect(toWords, { note$was: { en: "words" } }, "en")).toEqual({ has: true, outcome: "converted", patch: { note: { en: "words" } }, remove: ["note$was"] });
    // The links themselves aren't in the row: nothing for it to do.
    expect(rowEffect(toWords, {}, "en")).toEqual({ has: false, outcome: "none" });
    expect(rowEffect({ id: "tags", change: "removed", from: tags }, { title: { en: "B" } }, "en")).toEqual({ has: false, outcome: "none" });
  });
});
