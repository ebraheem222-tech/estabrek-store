// The automatic API from the admin's side (admin → الـ API والمفاتيح; backend
// modules/admin/api.controller.ts, lib/dataApi.ts, lib/apiKeys.ts): which tables are open to the
// outside and for what, and the keys. The routes the outside calls are /v1/data/<table>.
import { api } from "./http";
import type { FieldType, Local } from "./collections.api";

/** What can be done to a table's rows from outside. */
export type Act = "read" | "create" | "update" | "delete";
/** Who may: nobody, a key, a signed-in shopper (their own rows only), everyone (changing and deleting are never for everyone). */
export type Who = "off" | "key" | "customer" | "public";
export type TableAccess = Record<Act, Who>;
export type ApiField = { id: string; type: FieldType; name: Local | null; required: boolean; options?: Array<{ id: string; name: Local | null }>; many?: boolean; currency?: string };
export type ApiTable = { id: string; slug: string; name: Local | null; access: TableAccess; open: boolean; /** The fields only a key sees or writes. */ private: string[]; fields: ApiField[] };
export type Scopes = { /** Every table (those made later too), or these, by id. */ tables: "*" | string[]; acts: Act[] };
export type KeyState = "active" | "revoked" | "expired";
/** A key as the admin sees it: its first letters, never the key itself. */
export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: Scopes;
  perMinute: number;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  state: KeyState;
};
export type ApiPage = {
  /** Where the routes start on the server ("/v1/data"). */
  base: string;
  who: Who[];
  acts: Act[];
  limits: { name: number; tables: number; keys: number; perMinute: { min: number; max: number; default: number }; pageSize: number; publicWritesPerMinute: number; customerWritesPerMinute: number };
  /** Shopper accounts are switched on (a table open "to the shopper" needs them). */
  customerAccounts: boolean;
  tables: ApiTable[];
  keys: ApiKey[];
  now: number;
};
export type KeyBody = { name: string; scopes: Scopes; perMinute?: number; /** A day (2026-12-31) or null = never. */ expiresAt?: string | null };
/** The open tables described by the server: an OpenAPI document and TypeScript types, made from their fields. */
export type ApiDocs = { /** How many tables are open. */ tables: number; openapi: Record<string, unknown>; types: string; /** Where anyone fetches the document ("/v1/data/openapi.json"). */ openapiPath: string };

const base = "/admin/api";

export async function getApi() {
  return (await api.get(base)).data as ApiPage;
}
export async function getDocs() {
  return (await api.get(`${base}/docs`)).data as ApiDocs;
}
/** `hidden`: the private fields; left as they are when not given. */
export async function setAccess(tableId: string, access: TableAccess, hidden?: string[]) {
  return (await api.put(`${base}/tables/${tableId}`, hidden ? { ...access, private: hidden } : access)).data as ApiTable;
}
/** The key itself comes back this once; the server doesn't keep it. */
export async function createKey(body: KeyBody) {
  return (await api.post(`${base}/keys`, body)).data as { key: ApiKey; secret: string };
}
export async function updateKey(id: string, body: Partial<KeyBody>) {
  return (await api.patch(`${base}/keys/${id}`, body)).data as { key: ApiKey };
}
export async function revokeKey(id: string) {
  return (await api.post(`${base}/keys/${id}/revoke`, {})).data as { key: ApiKey };
}
export async function deleteKey(id: string) {
  return (await api.delete(`${base}/keys/${id}`)).data as { ok: true };
}
