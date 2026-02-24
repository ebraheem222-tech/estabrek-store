import { prisma } from "../../lib/prisma.js";
import { Prisma, type OrderReqStatus, type Channel } from "@prisma/client";
import { applyOrderStatusTransition } from "./orderStatusWorkflow.js";

const ORDER_REQUEST_BASE_SELECT = {
  id: true,
  variantId: true,
  quantity: true,
  unitPrice: true,
  subtotal: true,
  discountAmount: true,
  total: true,
  currencyCode: true,
  couponCode: true,
  customerName: true,
  phone: true,
  whatsapp: true,
  country: true,
  city: true,
  address: true,
  note: true,
  status: true,
  source: true,
  paymentProvider: true,
  paymentStatus: true,
  paymentReference: true,
  contactedAt: true,
  acceptedAt: true,
  rejectedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
      select: {
        ...ORDER_REQUEST_BASE_SELECT,
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
    select: {
      ...ORDER_REQUEST_BASE_SELECT,
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
  const result = await prisma.$transaction(
    async (tx) =>
      applyOrderStatusTransition(tx, {
        orderId: args.id,
        toStatus: args.to,
        note: args.note ?? null,
        actor: "admin",
      }),
    { isolationLevel: "Serializable" }
  );

  if (!result.ok) {
    const err = new Error(result.message) as Error & { statusCode: number; code: string };
    err.statusCode = result.code === "NOT_FOUND" || result.code === "VARIANT_NOT_FOUND" ? 404 : 400;
    err.code = result.code;
    throw err;
  }

  return result.order;
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
