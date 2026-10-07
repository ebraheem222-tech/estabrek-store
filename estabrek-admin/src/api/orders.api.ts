// src/api/orders.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type OrderStatus =
  | "NEW"
  | "CONTACTED"
  | "ACCEPTED"
  | "REJECTED"
  | "SHIPPED"
  | "CLOSED"
  | "CANCELED"
  | "REFUNDED";
export type MessageChannel = "WHATSAPP" | "SMS" | "EMAIL";

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: T[];
};

export type OrdersFilter = {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
  /** Name, phone (any format) or order number. */
  q?: string;
  from?: string;
  to?: string;
  source?: string;
  city?: string;
  payment?: "paid" | "unpaid";
};

export async function listOrders(params?: OrdersFilter) {
  const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ""));
  const res = await api.get(ENDPOINTS.admin.orders.base, { params: clean });
  return res.data as Paginated<any>;
}

export type OrdersSummary = {
  counts: Partial<Record<OrderStatus, number>>;
  latestNew: Array<{ id: string; customerName: string; total?: string | number | null; city?: string | null; source?: string | null; createdAt: string }>;
};

/** Status counts + newest new orders. Falls back to the list endpoint on servers without /summary. */
export async function getOrdersSummary(): Promise<OrdersSummary> {
  try {
    const res = await api.get(`${ENDPOINTS.admin.orders.base}/summary`);
    if (res.data && typeof res.data === "object" && "counts" in res.data) return res.data as OrdersSummary;
  } catch (e: any) {
    if (e?.response?.status && e.response.status !== 404 && e.response.status !== 400) throw e;
  }
  const res = await listOrders({ status: "NEW", pageSize: 10 });
  return { counts: { NEW: res.total }, latestNew: res.data };
}

export type OrderDetailsBody = {
  customerName?: string;
  phone?: string;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  paymentStatus?: "PAID" | "UNPAID" | null;
  paymentProvider?: string | null;
  note?: string | null;
};

export async function updateOrderDetails(id: string, body: OrderDetailsBody) {
  const res = await api.patch(`${ENDPOINTS.admin.orders.byId(id)}/details`, body);
  return res.data as any;
}

export async function getOrder(id: string) {
  const res = await api.get(ENDPOINTS.admin.orders.byId(id));
  return res.data as any;
}

export async function updateOrderStatus(id: string, toStatus: OrderStatus, note?: string | null) {
  const res = await api.patch(ENDPOINTS.admin.orders.status(id), { toStatus, note: note?.trim() ? note.trim() : undefined });
  return res.data as any;
}

export async function sendOrderMessage(
  id: string,
  body: { channel: MessageChannel; to: string; template?: string; payloadJson?: any }
) {
  const res = await api.post(ENDPOINTS.admin.orders.message(id), body);
  return res.data as any;
}


export async function getInvoiceHtml(id: string) {
  const res = await api.get(ENDPOINTS.admin.orders.invoice(id), {
    responseType: "text",
    headers: { Accept: "text/html" },
  });
  return res.data as unknown as string;
}
