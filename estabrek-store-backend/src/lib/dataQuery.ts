/**
 * The data grid's questions (admin → الجداول): one page of a table's rows, filtered, sorted and
 * searched by the database itself, so a table of tens of thousands of rows opens as fast as a
 * small one. A table is a collection (lib/collections.ts); its rows' values live in one JSONB
 * column, so each filter is built here from the table's own fields: a field's kind decides what
 * may be asked of it and how. Field ids and values only ever reach the database as parameters.
 */
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/httpError.js";
import type { Field, FieldType } from "./collectionTree.js";
import { dayStart, nextDay } from "./storeTime.js";

export const OPS = ["contains", "notContains", "is", "isNot", "startsWith", "endsWith", "empty", "notEmpty", "gt", "gte", "lt", "lte", "between", "anyOf", "isTrue", "isFalse"] as const;
export type Op = (typeof OPS)[number];
/** A row's own columns, beside its fields. */
export const SYSTEM_COLUMNS = ["$slug", "$status", "$createdAt", "$updatedAt", "$publishedAt"] as const;
export type ColumnKind = FieldType | "$slug" | "$status" | "$date";
export const VIEWS = ["all", "draft", "published", "archived", "trash"] as const;
export type View = (typeof VIEWS)[number];
export const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

/** What may be asked of each kind of column (the admin offers exactly these). */
export const OPS_BY_KIND: Record<ColumnKind, readonly Op[]> = {
  text: ["contains", "notContains", "is", "isNot", "startsWith", "endsWith", "empty", "notEmpty"],
  longText: ["contains", "notContains", "empty", "notEmpty"],
  number: ["is", "isNot", "gt", "gte", "lt", "lte", "between", "empty", "notEmpty"],
  date: ["is", "gt", "gte", "lt", "lte", "between", "empty", "notEmpty"],
  boolean: ["isTrue", "isFalse"],
  select: ["is", "isNot", "anyOf", "empty", "notEmpty"],
  image: ["empty", "notEmpty"],
  link: ["contains", "empty", "notEmpty"],
  color: ["is", "empty", "notEmpty"],
  email: ["contains", "is", "isNot", "startsWith", "endsWith", "empty", "notEmpty"],
  phone: ["contains", "is", "empty", "notEmpty"],
  datetime: ["is", "gt", "gte", "lt", "lte", "between", "empty", "notEmpty"],
  money: ["is", "isNot", "gt", "gte", "lt", "lte", "between", "empty", "notEmpty"],
  multiSelect: ["anyOf", "empty", "notEmpty"],
  file: ["contains", "empty", "notEmpty"],
  video: ["empty", "notEmpty"],
  model3d: ["empty", "notEmpty"],
  json: ["empty", "notEmpty"],
  location: ["empty", "notEmpty"],
  $slug: ["contains", "is", "startsWith"],
  $status: ["is", "isNot", "anyOf"],
  $date: ["gt", "gte", "lt", "lte", "between", "empty", "notEmpty"],
};

export const GRID_LIMITS = { pageSize: 200, filters: 12, sorts: 3, search: 100, value: 200, anyOf: 30 } as const;

const FilterSchema = z.object({ field: z.string().min(1).max(40), op: z.enum(OPS), value: z.unknown().optional(), value2: z.unknown().optional() }).strict();
export type GridFilter = z.infer<typeof FilterSchema>;

export const GridQuerySchema = z
  .object({
    page: z.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.number().int().min(1).max(GRID_LIMITS.pageSize).default(50),
    search: z.string().trim().max(GRID_LIMITS.search).optional(),
    /** The language text columns sort by. */
    lang: z.enum(["ar", "en", "he"]).default("ar"),
    view: z.enum(VIEWS).default("all"),
    sort: z.array(z.object({ field: z.string().min(1).max(40), dir: z.enum(["asc", "desc"]).default("asc") }).strict()).max(GRID_LIMITS.sorts).default([]),
    filters: z.array(FilterSchema).max(GRID_LIMITS.filters).default([]),
    /** Every filter, or any of them. */
    match: z.enum(["all", "any"]).default("all"),
  })
  .strict();
export type GridQuery = z.infer<typeof GridQuerySchema>;

const bad = (message: string, details?: unknown) => new AppError(400, "BAD_GRID_QUERY", message, details);

/** The grid's question from `?q=` (JSON) or a body; nonsense is refused with what was wrong. */
export function parseGridQuery(raw: unknown): GridQuery {
  let value: unknown = raw ?? {};
  if (typeof raw === "string") {
    if (raw.length > 8000) throw bad("The question is too long");
    try {
      value = raw.trim() ? JSON.parse(raw) : {};
    } catch {
      throw bad("The question isn't valid JSON");
    }
  }
  const parsed = GridQuerySchema.safeParse(value);
  if (!parsed.success) throw bad(parsed.error.issues[0]?.message ?? "Bad question", { path: parsed.error.issues[0]?.path.map(String).join(".") });
  return parsed.data;
}

export function columnKind(fields: Field[], column: string): ColumnKind | null {
  if (column === "$slug" || column === "$status") return column;
  if (column === "$createdAt" || column === "$updatedAt" || column === "$publishedAt") return "$date";
  return fields.find((f) => f.id === column)?.type ?? null;
}

/* ---------------- Pieces of SQL (the rows' table is always "i") ---------------- */

const SYSTEM_SQL: Record<string, Prisma.Sql> = {
  $slug: Prisma.raw(`i."slug"`),
  $status: Prisma.raw(`i."status"`),
  $createdAt: Prisma.raw(`i."createdAt"`),
  $updatedAt: Prisma.raw(`i."updatedAt"`),
  $publishedAt: Prisma.raw(`i."publishedAt"`),
};
/** A field's value as JSON, and as words. */
const json = (f: string) => Prisma.sql`(i."data"->${f}::text)`;
const words = (f: string) => Prisma.sql`(i."data"->>${f}::text)`;
/** A number field's value as a number (anything else there counts as empty). */
const num = (f: string) => Prisma.sql`(CASE WHEN jsonb_typeof(i."data"->${f}::text) = 'number' THEN (i."data"->>${f}::text)::numeric END)`;
/** Does any language of a text field satisfy `cond`? */
const anyLang = (f: string, cond: Prisma.Sql) =>
  Prisma.sql`EXISTS (SELECT 1 FROM jsonb_each_text(CASE WHEN jsonb_typeof(i."data"->${f}::text) = 'object' THEN i."data"->${f}::text ELSE '{}'::jsonb END) AS w(k, v) WHERE ${cond})`;
const like = (v: string) => v.replace(/[\\%_]/g, "\\$&");

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
function str(v: unknown, what: string): string {
  if (typeof v !== "string" || !v.trim() || v.length > GRID_LIMITS.value) throw bad(`${what}: words are needed (up to ${GRID_LIMITS.value} letters)`);
  return v.trim();
}
function number(v: unknown, what: string): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n)) throw bad(`${what}: a number is needed`);
  return n;
}
function date(v: unknown, what: string): string {
  if (!isDate(v)) throw bad(`${what}: a date like 2026-11-13 is needed`);
  return v;
}
function list(v: unknown, what: string): string[] {
  if (!Array.isArray(v) || !v.length || v.length > GRID_LIMITS.anyOf || v.some((x) => typeof x !== "string" || !x || x.length > 80)) throw bad(`${what}: a list of choices is needed`);
  return v as string[];
}

/** One filter as SQL. Throws when the column isn't the table's or the question doesn't fit its kind. */
export function filterSql(fields: Field[], f: GridFilter): Prisma.Sql {
  const kind = columnKind(fields, f.field);
  if (!kind) throw bad(`No column "${f.field}" in this table`);
  if (!OPS_BY_KIND[kind].includes(f.op)) throw bad(`"${f.op}" can't be asked of "${f.field}"`);
  const what = f.field;
  const id = f.field;

  if (kind === "$slug") {
    const v = like(str(f.value, what).toLowerCase());
    if (f.op === "is") return Prisma.sql`i."slug" = ${str(f.value, what).toLowerCase()}`;
    return Prisma.sql`i."slug" LIKE ${f.op === "contains" ? `%${v}%` : `${v}%`}`;
  }
  if (kind === "$status") {
    const one = (v: unknown) => {
      const s = String(v ?? "").toUpperCase();
      if (!(STATUSES as readonly string[]).includes(s)) throw bad(`${what}: DRAFT, PUBLISHED or ARCHIVED`);
      return s;
    };
    if (f.op === "anyOf") return Prisma.sql`i."status"::text IN (${Prisma.join(list(f.value, what).map(one))})`;
    return f.op === "is" ? Prisma.sql`i."status"::text = ${one(f.value)}` : Prisma.sql`i."status"::text <> ${one(f.value)}`;
  }
  if (kind === "$date") {
    const col = SYSTEM_SQL[f.field];
    if (f.op === "empty") return Prisma.sql`${col} IS NULL`;
    if (f.op === "notEmpty") return Prisma.sql`${col} IS NOT NULL`;
    const a = date(f.value, what);
    // A day is the whole day: "after the 13th" starts on the 14th, "up to the 13th" includes it.
    if (f.op === "gt") return Prisma.sql`${col} >= (${a}::date + 1)`;
    if (f.op === "gte") return Prisma.sql`${col} >= ${a}::date`;
    if (f.op === "lt") return Prisma.sql`${col} < ${a}::date`;
    if (f.op === "lte") return Prisma.sql`${col} < (${a}::date + 1)`;
    return Prisma.sql`(${col} >= ${a}::date AND ${col} < (${date(f.value2, what)}::date + 1))`;
  }

  if (kind === "text" || kind === "longText") {
    if (f.op === "empty") return Prisma.sql`NOT ${anyLang(id, Prisma.sql`btrim(w.v) <> ''`)}`;
    if (f.op === "notEmpty") return anyLang(id, Prisma.sql`btrim(w.v) <> ''`);
    const v = str(f.value, what);
    const p = like(v);
    if (f.op === "contains") return anyLang(id, Prisma.sql`w.v ILIKE ${`%${p}%`}`);
    if (f.op === "notContains") return Prisma.sql`NOT ${anyLang(id, Prisma.sql`w.v ILIKE ${`%${p}%`}`)}`;
    if (f.op === "startsWith") return anyLang(id, Prisma.sql`w.v ILIKE ${`${p}%`}`);
    if (f.op === "endsWith") return anyLang(id, Prisma.sql`w.v ILIKE ${`%${p}`}`);
    const same = anyLang(id, Prisma.sql`lower(btrim(w.v)) = lower(${v})`);
    return f.op === "is" ? same : Prisma.sql`NOT ${same}`;
  }
  if (kind === "number" || kind === "money") {
    const n = num(id);
    if (f.op === "empty") return Prisma.sql`${n} IS NULL`;
    if (f.op === "notEmpty") return Prisma.sql`${n} IS NOT NULL`;
    const a = number(f.value, what);
    if (f.op === "is") return Prisma.sql`${n} = ${a}`;
    if (f.op === "isNot") return Prisma.sql`${n} IS DISTINCT FROM ${a}`;
    if (f.op === "gt") return Prisma.sql`${n} > ${a}`;
    if (f.op === "gte") return Prisma.sql`${n} >= ${a}`;
    if (f.op === "lt") return Prisma.sql`${n} < ${a}`;
    if (f.op === "lte") return Prisma.sql`${n} <= ${a}`;
    return Prisma.sql`${n} BETWEEN ${a} AND ${number(f.value2, what)}`;
  }
  if (kind === "boolean") {
    // Never ticked counts as "no".
    return f.op === "isTrue" ? Prisma.sql`${json(id)} = 'true'::jsonb` : Prisma.sql`${json(id)} IS DISTINCT FROM 'true'::jsonb`;
  }
  // The rest are plain words (or, for JSON and places, a whole value that is there or isn't).
  const w = words(id);
  if (f.op === "empty") return Prisma.sql`COALESCE(${w}, '') = ''`;
  if (f.op === "notEmpty") return Prisma.sql`COALESCE(${w}, '') <> ''`;
  if (kind === "datetime") {
    // Kept as moments (ISO, UTC: they compare as words); a day asked about is the store's day.
    const from = (day: string) => dayStart(day).toISOString();
    const a = date(f.value, what);
    if (f.op === "is") return Prisma.sql`(${w} >= ${from(a)} AND ${w} < ${from(nextDay(a))})`;
    if (f.op === "gt") return Prisma.sql`${w} >= ${from(nextDay(a))}`;
    if (f.op === "gte") return Prisma.sql`${w} >= ${from(a)}`;
    if (f.op === "lt") return Prisma.sql`${w} < ${from(a)}`;
    if (f.op === "lte") return Prisma.sql`${w} < ${from(nextDay(a))}`;
    return Prisma.sql`(${w} >= ${from(a)} AND ${w} < ${from(nextDay(date(f.value2, what)))})`;
  }
  if (kind === "multiSelect") {
    // Any of the asked choices among the row's own.
    return Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(${json(id)}) = 'array' THEN ${json(id)} ELSE '[]'::jsonb END) AS c(v) WHERE c.v IN (${Prisma.join(list(f.value, what))}))`;
  }
  if (kind === "phone") {
    // A number is the same number however it's spaced.
    const digits = str(f.value, what).replace(/[^\d+]/g, "");
    if (!digits) throw bad(`${what}: digits are needed`);
    const bare = Prisma.sql`regexp_replace(COALESCE(${w}, ''), '[^0-9+]', '', 'g')`;
    return f.op === "is" ? Prisma.sql`${bare} = ${digits}` : Prisma.sql`${bare} LIKE ${`%${like(digits)}%`}`;
  }
  if (kind === "date") {
    const a = date(f.value, what);
    if (f.op === "is") return Prisma.sql`${w} = ${a}`;
    if (f.op === "gt") return Prisma.sql`${w} > ${a}`;
    if (f.op === "gte") return Prisma.sql`${w} >= ${a}`;
    if (f.op === "lt") return Prisma.sql`${w} < ${a}`;
    if (f.op === "lte") return Prisma.sql`${w} <= ${a}`;
    return Prisma.sql`${w} BETWEEN ${a} AND ${date(f.value2, what)}`;
  }
  if (f.op === "anyOf") return Prisma.sql`${w} IN (${Prisma.join(list(f.value, what))})`;
  if (f.op === "contains") return Prisma.sql`${w} ILIKE ${`%${like(str(f.value, what))}%`}`;
  if (f.op === "startsWith") return Prisma.sql`${w} ILIKE ${`${like(str(f.value, what))}%`}`;
  if (f.op === "endsWith") return Prisma.sql`${w} ILIKE ${`%${like(str(f.value, what))}`}`;
  const v = str(f.value, what);
  // Colours and emails are the same whatever their letters' case.
  const blind = kind === "color" || kind === "email";
  if (f.op === "is") return blind ? Prisma.sql`lower(${w}) = ${v.toLowerCase()}` : Prisma.sql`${w} = ${v}`;
  return blind ? Prisma.sql`lower(COALESCE(${w}, '')) <> ${v.toLowerCase()}` : Prisma.sql`COALESCE(${w}, '') <> ${v}`;
}

/** The words to look for anywhere in a row: its address, or any of its values (never a field's name). */
function searchSql(term: string): Prisma.Sql {
  // A literal ("q"), case-blind ("i") match on every string value at any depth.
  const path = `$.** ? (@.type() == "string" && @ like_regex ${JSON.stringify(term)} flag "iq")`;
  return Prisma.sql`(i."slug" ILIKE ${`%${like(term)}%`} OR jsonb_path_exists(i."data", ${path}::jsonpath))`;
}

const VIEW_SQL: Record<View, Prisma.Sql> = {
  all: Prisma.raw(`i."deletedAt" IS NULL`),
  draft: Prisma.raw(`i."deletedAt" IS NULL AND i."status" = 'DRAFT'`),
  published: Prisma.raw(`i."deletedAt" IS NULL AND i."status" = 'PUBLISHED'`),
  archived: Prisma.raw(`i."deletedAt" IS NULL AND i."status" = 'ARCHIVED'`),
  trash: Prisma.raw(`i."deletedAt" IS NOT NULL`),
};

/** Which rows: the table, the view (the trash is its own), the search and the filters. */
export function gridWhere(collectionId: string, fields: Field[], q: Pick<GridQuery, "view" | "search" | "filters" | "match">): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`i."collectionId" = ${collectionId}`, VIEW_SQL[q.view]];
  if (q.search) parts.push(searchSql(q.search));
  if (q.filters.length) {
    const each = q.filters.map((f, index) => {
      try {
        return filterSql(fields, f);
      } catch (e) {
        if (e instanceof AppError) e.details = { ...(e.details as object | undefined), filter: index };
        throw e;
      }
    });
    parts.push(Prisma.sql`(${Prisma.join(each, q.match === "any" ? " OR " : " AND ")})`);
  }
  return Prisma.join(parts, " AND ");
}

/** In what order: the asked columns (empty ones last), then the table's own order. */
export function gridOrder(fields: Field[], q: Pick<GridQuery, "sort" | "lang">): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  for (const s of q.sort) {
    const kind = columnKind(fields, s.field);
    if (!kind) throw bad(`No column "${s.field}" in this table`);
    const expr =
      kind === "$slug" || kind === "$date"
        ? SYSTEM_SQL[s.field]
        : kind === "$status"
          ? Prisma.raw(`i."status"::text`)
          : kind === "text" || kind === "longText"
            ? Prisma.sql`lower(left(COALESCE(NULLIF(${json(s.field)}->>${q.lang}::text, ''), NULLIF(${json(s.field)}->>'ar', ''), NULLIF(${json(s.field)}->>'en', ''), NULLIF(${json(s.field)}->>'he', '')), 200))`
            : kind === "number" || kind === "money"
              ? num(s.field)
              : kind === "boolean"
                ? Prisma.sql`(${json(s.field)} = 'true'::jsonb)`
                : Prisma.sql`NULLIF(${words(s.field)}, '')`;
    parts.push(Prisma.sql`${expr} ${Prisma.raw(s.dir === "desc" ? "DESC" : "ASC")} NULLS LAST`);
  }
  if (!parts.length) parts.push(Prisma.raw(`i."sort" ASC`));
  parts.push(Prisma.raw(`i."createdAt" DESC`), Prisma.raw(`i."id" ASC`));
  return Prisma.join(parts, ", ");
}

export type GridRow = { id: string; collectionId: string; slug: string; status: (typeof STATUSES)[number]; data: Record<string, unknown>; sort: number; publishedAt: Date | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null };
const ROW = Prisma.raw(`i."id", i."collectionId", i."slug", i."status"::text AS "status", i."data", i."sort", i."publishedAt", i."createdAt", i."updatedAt", i."deletedAt"`);

type Db = { $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T> };

/** One page of rows and how many there are in all. */
export async function queryRows(db: Db, table: { id: string; fields: Field[] }, q: GridQuery): Promise<{ rows: GridRow[]; total: number }> {
  const where = gridWhere(table.id, table.fields, q);
  const order = gridOrder(table.fields, q);
  const [rows, count] = await Promise.all([
    db.$queryRaw<GridRow[]>(Prisma.sql`SELECT ${ROW} FROM "CollectionItem" i WHERE ${where} ORDER BY ${order} LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`),
    db.$queryRaw<Array<{ n: number }>>(Prisma.sql`SELECT count(*)::int AS n FROM "CollectionItem" i WHERE ${where}`),
  ]);
  return { rows, total: count[0]?.n ?? 0 };
}

/** Rows in order, a slice at a time (the export). */
export async function rowsSlice(db: Db, table: { id: string; fields: Field[] }, q: GridQuery, offset: number, limit: number): Promise<GridRow[]> {
  return db.$queryRaw<GridRow[]>(Prisma.sql`SELECT ${ROW} FROM "CollectionItem" i WHERE ${gridWhere(table.id, table.fields, q)} ORDER BY ${gridOrder(table.fields, q)} LIMIT ${limit} OFFSET ${offset}`);
}

/** How many rows each view holds (the tabs' numbers). */
export async function viewCounts(db: Db, collectionId: string): Promise<Record<View, number>> {
  const rows = await db.$queryRaw<Array<{ status: string; trashed: boolean; n: number }>>(
    Prisma.sql`SELECT i."status"::text AS "status", (i."deletedAt" IS NOT NULL) AS "trashed", count(*)::int AS n FROM "CollectionItem" i WHERE i."collectionId" = ${collectionId} GROUP BY 1, 2`,
  );
  const out: Record<View, number> = { all: 0, draft: 0, published: 0, archived: 0, trash: 0 };
  for (const r of rows) {
    if (r.trashed) out.trash += r.n;
    else {
      out.all += r.n;
      if (r.status === "DRAFT") out.draft += r.n;
      else if (r.status === "PUBLISHED") out.published += r.n;
      else if (r.status === "ARCHIVED") out.archived += r.n;
    }
  }
  return out;
}
