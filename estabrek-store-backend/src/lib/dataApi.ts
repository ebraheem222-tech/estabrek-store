/**
 * The automatic API's rules (B4; the routes are modules/data/data.routes.ts): who reaches a table
 * from outside and for what, a list's question read from the address, and a row as it is
 * answered. Pure: no database here.
 *
 * A table is closed until its owner opens it, act by act: reading and adding can be for a key or
 * for everyone; changing and deleting only ever for a key. Everyone sees published rows only; a
 * key sees every row that isn't in the trash.
 */
import { z } from "zod";
import { AppError } from "../utils/httpError.js";
import type { Field } from "./collectionTree.js";
import { ACTS, keyCovers, type Act, type KeyLite } from "./apiKeys.js";
import { GRID_LIMITS, GridQuerySchema, OPS, type GridFilter, type GridQuery, type Op, type View } from "./dataQuery.js";
import { LANGS, type Lang } from "./dataRows.js";

export const WHO = ["off", "key", "public"] as const;
export type Who = (typeof WHO)[number];
export type TableAccess = Record<Act, Who>;
export const CLOSED: TableAccess = { read: "off", create: "off", update: "off", delete: "off" };
/** Changing and deleting are never for everyone. */
export const AccessSchema = z.object({ read: z.enum(WHO), create: z.enum(WHO), update: z.enum(["off", "key"]), delete: z.enum(["off", "key"]) }).strict();

/** A table's access as kept; anything that isn't one is closed. */
export function accessOf(raw: unknown): TableAccess {
  const parsed = AccessSchema.safeParse(raw);
  return parsed.success ? parsed.data : { ...CLOSED };
}
export const isOpen = (access: TableAccess) => ACTS.some((act) => access[act] !== "off");

/** Where the routes start on the server. */
export const DATA_API_BASE = "/v1/data";

/** A table as the API knows it: its address, its fields, and who reaches it. */
export type ApiTable = { id: string; slug: string; name: unknown; fields: Field[]; access: TableAccess };
export const tableFrom = (c: { id: string; slug: string; name: unknown; fields: unknown; api: unknown }): ApiTable => ({ id: c.id, slug: c.slug, name: c.name, fields: (Array.isArray(c.fields) ? c.fields : []) as Field[], access: accessOf(c.api) });

/** How a request gets in: through its key (every row), or as anyone (published rows). */
export type As = "key" | "public";
export type Verdict = { as: As } | { no: "closed" | "keyNeeded" | "keyLacks" };

export function allow(access: TableAccess, act: Act, key: KeyLite | null, tableId: string): Verdict {
  const who = access[act];
  if (who === "off") return { no: "closed" };
  if (key && keyCovers(key.scopes, tableId, act)) return { as: "key" };
  if (who === "public") return { as: "public" };
  return { no: key ? "keyLacks" : "keyNeeded" };
}

/**
 * A table as the documents describe it to one caller (lib/apiDocs.ts): how each act it may do is
 * entered ("key" or "public"; null = not for this caller), and which of its relations it sees.
 */
export type DocTable = { slug: string; name: unknown; fields: Field[]; acts: Record<Act, "key" | "public" | null>; links: Set<string> };

/** The tables a caller reaches, as the documents describe them; a table it can do nothing with is left out. */
export function docTables(all: ApiTable[], key: KeyLite | null): DocTable[] {
  const byId = new Map(all.map((t) => [t.id, t]));
  return all.flatMap((t) => {
    const acts = Object.fromEntries(ACTS.map((act) => [act, "as" in allow(t.access, act, key, t.id) ? (t.access[act] === "public" ? "public" : "key") : null])) as DocTable["acts"];
    if (!ACTS.some((act) => acts[act])) return [];
    const links = new Set<string>();
    for (const f of t.fields) {
      const target = f.type === "relation" && f.to ? byId.get(f.to) : undefined;
      if (target && "as" in allow(target.access, "read", key, target.id)) links.add(f.id);
    }
    return [{ slug: t.slug, name: t.name, fields: t.fields, acts, links }];
  });
}

/* ---------------- A list's question, from the address ---------------- */

export const API_LIMITS = { pageSize: 100, pageSizeDefault: 25, expand: 5, publicWritesPerMinute: 10 } as const;
/** A row's own columns by the names the API uses (the grid's "$" names work too). */
const OWN: Record<string, string> = { slug: "$slug", status: "$status", createdAt: "$createdAt", updatedAt: "$updatedAt", publishedAt: "$publishedAt" };
const PLAIN = new Set(["page", "pageSize", "sort", "search", "lang", "status", "fields", "expand", "match"]);
const NO_VALUE = new Set<Op>(["empty", "notEmpty", "isTrue", "isFalse"]);
const STATUS_VIEW: Record<string, View> = { all: "all", draft: "draft", published: "published", archived: "archived" };

const bad = (message: string, details?: unknown) => new AppError(400, "BAD_QUERY", message, details);
const first = (v: unknown): string | undefined => (Array.isArray(v) ? first(v[0]) : typeof v === "string" ? v : undefined);
const parts = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

/** A column by the name the API uses: a field's id, or one of the row's own when no field has that id. */
export function columnOf(fields: Field[], name: string): string | null {
  if (fields.some((f) => f.id === name)) return name;
  if (name in OWN) return OWN[name];
  return Object.values(OWN).includes(name) ? name : null;
}

function whole(v: string | undefined, what: string, min: number, max: number, otherwise: number): number {
  if (v === undefined || v === "") return otherwise;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`${what}: a whole number from ${min} to ${max}`);
  return n;
}

export type ListAsk = { q: GridQuery; /** Words answered in this language as plain strings; null = every language. */ lang: Lang | null; /** Only these fields; null = all. */ pick: string[] | null; expand: string[] };

/** What to answer with, common to a list and one row: the language, the fields, the relations opened. */
export function shapeAsk(fields: Field[], query: Record<string, unknown>): Pick<ListAsk, "lang" | "pick" | "expand"> {
  const langRaw = first(query.lang);
  if (langRaw !== undefined && !(LANGS as readonly string[]).includes(langRaw)) throw bad("lang: ar, en or he");
  const pickRaw = first(query.fields);
  const pick = pickRaw === undefined ? null : parts(pickRaw);
  for (const id of pick ?? []) if (!fields.some((f) => f.id === id)) throw bad(`No field "${id}" in this table`);
  const expand = parts(first(query.expand) ?? "");
  if (expand.length > API_LIMITS.expand) throw bad(`Up to ${API_LIMITS.expand} relations can be opened at once`);
  for (const id of expand) if (fields.find((f) => f.id === id)?.type !== "relation") throw bad(`"${id}" isn't a relation of this table`);
  return { lang: (langRaw as Lang | undefined) ?? null, pick, expand };
}

/**
 * A list's question from the address:
 *   ?page=2&pageSize=50&sort=-price,title&search=silk&lang=en&status=published&fields=title,price&expand=author
 *   &price[gte]=10&title[contains]=scarf&tags[anyOf]=new,sale&date[between]=2026-01-01,2026-12-31&match=any
 * Anything it doesn't know is refused (a misspelt filter never answers with every row).
 */
export function listAsk(fields: Field[], query: Record<string, unknown>, as: As): ListAsk {
  const shape = shapeAsk(fields, query);
  const statusRaw = first(query.status)?.toLowerCase();
  if (statusRaw !== undefined && !(statusRaw in STATUS_VIEW)) throw bad("status: all, draft, published or archived");
  if (as === "public" && statusRaw !== undefined && statusRaw !== "published") throw bad("Only published rows are open without a key");
  const view: View = as === "public" ? "published" : STATUS_VIEW[statusRaw ?? "all"];
  const matchRaw = first(query.match);
  if (matchRaw !== undefined && matchRaw !== "all" && matchRaw !== "any") throw bad("match: all or any");

  const sort = parts(first(query.sort) ?? "").map((name) => {
    const desc = name.startsWith("-");
    const column = columnOf(fields, desc ? name.slice(1) : name);
    if (!column) throw bad(`No column "${desc ? name.slice(1) : name}" to sort by`);
    return { field: column, dir: desc ? ("desc" as const) : ("asc" as const) };
  });
  if (sort.length > GRID_LIMITS.sorts) throw bad(`Up to ${GRID_LIMITS.sorts} columns to sort by`);

  const filters: GridFilter[] = [];
  const add = (name: string, opRaw: string, raw: unknown) => {
    const column = columnOf(fields, name);
    if (!column) throw bad(`No column "${name}" in this table`);
    if (!(OPS as readonly string[]).includes(opRaw)) throw bad(`"${opRaw}" isn't a question; one of: ${OPS.join(", ")}`);
    const op = opRaw as Op;
    const v = first(raw) ?? "";
    if (NO_VALUE.has(op)) filters.push({ field: column, op });
    else if (op === "anyOf") filters.push({ field: column, op, value: parts(v) });
    else if (op === "between") {
      const [a, b] = parts(v);
      filters.push({ field: column, op, value: a, value2: b });
    } else filters.push({ field: column, op, value: v });
  };
  for (const [key, raw] of Object.entries(query)) {
    const flat = /^([A-Za-z$][A-Za-z0-9]*)\[([A-Za-z]+)\]$/.exec(key);
    if (flat) add(flat[1], flat[2], raw);
    // The same written price[gte]=10, when the server reads addresses the nested way.
    else if (raw && typeof raw === "object" && !Array.isArray(raw)) for (const [op, v] of Object.entries(raw as Record<string, unknown>)) add(key, op, v);
    else if (!PLAIN.has(key)) throw bad(`"${key}" isn't something a list can be asked; a filter is written field[question]=value`);
  }
  if (filters.length > GRID_LIMITS.filters) throw bad(`Up to ${GRID_LIMITS.filters} filters`);

  const search = first(query.search)?.trim();
  if (search && search.length > GRID_LIMITS.search) throw bad(`search: up to ${GRID_LIMITS.search} letters`);
  const q = GridQuerySchema.parse({
    page: whole(first(query.page), "page", 1, 1_000_000, 1),
    pageSize: whole(first(query.pageSize), "pageSize", 1, API_LIMITS.pageSize, API_LIMITS.pageSizeDefault),
    ...(search ? { search } : {}),
    lang: shape.lang ?? "ar",
    view,
    sort,
    filters,
    match: matchRaw ?? "all",
  });
  return { q, ...shape };
}

/* ---------------- A row, as answered ---------------- */

export type ApiRow = { id: string; slug: string; status: string; values: Record<string, unknown>; createdAt: Date; updatedAt: Date; publishedAt: Date | null };
/** How much of a relation's rows the caller sees: every linked row, or the published ones. A relation that isn't here links a table the caller can't read, and is left out. */
export type LinkModes = Map<string, "all" | "published">;

/** Words in one language (the others stand in when it has none). */
export function wordsIn(v: unknown, lang: Lang): string | null {
  if (typeof v === "string") return v;
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  for (const l of [lang, ...LANGS]) if (typeof o[l] === "string" && (o[l] as string).trim()) return o[l] as string;
  return null;
}

type RowIn = { id: string; slug: string; status: string; data: unknown; createdAt: Date; updatedAt: Date; publishedAt: Date | null };

/**
 * One row for the answer. `values` has every field the caller sees, in the table's order, with
 * null where the row has nothing (so every row of a table has the same shape). `row.data` already
 * holds each relation's linked rows (lib/links.ts withLinks).
 */
export function apiRow(row: RowIn, fields: Field[], opts: { lang: Lang | null; pick?: string[] | null; links?: LinkModes; expand?: Map<string, Map<string, ApiRow>> } = { lang: null }): ApiRow {
  const data = row.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : {};
  const values: Record<string, unknown> = {};
  for (const f of fields) {
    if (opts.pick && !opts.pick.includes(f.id)) continue;
    const v = data[f.id];
    if (f.type === "relation") {
      const mode = opts.links?.get(f.id);
      if (!mode) continue;
      const linked = (Array.isArray(v) ? v : []).filter((x): x is { id: string; slug: string; status: string; title: unknown } => !!x && typeof x === "object" && (mode === "all" || (x as { status?: unknown }).status === "PUBLISHED"));
      const open = opts.expand?.get(f.id);
      values[f.id] = open ? linked.map((x) => open.get(x.id)).filter((x): x is ApiRow => !!x) : linked.map((x) => ({ id: x.id, slug: x.slug, status: x.status, title: opts.lang ? wordsIn(x.title, opts.lang) : x.title ?? null }));
    } else if ((f.type === "text" || f.type === "longText") && opts.lang) values[f.id] = wordsIn(v, opts.lang);
    else values[f.id] = v === undefined ? null : v;
  }
  return { id: row.id, slug: row.slug, status: row.status, values, createdAt: row.createdAt, updatedAt: row.updatedAt, publishedAt: row.publishedAt };
}

/** A field as the API describes it (the list of tables a caller reaches). */
export function fieldView(f: Field) {
  return { id: f.id, type: f.type, name: f.name ?? null, required: !!f.required, ...(f.options ? { options: f.options.map((o) => ({ id: o.id, name: o.name ?? null })) } : {}), ...(f.type === "relation" ? { many: !!f.many } : {}), ...(f.currency ? { currency: f.currency } : {}) };
}
