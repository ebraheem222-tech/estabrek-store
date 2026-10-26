// src/api/catalog.api.ts
import { isAxiosError } from "axios";
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import type { Translations } from "../lib/translations";
import { tr } from "@/lib/words";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  iconUrl?: string | null;
  /** The name in the shop's other languages ({ en: { name } }). */
  translations?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type CatalogSize = {
  id: string;
  name: string;
  order?: number;
  active?: boolean;
};

export type CatalogProduct = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  /** Search-engine title/description (empty: the page uses the title and description). */
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** Its texts in the shop's other languages (src/lib/translations.ts). */
  translations?: unknown;
  isActive: boolean;
  categoryId: string;
  category?: CatalogCategory | null;
  createdAt?: string;
  updatedAt?: string;
  /** Sent by the updated backend: photo, prices and stock at a glance (absent on older servers). */
  summary?: ProductSummary;
};

export type ProductSummary = {
  thumbUrl: string | null;
  priceMin: number | null;
  priceMax: number | null;
  compareAtMax: number | null;
  stockTotal: number;
  variantCount: number;
  outCount: number;
  lowCount: number;
  colors: Array<{ name: string; hex: string | null; active: boolean }>;
  skus: string[];
};

export type ProductItemImage = {
  id: string;
  productItemId: string;
  url: string;
  alt?: string | null;
  position: number;
  isPrimary: boolean;
};

export type ProductVariant = {
  id: string;
  productItemId: string;
  sizeId: string;
  sku: string;
  price: string | number;
  compareAt?: string | number | null;
  originalPrice?: string | number | null;
  salePrice?: string | number | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  stock: number;
  lowStockThreshold?: number;
  weightGrams?: number | null;
  size?: CatalogSize | null;
};

export type ProductItem = {
  id: string;
  productId: string;
  colorName: string;
  boxLabel?: string | null;
  colorHex?: string | null;
  // Palette extracted / suggested for UI swatches (array of hex strings)
  suggestedColors?: string[];
  skuBase: string;
  isActive: boolean;
  images: ProductItemImage[];
  variants: ProductVariant[];
};

export type ProductDeep = CatalogProduct & {
  category?: CatalogCategory | null;
  items: ProductItem[];
  /** Kind of product (أنواع المنتجات) and its fields' values. */
  typeId?: string | null;
  attributes?: Record<string, unknown> | null;
  /** Bookings: when and where. */
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
  eventLocation?: string | null;
};

export async function listCategories() {
  const res = await api.get(ENDPOINTS.admin.catalog.categories.base);
  return res.data as CatalogCategory[];
}

export async function createCategory(body: { name: string; slug: string; parentId?: string | null; iconUrl?: string | null; translations?: Translations }) {
  const res = await api.post(ENDPOINTS.admin.catalog.categories.base, body);
  return res.data as CatalogCategory;
}

export async function updateCategory(id: string, body: Partial<{ name: string; slug: string; parentId?: string | null; iconUrl?: string | null; translations: Translations }>) {
  const res = await api.patch(ENDPOINTS.admin.catalog.categories.byId(id), body);
  return res.data as CatalogCategory;
}

export async function deleteCategory(id: string) {
  const res = await api.delete(ENDPOINTS.admin.catalog.categories.byId(id));
  return res.data as { ok: true };
}

export async function listSizes() {
  const res = await api.get(ENDPOINTS.admin.catalog.sizes.base);
  return res.data as CatalogSize[];
}

export async function createSize(body: { name: string; order?: number; active?: boolean }) {
  const res = await api.post(ENDPOINTS.admin.catalog.sizes.base, body);
  return res.data as CatalogSize;
}

export async function updateSize(id: string, body: Partial<{ name: string; order?: number; active?: boolean }>) {
  const res = await api.patch(ENDPOINTS.admin.catalog.sizes.byId(id), body);
  return res.data as CatalogSize;
}

export async function deleteSize(id: string) {
  const res = await api.delete(ENDPOINTS.admin.catalog.sizes.byId(id));
  return res.data as { ok: true };
}

export async function listProducts(status: "all" | "active" | "draft" = "all") {
  const res = await api.get(ENDPOINTS.admin.catalog.products.base, { params: { status } });
  return res.data as CatalogProduct[];
}

export async function bulkProducts(body: { ids: string[]; action: "setActive" | "delete"; isActive?: boolean }) {
  const res = await api.post(ENDPOINTS.admin.catalog.products.bulk, body);
  return res.data as { ok: boolean; action: string; count: number; isActive?: boolean };
}

export type ProductImportRow = {
  title: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  colorName?: string;
  boxLabel?: string;
  colorHex?: string | null;
  skuBase?: string;
  sizeName?: string;
  price?: number;
  stock?: number;
  images?: string[];
};

export async function importProducts(body: {
  rows: ProductImportRow[];
  mode?: "create" | "upsertBySlug";
  createMissingCategories?: boolean;
  defaultCategoryId?: string;
}) {
  const res = await api.post(ENDPOINTS.admin.catalog.products.import, body);
  return res.data as { ok: boolean; summary: { total: number; created: number; updated: number; failed: number; mode: string }; results: Array<{ index: number; slug?: string; title?: string; action: string; productId?: string; itemId?: string; variantId?: string; message?: string }> };
}

export async function createProduct(body: {
  title: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isActive?: boolean;
  categoryId: string;
  typeId?: string | null;
  attributes?: Record<string, unknown>;
}) {
  const res = await api.post(ENDPOINTS.admin.catalog.products.base, body);
  return res.data as CatalogProduct;
}

export async function updateProduct(id: string, body: Partial<Omit<Parameters<typeof createProduct>[0], "categoryId"> & { categoryId?: string }>) {
  const res = await api.patch(ENDPOINTS.admin.catalog.products.byId(id), body);
  return res.data as CatalogProduct;
}

export async function deleteProduct(id: string) {
  // Prefer delete; if backend responds 409 PRODUCT_IN_USE, fallback to archive.
  try {
    const res = await api.delete(ENDPOINTS.admin.catalog.products.byId(id));
    return { ok: true, archived: false, data: res.data } as const;
  } catch (e: any) {
    if (isAxiosError(e)) {
      const status = e.response?.status;
      const code = (e.response?.data as any)?.code;
      if (status === 409 && code === "PRODUCT_IN_USE") {
        const res2 = await api.post(ENDPOINTS.admin.catalog.products.archive(id));
        return { ok: true, archived: true, data: res2.data } as const;
      }
    }
    throw e;
  }
}

export async function archiveProduct(id: string) {
  const res = await api.post(ENDPOINTS.admin.catalog.products.archive(id));
  return res.data as { ok: true; archived: true };
}

export async function getProductFull(id: string) {
  const res = await api.get(ENDPOINTS.admin.catalog.products.full(id));
  return res.data as ProductDeep;
}

export type ProductDeepUpdateBody = {
  product?: {
    title?: string;
    slug?: string;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    translations?: Translations;
    isActive?: boolean;
    categoryId?: string;
    typeId?: string | null;
    attributes?: Record<string, unknown>;
    eventStartsAt?: string | null;
    eventEndsAt?: string | null;
    eventLocation?: string | null;
  };
  items?: Array<{
    id?: string;
    colorName: string;
    boxLabel?: string;
    colorHex?: string | null;
    suggestedColors?: string[];
    skuBase: string;
    isActive?: boolean;
    images?: Array<{
      id?: string;
      url: string;
      alt?: string | null;
      position?: number;
      isPrimary?: boolean;
      view?: string | null;
    }>;
    variants?: Array<{
      id?: string;
      sizeId: string;
      sku: string;
      price: number;
      compareAt?: number | null;
      stock?: number;
      lowStockThreshold?: number;
      weightGrams?: number | null;
    }>;
  }>;
  deleteItemIds?: string[];
  deleteImageIds?: string[];
  deleteVariantIds?: string[];
};

export type SaveKept = { variants: Array<{ id: string; sku: string }>; items: Array<{ id: string; colorName: string }> };

export async function updateProductFull(id: string, body: ProductDeepUpdateBody) {
  const res = await api.put(ENDPOINTS.admin.catalog.products.full(id), body);
  // `kept` (updated backend): sizes/colours with orders that were kept instead of deleted.
  return res.data as ProductDeep & { kept?: SaveKept };
}

/** Why a product save was refused, in words the owner can act on. */
export function describeSaveError(e: unknown): { message: string; skus?: string[]; attributeErrors?: Record<string, string> } {
  if (!isAxiosError(e)) return { message: tr("تعذّر الحفظ. يرجى المحاولة مرة أخرى.", "Couldn't save. Please try again.") };
  const status = e.response?.status;
  const data = (e.response?.data ?? {}) as { error?: string; message?: string; details?: any; target?: unknown };
  if (data.error === "SKU_TAKEN") {
    const rows = (data.details?.products ?? []) as Array<{ sku: string; title: string }>;
    const list = rows.map((r) => `${r.sku} (${r.title})`).join(tr("، ", ", "));
    return { message: tr(`كود SKU مستخدم في منتج آخر: ${list || (data.details?.skus ?? []).join(tr("، ", ", "))}`, "SKU code already used by another product: {0}", [list || (data.details?.skus ?? []).join(tr("، ", ", "))]), skus: data.details?.skus };
  }
  if (data.error === "DUPLICATE_SKU") return { message: tr(`نفس كود SKU مكتوب مرتين: ${(data.details?.skus ?? []).join(tr("، ", ", "))}`, "The same SKU is written twice: {0}", [(data.details?.skus ?? []).join(tr("، ", ", "))]), skus: data.details?.skus };
  if (data.error === "UNIQUE_CONSTRAINT") {
    const t = JSON.stringify(data.target ?? "");
    if (/sku/i.test(t)) return { message: tr("أحد أكواد SKU مستخدم في منتج آخر. يرجى تغيير الكود والمحاولة مرة أخرى.", "One SKU code is used by another product. Change it and try again.") };
    if (/size/i.test(t)) return { message: tr("نفس المقاس مكرر لنفس اللون.", "The same size is listed twice for one colour.") };
    if (/slug/i.test(t)) return { message: tr("رابط المنتج مستخدم لمنتج آخر. يرجى تغيير الرابط.", "This product link is used by another product. Change the link.") };
    return { message: tr("يوجد تكرار في البيانات (لون أو مقاس أو كود).", "Something is listed twice (a colour, size or code).") };
  }
  if (data.error === "FOREIGN_KEY") return { message: tr("مقاس أو لون عليه طلبات ما بينحذف. لازم يتحدّث الباكند ليُحفظ تلقائياً كـ«نفد».", "A size or colour with orders can't be deleted. Update the backend so it's kept as “Sold out” instead.") };
  if (data.error === "VALIDATION_ERROR") return { message: tr("بعض الحقول غير صحيحة. يرجى مراجعة الأسعار والكميات.", "Some fields aren't right. Check the prices and quantities.") };
  if (data.error === "ATTRIBUTES_INVALID") return { message: tr("في تفاصيل القطعة شي مش مكتوب صح. يرجى مراجعة الحقول المعلّمة بالأحمر.", "Something in the details isn't right. Check the fields marked in red."), attributeErrors: data.details?.errors ?? {} };
  if (data.error === "TYPE_NOT_FOUND") return { message: tr("نوع المنتج انحذف. يرجى اختيار نوع ثاني.", "The product type was deleted. Choose another one.") };
  if (status === 401 || status === 403) return { message: tr("انتهت الجلسة أو ما في صلاحية.", "Your session ended, or you don't have permission.") };
  return { message: data.message || tr("تعذّر الحفظ. يرجى المحاولة مرة أخرى.", "Couldn't save. Please try again.") };
}
