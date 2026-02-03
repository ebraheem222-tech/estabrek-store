import { z } from "zod";
import { PriceNumber } from "../../schemas/common.js";

const Boolish = z.preprocess((v) => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return v;
}, z.boolean());

const CartItemBody = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).default(1),
});


/** list/browse query */
export const ProductListQuery = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(), // category slug
  categoryId: z.string().cuid().optional(),
  inStock: Boolish.optional(),
  color: z.string().trim().optional(),
  sizeId: z.string().cuid().optional(),
  // multi-select (comma separated)
  colors: z.string().trim().optional(),
  sizeIds: z.string().trim().optional(),
  minPrice: PriceNumber.optional(),
  maxPrice: PriceNumber.optional(),
  sort: z.enum(["latest", "title_asc", "title_desc", "price_asc", "price_desc"]).default("latest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  // alias
  limit: z.coerce.number().int().min(1).max(50).optional(),
  lite: Boolish.optional(),
  includeFacets: Boolish.optional(),
});

export const ProductIdsBody = z.object({
  ids: z.array(z.string().cuid()).min(1).max(200),
});

export const CreateReviewBody = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(5).max(2000),
  userId: z.string().cuid().optional(), // optional for now
});

export const CreateCommentBody = z.object({
  body: z.string().trim().min(2).max(2000),
  userId: z.string().cuid().optional(),
});

export const CreateOrderRequestBody = z
  .object({
    // new multi-item shape
    items: z.array(CartItemBody).min(1).max(50).optional(),

    // legacy single-item shape (kept for compatibility)
    variantId: z.string().cuid().optional(),
    quantity: z.number().int().min(1).default(1).optional(),

    customerName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(5).max(40),
    whatsapp: z.string().trim().min(5).max(40).optional(),
    country: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    address: z.string().trim().max(300).optional(),
    note: z.string().trim().max(500).optional(),
    couponCode: z
      .string()
      .trim()
      .min(2)
      .max(32)
      .regex(/^[a-zA-Z0-9_-]+$/, { message: "code must be alphanum/_/-" })
      .transform((v) => v.toUpperCase())
      .optional(),
    source: z.string().trim().max(80).optional(),
  })
  .superRefine((v, ctx) => {
    const hasItems = Array.isArray(v.items) && v.items.length > 0;
    const hasLegacy = typeof v.variantId === "string" && v.variantId.length > 0;
    if (!hasItems && !hasLegacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either items[] or variantId is required",
        path: ["items"],
      });
    }
  });



export const QuoteBody = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).default(1),
  couponCode: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "code must be alphanum/_/-" })
    .transform((v) => v.toUpperCase())
    .optional(),
});


export const CartQuoteBody = z.object({
  items: z.array(CartItemBody).min(1).max(50),
  couponCode: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "code must be alphanum/_/-" })
    .transform((v) => v.toUpperCase())
    .optional(),
});
