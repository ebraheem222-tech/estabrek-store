// src/types/outbox.ts
import type { ID, ISODateString, JsonValue, Paginated } from "./common";

export type Channel = "WHATSAPP" | "SMS" | "EMAIL";
export type OutboxStatus = "QUEUED" | "SENT" | "FAILED";

export type OutboxMessage = {
  id: ID;
  channel: Channel;
  to: string;

  template?: string | null;
  payloadJson?: JsonValue | null;

  status: OutboxStatus;
  lastError?: string | null;

  orderRequestId?: ID | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type ListOutboxResponse = Paginated<OutboxMessage>;

export type RetryOutboxResponse = { ok: true };
export type CancelOutboxResponse = { ok: true };
export type ProcessOutboxResponse = { ok: true; processed?: number };
