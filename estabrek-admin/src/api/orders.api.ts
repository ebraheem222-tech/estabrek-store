// src/api/orders.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type OrderStatus = "NEW" | "CONTACTED" | "ACCEPTED" | "REJECTED" | "SHIPPED" | "CLOSED";
export type MessageChannel = "WHATSAPP" | "SMS" | "EMAIL";

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: T[];
};

export async function listOrders(params?: { status?: OrderStatus; page?: number; pageSize?: number }) {
  const res = await api.get(ENDPOINTS.admin.orders.base, { params });
  return res.data as Paginated<any>;
}

export async function getOrder(id: string) {
  const res = await api.get(ENDPOINTS.admin.orders.byId(id));
  return res.data as any;
}

export async function updateOrderStatus(id: string, toStatus: OrderStatus) {
  const res = await api.patch(ENDPOINTS.admin.orders.status(id), { toStatus });
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
