import { z } from "zod";
import { ORDER_REQUEST_STATUSES } from "../orders/orderStatusWorkflow.js";

export const ListOrdersQuery = z.object({
  status: z.enum(ORDER_REQUEST_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const UpdateStatusBody = z.object({
  toStatus: z.enum(ORDER_REQUEST_STATUSES),
  note: z.string().nullable().optional(),
});

export const QueueMessageBody = z.object({
  channel: z.enum(["WHATSAPP","SMS","EMAIL"]),
  to: z.string().min(3),
  template: z.string().nullable().optional(),
  payloadJson: z.any().optional(),
});
