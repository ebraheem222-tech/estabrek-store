// Content collections (W3; backend lib/collections.ts): collections, their fields and items, and each one's item page.
import { api } from "./http";

export type Local = Partial<Record<"ar" | "en" | "he", string>>;
/** The kinds of field (backend lib/collectionTree.ts FIELD_TYPES). */
export type FieldType = "text" | "longText" | "image" | "number" | "date" | "link" | "boolean" | "select" | "color" | "email" | "phone" | "datetime" | "money" | "multiSelect" | "file" | "video" | "model3d" | "json" | "location" | "relation";
/** What happens to the rows that link a row when it is deleted (backend lib/links.ts). */
export type OnDelete = "unlink" | "cascade" | "restrict";
/** A linked row as the routes answer it under a relation field. */
export type Linked = { id: string; slug: string; status?: ItemStatus; title: Local | null };
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
  /** Money: its currency, three letters (ILS when not said). */
  currency?: string;
  /** A relation: the table whose rows it links (that table's id; it may be its own). */
  to?: string;
  /** A relation: a row may link several rows (else one). */
  many?: boolean;
  /** A relation: a row there is linked from one row at most. */
  exclusive?: boolean;
  /** A relation: what deleting a linked row does to the rows linking it (unlink when not said). */
  onDelete?: OnDelete;
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
/** What a change of fields does to the rows that are there, for one changed field (backend lib/schemaChange.ts). */
export type Impact = {
  field: string;
  change: "removed" | "retyped" | "ruled" | "added";
  from?: FieldType;
  to?: FieldType;
  /** Rows that hold a value there. */
  rows: number;
  converted: number;
  /** Values that don't fit the new kind: put aside, hidden. */
  lost: number;
  /** A removed field's values: kept in the rows, hidden. */
  hidden: number;
  /** Values that don't pass the new rules or choices (left as they are). */
  failing: number;
  missing: number;
  doubles: number;
  samples: Array<{ slug: string; value: string; why: string }>;
};
export type SchemaPreview = { changes: Impact[]; needsAccept: boolean };
/** A table's fields before one of its changes. */
export type TableVersion = { id: string; createdAt: string; who: string | null; fields: Array<Pick<CollectionField, "id" | "type" | "name">>; changes: Impact[] };
type TableBody = { slug: string; name: Local; fields: CollectionField[] };

/** Saves the table. A change that would put values aside is refused (409, with what it would do) unless `accept`. */
export async function updateCollection(id: string, body: TableBody, accept = false) {
  return (await api.put(`${base}/${id}`, accept ? { ...body, accept: true } : body)).data as Collection & { changes?: Impact[] };
}
/** What saving these fields would do to the rows. Nothing is written. */
export async function previewFields(id: string, body: TableBody) {
  return (await api.post(`${base}/${id}/fields/preview`, body)).data as SchemaPreview;
}
export async function listVersions(id: string) {
  const data = (await api.get(`${base}/${id}/revisions`)).data;
  return (Array.isArray(data) ? data : []) as TableVersion[];
}
export async function previewVersion(id: string, version: string) {
  return (await api.post(`${base}/${id}/revisions/${version}/preview`, {})).data as SchemaPreview;
}
export async function restoreVersion(id: string, version: string, accept = false) {
  return (await api.post(`${base}/${id}/revisions/${version}/restore`, accept ? { accept: true } : {})).data as Collection & { changes?: Impact[] };
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
