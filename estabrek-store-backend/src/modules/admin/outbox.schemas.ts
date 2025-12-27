import { z } from "zod";

export const ListOutboxQuery = z.object({
  status: z.enum(["QUEUED", "SENT", "FAILED"]).optional(),
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const RetryBody = z.object({
  // optional future fields (e.g., override payload) – kept empty now
});

export const CancelBody = z.object({
  reason: z.string().trim().max(200).optional(),
});
