import { z } from "zod";

export const PageBySlugQuery = z.object({
  slug: z.string().min(1),
  locale: z.enum(["ar","he","en"]).optional(),
});

export const StorefrontListProductsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const StorefrontSearchSuggestQuery = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export const StorefrontCheckoutCreateBody = z.object({
  provider: z.enum(["stripe", "paypal"]),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.coerce.number().int().min(1),
      })
    )
    .min(1),
  customerName: z.string().min(2).max(120),
  phone: z.string().min(5).max(40),
  email: z.string().trim().toLowerCase().email().max(160).nullable().optional().or(z.literal("").transform(() => null)),
  address: z.string().max(240).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  couponCode: z.string().max(40).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
});

export const StorefrontCheckoutVerifyQuery = z.object({
  provider: z.enum(["stripe", "paypal"]),
  sessionId: z.string().min(6),
});

// Backwards-compat alias (some modules import this name)
export const StorefrontPageQuery = PageBySlugQuery;
