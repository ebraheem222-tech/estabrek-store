/**
 * Content collections (W3, lib/collections.ts):
 *
 * GET    /admin/collections                 — every collection with its fields and how many items
 * GET    /admin/collections/presets         — ready collections to start from
 * POST   /admin/collections                 { slug, name, fields } | { preset } — a new collection
 * PUT    /admin/collections/:id             { slug, name, fields, accept? } — a change of fields that would put values aside needs accept: true (409 with what it would do)
 * POST   /admin/collections/:id/fields/preview { slug, name, fields } — what the change would do to the rows; nothing is written
 * GET    /admin/collections/:id/revisions   — its fields before each change (the latest 50)
 * POST   /admin/collections/:id/revisions/:rev/preview — what going back to that version would do
 * POST   /admin/collections/:id/revisions/:rev/restore { accept? } — its fields and name as they were then
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
import { CollectionBody, checkItemData, defaultStoreTemplate, defaultTemplate, ITEM_SLUG, LIMITS, PRESETS, STORE_TEMPLATES, TEMPLATE_KIND, withDefaults, type StoreTemplateKind } from "../../lib/collections.js";
import { changedUnique, uniqueIssues } from "../../lib/uniqueValues.js";
import { applySchemaChange, hiddenOf, needsAccept, planChange, previewSchemaChange, shownRow, type Impact } from "../../lib/schemaChange.js";
import { checkLinks, linkGone, relationProblem, saveLinks, splitLinks, tablesLinking, trashRows, withLinks } from "../../lib/links.js";
import { AppError } from "../../utils/httpError.js";
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
  const unlinked = await relationProblem(prisma, parsed.data.fields as Field[]);
  if (unlinked) return res.status(400).json({ error: "COLLECTION_INVALID", issues: [unlinked] });
  try {
    const made = await prisma.collection.create({ data: { slug: parsed.data.slug, name: parsed.data.name as any, fields: parsed.data.fields as any } });
    res.status(201).json({ ...made, items: 0, published: 0 });
  } catch (e) {
    if (taken(e)) return res.status(409).json({ error: "SLUG_TAKEN" });
    throw e;
  }
}));

const KEEP_REVISIONS = 50;
const adminOf = (req: any): string | null => (req.user?.bypass ? null : req.access?.adminId ?? null);
/** The language loose words are read in when a kind changes (the admin's, else Arabic). */
const langOf = (req: any) => (["ar", "en", "he"].includes(String(req.query?.lang ?? req.body?.lang)) ? (String(req.query?.lang ?? req.body?.lang) as "ar" | "en" | "he") : "ar");

/**
 * The table saved with new fields: what the change does to the rows is worked out first; a change
 * that would put values aside needs `accept`; then, in one go, the rows are rewritten where a kind
 * changed, the table is saved, and its fields as they were are kept as a version.
 */
async function saveTable(req: any, id: string, next: { slug: string; name: unknown; fields: Field[] }, accept: boolean) {
  const was = await prisma.collection.findUnique({ where: { id } });
  if (!was) return { status: 404 as const, body: { error: "NOT_FOUND" } };
  // A relation links a table that is there (its own counts).
  const unlinked = await relationProblem(prisma, next.fields, id);
  if (unlinked) return { status: 400 as const, body: { error: "COLLECTION_INVALID", issues: [unlinked] } };
  const before = fieldsOf(was);
  const lang = langOf(req);
  const changed = planChange(before, next.fields).length > 0 || JSON.stringify(before) !== JSON.stringify(next.fields);
  const impacts = changed ? await previewSchemaChange(prisma, id, before, next.fields, lang) : [];
  if (needsAccept(impacts) && !accept) return { status: 409 as const, body: { error: "SCHEMA_CHANGE_NEEDS_CONFIRM", message: "This change puts some values aside: look at what it does, then accept it", changes: impacts } };
  const saved = await prisma.$transaction(
    async (tx) => {
      if (changed) {
        await applySchemaChange(tx, id, before, next.fields, lang);
        await tx.studioRevision.create({ data: { kind: "table", objectId: id, data: { slug: was.slug, name: was.name, fields: before } as any, summary: impacts as any, adminUserId: adminOf(req) } });
      }
      return tx.collection.update({ where: { id }, data: { slug: next.slug, name: next.name as any, fields: next.fields as any } });
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  if (changed) {
    // Only the latest versions are kept.
    const old = await prisma.studioRevision.findMany({ where: { kind: "table", objectId: id }, orderBy: { createdAt: "desc" }, skip: KEEP_REVISIONS, select: { id: true } });
    if (old.length) await prisma.studioRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  }
  refresh();
  return { status: 200 as const, body: { ...saved, changes: impacts } };
}

r.put("/:id", asyncHandler(async (req, res) => {
  const { accept, lang: _lang, ...body } = (req.body ?? {}) as Record<string, unknown>;
  const parsed = CollectionBody.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: "COLLECTION_INVALID", issues: issues(parsed.error) });
  try {
    const out = await saveTable(req, req.params.id, parsed.data as { slug: string; name: unknown; fields: Field[] }, accept === true);
    res.status(out.status).json(out.body);
  } catch (e) {
    if (taken(e)) return res.status(409).json({ error: "SLUG_TAKEN" });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return res.status(404).json({ error: "NOT_FOUND" });
    throw e;
  }
}));

/** What saving these fields would do to the rows that are there. Nothing is written. */
r.post("/:id/fields/preview", asyncHandler(async (req, res) => {
  const { accept: _accept, lang: _lang, ...body } = (req.body ?? {}) as Record<string, unknown>;
  const parsed = CollectionBody.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: "COLLECTION_INVALID", issues: issues(parsed.error) });
  const was = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!was) return res.status(404).json({ error: "NOT_FOUND" });
  const changes = await previewSchemaChange(prisma, was.id, fieldsOf(was), parsed.data.fields as Field[], langOf(req));
  res.json({ changes, needsAccept: needsAccept(changes) });
}));

r.get("/:id/revisions", asyncHandler(async (req, res) => {
  const rows = await prisma.studioRevision.findMany({ where: { kind: "table", objectId: req.params.id }, orderBy: { createdAt: "desc" }, take: KEEP_REVISIONS });
  const ids = [...new Set(rows.map((x) => x.adminUserId).filter(Boolean) as string[])];
  const names = new Map((ids.length ? await prisma.adminUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : []).map((x) => [x.id, x.name]));
  res.json(rows.map((x) => {
    const data = (x.data ?? {}) as { fields?: Field[] };
    return { id: x.id, createdAt: x.createdAt, who: x.adminUserId ? names.get(x.adminUserId) ?? null : null, fields: (data.fields ?? []).map((f) => ({ id: f.id, type: f.type, name: f.name })), changes: x.summary as unknown as Impact[] };
  }));
}));

/** The table's fields and name as they were in a version (its address stays: links don't break). */
async function versionOf(id: string, rev: string) {
  const [was, version] = await Promise.all([prisma.collection.findUnique({ where: { id } }), prisma.studioRevision.findFirst({ where: { id: rev, kind: "table", objectId: id } })]);
  if (!was || !version) return null;
  const data = (version.data ?? {}) as { name?: unknown; fields?: unknown };
  // Checked again as a save would be: the rules for fields may have grown since.
  const parsed = CollectionBody.safeParse({ slug: was.slug, name: data.name ?? was.name, fields: data.fields });
  return { was, parsed };
}

r.post("/:id/revisions/:rev/preview", asyncHandler(async (req, res) => {
  const v = await versionOf(req.params.id, req.params.rev);
  if (!v) return res.status(404).json({ error: "NOT_FOUND" });
  if (!v.parsed.success) return res.status(400).json({ error: "COLLECTION_INVALID", issues: issues(v.parsed.error) });
  const changes = await previewSchemaChange(prisma, v.was.id, fieldsOf(v.was), v.parsed.data.fields as Field[], langOf(req));
  res.json({ changes, needsAccept: needsAccept(changes), fields: v.parsed.data.fields });
}));

r.post("/:id/revisions/:rev/restore", asyncHandler(async (req, res) => {
  const v = await versionOf(req.params.id, req.params.rev);
  if (!v) return res.status(404).json({ error: "NOT_FOUND" });
  if (!v.parsed.success) return res.status(400).json({ error: "COLLECTION_INVALID", issues: issues(v.parsed.error) });
  const out = await saveTable(req, v.was.id, v.parsed.data as { slug: string; name: unknown; fields: Field[] }, req.body?.accept === true);
  res.status(out.status).json(out.body);
}));

r.delete("/:id", asyncHandler(async (req, res) => {
  const c = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: "NOT_FOUND" });
  // A table other tables link stays until their relations let go of it (its rows' links go with them: the database does that).
  const linking = await tablesLinking(prisma, c.id);
  if (linking.length) return res.status(409).json({ error: "TABLE_LINKED", message: "Other tables link this one: remove their relations first", tables: linking });
  await prisma.$transaction([
    prisma.studioRevision.deleteMany({ where: { kind: "table", objectId: c.id } }),
    prisma.collection.delete({ where: { id: c.id } }),
    ...(c.templateId ? [prisma.page.deleteMany({ where: { id: c.templateId, kind: TEMPLATE_KIND } })] : []),
  ]);
  refresh();
  res.json({ ok: true });
}));

r.get("/:id/items", asyncHandler(async (req, res) => {
  const [c, items] = await Promise.all([
    prisma.collection.findUnique({ where: { id: req.params.id }, select: { fields: true } }),
    prisma.collectionItem.findMany({ where: { collectionId: req.params.id, deletedAt: null }, orderBy: [{ sort: "asc" }, { createdAt: "desc" }], take: LIMITS.itemsList }),
  ]);
  res.json(c ? await withLinks(prisma, { id: req.params.id, fields: fieldsOf(c) }, items.map((item) => shownRow(item, fieldsOf(c)))) : items);
}));

/** An item's relations, taken out of its data and checked (lib/links.ts): the rows to link, or a 400's body. */
async function itemLinks(table: { id: string; fields: Field[] }, body: any, was?: { id: string }) {
  const split = splitLinks(table.fields, body?.data, true);
  const check = split.issues.length ? null : await checkLinks(prisma, table, [{ id: was?.id, asked: split.asked }]);
  const wrong = split.issues.length ? split.issues : check?.issues.get(0);
  if (wrong) return { error: { error: "ITEM_INVALID", field: "data", message: "Some values are wrong", issues: wrong } };
  return { body: body?.data === undefined ? body : { ...body, data: split.rest }, links: check!.ready[0] };
}

/** 400 with the fields whose value another row holds, or null when every "only value" is free. */
async function takenValues(collectionId: string, fields: Field[], data: Record<string, unknown> | undefined, was?: { id: string; data: unknown }) {
  if (!data || !fields.some((f) => f.unique)) return null;
  const taken = await uniqueIssues(prisma, collectionId, fields, [was ? { id: was.id, data, changed: changedUnique(fields, (was.data ?? {}) as Record<string, unknown>, data) } : { data }]);
  return taken.size ? { error: "ITEM_INVALID", field: "data", message: "Some values are wrong", issues: taken.get(0) } : null;
}

const itemBody = (fields: Field[], body: any, partial: boolean) => {
  const out: { slug?: string; data?: Record<string, unknown>; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"; sort?: number } = {};
  if (body?.slug !== undefined || !partial) {
    const slug = String(body?.slug ?? "").trim().toLowerCase();
    if (!ITEM_SLUG.test(slug)) return { error: { field: "slug", message: "Small letters, digits and -" } };
    out.slug = slug;
  }
  if (body?.data !== undefined || !partial) {
    // A new item starts from the fields' defaults.
    const checked = checkItemData(fields, partial ? body?.data : withDefaults(fields, body?.data && typeof body.data === "object" ? body.data : {}));
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
  const table = { id: c.id, fields: fieldsOf(c) };
  const linked = await itemLinks(table, req.body);
  if ("error" in linked) return res.status(400).json(linked.error);
  const b = itemBody(table.fields, linked.body, false);
  if ("error" in b) return res.status(400).json({ error: "ITEM_INVALID", ...b.error });
  const doubled = await takenValues(c.id, table.fields, b.out.data);
  if (doubled) return res.status(400).json(doubled);
  try {
    const status = b.out.status ?? "DRAFT";
    const made = await prisma.$transaction(async (tx) => {
      const row = await tx.collectionItem.create({ data: { collectionId: c.id, slug: b.out.slug!, data: b.out.data as any, status, sort: b.out.sort ?? 0, publishedAt: status === "PUBLISHED" ? new Date() : null } });
      await saveLinks(tx, table, [{ id: row.id, links: linked.links }]);
      return row;
    });
    refresh();
    res.status(201).json((await withLinks(prisma, table, [made]))[0]);
  } catch (e) {
    if (taken(e)) return res.status(409).json({ error: "SLUG_TAKEN" });
    if (linkGone(e)) return res.status(409).json({ error: "LINK_GONE" });
    throw e;
  }
}));

r.put("/:id/items/:item", asyncHandler(async (req, res) => {
  const c = await prisma.collection.findUnique({ where: { id: req.params.id } });
  const was = await prisma.collectionItem.findFirst({ where: { id: req.params.item, collectionId: req.params.id, deletedAt: null } });
  if (!c || !was) return res.status(404).json({ error: "NOT_FOUND" });
  const table = { id: c.id, fields: fieldsOf(c) };
  const linked = await itemLinks(table, req.body, was);
  if ("error" in linked) return res.status(400).json(linked.error);
  const b = itemBody(table.fields, linked.body, true);
  if ("error" in b) return res.status(400).json({ error: "ITEM_INVALID", ...b.error });
  const doubled = await takenValues(c.id, table.fields, b.out.data, was);
  if (doubled) return res.status(400).json(doubled);
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const row = await tx.collectionItem.update({ where: { id: was.id }, data: { ...b.out, data: (b.out.data ? { ...hiddenOf(was.data, table.fields), ...b.out.data } : undefined) as any, ...(b.out.status === "PUBLISHED" && !was.publishedAt ? { publishedAt: new Date() } : {}), ...(linked.links.size ? { updatedAt: new Date() } : {}) } });
      await saveLinks(tx, table, [{ id: was.id, links: linked.links }]);
      return row;
    });
    refresh();
    res.json((await withLinks(prisma, table, [saved]))[0]);
  } catch (e) {
    if (taken(e)) return res.status(409).json({ error: "SLUG_TAKEN" });
    if (linkGone(e)) return res.status(409).json({ error: "LINK_GONE" });
    throw e;
  }
}));

r.delete("/:id/items/:item", asyncHandler(async (req, res) => {
  // To the trash (the data grid restores from it; emptied after TRASH_DAYS), the way the relations
  // linking it chose (lib/links.ts): one that forbids it answers 409. A row already there goes for good.
  const where = { id: req.params.item, collectionId: req.params.id };
  const which = Prisma.sql`i."id" = ${where.id} AND i."collectionId" = ${where.collectionId}`;
  let moved: { changed: number; withThem: number };
  try {
    moved = await prisma.$transaction((tx) => trashRows(tx, which, new Date()));
  } catch (e) {
    if (e instanceof AppError && e.code === "ROWS_LINKED") return res.status(409).json({ error: e.code, message: e.message, ...(e.details as object) });
    throw e;
  }
  const gone = moved.changed || (await prisma.collectionItem.deleteMany({ where })).count;
  if (!gone) return res.status(404).json({ error: "NOT_FOUND" });
  refresh();
  res.json({ ok: true, ...(moved.withThem ? { withThem: moved.withThem } : {}) });
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
