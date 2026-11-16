// الاتصالات والأسرار from the admin's side (backend modules/admin/connections.controller.ts,
// lib/fnHttp.ts): the sites the owner's functions may call, and the keys of outside services.
// A secret is written and never read back: nothing here ever carries a value out of the server.
import { api } from "./http";

export type Site = { host: string; note: string | null; createdAt: string };
export type Secret = { id: string; name: string; /** The sites it may be sent to. */ sites: string[]; note: string | null; updatedAt: string; lastUsedAt: string | null; /** The functions that name it. */ usedBy: string[] };
export type Connections = { sites: Site[]; secrets: Secret[]; limits: { sites: number; secrets: number; value: number; ms: number; calls: number } };

const BASE = "/admin/connections";

export async function getConnections() {
  return (await api.get(BASE)).data as Connections;
}
export async function addSite(body: { host: string; note?: string }) {
  return (await api.post(`${BASE}/sites`, body)).data as Connections;
}
export async function removeSite(host: string) {
  return (await api.delete(`${BASE}/sites/${encodeURIComponent(host)}`)).data as Connections;
}
/** A new secret: its value goes to the server here and is never answered back. */
export async function addSecret(body: { name: string; value: string; sites: string[]; note?: string }) {
  return (await api.post(`${BASE}/secrets`, body)).data as Connections;
}
/** A new value replaces the old one (the name stays); the sites it is for can change. */
export async function saveSecret(id: string, body: { value?: string; sites?: string[]; note?: string | null }) {
  return (await api.put(`${BASE}/secrets/${encodeURIComponent(id)}`, body)).data as Connections;
}
/** Refused (409 SECRET_USED) while a function names it. */
export async function removeSecret(id: string) {
  return (await api.delete(`${BASE}/secrets/${encodeURIComponent(id)}`)).data as Connections;
}
