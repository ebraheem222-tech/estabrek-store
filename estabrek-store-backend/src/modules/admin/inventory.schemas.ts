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
  reason: z.string().max(200).optional(),
});

export const ThresholdBody = z.object({
  lowStockThreshold: z.number().int().min(0),
});

export const AdjustmentsQuery = z.object({
  variantId: z.string().cuid().optional(),
  adminUserId: z.string().cuid().optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});
