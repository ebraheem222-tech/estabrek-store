// src/api/catalog.api.ts
import { isAxiosError } from "axios";
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  iconUrl?: string | null;
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
  isActive: boolean;
  categoryId: string;
  category?: CatalogCategory | null;
  createdAt?: string;
  updatedAt?: string;
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
};

export async function listCategories() {
  const res = await api.get(ENDPOINTS.admin.catalog.categories.base);
  return res.data as CatalogCategory[];
}

export async function createCategory(body: { name: string; slug: string; parentId?: string | null; iconUrl?: string | null }) {
  const res = await api.post(ENDPOINTS.admin.catalog.categories.base, body);
  return res.data as CatalogCategory;
}

export async function updateCategory(id: string, body: Partial<{ name: string; slug: string; parentId?: string | null; iconUrl?: string | null }>) {
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
  isActive?: boolean;
  categoryId: string;
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
    isActive?: boolean;
    categoryId?: string;
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

export async function updateProductFull(id: string, body: ProductDeepUpdateBody) {
  const res = await api.put(ENDPOINTS.admin.catalog.products.full(id), body);
  return res.data as ProductDeep;
}
