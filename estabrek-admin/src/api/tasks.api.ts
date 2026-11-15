// The queue (admin → صف الشغل; backend lib/tasks.ts, modules/admin/tasks.controller.ts):
// background work that must not be lost. A task is kept until it is done; one that fails is
// tried again after a growing wait; one that keeps failing is set aside for the owner.
import { api } from "./http";

export type TaskStatus = "waiting" | "running" | "done" | "failed" | "cancelled";
export type Task = {
  id: string;
  /** Which work ("automation"…). */
  kind: string;
  /** "Once only": the same key is the same task. */
  key: string | null;
  status: TaskStatus;
  /** How many tries so far, and after how many it is set aside. */
  attempts: number;
  maxAttempts: number;
  /** Not before this (a retry waits longer each time). */
  runAt: string;
  lockedAt: string | null;
  lastError: string | null;
  result: Record<string, unknown> | null;
  createdAt: string;
  finishedAt: string | null;
};
export type TasksPage = {
  now: number;
  counts: Record<TaskStatus, number>;
  doneToday: number;
  /** Since when the one that has waited longest (its time has come) waits. */
  waitingSince: string | null;
  /** The kinds this server does. */
  kinds: string[];
  keepDays: { done: number; failed: number };
  tasks: Task[];
  /** Ask for the page after with `before`. */
  next: string | null;
};
export type TasksQuery = { status?: TaskStatus; kind?: string; before?: string; limit?: number };

export async function getTasks(q: TasksQuery = {}) {
  const params = { ...(q.status ? { status: q.status } : {}), ...(q.kind ? { kind: q.kind } : {}), ...(q.before ? { before: q.before } : {}), ...(q.limit ? { limit: q.limit } : {}) };
  return (await api.get("/admin/system/tasks", { params })).data as TasksPage;
}

/** One that was set aside (or dismissed) waits its turn again, its tries starting over. */
export async function retryTask(id: string) {
  return (await api.post(`/admin/system/tasks/${encodeURIComponent(id)}/retry`)).data as { ok: true };
}

/** One that waits or was set aside is dismissed: it won't be tried. */
export async function cancelTask(id: string) {
  return (await api.post(`/admin/system/tasks/${encodeURIComponent(id)}/cancel`)).data as { ok: true };
}
