import { describe, expect, test } from "vitest";
import { parseCsv } from "./csv";
import { sheetCells } from "./dataText";
import { SQL_BATCH, sqlColumns, sqlFile, sqlName, sqlText } from "./sql";

// The grid's SQL export: the same lines the CSV has, as a file a database loads.
const fields = [
  { id: "title", type: "text" as const, name: { ar: "العنوان", en: "Title" } },
  { id: "price", type: "money" as const, name: { en: "Price" } },
  { id: "active", type: "boolean" as const, name: { en: "Shown" } },
  { id: "day", type: "date" as const, name: { en: "Day" } },
  { id: "at", type: "datetime" as const, name: { en: "When" } },
  { id: "more", type: "json" as const, name: { en: "More" } },
  { id: "tags", type: "multiSelect" as const, name: { en: "Tags" } },
];
const HEAD = ["slug", "status", "title.ar", "title.en", "title.he", "price", "active", "day", "at", "more", "tags"];

describe("the grid's SQL export", () => {
  test("names: small letters and underscores, never a digit first, never empty", () => {
    expect(sqlName("title.ar")).toBe("title_ar");
    expect(sqlName("createdAt")).toBe("created_at");
    expect(sqlName("lastLogin")).toBe("last_login");
    expect(sqlName("look-requests")).toBe("look_requests");
    expect(sqlName("2024 sales")).toBe("_2024_sales");
    expect(sqlName("$slug")).toBe("slug");
    expect(sqlName("طلبات")).toBe("column");
    expect(sqlName("a".repeat(90)).length).toBe(60);
  });

  test("words: a quote is doubled, a backslash stays, a NUL goes", () => {
    expect(sqlText("it's")).toBe("'it''s'");
    expect(sqlText("a\\b")).toBe("'a\\b'");
    expect(sqlText("x\u0000y")).toBe("'xy'");
    expect(sqlText("'); DROP TABLE x; --")).toBe("'''); DROP TABLE x; --'");
    expect(sqlText("سطر\nتاني")).toBe("'سطر\nتاني'");
  });

  test("each column by its field: numbers, yes/no, a day, a moment, JSON; the rest words", () => {
    const lines = sheetCells([HEAD, ["spring", "PUBLISHED", "فستان", "Dress", "", "1250.5", "true", "2026-11-16", "2026-11-16T09:30:00.000Z", '{"a":1}', "new, sale"]], fields);
    expect(sqlColumns(lines, fields, "en").map((c) => `${c.name} ${c.type}${c.key ? " key" : ""}`)).toEqual([
      "slug TEXT key",
      "status TEXT",
      "title_ar TEXT",
      "title_en TEXT",
      "title_he TEXT",
      "price NUMERIC",
      "active BOOLEAN",
      "day DATE",
      "at TIMESTAMPTZ",
      "more JSON",
      "tags TEXT",
    ]);
    // What each column is, in the reader's language (a words column says which language it holds).
    expect(sqlColumns(lines, fields, "en").map((c) => c.note)).toEqual(["The row's address", "The row's status", "Title (ar)", "Title (en)", "Title (he)", "Price", "Shown", "Day", "When", "More", "Tags"]);
    expect(sqlColumns(lines, fields, "ar")[2].note).toBe("العنوان (ar)");
  });

  test("a value that doesn't fit its column's kind: the column holds words, so the file still loads", () => {
    const lines = sheetCells([HEAD, ["a", "DRAFT", "", "", "", "12", "true", "2026-11-16", "2026-11-16T09:30:00Z", "{}", ""], ["b", "DRAFT", "", "", "", "cheap", "maybe", "soon", "later", "{oops", ""]], fields);
    const types = Object.fromEntries(sqlColumns(lines, fields).map((c) => [c.name, c.type]));
    expect(types).toMatchObject({ price: "TEXT", active: "TEXT", day: "TEXT", at: "TEXT", more: "TEXT" });
    const file = sqlFile({ table: "odd", lines, fields });
    expect(file).toContain("('a', 'DRAFT', NULL, NULL, NULL, '12', 'true', '2026-11-16', '2026-11-16T09:30:00Z', '{}', NULL),");
    expect(file).toContain("('b', 'DRAFT', NULL, NULL, NULL, 'cheap', 'maybe', 'soon', 'later', '{oops', NULL);");
  });

  test("the whole file: a header, one transaction, the table, the rows", () => {
    const csv = String.fromCharCode(0xfeff) + "slug,status,title.ar,title.en,title.he,price,active,day,at,more,tags\r\nspring,PUBLISHED,فستان,\"It's a \"\"dress\"\"\",,1250.5,true,2026-11-16,2026-11-16T09:30:00.000Z,\"{\"\"a\"\":1}\",\"new, sale\"\r\nhat,DRAFT,'=SUM(A1),,,,false,,,,\r\n";
    const file = sqlFile({ table: "my-products", title: "منتجاتي\nوأكتر", lines: sheetCells(parseCsv(csv, ","), fields), fields, lang: "en", at: new Date("2026-11-16T12:00:00Z") });
    expect(file).toBe(
      [
        // First, before any Arabic: the file is UTF-8 (psql in a Windows console would read it as the console's own).
        "SET client_encoding = 'UTF8';",
        "-- my_products: منتجاتي وأكتر",
        "-- 2 rows, exported 2026-11-16T12:00:00.000Z",
        "-- For PostgreSQL: load it into a database with  psql -f my_products.sql  or run it in a query window.",
        "-- The first line says the file is UTF-8 (Arabic and Hebrew stay right). For SQLite or another database, delete that line.",
        '-- To load it again over an older copy, first run:  DROP TABLE IF EXISTS "my_products";',
        "",
        "BEGIN;",
        "",
        'CREATE TABLE "my_products" (',
        "  \"slug\" TEXT PRIMARY KEY, -- The row's address",
        "  \"status\" TEXT, -- The row's status",
        '  "title_ar" TEXT, -- Title (ar)',
        '  "title_en" TEXT, -- Title (en)',
        '  "title_he" TEXT, -- Title (he)',
        '  "price" NUMERIC, -- Price',
        '  "active" BOOLEAN, -- Shown',
        '  "day" DATE, -- Day',
        '  "at" TIMESTAMPTZ, -- When',
        '  "more" JSON, -- More',
        '  "tags" TEXT -- Tags',
        ");",
        "",
        'INSERT INTO "my_products" ("slug", "status", "title_ar", "title_en", "title_he", "price", "active", "day", "at", "more", "tags") VALUES',
        "  ('spring', 'PUBLISHED', 'فستان', 'It''s a \"dress\"', NULL, 1250.5, TRUE, '2026-11-16', '2026-11-16T09:30:00.000Z', '{\"a\":1}', 'new, sale'),",
        // The quote that guarded a formula in the CSV is off: a database's words are never worked out.
        "  ('hat', 'DRAFT', '=SUM(A1)', NULL, NULL, NULL, FALSE, NULL, NULL, NULL, NULL);",
        "",
        "COMMIT;",
        "",
      ].join("\n"),
    );
  });

  test("one of the store's tables: its id is the key, when it was made is a moment", () => {
    const store = [
      { id: "customer", type: "text" as const, name: { ar: "الزبون" } },
      { id: "total", type: "number" as const, name: { ar: "المجموع" } },
      { id: "state", type: "select" as const, name: { ar: "الحالة" } },
    ];
    const file = sqlFile({ table: "orders", lines: sheetCells([["id", "customer", "total", "state", "createdAt"], ["or1", "'+972501234567", "120", "NEW", "2026-11-16T09:30:00.000Z"]], store), fields: store });
    expect(file).toContain('"id" TEXT PRIMARY KEY, -- رقم السطر');
    expect(file).toContain('"customer" TEXT, -- الزبون');
    expect(file).toContain('"total" NUMERIC, -- المجموع');
    expect(file).toContain('"created_at" TIMESTAMPTZ -- وقت الإضافة');
    // A number written with a plus is words, as it was typed.
    expect(file).toContain("('or1', '+972501234567', 120, 'NEW', '2026-11-16T09:30:00.000Z');");
  });

  test("a name said twice is said once; no key where two rows share the first column, or one has none", () => {
    // A field the owner called "status" (or "slug") never takes the place of the row's own.
    const own = [{ id: "status", type: "number" as const, name: { en: "Stock state" } }, { id: "slug", type: "boolean" as const, name: { en: "Has an address" } }];
    const lines = sheetCells([["slug", "status", "status", "slug"], ["a", "DRAFT", "7", "true"], ["a", "DRAFT", "8", "false"]], own);
    expect(sqlColumns(lines, own, "en").map((c) => `${c.name} ${c.type}${c.key ? " key" : ""} (${c.note})`)).toEqual(["slug TEXT (The row's address)", "status TEXT (The row's status)", "status_2 NUMERIC (Stock state)", "slug_2 BOOLEAN (Has an address)"]);
    expect(sqlColumns([["slug", "createdAt", "created_at"], ["a", null, null]], []).map((c) => c.name)).toEqual(["slug", "created_at", "created_at_2"]);
    expect(sqlColumns([["slug"], ["a"], [null]], [])[0].key).toBe(false);
    expect(sqlColumns([["title"], ["a"]], [])[0].key).toBe(false);
  });

  test("many rows go a hundred to an INSERT; no rows, only the table; nothing at all, only the header", () => {
    const lines = [["slug"], ...Array.from({ length: SQL_BATCH * 2 + 1 }, (_, i) => [`row-${i}`])];
    const file = sqlFile({ table: "many", lines, fields: [] });
    expect(file.match(/INSERT INTO/g)?.length).toBe(3);
    expect(file.match(/\);\n/g)?.length).toBe(4);
    expect(file.trimEnd().endsWith("COMMIT;")).toBe(true);
    const empty = sqlFile({ table: "none", lines: [["slug", "status"]], fields: [] });
    expect(empty).toContain('CREATE TABLE "none" (');
    expect(empty).not.toContain("INSERT");
    expect(sqlFile({ table: "none", lines: [], fields: [] })).not.toContain("CREATE TABLE");
    // Whatever the table's name and words, the first line is plain letters only.
    expect(sqlFile({ table: "طلبات", title: "طلبات", lines, fields: [] }).split("\n")[0]).toBe("SET client_encoding = 'UTF8';");
  });
});
