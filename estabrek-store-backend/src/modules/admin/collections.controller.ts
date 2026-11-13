/**
 * Content collections (W3, lib/collections.ts):
 *
 * GET    /admin/collections                 — every collection with its fields and how many items
 * GET    /admin/collections/presets         — ready collections to start from
 * POST   /admin/collections                 { slug, name, fields } | { preset } — a new collection
 * PUT    /admin/collections/:id             { slug, name, fields }
 * DELETE /admin/collections/:id             — with its items and its template page
 * GET    /admin/collections/:id/items       — its items (newest first)
 * POST   /admin/collections/:id/items       { slug, data, status? }
 * PUT    /admin/collections/:id/items/:item { slug?, data?, status?, sort? }
 * DELETE /admin/collections/:id/items/:item — to the trash (a row already in the trash: for good)
 * POST   /admin/collections/:id/template    — its item page (made with every field connected), made once
 *
 * Any change refreshes the shop's pages (lists show items on any page).
 */
import { Router } from "express";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { triggerCmsRevalidate } from "../../lib/cmsRevalidate.js";
import { checkTree, PAGE_FORMAT } from "../../lib/pageTree.js";
import { CollectionBody, checkItemData, defaultStoreTemplate, defaultTemplate, ITEM_SLUG, LIMITS, PRESETS, STORE_TEMPLATES, TEMPLATE_KIND, type StoreTemplateKind } from "../../lib/collections.js";
import type { Field } from "../../lib/collectionTree.js";

const r = Router();
const refresh = () => void triggerCmsRevalidate([]).catch(() => {});
const fieldsOf = (c: { fields: unknown }) => (Array.isArray(c.fields) ? c.fields : []) as Field[];
const issues = (e: { issues: Array<{ path: PropertyKey[]; message: string }> }) => e.issues.slice(0, 20).map((i) => ({ path: i.path.map(String).join("."), message: i.message }));
const taken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

r.get("/", asyncHandler(async (_req, res) => {
  const rows = await prisma.collection.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { items: { where: { deletedAt: null } } } } } });
  const published = await prisma.collectionItem.groupBy({ by: ["collectionId"], where: { status: "PUBLISHED", deletedAt: null }, _count: { _all: true } });
  res.json(rows.map(({ _count, ...c }) => ({ ...c, items: _count.items, published: published.find((p) => p.collectionId === c.id)?._count._all ?? 0 })));
}));

r.get("/presets", (_req, res) => { res.json(PRESETS); });

/** POST /admin/collections/store-template/:kind — the product page's or category page's design (made once); its page id. */
r.post("/store-template/:kind", asyncHandler(async (req, res) => {
  const kind = req.params.kind as StoreTemplateKind;
  const spec = STORE_TEMPLATES[kind];
  if (!spec) return res.status(400).json({ error: "UNKNOWN_KIND" });
  const existing = await prisma.page.findUnique({ where: { slug: spec.slug }, select: { id: true } });
  if (existing) return res.json({ id: existing.id });
  const checked = checkTree(defaultStoreTemplate(kind));
  if (!checked.ok) return res.status(500).json({ error: "TEMPLATE_INVALID", issues: checked.issues });
  try {
    // A draft: the shop keeps its own product and category pages until the design is published from the editor.
    const page = await prisma.page.create({ data: { name: spec.name, slug: spec.slug, status: "DRAFT", kind: spec.kind, format: PAGE_FORMAT.tree, tree: checked.tree as any }, select: { id: true } });
    refresh();
    res.status(201).json({ id: page.id });
  } catch (e) {
    if (taken(e)) { const again = await prisma.page.findUnique({ where: { slug: spec.slug }, select: { id: true } }); if (again) return res.json({ id: again.id }); }
    throw e;
  }
}));

r.post("/", asyncHandler(async (req, res) => {
  const preset = typeof req.body?.preset === "string" ? PRESETS[req.body.preset] : undefined;
  const parsed = CollectionBody.safeParse(preset ? { slug: req.body?.slug ?? preset.slug, name: preset.name, fields: preset.fields } : req.body);
  if (!parsed.success) return res.status(400).json({ error: "COLLECTION_INVALID", issues: issues(parsed.error) });
  try {
    const made = await prisma.collection.create({ data: { slug: parsed.data.slug, name: parsed.data.name as any, fields: parsed.data.fields as any } });
    res.status(201).json({ ...made, items: 0, published: 0 });
  } catch (e) {
    if (taken(e)) return res.status(409).json({ error: "SLUG_TAKEN" });
    throw e;
  }
}));

r.put("/:id", asyncHandler(async (req, res) => {
  const parsed = CollectionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "COLLECTION_INVALID", issues: issues(parsed.error) });
  try {
    const saved = await prisma.collection.update({ where: { id: req.params.id }, data: { slug: parsed.data.slug, name: parsed.data.name as any, fields: parsed.data.fields as any } });
    refresh();
    res.json(saved);
  } catch (e) {
    if (taken(e)) return res.status(409).json({ error: "SLUG_TAKEN" });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return res.status(404).json({ error: "NOT_FOUND" });
    throw e;
  }
}));

r.delete("/:id", asyncHandler(async (req, res) => {
  const c = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "NOT_FOUND" });
  await prisma.$transaction([
    prisma.collection.delete({ where: { id: c.id } }),
    ...(c.templateId ? [prisma.page.deleteMany({ where: { id: c.templateId, kind: TEMPLATE_KIND } })] : []),
  ]);
  refresh();
  res.json({ ok: true });
}));

r.get("/:id/items", asyncHandler(async (req, res) => {
  const items = await prisma.collectionItem.findMany({ where: { collectionId: req.params.id, deletedAt: null }, orderBy: [{ sort: "asc" }, { createdAt: "desc" }], take: LIMITS.itemsList });
  res.json(items);
}));

const itemBody = (fields: Field[], body: any, partial: boolean) => {
  const out: { slug?: string; data?: Record<string, unknown>; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"; sort?: number } = {};
  if (body?.slug !== undefined || !partial) {
    const slug = String(body?.slug ?? "").trim().toLowerCase();
    if (!ITEM_SLUG.test(slug)) return { error: { field: "slug", message: "Small letters, digits and -" } };
    out.slug = slug;
  }
  if (body?.data !== undefined || !partial) {
    const checked = checkItemData(fields, body?.data);
    if (!checked.ok) return { error: { field: "data", message: "Some values are wrong", issues: checked.issues } };
    out.data = checked.data;
  }
  if (body?.status !== undefined) {
    if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(body.status)) return { error: { field: "status", message: "DRAFT, PUBLISHED or ARCHIVED" } };
    out.status = body.status;
  }
  if (body?.sort !== undefined) {
    if (!Number.isInteger(body.sort) || Math.abs(body.sort) > 1_000_000) return { error: { field: "sort", message: "A whole number" } };
    out.sort = body.sort;
  }
  return { out };
};

r.post("/:id/items", asyncHandler(async (req, res) => {
  const c = await prisma.collection.findUnique({ where: { id: req.params.id }, include: { _count: { select: { items: { where: { deletedAt: null } } } } } });
  if (!c) return res.status(404).json({ error: "NOT_FOUND" });
  if (c._count.items >= LIMITS.items) return res.status(400).json({ error: "TOO_MANY_ITEMS" });
  const b = itemBody(fieldsOf(c), req.body, false);
  if ("error" in b) return res.status(400).json({ error: "ITEM_INVALID", ...b.error });
  try {
    const status = b.out.status ?? "DRAFT";
    const made = await prisma.collectionItem.create({ data: { collectionId: c.id, slug: b.out.slug!, data: b.out.data as any, status, sort: b.out.sort ?? 0, publishedAt: status === "PUBLISHED" ? new Date() : null } });
    refresh();
    res.status(201).json(made);
  } catch (e) {
    if (taken(e)) return res.status(409).json({ error: "SLUG_TAKEN" });
    throw e;
  }
}));

r.put("/:id/items/:item", asyncHandler(async (req, res) => {
  const c = await prisma.collection.findUnique({ where: { id: req.params.id } });
  const was = await prisma.collectionItem.findFirst({ where: { id: req.params.item, collectionId: req.params.id, deletedAt: null } });
  if (!c || !was) return res.status(404).json({ error: "NOT_FOUND" });
  const b = itemBody(fieldsOf(c), req.body, true);
  if ("error" in b) return res.status(400).json({ error: "ITEM_INVALID", ...b.error });
  try {
    const saved = await prisma.collectionItem.update({ where: { id: was.id }, data: { ...b.out, data: b.out.data as any, ...(b.out.status === "PUBLISHED" && !was.publishedAt ? { publishedAt: new Date() } : {}) } });
    refresh();
    res.json(saved);
  } catch (e) {
    if (taken(e)) return res.status(409).json({ error: "SLUG_TAKEN" });
    throw e;
  }
}));

r.delete("/:id/items/:item", asyncHandler(async (req, res) => {
  // To the trash (the data grid restores from it; emptied after TRASH_DAYS). A row already there goes for good.
  const where = { id: req.params.item, collectionId: req.params.id };
  const moved = await prisma.collectionItem.updateMany({ where: { ...where, deletedAt: null }, data: { deletedAt: new Date() } });
  const gone = moved.count ? moved : await prisma.collectionItem.deleteMany({ where });
  if (!gone.count) return res.status(404).json({ error: "NOT_FOUND" });
  refresh();
  res.json({ ok: true });
}));

r.post("/:id/template", asyncHandler(async (req, res) => {
  const c = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "NOT_FOUND" });
  if (c.templateId) {
    const existing = await prisma.page.findUnique({ where: { id: c.templateId }, select: { id: true } });
    if (existing) return res.json({ id: existing.id });
  }
  const checked = checkTree(defaultTemplate({ slug: c.slug, fields: fieldsOf(c) }));
  if (!checked.ok) return res.status(500).json({ error: "TEMPLATE_INVALID", issues: checked.issues });
  const name = typeof (c.name as any)?.en === "string" ? `${(c.name as any).en} — item page` : `${c.slug} — item page`;
  const page = await prisma.page.create({ data: { name, slug: `/__collection/${randomBytes(6).toString("hex")}`, status: "PUBLISHED", kind: TEMPLATE_KIND, format: PAGE_FORMAT.tree, tree: checked.tree as any }, select: { id: true } });
  await prisma.collection.update({ where: { id: c.id }, data: { templateId: page.id } });
  refresh();
  res.status(201).json({ id: page.id });
}));

export default r;
