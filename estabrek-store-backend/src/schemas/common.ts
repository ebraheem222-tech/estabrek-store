import { z } from "zod";

/** ids & slugs */
export const IdParam = z.object({ id: z.string().cuid() });
export const Slug = z.string().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: "slug must be lowercase letters/numbers with dashes",
});

/** query helpers */
export const Booleanish = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => (typeof v === "boolean" ? v : v === "true" || v === "1"));

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const SortQuery = z.object({
  sort: z.string().optional(),     // e.g. "title:asc" or "createdAt:desc"
});

export const Email = z.string().email();
export const Phone = z.string().min(6).max(32).optional();
export const PriceNumber = z.coerce.number().nonnegative().max(1_000_000);

/** handy combos */
export const ListQuery = PaginationQuery.merge(SortQuery).extend({
  q: z.string().trim().optional(),
  active: Booleanish.optional(),
});
export type ListQueryInput = z.infer<typeof ListQuery>;
