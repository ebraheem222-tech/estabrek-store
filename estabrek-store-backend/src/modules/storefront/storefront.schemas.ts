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

// Backwards-compat alias (some modules import this name)
export const StorefrontPageQuery = PageBySlugQuery;
