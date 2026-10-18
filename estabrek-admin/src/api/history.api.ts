// One history for everything (admin → السجل).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type HistoryArea = "settings" | "speed" | "security" | "pages" | "products" | "stock" | "prices" | "schedule";

export type HistoryEntry = {
  area: HistoryArea;
  id: string;
  at: string;
  who: string | null;
  title: string | null;
  what: string[];
  detail: Record<string, unknown> | null;
  /** "before": back to before this change; "undo": undo it; null: not from here. */
  restore: "before" | "undo" | null;
  done: boolean;
  link: string | null;
};

export type HistoryPage = { entries: HistoryEntry[]; areas: HistoryArea[]; from: string; to: string; canRestore: Partial<Record<HistoryArea, boolean>> };

export async function getHistory(q: { from: string; to: string; area?: HistoryArea | null }) {
  const params: Record<string, string> = { from: q.from, to: q.to };
  if (q.area) params.area = q.area;
  return (await api.get(ENDPOINTS.admin.history.base, { params })).data as HistoryPage;
}

export async function restoreHistory(area: HistoryArea, id: string) {
  return (await api.post(ENDPOINTS.admin.history.restore, { area, id })).data as { ok: boolean; note: string | null };
}
