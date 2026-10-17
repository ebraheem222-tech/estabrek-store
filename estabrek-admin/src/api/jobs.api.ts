// Background jobs (admin → المهام بالخلفية).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type JobTrigger = "start" | "schedule" | "event" | "admin";
export type JobGroup = "messages" | "data" | "cache" | "media" | "selling" | "control";
export type JobStatus = "running" | "waiting" | "paused" | "off" | "onDemand";

export type JobRun = { at: string; ms: number; ok: boolean; trigger: JobTrigger; counts: Record<string, number> | null; error: string | null };

export type Job = {
  name: string;
  group: JobGroup;
  status: JobStatus;
  /** The timer in force (the admin's or the server's); null = only on events. */
  everyMs: number | null;
  defaultEveryMs: number | null;
  limits: { min: number; max: number } | null;
  firstMs: number | null;
  /** Off by the server's settings: the env name. */
  off: string | null;
  paused: boolean;
  canPause: boolean;
  canRunNow: boolean;
  runningSince: string | null;
  stuck: boolean;
  late: boolean;
  nextAt: string | null;
  lastOkAt: string | null;
  lastError: { at: string; message: string } | null;
  failuresInRow: number;
  total: { runs: number; failures: number; avgMs: number };
  runs: JobRun[];
  live: Record<string, number> | null;
};

export type JobsPage = { now: number; since: string; scheduling: boolean; jobs: Job[]; updatedAt?: string | null };

export type JobsPatch = { jobs: Record<string, { paused?: boolean; everyMs?: number | null }> };

const J = ENDPOINTS.admin.systemJobs;

export async function getJobs() {
  return (await api.get(J.base)).data as JobsPage;
}

export async function saveJobs(patch: JobsPatch) {
  return (await api.patch(J.base, patch)).data as JobsPage & { changed: string[] };
}

export async function runJob(name: string) {
  return (await api.post(J.run(name), {})).data as JobsPage & { started: boolean; busy: boolean; run: JobRun | null };
}
