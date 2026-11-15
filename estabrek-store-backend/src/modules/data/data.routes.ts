/**
 * The automatic API (B4): every table the owner opens gets these routes, with no code written
 * for it. Who gets in is the table's own choice, act by act (lib/dataApi.ts), and a key's
 * (lib/apiKeys.ts; made in the admin → الـ API والمفاتيح). Rows are written the way the admin
 * writes them (lib/rowWrites.ts), so a field's rules hold here too.
 *
 * A key goes in `X-Api-Key: ek_…` (or `Authorization: Bearer ek_…`), never in the address.
 *
 * GET    /v1/data                      — the tables this caller reaches, their fields, what it may do
 * GET    /v1/data/openapi.json         — the same as an OpenAPI document (lib/apiDocs.ts): only what this caller could call
 * GET    /v1/data/:table               — a page of rows: ?page ?pageSize ?sort=-price,title ?search ?lang
 *                                        ?status ?fields ?expand, filters as field[question]=value, ?match=any
 * GET    /v1/data/:table/:row          — one row, by id or address
 * POST   /v1/data/:table               { values, slug?, status?, lang? } — a new row (without a key: a draft)
 * PATCH  /v1/data/:table/:row          { values?, slug?, status?, lang? } — some of a row; the rest stays
 * DELETE /v1/data/:table/:row          — to the trash (30 days), as the relations linking it allow
 *
 * Without a key only published rows are seen. Changing and deleting always need a key.
 */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { normalizeIp } from "../../utils/ip.js";
import { COLLECTION_SLUG } from "../../lib/collections.js";
import { ACTS, KEY_MARK, findKey, keyState, looksLikeKey, touchKey, type Act, type KeyLite } from "../../lib/apiKeys.js";
import { openApi } from "../../lib/apiDocs.js";
import { API_LIMITS, DATA_API_BASE, allow, apiRow, docTables, fieldView, isOpen, listAsk, shapeAsk, tableFrom, type ApiRow, type ApiTable, type As, type LinkModes, type ListAsk } from "../../lib/dataApi.js";
import { queryRows } from "../../lib/dataQuery.js";
import { LANGS } from "../../lib/dataRows.js";
import { hit } from "../../lib/hitLimit.js";
import { namedRows, relationsOf, trashRows, withLinks } from "../../lib/links.js";
import { LONG, StatusIn, addRow, changeRow, refresh } from "../../lib/rowWrites.js";
import { shownRow } from "../../lib/schemaChange.js";

declare module "express-serve-static-core" {
  interface Request {
    /** The API key this request came with (checked), or null. */
    apiKey?: KeyLite | null;
  }
}

const r = Router();
const MINUTE = 60_000;
const ipOf = (req: Request) => normalizeIp(req.ip || "") || "unknown";

/* ---------------- The key, when one is sent ---------------- */

function sentKey(req: Request): string | null {
  const own = req.get("x-api-key")?.trim();
  if (own) return own;
  const header = req.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // Other tokens in that header (an admin's, a shopper's) aren't keys: the request is anyone's.
  return bearer.startsWith(KEY_MARK) ? bearer : null;
}

r.use(
  asyncHandler(async (req: Request, res: Response, next: () => void) => {
    // Rows change under the same address: nothing here is kept by a cache on the way.
    res.setHeader("Cache-Control", "no-store");
    // A page on another address (the admin's try-it panel, the shop) may read these.
    res.setHeader("Access-Control-Expose-Headers", "X-RateLimit-Key-Limit, X-RateLimit-Key-Remaining, X-RateLimit-Key-Reset, Retry-After");
    const sent = sentKey(req);
    if (!sent) {
      req.apiKey = null;
      return next();
    }
    // A key that is wrong never falls back to "anyone": the caller should know its key doesn't work.
    const key = looksLikeKey(sent) ? await findKey(sent) : null;
    if (!key) throw new AppError(401, "INVALID_KEY", "No such API key");
    const state = keyState(key);
    if (state === "revoked") throw new AppError(401, "KEY_REVOKED", "This API key was revoked");
    if (state === "expired") throw new AppError(401, "KEY_EXPIRED", "This API key has expired");
    const { count, resetAt } = await hit(`key:${key.id}`, MINUTE);
    res.setHeader("X-RateLimit-Key-Limit", String(key.perMinute));
    res.setHeader("X-RateLimit-Key-Remaining", String(Math.max(0, key.perMinute - count)));
    res.setHeader("X-RateLimit-Key-Reset", String(Math.ceil(resetAt / 1000)));
    if (count > key.perMinute) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
      return res.status(429).json({ error: "RATE_LIMIT_KEY", message: "This key's requests for this minute are used up", retryAt: resetAt });
    }
    req.apiKey = key;
    touchKey(key.id, ipOf(req));
    next();
  }),
);

/* ---------------- The table, and whether this caller gets in ---------------- */

const TABLE = { id: true, slug: true, name: true, fields: true, api: true } as const;
const everyTable = async () => (await prisma.collection.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: TABLE })).map(tableFrom);

async function enter(req: Request, act: Act): Promise<{ table: ApiTable; as: As }> {
  const slug = String(req.params.table ?? "").toLowerCase();
  const c = COLLECTION_SLUG.test(slug) ? await prisma.collection.findUnique({ where: { slug }, select: TABLE }) : null;
  const table = c ? tableFrom(c) : null;
  // A closed table answers as one that isn't there.
  if (!table || !isOpen(table.access)) throw new AppError(404, "NOT_FOUND", "No such table, or it isn't open");
  const verdict = allow(table.access, act, req.apiKey ?? null, table.id);
  if ("as" in verdict) return { table, as: verdict.as };
  if (verdict.no === "keyNeeded") throw new AppError(401, "KEY_NEEDED", "This needs an API key");
  throw new AppError(403, "NOT_ALLOWED", verdict.no === "closed" ? "This table isn't open for that" : "This key doesn't reach that");
}

async function rowOf(table: ApiTable, name: string, as: As) {
  const found =
    name && name.length <= 100
      ? await prisma.collectionItem.findMany({ where: { collectionId: table.id, deletedAt: null, OR: [{ id: name }, { slug: name.toLowerCase() }], ...(as === "public" ? { status: "PUBLISHED" as const } : {}) }, take: 2 })
      : [];
  const row = found.find((x) => x.id === name) ?? found[0];
  if (!row) throw new AppError(404, "NOT_FOUND", "No such row");
  return row;
}

/* ---------------- Rows out ---------------- */

/** Each relation of the table: the table it links, and how much of it this caller sees (a table it can't read is left out). */
async function linkModes(table: ApiTable, key: KeyLite | null): Promise<{ modes: LinkModes; targets: Map<string, ApiTable> }> {
  const modes: LinkModes = new Map();
  const targets = new Map<string, ApiTable>([[table.id, table]]);
  const rels = relationsOf(table.fields);
  const others = [...new Set(rels.map((f) => f.to).filter((id) => id !== table.id))];
  if (others.length) for (const c of await prisma.collection.findMany({ where: { id: { in: others } }, select: TABLE })) targets.set(c.id, tableFrom(c));
  for (const f of rels) {
    const target = targets.get(f.to);
    const verdict = target ? allow(target.access, "read", key, target.id) : null;
    if (verdict && "as" in verdict) modes.set(f.id, verdict.as === "key" ? "all" : "published");
  }
  return { modes, targets };
}

type Stored = { id: string; slug: string; status: string; data: unknown; createdAt: Date; updatedAt: Date; publishedAt: Date | null };
type Links = Awaited<ReturnType<typeof linkModes>>;
const NO_LINKS: Links = { modes: new Map(), targets: new Map() };

async function shape(table: ApiTable, key: KeyLite | null, rows: Stored[], ask: Pick<ListAsk, "lang" | "pick" | "expand">, links?: Links): Promise<ApiRow[]> {
  const shown = await withLinks(prisma, table, rows.map((row) => shownRow(row, table.fields)));
  const rels = relationsOf(table.fields);
  const { modes, targets } = links ?? (rels.length ? await linkModes(table, key) : NO_LINKS);
  // A relation opened: its linked rows whole (their own relations aside), as far as the caller sees that table.
  const expand = new Map<string, Map<string, ApiRow>>();
  for (const id of ask.expand) {
    const field = rels.find((f) => f.id === id);
    const mode = modes.get(id);
    const target = field ? targets.get(field.to) : undefined;
    if (!field || !mode || !target) throw new AppError(403, "NOT_ALLOWED", `"${id}" links a table that isn't open to you`);
    const ids = [...new Set(shown.flatMap((row) => ((row.data as Record<string, unknown>)[id] as Array<{ id: string }> | undefined)?.map((x) => x.id) ?? []))];
    const linked = ids.length ? await prisma.collectionItem.findMany({ where: { id: { in: ids }, collectionId: target.id, deletedAt: null, ...(mode === "published" ? { status: "PUBLISHED" as const } : {}) } }) : [];
    expand.set(id, new Map(linked.map((row) => [row.id, apiRow(shownRow(row, target.fields), target.fields, { lang: ask.lang })])));
  }
  return shown.map((row) => apiRow(row, table.fields, { lang: ask.lang, pick: ask.pick, links: modes, expand }));
}

r.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const key = req.apiKey ?? null;
    const tables = (await everyTable()).flatMap((table) => {
      const acts = Object.fromEntries(ACTS.map((act) => [act, "as" in allow(table.access, act, key, table.id)])) as Record<Act, boolean>;
      return ACTS.some((act) => acts[act]) ? [{ table: table.slug, name: table.name, acts, fields: table.fields.map(fieldView) }] : [];
    });
    res.json({ tables, limits: { pageSize: API_LIMITS.pageSize } });
  }),
);

// Before "/:table": a table's address never has a dot, so this name is no table's.
r.get(
  "/openapi.json",
  asyncHandler(async (req: Request, res: Response) => {
    res.json(openApi(docTables(await everyTable(), req.apiKey ?? null), { server: DATA_API_BASE }));
  }),
);

r.get(
  "/:table",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, as } = await enter(req, "read");
    const ask = listAsk(table.fields, req.query as Record<string, unknown>, as);
    const key = req.apiKey ?? null;
    const rels = relationsOf(table.fields);
    const links = rels.length ? await linkModes(table, key) : NO_LINKS;
    // A relation to a table the caller can't read isn't answered, so it isn't asked about either
    // (what a filter lets through would say what that table holds).
    const hidden = [...ask.q.filters, ...ask.q.sort].find((x) => rels.some((f) => f.id === x.field) && !links.modes.has(x.field));
    if (hidden) throw new AppError(400, "BAD_QUERY", `No column "${hidden.field}" in this table`);
    const page = await queryRows(prisma, table, ask.q);
    res.json({ data: await shape(table, key, page.rows, ask, links), page: ask.q.page, pageSize: ask.q.pageSize, total: page.total, pages: Math.ceil(page.total / ask.q.pageSize) });
  }),
);

r.get(
  "/:table/:row",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, as } = await enter(req, "read");
    const ask = shapeAsk(table.fields, req.query as Record<string, unknown>);
    const row = await rowOf(table, String(req.params.row), as);
    res.json((await shape(table, req.apiKey ?? null, [row], ask))[0]);
  }),
);

/* ---------------- Rows in ---------------- */

const Lang = z.enum(LANGS).default("ar");
const AnyCase = z.preprocess((v) => (typeof v === "string" ? v.toUpperCase() : v), StatusIn);
const CreateBody = z.object({ slug: z.string().max(100).optional(), status: AnyCase.optional(), values: z.record(z.string().max(60), z.unknown()).default({}), lang: Lang }).strict();
const ChangeBody = z.object({ slug: z.string().max(100).optional(), status: AnyCase.optional(), values: z.record(z.string().max(40), z.unknown()).optional(), lang: Lang }).strict();
const invalid = (issues: Array<{ field: string; message: string; value?: string }>) => new AppError(400, "ROW_INVALID", "Some values are wrong", { issues });
const plain = { lang: null, pick: null, expand: [] as string[] };

/**
 * The rows a write asks to link: only in tables this caller reads, and (without a key) only
 * published rows, so nobody learns from a refusal what a closed table holds.
 */
async function linkIssues(table: ApiTable, key: KeyLite | null, values: Record<string, unknown>) {
  const asked = relationsOf(table.fields).filter((f) => values[f.id] !== undefined);
  if (!asked.length) return [];
  const { modes, targets } = await linkModes(table, key);
  const issues: Array<{ field: string; message: string; value?: string }> = [];
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
    const { table, as } = await enter(req, "create");
    const key = req.apiKey ?? null;
    const body = CreateBody.parse(req.body ?? {});
    if (as === "public") {
      // Anyone's rows wait as drafts with an address of the table's making; and only so many a minute from one place.
      const refused = [...(body.status !== undefined ? [{ field: "status", message: "Only a key sets the status" }] : []), ...(body.slug !== undefined ? [{ field: "slug", message: "Only a key sets the address" }] : [])];
      if (refused.length) throw invalid(refused);
      const { count, resetAt } = await hit(`pub:${table.id}:${ipOf(req)}`, MINUTE);
      if (count > API_LIMITS.publicWritesPerMinute) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
        return res.status(429).json({ error: "RATE_LIMIT", message: "Too many rows from here this minute", retryAt: resetAt });
      }
    }
    const links = await linkIssues(table, key, body.values);
    if (links.length) throw invalid(links);
    const row = await addRow(table, { slug: body.slug, status: body.status, values: body.values }, body.lang);
    if (!row) throw new AppError(500, "ROW_NOT_SAVED", "The row wasn't saved");
    if (as === "key" && key) logWrite(req, key, table, "create", row.id, Object.keys(body.values));
    res.status(201).json((await shape(table, key, [row], plain))[0]);
  }),
);

r.patch(
  "/:table/:row",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, as } = await enter(req, "update");
    const key = req.apiKey ?? null;
    const body = ChangeBody.parse(req.body ?? {});
    const was = await rowOf(table, String(req.params.row), as);
    const links = await linkIssues(table, key, body.values ?? {});
    if (links.length) throw invalid(links);
    const saved = await changeRow(table, was, body);
    if (key) logWrite(req, key, table, "update", saved.id, [...Object.keys(body.values ?? {}), ...(body.status ? ["status"] : []), ...(body.slug !== undefined ? ["slug"] : [])]);
    res.json((await shape(table, key, [saved], plain))[0]);
  }),
);

r.delete(
  "/:table/:row",
  asyncHandler(async (req: Request, res: Response) => {
    const { table, as } = await enter(req, "delete");
    const row = await rowOf(table, String(req.params.row), as);
    // To the trash, as the relations that link it chose: unlinked, deleted with it, or refused (409 ROWS_LINKED).
    const { withThem } = await prisma.$transaction((tx) => trashRows(tx, Prisma.sql`i."collectionId" = ${table.id} AND i."id" = ${row.id}`, new Date()), LONG);
    refresh();
    if (req.apiKey) logWrite(req, req.apiKey, table, "delete", row.id, []);
    res.json({ ok: true, id: row.id, ...(withThem ? { withThem } : {}) });
  }),
);

export default r;
