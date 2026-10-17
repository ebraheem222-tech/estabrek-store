import { describe, test, expect, beforeEach } from "vitest";
import { parseQueryShape, suggestIndex, worthAdvice } from "../lib/queryShape.js";
import { monitorSnapshot, noteDbQuery, queriesForAdvice, queryKey, resetMonitor } from "../lib/observability.js";

// Missing-index suggestions (مراقبة السرعة والأولوية → أبطأ الاستعلامات): reading
// the queries Prisma sends, and when an index would help. No database.

const COLS = Array.from({ length: 12 }, (_, i) => `"public"."Product"."col${i}"`).join(", ");
const LIST = `SELECT ${COLS} FROM "public"."Product" WHERE ("public"."Product"."isActive" = $1 AND "public"."Product"."categoryId" IN ($2,$3)) ORDER BY "public"."Product"."createdAt" DESC LIMIT $4 OFFSET $5`;
const COUNT = `SELECT COUNT(*) AS "_count._all" FROM (SELECT "public"."Product"."id" FROM "public"."Product" WHERE "public"."Product"."isActive" = $1 OFFSET $2) AS "sub"`;
const RELATION = `SELECT "public"."ProductVariant"."id" FROM "public"."ProductVariant" WHERE ("public"."ProductVariant"."stock" > $1 AND ("public"."ProductVariant"."itemId") IN (SELECT "t1"."id" FROM "public"."ProductItem" AS "t1" WHERE ("t1"."isActive" = $2 AND "t1"."id" IS NOT NULL))) OFFSET $3`;
const QUEUE = `SELECT "public"."OutboxMessage"."id" FROM "public"."OutboxMessage" WHERE "public"."OutboxMessage"."status" = CAST($1::text AS "public"."OutboxStatus") ORDER BY "public"."OutboxMessage"."createdAt" ASC LIMIT $2 OFFSET $3`;

beforeEach(() => resetMonitor());

describe("Reading a query", () => {
  test("a list: the table, its filters and its sort", () => {
    expect(parseQueryShape(LIST)).toEqual({ table: "Product", eq: ["isActive", "categoryId"], range: [], order: ["createdAt"], limit: true });
  });

  test("a count reads the query inside it", () => {
    expect(parseQueryShape(COUNT)).toEqual({ table: "Product", eq: ["isActive"], range: [], order: [], limit: true });
  });

  test("a relation filter: the column on this table; the other table's conditions don't count", () => {
    expect(parseQueryShape(RELATION)).toEqual({ table: "ProductVariant", eq: ["itemId"], range: ["stock"], order: [], limit: true });
  });

  test("searches inside text and 'not' conditions can't use a plain index", () => {
    const s = parseQueryShape(`SELECT "public"."Product"."id" FROM "public"."Product" WHERE ("public"."Product"."title" ILIKE $1 AND "public"."Product"."status" <> $2)`);
    expect(s).toEqual({ table: "Product", eq: [], range: [], order: [], limit: false });
  });

  test("writes are not read", () => {
    expect(parseQueryShape(`UPDATE "public"."Product" SET "title" = $1 WHERE "public"."Product"."id" = $2`)).toBeNull();
    expect(parseQueryShape(`INSERT INTO "public"."Product" ("id") VALUES ($1)`)).toBeNull();
  });

  test("the monitor's entry: long column lists and 'public.' go, the shape stays", () => {
    expect(queryKey(LIST)).toBe('SELECT … FROM "Product" WHERE ("Product"."isActive" = $1 AND "Product"."categoryId" IN (…)) ORDER BY "Product"."createdAt" DESC LIMIT $4 OFFSET $5');
    noteDbQuery(LIST, 40);
    noteDbQuery(LIST.replace("IN ($2,$3)", "IN ($2)"), 60);
    expect(monitorSnapshot().queries).toHaveLength(1);
    const [q] = queriesForAdvice();
    expect(q).toMatchObject({ count: 2, avgMs: 50, shape: { table: "Product", eq: ["isActive", "categoryId"] } });
  });
});

describe("When an index would help", () => {
  const big = 50_000;

  test("no index starts on any filter column: suggested", () => {
    const s = suggestIndex(parseQueryShape(QUEUE)!, [["id"]], big);
    expect(s).toEqual({
      table: "OutboxMessage",
      columns: ["status", "createdAt"],
      why: "filter",
      prisma: "@@index([status, createdAt])",
      sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS "OutboxMessage_status_createdAt_idx" ON "OutboxMessage" ("status", "createdAt");',
    });
  });

  test("an index already starts on a filter column: nothing", () => {
    expect(suggestIndex(parseQueryShape(LIST)!, [["id"], ["slug"], ["categoryId", "createdAt"]], big)).toBeNull();
  });

  test("a range filter goes after the exact ones", () => {
    expect(suggestIndex(parseQueryShape(RELATION)!, [["id"]], big)?.columns).toEqual(["itemId", "stock"]);
  });

  test("only a sort with a limit: an index on the sort", () => {
    const s = suggestIndex({ table: "Order", eq: [], range: [], order: ["createdAt"], limit: true }, [["id"]], big);
    expect(s).toMatchObject({ columns: ["createdAt"], why: "order" });
    expect(suggestIndex({ table: "Order", eq: [], range: [], order: ["createdAt"], limit: true }, [["createdAt"]], big)).toBeNull();
  });

  test("small tables and queries without a filter need nothing; an unknown size still gets one", () => {
    expect(suggestIndex(parseQueryShape(QUEUE)!, [["id"]], 200)).toBeNull();
    expect(suggestIndex({ table: "X", eq: [], range: [], order: [], limit: true }, [], big)).toBeNull();
    expect(suggestIndex(parseQueryShape(QUEUE)!, [["id"]], null)).not.toBeNull();
  });

  test("worth a look: slow or a big share of the time, and not a one-off", () => {
    expect(worthAdvice({ count: 50, avgMs: 35, totalMs: 1750 }, 100_000)).toBe(true);
    expect(worthAdvice({ count: 500, avgMs: 4, totalMs: 2000 }, 10_000)).toBe(true); // 20% of all database time
    expect(worthAdvice({ count: 500, avgMs: 4, totalMs: 2000 }, 100_000)).toBe(false);
    expect(worthAdvice({ count: 3, avgMs: 900, totalMs: 2700 }, 10_000)).toBe(false);
  });
});
