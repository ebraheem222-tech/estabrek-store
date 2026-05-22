import { z } from "zod";
import { PriceNumber } from "../../schemas/common.js";

export const CreateCategoryBody = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  parentId: z.string().cuid().nullable().optional(),
  iconUrl: z.string().min(1).nullable().optional(),
});
export const UpdateCategoryBody = CreateCategoryBody.partial();

export const CreateProductBody = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  categoryId: z.string().cuid(),
});
export const UpdateProductBody = CreateProductBody.partial();

export const CreateItemBody = z.object({
  productId: z.string().cuid(),
  colorName: z.string().min(1),
  boxLabel: z.string().optional(),
  colorHex: z.string().regex(/^#?[0-9a-fA-F]{3,6}$/).nullable().optional(),
  suggestedColors: z.array(z.string().regex(/^#?[0-9a-fA-F]{3,6}$/)).optional(),
  skuBase: z.string().min(1),
  isActive: z.boolean().optional(),
});
export const UpdateItemBody = CreateItemBody.partial();

export const CreateSizeBody = z.object({
  name: z.string().min(1),
  order: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});
export const UpdateSizeBody = CreateSizeBody.partial();

export const CreateVariantBody = z.object({
  productItemId: z.string().cuid(),
  sizeId: z.string().cuid(),
  sku: z.string().min(1),
  price: PriceNumber,
  compareAt: PriceNumber.nullable().optional(),
  originalPrice: PriceNumber.nullable().optional(),
  salePrice: PriceNumber.nullable().optional(),
  saleStartsAt: z.coerce.date().nullable().optional(),
  saleEndsAt: z.coerce.date().nullable().optional(),
  stock: z.number().int().min(0).optional().default(0),
  lowStockThreshold: z.number().int().min(0).optional().default(0),
  weightGrams: z.number().int().min(0).nullable().optional(),
});
export const UpdateVariantBody = z.object({
  productItemId: z.string().cuid().optional(),
  sizeId: z.string().cuid().optional(),
  sku: z.string().min(1).optional(),
  price: PriceNumber.optional(),
  compareAt: PriceNumber.nullable().optional(),
  originalPrice: PriceNumber.nullable().optional(),
  salePrice: PriceNumber.nullable().optional(),
  saleStartsAt: z.coerce.date().nullable().optional(),
  saleEndsAt: z.coerce.date().nullable().optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  weightGrams: z.number().int().min(0).nullable().optional(),
  reason: z.string().max(200).optional(),
});

export const AddImageBody = z.object({
  productItemId: z.string().cuid(),
  url: z.string().url(),
  alt: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  isPrimary: z.boolean().optional(),
  view: z.string().nullable().optional(),
  dominantColorHex: z.string().nullable().optional(),
  palette: z.array(z.string()).nullable().optional(),
});

export const UpdateImageBody = AddImageBody.partial();
export const ProductDeepUpdateBody = z.object({
  product: z.object({
    title: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    categoryId: z.string().cuid().optional(),
  }).optional(),
  items: z.array(z.object({
    id: z.string().cuid().optional(),
    colorName: z.string().min(1),
    boxLabel: z.string().optional(),
    colorHex: z.string().nullable().optional(),
    suggestedColors: z.array(z.string().regex(/^#?[0-9a-fA-F]{3,6}$/)).optional(),
    skuBase: z.string().min(1),
    isActive: z.boolean().optional(),
    images: z.array(z.object({
      id: z.string().cuid().optional(),
      url: z.string().url(),
      alt: z.string().nullable().optional(),
      position: z.number().int().nonnegative().optional(),
      isPrimary: z.boolean().optional(),
      view: z.string().nullable().optional(),
    })).optional(),
    variants: z.array(z.object({
      id: z.string().cuid().optional(),
      sizeId: z.string().cuid(),
      sku: z.string().min(1),
      price: PriceNumber,
      compareAt: PriceNumber.nullable().optional(),
      originalPrice: PriceNumber.nullable().optional(),
      salePrice: PriceNumber.nullable().optional(),
      saleStartsAt: z.coerce.date().nullable().optional(),
      saleEndsAt: z.coerce.date().nullable().optional(),
      stock: z.number().int().min(0).optional().default(0),
      lowStockThreshold: z.number().int().min(0).optional().default(0),
      weightGrams: z.number().int().min(0).nullable().optional(),
    })).optional(),
  })).optional(),
  deleteItemIds: z.array(z.string().cuid()).optional(),
  deleteImageIds: z.array(z.string().cuid()).optional(),
  deleteVariantIds: z.array(z.string().cuid()).optional(),
});

/**
 * Bulk actions for products
 * - setActive: set draft/published
 * - delete: delete many
 */
export const BulkProductsBody = z.object({
  ids: z.array(z.string().cuid()).min(1),
  action: z.enum(["setActive", "delete"]),
  isActive: z.boolean().optional(),
});

/**
 * CSV import (front parses CSV → sends rows)
 */
export const ImportProductsBody = z.object({
  mode: z.enum(["create", "upsertBySlug"]).optional().default("upsertBySlug"),
  createMissingCategories: z.boolean().optional().default(false),
  defaultCategoryId: z.string().cuid().optional(),
  rows: z
    .array(
      z.object({
        title: z.string().min(1),
        slug: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        categoryId: z.string().cuid().optional(),
        categorySlug: z.string().optional(),
        categoryName: z.string().optional(),

        // default Item/Variant optional overrides
        colorName: z.string().optional(),
        boxLabel: z.string().optional(),
        colorHex: z.string().nullable().optional(),
        skuBase: z.string().optional(),
        sizeName: z.string().optional(),
        price: PriceNumber.optional(),
        stock: z.coerce.number().int().min(0).optional(),
        images: z.union([z.array(z.string().url()), z.string()]).optional(),
      })
    )
    .min(1),
});


export const CommitImageGroupsBody = z.object({
  groups: z.array(
    z.object({
      colorName: z.string().min(1),
      boxLabel: z.string().optional(),
      colorHex: z.string().nullable().optional(),
      assets: z.array(
        z.object({
          assetId: z.string().cuid(),
          view: z.string().nullable().optional(),
          alt: z.string().nullable().optional(),
        })
      ).min(1),
      variants: z
        .object({
          sizeIds: z.array(z.string().cuid()).min(1),
          price: PriceNumber,
          /** per-size price values */
          priceBySize: z
            .record(z.string().cuid(), PriceNumber)
            .optional(),
          compareAt: PriceNumber.nullable().optional(),
          /** bulk default stock (legacy) */
          stock: z.coerce.number().int().min(0).optional(),
          /** per-size stock values */
          stockBySize: z
            .record(z.string().cuid(), z.coerce.number().int().min(0))
            .optional(),
          lowStockThreshold: z.coerce.number().int().min(0).optional(),
          weightGrams: z.coerce.number().int().min(0).nullable().optional(),
        })
        .nullable()
        .optional(),
    })
  ).min(1),
  threshold: z.number().optional(), // optional for auto-group tuning (if reused)
});
