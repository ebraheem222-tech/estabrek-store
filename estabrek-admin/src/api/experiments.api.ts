// A/B tests (admin → تجارب A/B).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import type { StorefrontMotion } from "./cache.api";

export type ExperimentKind = "heroOpening" | "motion";
export type ExperimentStatus = "draft" | "running" | "stopped";
export type Verdict = "early" | "A" | "B" | "same";

export type Comparison = { rateA: number; rateB: number; lift: number | null; confidence: number; verdict: Verdict; moreVisits: number | null };
export type SideTotals = { visits: number; bags: number; orders: number; revenue: number };

export type Experiment = {
  id: string;
  name: string;
  kind: ExperimentKind;
  field: string | null;
  a: unknown;
  b: unknown;
  split: number;
  status: ExperimentStatus;
  startedAt: string | null;
  stoppedAt: string | null;
  winner: "A" | "B" | null;
  createdAt: string;
  results: { a: SideTotals; b: SideTotals; bags: Comparison; orders: Comparison; revenuePerVisit: { a: number; b: number } };
  days: Array<{ day: string; variant: string } & SideTotals>;
};

export type ExperimentsPage = {
  experiments: Experiment[];
  motionFields: string[];
  currentMotion: StorefrontMotion | null;
  collected: { events: number; bots: number; repeats: number; unknown: number; waiting: number };
  now: number;
};

export type ExperimentInput = { name: string; kind: ExperimentKind; field: string | null; a: unknown; b: unknown; split: number };

const E = ENDPOINTS.admin.experiments;

export async function getExperiments() {
  return (await api.get(E.base)).data as ExperimentsPage;
}
export async function createExperiment(body: ExperimentInput) {
  return (await api.post(E.base, body)).data as { experiment: Experiment };
}
export async function updateExperiment(id: string, body: ExperimentInput) {
  return (await api.patch(E.one(id), body)).data as { experiment: Experiment };
}
export async function startExperiment(id: string) {
  return (await api.post(E.start(id), {})).data as { experiment: Experiment };
}
export async function stopExperiment(id: string) {
  return (await api.post(E.stop(id), {})).data as { experiment: Experiment };
}
export async function keepWinner(id: string, winner: "A" | "B") {
  return (await api.post(E.keep(id), { winner })).data as { experiment: Experiment };
}
export async function deleteExperiment(id: string) {
  return (await api.delete(E.one(id))).data as { ok: true };
}
