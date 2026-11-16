// ميزاتي from the admin's side (backend modules/admin/myFeatures.controller.ts,
// lib/featureGate.ts): a feature the owner built is a name over tables, functions and pages
// made elsewhere in the studio, found together and switched off together.
import { api } from "./http";

type Local = Partial<Record<"ar" | "en" | "he", string>>;
export type FeatureKind = "table" | "function" | "page";
export type Who = "off" | "key" | "customer" | "public";
export type TableAccess = { read: Who; create: Who; update: Who; delete: Who };

export type FeatureLite = { id: string; name: string; note: string | null; enabled: boolean; updatedAt: string; counts: Record<FeatureKind, number> };
export type FeatureTable = { id: string; slug: string; name: Local | null; fields: number; rows: number; api: TableAccess };
export type FeatureFn = { id: string; name: string; note: string | null; enabled: boolean; published: boolean; changed: boolean; triggers: number; runs: number; lastRunAt: string | null };
export type FeaturePage = { id: string; name: string; slug: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; hasDraft: boolean; /** The feature is off: the shop answers this page as one that isn't there. */ hidden?: boolean };
export type Feature = {
  id: string;
  name: string;
  note: string | null;
  /** Off: its functions aren't started, its tables' API answers as closed, and its pages are hidden from the shop. */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  tables: FeatureTable[];
  functions: FeatureFn[];
  pages: FeaturePage[];
  /** What isn't in any feature yet. */
  free: { tables: Array<{ id: string; slug: string; name: Local | null }>; functions: Array<{ id: string; name: string }>; pages: Array<{ id: string; name: string; slug: string }> };
  limits: { features: number; items: number };
};

const BASE = "/admin/my-features";
const at = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

export async function listFeatures() {
  return (await api.get(BASE)).data as { features: FeatureLite[]; limits: { features: number; items: number } };
}
export async function getFeature(id: string) {
  return (await api.get(at(id))).data as Feature;
}
export async function createFeature(body: { name: string; note?: string }) {
  return (await api.post(BASE, body)).data as Feature;
}
export async function saveFeature(id: string, body: { name?: string; note?: string | null; enabled?: boolean }) {
  return (await api.put(at(id), body)).data as Feature;
}
/** Only the name goes: its tables, functions and pages stay where they were made. */
export async function deleteFeature(id: string) {
  return (await api.delete(at(id))).data as { ok: true };
}
/** A table, a function or a page joins the feature (409 ITEM_TAKEN when it is another feature's). */
export async function addFeatureItem(id: string, kind: FeatureKind, refId: string) {
  return (await api.post(`${at(id)}/items`, { kind, refId })).data as Feature;
}
export async function removeFeatureItem(id: string, kind: FeatureKind, refId: string) {
  return (await api.delete(`${at(id)}/items/${kind}/${encodeURIComponent(refId)}`)).data as Feature;
}
