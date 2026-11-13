import { describe, expect, test } from "vitest";
import type { Field } from "../lib/collectionTree.js";
import { OPS_BY_KIND, columnKind, filterSql, gridOrder, gridWhere, parseGridQuery } from "../lib/dataQuery.js";
import { coerceValue, csvCell, csvLine, exportColumns, freeSlug, looseData, patchData, rowData, slugFrom } from "../lib/dataRows.js";

// The data grid (admin → الجداول) without a database: the question's shape, what may be asked of
// each kind of column, values turned for their fields, addresses, and CSV lines.

const n = (en: string) => ({ en });
const fields: Field[] = [
  { id: "title", type: "text", name: n("Title"), required: true },
  { id: "body", type: "longText" },
  { id: "price", type: "number" },
  { id: "day", type: "date" },
  { id: "active", type: "boolean" },
  { id: "kind", type: "select", options: [{ id: "new", name: { en: "New", ar: "جديد" } }, { id: "sale", name: { en: "On sale" } }] },
  { id: "cover", type: "image" },
  { id: "link", type: "link" },
  { id: "tint", type: "color" },
];
const code = (e: unknown) => (e as { code?: string }).code;
const refused = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return `${code(e)}: ${(e as Error).message}`;
  }
  return "accepted";
};

describe("The grid's question", () => {
  test("defaults, and JSON from the address bar", () => {
    expect(parseGridQuery(undefined)).toEqual({ page: 1, pageSize: 50, lang: "ar", view: "all", sort: [], filters: [], match: "all" });
    expect(parseGridQuery("")).toMatchObject({ page: 1, view: "all" });
    expect(parseGridQuery('{"page":3,"pageSize":25,"view":"trash","search":"  spring ","sort":[{"field":"price","dir":"desc"}]}')).toMatchObject({ page: 3, pageSize: 25, view: "trash", search: "spring", sort: [{ field: "price", dir: "desc" }] });
  });

  test("nonsense is refused, with what was wrong", () => {
    expect(refused(() => parseGridQuery("{nope"))).toBe("BAD_GRID_QUERY: The question isn't valid JSON");
    expect(refused(() => parseGridQuery({ pageSize: 5000 }))).toContain("BAD_GRID_QUERY");
    expect(refused(() => parseGridQuery({ view: "everything" }))).toContain("BAD_GRID_QUERY");
    expect(refused(() => parseGridQuery({ drop: "table" }))).toContain("BAD_GRID_QUERY");
    expect(refused(() => parseGridQuery({ filters: Array.from({ length: 13 }, () => ({ field: "title", op: "empty" })) }))).toContain("BAD_GRID_QUERY");
    expect(refused(() => parseGridQuery("x".repeat(9000)))).toBe("BAD_GRID_QUERY: The question is too long");
  });

  test("a column's kind decides what may be asked of it", () => {
    expect(columnKind(fields, "price")).toBe("number");
    expect(columnKind(fields, "$createdAt")).toBe("$date");
    expect(columnKind(fields, "$status")).toBe("$status");
    expect(columnKind(fields, "nope")).toBeNull();
    expect(columnKind(fields, "data")).toBeNull();
    for (const [kind, ops] of Object.entries(OPS_BY_KIND)) expect(ops.length, kind).toBeGreaterThan(0);
    expect(refused(() => filterSql(fields, { field: "nope", op: "is", value: 1 }))).toBe('BAD_GRID_QUERY: No column "nope" in this table');
    expect(refused(() => filterSql(fields, { field: "price", op: "contains", value: "1" }))).toBe('BAD_GRID_QUERY: "contains" can\'t be asked of "price"');
    expect(refused(() => filterSql(fields, { field: "active", op: "is", value: true }))).toContain("can't be asked");
    expect(refused(() => filterSql(fields, { field: "price", op: "gt", value: "many" }))).toBe("BAD_GRID_QUERY: price: a number is needed");
    expect(refused(() => filterSql(fields, { field: "price", op: "between", value: 1 }))).toContain("a number is needed");
    expect(refused(() => filterSql(fields, { field: "day", op: "gte", value: "13/11/2026" }))).toContain("a date like 2026-11-13");
    expect(refused(() => filterSql(fields, { field: "title", op: "contains", value: "" }))).toContain("words are needed");
    expect(refused(() => filterSql(fields, { field: "kind", op: "anyOf", value: "new" }))).toContain("a list of choices");
    expect(refused(() => filterSql(fields, { field: "$status", op: "is", value: "gone" }))).toContain("DRAFT, PUBLISHED or ARCHIVED");
    expect(refused(() => gridOrder(fields, { sort: [{ field: "nope", dir: "asc" }], lang: "ar" }))).toContain('No column "nope"');
  });

  test("ids and values only reach the database as parameters; the failing filter is named", () => {
    const evil = `x' OR 1=1; DROP TABLE "CollectionItem"; --`;
    const where = gridWhere("c1", fields, { view: "all", search: evil, match: "all", filters: [{ field: "title", op: "contains", value: evil }, { field: "price", op: "gte", value: 5 }] });
    expect(where.sql).not.toContain("DROP TABLE");
    expect(where.sql).not.toContain("x'");
    expect(where.values).toContain("c1");
    expect(where.values).toContain("title");
    expect(where.values).toContain(`%${evil}%`);
    expect(where.values).toContain(5);
    // % and _ in the words are words, not wildcards.
    expect(filterSql(fields, { field: "title", op: "startsWith", value: "50%_off" }).values).toContain("50\\%\\_off%");
    try {
      gridWhere("c1", fields, { view: "all", match: "all", filters: [{ field: "title", op: "empty" }, { field: "nope", op: "empty" }] });
      throw new Error("accepted");
    } catch (e) {
      expect((e as { details?: unknown }).details).toEqual({ filter: 1 });
    }
    expect(gridWhere("c1", fields, { view: "trash", match: "any", filters: [{ field: "active", op: "isTrue" }, { field: "price", op: "empty" }] }).sql).toMatch(/"deletedAt" IS NOT NULL AND \(.+ OR .+\)$/s);
  });
});

describe("Values in", () => {
  test("a spreadsheet's words become what the field holds", () => {
    const f = (id: string) => fields.find((x) => x.id === id)!;
    expect(coerceValue(f("title"), "  Spring ", "en")).toEqual({ en: "Spring" });
    expect(coerceValue(f("title"), "'=SUM(A1)", "ar")).toEqual({ ar: "=SUM(A1)" });
    expect(coerceValue(f("price"), "1,250.5", "ar")).toBe(1250.5);
    expect(coerceValue(f("price"), "١٢", "ar")).toBe("١٢");
    expect(coerceValue(f("price"), "cheap", "ar")).toBe("cheap");
    expect(coerceValue(f("active"), "Yes", "ar")).toBe(true);
    expect(coerceValue(f("active"), "لا", "ar")).toBe(false);
    expect(coerceValue(f("active"), "maybe", "ar")).toBe("maybe");
    expect(coerceValue(f("day"), "3/11/2026", "ar")).toBe("2026-11-03");
    expect(coerceValue(f("day"), "13.11.2026", "ar")).toBe("2026-11-13");
    expect(coerceValue(f("day"), "2026-11-13", "ar")).toBe("2026-11-13");
    expect(coerceValue(f("kind"), "جديد", "ar")).toBe("new");
    expect(coerceValue(f("kind"), "on SALE", "ar")).toBe("sale");
    expect(coerceValue(f("kind"), "other", "ar")).toBe("other");
    expect(coerceValue(f("title"), "   ", "ar")).toBeUndefined();
    expect(coerceValue(f("price"), null, "ar")).toBeUndefined();
    expect(coerceValue(f("price"), 7, "ar")).toBe(7);
  });

  test("columns by name: a text field's languages come together; unknown columns are named", () => {
    expect(looseData(fields, { "title.en": "Spring", "title.ar": "الربيع", title: "x", price: "12", "price.en": "1", "title.fr": "y", nope: 1, "a.b.c": 2 }, "he")).toEqual({
      data: { title: { en: "Spring", ar: "الربيع", he: "x" }, price: 12 },
      issues: [
        { field: "price.en", message: "No such column" },
        { field: "title.fr", message: "No such column" },
        { field: "nope", message: "No such column" },
        { field: "a.b.c", message: "No such column" },
      ],
    });
    expect(rowData(fields, { title: "Spring", price: "12", active: "yes", day: "1/2/2026", kind: "New" }, "en")).toEqual({ ok: true, data: { title: { en: "Spring" }, price: 12, active: true, day: "2026-02-01", kind: "new" } });
    expect(rowData(fields, { price: "cheap", kind: "other" }, "en")).toEqual({
      ok: false,
      issues: [
        { field: "title", message: "Required" },
        { field: "price", message: "A number" },
        { field: "kind", message: "One of its choices" },
      ],
    });
  });

  test("a cell changes by its own field's rule; the rest of the row stays, even what wouldn't pass today", () => {
    const was = { title: { en: "Spring" }, price: "old words", extra: 1 };
    expect(patchData(fields, was, { price: "15" }, "ar")).toEqual({ ok: true, data: { title: { en: "Spring" }, price: 15, extra: 1 } });
    expect(patchData(fields, was, { price: null, active: true }, "ar")).toEqual({ ok: true, data: { title: { en: "Spring" }, active: true, extra: 1 } });
    expect(patchData(fields, was, { title: "" }, "ar")).toEqual({ ok: false, issues: [{ field: "title", message: "Required" }] });
    expect(patchData(fields, was, { price: "x", nope: 1 }, "ar")).toEqual({ ok: false, issues: [{ field: "price", message: "A number" }, { field: "nope", message: "No such column" }] });
    // A whole text value replaces the old one (the grid sends every language it shows).
    expect(patchData(fields, was, { title: { en: "Summer", ar: "الصيف" } }, "ar")).toMatchObject({ ok: true, data: { title: { en: "Summer", ar: "الصيف" } } });
  });

  test("a row's address from its words, and a free one", () => {
    expect(slugFrom(fields, { title: { en: "Spring Sale 50% off!" } })).toBe("spring-sale-50-off");
    expect(slugFrom(fields, { title: { en: "Crème brûlée" } })).toBe("creme-brulee");
    expect(slugFrom(fields, { title: { ar: "تخفيضات الربيع" } })).toMatch(/^row-[0-9a-f]{8}$/);
    expect(slugFrom(fields, {})).toMatch(/^row-[0-9a-f]{8}$/);
    expect(slugFrom(fields, { title: { en: "x".repeat(200) } }).length).toBeLessThanOrEqual(60);
    expect(freeSlug("spring", new Set())).toBe("spring");
    expect(freeSlug("spring", new Set(["spring", "spring-2"]))).toBe("spring-3");
  });
});

describe("CSV out", () => {
  test("the columns: the address, the status, each field (a text field once per language)", () => {
    expect(exportColumns(fields)).toEqual(["slug", "status", "title.ar", "title.en", "title.he", "body.ar", "body.en", "body.he", "price", "day", "active", "kind", "cover", "link", "tint"]);
  });

  test("cells are quoted when they must be, and words can't start a formula", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('say "hi", twice')).toBe('"say ""hi"", twice"');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell(12.5)).toBe("12.5");
    expect(csvCell(false)).toBe("false");
    expect(csvCell(null)).toBe("");
    expect(csvCell("=SUM(A1)", true)).toBe("'=SUM(A1)");
    expect(csvCell("-5", true)).toBe("'-5");
    expect(csvCell("-5")).toBe("-5");
    const line = csvLine(fields, { slug: "spring", status: "PUBLISHED", data: { title: { en: "Spring, again", ar: "الربيع" }, price: -5, day: "2026-03-01", active: true, kind: "new", link: "/shop", body: { en: "@home" } } });
    expect(line).toBe('spring,PUBLISHED,الربيع,"Spring, again",,,\'@home,,-5,2026-03-01,true,new,,/shop,');
    expect(line.split(",").length).toBeGreaterThanOrEqual(exportColumns(fields).length);
  });
});
