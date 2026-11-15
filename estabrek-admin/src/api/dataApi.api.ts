// The automatic API from the admin's side (admin → الـ API والمفاتيح; backend
// modules/admin/api.controller.ts, lib/dataApi.ts, lib/apiKeys.ts): which tables are open to the
// outside and for what, and the keys. The routes the outside calls are /v1/data/<table>.
import { api } from "./http";
import type { FieldType, Local } from "./collections.api";

/** What can be done to a table's rows from outside. */
export type Act = "read" | "create" | "update" | "delete";
/** Who may: nobody, a key, everyone (changing and deleting are never for everyone). */
export type Who = "off" | "key" | "public";
export type TableAccess = Record<Act, Who>;
export type ApiField = { id: string; type: FieldType; name: Local | null; required: boolean; options?: Array<{ id: string; name: Local | null }>; many?: boolean; currency?: string };
export type ApiTable = { id: string; slug: string; name: Local | null; access: TableAccess; open: boolean; fields: ApiField[] };
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
  limits: { name: number; tables: number; keys: number; perMinute: { min: number; max: number; default: number }; pageSize: number; publicWritesPerMinute: number };
  tables: ApiTable[];
  keys: ApiKey[];
  now: number;
};
export type KeyBody = { name: string; scopes: Scopes; perMinute?: number; /** A day (2026-12-31) or null = never. */ expiresAt?: string | null };

const base = "/admin/api";

export async function getApi() {
  return (await api.get(base)).data as ApiPage;
}
export async function setAccess(tableId: string, access: TableAccess) {
  return (await api.put(`${base}/tables/${tableId}`, access)).data as ApiTable;
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
