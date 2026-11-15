import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { RUN_KINDS, flushRuns, listRuns, runsSummary } from "../../lib/runs.js";

/**
 * /v1/admin/system/runs — سجل التشغيل (E0.2): everything the server did by itself (a job's run,
 * an automation's action, a webhook taken in), newest first, kept through restarts. Needs
 * system:read (admin.routes.ts).
 *
 * GET /admin/system/runs?kind=&name=&ok=&before=&limit=  — a page of runs and the last day in numbers
 */
const r = Router();

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const Query = z.object({
  kind: z.enum(RUN_KINDS).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  /** "false": only what failed; "true": only what went fine. */
  ok: z.enum(["true", "false"]).optional(),
  /** The runs before this moment (what the page before answered as `next`). */
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = Query.parse(Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, one(v) === "" ? undefined : one(v)])));
    // What was folded in the last minute shows too.
    await flushRuns();
    const [page, summary] = await Promise.all([
      listRuns({ kind: q.kind, name: q.name, ok: q.ok === undefined ? undefined : q.ok === "true", before: q.before ? new Date(q.before) : undefined, limit: q.limit }),
      // The numbers belong to the first page; the pages after only add rows.
      q.before ? null : runsSummary(),
    ]);
    res.json({ now: Date.now(), ...page, ...(summary ? { summary } : {}) });
  }),
);

export default r;
