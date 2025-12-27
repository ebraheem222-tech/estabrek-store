import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { Channel, OutboxStatus } from "@prisma/client";
import { sendEmail } from "./sender/email.js";
import { sendSms } from "./sender/sms.js";
import { sendWhatsapp } from "./sender/whatsapp.js";

type ListParams = {
  status?: OutboxStatus;
  channel?: Channel;
  page: number;
  pageSize: number;
};

export async function listOutbox({ status, channel, page, pageSize }: ListParams) {
  const where: Prisma.OutboxMessageWhereInput = {};
  if (status) where.status = status;
  if (channel) where.channel = channel;

  const skip = (page - 1) * pageSize;
  const [total, data] = await Promise.all([
    prisma.outboxMessage.count({ where }),
    prisma.outboxMessage.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      include: {
        orderRequest: {
          include: {
            variant: { include: { size: true, item: { include: { product: true } } } },
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    data,
  };
}

export function getOutboxMessage(id: string) {
  return prisma.outboxMessage.findUnique({
    where: { id },
    include: {
      orderRequest: {
        include: {
          variant: { include: { size: true, item: { include: { product: true } } } },
        },
      },
    },
  });
}

/** Mark message back to QUEUED and clear lastError */
export async function retryOutboxMessage(id: string) {
  return prisma.outboxMessage.update({
    where: { id },
    data: { status: "QUEUED", lastError: null },
  });
}

/** Mark message FAILED with a reason */
export async function cancelOutboxMessage(id: string, reason?: string) {
  return prisma.outboxMessage.update({
    where: { id },
    data: { status: "FAILED", lastError: reason ?? "cancelled" },
  });
}

/** Internal: attempt to deliver a single message */
async function deliver(msg: {
  id: string;
  channel: Channel;
  to: string;
  template: string | null;
  payloadJson: any; // may be Prisma.JsonNull/DbNull – we’ll normalize below
}) {
  const payload = msg.payloadJson ?? undefined;

  if (msg.channel === "EMAIL") {
    return sendEmail({ to: msg.to, template: msg.template, payload });
  }
  if (msg.channel === "SMS") {
    return sendSms({ to: msg.to, template: msg.template, payload });
  }
  if (msg.channel === "WHATSAPP") {
    return sendWhatsapp({ to: msg.to, template: msg.template, payload });
  }
  return { ok: false as const, error: "UNSUPPORTED_CHANNEL" };
}

/** Process a batch of queued messages (FIFO) */
export async function processQueueOnce(limit = 25) {
  // pull a small batch of QUEUED
  const batch = await prisma.outboxMessage.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;

  for (const msg of batch) {
    try {
      const result = await deliver({
        id: msg.id,
        channel: msg.channel,
        to: msg.to,
        template: msg.template ?? null,
        payloadJson: msg.payloadJson ?? undefined,
      });

      if ((result as any).ok) {
        await prisma.outboxMessage.update({
          where: { id: msg.id },
          data: { status: "SENT", lastError: null },
        });
        sent++;
      } else {
        await prisma.outboxMessage.update({
          where: { id: msg.id },
          data: { status: "FAILED", lastError: (result as any).error ?? "send_failed" },
        });
        failed++;
      }
    } catch (err: any) {
      await prisma.outboxMessage.update({
        where: { id: msg.id },
        data: { status: "FAILED", lastError: err?.message ?? "exception" },
      });
      failed++;
    }
  }

  return { ok: true, checked: batch.length, sent, failed };
}

/** Helper to enqueue (if you want a single place to create outbox messages) */
export async function enqueueMessage(params: {
  channel: Channel;
  to: string;
  template?: string | null;
  payloadJson?: any;
  orderRequestId?: string | null;
}) {
  return prisma.outboxMessage.create({
    data: {
      channel: params.channel,
      to: params.to,
      template: params.template ?? null,
      payloadJson: params.payloadJson ?? Prisma.DbNull, // ← IMPORTANT (Json? field)
      orderRequestId: params.orderRequestId ?? null,
      status: "QUEUED",
    },
  });
}
