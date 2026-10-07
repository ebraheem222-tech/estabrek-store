import { z } from "zod";

export const LowStockQuery = z.object({
  q: z.string().optional(),
  onlyBelow: z.string().optional(), // "1" | "true"
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export const AdjustParams = z.object({
  variantId: z.string().cuid(),
});

export const AdjustBody = z.object({
  mode: z.enum(["delta", "set"]),
  value: z.number().int(),
  // The admin sends null when no reason was typed.
  reason: z.string().max(200).nullable().optional(),
});

/** Every size of every product, for the stock page (search, filters, a scanned SKU). */
export const VariantsQuery = z.object({
  q: z.string().max(120).optional(),
  /** Exact SKU (a scan): case-insensitive, whole code. */
  sku: z.string().max(120).optional(),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  stock: z.enum(["all", "out", "low", "ok"]).optional(),
  take: z.coerce.number().int().min(1).max(5000).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

/** Many stock changes at once (a counted shelf, a delivery, an imported sheet). */
export const BulkStockBody = z.object({
  reason: z.string().max(200).nullable().optional(),
  rows: z
    .array(
      z
        .object({
          variantId: z.string().optional(),
          sku: z.string().max(120).optional(),
          mode: z.enum(["set", "delta"]).default("set"),
          value: z.number().int().optional(),
          lowStockThreshold: z.number().int().min(0).optional(),
        })
        .refine((r) => r.variantId || r.sku, { message: "variantId or sku is required" })
        .refine((r) => r.value !== undefined || r.lowStockThreshold !== undefined, { message: "nothing to change" }),
    )
    .min(1)
    .max(3000),
});

export const ThresholdBody = z.object({
  lowStockThreshold: z.number().int().min(0),
});

export const AdjustmentsQuery = z.object({
  variantId: z.string().cuid().optional(),
  productId: z.string().optional(),
  /** SKU, product name or reason */
  q: z.string().max(120).optional(),
  adminUserId: z.string().cuid().optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});
