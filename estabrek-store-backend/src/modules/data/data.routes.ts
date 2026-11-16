/**
 * The automatic API (B4): every table the owner opens gets these routes, with no code written
 * for it. Who gets in is the table's own choice, act by act (lib/dataApi.ts), and a key's
 * (lib/apiKeys.ts; made in the admin → الـ API والمفاتيح). Rows are written the way the admin
 * writes them (lib/rowWrites.ts), so a field's rules hold here too.
 *
 * A key goes in `X-Api-Key: ek_…` (or `Authorization: Bearer ek_…`), never in the address. A
 * signed-in shopper sends their own token in `Authorization: Bearer …` (the one /v1/customer/auth gives).
 *
 * GET    /v1/data                      — the tables this caller reaches, their fields, what it may do
 * GET    /v1/data/openapi.json         — the same as an OpenAPI document (lib/apiDocs.ts): only what this caller could call
 * GET    /v1/data/:table               — a page of rows: ?page ?pageSize ?sort=-price,title ?search ?lang
 *                                        ?status ?fields ?expand ?mine ?shown, filters as field[question]=value, ?match=any
 * GET    /v1/data/:table/:row          — one row, by id or address
 * POST   /v1/data/:table               { values, slug?, status?, lang? } — a new row (without a key: a draft)
 * PATCH  /v1/data/:table/:row          { values?, slug?, status?, lang? } — some of a row; the rest stays
 * DELETE /v1/data/:table/:row          — to the trash (30 days), as the relations linking it allow
 *
 * Who sees what: anyone, published rows; a shopper, also their own rows (a table open "to the
 * shopper" shows them nothing else; `?mine=1` asks for them where everyone reads); a key, every
 * row outside the trash. Changing and deleting need a key, or are a shopper's on their own rows.
 * Fields the owner marked private are a key's alone: not answered, asked about or written without one.
 *
 * A shopper's own rows to read are the ones they added and the ones that point at them (a field of
 * kind "customer" holding their email). Changing and deleting stay with the one who added the row.
 * `?mine=added` and `?mine=tome` ask for one half of them. `?shown=1` answers each row also as a page
 * shows it (lib/dataApi.ts `asShown`): what a shop page's list reads (lib/collectionTree.ts LIST_FEEDS).
 */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { COLLECTION_SLUG } from "../../lib/collections.js";
import type { Field } from "../../lib/collectionTree.js";
import { ACTS, type Act, type KeyLite } from "../../lib/apiKeys.js";
import { apiCaller, callerOf, ipOf, type Caller } from "../../middleware/apiCaller.js";
import { openApi } from "../../lib/apiDocs.js";
import { API_LIMITS, DATA_API_BASE, allow, apiRow, askable, docTables, fieldView, isOpen, listAsk, mineAsked, reachFields, seenFields, shapeAsk, tableFrom, type ApiRow, type ApiTable, type As, type LinkModes, type ListAsk, type Mine, type Viewer } from "../../lib/dataApi.js";
import { queryRows } from "../../lib/dataQuery.js";
import { LANGS } from "../../lib/dataRows.js";
import { switchedOff } from "../../lib/featureGate.js";
import { emitRow } from "../../lib/fnTriggers.js";
import { hit } from "../../lib/hitLimit.js";
import { namedRows, relationsOf, trashRows, withLinks } from "../../lib/links.js";
import { LONG, StatusIn, addRow, changeRow, refresh } from "../../lib/rowWrites.js";
import { shownRow } from "../../lib/schemaChange.js";

const r = Router();
const MINUTE = 60_000;

// Who is asking: a key, a signed-in shopper, or anyone (middleware/apiCaller.ts).
r.use(apiCaller);

/* ---------------- The table, and whether this caller gets in ---------------- */

const TABLE = { id: true, slug: true, name: true, fields: true, api: true } as const;
/** The tables, but for the ones of a feature that is switched off (admin → ميزاتي): those answer as closed. */
const everyTable = async () => {
  const [all, off] = await Promise.all([prisma.collection.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: TABLE }), switchedOff()]);
  return all.filter((c) => !off.tables.has(c.id)).map(tableFrom);
};
const signIn = () => new AppError(401, "SIGN_IN_NEEDED", "This needs a signed-in shopper");

/** `fields`: the table's fields as this caller sees and writes them (the private ones are a key's alone). */
async function enter(req: Request, act: Act): Promise<{ table: ApiTable; as: As; fields: Field[]; who: Caller }> {
  const slug = String(req.params.table ?? "").toLowerCase();
  const c = COLLECTION_SLUG.test(slug) ? await prisma.collection.findUnique({ where: { slug }, select: TABLE }) : null;
  const table = c ? tableFrom(c) : null;
  // A closed table answers as one that isn't there; so does one whose feature is switched off.
  if (!table || !isOpen(table.access) || (await switchedOff()).tables.has(table.id)) throw new AppError(404, "NOT_FOUND", "No such table, or it isn't open");
  const who = callerOf(req);
  const verdict = allow(table.access, act, who.key, table.id, who.customer);
  if ("as" in verdict) return { table, as: verdict.as, fields: seenFields(table, verdict.as), who };
  if (verdict.no === "keyNeeded") throw new AppError(401, "KEY_NEEDED", "This needs an API key");
  if (verdict.no === "signInNeeded") throw signIn();
  throw new AppError(403, "NOT_ALLOWED", verdict.no === "closed" ? "This table isn't open for that" : "This key doesn't reach that");
}

/**
 * Whose rows a read is about: a shopper's own (the table is theirs to read, or `?mine=1` on a table
 * everyone reads), else as the caller got in.
 */
function reach(as: As, who: Caller, query: Record<string, unknown>): { sees: As; owner: string | null; /** The shopper's email: rows pointing at it are theirs to read too. */ email: string | null; /** Which of their rows a list is about. */ part: Mine } {
  const mine = mineAsked(query);
  if (mine && as === "key") throw new AppError(400, "BAD_QUERY", "mine is a signed-in shopper's question, not a key's");
  if (mine && !who.customer) throw signIn();
  return as === "customer" || mine ? { sees: "customer", owner: who.customer, email: who.email, part: mine ?? "all" } : { sees: as, owner: null, email: null, part: "all" };
}

/**
 * A shopper's rows to read, as a condition on a list: the ones they added, and the ones a field of `to` points
 * at them; or (`part`) one half of those.
 */
function theirs(owner: string, email: string | null, to: string[], part: Mine = "all"): Prisma.Sql {
  const added = Prisma.sql`i."ownerId" = ${owner}`;
  const pointed = email && to.length ? Prisma.sql`(${Prisma.join(to.map((id) => Prisma.sql`lower(i."data"->>${id}::text) = ${email}`), " OR ")})` : null;
  if (part === "added") return added;
  if (part === "tome") return pointed ?? Prisma.sql`FALSE`;
  return pointed ? Prisma.sql`(${added} OR ${pointed})` : added;
}

/**
 * One row by its id or address. `owner`: only that shopper's (one they added; with `to`, also one that points at
 * their `email` through one of those fields).
 */
async function rowOf(table: ApiTable, name: string, sees: As, owner: string | null, email: string | null = null, to: string[] = []) {
  const whose = !owner ? {} : email && to.length ? { AND: [{ OR: [{ ownerId: owner }, ...to.map((id) => ({ data: { path: [id], equals: email } }))] }] } : { ownerId: owner };
  const found =
    name && name.length <= 100
      ? await prisma.collectionItem.findMany({ where: { collectionId: table.id, deletedAt: null, OR: [{ id: name }, { slug: name.toLowerCase() }], ...(sees === "public" ? { status: "PUBLISHED" as const } : {}), ...whose }, take: 2 })
      : [];
  const row = found.find((x) => x.id === name) ?? found[0];
  if (!row) throw new AppError(404, "NOT_FOUND", "No such row");
  return row;
}

/* ---------------- Rows out ---------------- */

type Links = { modes: LinkModes; targets: Map<string, ApiTable> };
const NO_LINKS: Links = { modes: new Map(), targets: new Map() };

/**
 * Each relation among `fields`: the table it links, and how much of it this caller sees: every
 * linked row through a key, the published ones where the table is open to everyone. A table the
 * caller can't read that way is left out (a shopper's own rows aren't followed through a link).
 */
async function linkModes(table: ApiTable, fields: Field[], key: KeyLite | null): Promise<Links> {
  const rels = relationsOf(fields);
  if (!rels.length) return NO_LINKS;
  const modes: LinkModes = new Map();
  const targets = new Map<string, ApiTable>([[table.id, table]]);
  const others = [...new Set(rels.map((f) => f.to).filter((id) => id !== table.id))];
  if (others.length) for (const c of await prisma.collection.findMany({ where: { id: { in: others } }, select: TABLE })) targets.set(c.id, tableFrom(c));
  for (const f of rels) {
    const target = targets.get(f.to);
    const verdict = target ? allow(target.access, "read", key, target.id) : null;
    if (verdict && "as" in verdict) modes.set(f.id, verdict.as === "key" ? "all" : "published");
  }
  return { modes, targets };
}

type Stored = { id: string; slug: string; status: string; data: unknown; createdAt: Date; updatedAt: Date; publishedAt: Date | null; ownerId?: string | null };

/**
 * Who reads, when it isn't a key: the signed-in shopper (if any), and the names of the shoppers these rows point
 * at (one question for the page). A key is answered the emails themselves and needs none of it.
 * `owners`: also the names of who added these rows (they are the shopper's own rows, shown as a page shows them).
 */
async function viewerOf(as: As, who: Caller, fields: Field[], rows: Stored[], owners = false): Promise<Viewer | undefined> {
  if (as === "key") return undefined;
  const to = reachFields(fields);
  const emails = to.length ? [...new Set(rows.flatMap((row) => to.map((id) => (row.data as Record<string, unknown> | null)?.[id]).filter((v): v is string => typeof v === "string" && !!v)))] : [];
  const ids = owners && who.customer ? [...new Set(rows.map((row) => row.ownerId).filter((v): v is string => !!v))] : [];
  const [users, added] = await Promise.all([
    emails.length ? prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true, name: true } }) : [],
    ids.length ? prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [],
  ]);
  return { id: who.customer, email: who.email, names: new Map(users.map((u) => [u.email, u.name ?? ""])), ...(ids.length ? { owners: new Map(added.map((u) => [u.id, u.name ?? ""])) } : {}) };
}

/** What to answer rows with: the language, the fields, the relations opened; also as a page shows them; and whether they are a shopper's own rows. */
type ShapeAsk = Pick<ListAsk, "lang" | "pick" | "expand"> & { shown?: boolean; theirs?: boolean };

/** Rows as this caller is answered them: its fields, its relations, the linked rows it may see, and who a row points at as far as this caller may know. */
async function shape(table: ApiTable, as: As, who: Caller, rows: Stored[], ask: ShapeAsk, known?: Links): Promise<ApiRow[]> {
  const key = who.key;
  const fields = seenFields(table, as);
  const { modes, targets } = known ?? (await linkModes(table, fields, key));
  const viewer = await viewerOf(as, who, fields, rows, !!ask.shown && !!ask.theirs);
  let shown = await withLinks(prisma, table, rows.map((row) => shownRow(row, table.fields)));
  // A linked row is called by its table's first words field: not when that field is private there.
  const untitled = relationsOf(fields).filter((f) => {
    const target = targets.get(f.to);
    const title = target?.fields.find((x) => x.type === "text")?.id;
    return modes.get(f.id) === "published" && !!title && !!target?.private.includes(title);
  });
  if (untitled.length)
    shown = shown.map((row) => {
      const data = { ...(row.data as Record<string, unknown>) };
      for (const f of untitled) if (Array.isArray(data[f.id])) data[f.id] = (data[f.id] as Array<Record<string, unknown>>).map((x) => ({ ...x, title: null }));
      return { ...row, data };
    });
  // A relation opened: its linked rows whole (their own relations aside), as far as the caller sees that table.
  const expand = new Map<string, Map<string, ApiRow>>();
  for (const id of ask.expand) {
    const field = relationsOf(fields).find((f) => f.id === id);
    const mode = modes.get(id);
    const target = field ? targets.get(field.to) : undefined;
    if (!field || !mode || !target) throw new AppError(403, "NOT_ALLOWED", `"${id}" links a table that isn't open to you`);
    const ids = [...new Set(shown.flatMap((row) => ((row.data as Record<string, unknown>)[id] as Array<{ id: string }> | undefined)?.map((x) => x.id) ?? []))];
    const linked = ids.length ? await prisma.collectionItem.findMany({ where: { id: { in: ids }, collectionId: target.id, deletedAt: null, ...(mode === "published" ? { status: "PUBLISHED" as const } : {}) } }) : [];
    const theirs = seenFields(target, mode === "all" ? "key" : "public");
    expand.set(id, new Map(linked.map((row) => [row.id, apiRow(shownRow(row, target.fields), theirs, { lang: ask.lang })])));
  }
  return shown.map((row) => apiRow(row, fields, { lang: ask.lang, pick: ask.pick, links: modes, expand, viewer, ...(ask.shown ? { shown: { id: table.id, slug: table.slug } } : {}) }));
}

r.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const who = callerOf(req);
    const tables = docTables(await everyTable(), who.key, who.customer).map((t) => ({
      table: t.slug,
      name: t.name,
      acts: Object.fromEntries(ACTS.map((act) => [act, !!t.acts[act]])),
      fields: t.fields.filter((f) => f.type !== "relation" || t.links.has(f.id)).map(fieldView),
    }));
    res.json({ tables, limits: { pageSize: API_LIMITS.pageSize } });
  }),
);

// Before "/:table": a table's address never has a dot, so this name is no table's.
r.get(
  "/openapi.json",
  asyncHandler(async (req: Request, res: Response) => {
    const who = callerOf(req);
    res.json(openApi(docTables(await everyTable(), who.key, who.customer), { server: DATA_API_BASE }));
  }),
);

r.get(
  "/:table",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, as, fields, who } = await enter(req, "read");
    const query = req.query as Record<string, unknown>;
    const { sees, owner, email, part } = reach(as, who, query);
    const ask = listAsk(fields, query, sees);
    const links = await linkModes(table, fields, who.key);
    // A relation to a table the caller can't read isn't answered, so it isn't asked about either
    // (what a filter lets through would say what that table holds).
    const hidden = [...ask.q.filters, ...ask.q.sort].find((x) => fields.some((f) => f.id === x.field && f.type === "relation") && !links.modes.has(x.field));
    if (hidden) throw new AppError(400, "BAD_QUERY", `No column "${hidden.field}" in this table`);
    // Asked of the fields the caller sees and may ask about: a search doesn't look into a private one, nor (without a key) into who a row points at.
    const page = await queryRows(prisma, { id: table.id, fields: askable(fields, as) }, ask.q, owner ? theirs(owner, email, reachFields(fields), part) : undefined);
    res.json({ data: await shape(table, as, who, page.rows, { ...ask, theirs: sees === "customer" }, links), page: ask.q.page, pageSize: ask.q.pageSize, total: page.total, pages: Math.ceil(page.total / ask.q.pageSize) });
  }),
);

r.get(
  "/:table/:row",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, as, fields, who } = await enter(req, "read");
    const query = req.query as Record<string, unknown>;
    const { sees, owner, email } = reach(as, who, query);
    const ask = shapeAsk(fields, query);
    const row = await rowOf(table, String(req.params.row), sees, owner, email, reachFields(fields));
    res.json((await shape(table, as, who, [row], { ...ask, theirs: sees === "customer" }))[0]);
  }),
);

/* ---------------- Rows in ---------------- */

const Lang = z.enum(LANGS).default("ar");
const AnyCase = z.preprocess((v) => (typeof v === "string" ? v.toUpperCase() : v), StatusIn);
const CreateBody = z.object({ slug: z.string().max(100).optional(), status: AnyCase.optional(), values: z.record(z.string().max(60), z.unknown()).default({}), lang: Lang }).strict();
const ChangeBody = z.object({ slug: z.string().max(100).optional(), status: AnyCase.optional(), values: z.record(z.string().max(40), z.unknown()).optional(), lang: Lang }).strict();
type Problem = { field: string; message: string; value?: string };
const invalid = (issues: Problem[]) => new AppError(400, "ROW_INVALID", "Some values are wrong", { issues });
const plain = { lang: null, pick: null, expand: [] as string[] };

/**
 * What only a key may write: a row's status and address, and the private fields (named as columns
 * that aren't there: the same answer a misspelt one gets).
 */
function keyOnly(table: ApiTable, as: As, body: { status?: unknown; slug?: unknown; values?: Record<string, unknown> }): Problem[] {
  if (as === "key") return [];
  return [
    ...(body.status !== undefined ? [{ field: "status", message: "Only a key sets the status" }] : []),
    ...(body.slug !== undefined ? [{ field: "slug", message: "Only a key sets the address" }] : []),
    ...Object.keys(body.values ?? {}).filter((k) => table.private.includes(k.split(".")[0])).map((k) => ({ field: k, message: "No such column" })),
  ];
}

/** So many rows a minute from one place (anyone), or from one shopper. False once they are used up. */
async function mayWrite(req: Request, res: Response, table: ApiTable, as: As, who: Caller): Promise<boolean> {
  if (as === "key") return true;
  const { count, resetAt } = as === "customer" ? await hit(`cust:${table.id}:${who.customer}`, MINUTE) : await hit(`pub:${table.id}:${ipOf(req)}`, MINUTE);
  if (count <= (as === "customer" ? API_LIMITS.customerWritesPerMinute : API_LIMITS.publicWritesPerMinute)) return true;
  res.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
  res.status(429).json({ error: "RATE_LIMIT", message: "Too many rows from here this minute", retryAt: resetAt });
  return false;
}

/**
 * The rows a write asks to link: only in tables this caller reads, and (without a key) only
 * published rows, so nobody learns from a refusal what a closed table holds.
 */
async function linkIssues(table: ApiTable, fields: Field[], key: KeyLite | null, values: Record<string, unknown>): Promise<Problem[]> {
  const asked = relationsOf(fields).filter((f) => values[f.id] !== undefined);
  if (!asked.length) return [];
  const { modes, targets } = await linkModes(table, fields, key);
  const issues: Problem[] = [];
  for (const f of asked) {
    const mode = modes.get(f.id);
    if (!mode) issues.push({ field: f.id, message: "The table it links isn't open to you" });
    else if (mode === "published") {
      const names = namedRows(values[f.id]) ?? [];
      const found = names.length ? await prisma.collectionItem.findMany({ where: { collectionId: targets.get(f.to)!.id, deletedAt: null, status: "PUBLISHED", OR: [{ id: { in: names } }, { slug: { in: names.map((n) => n.toLowerCase()) } }] }, select: { id: true, slug: true } }) : [];
      const missing = names.find((n) => !found.some((x) => x.id === n || x.slug === n.toLowerCase()));
      if (missing) issues.push({ field: f.id, message: "No such row", value: missing });
    }
  }
  return issues;
}

/** What a key wrote, in the activity log under the key's name (field names, never values). */
function logWrite(req: Request, key: KeyLite, table: ApiTable, verb: "create" | "update" | "delete", rowId: string, fields: string[]) {
  prisma.adminAuditLog
    .create({ data: { adminUserId: null, actorEmail: `API key: ${key.name} (${key.prefix}…)`, area: "data-api", verb, method: req.method, path: `/data/${table.slug}${verb === "create" ? "" : "/:id"}`, targetId: rowId, status: verb === "create" ? 201 : 200, fields: fields.slice(0, 40).map((k) => k.slice(0, 64)), ip: req.ip, userAgent: (req.get("user-agent") ?? "").slice(0, 300) || null } })
    .catch(() => {
      /* the log must never break a write */
    });
}

r.post(
  "/:table",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, as, fields, who } = await enter(req, "create");
    const body = CreateBody.parse(req.body ?? {});
    // Anyone's rows (a shopper's too) wait as drafts with an address of the table's making; and only so many a minute.
    const refused = keyOnly(table, as, body);
    if (refused.length) throw invalid(refused);
    if (!(await mayWrite(req, res, table, as, who))) return;
    const links = await linkIssues(table, fields, who.key, body.values);
    if (links.length) throw invalid(links);
    // A signed-in shopper's row is theirs, also where anyone may add.
    const row = await addRow(table, { slug: body.slug, status: body.status, values: body.values, ownerId: as === "key" ? null : who.customer }, body.lang);
    if (!row) throw new AppError(500, "ROW_NOT_SAVED", "The row wasn't saved");
    if (as === "key" && who.key) logWrite(req, who.key, table, "create", row.id, Object.keys(body.values));
    res.status(201).json((await shape(table, as, who, [row], plain))[0]);
  }),
);

r.patch(
  "/:table/:row",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, as, fields, who } = await enter(req, "update");
    const body = ChangeBody.parse(req.body ?? {});
    const refused = keyOnly(table, as, body);
    if (refused.length) throw invalid(refused);
    // A shopper changes their own rows only: another's answers as a row that isn't there.
    const was = await rowOf(table, String(req.params.row), as, as === "customer" ? who.customer : null);
    if (!(await mayWrite(req, res, table, as, who))) return;
    const links = await linkIssues(table, fields, who.key, body.values ?? {});
    if (links.length) throw invalid(links);
    const saved = await changeRow(table, was, body);
    if (as === "key" && who.key) logWrite(req, who.key, table, "update", saved.id, [...Object.keys(body.values ?? {}), ...(body.status ? ["status"] : []), ...(body.slug !== undefined ? ["slug"] : [])]);
    res.json((await shape(table, as, who, [saved], plain))[0]);
  }),
);

r.delete(
  "/:table/:row",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, as, who } = await enter(req, "delete");
    const row = await rowOf(table, String(req.params.row), as, as === "customer" ? who.customer : null);
    if (!(await mayWrite(req, res, table, as, who))) return;
    // To the trash, as the relations that link it chose: unlinked, deleted with it, or refused (409 ROWS_LINKED).
    const { withThem } = await prisma.$transaction((tx) => trashRows(tx, Prisma.sql`i."collectionId" = ${table.id} AND i."id" = ${row.id}`, new Date()), LONG);
    refresh();
    emitRow("deleted", table.id, row);
    if (as === "key" && who.key) logWrite(req, who.key, table, "delete", row.id, []);
    res.json({ ok: true, id: row.id, ...(withThem ? { withThem } : {}) });
  }),
);

export { forgetShoppers } from "../../middleware/apiCaller.js";
export default r;
