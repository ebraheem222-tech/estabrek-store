// Webhooks طالعة from the admin's side (backend modules/admin/webhooksOut.controller.ts,
// lib/webhooksOut.ts): the addresses the store's events are sent to, and how each delivery went.
// An endpoint's signing secret is answered once, when it is made or renewed, and never again.
import { api } from "./http";
import type { Local } from "./collections.api";

export type Endpoint = {
  id: string;
  name: string;
  url: string;
  events: string[];
  /** Row events: of these tables only (their ids); empty = of every table. */
  tables: string[];
  /** The secret's last letters. */
  hint: string;
  enabled: boolean;
  /** Deliveries that failed for good in a row; at the limit the server pauses the endpoint. */
  failures: number;
  pausedAt: string | null;
  lastOkAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  createdAt: string;
  /** Deliveries still to be sent, or tried again. */
  waiting: number;
};
export type Delivery = { id: string; event: string; eventId: string; status: "waiting" | "sent" | "failed"; attempts: number; code: number | null; error: string | null; ms: number | null; nextAt: string | null; createdAt: string; finishedAt: string | null };
export type Webhooks = {
  endpoints: Endpoint[];
  events: { rows: string[]; store: string[]; ping: string };
  tables: Array<{ id: string; slug: string; name: Local }>;
  limits: { endpoints: number; tables: number; name: number; url: number; tries: number; pauseAfter: number; keepDays: number; freshSeconds: number; /** The waits between a delivery's tries, in seconds. */ waits: number[] };
};
/** A try sent now: how it went. */
export type Ping = { ok: boolean; code: number | null; ms: number; error: string | null; delivery: string };
export type EndpointBody = { name: string; url: string; events: string[]; tables: string[] };

const BASE = "/admin/webhooks";

export async function getWebhooks() {
  return (await api.get(BASE)).data as Webhooks;
}
/** A new endpoint: the one answer that carries its secret. */
export async function addEndpoint(body: EndpointBody) {
  return (await api.post(BASE, body)).data as { endpoint: Endpoint; secret: string };
}
export async function changeEndpoint(id: string, body: Partial<EndpointBody> & { enabled?: boolean }) {
  return (await api.patch(`${BASE}/${id}`, body)).data as { endpoint: Endpoint };
}
/** A new secret: the old one signs nothing from now on. */
export async function renewSecret(id: string) {
  return (await api.post(`${BASE}/${id}/secret`)).data as { endpoint: Endpoint; secret: string };
}
export async function removeEndpoint(id: string) {
  await api.delete(`${BASE}/${id}`);
}
export async function pingEndpoint(id: string) {
  return (await api.post(`${BASE}/${id}/test`)).data as Ping;
}
export async function getDeliveries(id: string, before?: string | null) {
  return (await api.get(`${BASE}/${id}/deliveries`, { params: before ? { before } : {} })).data as { deliveries: Delivery[]; next: string | null };
}
/** One delivery with what was sent, letter for letter. */
export async function getDelivery(id: string, delivery: string) {
  return (await api.get(`${BASE}/${id}/deliveries/${delivery}`)).data as Delivery & { body: string };
}
export async function resendDelivery(id: string, delivery: string) {
  await api.post(`${BASE}/${id}/deliveries/${delivery}/resend`);
}
