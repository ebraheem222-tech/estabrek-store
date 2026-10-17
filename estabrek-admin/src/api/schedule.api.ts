// The timeline: changes set for later (admin → الجدول الزمني).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import type { StorefrontMotion, CacheNamespaceName } from "./cache.api";
import type { Campaign } from "./selling.api";

export type ScheduleKind = "theme" | "motion" | "maintenance" | "announcement" | "section" | "cachePurge";
export type ScheduleStatus = "scheduled" | "applied" | "done" | "undone" | "canceled" | "failed";

export type ScheduledChange = {
  id: string;
  kind: ScheduleKind;
  title: string;
  payload: Record<string, unknown>;
  runAt: string;
  undoAt: string | null;
  status: ScheduleStatus;
  before: Record<string, unknown> | null;
  appliedAt: string | null;
  undoneAt: string | null;
  note: string | null;
};

export type ScheduleInput = { kind: ScheduleKind; title: string; payload: Record<string, unknown>; runAt: string; undoAt: string | null };

export type ScheduleOptions = {
  sections: Array<{ id: string; type: string; title: string | null; isVisible: boolean; page: { id: string; name: string; slug: string } }>;
  namespaces: CacheNamespaceName[];
  now: {
    theme: string | null;
    maintenance: { on: boolean; message: string | null };
    announcement: { on: boolean; text: string | null; link: string | null };
    motion: StorefrontMotion;
  };
};

export type PreviewLine = { key: string; from: unknown; to: unknown; label?: string };

const S = ENDPOINTS.admin.schedule;

export async function getSchedule() {
  return (await api.get(S.base)).data as { changes: ScheduledChange[]; campaigns: Campaign[]; now: number; maxDays: number };
}
export async function getScheduleOptions() {
  return (await api.get(S.options)).data as ScheduleOptions;
}
export async function previewSchedule(kind: ScheduleKind, payload: Record<string, unknown>) {
  return (await api.post(S.preview, { kind, payload })).data as { lines: PreviewLine[] };
}
export async function createSchedule(body: ScheduleInput) {
  return (await api.post(S.base, body)).data as { change: ScheduledChange };
}
export async function updateSchedule(id: string, body: ScheduleInput) {
  return (await api.patch(S.one(id), body)).data as { change: ScheduledChange };
}
export async function cancelSchedule(id: string) {
  return (await api.post(S.cancel(id), {})).data as { change: ScheduledChange };
}
export async function runScheduleNow(id: string) {
  return (await api.post(S.run(id), {})).data as { change: ScheduledChange };
}
export async function undoSchedule(id: string) {
  return (await api.post(S.undo(id), {})).data as { change: ScheduledChange };
}
