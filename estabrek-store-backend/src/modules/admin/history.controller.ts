import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AREAS, listHistory, restoreEntry } from "./history.service.js";

/**
 * /v1/admin/history — السجل: every change, newest first, and one button to go
 * back. Each part shows only to members who can read it and goes back only for
 * those who can change it (history.service.ts).
 */
const r = Router();
const DAY = 86400_000;

const ListQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  area: z.enum(AREAS).optional(),
  take: z.coerce.number().int().min(1).max(300).default(150),
});

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = ListQuery.parse(req.query ?? {});
    const to = q.to ?? new Date();
    const from = q.from ?? new Date(to.getTime() - 7 * DAY);
    res.json(await listHistory(req, { from, to, area: q.area ?? null, take: q.take }));
  }),
);

const RestoreBody = z.object({ area: z.enum(AREAS), id: z.string().min(1).max(64) }).strict();

r.post(
  "/restore",
  asyncHandler(async (req, res) => {
    const b = RestoreBody.parse(req.body ?? {});
    res.json(await restoreEntry(req, b.area, b.id));
  }),
);

export default r;
