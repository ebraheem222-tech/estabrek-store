// src/features/outbox/outbox.service.ts
import * as OutboxAPI from "../../api/outbox.api";

export type ListOutboxParams = {
  status?: OutboxAPI.OutboxStatus;
  channel?: OutboxAPI.OutboxChannel;
  page?: number;
  pageSize?: number;
};

export async function fetchOutbox(params: ListOutboxParams) {
  return OutboxAPI.listOutbox(params);
}

export async function fetchOutboxOne(id: string) {
  return OutboxAPI.getOutboxMessage(id);
}

export async function retryMessage(id: string) {
  return OutboxAPI.retryOutboxMessage(id);
}

export async function cancelMessage(id: string, reason?: string) {
  return OutboxAPI.cancelOutboxMessage(id, reason);
}

export async function processOnce() {
  return OutboxAPI.processOutboxOnce();
}
