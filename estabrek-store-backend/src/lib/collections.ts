/**
 * Content collections (W3): a collection's fields and its items' values, checked; ready
 * collections to start from (a blog, a lookbook, branches, questions); and the shop's side:
 * lists filled with items, and each item's page from its collection's template. The tree work is
 * lib/collectionTree.ts.
 */
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { storedTree, TREE_VERSION, type PageTree } from "./pageTree.js";
import { FIELD_TYPES, bindTree, expandLists, itemAddress, listIdsOf, type CollectionLite, type Field, type ItemLite } from "./collectionTree.js";
import { PATTERN_MAX, SHAPES, ruleIssue, rulesProblem } from "./fieldRules.js";

export const TEMPLATE_KIND = "collectionTemplate";
export const FIELD_ID = /^[a-z][a-zA-Z0-9]{0,30}$/;
export const COLLECTION_SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/;
export const ITEM_SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
/** Addresses the shop already has: a collection can't take them. */
export const RESERVED_SLUGS = new Set(["shop", "p", "c", "cart", "checkout", "account", "search", "about", "contact", "wishlist", "order", "policies", "request", "studio-frame", "design-frame", "stock-alert", "api", "admin", "ar", "en", "he", "__block", "__component", "__template", "__collection"]);
/** `items`: rows a table holds (the trash aside); `itemsList`: what the older list route returns at once. */
export const LIMITS = { fields: 40, options: 30, items: 50_000, itemsList: 2000, listItems: 200, /** Rows one row links in one relation field. */ links: 200 } as const;
/** What happens to the rows that link a row when it is deleted (lib/links.ts). */
export const ON_DELETE = ["unlink", "cascade", "restrict"] as const;
/** A deleted row waits this long in the trash. */
export const TRASH_DAYS = 30;

const local = (max: number) => z.object({ ar: z.string().trim().max(max).optional(), en: z.string().trim().max(max).optional(), he: z.string().trim().max(max).optional() }).strict();
const safeHref = (v: string) => /^(\/(?!\/)|https:\/\/|mailto:|tel:)/i.test(v) && !/[\s<>"']/.test(v);
const safeSrc = (v: string) => /^(\/(?!\/)|https:\/\/)/i.test(v) && !/[\s<>"']/.test(v);

export const FieldSchema = z
  .object({
    id: z.string().regex(FIELD_ID, "A field id is a word like title or coverImage"),
    type: z.enum(FIELD_TYPES),
    name: local(60).optional(),
    required: z.boolean().optional(),
    options: z.array(z.object({ id: z.string().regex(FIELD_ID), name: local(60).optional() }).strict()).max(LIMITS.options).optional(),
    /** Money: its currency, three letters like ILS. */
    currency: z.string().regex(/^[A-Z]{3}$/, "A currency is three letters like ILS").optional(),
    // Its rules (lib/fieldRules.ts).
    unique: z.boolean().optional(),
    default: z.unknown().optional(),
    min: z.union([z.number(), z.string().max(10)]).optional(),
    max: z.union([z.number(), z.string().max(10)]).optional(),
    shape: z.enum(SHAPES).optional(),
    pattern: z.string().max(PATTERN_MAX).optional(),
    message: local(200).optional(),
    help: local(200).optional(),
    // A relation (lib/links.ts): the table it links, how many, and what deleting a linked row does.
    to: z.string().min(1).max(64).optional(),
    many: z.boolean().optional(),
    exclusive: z.boolean().optional(),
    onDelete: z.enum(ON_DELETE).optional(),
  })
  .strict()
  .refine((f) => f.type !== "relation" || !!f.to, "A relation needs the table it links")
  .refine((f) => f.type === "relation" || (f.to === undefined && f.many === undefined && f.exclusive === undefined && f.onDelete === undefined), "Only a relation links a table")
  .refine((f) => f.type !== "relation" || f.options === undefined, "A relation has no choices of its own")
  .refine((f) => (f.type !== "select" && f.type !== "multiSelect") || (f.options?.length ?? 0) > 0, "A choice field needs its choices")
  .refine((f) => !f.options || new Set(f.options.map((o) => o.id)).size === f.options.length, "Two choices with one id")
  .refine((f) => f.currency === undefined || f.type === "money", "Only money has a currency")
  .superRefine((f, ctx) => {
    const problem = rulesProblem(f as Field);
    if (problem) return void ctx.addIssue({ code: "custom", message: problem });
    // The default is a value like any other: it has to pass the field's own check.
    if (f.default !== undefined && f.default !== null && f.default !== "") {
      const checked = checkItemData([{ ...(f as Field), default: undefined, required: false }], { [f.id]: f.default });
      if (!checked.ok || !(f.id in checked.data)) ctx.addIssue({ code: "custom", message: `The default doesn't pass the field's own rules${checked.ok ? "" : `: ${checked.issues[0]?.message}`}` });
    }
  })
  .transform((f) => {
    // Kept as the field holds values (a day as 2026-11-13, words per language); an empty one is no default.
    const { default: raw, ...rest } = f;
    if (raw === undefined || raw === null || raw === "") return rest;
    const checked = checkItemData([{ ...(rest as Field), required: false }], { [f.id]: raw });
    return checked.ok && f.id in checked.data ? { ...rest, default: checked.data[f.id] } : rest;
  });

export const CollectionBody = z.object({
  slug: z.string().trim().regex(COLLECTION_SLUG, "Small letters, digits and -").refine((s) => !RESERVED_SLUGS.has(s), "The shop already uses this address"),
  name: local(80),
  fields: z.array(FieldSchema).min(1).max(LIMITS.fields).refine((f) => new Set(f.map((x) => x.id)).size === f.length, "Two fields with one id"),
}).strict();
export type CollectionBody = z.infer<typeof CollectionBody>;

export type ItemIssue = { field: string; message: string; /** The owner's own words for this field's rules, when it has them. */ say?: Partial<Record<"ar" | "en" | "he", string>>; /** The value the message is about, when naming it helps (a row that isn't there). */ value?: string };

export const JSON_MAX = 20_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Digits with the usual spacing: "+970 599-000 001", "(02) 123 4567". */
const PHONE = /^\(?\+?[0-9][0-9 ()-]{5,19}$/;
const WORD_KINDS = new Set<Field["type"]>(["text", "longText"]);

/** Is there nothing in this value, for this kind of field? */
function emptyValue(f: Field, v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (WORD_KINDS.has(f.type)) return typeof v !== "object" || Array.isArray(v) ? typeof v !== "string" || !v.trim() : !Object.values(v as object).some((x) => typeof x === "string" && x.trim());
  if (f.type === "multiSelect") return Array.isArray(v) && v.length === 0;
  return false;
}

/** An item's values, checked against its collection's fields and their rules (unknown keys are dropped). "The only value" is asked of the database separately (lib/uniqueValues.ts). */
export function checkItemData(fields: Field[], raw: unknown): { ok: true; data: Record<string, unknown> } | { ok: false; issues: ItemIssue[] } {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const data: Record<string, unknown> = {};
  const issues: ItemIssue[] = [];
  for (const f of fields) {
    // A relation's rows are links, kept and checked apart (lib/links.ts): never a value here.
    if (f.type === "relation") continue;
    const v = src[f.id];
    if (emptyValue(f, v)) { if (f.required) issues.push({ field: f.id, message: "Required" }); continue; }
    const bad = (message: string) => issues.push({ field: f.id, message });
    switch (f.type) {
      case "text": case "longText": { const r = local(f.type === "text" ? 300 : 20000).safeParse(v); if (r.success) data[f.id] = r.data; else bad("Words in ar/en/he"); break; }
      case "image": if (typeof v === "string" && safeSrc(v.trim())) data[f.id] = v.trim(); else bad("A picture address"); break;
      case "link": if (typeof v === "string" && safeHref(v.trim())) data[f.id] = v.trim(); else bad("A link like /shop or https://…"); break;
      case "number": case "money": if (typeof v === "number" && Number.isFinite(v)) data[f.id] = v; else bad("A number"); break;
      case "date": if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(new Date(v).getTime())) data[f.id] = v.slice(0, 10); else bad("A date"); break;
      case "boolean": if (typeof v === "boolean") data[f.id] = v; else bad("Yes or no"); break;
      case "select": if (typeof v === "string" && f.options?.some((o) => o.id === v)) data[f.id] = v; else bad("One of its choices"); break;
      case "color": if (typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) data[f.id] = v; else bad("A colour like #c86b98"); break;
      case "email": if (typeof v === "string" && v.trim().length <= 200 && EMAIL.test(v.trim())) data[f.id] = v.trim().toLowerCase(); else bad("An email address"); break;
      case "phone": if (typeof v === "string" && PHONE.test(v.trim())) data[f.id] = v.trim(); else bad("A phone number"); break;
      case "datetime": {
        // Kept as one moment in time (UTC); told in the store's own zone wherever it shows.
        const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? new Date(v) : null;
        if (d && !Number.isNaN(d.getTime())) data[f.id] = d.toISOString(); else bad("A date and time");
        break;
      }
      case "multiSelect": {
        const all = Array.isArray(v) && v.every((x) => typeof x === "string" && f.options?.some((o) => o.id === x));
        // In the choices' own order, each once.
        if (all) data[f.id] = (f.options ?? []).map((o) => o.id).filter((id) => (v as string[]).includes(id)); else bad("Some of its choices");
        break;
      }
      case "file": case "video": if (typeof v === "string" && safeSrc(v.trim())) data[f.id] = v.trim(); else bad("A file's address"); break;
      case "model3d": if (typeof v === "string" && safeSrc(v.trim()) && /\.(glb|gltf)(\?[^#]*)?$/i.test(v.trim())) data[f.id] = v.trim(); else bad("A 3D model's address (.glb or .gltf)"); break;
      case "json": {
        let size = Infinity;
        try { size = JSON.stringify(v)?.length ?? Infinity; } catch { /* not JSON at all */ }
        if (size <= JSON_MAX) data[f.id] = v; else bad("JSON, up to 20,000 characters");
        break;
      }
      case "location": {
        const at = v && typeof v === "object" && !Array.isArray(v) ? (v as { lat?: unknown; lng?: unknown; label?: unknown }) : {};
        const ok = typeof at.lat === "number" && typeof at.lng === "number" && Math.abs(at.lat) <= 90 && Math.abs(at.lng) <= 180 && (at.label === undefined || at.label === null || (typeof at.label === "string" && at.label.length <= 200));
        if (ok) data[f.id] = { lat: at.lat, lng: at.lng, ...(typeof at.label === "string" && at.label.trim() ? { label: at.label.trim() } : {}) }; else bad("A place: latitude and longitude");
        break;
      }
    }
    // Its kind is right: now the field's own rules (limits, a shape), said in the owner's words when given.
    if (f.id in data) {
      const broken = ruleIssue(f, data[f.id]);
      if (broken) {
        issues.push({ field: f.id, message: broken, ...(f.message && Object.values(f.message).some(Boolean) ? { say: f.message } : {}) });
        delete data[f.id];
      }
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true, data };
}

/** A new row's values with each field's default where nothing was given. */
export function withDefaults(fields: Field[], data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const f of fields) if (f.default !== undefined && out[f.id] === undefined) out[f.id] = f.default;
  return out;
}

const n = (ar: string, en: string, he: string) => ({ ar, en, he });
/** Ready collections to start from. */
export const PRESETS: Record<string, { name: ReturnType<typeof n>; slug: string; fields: Field[] }> = {
  blog: { name: n("المدونة", "Blog", "בלוג"), slug: "blog", fields: [
    { id: "title", type: "text", name: n("العنوان", "Title", "כותרת"), required: true },
    { id: "cover", type: "image", name: n("صورة الغلاف", "Cover picture", "תמונת שער") },
    { id: "excerpt", type: "longText", name: n("ملخص", "Summary", "תקציר") },
    { id: "body", type: "longText", name: n("النص", "Text", "טקסט") },
    { id: "date", type: "date", name: n("التاريخ", "Date", "תאריך") },
    { id: "author", type: "text", name: n("الكاتب", "Author", "כותב") },
  ] },
  lookbook: { name: n("لوك بوك", "Lookbook", "לוקבוק"), slug: "lookbook", fields: [
    { id: "title", type: "text", name: n("الإطلالة", "Look", "מראה"), required: true },
    { id: "image", type: "image", name: n("الصورة", "Picture", "תמונה") },
    { id: "caption", type: "longText", name: n("وصف", "Caption", "כיתוב") },
    { id: "shopLink", type: "link", name: n("رابط للتسوق", "Shop link", "קישור לחנות") },
  ] },
  branches: { name: n("الفروع", "Branches", "סניפים"), slug: "branches", fields: [
    { id: "name", type: "text", name: n("إسم الفرع", "Branch", "סניף"), required: true },
    { id: "photo", type: "image", name: n("صورة", "Photo", "תמונה") },
    { id: "address", type: "longText", name: n("العنوان", "Address", "כתובת") },
    { id: "phone", type: "text", name: n("الهاتف", "Phone", "טלפון") },
    { id: "hours", type: "longText", name: n("ساعات الدوام", "Opening hours", "שעות פתיחה") },
    { id: "map", type: "link", name: n("رابط الخريطة", "Map link", "קישור למפה") },
  ] },
  faq: { name: n("أسئلة وأجوبة", "Questions", "שאלות"), slug: "faq", fields: [
    { id: "question", type: "text", name: n("السؤال", "Question", "שאלה"), required: true },
    { id: "answer", type: "longText", name: n("الجواب", "Answer", "תשובה"), required: true },
    { id: "topic", type: "select", name: n("الموضوع", "Topic", "נושא"), options: [{ id: "orders", name: n("الطلبات", "Orders", "הזמנות") }, { id: "shipping", name: n("الشحن", "Shipping", "משלוח") }, { id: "returns", name: n("الإرجاع", "Returns", "החזרות") }] },
  ] },
};

const lite = (c: { id: string; slug: string; fields: unknown }): CollectionLite => ({ id: c.id, slug: c.slug, fields: (Array.isArray(c.fields) ? c.fields : []) as Field[] });
const itemLite = (i: { id: string; slug: string; data: unknown; publishedAt: Date | null; createdAt: Date; sort: number }): ItemLite => ({ id: i.id, slug: i.slug, data: (i.data && typeof i.data === "object" ? i.data : {}) as Record<string, unknown>, publishedAt: i.publishedAt, createdAt: i.createdAt, sort: i.sort });

type Db = Pick<Prisma.TransactionClient, "collection" | "collectionItem" | "page">;
/** The lists' collections and their items (published ones; the editor's preview also sees drafts). */
export async function loadListData(tree: PageTree | null | undefined, opts: { preview?: boolean } = {}, db: Db = prisma) {
  const ids = listIdsOf(tree as never);
  const out = new Map<string, { collection: CollectionLite; items: ItemLite[] }>();
  if (!ids.length) return out;
  const rows = await db.collection.findMany({ where: { id: { in: ids } }, include: { items: { where: opts.preview ? { status: { not: "ARCHIVED" }, deletedAt: null } : { status: "PUBLISHED", deletedAt: null }, orderBy: { createdAt: "desc" }, take: LIMITS.listItems } } });
  for (const c of rows) out.set(c.id, { collection: lite(c), items: c.items.map(itemLite) });
  return out;
}

/** A tree for the shop with its lists filled. */
export async function withCollections<T extends PageTree | null | undefined>(tree: T, opts: { preview?: boolean } = {}, db: Db = prisma): Promise<T> {
  if (!tree || !listIdsOf(tree as never).length) return tree;
  return expandLists(tree as PageTree, await loadListData(tree, opts, db), opts) as T;
}

/** The collection a template page shows, and an item to show on it (the first published, else any). */
export async function templateContext(pageId: string, db: Db = prisma) {
  const c = await db.collection.findFirst({ where: { templateId: pageId } });
  if (!c) return null;
  const item = (await db.collectionItem.findFirst({ where: { collectionId: c.id, status: "PUBLISHED", deletedAt: null }, orderBy: [{ sort: "asc" }, { createdAt: "desc" }] })) ?? (await db.collectionItem.findFirst({ where: { collectionId: c.id, deletedAt: null }, orderBy: { createdAt: "desc" } }));
  return { collection: lite(c), item: item ? itemLite(item) : null };
}

/** An item's page at /<collection>/<item>: its template's published tree filled with it; null when there's none. */
export async function collectionItemPage(slug: string, db: Db = prisma) {
  const at = itemAddress(slug);
  if (!at) return null;
  const c = await db.collection.findUnique({ where: { slug: at.collection } });
  if (!c?.templateId) return null;
  const [item, template] = await Promise.all([
    db.collectionItem.findUnique({ where: { collectionId_slug: { collectionId: c.id, slug: at.item } } }),
    db.page.findFirst({ where: { id: c.templateId, kind: TEMPLATE_KIND, status: "PUBLISHED" } }),
  ]);
  if (!item || item.deletedAt || item.status !== "PUBLISHED" || !template) return null;
  const tree = storedTree(template.tree);
  if (!tree) return null;
  const collection = lite(c);
  const it = itemLite(item);
  const title = collection.fields.find((f) => f.type === "text")?.id;
  const summary = collection.fields.find((f) => f.type === "longText")?.id;
  const cover = collection.fields.find((f) => f.type === "image")?.id;
  return { template, tree: bindTree(tree, it, collection), item: it, collection, seo: { title: title ? (it.data[title] as Record<string, string> | undefined) : undefined, description: summary ? (it.data[summary] as Record<string, string> | undefined) : undefined, image: cover ? (it.data[cover] as string | undefined) : undefined } };
}

/** The trash, emptied of what has waited its days (the job "dataTrash"). */
export async function purgeTrash(now = Date.now()) {
  const gone = await prisma.collectionItem.deleteMany({ where: { deletedAt: { lt: new Date(now - TRASH_DAYS * 86_400_000) } } });
  return { removed: gone.count };
}

/** A first design for an item's page: its picture, its title, its other words, a way back — each connected to its field. */
export function defaultTemplate(c: { slug: string; fields: Field[] }) {
  const n = (ar: string, en: string, he: string) => ({ ar, en, he });
  const kids: any[] = [];
  let i = 0;
  const id = (p: string) => `${p}-${(i++).toString(36)}`;
  const image = c.fields.find((f) => f.type === "image");
  const title = c.fields.find((f) => f.type === "text");
  if (image) kids.push({ id: id("img"), type: "image", props: { src: "/templates/photo-1.svg", bind: { src: image.id } }, style: { base: { width: "100%", radius: 16 } } });
  if (title) kids.push({ id: id("h"), type: "heading", props: { level: 1, text: title.name ?? n("العنوان", "Title", "כותרת"), bind: { text: title.id } } });
  for (const f of c.fields) {
    if (f === title || f === image) continue;
    if (["text", "longText", "number", "date", "select", "email", "phone", "datetime", "money", "multiSelect", "location"].includes(f.type)) kids.push({ id: id("t"), type: "text", props: { text: f.name ?? n(f.id, f.id, f.id), bind: { text: f.id } }, style: { base: f.type === "longText" ? { lineHeight: 1.8 } : { color: "muted" } } });
    if (f.type === "link") kids.push({ id: id("b"), type: "button", props: { label: f.name ?? n("الرابط", "Link", "קישור"), href: "/", variant: "outline", bind: { href: f.id } } });
  }
  kids.push({ id: id("b"), type: "button", props: { label: n("رجوع للمتجر", "Back to the shop", "חזרה לחנות"), href: "/shop", variant: "link" } });
  return { version: TREE_VERSION, root: { id: "page", type: "page", props: {}, children: [{ id: "item", type: "section", props: { contained: true }, style: { base: { pad: [48, 24, 64, 24], gap: 20, maxWidth: "860px" } }, children: kids }] } };
}

/**
 * The store's own page designs (W3): one for every product's page and one for every category's,
 * each a page of its own kind at a fixed address (never served as a page). The shop fills them
 * with the product's or category's values (estabrek-storefront/src/pageTree/storeBind.ts): an
 * element connects to "title", "price", "description", "image"… like to a collection's fields,
 * and a product list with the category "current" shows the page's own category.
 */
export const STORE_TEMPLATES = {
  product: { kind: "productTemplate", slug: "/__product-page", name: "Product page" },
  category: { kind: "categoryTemplate", slug: "/__category-page", name: "Category page" },
} as const;
export type StoreTemplateKind = keyof typeof STORE_TEMPLATES;
export const CURRENT_CATEGORY = "current";

/** A first design for the product page or the category page, connected to their values. */
export function defaultStoreTemplate(kind: StoreTemplateKind) {
  const n = (ar: string, en: string, he: string) => ({ ar, en, he });
  if (kind === "product") return { version: TREE_VERSION, root: { id: "page", type: "page", props: {}, children: [
    { id: "buy", type: "section", props: { contained: true }, style: { base: { pad: [32, 24, 32, 24] } }, children: [{ id: "detail", type: "productDetail", props: {} }] },
    { id: "about", type: "section", props: { contained: true }, style: { base: { pad: [24, 24, 24, 24], gap: 12, maxWidth: "860px" } }, children: [
      { id: "about-h", type: "heading", props: { level: 2, text: n("عن المنتج", "About it", "על המוצר") } },
      { id: "about-t", type: "text", props: { text: n("وصف المنتج", "The product's description", "תיאור המוצר"), bind: { text: "description" } }, style: { base: { lineHeight: 1.8 } } },
    ] },
    { id: "more", type: "section", props: { contained: true }, style: { base: { pad: [24, 24, 56, 24] } }, children: [
      { id: "more-h", type: "heading", props: { level: 2, text: n("ممكن يعجبك كمان", "You may also like", "אולי יאהב אותך גם") } },
      { id: "more-p", type: "products", props: { source: "category", categoryId: CURRENT_CATEGORY, limit: 4, layout: "grid", columns: 4 } },
    ] },
  ] } };
  return { version: TREE_VERSION, root: { id: "page", type: "page", props: {}, children: [
    { id: "head", type: "section", props: { contained: true }, style: { base: { pad: [48, 24, 24, 24], gap: 10, textAlign: "center", align: "center" } }, children: [
      { id: "head-h", type: "heading", props: { level: 1, text: n("إسم القسم", "The category", "הקטגוריה"), bind: { text: "title" } } },
      { id: "head-t", type: "text", props: { text: n("وصف القسم", "Its description", "התיאור שלה"), bind: { text: "description" } }, style: { base: { color: "muted", maxWidth: "640px" } } },
    ] },
    { id: "list", type: "section", props: { contained: true }, style: { base: { pad: [16, 24, 56, 24] } }, children: [
      { id: "list-p", type: "products", props: { source: "category", categoryId: CURRENT_CATEGORY, limit: 24, layout: "grid", columns: 4 } },
    ] },
  ] } };
}
