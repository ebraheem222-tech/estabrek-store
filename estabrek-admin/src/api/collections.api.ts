// Content collections (W3; backend lib/collections.ts): collections, their fields and items, and each one's item page.
import { api } from "./http";

export type Local = Partial<Record<"ar" | "en" | "he", string>>;
export type FieldType = "text" | "longText" | "image" | "number" | "date" | "link" | "boolean" | "select" | "color";
/** A field: its kind, its name, and its rules (backend lib/fieldRules.ts). */
export type CollectionField = {
  id: string;
  type: FieldType;
  name?: Local;
  required?: boolean;
  options?: { id: string; name?: Local }[];
  /** No two rows with the same value. */
  unique?: boolean;
  /** A new row's value when none is written. */
  default?: unknown;
  /** Numbers: smallest and largest. Words: fewest and most letters. Dates: first and last day. */
  min?: number | string;
  max?: number | string;
  shape?: "email" | "phone" | "url" | "letters" | "digits" | "slug";
  pattern?: string;
  /** Said when a value breaks the field's rules. */
  message?: Local;
  /** A hint under the field in forms. */
  help?: Local;
};
export type Collection = { id: string; slug: string; name: Local; fields: CollectionField[]; templateId: string | null; items: number; published: number; createdAt: string; updatedAt: string };
export type ItemStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type CollectionItem = { id: string; collectionId: string; slug: string; status: ItemStatus; data: Record<string, unknown>; sort: number; publishedAt: string | null; createdAt: string; updatedAt: string };
export type CollectionPreset = { name: Local; slug: string; fields: CollectionField[] };

const base = "/admin/collections";

export async function listCollections() {
  const data = (await api.get(base)).data;
  return (Array.isArray(data) ? data : []) as Collection[];
}
export async function collectionPresets() {
  return (await api.get(`${base}/presets`)).data as Record<string, CollectionPreset>;
}
export async function createCollection(body: { preset: string; slug?: string } | { slug: string; name: Local; fields: CollectionField[] }) {
  return (await api.post(base, body)).data as Collection;
}
export async function updateCollection(id: string, body: { slug: string; name: Local; fields: CollectionField[] }) {
  return (await api.put(`${base}/${id}`, body)).data as Collection;
}
export async function deleteCollection(id: string) {
  await api.delete(`${base}/${id}`);
}
export async function listItems(id: string) {
  return (await api.get(`${base}/${id}/items`)).data as CollectionItem[];
}
export async function createItem(id: string, body: { slug: string; data: Record<string, unknown>; status?: ItemStatus }) {
  return (await api.post(`${base}/${id}/items`, body)).data as CollectionItem;
}
export async function updateItem(id: string, itemId: string, body: Partial<{ slug: string; data: Record<string, unknown>; status: ItemStatus; sort: number }>) {
  return (await api.put(`${base}/${id}/items/${itemId}`, body)).data as CollectionItem;
}
export async function deleteItem(id: string, itemId: string) {
  await api.delete(`${base}/${id}/items/${itemId}`);
}
/** The store's product or category page design (made once); its page id, to open in the editor. */
export async function storeTemplate(kind: "product" | "category") {
  return (await api.post(`${base}/store-template/${kind}`)).data as { id: string };
}
/** The collection's item page (made once, with every field connected); its page id, to open in the editor. */
export async function collectionTemplate(id: string) {
  return (await api.post(`${base}/${id}/template`)).data as { id: string };
}
