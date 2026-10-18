/**
 * Product versions (admin → السجل): before each change from the admin (the
 * editor, the products list, a size's price, archiving, deleting) the product is
 * kept as it was, with its colours, photos and sizes. Putting one back saves that
 * graph again through updateProductDeep (the same rules as the editor: a size or
 * colour with orders is kept, not deleted). Stock is left as it is now (sales
 * happened since; stock has its own history), except for a size that is gone and
 * comes back. A deleted product comes back (hidden until the owner shows it again
 * if its link is taken).
 */
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";
import { getProductDeep, updateProductDeep } from "./catalog.service.js";

const KEEP = 20;
/** Two saves within this long are one change (an editor saving twice, a list action over many sizes). */
const SAME_CHANGE_MS = 5_000;

export type ProductSnapshot = NonNullable<Awaited<ReturnType<typeof getProductDeep>>>;

async function adminIdOf(sub: string | null | undefined) {
  if (!sub) return null;
  const u = await prisma.adminUser.findUnique({ where: { id: String(sub) }, select: { id: true } }).catch(() => null);
  return u?.id ?? null;
}

/** Keeps the product as it is now. Never fails the change it comes before. */
export async function keepProductRevision(productId: string, reason: string, adminSub?: string | null) {
  try {
    const snap = await getProductDeep(productId);
    if (!snap) return null;
    const recent = await prisma.productRevision.findFirst({ where: { productId, reason, createdAt: { gte: new Date(Date.now() - SAME_CHANGE_MS) } }, select: { id: true } });
    if (recent) return recent.id;
    const rev = await prisma.productRevision.create({
      data: { productId, title: snap.title, reason, data: JSON.parse(JSON.stringify(snap)), adminUserId: await adminIdOf(adminSub) },
      select: { id: true },
    });
    const old = await prisma.productRevision.findMany({ where: { productId }, orderBy: { createdAt: "desc" }, skip: KEEP, select: { id: true } });
    if (old.length) await prisma.productRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
    return rev.id;
  } catch (e) {
    console.error("[product-revisions] could not keep", productId, e instanceof Error ? e.message : e);
    return null;
  }
}

type Snap = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isActive: boolean;
  categoryId: string;
  typeId: string | null;
  attributes: unknown;
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  eventLocation: string | null;
  items: Array<{
    id: string;
    colorName: string;
    boxLabel: string;
    colorHex: string | null;
    suggestedColors: unknown;
    skuBase: string;
    isActive: boolean;
    images: Array<{ id: string; url: string; alt: string | null; position: number; isPrimary: boolean; view?: string | null; dominantColorHex?: string | null; palette?: unknown }>;
    variants: Array<{
      id: string;
      sizeId: string;
      sku: string;
      price: string | number;
      compareAt: string | number | null;
      originalPrice: string | number | null;
      salePrice: string | number | null;
      saleStartsAt: string | null;
      saleEndsAt: string | null;
      stock: number;
      lowStockThreshold: number;
      weightGrams: number | null;
    }>;
  }>;
};

type Current = { items: Array<{ id: string; images: Array<{ id: string }>; variants: Array<{ id: string }> }> } | null;

const num = (v: string | number | null | undefined) => (v == null ? null : Number(v));
const date = (v: string | null | undefined) => (v ? new Date(v) : null);

/**
 * The editor's save that brings the product back as it was: what still exists is
 * updated (by id), what's gone comes back, what came after goes. Stock only for
 * sizes that come back.
 */
export function deepInputFromSnapshot(s: Snap, current: Current) {
  const items = new Set(current?.items.map((i) => i.id) ?? []);
  const images = new Set(current?.items.flatMap((i) => i.images.map((x) => x.id)) ?? []);
  const variants = new Set(current?.items.flatMap((i) => i.variants.map((x) => x.id)) ?? []);
  const keptItems = new Set(s.items.map((i) => i.id));
  const keptImages = new Set(s.items.flatMap((i) => i.images.map((x) => x.id)));
  const keptVariants = new Set(s.items.flatMap((i) => i.variants.map((x) => x.id)));
  return {
    product: {
      title: s.title,
      slug: s.slug,
      description: s.description,
      seoTitle: s.seoTitle,
      seoDescription: s.seoDescription,
      isActive: s.isActive,
      categoryId: s.categoryId,
      typeId: s.typeId,
      attributes: s.attributes ?? null,
      eventStartsAt: date(s.eventStartsAt),
      eventEndsAt: date(s.eventEndsAt),
      eventLocation: s.eventLocation,
    },
    items: s.items.map((it) => ({
      ...(items.has(it.id) ? { id: it.id } : {}),
      colorName: it.colorName,
      boxLabel: it.boxLabel ?? "",
      colorHex: it.colorHex,
      suggestedColors: Array.isArray(it.suggestedColors) ? (it.suggestedColors as string[]) : undefined,
      skuBase: it.skuBase,
      isActive: it.isActive,
      images: it.images.map((im) => ({
        ...(images.has(im.id) ? { id: im.id } : {}),
        url: im.url,
        alt: im.alt,
        position: im.position,
        isPrimary: im.isPrimary,
        view: im.view ?? null,
        dominantColorHex: im.dominantColorHex ?? null,
        palette: im.palette ?? null,
      })),
      variants: it.variants.map((v) => ({
        ...(variants.has(v.id) ? { id: v.id } : { stock: v.stock }),
        sizeId: v.sizeId,
        sku: v.sku,
        price: Number(v.price),
        compareAt: num(v.compareAt),
        originalPrice: num(v.originalPrice),
        salePrice: num(v.salePrice),
        saleStartsAt: date(v.saleStartsAt),
        saleEndsAt: date(v.saleEndsAt),
        lowStockThreshold: v.lowStockThreshold,
        weightGrams: v.weightGrams,
      })),
    })),
    deleteItemIds: [...items].filter((id) => !keptItems.has(id)),
    deleteImageIds: [...images].filter((id) => !keptImages.has(id)),
    deleteVariantIds: [...variants].filter((id) => !keptVariants.has(id)),
  };
}

/** Puts the product back as it was in that version (the version before this is kept first). */
export async function restoreProductRevision(revisionId: string, adminSub?: string | null) {
  const rev = await prisma.productRevision.findUnique({ where: { id: revisionId } });
  if (!rev) throw new AppError(404, "PRODUCT_REVISION_NOT_FOUND");
  const s = rev.data as unknown as Snap;
  let current = await getProductDeep(s.id);
  let note: string | null = null;
  if (!current) {
    // Deleted since: it comes back with the same id (its link, if free).
    const cat = await prisma.category.findUnique({ where: { id: s.categoryId }, select: { id: true } });
    if (!cat) throw new AppError(409, "PRODUCT_CATEGORY_GONE", "Its category was deleted: make it again first");
    const taken = await prisma.product.findUnique({ where: { slug: s.slug }, select: { id: true } });
    const slug = taken ? `${s.slug}-${Date.now().toString(36)}` : s.slug;
    if (taken) note = "رابطه صار لمنتج تاني: رجع برابط جديد ومخفي.";
    await prisma.product.create({ data: { id: s.id, title: s.title, slug, categoryId: s.categoryId, isActive: false } });
    current = await getProductDeep(s.id);
    s.slug = slug;
    if (taken) s.isActive = false;
  } else {
    await keepProductRevision(s.id, "restore", adminSub);
  }
  // SKUs taken by another product meanwhile can't come back: those sizes are left out.
  const skus = s.items.flatMap((i) => i.variants.map((v) => v.sku));
  const clash = await prisma.productVariant.findMany({ where: { sku: { in: skus }, item: { productId: { not: s.id } } }, select: { sku: true } });
  if (clash.length) {
    const bad = new Set(clash.map((c) => c.sku));
    for (const it of s.items) it.variants = it.variants.filter((v) => !bad.has(v.sku));
    note = [note, `${clash.length} مقاس ما رجع: الـ SKU صار لمنتج تاني.`].filter(Boolean).join(" ");
  }
  const out = await updateProductDeep(s.id, deepInputFromSnapshot(s, current) as Parameters<typeof updateProductDeep>[1], { adminUserId: await adminIdOf(adminSub), reason: "Restore version" });
  const kept = out.kept.variants.length + out.kept.items.length;
  if (kept) note = [note, `${kept} مقاس أو لون عليهم طلبات فضلوا (مخفيين أو مخزونهم صفر).`].filter(Boolean).join(" ");
  return { productId: s.id, note };
}
