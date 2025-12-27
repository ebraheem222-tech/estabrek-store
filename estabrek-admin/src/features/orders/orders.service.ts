// src/features/orders/orders.service.ts
import * as OrdersAPI from "../../api/orders.api";
import type { OrderReqStatus } from "../../types/orders";

export type ListOrdersParams = {
  status?: OrderReqStatus;
  page?: number;
  pageSize?: number;
};

export async function fetchOrders(params: ListOrdersParams) {
  return OrdersAPI.listOrders(params);
}

export async function fetchOrderDetails(id: string) {
  return OrdersAPI.getOrder(id);
}

export async function changeOrderStatus(id: string, toStatus: OrderReqStatus, note?: string) {
  // api expects just status (as we used in hooks)
  // if your backend supports note too, add it in orders.api.ts
  return OrdersAPI.updateOrderStatus(id, toStatus);
}

export async function sendOrderMessage(
  id: string,
  body: { channel: OrdersAPI.MessageChannel; to: string; template?: string; payloadJson?: any }
) {
  return OrdersAPI.sendOrderMessage(id, body);
}
