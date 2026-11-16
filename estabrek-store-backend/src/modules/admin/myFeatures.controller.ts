import { Router, type Request } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { accessOf } from "../../lib/dataApi.js";
import { FEATURE_KINDS, forgetFeatureGate, type FeatureKind } from "../../lib/featureGate.js";
import { forgetTriggers } from "../../lib/fnTriggers.js";

/**
 * /v1/admin/my-features — ميزاتي (M): a feature the owner built. It is a name over things made
 * elsewhere in the studio (tables, functions, pages), so they are found together and switched off
 * together. A thing belongs to one feature at most; deleting a feature only ungroups its things.
 * Looking needs features:read, changing features:write (admin.routes.ts).
 *
 * Switched off (lib/featureGate.ts): the feature's functions aren't started by anything but the
 * admin's own run, and its tables' API answers as closed. Its pages stay as they are.
 *
 * GET    /admin/my-features                       — the features, with how many things each holds
 * POST   /admin/my-features                       { name, note? }
 * GET    /admin/my-features/:id                   — one, with its things as they are now, and what could be added
 * PUT    /admin/my-features/:id                   { name?, note?, enabled? }
 * DELETE /admin/my-features/:id                   — the name goes; its things stay
 * POST   /admin/my-features/:id/items             { kind, refId } — a table, a function or a page joins it
 * DELETE /admin/my-features/:id/items/:kind/:ref  — it leaves (and stays where it was made)
 */
const r = Router();

export const FEATURE_LIMITS = { features: 100, items: 60 } as const;
const Name = z.string().trim().min(1).max(80);
const Note = z.string().trim().max(300);
const CreateBody = z.object({ name: Name, note: Note.optional() }).strict();
const SaveBody = z.object({ name: Name.optional(), note: Note.nullable().optional(), enabled: z.boolean().optional() }).strict();
const ItemBody = z.object({ kind: z.enum(FEATURE_KINDS), refId: z.string().min(1).max(40) }).strict();

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function featureOf(req: Request) {
  const feature = await prisma.feature.findUnique({ where: { id: String(req.params.id) }, include: { items: { orderBy: { createdAt: "asc" } } } });
  if (!feature) throw new AppError(404, "FEATURE_NOT_FOUND", "No such feature");
  return feature;
}
type Held = Awaited<ReturnType<typeof featureOf>>;

/** After what a feature holds, or whether it is on, changed: the doors ask again. */
function changed() {
  forgetFeatureGate();
  forgetTriggers();
}

/** A feature with its things as they are now. A thing deleted where it was made is dropped from the feature here. */
async function full(feature: Held) {
  const ids = (kind: FeatureKind) => feature.items.filter((i) => i.kind === kind).map((i) => i.refId);
  const [tables, fns, pages, taken, allTables, allFns, allPages] = await Promise.all([
    prisma.collection.findMany({ where: { id: { in: ids("table") } }, select: { id: true, slug: true, name: true, fields: true, api: true, _count: { select: { items: { where: { deletedAt: null } } } } } }),
    prisma.fn.findMany({ where: { id: { in: ids("function") } }, select: { id: true, name: true, note: true, enabled: true, draft: true, live: true, runs: true, lastRunAt: true, _count: { select: { triggers: true } } } }),
    prisma.page.findMany({ where: { id: { in: ids("page") }, kind: "page" }, select: { id: true, name: true, slug: true, status: true, draft: true } }),
    prisma.featureItem.findMany({ select: { kind: true, refId: true } }),
    prisma.collection.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, slug: true, name: true } }),
    prisma.fn.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    prisma.page.findMany({ where: { kind: "page" }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, slug: true } }),
  ]);
  // Gone where it was made: not this feature's any more.
  const there = new Set([...tables.map((t) => `table:${t.id}`), ...fns.map((f) => `function:${f.id}`), ...pages.map((p) => `page:${p.id}`)]);
  const gone = feature.items.filter((i) => !there.has(`${i.kind}:${i.refId}`));
  if (gone.length) await prisma.featureItem.deleteMany({ where: { OR: gone.map((i) => ({ kind: i.kind, refId: i.refId })) } });
  const inOne = new Set(taken.map((i) => `${i.kind}:${i.refId}`));
  // In the order they joined.
  const order = (kind: FeatureKind) => new Map(ids(kind).map((id, k) => [id, k]));
  const by = <T extends { id: string }>(list: T[], kind: FeatureKind) => {
    const at = order(kind);
    return [...list].sort((a, b) => (at.get(a.id) ?? 0) - (at.get(b.id) ?? 0));
  };
  return {
    id: feature.id,
    name: feature.name,
    note: feature.note,
    enabled: feature.enabled,
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
    tables: by(tables, "table").map((t) => ({ id: t.id, slug: t.slug, name: t.name, fields: Array.isArray(t.fields) ? t.fields.length : 0, rows: t._count.items, api: accessOf(t.api) })),
    functions: by(fns, "function").map((f) => ({ id: f.id, name: f.name, note: f.note, enabled: f.enabled, published: !!f.live, changed: !same(f.draft, f.live), triggers: f._count.triggers, runs: f.runs, lastRunAt: f.lastRunAt })),
    pages: by(pages, "page").map((p) => ({ id: p.id, name: p.name, slug: p.slug, status: p.status, hasDraft: !!p.draft })),
    // What isn't in any feature yet, to be added to this one.
    free: {
      tables: allTables.filter((t) => !inOne.has(`table:${t.id}`)),
      functions: allFns.filter((f) => !inOne.has(`function:${f.id}`)),
      pages: allPages.filter((p) => !inOne.has(`page:${p.id}`)),
    },
    limits: FEATURE_LIMITS,
  };
}

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const features = await prisma.feature.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { items: { select: { kind: true } } } });
    res.json({
      features: features.map((f) => ({ id: f.id, name: f.name, note: f.note, enabled: f.enabled, updatedAt: f.updatedAt, counts: Object.fromEntries(FEATURE_KINDS.map((k) => [k, f.items.filter((i) => i.kind === k).length])) })),
      limits: FEATURE_LIMITS,
    });
  }),
);

r.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = CreateBody.parse(req.body ?? {});
    if ((await prisma.feature.count()) >= FEATURE_LIMITS.features) throw new AppError(400, "TOO_MANY_FEATURES", `Up to ${FEATURE_LIMITS.features} features`);
    const made = await prisma.feature.create({ data: { name: body.name, note: body.note || null }, include: { items: true } });
    res.status(201).json(await full(made));
  }),
);

r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await full(await featureOf(req)));
  }),
);

r.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const feature = await featureOf(req);
    const body = SaveBody.parse(req.body ?? {});
    const saved = await prisma.feature.update({
      where: { id: feature.id },
      data: { ...(body.name !== undefined ? { name: body.name } : {}), ...(body.note !== undefined ? { note: body.note || null } : {}), ...(body.enabled !== undefined ? { enabled: body.enabled } : {}) },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    if (body.enabled !== undefined) changed();
    res.json(await full(saved));
  }),
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const feature = await featureOf(req);
    // Only the name goes: the tables, functions and pages stay where they were made (and are on again, if the feature was off).
    await prisma.feature.delete({ where: { id: feature.id } });
    changed();
    res.json({ ok: true });
  }),
);

/** Is there such a table, function or page? */
async function exists(kind: FeatureKind, id: string): Promise<boolean> {
  if (kind === "table") return !!(await prisma.collection.findUnique({ where: { id }, select: { id: true } }));
  if (kind === "function") return !!(await prisma.fn.findUnique({ where: { id }, select: { id: true } }));
  return !!(await prisma.page.findFirst({ where: { id, kind: "page" }, select: { id: true } }));
}

r.post(
  "/:id/items",
  asyncHandler(async (req, res) => {
    const feature = await featureOf(req);
    const body = ItemBody.parse(req.body ?? {});
    if (feature.items.length >= FEATURE_LIMITS.items) throw new AppError(400, "TOO_MANY_ITEMS", `A feature holds up to ${FEATURE_LIMITS.items} things`);
    if (!(await exists(body.kind, body.refId))) throw new AppError(404, "ITEM_NOT_FOUND", "No such table, function or page");
    try {
      await prisma.featureItem.create({ data: { featureId: feature.id, kind: body.kind, refId: body.refId } });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      // In a feature already: said with whose it is (this one: nothing to do).
      const other = await prisma.featureItem.findUnique({ where: { kind_refId: { kind: body.kind, refId: body.refId } }, select: { featureId: true, feature: { select: { name: true } } } });
      if (other && other.featureId !== feature.id) throw new AppError(409, "ITEM_TAKEN", "It is another feature's already", { feature: other.feature.name });
    }
    changed();
    res.status(201).json(await full(await featureOf(req)));
  }),
);

r.delete(
  "/:id/items/:kind/:ref",
  asyncHandler(async (req, res) => {
    const feature = await featureOf(req);
    const kind = z.enum(FEATURE_KINDS).safeParse(req.params.kind);
    const gone = kind.success ? await prisma.featureItem.deleteMany({ where: { featureId: feature.id, kind: kind.data, refId: String(req.params.ref) } }) : { count: 0 };
    if (!gone.count) throw new AppError(404, "ITEM_NOT_FOUND", "It isn't in this feature");
    changed();
    res.json(await full(await featureOf(req)));
  }),
);

export default r;
