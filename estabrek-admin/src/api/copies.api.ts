// نسخ الزباين from the admin's side (backend modules/admin/copies.controller.ts, lib/press.ts): a client's copy of
// the store, made in the owner's own Neon, Railway, Vercel and Cloudflare accounts through their ready connections.
// For now it is planned and checked: nothing is made.
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
