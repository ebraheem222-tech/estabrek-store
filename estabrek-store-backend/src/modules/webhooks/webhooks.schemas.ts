import { z } from "zod";

export const OutboxStatusUpdateBody = z.object({
  status: z.enum(["QUEUED", "SENT", "FAILED"]),
  error: z.string().trim().optional(),
  provider: z.string().trim().optional(),
  providerMessageId: z.string().trim().optional(),
  // Any extra payload the provider posts back (will be merged into payloadJson)
  payload: z.any().optional(),
});

export type OutboxStatusUpdateInput = z.infer<typeof OutboxStatusUpdateBody>;
