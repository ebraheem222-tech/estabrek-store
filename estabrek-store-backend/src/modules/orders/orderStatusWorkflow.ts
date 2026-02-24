import { type OrderReqStatus, Prisma } from "@prisma/client";

export const ORDER_REQUEST_STATUSES = [
  "NEW",
  "CONTACTED",
  "ACCEPTED",
  "REJECTED",
  "SHIPPED",
  "CLOSED",
  "CANCELED",
  "REFUNDED",
] as const satisfies readonly OrderReqStatus[];

type StockLine = {
  variantId: string;
  quantity: number;
};

type TransitionErrorCode = "NOT_FOUND" | "VARIANT_NOT_FOUND" | "INSUFFICIENT_STOCK";

export type ApplyOrderStatusError = {
  ok: false;
  code: TransitionErrorCode;
  message: string;
  variantId?: string;
  requested?: number;
  available?: number;
};

export type ApplyOrderStatusSuccess = {
  ok: true;
  order: {
    id: string;
    status: OrderReqStatus;
    stockCommitted: boolean;
  };
  stockAction: "none" | "decremented" | "restored";
};

export type ApplyOrderStatusResult = ApplyOrderStatusSuccess | ApplyOrderStatusError;

type TransitionArgs = {
  orderId: string;
  toStatus: OrderReqStatus;
  note?: string | null;
  actor: "admin" | "webhook";
  adminUserId?: string | null;
};

const RESTORE_STOCK_STATUSES = new Set<OrderReqStatus>(["CANCELED", "REFUNDED"]);

function sanitizeQuantity(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function collectStockLines(order: {
  variantId: string;
  quantity: number;
  items: Array<{ variantId: string; quantity: number }>;
}): StockLine[] {
  const map = new Map<string, number>();

  const add = (variantId: string, quantity: number) => {
    const q = sanitizeQuantity(quantity);
    if (!variantId || q <= 0) return;
    map.set(variantId, (map.get(variantId) ?? 0) + q);
  };

  if (order.items.length) {
    for (const it of order.items) add(it.variantId, it.quantity);
  } else {
    add(order.variantId, order.quantity);
  }

  return Array.from(map.entries()).map(([variantId, quantity]) => ({ variantId, quantity }));
}

async function resolveAdminUserId(tx: Prisma.TransactionClient, rawUserId?: string | null): Promise<string | null> {
  if (!rawUserId) return null;
  const u = await tx.adminUser.findUnique({ where: { id: rawUserId }, select: { id: true } });
  return u?.id ?? null;
}

async function applyStockLines(
  tx: Prisma.TransactionClient,
  lines: StockLine[],
  options: { multiplier: 1 | -1; reason: string; adminUserId: string | null }
): Promise<ApplyOrderStatusError | null> {
  for (const line of lines) {
    const variant = await tx.productVariant.findUnique({
      where: { id: line.variantId },
      select: { id: true, stock: true },
    });
    if (!variant) {
      return {
        ok: false,
        code: "VARIANT_NOT_FOUND",
        message: `Variant ${line.variantId} not found`,
        variantId: line.variantId,
      };
    }

    const delta = options.multiplier * line.quantity;
    const afterStock = variant.stock + delta;

    if (afterStock < 0) {
      return {
        ok: false,
        code: "INSUFFICIENT_STOCK",
        message: `Insufficient stock for variant ${line.variantId}`,
        variantId: line.variantId,
        requested: line.quantity,
        available: variant.stock,
      };
    }

    await tx.productVariant.update({
      where: { id: line.variantId },
      data: { stock: afterStock },
    });

    await tx.inventoryAdjustment.create({
      data: {
        variantId: line.variantId,
        delta,
        beforeStock: variant.stock,
        afterStock,
        reason: options.reason,
        adminUserId: options.adminUserId,
      },
    });
  }

  return null;
}

function defaultTransitionNote(actor: "admin" | "webhook", stockAction: "none" | "decremented" | "restored"): string {
  if (stockAction === "decremented") {
    return actor === "admin"
      ? "Updated via admin (stock decremented)"
      : "Updated via webhook (stock decremented)";
  }
  if (stockAction === "restored") {
    return actor === "admin"
      ? "Updated via admin (stock restored)"
      : "Updated via webhook (stock restored)";
  }
  return actor === "admin" ? "Updated via admin" : "Updated via webhook";
}

function computeCommittedFromHistory(history: Array<{ toStatus: OrderReqStatus }>): boolean {
  let committed = false;
  for (const h of history) {
    if (h.toStatus === "ACCEPTED") committed = true;
    if (RESTORE_STOCK_STATUSES.has(h.toStatus)) committed = false;
  }
  return committed;
}

export async function applyOrderStatusTransition(
  tx: Prisma.TransactionClient,
  args: TransitionArgs
): Promise<ApplyOrderStatusResult> {
  const existing = await tx.orderRequest.findUnique({
    where: { id: args.orderId },
    select: {
      id: true,
      status: true,
      variantId: true,
      quantity: true,
      items: {
        select: {
          variantId: true,
          quantity: true,
        },
      },
      history: {
        orderBy: { at: "asc" },
        select: { toStatus: true },
      },
    },
  });

  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Order not found" };
  }

  const lines = collectStockLines(existing);
  const isCommitted = computeCommittedFromHistory(existing.history);
  const shouldDecrement = args.toStatus === "ACCEPTED" && !isCommitted;
  const shouldRestore = RESTORE_STOCK_STATUSES.has(args.toStatus) && isCommitted;
  const stockAction: "none" | "decremented" | "restored" = shouldDecrement
    ? "decremented"
    : shouldRestore
      ? "restored"
      : "none";

  const adminUserId = await resolveAdminUserId(tx, args.adminUserId);

  if (shouldDecrement && lines.length) {
    const err = await applyStockLines(tx, lines, {
      multiplier: -1,
      reason: `ORDER_ACCEPT:${existing.id}`,
      adminUserId,
    });
    if (err) return err;
  }

  if (shouldRestore && lines.length) {
    const err = await applyStockLines(tx, lines, {
      multiplier: 1,
      reason: `ORDER_RESTORE:${args.toStatus}:${existing.id}`,
      adminUserId,
    });
    if (err) return err;
  }

  const now = new Date();
  const data: Prisma.OrderRequestUpdateInput = { status: args.toStatus };

  if (args.toStatus === "CONTACTED") data.contactedAt = now;
  if (args.toStatus === "ACCEPTED") data.acceptedAt = now;
  if (args.toStatus === "REJECTED") data.rejectedAt = now;

  const updated = await tx.orderRequest.update({
    where: { id: existing.id },
    data,
    select: {
      id: true,
      status: true,
    },
  });

  await tx.orderRequestHistory.create({
    data: {
      orderRequestId: existing.id,
      fromStatus: existing.status,
      toStatus: args.toStatus,
      note: args.note ?? defaultTransitionNote(args.actor, stockAction),
    },
  });

  return {
    ok: true,
    order: {
      ...updated,
      stockCommitted: shouldDecrement ? true : shouldRestore ? false : isCommitted,
    },
    stockAction,
  };
}
