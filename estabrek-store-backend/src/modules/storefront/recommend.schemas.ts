import { z } from "zod";

export const RecommendProductsBody = z.object({
  locale: z.enum(["ar", "he", "en"]).optional(),
  message: z.string().trim().min(1).max(800).optional(),
  productId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(12).optional(),
  excludeIds: z.array(z.string().trim().min(1)).max(50).optional(),
});

