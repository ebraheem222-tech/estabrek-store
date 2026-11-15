// The run log (admin → سجل التشغيل; backend lib/runs.ts, modules/admin/runs.controller.ts):
// everything the server did by itself, kept through restarts.
import { api } from "./http";

export type RunKind = "job" | "automation" | "webhook" | "task" | "function";
export type Run = {
  id: string;
  kind: RunKind;
  /** Which one: the job's name, the rule's name, the webhook's address. */
  name: string;
  ref: string | null;
  /** "start" | "schedule" | "event" | "admin" | "test", a rule's trigger, a request's method. */
  trigger: string | null;
  subject: string | null;
  startedAt: string;
  /** A folded row (a job's quiet timer runs of one hour): when the last of them started. */
  lastAt: string | null;
  /** How many runs this row stands for. */
  times: number;
  /** How long it took (a folded row: all its runs together). */
  ms: number;
  ok: boolean;
  /** Counts ({ sent: 3 }) or a few words ({ did: "…" }). */
  result: Record<string, unknown> | null;
  error: string | null;
};
export type RunsSummary = {
  since: string;
  /** The log's own first row: how far back it goes. */
  from: string | null;
  keepDays: number;
  runs: number;
  failures: number;
  kinds: Partial<Record<RunKind, { runs: number; failures: number }>>;
  failing: Array<{ kind: RunKind; name: string; failures: number; lastAt: string | null; error: string | null }>;
};
export type RunsPage = { now: number; runs: Run[]; /** Ask for the page after with `before`. */ next: string | null; summary?: RunsSummary };
export type RunsQuery = { kind?: RunKind; name?: string; ok?: boolean; before?: string; limit?: number };

export async function getRuns(q: RunsQuery = {}) {
  const params = { ...(q.kind ? { kind: q.kind } : {}), ...(q.name ? { name: q.name } : {}), ...(q.ok === undefined ? {} : { ok: String(q.ok) }), ...(q.before ? { before: q.before } : {}), ...(q.limit ? { limit: q.limit } : {}) };
  return (await api.get("/admin/system/runs", { params })).data as RunsPage;
}
