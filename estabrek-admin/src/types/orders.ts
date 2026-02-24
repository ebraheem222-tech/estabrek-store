// src/types/orders.ts
import type { ID, ISODateString, JsonValue, Paginated } from "./common";
import type { Channel, OutboxStatus, OutboxMessage } from "./outbox";
import type { ProductVariant } from "./catalog";

export type OrderReqStatus =
  | "NEW"
  | "CONTACTED"
  | "ACCEPTED"
  | "REJECTED"
  | "SHIPPED"
  | "CLOSED"
  | "CANCELED"
  | "REFUNDED";

export type OrderRequestItem = {
  id: ID;
  orderRequestId: ID;
  variantId: ID;
  quantity: number;

  unitPrice: number | string;
  lineSubtotal: number | string;
  // computed by backend for accounting-friendly invoice (may be missing in older orders)
  lineDiscount?: number | string;
  lineTotal?: number | string;

  productId: ID;
  productTitle: string;
  productSlug?: string | null;
  itemId?: ID | null;
  colorName?: string | null;
  colorHex?: string | null;
  sizeId?: ID | null;
  sizeName?: string | null;
  sku?: string | null;
  imageUrl?: string | null;

  createdAt?: ISODateString;
};

/** Prisma: OrderRequestHistory */
export type OrderRequestHistory = {
  id: ID;
  orderRequestId: ID;
  fromStatus?: OrderReqStatus | null;
  toStatus: OrderReqStatus;
  note?: string | null;
  at: ISODateString;
};

/** Prisma: OrderRequest */
export type OrderRequest = {
  id: ID;

  variantId: ID;
  variant?: ProductVariant;

  quantity: number;

  // snapshot totals (Decimal in DB, may arrive as string)
  currencyCode?: string;
  subtotal?: number | string | null;
  discountAmount?: number | string | null;
  total?: number | string | null;

  couponCode?: string | null;
  items?: OrderRequestItem[];

  customerName: string;
  phone: string;
  whatsapp?: string | null;

  country?: string | null;
  city?: string | null;
  address?: string | null;
  note?: string | null;

  status: OrderReqStatus;
  source?: string | null;

  contactedAt?: ISODateString | null;
  acceptedAt?: ISODateString | null;
  rejectedAt?: ISODateString | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;

  messages?: OutboxMessage[];
  history?: OrderRequestHistory[];
};

export type ListOrdersResponse = Paginated<OrderRequest>;

export type UpdateOrderStatusBody = {
  toStatus: OrderReqStatus;
  note?: string | null;
};

export type QueueOrderMessageBody = {
  channel: Channel;
  to: string;
  template?: string | null;
  payloadJson?: JsonValue;
};

export type QueueOrderMessageResponse = OutboxMessage & {
  orderRequestId?: ID | null;
  status: OutboxStatus;
};
