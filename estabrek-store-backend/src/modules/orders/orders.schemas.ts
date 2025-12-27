import { z } from "zod";

export const ListOrdersQuery = z.object({
  status: z
    .enum(["NEW", "CONTACTED", "ACCEPTED", "REJECTED", "SHIPPED", "CLOSED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const UpdateStatusBody = z.object({
  toStatus: z.enum(["NEW", "CONTACTED", "ACCEPTED", "REJECTED", "SHIPPED", "CLOSED"]),
  note: z.string().nullable().optional(),
});

export const QueueMessageBody = z.object({
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
  to: z.string().min(3),
  template: z.string().nullable().optional(),
  payloadJson: z.any().optional(),
});
