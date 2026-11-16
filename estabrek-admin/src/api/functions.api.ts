// Functions from the admin's side (admin → الـ Functions; backend lib/fnDef.ts,
// modules/functions/functions.service.ts, modules/admin/functions.controller.ts): logic the owner
// builds from steps, tries dry, publishes and runs.
import { api } from "./http";

export type Val = string | number | boolean | null | Val[] | { [key: string]: Val };
export type Cmp = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "notContains" | "in" | "notIn" | "empty" | "notEmpty";
export type Cond = { left: Val; cmp: Cmp; right?: Val };
export type Match = "all" | "any";
export type Op = "contains" | "notContains" | "is" | "isNot" | "startsWith" | "endsWith" | "empty" | "notEmpty" | "gt" | "gte" | "lt" | "lte" | "between" | "anyOf" | "isTrue" | "isFalse";
export type Filter = { field: string; op: Op; value?: Val; value2?: Val };
export type RowStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type PlainStep =
  | { act: "find"; table: string; filters?: Filter[]; match?: Match; sort?: Array<{ field: string; dir?: "asc" | "desc" }>; view?: "all" | "draft" | "published" | "archived"; limit?: number; as: string }
  | { act: "get"; table: string; row: Val; as: string }
  | { act: "add"; table: string; values: Record<string, Val>; status?: RowStatus; /** The shopper whose row it is (their id, or {{caller}}). */ owner?: Val; as?: string }
  | { act: "change"; table: string; row: Val; values: Record<string, Val>; status?: RowStatus; as?: string }
  | { act: "delete"; table: string; row: Val }
  | { act: "set"; name: string; op?: "set" | "add" | "multiply" | "append"; value: Val }
  | { act: "email"; to?: string; subject: string; text: string }
  | { act: "whatsapp"; to?: string; text: string }
  | { act: "sms"; to?: string; text: string }
  | { act: "notify"; title: string; text?: string; link?: string }
  | { act: "call"; fn: string; input?: Record<string, Val>; as?: string }
  | { act: "stop"; message: string }
  | { act: "return"; value?: Val };
export type GroupStep = { act: "if"; if: Cond[]; match?: Match; do: Step[]; else?: Step[] } | { act: "each"; list: string; as?: string; do: Step[] };
export type Step = PlainStep | GroupStep;
export type StepKind = Step["act"];

export type InputType = "text" | "number" | "bool" | "list" | "any";
export type FnInput = { name: string; type: InputType; required?: boolean; note?: string };
export type FnDef = { lang?: "ar" | "en" | "he"; inputs: FnInput[]; if?: Cond[]; match?: Match; do: Step[]; else?: Step[]; fail?: PlainStep[] };

export type FnLite = {
  id: string;
  name: string;
  note: string | null;
  enabled: boolean;
  published: boolean;
  publishedAt: string | null;
  /** The draft isn't what runs. */
  changed: boolean;
  steps: number;
  inputs: number;
  /** What the published one is handed (for a function that calls it). */
  takes: FnInput[];
  /** Its call addresses (a shop page's button runs it through one), and who may call each. */
  calls?: Array<{ address: string; who: "customer" | "key" | "public" }>;
  runs: number;
  lastRunAt: string | null;
  updatedAt: string;
};
/** Where a problem is ("do.2", "do.2.else.0", "if.0", "fail.1") and what it is. */
export type Problem = { at: string; message: string };
export type FnFull = FnLite & { draft: FnDef; live: FnDef | null; problems: Problem[]; triggers: FnTrigger[]; /** The feature it is part of (admin → ميزاتي); one that is off keeps it from being started. */ feature?: { id: string; name: string; enabled: boolean } | null };

/** What starts a function (backend lib/fnTriggers.ts). It fires only while the function is published and switched on. */
export type TriggerKind = "row" | "schedule" | "event" | "call" | "webhook";
export type FnTrigger = {
  id: string;
  kind: TriggerKind;
  /** row: { table, on }; schedule: { everyMinutes } or { at: "HH:MM" }; event: { event }; call: { who, perMinute? }; webhook: {} */
  config: Record<string, unknown>;
  /** A call's address (the owner's word). */
  slug: string | null;
  /** "/v1/fn/<address>" or "/v1/hooks/<secret>"; a webhook's is null for a member who can only look. */
  address: string | null;
  enabled: boolean;
  fired: number;
  lastAt: string | null;
  nextAt: string | null;
  /** What it hands the function (the function takes the ones it has an input for). */
  hands: string[];
};
export type TriggerMeta = { kinds: TriggerKind[]; events: string[]; callPerMinute: Record<string, number>; limits: { perFunction: number; everyMinutes: { min: number; max: number } } };

type Local = Partial<Record<"ar" | "en" | "he", string>>;
export type FnField = { id: string; type: string; name: Local | null; required: boolean; options?: Array<{ id: string; name: Local | null }> };
export type FnTable = { id: string; slug: string; name: Local | null; fields: FnField[] };
export type FnLimits = { steps: number; depth: number; conditions: number; inputs: number; values: number; text: number; found: number; loop: number; executed: number; writes: number; messages: number; calls: number; ms: number };
export type FnList = { functions: FnLite[]; tables: FnTable[]; ops: Record<string, Op[]>; cmps: Cmp[]; limits: FnLimits; triggers: TriggerMeta };

export type TraceLine = { at: string; act: StepKind; ok: boolean; ms: number; note?: string; say?: [string, ...Array<string | number>]; error?: string };
export type Outcome = { ok: boolean; dry: boolean; value: unknown; valueCut?: boolean; error: string | null; failedAt: string | null; trace: TraceLine[]; counts: { steps: number; found: number; added: number; changed: number; deleted: number; sent: number }; ms: number };

const BASE = "/admin/functions";
const at = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

export async function getFunctions() {
  return (await api.get(BASE)).data as FnList;
}
export async function getFunction(id: string) {
  return (await api.get(at(id))).data as FnFull;
}
export async function createFunction(body: { name: string; note?: string }) {
  return (await api.post(BASE, body)).data as FnFull;
}
/** The draft is checked for its shape; what it talks about (tables, fields, names) comes back as `problems`. */
export async function saveFunction(id: string, body: { name?: string; note?: string | null; enabled?: boolean; draft?: FnDef }) {
  return (await api.put(at(id), body)).data as FnFull;
}
/** The draft becomes what runs. Refused (409 FN_HAS_PROBLEMS) while it has problems. */
export async function publishFunction(id: string) {
  return (await api.post(`${at(id)}/publish`)).data as FnFull;
}
/** Run it now. `dry`: nothing is written or sent. The draft runs dry only. */
export async function runFunction(id: string, body: { input: Record<string, unknown>; dry: boolean; which: "draft" | "live" }) {
  return (await api.post(`${at(id)}/run`, body)).data as Outcome;
}
export async function deleteFunction(id: string) {
  return (await api.delete(at(id))).data as { ok: true };
}

/* What starts it. Each call answers the function as it now is. */
export async function addTrigger(id: string, body: { kind: TriggerKind; config: Record<string, unknown>; slug?: string }) {
  return (await api.post(`${at(id)}/triggers`, body)).data as FnFull;
}
export async function saveTrigger(id: string, triggerId: string, body: { config?: Record<string, unknown>; slug?: string; enabled?: boolean }) {
  return (await api.put(`${at(id)}/triggers/${encodeURIComponent(triggerId)}`, body)).data as FnFull;
}
export async function deleteTrigger(id: string, triggerId: string) {
  return (await api.delete(`${at(id)}/triggers/${encodeURIComponent(triggerId)}`)).data as FnFull;
}
