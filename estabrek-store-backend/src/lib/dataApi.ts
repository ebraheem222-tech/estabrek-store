/**
 * The automatic API's rules (B4; the routes are modules/data/data.routes.ts): who reaches a table
 * from outside and for what, a list's question read from the address, and a row as it is
 * answered. Pure: no database here.
 *
 * A table is closed until its owner opens it, act by act: for a key, for a signed-in shopper (their
 * own rows only), or (reading and adding) for everyone; changing and deleting are never for
 * everyone. Everyone sees published rows only; a shopper sees their own; a key sees every row that
 * isn't in the trash. Fields marked private are a key's alone.
 *
 * A shopper's own rows are the ones they added and the ones that point at them: a field of kind
 * "customer" holding the email they sign in with. Who a row points at is answered to a key as the
 * email; to anyone else as a first name and whether it is them (`personView`), and without a key it
 * can't be asked about (a filter would say whether someone is in the table).
 *
 * Locked fields (sites wave G3): a shopper reads them on their own rows but never writes them (an application's
 * state and the staff's answer); the store's members, its keys, a role's holders and its functions do.
 *
 * Roles and groups (stage 2, item 3; lib/shopperRoles.ts): a table may also let the shoppers holding a role do an
 * act on every row, whatever its status (`roles`; a moderator, a seller), and let a shopper read the rows their
 * group's members added beside their own (`group`). A role never reaches a key's private fields.
 *
 * A shop page's list (lib/collectionTree.ts LIST_FEEDS) reads its rows here in the visitor's browser:
 * `mine=added` and `mine=tome` are the two halves of a shopper's own rows, and `shown=1` answers each row
 * also the way a page shows it (`asShown`).
 */
import { z } from "zod";
import { AppError } from "../utils/httpError.js";
import { boundValue, fieldsFor, isComputed, valueKind, type Field } from "./collectionTree.js";
import { formulaReads } from "./computed.js";
import { ACTS, keyCovers, type Act, type KeyLite } from "./apiKeys.js";
import { GRID_LIMITS, GridQuerySchema, OPS, type GridFilter, type GridQuery, type Op, type View } from "./dataQuery.js";
import { LANGS, type Lang } from "./dataRows.js";

export const WHO = ["off", "key", "customer", "public"] as const;
export type Who = (typeof WHO)[number];
export type TableAccess = Record<Act, Who>;
export const CLOSED: TableAccess = { read: "off", create: "off", update: "off", delete: "off" };
/** Changing and deleting are never for everyone: a key's, or a shopper's on their own rows. */
const OWNED = ["off", "key", "customer"] as const;
const ACT_WHO = { read: z.enum(WHO), create: z.enum(WHO), update: z.enum(OWNED), delete: z.enum(OWNED) };
export const AccessSchema = z.object(ACT_WHO).strict();
export const PRIVATE_MAX = 40;
/** A shopper role's key ("seller"), as tables and doors name it. */
export const ROLE_KEY = /^[a-z][a-z0-9_-]{1,30}$/;
export const ROLES_PER_ACT = 10;
/** The roles whose holders do an act on every row. */
export type ActRoles = Record<Act, string[]>;
export const NO_ROLES: ActRoles = { read: [], create: [], update: [], delete: [] };
const RoleList = z.array(z.string().regex(ROLE_KEY)).max(ROLES_PER_ACT);
export const RolesSchema = z.object({ read: RoleList.optional(), create: RoleList.optional(), update: RoleList.optional(), delete: RoleList.optional() }).strict();
/**
 * As kept on the table: who may do what, the fields only a key sees or writes, the roles that do an act on every row,
 * and whether a shopper reads their group's rows too.
 */
export const SettingsSchema = z.object({ ...ACT_WHO, private: z.array(z.string().min(1).max(40)).max(PRIVATE_MAX).default([]), roles: RolesSchema.optional(), group: z.boolean().optional(), locked: z.array(z.string().min(1).max(40)).max(PRIVATE_MAX).optional() }).strict();

/** A table's access as kept; anything that isn't one is closed. */
export function accessOf(raw: unknown): TableAccess {
  const parsed = SettingsSchema.safeParse(raw);
  return parsed.success ? { read: parsed.data.read, create: parsed.data.create, update: parsed.data.update, delete: parsed.data.delete } : { ...CLOSED };
}
/** The fields only a key sees, as kept. */
export function privateOf(raw: unknown): string[] {
  const parsed = SettingsSchema.safeParse(raw);
  return parsed.success ? [...new Set(parsed.data.private)] : [];
}
/** The roles a table lets do each act on every row, as kept (each once). */
export function rolesOf(raw: unknown): ActRoles {
  const parsed = SettingsSchema.safeParse(raw);
  const r = parsed.success ? parsed.data.roles : undefined;
  return { read: [...new Set(r?.read ?? [])], create: [...new Set(r?.create ?? [])], update: [...new Set(r?.update ?? [])], delete: [...new Set(r?.delete ?? [])] };
}
/** The fields a shopper reads but never writes, as kept. */
export function lockedOf(raw: unknown): string[] {
  const parsed = SettingsSchema.safeParse(raw);
  return parsed.success ? [...new Set(parsed.data.locked ?? [])] : [];
}
/** A shopper reads their group's rows too. */
export const groupOf = (raw: unknown): boolean => {
  const parsed = SettingsSchema.safeParse(raw);
  return parsed.success && parsed.data.group === true;
};
/** Open to someone: an act for a key, a shopper or everyone, or for the holders of a role. */
export const isOpen = (access: TableAccess, roles: ActRoles = NO_ROLES) => ACTS.some((act) => access[act] !== "off" || roles[act].length > 0);

/** Where the routes start on the server. */
export const DATA_API_BASE = "/v1/data";

/** A table as the API knows it: its address, its fields, who reaches it, the fields only a key sees, its roles and groups. */
export type ApiTable = { id: string; slug: string; name: unknown; fields: Field[]; access: TableAccess; private: string[]; roles: ActRoles; group: boolean; /** Read by a shopper, never written by one. */ locked?: string[] };
export const tableFrom = (c: { id: string; slug: string; name: unknown; fields: unknown; api: unknown }): ApiTable => ({ id: c.id, slug: c.slug, name: c.name, fields: (Array.isArray(c.fields) ? c.fields : []) as Field[], access: accessOf(c.api), private: privateOf(c.api), roles: rolesOf(c.api), group: groupOf(c.api), locked: lockedOf(c.api) });

/**
 * How a request gets in: through its key (every row), as a shopper holding one of the act's roles (every row, without
 * the private fields), as a signed-in shopper (their own rows), or as anyone (published rows).
 */
export type As = "key" | "role" | "customer" | "public";
export type Verdict = { as: As } | { no: "closed" | "keyNeeded" | "keyLacks" | "signInNeeded" };

/**
 * `customer`: the signed-in shopper's id, when the request is one's; `roles`: the roles that shopper holds and the
 * table's roles (a holder of one of the act's roles does it on every row, even where the act is off to shoppers).
 */
export function allow(access: TableAccess, act: Act, key: KeyLite | null, tableId: string, customer: string | null = null, roles: { mine: readonly string[]; table: ActRoles } | null = null): Verdict {
  const who = access[act];
  const byRole = roles?.table[act] ?? [];
  if (who === "off" && !byRole.length) return { no: "closed" };
  // An act that is off stays off to keys, also where a role does it.
  if (who !== "off" && key && keyCovers(key.scopes, tableId, act)) return { as: "key" };
  if (customer && roles && byRole.some((r) => roles.mine.includes(r))) return { as: "role" };
  // Off to everyone but a role's holders: nobody else, and someone not signed in may be one.
  if (who === "off") return { no: !key && !customer ? "signInNeeded" : "closed" };
  if (who === "public") return { as: "public" };
  if (who === "customer" && customer) return { as: "customer" };
  if (key) return { no: "keyLacks" };
  return { no: who === "customer" ? "signInNeeded" : "keyNeeded" };
}

/**
 * The fields a caller sees and may write: all of them through a key, the rest without the private ones. A formula
 * that reads a private field (itself, or through another formula) is as private: its answer would tell it.
 */
export function seenFields(table: Pick<ApiTable, "fields" | "private">, as: As): Field[] {
  if (as === "key" || !table.private.length) return table.fields;
  const hidden = new Set(table.private);
  return table.fields.filter((f) => !hidden.has(f.id) && !(f.type === "formula" && [...formulaReads(table.fields, f)].some((id) => hidden.has(id))));
}
/** A field whose value is words per language (a formula that gives words too). */
export const isWords = (f: Field) => { const k = valueKind(f); return k === "text" || k === "longText" || k === "richText"; };

/** The fields a caller may ask about (filter, sort, search): without a key, never who a row points at. */
export const askable = (fields: Field[], as: As): Field[] => (as === "key" ? fields : fields.filter((f) => f.type !== "customer"));
/** The fields through which a row is a shopper's to read: the ones pointing at a shopper, among those the shopper sees. */
export const reachFields = (fields: Field[]): string[] => fields.filter((f) => f.type === "customer").map((f) => f.id);

/** A shopper a row points at, as anyone but a key is answered it. */
export type PersonView = { /** A first name (the whole name to the shopper themself); null when there is no account with that email, or no name on it. */ name: string | null; me: boolean; /** Only to that shopper, and to the row's owner. */ email?: string };
/** Who is reading: the signed-in shopper (if any), and the names of the shoppers the rows at hand point at, by email. */
export type Viewer = { id: string | null; email: string | null; names: Map<string, string>; /** The names of who added the rows at hand, by their id: only where the rows are the shopper's own. */ owners?: Map<string, string> };

export function personView(email: string, ownerId: string | null, viewer: Viewer): PersonView {
  const me = !!viewer.email && viewer.email === email;
  const full = (viewer.names.get(email) ?? "").trim();
  const name = full ? (me ? full : full.split(/\s+/)[0]) : null;
  return { name, me, ...(me || (!!viewer.id && ownerId === viewer.id) ? { email } : {}) };
}

/**
 * A table as the documents describe it to one caller (lib/apiDocs.ts): how each act it may do is
 * entered ("key", "customer" or "public"; null = not for this caller), the fields it is answered
 * (`fields`) and may write (`writeFields`, when they differ), and which of its relations it sees.
 */
export type DocTable = { slug: string; name: unknown; fields: Field[]; writeFields?: Field[]; acts: Record<Act, Exclude<Who, "off"> | "role" | null>; links: Set<string> };

/** The tables a caller reaches, as the documents describe them; a table it can do nothing with is left out. */
export function docTables(all: ApiTable[], key: KeyLite | null, customer: string | null = null, mine: readonly string[] = []): DocTable[] {
  const byId = new Map(all.map((t) => [t.id, t]));
  return all.flatMap((t) => {
    const how = new Map<Act, As>();
    for (const act of ACTS) {
      const verdict = allow(t.access, act, key, t.id, customer, { mine, table: t.roles ?? NO_ROLES });
      if ("as" in verdict) how.set(act, verdict.as);
    }
    if (!how.size) return [];
    const acts = Object.fromEntries(ACTS.map((act) => [act, !how.has(act) ? null : how.get(act) === "role" ? "role" : t.access[act]])) as DocTable["acts"];
    // Answered as the caller reads (or, for a table it only writes, as it writes); written as its widest write.
    const fields = seenFields(t, how.get("read") ?? [...how.values()][0]);
    const writes = [how.get("create"), how.get("update")].filter((x): x is As => !!x);
    // A locked field is written by a key or a role's holder only.
    const mayLocked = writes.includes("key") || writes.includes("role");
    const writeFields = writes.length ? seenFields(t, writes.includes("key") ? "key" : writes[0]).filter((f) => mayLocked || !(t.locked ?? []).includes(f.id)) : undefined;
    // A relation shows when its table is open to everyone or to the caller's key (a shopper's own rows aren't followed through a link).
    const links = new Set<string>();
    for (const f of [...fields, ...(writeFields ?? [])]) {
      const target = f.type === "relation" && f.to ? byId.get(f.to) : undefined;
      if (target && "as" in allow(target.access, "read", key, target.id)) links.add(f.id);
    }
    return [{ slug: t.slug, name: t.name, fields, ...(writeFields && writeFields.length !== fields.length ? { writeFields } : {}), acts, links }];
  });
}

/* ---------------- A list's question, from the address ---------------- */

export const API_LIMITS = { pageSize: 100, pageSizeDefault: 25, expand: 5, publicWritesPerMinute: 10, /** A signed-in shopper's writes to one table. */ customerWritesPerMinute: 30 } as const;
/** A row's own columns by the names the API uses (the grid's "$" names work too). */
const OWN: Record<string, string> = { slug: "$slug", status: "$status", createdAt: "$createdAt", updatedAt: "$updatedAt", publishedAt: "$publishedAt" };
const PLAIN = new Set(["page", "pageSize", "sort", "search", "lang", "status", "fields", "expand", "match", "mine", "shown"]);
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

/** Which of their own rows a signed-in shopper asks for: all of them, the ones they added, or the ones that point at them. */
export type Mine = "all" | "added" | "tome";
/**
 * `mine=1`: a signed-in shopper asking for their own rows (whatever their status) of a table everyone reads;
 * `mine=added` and `mine=tome`: only the ones they added, only the ones that point at them. Null: not asked.
 */
export function mineAsked(query: Record<string, unknown>): Mine | null {
  const raw = first(query.mine);
  if (raw === undefined || raw === "" || raw === "0" || raw === "false") return null;
  if (raw === "1" || raw === "true") return "all";
  if (raw === "added" || raw === "tome") return raw;
  throw bad("mine: 1 for the signed-in shopper's own rows (added: the ones they added, tome: the ones that point at them)");
}

export type ListAsk = { q: GridQuery; /** Words answered in this language as plain strings; null = every language. */ lang: Lang | null; /** Only these fields; null = all. */ pick: string[] | null; expand: string[]; /** Each row also as a page shows it (`asShown`). */ shown: boolean };

/** What to answer with, common to a list and one row: the language, the fields, the relations opened. */
export function shapeAsk(fields: Field[], query: Record<string, unknown>): Pick<ListAsk, "lang" | "pick" | "expand" | "shown"> {
  const langRaw = first(query.lang);
  if (langRaw !== undefined && !(LANGS as readonly string[]).includes(langRaw)) throw bad("lang: ar, en or he");
  const pickRaw = first(query.fields);
  const pick = pickRaw === undefined ? null : parts(pickRaw);
  for (const id of pick ?? []) if (!fields.some((f) => f.id === id)) throw bad(`No field "${id}" in this table`);
  const expand = parts(first(query.expand) ?? "");
  if (expand.length > API_LIMITS.expand) throw bad(`Up to ${API_LIMITS.expand} relations can be opened at once`);
  for (const id of expand) if (fields.find((f) => f.id === id)?.type !== "relation") throw bad(`"${id}" isn't a relation of this table`);
  const shownRaw = first(query.shown);
  if (shownRaw !== undefined && !["", "0", "false", "1", "true"].includes(shownRaw)) throw bad("shown: 1 to answer each row also as a page shows it");
  return { lang: (langRaw as Lang | undefined) ?? null, pick, expand, shown: shownRaw === "1" || shownRaw === "true" };
}

/**
 * A list's question from the address:
 *   ?page=2&pageSize=50&sort=-price,title&search=silk&lang=en&status=published&fields=title,price&expand=author
 *   &price[gte]=10&title[contains]=scarf&tags[anyOf]=new,sale&date[between]=2026-01-01,2026-12-31&match=any
 * Anything it doesn't know is refused (a misspelt filter never answers with every row).
 */
export function listAsk(all: Field[], query: Record<string, unknown>, as: As): ListAsk {
  const shape = shapeAsk(all, query);
  // What it may be sorted and filtered by: not who a row points at, without a key.
  const fields = askable(all, as);
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

export type ApiRow = { id: string; slug: string; status: string; values: Record<string, unknown>; createdAt: Date; updatedAt: Date; publishedAt: Date | null; /** Asked with `shown=1`: each field's words as a page shows them, and the address a field opens. */ shown?: Record<string, string>; links?: Record<string, string>; /** The fields among `shown` whose words are formatted (bold, lists, links: the page draws their marks). */ rich?: string[] };
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

type RowIn = { id: string; slug: string; status: string; data: unknown; createdAt: Date; updatedAt: Date; publishedAt: Date | null; ownerId?: string | null };

/**
 * One row for the answer. `values` has every field the caller sees, in the table's order, with
 * null where the row has nothing (so every row of a table has the same shape). `row.data` already
 * holds each relation's linked rows (lib/links.ts withLinks).
 */
export function apiRow(row: RowIn, fields: Field[], opts: { lang: Lang | null; pick?: string[] | null; links?: LinkModes; expand?: Map<string, Map<string, ApiRow>>; /** Who reads, when it isn't a key (a key is answered the email itself). */ viewer?: Viewer; /** Also as a page shows it: the row's table. */ shown?: { id: string; slug: string } } = { lang: null }): ApiRow {
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
    } else if (isWords(f) && opts.lang) values[f.id] = wordsIn(v, opts.lang);
    else if (f.type === "customer" && opts.viewer) values[f.id] = typeof v === "string" && v ? personView(v, row.ownerId ?? null, opts.viewer) : null;
    else values[f.id] = v === undefined ? null : v;
  }
  return { id: row.id, slug: row.slug, status: row.status, values, createdAt: row.createdAt, updatedAt: row.updatedAt, publishedAt: row.publishedAt, ...(opts.shown ? asShown(row, fields, opts.shown, { lang: opts.lang ?? "ar", pick: opts.pick, links: opts.links, viewer: opts.viewer }) : {}) };
}

const YES_NO: Record<Lang, [string, string]> = { ar: ["نعم", "لا"], en: ["Yes", "No"], he: ["כן", "לא"] };
const LINKS = fieldsFor(undefined, "href");

/**
 * A row as a page shows it (a shop page's list reads its rows this way: lib/collectionTree.ts LIST_FEEDS).
 * `shown`: each field's words in one language, the way a page's elements show them (lib/collectionTree.ts
 * `boundValue`: a number, a date, money, a choice's name…); a yes or a no; the rows a relation links, by their
 * names; a shopper the row points at by name, as far as this caller may know it (`personView`: an email only
 * where it is theirs to see). `shown.$by`: who added the row, by first name (their whole name to themself), only
 * where the rows are a shopper's own. `links`: the address a field opens (a link, an email, a phone, a file, a
 * place). A field with nothing to show is left out. `rich`: the fields whose words are formatted (as written: the
 * page draws their marks, never as HTML).
 */
export function asShown(row: RowIn, fields: Field[], table: { id: string; slug: string }, opts: { lang: Lang; pick?: string[] | null; links?: LinkModes; viewer?: Viewer }): { shown: Record<string, string>; links: Record<string, string>; rich?: string[] } {
  const data = row.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : {};
  const item = { id: row.id, slug: row.slug, data };
  const collection = { id: table.id, slug: table.slug, fields };
  const shown: Record<string, string> = {};
  const links: Record<string, string> = {};
  const rich: string[] = [];
  for (const f of fields) {
    if (opts.pick && !opts.pick.includes(f.id)) continue;
    const v = data[f.id];
    let words: string | null = null;
    if (f.type === "relation") {
      const mode = opts.links?.get(f.id);
      if (!mode) continue;
      const titles = (Array.isArray(v) ? v : []).filter((x) => !!x && typeof x === "object" && (mode === "all" || (x as { status?: unknown }).status === "PUBLISHED")).map((x) => wordsIn((x as { title?: unknown }).title, opts.lang)).filter((t): t is string => !!t);
      words = titles.join(opts.lang === "ar" ? "، " : ", ");
    } else if (f.type === "customer") {
      if (typeof v === "string" && v) {
        const who: { name: string | null; email?: string } = opts.viewer ? personView(v, row.ownerId ?? null, opts.viewer) : { name: null, email: v };
        words = who.name ?? who.email ?? null;
      }
    } else if (valueKind(f) === "boolean") {
      if (typeof v === "boolean") words = YES_NO[opts.lang][v ? 0 : 1];
    } else words = wordsIn(boundValue("text", f.id, item, collection, "text"), opts.lang);
    if (words && words.trim()) {
      shown[f.id] = words;
      if (f.type === "richText") rich.push(f.id);
    }
    if (LINKS.includes(f.type)) {
      const to = boundValue("href", f.id, item, collection);
      if (typeof to === "string" && to) links[f.id] = to;
    }
  }
  const by = row.ownerId ? (opts.viewer?.owners?.get(row.ownerId) ?? "").trim() : "";
  if (by) shown.$by = row.ownerId === opts.viewer?.id ? by : by.split(/\s+/)[0];
  return { shown, links, ...(rich.length ? { rich } : {}) };
}

/** A field as the API describes it (the list of tables a caller reaches). */
export function fieldView(f: Field) {
  return { id: f.id, type: f.type, name: f.name ?? null, required: !!f.required, ...(f.options ? { options: f.options.map((o) => ({ id: o.id, name: o.name ?? null })) } : {}), ...(f.type === "relation" ? { many: !!f.many } : {}), ...(f.currency ? { currency: f.currency } : {}), ...(f.upload ? { upload: f.upload } : {}), ...(isComputed(f) ? { computed: true, result: f.result ?? "number" } : {}) };
}
