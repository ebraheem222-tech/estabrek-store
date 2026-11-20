// The project as one file (stage 3; backend lib/projectFile.ts, lib/projectSync.ts, modules/admin/project.controller.ts):
// the whole project (tables, functions, pages, roles, groups, features; never a table's rows) written out as a
// file, brought in from one with a look first, and kept as saved copies to go back to. The owner's alone.
import { api } from "./http";
import { adminLang } from "../lib/lang";

const BASE = "/admin/system/project";

export type ProjectSize = { tables: number; functions: number; pages: number; roles: number; groups: number; features: number };
export type SnapshotReason = "saved" | "before" | "back";
export type Snapshot = { id: string; label: string; reason: SnapshotReason; size: ProjectSize; bytes: number; byEmail: string | null; createdAt: string };
export type ProjectView = { size: ProjectSize; snapshots: Snapshot[]; limits: { bytes: number; snapshots: number } };

export type DiffKind = "table" | "function" | "page" | "role" | "group" | "feature";
export type DiffAction = "add" | "change" | "same" | "only" | "clash";
/** What a field change does to a table's rows (backend lib/schemaChange.ts Impact). */
export type Impact = { field: string; change: "removed" | "retyped" | "ruled" | "added"; rows: number; converted: number; lost: number; hidden: number; failing: number; missing: number; doubles: number };
export type DiffItem = {
  /** "table:<id>"… what is ticked to go, or accepted. */
  ref: string;
  kind: DiffKind;
  id: string;
  name: string;
  action: DiffAction;
  parts?: string[];
  fields?: { added: string[]; removed: string[]; changed: string[] };
  clash?: { what: "slug" | "address" | "name"; word: string; by: string };
  /** Only here: ticked to go. */
  going?: boolean;
  /** A table only here: its rows (they go with it). */
  rows?: number;
  impacts?: Impact[];
};
export type Problem = { at: string; message: string };
export type ProjectPreview = {
  ok: boolean;
  project?: { name: string | null; exportedAt: string | null; size: ProjectSize };
  items: DiffItem[];
  counts?: Record<DiffAction, number>;
  waits: Array<{ ref: string; name: string; impacts: Impact[] }>;
  problems: Problem[];
  needs?: { secrets: Array<{ name: string; kept: boolean }>; sites: Array<{ host: string; allowed: boolean }>; connections: Array<{ id: string; name: string; kind: string; here: boolean }> };
  /** Going back to a saved copy: what is only here and would go (a table with rows stays unless ticked). */
  suggested?: string[];
};
export type Ticks = { remove?: string[]; accept?: string[] };
export type Applied = { counts: Record<DiffAction, number>; snapshot: Snapshot | null; made: number; changed: number; removed: number };

export async function getProject() {
  return (await api.get(BASE)).data as ProjectView;
}
/** The project as a file, to save on this computer. */
export async function downloadProject(snapshotId?: string) {
  const res = await api.get(snapshotId ? `${BASE}/snapshots/${encodeURIComponent(snapshotId)}/file` : `${BASE}/file`, { responseType: "blob", timeout: 120_000 });
  const name = /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1] ?? "estabrek-project.json";
  return { blob: res.data as Blob, name };
}
export async function previewProject(file: unknown, ticks: Ticks = {}) {
  // Names (a table's, a field's) are said in the admin's language.
  return (await api.post(`${BASE}/preview`, { file, ...ticks, lang: adminLang() }, { timeout: 120_000 })).data as ProjectPreview;
}
/** `label`: the name of the copy of the project kept first. */
export async function applyProject(file: unknown, ticks: Ticks = {}, label?: string) {
  return (await api.post(`${BASE}/apply`, { file, ...ticks, lang: adminLang(), ...(label ? { label: label.slice(0, 120) } : {}) }, { timeout: 180_000 })).data as Applied;
}
export async function saveSnapshot(label: string) {
  return (await api.post(`${BASE}/snapshots`, { label })).data as Snapshot;
}
export async function previewBack(id: string, ticks: Ticks = {}) {
  return (await api.post(`${BASE}/snapshots/${encodeURIComponent(id)}/preview`, { ...ticks, lang: adminLang() }, { timeout: 120_000 })).data as ProjectPreview;
}
export async function goBack(id: string, ticks: Ticks = {}, label?: string) {
  return (await api.post(`${BASE}/snapshots/${encodeURIComponent(id)}/back`, { ...ticks, lang: adminLang(), ...(label ? { label: label.slice(0, 120) } : {}) }, { timeout: 180_000 })).data as Applied;
}
export async function deleteSnapshot(id: string) {
  await api.delete(`${BASE}/snapshots/${encodeURIComponent(id)}`);
}
