/**
 * The store's own tables in the data grid, to look at (lib/storeTables.ts): products, categories,
 * orders, customers. Each needs the permission its own page needs; nothing is written here.
 *
 * GET /admin/data/store                       — the tables this member may see, as the grid knows tables
 * GET /admin/data/store/:table/rows?q={…}     — one page (the grid's own question)
 * GET /admin/data/store/:table/rows/export?q= — the asked rows as CSV
 */
import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { hasPermission } from "../../middleware/access.js";
import { LIMITS } from "../../lib/collections.js";
import { parseGridQuery } from "../../lib/dataQuery.js";
import { STORE_TABLES, describeStoreTable, queryStoreRows, storeCsvHead, storeCsvLine, storeRowsSlice, type StoreTable } from "../../lib/storeTables.js";

const r = Router();
const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);

function tableOf(req: any): StoreTable {
  const t = STORE_TABLES[String(req.params.table)];
  if (!t) throw new AppError(404, "NOT_FOUND", "No such table");
  if (!hasPermission(req, t.permission)) throw new AppError(403, "PERMISSION_DENIED", "This table needs another permission", { required: [t.permission] });
  return t;
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
    const [page, all] = await Promise.all([queryStoreRows(t, q), t.delegate().count({})]);
    res.json({ ...page, page: q.page, pageSize: q.pageSize, counts: { all, draft: 0, published: 0, archived: 0, trash: 0 }, ms: Math.round(performance.now() - t0) });
  }),
);

r.get(
  "/:table/rows/export",
  asyncHandler(async (req, res) => {
    const t = tableOf(req);
    const q = parseGridQuery(one(req.query.q));
    const STEP = 500;
    let rows = await storeRowsSlice(t, q, 0, STEP);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${t.id}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    res.write(`﻿${storeCsvHead(t)}\r\n`);
    for (let offset = 0; rows.length; offset += STEP) {
      res.write(`${rows.map((row) => storeCsvLine(t, row)).join("\r\n")}\r\n`);
      if (rows.length < STEP || offset + STEP >= LIMITS.items) break;
      rows = await storeRowsSlice(t, q, offset + STEP, STEP);
    }
    res.end();
  }),
);

export default r;
