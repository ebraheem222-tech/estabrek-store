/**
 * A table's rows for the data grid (admin → الجداول; lib/dataQuery.ts asks, lib/dataRows.ts
 * turns values). A table is a collection; these sit beside its older routes
 * (collections.controller.ts) under the same permissions (pages:read / pages:write).
 *
 * GET    /admin/collections/grid-meta            — what may be asked of each kind of column, and the limits
 * GET    /admin/collections/:id/rows?q={…}       — one page: filters, sort, search, view (all, draft, published, archived, trash);
 *                                                  `incoming`: the relations that link this table, each a read-only column
 *                                                  ("$from.<table>.<field>"); a row's `from` says who links it through each
 * GET    /admin/collections/:id/rows/export?q={…} — the same rows (all pages) as CSV
 * GET    /admin/collections/:id/rows/lookup?search= — a few rows to pick from when linking (a relation's picker)
 * POST   /admin/collections/:id/rows             { slug?, values?, status?, lang? } — one new row (its address made when not given)
 * PATCH  /admin/collections/:id/rows/:row        { slug?, status?, sort?, values?, lang? } — a cell or a few; the rest stays
 * POST   /admin/collections/:id/rows/bulk        { ids | query, op, field?, value? } — publish, draft, archive, trash, restore, purge, set
 * POST   /admin/collections/:id/rows/import      { rows, mode, lang, dryRun } — up to 500 rows a call; dryRun only reports
 *
 * Deleting is moving to the trash (30 days, then the job "dataTrash" empties it); only the trash is deleted for good.
 */
import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { hasPermission } from "../../middleware/access.js";
import { linkView, seenTable } from "../../lib/linkView.js";
import { AppError } from "../../utils/httpError.js";
import { checkItemData, LIMITS, TRASH_DAYS } from "../../lib/collections.js";
import { RULES_BY_TYPE, SHAPES } from "../../lib/fieldRules.js";
import { uniqueIssues } from "../../lib/uniqueValues.js";
import { checkLinks, isRelation, linkGone, namedRows, restoreRows, setLinksOfMany, trashRows, withLinks } from "../../lib/links.js";
import { GRID_LIMITS, OPS_BY_KIND, SYSTEM_COLUMNS, VIEWS, gridWhere, parseGridQuery, queryRows, rowsSlice, utc, viewCounts } from "../../lib/dataQuery.js";
import { LANGS, coerceValue, csvLine, exportColumns } from "../../lib/dataRows.js";
import { LONG, StatusIn, addRow, answer, changeRow, refresh, tableOf, taken, writeRows } from "../../lib/rowWrites.js";
import { emitRow } from "../../lib/fnTriggers.js";

const r = Router();
export const IMPORT_MAX = 500;
export const BULK_MAX = 500;
/** Up to this many rows changed in one act each start the functions waiting for it. */
const ROW_EVENTS_MAX = 25;

const Lang = z.enum(LANGS).default("ar");
const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
/** What this member is told of a row: its owner by name (who may see the customers), and a linked row by name (who may see its table: lib/linkView.ts). */
const owners = (req: Parameters<typeof hasPermission>[0]) => ({ owners: hasPermission(req, "customers:read") ? ("full" as const) : ("id" as const), ...linkView(req) });
/** The asked table, with the linked-from columns this member may see (lib/linkView.ts). */
const tableFor = async (req: Parameters<typeof hasPermission>[0] & { params: Record<string, unknown> }) => seenTable(req, await tableOf(String(req.params.id)));

r.get("/grid-meta", (_req, res) => {
  res.json({ ops: OPS_BY_KIND, systemColumns: SYSTEM_COLUMNS, views: VIEWS, limits: { ...GRID_LIMITS, rows: LIMITS.items, importRows: IMPORT_MAX, bulkIds: BULK_MAX, trashDays: TRASH_DAYS, links: LIMITS.links }, rules: RULES_BY_TYPE, shapes: SHAPES });
});

r.get(
  "/:id/rows",
  asyncHandler(async (req, res) => {
    const table = await tableFor(req);
    const q = parseGridQuery(one(req.query.q));
    const t0 = performance.now();
    const [page, counts] = await Promise.all([queryRows(prisma, table, q), viewCounts(prisma, table.id)]);
    res.json({ rows: await answer(table, page.rows, owners(req)), total: page.total, page: q.page, pageSize: q.pageSize, counts, incoming: table.incoming, ms: Math.round(performance.now() - t0) });
  }),
);

r.get(
  "/:id/rows/export",
  asyncHandler(async (req, res) => {
    const table = await tableFor(req);
    const q = parseGridQuery(one(req.query.q));
    // The first slice is read before anything is sent: a bad question still answers 400.
    const STEP = 1000;
    let rows = await rowsSlice(prisma, table, q, 0, STEP);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${table.slug}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    // The mark at the start tells spreadsheets the file is UTF-8 (Arabic and Hebrew stay readable).
    res.write(`﻿${exportColumns(table.fields).join(",")}\r\n`);
    for (let offset = 0; rows.length; offset += STEP) {
      res.write(`${(await withLinks(prisma, table, rows, linkView(req))).map((row) => csvLine(table.fields, row)).join("\r\n")}\r\n`);
      if (rows.length < STEP || offset + STEP >= LIMITS.items) break;
      rows = await rowsSlice(prisma, table, q, offset + STEP, STEP);
    }
    res.end();
  }),
);

/**
 * GET /admin/collections/:id/rows/lookup?search= — rows to pick from when linking (a relation's
 * picker): a few, found by their words or address, each lightly (id, address, status, first words).
 */
r.get(
  "/:id/rows/lookup",
  asyncHandler(async (req, res) => {
    const table = await tableFor(req);
    const search = String(one(req.query.search) ?? "").trim().slice(0, GRID_LIMITS.search);
    const page = await queryRows(prisma, table, parseGridQuery({ pageSize: 20, ...(search ? { search } : {}) }));
    const title = table.fields.find((f) => f.type === "text")?.id;
    const words = (row: { data: Record<string, unknown> }) => (title && row.data?.[title] && typeof row.data[title] === "object" ? row.data[title] : null);
    res.json({ rows: page.rows.map((row) => ({ id: row.id, slug: row.slug, status: row.status, title: words(row) })), total: page.total });
  }),
);

/* ---------------- Rows in: one, or a file's worth ---------------- */

const RowBody = z.object({ slug: z.string().max(100).optional(), status: z.string().max(20).optional(), values: z.record(z.string().max(60), z.unknown()).default({}), lang: Lang }).strict();

r.post(
  "/:id/rows",
  asyncHandler(async (req, res) => {
    const table = await tableFor(req);
    const body = RowBody.parse(req.body ?? {});
    const row = await addRow(table, { slug: body.slug, status: body.status, values: body.values }, body.lang, linkView(req));
    res.status(201).json(row ? (await answer(table, [row], owners(req)))[0] : row);
  }),
);

const PatchBody = z
  .object({ slug: z.string().max(100).optional(), status: StatusIn.optional(), sort: z.number().int().min(-1_000_000).max(1_000_000).optional(), values: z.record(z.string().max(40), z.unknown()).optional(), lang: Lang })
  .strict();

r.patch(
  "/:id/rows/:row",
  asyncHandler(async (req, res) => {
    const table = await tableFor(req);
    const body = PatchBody.parse(req.body ?? {});
    const was = await prisma.collectionItem.findFirst({ where: { id: String(req.params.row), collectionId: table.id } });
    if (!was) throw new AppError(404, "NOT_FOUND", "No such row");
    if (was.deletedAt) throw new AppError(409, "ROW_IN_TRASH", "Take the row out of the trash first");
    res.json((await answer(table, [await changeRow(table, was, body, linkView(req))], owners(req)))[0]);
  }),
);

/* ---------------- Many rows at once ---------------- */

const BulkBody = z
  .object({
    ids: z.array(z.string().min(1).max(64)).min(1).max(BULK_MAX).optional(),
    /** Instead of ids: every row this question matches (the grid's own, whatever its page). */
    query: z.unknown().optional(),
    op: z.enum(["publish", "draft", "archive", "trash", "restore", "purge", "set"]),
    field: z.string().max(40).optional(),
    value: z.unknown().optional(),
    lang: Lang,
  })
  .strict()
  .refine((b) => (b.ids === undefined) !== (b.query === undefined), "Either ids or a question");

r.post(
  "/:id/rows/bulk",
  asyncHandler(async (req, res) => {
    const table = await tableFor(req);
    const body = BulkBody.parse(req.body ?? {});
    const which = body.ids ? Prisma.sql`i."collectionId" = ${table.id} AND i."id" IN (${Prisma.join(body.ids)})` : gridWhere(table.id, table.fields, parseGridQuery(body.query), table.incoming);
    const live = Prisma.sql`${which} AND i."deletedAt" IS NULL`;
    const now = new Date();
    let changed = 0;
    // Rows that went to the trash (or came back) with the asked ones, through a "deleted with it" relation.
    let withThem = 0;
    if (body.op === "publish") {
      changed = await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "status" = 'PUBLISHED'::"PageStatus", "publishedAt" = COALESCE(i."publishedAt", ${utc(now)}), "updatedAt" = ${utc(now)} WHERE ${live} AND i."status" <> 'PUBLISHED'::"PageStatus"`);
    } else if (body.op === "draft" || body.op === "archive") {
      const to = body.op === "draft" ? "DRAFT" : "ARCHIVED";
      changed = await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "status" = ${to}::"PageStatus", "updatedAt" = ${utc(now)} WHERE ${live} AND i."status"::text <> ${to}`);
    } else if (body.op === "trash") {
      // What the relations linking these rows chose: unlinked, deleted with them, or the whole act refused (lib/links.ts).
      ({ changed, withThem } = await prisma.$transaction((tx) => trashRows(tx, which, now, linkView(req)), LONG));
    } else if (body.op === "restore") {
      ({ changed, withThem } = await prisma.$transaction((tx) => restoreRows(tx, which), LONG));
    } else if (body.op === "purge") {
      // Only what is already in the trash is deleted for good (its links go with it).
      changed = await prisma.$executeRaw(Prisma.sql`DELETE FROM "CollectionItem" AS i WHERE ${which} AND i."deletedAt" IS NOT NULL`);
    } else if (isRelation(table.fields.find((f) => f.id === body.field))) {
      // The same rows linked from every asked row.
      const field = table.fields.find((f) => f.id === body.field)!;
      const invalid = (issues: unknown) => new AppError(400, "ROW_INVALID", "Some values are wrong", { issues });
      if (!isRelation(field)) throw invalid([{ field: String(body.field), message: "No such column" }]);
      const names = namedRows(body.value);
      if (names === null) throw invalid([{ field: field.id, message: "Rows by their id or address" }]);
      if (names.length > LIMITS.links) throw invalid([{ field: field.id, message: "Too many linked rows" }]);
      // A row there that takes one linking row can't be given to many.
      if (field.exclusive && names.length && (!body.ids || body.ids.length !== 1)) throw invalid([{ field: field.id, message: "Only one row can link this row" }]);
      const rowIds = (await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT i."id" FROM "CollectionItem" i WHERE ${live}`)).map((x) => x.id);
      // Checked as one row's would be (every asked row gets the same); with one row, against that row itself.
      const check = await checkLinks(prisma, table, [{ id: rowIds.length === 1 ? rowIds[0] : "", asked: new Map([[field.id, names]]) }], linkView(req));
      if (check.issues.size) throw invalid(check.issues.get(0));
      const ids = check.ready[0].get(field.id) ?? [];
      changed = await prisma.$transaction((tx) => setLinksOfMany(tx, table, field, rowIds, ids, now), LONG);
    } else {
      const field = table.fields.find((f) => f.id === body.field);
      if (!field) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: [{ field: String(body.field ?? ""), message: "No such column" }] });
      const checked = checkItemData([field], { [field.id]: coerceValue(field, body.value, body.lang) });
      if (!checked.ok) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: checked.issues });
      if (field.unique && field.id in checked.data) {
        // One value for many rows is the opposite of "the only value": one ticked row at most, and only if the value is free.
        if (!body.ids || body.ids.length !== 1) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: [{ field: field.id, message: "Only one row can hold this value" }] });
        const taken = await uniqueIssues(prisma, table.id, table.fields, [{ id: body.ids[0], data: { [field.id]: checked.data[field.id] }, changed: new Set([field.id]) }]);
        if (taken.size) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: taken.get(0) });
      }
      changed =
        field.id in checked.data
          ? await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "data" = jsonb_set(i."data", ARRAY[${field.id}]::text[], ${JSON.stringify(checked.data[field.id])}::jsonb, true), "updatedAt" = ${utc(now)} WHERE ${live}`)
          : await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "data" = i."data" - ${field.id}::text, "updatedAt" = ${utc(now)} WHERE ${live}`);
    }
    if (changed) refresh();
    // A few rows picked by hand start the functions that wait for a change or a delete; a question's worth of rows (like a file's) doesn't.
    if (changed && body.ids && body.ids.length <= ROW_EVENTS_MAX && body.op !== "restore" && body.op !== "purge") for (const id of body.ids) emitRow(body.op === "trash" ? "deleted" : "changed", table.id, { id });
    res.json({ changed, ...(withThem ? { withThem } : {}), counts: await viewCounts(prisma, table.id) });
  }),
);

const ImportBody = z
  .object({
    rows: z.array(z.object({ slug: z.string().max(100).optional(), status: z.string().max(20).optional(), values: z.record(z.string().max(60), z.unknown()).default({}) }).strict()).min(1).max(IMPORT_MAX),
    mode: z.enum(["create", "upsert"]).default("create"),
    lang: Lang,
    dryRun: z.boolean().default(false),
  })
  .strict();

r.post(
  "/:id/rows/import",
  asyncHandler(async (req, res) => {
    const table = await tableFor(req);
    const body = ImportBody.parse(req.body ?? {});
    try {
      const { slugs: _slugs, ...report } = await writeRows(table, body.rows, { mode: body.mode, lang: body.lang, dryRun: body.dryRun, view: linkView(req) });
      res.json(report);
    } catch (e) {
      // Two people adding the same address at once: nothing was written, ask again.
      if (taken(e)) throw new AppError(409, "SLUG_TAKEN", "An address was taken meanwhile; try again");
      if (linkGone(e)) throw new AppError(409, "LINK_GONE", "A linked row was deleted meanwhile; try again");
      throw e;
    }
  }),
);

export default r;
