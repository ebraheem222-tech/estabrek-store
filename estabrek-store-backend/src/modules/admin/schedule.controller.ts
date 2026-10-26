import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { prisma } from "../../lib/prisma.js";
import { hasPermission } from "../../middleware/access.js";
import { triggerJob } from "../../lib/jobs.js";
import { NAMESPACE_NAMES } from "../../lib/cacheConfig.js";
import { readPerformance } from "../../lib/performanceSettings.js";
import { announcementNow, maintenanceNow, themePresetNow } from "./siteChanges.js";
import { KIND_NAMES, SCHEDULE_MAX_DAYS, applyNow, checkTimes, parsePayload, previewChange, runScheduled, undoNow, type ScheduleKind } from "./schedule.service.js";

/**
 * /v1/admin/schedule — الجدول الزمني: changes set for later, with a preview and an
 * optional undo time. Reading needs any of settings/system/pages:read; each
 * change needs the right of what it changes (theme, maintenance, announcement:
 * settings:write; motion, cache: system:write; a page section: pages:write).
 */
const r = Router();
const adminOf = (req: any): string | null => (req.user?.bypass ? null : req.access?.adminId ?? null);

const RIGHT: Record<ScheduleKind, string> = {
  theme: "settings:write",
  maintenance: "settings:write",
  announcement: "settings:write",
  motion: "system:write",
  cachePurge: "system:write",
  section: "pages:write",
};

function needRight(req: any, kind: ScheduleKind) {
  if (!hasPermission(req, RIGHT[kind])) throw new AppError(403, "PERMISSION_DENIED", `Needs ${RIGHT[kind]}`, { required: [RIGHT[kind]] });
}

const Body = z
  .object({
    kind: z.enum(KIND_NAMES),
    title: z.string().trim().min(1).max(80),
    payload: z.unknown(),
    runAt: z.coerce.date(),
    undoAt: z.coerce.date().nullable().default(null),
  })
  .strict();

function parse(req: any) {
  const b = Body.parse(req.body ?? {});
  needRight(req, b.kind);
  const payload = parsePayload(b.kind, b.payload);
  checkTimes(b.kind, b.runAt, b.undoAt);
  return { kind: b.kind, title: b.title, payload: payload as object, runAt: b.runAt, undoAt: b.undoAt };
}

/** Due already ("now"): done right away (by the job when the server runs them). */
async function soon(runAt: Date) {
  if (runAt.getTime() <= Date.now() && !triggerJob("scheduled")) await runScheduled();
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 60 * 86400_000);
    const [changes, campaigns] = await Promise.all([
      prisma.scheduledChange.findMany({ where: { OR: [{ status: { in: ["scheduled", "applied"] } }, { updatedAt: { gte: since } }] }, orderBy: { runAt: "asc" }, take: 200 }),
      prisma.campaign.findMany({ where: { OR: [{ status: { in: ["scheduled", "running"] } }, { endsAt: { gte: since } }] }, orderBy: { startsAt: "asc" }, take: 100 }),
    ]);
    res.json({ changes, campaigns, now: Date.now(), maxDays: SCHEDULE_MAX_DAYS });
  }),
);

/** What the form needs: the pages' sections, the cache's parts, and how things are now. */
r.get(
  "/options",
  asyncHandler(async (_req, res) => {
    const [pages, theme, maintenance, announcement, perf] = await Promise.all([
      prisma.page.findMany({ orderBy: { slug: "asc" }, select: { id: true, name: true, slug: true, sections: { orderBy: { order: "asc" }, select: { id: true, type: true, isVisible: true, data: true } } } }),
      themePresetNow(),
      maintenanceNow(),
      announcementNow(),
      readPerformance(),
    ]);
    const sections = pages.flatMap((p) =>
      p.sections.map((s) => {
        const d = s.data && typeof s.data === "object" ? (s.data as Record<string, unknown>) : {};
        const title = typeof d.title === "string" && d.title.trim() ? d.title.trim().slice(0, 60) : null;
        return { id: s.id, type: s.type, title, isVisible: s.isVisible, page: { id: p.id, name: p.name, slug: p.slug } };
      }),
    );
    res.json({ sections, namespaces: NAMESPACE_NAMES, now: { theme, maintenance, announcement, motion: perf.storefront } });
  }),
);

r.post(
  "/preview",
  asyncHandler(async (req, res) => {
    const b = z.object({ kind: z.enum(KIND_NAMES), payload: z.unknown() }).parse(req.body ?? {});
    res.json({ lines: await previewChange(b.kind, parsePayload(b.kind, b.payload)) });
  }),
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parse(req);
    const c = await prisma.scheduledChange.create({ data: { ...data, createdById: adminOf(req) } });
    await soon(c.runAt);
    res.status(201).json({ change: await prisma.scheduledChange.findUnique({ where: { id: c.id } }) });
  }),
);

const load = async (id: string) => {
  const c = await prisma.scheduledChange.findUnique({ where: { id } });
  if (!c) throw new AppError(404, "SCHEDULED_CHANGE_NOT_FOUND");
  return c;
};

r.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const c = await load(String(req.params.id));
    if (c.status !== "scheduled") throw new AppError(409, "SCHEDULED_CHANGE_NOT_EDITABLE", "Only a change that hasn't happened can change");
    needRight(req, c.kind as ScheduleKind);
    const data = parse(req);
    await prisma.scheduledChange.update({ where: { id: c.id }, data });
    await soon(data.runAt);
    res.json({ change: await prisma.scheduledChange.findUnique({ where: { id: c.id } }) });
  }),
);

/** Not yet: it won't happen. */
r.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const c = await load(String(req.params.id));
    if (c.status !== "scheduled") throw new AppError(409, "SCHEDULED_CHANGE_NOT_SCHEDULED");
    needRight(req, c.kind as ScheduleKind);
    res.json({ change: await prisma.scheduledChange.update({ where: { id: c.id }, data: { status: "canceled" } }) });
  }),
);

/** Now instead of later. */
r.post(
  "/:id/run",
  asyncHandler(async (req, res) => {
    const c = await load(String(req.params.id));
    if (c.status !== "scheduled") throw new AppError(409, "SCHEDULED_CHANGE_NOT_SCHEDULED");
    needRight(req, c.kind as ScheduleKind);
    if (c.undoAt && c.undoAt.getTime() <= Date.now()) throw new AppError(409, "SCHEDULED_CHANGE_OVER");
    res.json({ change: await applyNow(c) });
  }),
);

/** Back now instead of at its undo time (or a change without one). */
r.post(
  "/:id/undo",
  asyncHandler(async (req, res) => {
    const c = await load(String(req.params.id));
    if (c.status !== "applied" && !(c.status === "done" && c.kind !== "cachePurge")) throw new AppError(409, "SCHEDULED_CHANGE_NOT_APPLIED");
    needRight(req, c.kind as ScheduleKind);
    res.json({ change: await undoNow(c) });
  }),
);

export default r;
