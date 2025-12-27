// src/api/outbox.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type OutboxStatus = "QUEUED" | "SENT" | "FAILED";
export type OutboxChannel = "EMAIL" | "SMS" | "WHATSAPP";

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: T[];
};

export async function listOutbox(params?: { status?: OutboxStatus; channel?: OutboxChannel; page?: number; pageSize?: number }) {
  const res = await api.get(ENDPOINTS.admin.outbox.base, { params });
  return res.data as Paginated<any>;
}

export async function getOutboxMessage(id: string) {
  const res = await api.get(ENDPOINTS.admin.outbox.byId(id));
  return res.data as any;
}

export async function retryOutboxMessage(id: string) {
  // backend validates empty body object too
  const res = await api.post(ENDPOINTS.admin.outbox.retry(id), {});
  return res.data as any;
}

export async function cancelOutboxMessage(id: string, reason?: string) {
  const res = await api.post(ENDPOINTS.admin.outbox.cancel(id), { reason });
  return res.data as any;
}

export async function processOutboxOnce() {
  const res = await api.post(ENDPOINTS.admin.outbox.process);
  return res.data as any;
}
