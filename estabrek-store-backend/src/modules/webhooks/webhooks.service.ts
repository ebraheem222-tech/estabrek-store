import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "@prisma/client";
import type { OutboxStatusUpdateInput } from "./webhooks.schemas.js";

export async function updateOutboxFromWebhook(id: string, body: OutboxStatusUpdateInput) {
  // Merge existing payloadJson with fields from webhook for easier debugging/auditing
  const prev = await prisma.outboxMessage.findUnique({
    where: { id },
    select: { payloadJson: true },
  });

  const merged: Prisma.InputJsonValue = {
    ...(prev?.payloadJson as any ?? {}),
    webhook: {
      // store normalized fields
      provider: body.provider,
      providerMessageId: body.providerMessageId,
      at: new Date().toISOString(),
      // raw payload (could be provider-specific structure)
      payload: body.payload,
    },
  };

  const updated = await prisma.outboxMessage.update({
    where: { id },
    data: {
      status: body.status,
      lastError: body.error ?? undefined,
      payloadJson: merged,
    },
  });

  return { ok: true, id: updated.id, status: updated.status };
}
