import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { TASK_STATUSES, cancelTask, retryTask, tasksSnapshot } from "../../lib/tasks.js";

/**
 * /v1/admin/system/tasks — صف الشغل (E0.3): the background work that must not be lost
 * (lib/tasks.ts): what waits, what is being done, what was done, and what was set aside after
 * failing every try ("needs a look"). Reading needs system:read, the two actions system:write
 * (admin.routes.ts).
 *
 * GET  /admin/system/tasks?status=&kind=&before=&limit=  — the numbers and a page of tasks, newest first
 * POST /admin/system/tasks/:id/retry                     — one that was set aside (or dismissed) waits its turn again
 * POST /admin/system/tasks/:id/cancel                    — one that waits or was set aside is dismissed
 */
const r = Router();

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const Query = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  kind: z.string().trim().min(1).max(80).optional(),
  /** The tasks added before this moment (what the page before answered as `next`). */
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

r.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = Query.parse(Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, one(v) === "" ? undefined : one(v)])));
    res.json(await tasksSnapshot({ status: q.status, kind: q.kind, before: q.before ? new Date(q.before) : undefined, limit: q.limit }));
  }),
);

/** The task as it is now, or 404. */
async function taskOf(id: string) {
  const task = await prisma.task.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!task) throw new AppError(404, "TASK_NOT_FOUND");
  return task;
}

r.post(
  "/:id/retry",
  asyncHandler(async (req, res) => {
    const task = await taskOf(String(req.params.id));
    // Only what stopped: one that waits or is being done is on its way already.
    if (!(await retryTask(task.id))) throw new AppError(409, "TASK_NOT_STOPPED", "Only a task that was set aside or dismissed can be tried again", { status: task.status });
    res.json({ ok: true });
  }),
);

r.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const task = await taskOf(String(req.params.id));
    if (!(await cancelTask(task.id))) throw new AppError(409, "TASK_NOT_WAITING", "Only a task that waits or was set aside can be dismissed", { status: task.status });
    res.json({ ok: true });
  }),
);

export default r;
