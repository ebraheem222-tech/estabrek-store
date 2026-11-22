import { Router, type Request } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { accessOf } from "../../lib/dataApi.js";
import { FEATURE_KINDS, forgetFeatureGate, isStorePage, type FeatureKind } from "../../lib/featureGate.js";
import { forgetTriggers } from "../../lib/fnTriggers.js";
import { triggerCmsRevalidate } from "../../lib/cmsRevalidate.js";
import { hasPermission } from "../../middleware/access.js";
import { TEMPLATE_KEY, TEMPLATE_VERSION } from "../../lib/featureTemplate.js";
import { REMOVE_ROWS, exportFeature, installTemplate, installedOf, installedView, previewInstall, removalOf, removeFeature } from "../../lib/featureInstall.js";
import { galleryFile, galleryList } from "../../lib/gallery/index.js";
import { previewUpgrade, upgradeFeature } from "../../lib/featureUpgrade.js";
import { adminIdOf } from "./settings.controller.js";
import { SiteHomeBody, makeSiteHome, siteHomeView, undoSiteHome } from "./siteHome.js";

/**
 * /v1/admin/my-features — ميزاتي (M): a feature the owner built. It is a name over things made
 * elsewhere in the studio (tables, functions, pages), so they are found together and switched off
 * together. A thing belongs to one feature at most; deleting a feature only ungroups its things.
 * Looking needs features:read, changing features:write (admin.routes.ts).
 *
 * Switched off (lib/featureGate.ts): the feature's functions aren't started by anything but the
 * admin's own run, its tables' API answers as closed, and its pages answer on the shop as pages
 * that aren't there (the editor still opens them; `hidden` on each says so). The store's own pages
 * (the home, the shop, the cart) aren't taken into a feature: they never hide.
 *
 * GET    /admin/my-features                       — the features, with how many things each holds
 * POST   /admin/my-features                       { name, note? }
 * GET    /admin/my-features/:id                   — one, with its things as they are now, and what could be added
 * PUT    /admin/my-features/:id                   { name?, note?, enabled? }
 * DELETE /admin/my-features/:id                   — the name goes; its things stay
 * POST   /admin/my-features/:id/items             { kind, refId } — a table, a function or a page joins it
 * DELETE /admin/my-features/:id/items/:kind/:ref  — it leaves (and stays where it was made)
 *
 * Templates (stage 4, lib/featureTemplate.ts + lib/featureInstall.ts): a feature as one file with a version.
 * GET    /admin/my-features/:id/export?key&version — the feature as a template file, with what couldn't go into it
 * POST   /admin/my-features/templates/preview { template } — what installing it would make here; nothing is written
 * POST   /admin/my-features/templates/install { template } — installed as a draft, under a new feature that is off
 * GET    /admin/my-features/templates/gallery     — the ready examples (functions, APIs, features: lib/gallery)
 * GET    /admin/my-features/templates/gallery/:key — one example's file, shown and installed like any file
 * POST   /admin/my-features/:id/upgrade/preview { template, take? } — what a newer file of its template would change; nothing is written
 * POST   /admin/my-features/:id/upgrade { template, take? } — the upgrade made: what the owner changed stays theirs unless named in `take`
 * GET    /admin/my-features/:id/removal              — what removing it with its things would take, what stops it
 * POST   /admin/my-features/:id/remove { rows: "keep" | "delete" } — the feature and its functions, pages and
 *                                                    tables (their rows kept, in no feature, or deleted)
 *
 * A whole site as the store's face («خلّيه الرئيسية», ./siteHome.ts; also settings:write: the menus and the home):
 * POST   /admin/my-features/:id/site-home { header, footer } — its first page at "/", the store's menus made of its pages
 * DELETE /admin/my-features/site-home                       — the store's own home and menus back
 * Switching the site off, ungrouping it or removing it puts the store's own home back first.
 * Exporting reads functions and pages too (functions:read, pages:read); installing and removing write
 * them (functions:write, pages:write: the tables are the pages' area).
 */
const r = Router();

export const FEATURE_LIMITS = { features: 100, items: 60 } as const;
const Name = z.string().trim().min(1).max(80);
const Note = z.string().trim().max(300);
const CreateBody = z.object({ name: Name, note: Note.optional() }).strict();
const SaveBody = z.object({ name: Name.optional(), note: Note.nullable().optional(), enabled: z.boolean().optional() }).strict();
const ItemBody = z.object({ kind: z.enum(FEATURE_KINDS), refId: z.string().min(1).max(40) }).strict();

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const langOf = (req: Request): "ar" | "en" | "he" => {
  const l = String(req.query?.lang ?? (req.body as { lang?: unknown } | undefined)?.lang ?? "");
  return l === "en" || l === "he" ? l : "ar";
};
/** What a template's work reaches beyond the feature itself: said up front, not found out halfway. */
function mayAlso(req: Request, ...permissions: string[]) {
  const lacking = permissions.filter((p) => !hasPermission(req, p));
  if (lacking.length) throw new AppError(403, "FORBIDDEN", "This needs more permissions", { lacking });
}

async function featureById(id: string) {
  const feature = await prisma.feature.findUnique({ where: { id }, include: { items: { orderBy: { createdAt: "asc" } } } });
  if (!feature) throw new AppError(404, "FEATURE_NOT_FOUND", "No such feature");
  return feature;
}
const featureOf = (req: Request) => featureById(String(req.params.id));
type Held = Awaited<ReturnType<typeof featureOf>>;

/**
 * After what a feature holds, or whether it is on, changed: the doors ask again. `pages`: the pages
 * that show or hide with the change; the shop is told to read them again (its copies are dropped).
 */
async function changed(pages: string[] = []) {
  forgetFeatureGate();
  forgetTriggers();
  if (!pages.length) return;
  const slugs = (await prisma.page.findMany({ where: { id: { in: pages }, kind: "page" }, select: { slug: true } })).map((p) => p.slug);
  if (slugs.length) await triggerCmsRevalidate(slugs);
}
const pagesOf = (feature: Held) => feature.items.filter((i) => i.kind === "page").map((i) => i.refId);

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
  // The pages' keys in the template it was installed from, both ways.
  const pageKeys = new Map(Object.entries(installedOf(feature.template)?.ids.page ?? {}).filter(([, pid]) => pages.some((p) => p.id === pid)));
  const pageKey = new Map([...pageKeys].map(([key, pid]) => [pid, key]));
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
    // Made by installing a template: which one, and its version.
    template: installedView(feature.template),
    // A whole site's first page, and whether it is shown as the store's home (or another site is).
    siteHome: await siteHomeView(feature.id, pageKeys.get("home") ?? null),
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt,
    tables: by(tables, "table").map((t) => ({ id: t.id, slug: t.slug, name: t.name, fields: Array.isArray(t.fields) ? t.fields.length : 0, rows: t._count.items, api: accessOf(t.api) })),
    functions: by(fns, "function").map((f) => ({ id: f.id, name: f.name, note: f.note, enabled: f.enabled, published: !!f.live, changed: !same(f.draft, f.live), triggers: f._count.triggers, runs: f.runs, lastRunAt: f.lastRunAt })),
    // `hidden`: the feature is off, so the shop answers this page as one that isn't there.
    // `key`: its key in the template the feature was installed from (none: added by hand).
    pages: by(pages, "page").map((p) => ({ id: p.id, key: pageKey.get(p.id) ?? null, name: p.name, slug: p.slug, status: p.status, hasDraft: !!p.draft, hidden: !feature.enabled && !isStorePage(p.slug) })),
    // What isn't in any feature yet, to be added to this one.
    free: {
      tables: allTables.filter((t) => !inOne.has(`table:${t.id}`)),
      functions: allFns.filter((f) => !inOne.has(`function:${f.id}`)),
      // Not the store's own pages (the home, the shop, the cart): they never follow a switch.
      pages: allPages.filter((p) => !inOne.has(`page:${p.id}`) && !isStorePage(p.slug)),
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

/* ---------------- Templates ---------------- */

const TemplateBody = z.object({ template: z.unknown(), lang: z.enum(["ar", "en", "he"]).optional() }).strict();

r.get(
  "/templates/gallery",
  asyncHandler(async (_req, res) => {
    res.json(galleryList());
  }),
);

r.get(
  "/templates/gallery/:key",
  asyncHandler(async (req, res) => {
    const template = galleryFile(String(req.params.key));
    if (!template) throw new AppError(404, "TEMPLATE_NOT_FOUND", "No such example in the gallery");
    res.json({ template });
  }),
);

r.post(
  "/templates/preview",
  asyncHandler(async (req, res) => {
    mayAlso(req, "functions:write", "pages:write");
    const body = TemplateBody.parse(req.body ?? {});
    res.json(await previewInstall(body.template));
  }),
);

r.post(
  "/templates/install",
  asyncHandler(async (req, res) => {
    mayAlso(req, "functions:write", "pages:write");
    const body = TemplateBody.parse(req.body ?? {});
    if ((await prisma.feature.count()) >= FEATURE_LIMITS.features) throw new AppError(400, "TOO_MANY_FEATURES", `Up to ${FEATURE_LIMITS.features} features`);
    const made = await installTemplate(body.template, { lang: body.lang ?? langOf(req), by: req.access?.email ?? null });
    res.status(201).json(await full(await featureById(made.id)));
  }),
);

/* ---------------- A whole site as the store's home ---------------- */

r.delete(
  "/site-home",
  asyncHandler(async (req, res) => {
    mayAlso(req, "pages:write", "settings:write");
    res.json({ ok: true, ...(await undoSiteHome(await adminIdOf(req))) });
  }),
);

r.post(
  "/:id/site-home",
  asyncHandler(async (req, res) => {
    mayAlso(req, "pages:write", "settings:write");
    const body = SiteHomeBody.parse(req.body ?? {});
    const made = await makeSiteHome(String(req.params.id), body, await adminIdOf(req));
    res.json({ ...made, feature: await full(await featureOf(req)) });
  }),
);

r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await full(await featureOf(req)));
  }),
);

const ExportQuery = z.object({ key: z.string().regex(TEMPLATE_KEY, "A key is letters, digits, - and _").optional(), version: z.string().regex(TEMPLATE_VERSION, "A version is three numbers, like 1.0.0").optional(), lang: z.enum(["ar", "en", "he"]).optional() });

r.get(
  "/:id/export",
  asyncHandler(async (req, res) => {
    mayAlso(req, "functions:read", "pages:read");
    const q = ExportQuery.parse(req.query ?? {});
    res.json(await exportFeature(String(req.params.id), { key: q.key || undefined, version: q.version || undefined, lang: q.lang ?? "ar" }));
  }),
);

const UpgradeBody = z.object({ template: z.unknown(), take: z.array(z.string().max(120)).max(200).optional(), lang: z.enum(["ar", "en", "he"]).optional() }).strict();

r.post(
  "/:id/upgrade/preview",
  asyncHandler(async (req, res) => {
    mayAlso(req, "functions:write", "pages:write");
    const body = UpgradeBody.parse(req.body ?? {});
    res.json(await previewUpgrade(String(req.params.id), body.template, body.take ?? [], body.lang ?? langOf(req)));
  }),
);

r.post(
  "/:id/upgrade",
  asyncHandler(async (req, res) => {
    mayAlso(req, "functions:write", "pages:write");
    const body = UpgradeBody.parse(req.body ?? {});
    const done = await upgradeFeature(String(req.params.id), body.template, { take: body.take ?? [], lang: body.lang ?? langOf(req), by: req.access?.email ?? null });
    res.json({ ...done, feature: await full(await featureOf(req)) });
  }),
);

r.get(
  "/:id/removal",
  asyncHandler(async (req, res) => {
    res.json(await removalOf(String(req.params.id), langOf(req)));
  }),
);

r.post(
  "/:id/remove",
  asyncHandler(async (req, res) => {
    mayAlso(req, "functions:write", "pages:write");
    const body = z.object({ rows: z.enum(REMOVE_ROWS), lang: z.enum(["ar", "en", "he"]).optional() }).strict().parse(req.body ?? {});
    // A site that is the store's home: the store's own home and menus come back before its pages go.
    await undoSiteHome(await adminIdOf(req), String(req.params.id));
    res.json({ ok: true, removed: await removeFeature(String(req.params.id), body.rows, body.lang ?? langOf(req)) });
  }),
);

r.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const feature = await featureOf(req);
    const body = SaveBody.parse(req.body ?? {});
    // Switched off, a site that is the store's home would leave "/" to a hidden page: the store's own comes back.
    if (body.enabled === false) await undoSiteHome(await adminIdOf(req), feature.id);
    const saved = await prisma.feature.update({
      where: { id: feature.id },
      data: { ...(body.name !== undefined ? { name: body.name } : {}), ...(body.note !== undefined ? { note: body.note || null } : {}), ...(body.enabled !== undefined ? { enabled: body.enabled } : {}) },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    // Switched: its pages show, or hide, on the shop from now.
    if (body.enabled !== undefined) await changed(body.enabled !== feature.enabled ? pagesOf(feature) : []);
    res.json(await full(saved));
  }),
);

r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const feature = await featureOf(req);
    // Only the name goes: the tables, functions and pages stay where they were made (and are on again, if the feature was off).
    // A site that was the store's home stops being it (with the name goes the way to undo it).
    await undoSiteHome(await adminIdOf(req), feature.id);
    await prisma.feature.delete({ where: { id: feature.id } });
    await changed(feature.enabled ? [] : pagesOf(feature));
    res.json({ ok: true });
  }),
);

/** Is there such a table, function or page? (A page: one a feature may hold, not one of the store's own.) */
async function exists(kind: FeatureKind, id: string): Promise<boolean> {
  if (kind === "table") return !!(await prisma.collection.findUnique({ where: { id }, select: { id: true } }));
  if (kind === "function") return !!(await prisma.fn.findUnique({ where: { id }, select: { id: true } }));
  const page = await prisma.page.findFirst({ where: { id, kind: "page" }, select: { slug: true } });
  if (page && isStorePage(page.slug)) throw new AppError(400, "STORE_PAGE", "The home, the shop and the cart are the store's own pages: they aren't a feature's");
  return !!page;
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
    // A page joining a feature that is off hides with it.
    await changed(body.kind === "page" && !feature.enabled ? [body.refId] : []);
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
    // A page leaving a feature that is off shows again.
    await changed(kind.success && kind.data === "page" && !feature.enabled ? [String(req.params.ref)] : []);
    res.json(await full(await featureOf(req)));
  }),
);

export default r;
