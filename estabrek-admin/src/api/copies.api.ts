// نسخ الزباين from the admin's side (backend modules/admin/copies.controller.ts, lib/press.ts): a client's copy of
// the store, made in the owner's own Neon, Railway, Vercel and Cloudflare accounts through their ready connections.
// Planned and checked first (nothing made), then made when the owner says so: the server goes on by itself and the
// page follows it step by step.
import { api } from "./http";

export type PressKind = "neon" | "railway" | "vercel" | "cloudflare";
export const PRESS_KINDS: PressKind[] = ["neon", "railway", "vercel", "cloudflare"];
export type CopiesView = {
  /** Each kind's connections to pick from (never a key). */
  connections: Record<PressKind, Array<{ id: string; name: string }>>;
  /** What this store is built from (a copy is built from the same); null when the server doesn't know. */
  repo: { repo: string; branch: string } | null;
  regions: string[];
  limits: { label: number; name: { min: number; max: number } };
};
/** Where a variable's value comes from: shown (fixed, an address), or a secret never shown. */
export type CopyVar = { name: string; from: "fixed" | "url" | "made" | "shared" | "neon"; value?: string };
export type PlanStep = { id: PressKind | "owner"; facts: Array<[string, string]>; variables?: CopyVar[] };
export type CopyCheck = { id: string; kind: PressKind; ok: boolean; why: string | null };
export type CopyInput = { label: string; server: string; site: string; repo: string; branch: string; region: string };
export type CopyPlan = { input: CopyInput; via: Partial<Record<PressKind, string>>; urls: { api: string; shop: string; admin: string }; steps: PlanStep[]; checks: CopyCheck[]; ready: boolean };
export type PlanAsk = { label: string; server: string; site: string; repo?: string; branch?: string; region?: string; via?: Partial<Record<PressKind, string>> };

const BASE = "/admin/system/copies";

export async function getCopies() {
  return (await api.get(BASE)).data as CopiesView;
}
/** What making the copy will do, and each service asked whether what it needs is there. Nothing is made. */
export async function planCopy(body: PlanAsk) {
  return (await api.post(`${BASE}/plan`, body)).data as CopyPlan;
}

/** One step of the making, as the server keeps it ("failed" with the service's own words). */
export type MakeStep = { id: string; kind: PressKind; state: "waiting" | "doing" | "done" | "failed"; why: string | null; at: string | null };
export type CopyState = "making" | "stopped" | "made";
export type CopyView = {
  id: string;
  label: string;
  server: string;
  site: string;
  repo: string;
  branch: string;
  region: string;
  state: CopyState;
  steps: MakeStep[];
  addresses: { api: string; shop: string; admin: string };
  /** Where each made part is seen at its service. */
  links: Partial<Record<PressKind, string>>;
  by: string | null;
  began: string;
  updated: string;
  /** Its owner's setup link: once it is made, on its own page only. */
  welcome: string | null;
};
export type Alive = { api: { ok: boolean; status: number }; shop: { ok: boolean; status: number }; admin: { ok: boolean; status: number }; waiting: boolean | null };

/** The copy made (202: it goes on by itself). Asked again first: a service that says no now stops it before anything is made. */
export async function makeCopy(body: PlanAsk) {
  return (await api.post(`${BASE}/make`, { ...body, agree: true })).data as CopyView;
}
export async function listCopies() {
  return ((await api.get(`${BASE}/made`)).data as { copies: CopyView[] }).copies;
}
export async function getCopy(id: string) {
  return (await api.get(`${BASE}/made/${encodeURIComponent(id)}`)).data as CopyView;
}
/** A copy that stopped, made again from the step that said no. */
export async function copyAgain(id: string) {
  return (await api.post(`${BASE}/made/${encodeURIComponent(id)}/again`)).data as CopyView;
}
/** Whether its server, shop and admin answer yet, and whether its owner has yet to come in. */
export async function copyAlive(id: string) {
  return (await api.get(`${BASE}/made/${encodeURIComponent(id)}/alive`)).data as Alive;
}
