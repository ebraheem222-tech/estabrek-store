/**
 * A table's rows for the data grid (admin → الجداول; lib/dataQuery.ts asks, lib/dataRows.ts
 * turns values). A table is a collection; these sit beside its older routes
 * (collections.controller.ts) under the same permissions (pages:read / pages:write).
 *
 * GET    /admin/collections/grid-meta            — what may be asked of each kind of column, and the limits
 * GET    /admin/collections/:id/rows?q={…}       — one page: filters, sort, search, view (all, draft, published, archived, trash)
 * GET    /admin/collections/:id/rows/export?q={…} — the same rows (all pages) as CSV
 * POST   /admin/collections/:id/rows             { slug?, values?, status?, lang? } — one new row (its address made when not given)
 * PATCH  /admin/collections/:id/rows/:row        { slug?, status?, sort?, values?, lang? } — a cell or a few; the rest stays
 * POST   /admin/collections/:id/rows/bulk        { ids | query, op, field?, value? } — publish, draft, archive, trash, restore, purge, set
 * POST   /admin/collections/:id/rows/import      { rows, mode, lang, dryRun } — up to 500 rows a call; dryRun only reports
 *
 * Deleting is moving to the trash (30 days, then the job "dataTrash" empties it); only the trash is deleted for good.
 */
import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { triggerCmsRevalidate } from "../../lib/cmsRevalidate.js";
import { checkItemData, ITEM_SLUG, LIMITS, TRASH_DAYS, withDefaults } from "../../lib/collections.js";
import { RULES_BY_TYPE, SHAPES } from "../../lib/fieldRules.js";
import { changedUnique, uniqueIssues, type Candidate } from "../../lib/uniqueValues.js";
import type { Field } from "../../lib/collectionTree.js";
import { GRID_LIMITS, OPS_BY_KIND, STATUSES, SYSTEM_COLUMNS, VIEWS, gridWhere, parseGridQuery, queryRows, rowsSlice, viewCounts } from "../../lib/dataQuery.js";
import { LANGS, coerceValue, csvLine, exportColumns, freeSlug, looseData, patchData, slugFrom, type Issue } from "../../lib/dataRows.js";

const r = Router();
const refresh = () => void triggerCmsRevalidate([]).catch(() => {});
export const IMPORT_MAX = 500;
export const BULK_MAX = 500;

type Status = (typeof STATUSES)[number];
const Lang = z.enum(LANGS).default("ar");
const StatusIn = z.enum(STATUSES);

async function tableOf(id: string) {
  const c = await prisma.collection.findUnique({ where: { id }, select: { id: true, slug: true, fields: true } });
  if (!c) throw new AppError(404, "NOT_FOUND", "No such table");
  return { id: c.id, slug: c.slug, fields: (Array.isArray(c.fields) ? c.fields : []) as Field[] };
}
const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const taken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

r.get("/grid-meta", (_req, res) => {
  res.json({ ops: OPS_BY_KIND, systemColumns: SYSTEM_COLUMNS, views: VIEWS, limits: { ...GRID_LIMITS, rows: LIMITS.items, importRows: IMPORT_MAX, bulkIds: BULK_MAX, trashDays: TRASH_DAYS }, rules: RULES_BY_TYPE, shapes: SHAPES });
});

r.get(
  "/:id/rows",
  asyncHandler(async (req, res) => {
    const table = await tableOf(String(req.params.id));
    const q = parseGridQuery(one(req.query.q));
    const t0 = performance.now();
    const [page, counts] = await Promise.all([queryRows(prisma, table, q), viewCounts(prisma, table.id)]);
    res.json({ ...page, page: q.page, pageSize: q.pageSize, counts, ms: Math.round(performance.now() - t0) });
  }),
);

r.get(
  "/:id/rows/export",
  asyncHandler(async (req, res) => {
    const table = await tableOf(String(req.params.id));
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
      res.write(`${rows.map((row) => csvLine(table.fields, row)).join("\r\n")}\r\n`);
      if (rows.length < STEP || offset + STEP >= LIMITS.items) break;
      rows = await rowsSlice(prisma, table, q, offset + STEP, STEP);
    }
    res.end();
  }),
);

/* ---------------- Rows in: one, or a file's worth ---------------- */

type RowIn = { slug?: string; status?: string; values: Record<string, unknown> };
type Rejected = { row: number; slug: string | null; issues: Issue[] };

/**
 * Checks a batch against the table and what's already in it, and (unless `dryRun`) writes it.
 * "create" refuses an address that's already used; "upsert" changes that row instead: the columns
 * given replace its values, the others stay.
 */
async function writeRows(table: { id: string; fields: Field[] }, rows: RowIn[], opts: { mode: "create" | "upsert"; lang: (typeof LANGS)[number]; dryRun: boolean }) {
  const rejected: Rejected[] = [];
  const given = rows.map((row) => (typeof row.slug === "string" && row.slug.trim() ? row.slug.trim().toLowerCase() : null));
  const existing = new Map(
    (await prisma.collectionItem.findMany({ where: { collectionId: table.id, slug: { in: given.filter((s): s is string => !!s) } }, select: { id: true, slug: true, data: true, deletedAt: true, publishedAt: true } })).map((x) => [x.slug, x]),
  );
  const seen = new Set<string>();
  let creates: Array<{ row: number; slug: string | null; data: Record<string, unknown>; status: Status }> = [];
  let updates: Array<{ row: number; slug: string; id: string; data: Record<string, unknown>; changed: Set<string>; status?: Status; publish: boolean }> = [];

  rows.forEach((row, index) => {
    const slug = given[index];
    const issues: Issue[] = [];
    const status = row.status === undefined || row.status === "" ? undefined : StatusIn.safeParse(String(row.status).toUpperCase());
    if (status && !status.success) issues.push({ field: "status", message: "DRAFT, PUBLISHED or ARCHIVED" });
    if (slug && !ITEM_SLUG.test(slug)) issues.push({ field: "slug", message: "Small letters, digits and -" });
    if (slug && seen.has(slug)) issues.push({ field: "slug", message: "Twice in this file" });
    const was = slug ? existing.get(slug) : undefined;
    if (was?.deletedAt) issues.push({ field: "slug", message: "This address is in the trash" });
    else if (was && opts.mode === "create") issues.push({ field: "slug", message: "This address is already used" });

    const loose = looseData(table.fields, row.values, opts.lang);
    issues.push(...loose.issues);
    // A row being changed keeps the values of the columns the file doesn't have (a text field: its other languages).
    // A new row starts from the fields' defaults.
    const merged: Record<string, unknown> = was ? { ...((was.data ?? {}) as Record<string, unknown>) } : withDefaults(table.fields, {});
    for (const [id, v] of Object.entries(loose.data)) {
      const before = merged[id];
      merged[id] = v && typeof v === "object" && !Array.isArray(v) && before && typeof before === "object" && !Array.isArray(before) ? { ...(before as object), ...(v as object) } : v;
    }
    const checked = checkItemData(table.fields, merged);
    if (!checked.ok) issues.push(...checked.issues);
    if (issues.length || !checked.ok) {
      rejected.push({ row: index, slug, issues });
      return;
    }
    if (slug) seen.add(slug);
    const next = status?.success ? status.data : undefined;
    if (was) updates.push({ row: index, slug: was.slug, id: was.id, data: checked.data, changed: changedUnique(table.fields, (was.data ?? {}) as Record<string, unknown>, checked.data), status: next, publish: next === "PUBLISHED" && !was.publishedAt });
    else creates.push({ row: index, slug, data: checked.data, status: next ?? "DRAFT" });
  });

  // "The only value": against the table and among the rows of this batch.
  if (table.fields.some((f) => f.unique)) {
    const candidates: Candidate[] = [...creates.map((c) => ({ data: c.data })), ...updates.map((u) => ({ id: u.id, data: u.data, changed: u.changed }))];
    const taken = await uniqueIssues(prisma, table.id, table.fields, candidates);
    if (taken.size) {
      creates.forEach((c, k) => taken.has(k) && rejected.push({ row: c.row, slug: c.slug, issues: taken.get(k)! }));
      updates.forEach((u, k) => taken.has(creates.length + k) && rejected.push({ row: u.row, slug: u.slug, issues: taken.get(creates.length + k)! }));
      const n = creates.length;
      creates = creates.filter((_, k) => !taken.has(k));
      updates = updates.filter((_, k) => !taken.has(n + k));
      rejected.sort((a, b) => a.row - b.row);
    }
  }

  // Rows without an address get one from their words; one the table already uses gets a few random letters after it.
  const auto = creates.filter((c) => !c.slug);
  if (auto.length) {
    const wanted = auto.map((c) => slugFrom(table.fields, c.data));
    const inTable = new Set((await prisma.collectionItem.findMany({ where: { collectionId: table.id, slug: { in: wanted } }, select: { slug: true } })).map((x) => x.slug));
    auto.forEach((c, k) => {
      const base = inTable.has(wanted[k]) ? `${wanted[k].slice(0, 70)}-${randomBytes(3).toString("hex")}` : wanted[k];
      c.slug = freeSlug(base, seen);
      seen.add(c.slug);
    });
  }

  if (creates.length) {
    const have = await prisma.collectionItem.count({ where: { collectionId: table.id, deletedAt: null } });
    if (have + creates.length > LIMITS.items) throw new AppError(400, "TOO_MANY_ROWS", `A table holds up to ${LIMITS.items} rows`, { have, adding: creates.length, limit: LIMITS.items });
  }
  if (!opts.dryRun && (creates.length || updates.length)) {
    const now = new Date();
    await prisma.$transaction([
      ...(creates.length
        ? [prisma.collectionItem.createMany({ data: creates.map((c) => ({ collectionId: table.id, slug: c.slug!, data: c.data as Prisma.InputJsonValue, status: c.status, publishedAt: c.status === "PUBLISHED" ? now : null })) })]
        : []),
      ...updates.map((u) => prisma.collectionItem.update({ where: { id: u.id }, data: { data: u.data as Prisma.InputJsonValue, ...(u.status ? { status: u.status } : {}), ...(u.publish ? { publishedAt: now } : {}) } })),
    ]);
    refresh();
  }
  return { dryRun: opts.dryRun, created: creates.length, updated: updates.length, rejected, slugs: creates.map((c) => c.slug!) };
}

const RowBody = z.object({ slug: z.string().max(100).optional(), status: z.string().max(20).optional(), values: z.record(z.string().max(60), z.unknown()).default({}), lang: Lang }).strict();

r.post(
  "/:id/rows",
  asyncHandler(async (req, res) => {
    const table = await tableOf(String(req.params.id));
    const body = RowBody.parse(req.body ?? {});
    let out: Awaited<ReturnType<typeof writeRows>>;
    try {
      out = await writeRows(table, [{ slug: body.slug, status: body.status, values: body.values }], { mode: "create", lang: body.lang, dryRun: false });
    } catch (e) {
      if (taken(e)) throw new AppError(409, "SLUG_TAKEN", "This address is already used");
      throw e;
    }
    if (out.rejected.length) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: out.rejected[0].issues });
    const row = await prisma.collectionItem.findUnique({ where: { collectionId_slug: { collectionId: table.id, slug: out.slugs[0] } } });
    res.status(201).json(row);
  }),
);

const PatchBody = z
  .object({ slug: z.string().max(100).optional(), status: StatusIn.optional(), sort: z.number().int().min(-1_000_000).max(1_000_000).optional(), values: z.record(z.string().max(40), z.unknown()).optional(), lang: Lang })
  .strict();

r.patch(
  "/:id/rows/:row",
  asyncHandler(async (req, res) => {
    const table = await tableOf(String(req.params.id));
    const body = PatchBody.parse(req.body ?? {});
    const was = await prisma.collectionItem.findFirst({ where: { id: String(req.params.row), collectionId: table.id } });
    if (!was) throw new AppError(404, "NOT_FOUND", "No such row");
    if (was.deletedAt) throw new AppError(409, "ROW_IN_TRASH", "Take the row out of the trash first");
    const data: Prisma.CollectionItemUpdateInput = {};
    if (body.slug !== undefined) {
      const slug = body.slug.trim().toLowerCase();
      if (!ITEM_SLUG.test(slug)) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: [{ field: "slug", message: "Small letters, digits and -" }] });
      data.slug = slug;
    }
    if (body.values) {
      const next = patchData(table.fields, (was.data ?? {}) as Record<string, unknown>, body.values, body.lang);
      if (!next.ok) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: next.issues });
      const before = (was.data ?? {}) as Record<string, unknown>;
      const taken = await uniqueIssues(prisma, table.id, table.fields, [{ id: was.id, data: next.data, changed: changedUnique(table.fields, before, next.data) }]);
      if (taken.size) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: taken.get(0) });
      data.data = next.data as Prisma.InputJsonValue;
    }
    if (body.status) {
      data.status = body.status;
      if (body.status === "PUBLISHED" && !was.publishedAt) data.publishedAt = new Date();
    }
    if (body.sort !== undefined) data.sort = body.sort;
    try {
      const saved = await prisma.collectionItem.update({ where: { id: was.id }, data });
      refresh();
      res.json(saved);
    } catch (e) {
      if (taken(e)) throw new AppError(409, "SLUG_TAKEN", "This address is already used");
      throw e;
    }
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
    const table = await tableOf(String(req.params.id));
    const body = BulkBody.parse(req.body ?? {});
    const which = body.ids ? Prisma.sql`i."collectionId" = ${table.id} AND i."id" IN (${Prisma.join(body.ids)})` : gridWhere(table.id, table.fields, parseGridQuery(body.query));
    const live = Prisma.sql`${which} AND i."deletedAt" IS NULL`;
    const now = new Date();
    let changed = 0;
    if (body.op === "publish") {
      changed = await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "status" = 'PUBLISHED'::"PageStatus", "publishedAt" = COALESCE(i."publishedAt", ${now}), "updatedAt" = ${now} WHERE ${live} AND i."status" <> 'PUBLISHED'::"PageStatus"`);
    } else if (body.op === "draft" || body.op === "archive") {
      const to = body.op === "draft" ? "DRAFT" : "ARCHIVED";
      changed = await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "status" = ${to}::"PageStatus", "updatedAt" = ${now} WHERE ${live} AND i."status"::text <> ${to}`);
    } else if (body.op === "trash") {
      changed = await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "deletedAt" = ${now} WHERE ${live}`);
    } else if (body.op === "restore") {
      changed = await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "deletedAt" = NULL WHERE ${which} AND i."deletedAt" IS NOT NULL`);
    } else if (body.op === "purge") {
      // Only what is already in the trash is deleted for good.
      changed = await prisma.$executeRaw(Prisma.sql`DELETE FROM "CollectionItem" AS i WHERE ${which} AND i."deletedAt" IS NOT NULL`);
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
          ? await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "data" = jsonb_set(i."data", ARRAY[${field.id}]::text[], ${JSON.stringify(checked.data[field.id])}::jsonb, true), "updatedAt" = ${now} WHERE ${live}`)
          : await prisma.$executeRaw(Prisma.sql`UPDATE "CollectionItem" AS i SET "data" = i."data" - ${field.id}::text, "updatedAt" = ${now} WHERE ${live}`);
    }
    if (changed) refresh();
    res.json({ changed, counts: await viewCounts(prisma, table.id) });
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
    const table = await tableOf(String(req.params.id));
    const body = ImportBody.parse(req.body ?? {});
    try {
      const { slugs: _slugs, ...report } = await writeRows(table, body.rows, { mode: body.mode, lang: body.lang, dryRun: body.dryRun });
      res.json(report);
    } catch (e) {
      // Two people adding the same address at once: nothing was written, ask again.
      if (taken(e)) throw new AppError(409, "SLUG_TAKEN", "An address was taken meanwhile; try again");
      throw e;
    }
  }),
);

export default r;
