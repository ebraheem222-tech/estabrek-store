// الاتصالات والأسرار from the admin's side (backend modules/admin/connections.controller.ts,
// lib/fnHttp.ts): the sites the owner's functions may call, and the keys of outside services.
// A secret is written and never read back: nothing here ever carries a value out of the server.
import { api } from "./http";

export type Site = { host: string; note: string | null; createdAt: string };
export type Secret = { id: string; name: string; /** The sites it may be sent to. */ sites: string[]; note: string | null; updatedAt: string; lastUsedAt: string | null; /** The functions that name it. */ usedBy: string[] };
/** A kind of ready connection, as the server says it (backend lib/fnKinds.ts): what it asks for and what it can do. */
export type ReadyKind = { kind: string; label: string; host: string; /** Its key is a file the service gives (".json"): picked, not typed. */ keyFile?: string; /** Settings worked out from the key (shown, never typed): Google's service account. */ derived?: string[]; settings: Array<{ id: string; max: number; /** A connection of this kind has it. */ required?: boolean; /** One of these (a list to pick from). */ choices?: string[]; /** Asked only while another setting is this: ["auth", "header"]. */ shownWhen?: [string, string] }>; actions: Array<{ id: string; fields: Array<{ id: string; required: boolean; long: boolean; /** A setting of the connection that stands in when a step leaves this empty. */ or?: string }> }>; /** Trying its key posts a line (there is no quieter way to ask). */ test: { sends: boolean }; /** What is there can be shown (Neon, Railway, Vercel, Cloudflare: their projects and deploys). */ look?: boolean };
/** How a thing shown is going. */
export type LookTone = "good" | "bad" | "busy" | "idle";
/** One thing a look shows (a project, a branch, a service, a deploy); names and states are the service's own words. */
export type LookItem = { name: string; id?: string; state?: string; tone?: LookTone; when?: string; /** Always https. */ link?: string; /** [the page's word for it ("region"), the service's value]. */ facts?: Array<[string, string]>; items?: LookItem[] };
export type LookGroup = { /** "projects", "pages", "workers", "zones". */ id: string; items: LookItem[]; /** How many more there were than are shown. */ more?: number };
/** What is there, read through the connection (never changed): or why the service said no. */
export type ReadyLook = { ok: boolean; status: number; why: string | null; /** Whose the key is, as the service says it. */ who: string | null; groups: LookGroup[]; /** Calls the service said no to (a token that may read some things and not others). */ missed: number };
/** A service connected once: its key is kept on the server and never comes back. */
export type Ready = { id: string; kind: string; name: string; settings: Record<string, string>; updatedAt: string; lastUsedAt: string | null; /** The functions that use it. */ usedBy: string[] };
/** The key tried for real: what the service said about itself ("@my_bot"), or why it said no. */
export type ReadyTry = { ok: boolean; status: number; said: string | null; why: string | null; sends: boolean };
export type Connections = { ready?: Ready[]; kinds?: ReadyKind[]; sites: Site[]; secrets: Secret[]; limits: { sites: number; secrets: number; value: number; ms: number; calls: number; ready?: number } };

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
/** A service connected: its key goes to the server here and is never answered back. */
export async function addReady(body: { kind: string; name: string; key: string; settings?: Record<string, string> }) {
  return (await api.post(`${BASE}/ready`, body)).data as Connections;
}
/** A new key replaces the old one; the name and the settings can change. */
export async function saveReady(id: string, body: { name?: string; key?: string; settings?: Record<string, string> }) {
  return (await api.put(`${BASE}/ready/${encodeURIComponent(id)}`, body)).data as Connections;
}
/** Refused (409 CONNECTION_USED) while a function uses it. */
export async function removeReady(id: string) {
  return (await api.delete(`${BASE}/ready/${encodeURIComponent(id)}`)).data as Connections;
}
/** The key tried for real. Where the service has no quiet question, `line` is posted. */
export async function tryReady(id: string, line?: string) {
  return (await api.post(`${BASE}/ready/${encodeURIComponent(id)}/test`, line ? { line } : {})).data as ReadyTry;
}
/** What is there (a hosting service's projects, how their last deploys went), read and never changed. */
export async function lookReady(id: string) {
  return (await api.post(`${BASE}/ready/${encodeURIComponent(id)}/look`, {})).data as ReadyLook;
}
