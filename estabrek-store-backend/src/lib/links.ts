/**
 * Relations between tables (B3). A field of kind "relation" links a row to rows of a table (its
 * own too). The links live in one table, CollectionLink, read both ways; a row's own values (its
 * JSON) never hold them. So:
 *
 *  - reading: the routes answer each relation field as the rows it links ({ id, slug, status,
 *    title }), in the row's order. A linked row in the trash doesn't show: its link waits for it.
 *  - writing: a relation field is given rows by their id or their address; they are looked up in
 *    the field's table, then the field's own rules: one row or several, a row there linked from
 *    one row only, required.
 *  - deleting: a row going to the trash does what each relation linking it chose. The rows
 *    linking it lose the link (it comes back if the row does), go to the trash with it (and come
 *    back with it), or forbid it. A row deleted for good takes its links with it, whichever end
 *    of them it is (the database does that: no link is ever left without its rows).
 *  - changing fields: links are never rewritten. A relation removed, or pointed at another table,
 *    leaves its links where they are, hidden; they show again when it comes back.
 *  - the other side: a table sees who links its rows. Every relation that links it (another
 *    table's, or its own) is a column of its grid, read only: how many rows link each row, and
 *    the first few. Nothing is kept for it: it is the same links read from their other end.
 *  - the store's own tables: a relation may link products, categories, orders or customers
 *    instead of one of the owner's tables (lib/storeLinks.ts). Its rules are the same; its links
 *    are kept in StoreLink; a store row that is deleted just stops showing; and a linked store
 *    row is named only to who may see that table.
 */
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/httpError.js";
import { LIMITS, type ItemIssue } from "./collections.js";
import type { Field } from "./collectionTree.js";
import { utc } from "./dataQuery.js";
import { linkTable, storeLinksOf, storeRowsNamed, storeTarget, type StoreId } from "./storeLinks.js";

export type RelationField = Field & { type: "relation"; to: string };
export const isRelation = (f: Field | undefined | null): f is RelationField => !!f && f.type === "relation" && typeof f.to === "string" && f.to !== "";
export const relationsOf = (fields: Field[]): RelationField[] => fields.filter(isRelation);

type Local = Partial<Record<"ar" | "en" | "he", string>>;
/** A linked row as the routes answer it: enough to name it and open it. */
export type Linked = { id: string; slug: string; status: string; /** Its first words field. */ title: Local | null; /** One of the store's rows: which of its tables. */ store?: StoreId; /** The reader may not see that table: only that a row is linked. */ hidden?: boolean };
/** What relation fields were asked to hold: field id → rows named by id or address ([] unlinks). */
export type Asked = Map<string, string[]>;

type Raw = { $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>; $executeRaw: (query: Prisma.Sql) => Promise<number> };
type Db = Raw & Pick<Prisma.TransactionClient, "collection" | "collectionLink" | "storeLink">;
const fieldsOf = (c: { fields: unknown }) => (Array.isArray(c.fields) ? c.fields : []) as Field[];

/* ---------------- What was asked ---------------- */

/** The rows a value names: "a, b", ["a", "b"], [{ id }]; null when it isn't a list of rows. */
export function namedRows(raw: unknown): string[] | null {
  if (raw === null || raw === undefined || raw === "") return [];
  const list = typeof raw === "string" ? raw.split(/[,;|،\n]/) : Array.isArray(raw) ? raw : [raw];
  const out: string[] = [];
  for (const one of list) {
    const word = typeof one === "string" ? one.trim() : one && typeof one === "object" && typeof (one as { id?: unknown }).id === "string" ? (one as { id: string }).id.trim() : null;
    if (word === null || word.length > 100) return null;
    if (word && !out.includes(word)) out.push(word);
  }
  return out;
}

/**
 * The relation fields taken out of loose values (a relation is never one of the row's values).
 * `emptyClears`: a cell or a form, where an empty one unlinks; a file's empty cell says nothing.
 */
export function splitLinks(fields: Field[], values: unknown, emptyClears: boolean): { rest: Record<string, unknown>; asked: Asked; issues: ItemIssue[] } {
  const src = values && typeof values === "object" && !Array.isArray(values) ? (values as Record<string, unknown>) : {};
  const rest: Record<string, unknown> = { ...src };
  const asked: Asked = new Map();
  const issues: ItemIssue[] = [];
  for (const f of relationsOf(fields)) {
    if (!(f.id in src)) continue;
    delete rest[f.id];
    const rows = namedRows(src[f.id]);
    if (rows === null) issues.push({ field: f.id, message: "Rows by their id or address" });
    else if (rows.length > LIMITS.links) issues.push({ field: f.id, message: "Too many linked rows" });
    else if (rows.length || emptyClears) asked.set(f.id, rows);
  }
  return { rest, asked, issues };
}

/* ---------------- Checked, then written ---------------- */

export type LinkCandidate = { /** The row being changed; a new row has none yet. */ id?: string; asked: Asked };
export type LinkCheck = { issues: Map<number, ItemIssue[]>; /** Per candidate: each asked field's rows by id, in the asked order. */ ready: Array<Map<string, string[]>> };

/**
 * The asked rows looked up in their tables, then each relation's own rules. A new row that asks
 * nothing of a required relation is missing it. A row there that may be linked from one row only
 * is refused when another row holds it: one in this batch, or one of the table (a row in the
 * trash still holds its links, like it still holds an only value).
 *
 * `view`: who asks. One of the store's tables they may not see is never searched for them (what a
 * name finds, or doesn't, would say what that table holds): a row keeps the store rows it already
 * links, or lets go of them, and takes no other.
 */
export async function checkLinks(db: Raw, table: { id: string; fields: Field[] }, candidates: LinkCandidate[], view: LinkView = {}): Promise<LinkCheck> {
  const issues = new Map<number, ItemIssue[]>();
  const ready = candidates.map(() => new Map<string, string[]>());
  const bad = (k: number, issue: ItemIssue) => void issues.set(k, [...(issues.get(k) ?? []), issue]);
  for (const f of relationsOf(table.fields)) {
    // A refusal by the relation's own rules is said in the owner's words when the field has some (as a value's rules are).
    const own = f.message && Object.values(f.message).some(Boolean) ? { say: f.message } : {};
    const names = [...new Set(candidates.flatMap((c) => c.asked.get(f.id) ?? []))];
    // One of the store's tables: its rows by id (a product or a category by its address too, a customer by email).
    const store = storeTarget(f.to);
    const closed = !!store && !!view.store && !view.store(store);
    // Closed to who asks: the store rows each of these rows links now, and nothing looked up by name.
    const kept = new Map<string, Set<string>>();
    if (closed && names.length) {
      const mine = candidates.flatMap((c) => (c.id ? [c.id] : []));
      const held = mine.length
        ? await db.$queryRaw<Array<{ fromId: string; toId: string }>>(Prisma.sql`SELECT l."fromId", l."toId" FROM "StoreLink" l WHERE l."collectionId" = ${table.id} AND l."fieldId" = ${f.id} AND l."toTable" = ${store} AND l."fromId" = ANY(${mine}::text[])`)
        : [];
      for (const h of held) kept.set(h.fromId, (kept.get(h.fromId) ?? new Set()).add(h.toId));
    }
    const found = !names.length
      ? []
      : closed
        ? [...new Set([...kept.values()].flatMap((ids) => [...ids]))].map((id) => ({ id, slug: id }))
        : store
        ? await storeRowsNamed(db, store, names)
        : await db.$queryRaw<Array<{ id: string; slug: string }>>(
            Prisma.sql`SELECT t."id", t."slug" FROM "CollectionItem" t WHERE t."collectionId" = ${f.to} AND t."deletedAt" IS NULL AND (t."id" = ANY(${names}::text[]) OR t."slug" = ANY(${names.map((n) => n.toLowerCase())}::text[]))`,
          );
    const byId = new Map(found.map((x) => [x.id, x]));
    const bySlug = new Map(found.map((x) => [x.slug, x]));
    candidates.forEach((c, k) => {
      const asked = c.asked.get(f.id);
      if (asked === undefined) {
        if (f.required && !c.id) bad(k, { field: f.id, message: "Required" });
        return;
      }
      const ids: string[] = [];
      for (const name of asked) {
        if (closed && !kept.get(c.id ?? "")?.has(name)) return bad(k, { field: f.id, message: "Linking this table's rows needs the permission to see it" });
        const row = byId.get(name) ?? bySlug.get(name.toLowerCase());
        if (!row) return bad(k, { field: f.id, message: "No such row", value: name, ...own });
        if (row.id === c.id) return bad(k, { field: f.id, message: "A row can't link itself", ...own });
        if (!ids.includes(row.id)) ids.push(row.id);
      }
      if (!f.many && ids.length > 1) return bad(k, { field: f.id, message: "One row only", ...own });
      if (f.required && !ids.length) return bad(k, { field: f.id, message: "Required" });
      ready[k].set(f.id, ids);
    });
    if (!f.exclusive) continue;
    const holder = new Map<string, number>();
    const refused = new Set<number>();
    const taken = (k: number, id: string) => {
      if (!refused.has(k)) bad(k, { field: f.id, message: "Already linked from another row", value: byId.get(id)?.slug, ...own });
      refused.add(k);
    };
    ready.forEach((r, k) => {
      for (const id of r.get(f.id) ?? []) {
        if (holder.has(id)) taken(k, id);
        else holder.set(id, k);
      }
    });
    if (holder.size) {
      const kept = linkTable(f.to);
      const held = await db.$queryRaw<Array<{ toId: string; fromId: string }>>(
        Prisma.sql`SELECT l."toId", l."fromId" FROM ${kept.table} l WHERE l."collectionId" = ${table.id} AND l."fieldId" = ${f.id} AND l."toTable" = ${kept.toTable} AND l."toId" = ANY(${[...holder.keys()]}::text[])`,
      );
      for (const h of held) {
        const k = holder.get(h.toId)!;
        if (candidates[k].id !== h.fromId) taken(k, h.toId);
      }
    }
    for (const k of refused) ready[k].delete(f.id);
  }
  return { issues, ready };
}

/**
 * Rows' links in the fields each was asked about, replaced by the checked ones (`links`: what
 * checkLinks made ready). Run inside the transaction that writes the rows. Two statements a
 * relation, however many rows.
 */
export async function saveLinks(db: Pick<Db, "collectionLink" | "storeLink">, table: { id: string; fields: Field[] }, rows: Array<{ id: string; links: Map<string, string[]> }>): Promise<void> {
  for (const f of relationsOf(table.fields)) {
    let asked = rows.filter((r) => r.links.has(f.id));
    if (!asked.length) continue;
    const store = storeTarget(f.to);
    if (store) {
      // The store's rows: the same replacing, in the store links' own table.
      const where = { collectionId: table.id, fieldId: f.id, toTable: store, fromId: { in: asked.map((r) => r.id) } };
      const had = await db.storeLink.findMany({ where, orderBy: [{ position: "asc" }, { createdAt: "asc" }, { toId: "asc" }], select: { fromId: true, toId: true } });
      const held = new Map<string, string[]>();
      for (const l of had) held.set(l.fromId, [...(held.get(l.fromId) ?? []), l.toId]);
      asked = asked.filter((r) => (held.get(r.id) ?? []).join("\n") !== r.links.get(f.id)!.join("\n"));
      if (!asked.length) continue;
      await db.storeLink.deleteMany({ where: { ...where, fromId: { in: asked.map((r) => r.id) } } });
      const rowsOut = asked.flatMap((r) => r.links.get(f.id)!.map((toId, position) => ({ collectionId: table.id, fieldId: f.id, fromId: r.id, toTable: store, toId, position })));
      if (rowsOut.length) await db.storeLink.createMany({ data: rowsOut, skipDuplicates: true });
      continue;
    }
    // Asked to hold what it already shows: left alone. (A row's whole form sends every field; a
    // link waiting for a row in the trash isn't shown, and must not go because the form was saved.)
    const now = await db.collectionLink.findMany({
      where: { collectionId: table.id, fieldId: f.id, toTable: f.to, fromId: { in: asked.map((r) => r.id) }, to: { deletedAt: null } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }, { toId: "asc" }],
      select: { fromId: true, toId: true },
    });
    const shown = new Map<string, string[]>();
    for (const l of now) shown.set(l.fromId, [...(shown.get(l.fromId) ?? []), l.toId]);
    asked = asked.filter((r) => (shown.get(r.id) ?? []).join("\n") !== r.links.get(f.id)!.join("\n"));
    if (!asked.length) continue;
    await db.collectionLink.deleteMany({ where: { collectionId: table.id, fieldId: f.id, toTable: f.to, fromId: { in: asked.map((r) => r.id) } } });
    const data = asked.flatMap((r) => r.links.get(f.id)!.map((toId, position) => ({ collectionId: table.id, fieldId: f.id, fromId: r.id, toTable: f.to, toId, position })));
    if (data.length) await db.collectionLink.createMany({ data, skipDuplicates: true });
  }
}

/** A linked row went for good between the check and the write (the database refused the link). */
export const linkGone = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003";

/** One relation field of many rows set to the same rows (the grid's "set a value" for the ticked rows or a whole question). */
export async function setLinksOfMany(db: Raw, table: { id: string }, f: RelationField, rowIds: string[], ids: string[], now: Date): Promise<number> {
  if (!rowIds.length) return 0;
  const store = storeTarget(f.to);
  if (store) {
    await db.$executeRaw(Prisma.sql`DELETE FROM "StoreLink" AS l WHERE l."collectionId" = ${table.id} AND l."fieldId" = ${f.id} AND l."toTable" = ${store} AND l."fromId" = ANY(${rowIds}::text[])`);
    if (ids.length) {
      await db.$executeRaw(
        Prisma.sql`INSERT INTO "StoreLink" ("collectionId", "fieldId", "fromId", "toTable", "toId", "position") SELECT ${table.id}::text, ${f.id}::text, r.id, ${store}::text, u.id, (u.pos - 1)::int FROM unnest(${rowIds}::text[]) AS r(id) CROSS JOIN unnest(${ids}::text[]) WITH ORDINALITY AS u(id, pos) ON CONFLICT DO NOTHING`,
      );
    }
    return db.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "updatedAt" = ${utc(now)} WHERE i."collectionId" = ${table.id} AND i."id" = ANY(${rowIds}::text[])`);
  }
  await db.$executeRaw(Prisma.sql`DELETE FROM "CollectionLink" AS l WHERE l."collectionId" = ${table.id} AND l."fieldId" = ${f.id} AND l."toTable" = ${f.to} AND l."fromId" = ANY(${rowIds}::text[])`);
  if (ids.length) {
    await db.$executeRaw(
      Prisma.sql`INSERT INTO "CollectionLink" ("collectionId", "fieldId", "fromId", "toTable", "toId", "position") SELECT ${table.id}::text, ${f.id}::text, r.id, ${f.to}::text, u.id, (u.pos - 1)::int FROM unnest(${rowIds}::text[]) AS r(id) CROSS JOIN unnest(${ids}::text[]) WITH ORDINALITY AS u(id, pos) WHERE r.id <> u.id ON CONFLICT DO NOTHING`,
    );
  }
  return db.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "updatedAt" = ${utc(now)} WHERE i."collectionId" = ${table.id} AND i."id" = ANY(${rowIds}::text[])`);
}

/* ---------------- Read ---------------- */

/** The rows' links, per relation field: to rows that are there (not in the trash), in each row's order. */
export type LinkView = { /** Whether the reader may see one of the store's tables (when not said: yes). A linked row of a table they may not see is told by its id alone. */ store?: (table: StoreId) => boolean };
export async function linksFor(db: Db, table: { id: string; fields: Field[] }, rowIds: string[], view: LinkView = {}): Promise<Map<string, Record<string, Linked[]>>> {
  const out = new Map<string, Record<string, Linked[]>>();
  const rels = relationsOf(table.fields);
  if (!rels.length || !rowIds.length) return out;
  // A linked row is called by its table's first words field.
  const targets = await db.collection.findMany({ where: { id: { in: [...new Set(rels.map((f) => f.to))] } }, select: { id: true, fields: true } });
  const titleOf = new Map(targets.map((c) => [c.id, fieldsOf(c).find((x) => x.type === "text")?.id ?? null]));
  for (const f of rels) {
    const store = storeTarget(f.to);
    if (store) {
      // One of the store's rows: called what its own page calls it (the same in every language).
      const may = view.store ? view.store(store) : true;
      for (const r of await storeLinksOf(db, store, table.id, f.id, rowIds)) {
        const of = out.get(r.fromId) ?? {};
        (of[f.id] ??= []).push(may ? { id: r.id, slug: r.slug, status: "PUBLISHED", title: r.label ? { ar: r.label, en: r.label, he: r.label } : null, store } : { id: r.id, slug: r.id, status: "PUBLISHED", title: null, store, hidden: true });
        out.set(r.fromId, of);
      }
      continue;
    }
    if (!titleOf.has(f.to)) continue;
    const title = titleOf.get(f.to);
    const rows = await db.$queryRaw<Array<{ fromId: string; id: string; slug: string; status: string; title: unknown }>>(
      Prisma.sql`SELECT l."fromId", t."id", t."slug", t."status"::text AS "status", ${title ? Prisma.sql`t."data"->${title}::text` : Prisma.sql`NULL::jsonb`} AS "title"
        FROM "CollectionLink" l JOIN "CollectionItem" t ON t."id" = l."toId" AND t."collectionId" = l."toTable" AND t."deletedAt" IS NULL
        WHERE l."collectionId" = ${table.id} AND l."fieldId" = ${f.id} AND l."toTable" = ${f.to} AND l."fromId" = ANY(${rowIds}::text[])
        ORDER BY l."position" ASC, l."createdAt" ASC, l."toId" ASC`,
    );
    for (const r of rows) {
      const of = out.get(r.fromId) ?? {};
      (of[f.id] ??= []).push({ id: r.id, slug: r.slug, status: r.status, title: r.title && typeof r.title === "object" && !Array.isArray(r.title) ? (r.title as Local) : null });
      out.set(r.fromId, of);
    }
  }
  return out;
}

/** Rows as the routes answer them: each relation field holds the rows it links (nothing when none). */
export async function withLinks<T extends { id: string; data: unknown }>(db: Db, table: { id: string; fields: Field[] }, rows: T[], view: LinkView = {}): Promise<T[]> {
  if (!table.fields.some((f) => f.type === "relation")) return rows;
  const links = await linksFor(db, table, rows.map((r) => r.id), view);
  return rows.map((row) => {
    const data: Record<string, unknown> = { ...(row.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : {}) };
    for (const f of table.fields) {
      if (f.type !== "relation") continue;
      const got = links.get(row.id)?.[f.id];
      if (got?.length) data[f.id] = got;
      else delete data[f.id];
    }
    return { ...row, data };
  });
}

/* ---------------- The other side ---------------- */

/** A relation as the table it links sees it: rows of `table` (this very table, for a relation to itself) link its rows through `field`. */
export type Incoming = {
  /** The column in the linked table's grid: "$from.<table address>.<field id>". */
  id: string;
  table: string;
  slug: string;
  name: unknown;
  field: string;
  fieldName: unknown;
  /** A row here is linked from one row there at most (the relation is "exclusive"). */
  single: boolean;
};
export const FROM = "$from.";
export const incomingId = (slug: string, field: string) => `${FROM}${slug}.${field}`;
/** Who links a row through one relation: how many rows (those in the trash don't count), and the first few (the last changed first). */
export type LinkedFrom = { n: number; rows: Linked[] };
export const FROM_SHOWN = 5;

/** Every relation of every table that links this table (one of the owner's by its id, one of the store's as "store:products"), in the order the tables were made. */
export async function incomingTo(db: Pick<Db, "collection">, tableId: string): Promise<Incoming[]> {
  const tables = await db.collection.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, slug: true, name: true, fields: true } });
  return tables.flatMap((c) =>
    relationsOf(fieldsOf(c))
      .filter((f) => f.to === tableId)
      .map((f) => ({ id: incomingId(c.slug, f.id), table: c.id, slug: c.slug, name: c.name, field: f.id, fieldName: f.name ?? null, single: f.exclusive === true })),
  );
}

/** For each of the rows: who links it, per relation that links their table. One question a relation, however many rows. */
export async function linkedFrom(db: Db, tableId: string, incoming: Incoming[], rowIds: string[]): Promise<Map<string, Record<string, LinkedFrom>>> {
  const out = new Map<string, Record<string, LinkedFrom>>();
  if (!incoming.length || !rowIds.length) return out;
  // A linking row is called by its own table's first words field.
  const sources = await db.collection.findMany({ where: { id: { in: [...new Set(incoming.map((x) => x.table))] } }, select: { id: true, fields: true } });
  const titleOf = new Map(sources.map((c) => [c.id, fieldsOf(c).find((x) => x.type === "text")?.id ?? null]));
  // One of the store's tables: its links are kept in their own table, under its short name.
  const kept = linkTable(tableId);
  for (const inc of incoming) {
    const title = titleOf.get(inc.table);
    const rows = await db.$queryRaw<Array<{ toId: string; id: string; slug: string; status: string; title: unknown; n: number }>>(
      Prisma.sql`SELECT x."toId", x."id", x."slug", x."status", x."title", x."n" FROM (
          SELECT l."toId", s."id", s."slug", s."status"::text AS "status", ${title ? Prisma.sql`s."data"->${title}::text` : Prisma.sql`NULL::jsonb`} AS "title",
            (count(*) OVER (PARTITION BY l."toId"))::int AS "n", row_number() OVER (PARTITION BY l."toId" ORDER BY s."updatedAt" DESC, s."id" ASC) AS "k"
          FROM ${kept.table} l JOIN "CollectionItem" s ON s."id" = l."fromId" AND s."collectionId" = l."collectionId" AND s."deletedAt" IS NULL
          WHERE l."collectionId" = ${inc.table} AND l."fieldId" = ${inc.field} AND l."toTable" = ${kept.toTable} AND l."toId" = ANY(${rowIds}::text[])
        ) x WHERE x."k" <= ${FROM_SHOWN} ORDER BY x."toId" ASC, x."k" ASC`,
    );
    for (const r of rows) {
      const of = out.get(r.toId) ?? {};
      const cell = (of[inc.id] ??= { n: r.n, rows: [] });
      cell.rows.push({ id: r.id, slug: r.slug, status: r.status, title: r.title && typeof r.title === "object" && !Array.isArray(r.title) ? (r.title as Local) : null });
      out.set(r.toId, of);
    }
  }
  return out;
}

/**
 * The store rows one relation links (from rows that aren't in the trash): the store grid's "is
 * anything linking it" is asked of this list. At most `cap` + 1 are read, so the caller can tell
 * there are more than it takes.
 */
export async function storeRowsLinked(db: Raw, inc: Pick<Incoming, "table" | "field">, store: StoreId, cap: number): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ toId: string }>>(
    Prisma.sql`SELECT DISTINCT l."toId" FROM "StoreLink" l JOIN "CollectionItem" s ON s."id" = l."fromId" AND s."collectionId" = l."collectionId" AND s."deletedAt" IS NULL
      WHERE l."collectionId" = ${inc.table} AND l."fieldId" = ${inc.field} AND l."toTable" = ${store} LIMIT ${cap + 1}`,
  );
  return rows.map((x) => x.toId);
}

/* ---------------- Deleting ---------------- */

type Rel = { table: string; field: string; to: string; onDelete: "unlink" | "cascade" | "restrict" };
/** Every relation of every table: deleting follows them wherever they lead (a row deleted with the row it links may take its own linkers along). */
export async function allRelations(db: Pick<Db, "collection">): Promise<Rel[]> {
  const tables = await db.collection.findMany({ select: { id: true, fields: true } });
  // (A relation to the store's rows isn't among them: nothing here deletes a store row, or is deleted with one.)
  return tables.flatMap((c) => relationsOf(fieldsOf(c)).filter((f) => !storeTarget(f.to)).map((f) => ({ table: c.id, field: f.id, to: f.to, onDelete: f.onDelete ?? "unlink" })));
}
const relValues = (rels: Rel[]) => Prisma.join(rels.map((r) => Prisma.sql`(${r.table}::text, ${r.field}::text, ${r.to}::text)`));

/** Who holds rows that were asked to go: a table, its relation, how many of its rows, one of them. */
export type Blocker = { table: string; slug: string; name: unknown; field: string; /** The relation's own name (ar/en/he), when it has one. */ fieldName: unknown; rows: number; sample: string };

/**
 * Rows to the trash (`which`: a condition on "CollectionItem" i), the way the relations linking
 * them chose: the rows of a "deleted with it" relation go along (and what links those, in turn);
 * a "can't be deleted" relation held by a row that stays refuses the whole act (409 ROWS_LINKED).
 * Run inside a transaction, so a refusal leaves everything as it was.
 */
export async function trashRows(db: Db, which: Prisma.Sql, now: Date): Promise<{ changed: number; withThem: number }> {
  const rels = await allRelations(db);
  const cascade = rels.filter((r) => r.onDelete === "cascade");
  const restrict = rels.filter((r) => r.onDelete === "restrict");
  const live = Prisma.sql`${which} AND i."deletedAt" IS NULL`;
  let changed: number;
  let withThem = 0;
  if (cascade.length) {
    changed = (await db.$queryRaw<Array<{ n: number }>>(Prisma.sql`SELECT count(*)::int AS n FROM "CollectionItem" i WHERE ${live}`))[0]?.n ?? 0;
    const all = await db.$executeRaw(
      Prisma.sql`WITH RECURSIVE f(s, field, t) AS (VALUES ${relValues(cascade)}), pick(id) AS (
          SELECT i."id" FROM "CollectionItem" i WHERE ${live}
          UNION
          SELECT s."id" FROM pick p JOIN "CollectionLink" l ON l."toId" = p.id JOIN f ON f.s = l."collectionId" AND f.field = l."fieldId" AND f.t = l."toTable" JOIN "CollectionItem" s ON s."id" = l."fromId" AND s."deletedAt" IS NULL
        ) UPDATE "CollectionItem" AS x SET "deletedAt" = ${utc(now)} FROM pick WHERE x."id" = pick.id`,
    );
    withThem = Math.max(0, all - changed);
  } else {
    changed = await db.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "deletedAt" = ${utc(now)} WHERE ${live}`);
  }
  if (restrict.length && changed) {
    // Rows that stay and hold one that just went, through a relation that forbids it.
    const held = await db.$queryRaw<Array<{ table: string; field: string; rows: number; sample: string }>>(
      Prisma.sql`SELECT l."collectionId" AS "table", l."fieldId" AS "field", count(DISTINCT s."id")::int AS "rows", min(s."slug") AS "sample"
        FROM "CollectionLink" l JOIN (VALUES ${relValues(restrict)}) AS f(s, field, t) ON f.s = l."collectionId" AND f.field = l."fieldId" AND f.t = l."toTable"
        JOIN "CollectionItem" t ON t."id" = l."toId" AND t."deletedAt" = ${utc(now)}
        JOIN "CollectionItem" s ON s."id" = l."fromId" AND s."deletedAt" IS NULL
        GROUP BY 1, 2 ORDER BY 3 DESC`,
    );
    if (held.length) {
      const tables = new Map((await db.collection.findMany({ where: { id: { in: held.map((h) => h.table) } }, select: { id: true, slug: true, name: true, fields: true } })).map((c) => [c.id, c]));
      const blockers: Blocker[] = held.map((h) => {
        const table = tables.get(h.table);
        return { ...h, slug: table?.slug ?? "", name: table?.name ?? null, fieldName: (table ? fieldsOf(table) : []).find((f) => f.id === h.field)?.name ?? null };
      });
      throw new AppError(409, "ROWS_LINKED", "Other rows link these rows and don't let them be deleted", { blockers });
    }
  }
  return { changed, withThem };
}

/** Rows out of the trash, and with each the rows that went there with it (same moment, through a "deleted with it" relation). */
export async function restoreRows(db: Db, which: Prisma.Sql): Promise<{ changed: number; withThem: number }> {
  const cascade = (await allRelations(db)).filter((r) => r.onDelete === "cascade");
  const trashed = Prisma.sql`${which} AND i."deletedAt" IS NOT NULL`;
  if (!cascade.length) return { changed: await db.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "deletedAt" = NULL WHERE ${trashed}`), withThem: 0 };
  const changed = (await db.$queryRaw<Array<{ n: number }>>(Prisma.sql`SELECT count(*)::int AS n FROM "CollectionItem" i WHERE ${trashed}`))[0]?.n ?? 0;
  const all = await db.$executeRaw(
    Prisma.sql`WITH RECURSIVE f(s, field, t) AS (VALUES ${relValues(cascade)}), pick(id, stamp) AS (
        SELECT i."id", i."deletedAt" FROM "CollectionItem" i WHERE ${trashed}
        UNION
        SELECT s."id", s."deletedAt" FROM pick p JOIN "CollectionLink" l ON l."toId" = p.id JOIN f ON f.s = l."collectionId" AND f.field = l."fieldId" AND f.t = l."toTable" JOIN "CollectionItem" s ON s."id" = l."fromId" AND s."deletedAt" = p.stamp
      ) UPDATE "CollectionItem" AS x SET "deletedAt" = NULL FROM pick WHERE x."id" = pick.id`,
  );
  return { changed, withThem: Math.max(0, all - changed) };
}

/* ---------------- Tables ---------------- */

/** The other tables whose relations link this one (a table that is linked can't be deleted before they let go). */
export async function tablesLinking(db: Pick<Db, "collection">, tableId: string): Promise<Array<{ id: string; slug: string; name: unknown; field: string }>> {
  const tables = await db.collection.findMany({ where: { id: { not: tableId } }, select: { id: true, slug: true, name: true, fields: true } });
  return tables.flatMap((c) => relationsOf(fieldsOf(c)).filter((f) => f.to === tableId).map((f) => ({ id: c.id, slug: c.slug, name: c.name, field: f.id })));
}

/** A relation's table has to be there (`self`: the table being saved, which a relation may link). The first that isn't, or null. */
export async function relationProblem(db: Pick<Db, "collection">, fields: Field[], self?: string): Promise<{ path: string; message: string } | null> {
  // (One of the store's own tables is always there.)
  const asked = [...new Set(relationsOf(fields).map((f) => f.to))].filter((id) => id !== self && !storeTarget(id));
  if (!asked.length) return null;
  const there = new Set((await db.collection.findMany({ where: { id: { in: asked } }, select: { id: true } })).map((c) => c.id));
  const index = fields.findIndex((f) => isRelation(f) && f.to !== self && !storeTarget(f.to) && !there.has(f.to));
  return index < 0 ? null : { path: `fields.${index}.to`, message: "No such table to link" };
}

/** A relation's links as a change of fields counts them: rows that hold any, rows that hold several, rows that share a linked row with another. */
export async function linkCounts(db: Pick<Raw, "$queryRaw">, tableId: string, fieldId: string, to: string): Promise<{ rows: number; several: number; shared: number }> {
  const got = await db.$queryRaw<Array<{ rows: number; several: number; shared: number }>>(
    Prisma.sql`WITH l AS (SELECT "fromId", "toId" FROM ${linkTable(to).table} WHERE "collectionId" = ${tableId} AND "fieldId" = ${fieldId} AND "toTable" = ${linkTable(to).toTable}),
      per AS (SELECT "fromId", count(*) AS n FROM l GROUP BY 1),
      dup AS (SELECT "toId" FROM l GROUP BY 1 HAVING count(*) > 1)
      SELECT (SELECT count(*)::int FROM per) AS "rows", (SELECT count(*)::int FROM per WHERE n > 1) AS "several", (SELECT count(DISTINCT l."fromId")::int FROM l JOIN dup ON dup."toId" = l."toId") AS "shared"`,
  );
  return got[0] ?? { rows: 0, several: 0, shared: 0 };
}
