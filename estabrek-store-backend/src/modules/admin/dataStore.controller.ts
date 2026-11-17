/**
 * The store's own tables in the data grid, to look at (lib/storeTables.ts): products, orders,
 * coupons… Each needs the permission its own page needs; nothing is written here.
 *
 * GET /admin/data/store                       — the tables this member may see, as the grid knows tables
 * GET /admin/data/store/:table/rows?q={…}     — one page (the grid's own question). `incoming`: the relations of
 *                                               the owner's tables that link this one, each a read-only column
 *                                               ("$from.<table address>.<field id>"); each row says who links it (`from`)
 * GET /admin/data/store/:table/rows/export?q= — the asked rows as CSV
 * GET /admin/data/store/:table/lookup?search=  — a few rows by what they are called, for a relation's box (lib/storeLinks.ts)
 */
import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { hasPermission } from "../../middleware/access.js";
import { seenIncoming } from "../../lib/linkView.js";
import { LIMITS } from "../../lib/collections.js";
import { parseGridQuery, type GridQuery } from "../../lib/dataQuery.js";
import { FROM_ASK_CAP, STORE_TABLES, describeStoreTable, queryStoreRows, storeCsvHead, storeCsvLine, storeRowsSlice, type StoreFrom, type StoreTable } from "../../lib/storeTables.js";
import { prisma } from "../../lib/prisma.js";
import { STORE, storeRowsByIds, storeTarget, type StoreId } from "../../lib/storeLinks.js";
import { FROM, incomingTo, linkedFrom, storeRowsLinked, type Incoming } from "../../lib/links.js";

const r = Router();
const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);

function tableOf(req: any): StoreTable {
  const t = STORE_TABLES[String(req.params.table)];
  if (!t) throw new AppError(404, "NOT_FOUND", "No such table");
  if (!hasPermission(req, t.permission)) throw new AppError(403, "PERMISSION_DENIED", "This table needs another permission", { required: [t.permission] });
  return t;
}

/**
 * The relations of the owner's tables that link this store table, as far as this member may see
 * those tables: every one through pages:read, else the tables their role was given one by one
 * (a linking row is named, so a table they can't open stays out).
 */
async function incomingOf(req: any, t: StoreTable): Promise<Incoming[]> {
  return seenIncoming(req, await incomingTo(prisma, `${STORE}${t.id}`));
}

/** For each linked-from column the question asks about: the store rows that relation links. */
async function askedFrom(t: StoreTable, q: GridQuery, incoming: Incoming[]): Promise<StoreFrom> {
  const from: StoreFrom = new Map();
  for (const id of new Set(q.filters.map((f) => f.field).filter((f) => f.startsWith(FROM)))) {
    const inc = incoming.find((x) => x.id === id);
    if (!inc) continue; // Not a column of this table (or not this member's to see): the filter itself says so.
    const ids = await storeRowsLinked(prisma, inc, t.id as StoreId, FROM_ASK_CAP);
    if (ids.length > FROM_ASK_CAP) throw new AppError(400, "BAD_GRID_QUERY", "Too many linked rows to ask this here: ask it of the table that links them", { field: id });
    from.set(id, ids);
  }
  return from;
}

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const mine = Object.values(STORE_TABLES).filter((t) => hasPermission(req, t.permission));
    const counts = await Promise.all(mine.map((t) => t.delegate().count({})));
    res.json(mine.map((t, i) => describeStoreTable(t, counts[i])));
  }),
);

r.get(
  "/:table/rows",
  asyncHandler(async (req, res) => {
    const t = tableOf(req);
    const q = parseGridQuery(one(req.query.q));
    const t0 = performance.now();
    const incoming = await incomingOf(req, t);
    const [page, all] = await Promise.all([queryStoreRows(t, q, await askedFrom(t, q, incoming)), t.delegate().count({})]);
    // Who links each row of the page, per relation (how many, and the first few by name).
    const from = await linkedFrom(prisma, `${STORE}${t.id}`, incoming, page.rows.map((row) => row.id));
    const rows = incoming.length ? page.rows.map((row) => ({ ...row, from: from.get(row.id) ?? {} })) : page.rows;
    res.json({ rows, total: page.total, page: q.page, pageSize: q.pageSize, counts: { all, draft: 0, published: 0, archived: 0, trash: 0 }, incoming, ms: Math.round(performance.now() - t0) });
  }),
);

r.get(
  "/:table/rows/export",
  asyncHandler(async (req, res) => {
    const t = tableOf(req);
    const q = parseGridQuery(one(req.query.q));
    const STEP = 500;
    const from = await askedFrom(t, q, await incomingOf(req, t));
    let rows = await storeRowsSlice(t, q, 0, STEP, from);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${t.id}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    res.write(`﻿${storeCsvHead(t)}\r\n`);
    for (let offset = 0; rows.length; offset += STEP) {
      res.write(`${rows.map((row) => storeCsvLine(t, row)).join("\r\n")}\r\n`);
      if (rows.length < STEP || offset + STEP >= LIMITS.items) break;
      rows = await storeRowsSlice(t, q, offset + STEP, STEP, from);
    }
    res.end();
  }),
);

r.get(
  "/:table/lookup",
  asyncHandler(async (req, res) => {
    const t = tableOf(req);
    const s = storeTarget(`store:${t.id}`);
    if (!s) throw new AppError(404, "NOT_FOUND", "No such table");
    // The grid's own search, the newest first; each row then named the way a relation shows it.
    const search = String(one(req.query.search) ?? "").trim().slice(0, 80);
    const page = await queryStoreRows(t, parseGridQuery(JSON.stringify({ page: 1, pageSize: 20, ...(search ? { search } : {}) })));
    const named = await storeRowsByIds(prisma, s, page.rows.map((row) => row.id));
    res.json({ rows: named.map((row) => ({ id: row.id, slug: row.slug, status: "PUBLISHED", title: row.label ? { ar: row.label, en: row.label, he: row.label } : null, store: s })), total: page.total });
  }),
);

export default r;
