import { prisma } from "../../lib/prisma.js";
import { Prisma, type OrderReqStatus, type Channel } from "@prisma/client";

/** List orders with optional status filter + pagination */
export async function listOrders(opts: {
  status?: OrderReqStatus;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.OrderRequestWhereInput = {};
  if (opts.status) where.status = opts.status;

  const [total, data] = await Promise.all([
    prisma.orderRequest.count({ where }),
    prisma.orderRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
      include: {
        variant: { include: { item: { include: { product: true } }, size: true } },
      },
    }),
  ]);

  return { total, page: opts.page, pageSize: opts.pageSize, data };
}

/** One order with full details (variant, messages, history) */
export function getOrder(id: string) {
  return prisma.orderRequest.findUnique({
    where: { id },
    include: {
      variant: { include: { item: { include: { product: true } }, size: true } },
      messages: true,
      history: { orderBy: { at: "desc" } },
    },
  });
}

/** Update status + write history (+ timestamps when relevant) */
export async function updateStatus(args: {
  id: string;
  to: OrderReqStatus;
  note?: string | null;
}) {
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const prev = await tx.orderRequest.findUnique({ where: { id: args.id } });

    const data: Prisma.OrderRequestUpdateInput = { status: args.to };
    if (args.to === "CONTACTED") data.contactedAt = now;
    if (args.to === "ACCEPTED")  data.acceptedAt = now;
    if (args.to === "REJECTED")  data.rejectedAt = now;

    const ord = await tx.orderRequest.update({ where: { id: args.id }, data });

    await tx.orderRequestHistory.create({
      data: {
        orderRequestId: ord.id,
        fromStatus: prev?.status ?? null,
        toStatus: args.to,
        note: args.note ?? null,
      },
    });

    return ord;
  });

  return updated;
}

/** Queue an outbound message (WhatsApp/SMS/Email) */
export function queueMessage(orderId: string, params: {
  channel: Channel;
  to: string;
  template?: string | null;
  payloadJson?: unknown;
}) {
  return prisma.outboxMessage.create({
    data: {
      orderRequestId: orderId,
      channel: params.channel,
      to: params.to,
      template: params.template ?? null,
      payloadJson: params.payloadJson ?? Prisma.DbNull,
      status: "QUEUED",
    },
  });
}
