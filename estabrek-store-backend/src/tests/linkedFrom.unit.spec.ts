import { describe, expect, test } from "vitest";
import type { Field } from "../lib/collectionTree.js";
import { OPS_BY_KIND, columnKind, filterSql, gridOrder, gridWhere, parseGridQuery } from "../lib/dataQuery.js";
import { FROM, incomingId, type Incoming } from "../lib/links.js";

// The other side of a relation (B3) without a database: a relation that links a table is a column
// of that table's grid, named by the linking table's address and the field; what may be asked of it.

const fields: Field[] = [{ id: "title", type: "text" }, { id: "price", type: "number" }];
const inc = (slug: string, field: string, over: Partial<Incoming> = {}): Incoming => ({ id: incomingId(slug, field), table: `tbl-${slug}`, slug, name: { en: slug }, field, fieldName: null, single: false, ...over });
const incoming = [inc("books", "author"), inc("books", "editors"), inc("authors", "mentor", { single: true })];
const refused = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return `${(e as { code?: string }).code}: ${(e as Error).message}`;
  }
  return "accepted";
};
const text = (sql: { strings: readonly string[] }) => sql.strings.join("?").replace(/\s+/g, " ");

describe("A linked-from column", () => {
  test("is named by the table that links and its field, and is only this table's when a relation really links it", () => {
    expect(FROM).toBe("$from.");
    expect(incomingId("books", "author")).toBe("$from.books.author");
    expect(columnKind(fields, "$from.books.author", incoming)).toBe("$from");
    expect(columnKind(fields, "$from.authors.mentor", incoming)).toBe("$from");
    // No relation by that name links this table: not a column (whatever the name looks like).
    expect(columnKind(fields, "$from.books.title", incoming)).toBeNull();
    expect(columnKind(fields, "$from.books.author")).toBeNull();
    expect(columnKind(fields, "$from.", incoming)).toBeNull();
    // The table's own columns are as they were.
    expect(columnKind(fields, "price", incoming)).toBe("number");
    expect(columnKind(fields, "$status", incoming)).toBe("$status");
  });

  test("can be asked two things: linked from no row, from some", () => {
    expect(OPS_BY_KIND.$from).toEqual(["empty", "notEmpty"]);
    const some = filterSql(fields, { field: "$from.books.author", op: "notEmpty" }, incoming);
    expect(text(some)).toContain('EXISTS (SELECT 1 FROM "CollectionLink" lk JOIN "CollectionItem" ls ON ls."id" = lk."fromId" AND ls."deletedAt" IS NULL');
    expect(text(some)).toContain('lk."toTable" = i."collectionId" AND lk."toId" = i."id"');
    // The linking table and its field reach the database as values, never as words of the question.
    expect(some.values).toEqual(["tbl-books", "author"]);
    const none = filterSql(fields, { field: "$from.books.editors", op: "empty" }, incoming);
    expect(text(none).startsWith("NOT EXISTS")).toBe(true);
    expect(none.values).toEqual(["tbl-books", "editors"]);
    expect(refused(() => filterSql(fields, { field: "$from.books.author", op: "anyOf", value: ["x"] }, incoming))).toBe('BAD_GRID_QUERY: "anyOf" can\'t be asked of "$from.books.author"');
    expect(refused(() => filterSql(fields, { field: "$from.books.nope", op: "empty" }, incoming))).toBe('BAD_GRID_QUERY: No column "$from.books.nope" in this table');
    expect(refused(() => filterSql(fields, { field: "$from.books.author", op: "empty" }))).toBe('BAD_GRID_QUERY: No column "$from.books.author" in this table');
  });

  test("sorts by how many rows link (none last), and joins the other filters", () => {
    const order = gridOrder(fields, { sort: [{ field: "$from.authors.mentor", dir: "desc" }], lang: "en" }, incoming);
    expect(text(order)).toContain('NULLIF((SELECT count(*) FROM "CollectionLink" lk');
    expect(text(order)).toContain("DESC NULLS LAST");
    expect(order.values).toEqual(["tbl-authors", "mentor"]);
    expect(refused(() => gridOrder(fields, { sort: [{ field: "$from.authors.mentor", dir: "asc" }], lang: "en" }))).toContain("No column");
    const where = gridWhere("tbl-authors", fields, { view: "all", filters: [{ field: "price", op: "gt", value: 5 }, { field: "$from.books.author", op: "empty" }], match: "all" }, incoming);
    expect(text(where)).toContain("NOT EXISTS");
    expect(where.values).toContain("tbl-books");
  });

  test("its long name fits in a question; an endless one doesn't", () => {
    const long = `$from.${"t".repeat(60)}.${"f".repeat(40)}`;
    expect(parseGridQuery({ filters: [{ field: long, op: "empty" }], sort: [{ field: long }] }).filters[0].field).toBe(long);
    expect(refused(() => parseGridQuery({ filters: [{ field: `$from.${"t".repeat(200)}`, op: "empty" }] }))).toContain("BAD_GRID_QUERY");
  });
});
