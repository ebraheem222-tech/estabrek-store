// Deploy watch (admin → حالة السيرفر): which commit runs on the server, the branch's
// last one, and whether a deployment is waiting, late or failed.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import type { Action } from "./automations.api";
import type { JobStatus } from "./jobs.api";

export type DeployState = "current" | "deploying" | "late" | "failed" | "unknown";
export type DeployReason = "noCommit" | "noRepo" | "cantReach" | "notChecked";

export type DeployPage = {
  now: number;
  state: DeployState;
  reason: DeployReason | null;
  live: { commit: string | null; message: string | null; branch: string; repo: string | null; deploymentId: string | null; startedAt: string };
  /** The branch's last commit; `since` = how long it has been waiting (as far as known). */
  latest: { commit: string; message: string | null; at: string | null; seenAt: string; since: string } | null;
  /** The host's mark on GitHub for the waiting commit's deployment ("in_progress", "failure"…). */
  mark: string | null;
  lateAfterMinutes: number;
  checkedAt: string | null;
  /** Why the last look couldn't tell. */
  error: string | null;
  /** The bell and the rules already heard about the waiting commit. */
  told: boolean;
  watch: { status: JobStatus; everyMs: number | null; nextAt: string | null; off: string | null; failuresInRow: number } | null;
  /** The owner's rules for "deploy.failed", on top of the bell. */
  rules: Array<{ id: string; name: string; action: Action; enabled: boolean }>;
  channels: { email: boolean; outboxWorker: boolean };
};

const D = ENDPOINTS.admin.systemDeploy;

export async function getDeploy() {
  return (await api.get(D.base)).data as DeployPage;
}

export async function checkDeploy() {
  return (await api.post(D.check, {})).data as DeployPage & { ran: boolean; busy: boolean };
}
