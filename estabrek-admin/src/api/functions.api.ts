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
  /** A notification on shoppers' phones (الإعدادات → التطبيق → الإشعارات): everyone, the signed-in ones, or one customer (their id or email). */
  | { act: "push"; who: "all" | "customers" | "customer"; to?: string; title: string; text?: string; link?: string }
  | { act: "call"; fn: string; input?: Record<string, Val>; as?: string }
  /** JavaScript run in a cage on the server: handed `give` (read as input.name), it gives one value back. */
  | { act: "code"; code: string; give?: Record<string, Val>; as?: string }
  /** A call to a site the owner allowed (admin → الاتصالات والأسرار); a secret is named {{secret.NAME}} and never read. */
  | { act: "http"; method: HttpMethod; url: string; headers?: Record<string, string>; body?: Val; /** A site's "no" (400 and up) doesn't stop the run. */ anyStatus?: boolean; as?: string }
  /** Through a ready connection (admin → الاتصالات والأسرار): which, what it does there, and what that asks for. No address or key is written. */
  | { act: "ready"; via: string; what: string; give?: Record<string, string>; as?: string }
  /** A discount code (admin → الكوبونات): its code (empty: one is made up), a percent or an amount off, uses, days, one phone only. */
  | { act: "coupon"; code?: string; off: CouponOff; value: Val; max?: Val; minCart?: Val; uses?: Val; days?: Val; phone?: string; note?: string; as?: string }
  /** A piece's quantity (admin → المخزون), by its SKU: more, fewer, or exactly so many. */
  | { act: "stock"; sku: string; how: StockHow; amount: Val; reason?: string; as?: string }
  /** A shopper (their id or email): only read, or a role given / taken, or a group joined / left. */
  | { act: "customer"; who: string; mark: CustomerMark; what?: string; as?: string }
  /** A payment asked for (الدفعات المطلوبة): paid on the shop's own page with Stripe or PayPal; once paid, the "payment.paid" event starts functions with its `ref`. */
  | { act: "pay"; title: string; amount: Val; ref?: string; email?: string; phone?: string; days?: Val; back?: string; as?: string }
  | { act: "stop"; message: string }
  | { act: "return"; value?: Val };
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
/** A coupon's discount; a piece's quantity; what a step does to a customer (the lists are in features/functions/fnDraft.ts). */
export type CouponOff = "percent" | "amount";
export type StockHow = "add" | "take" | "set";
export type CustomerMark = "read" | "giveRole" | "takeRole" | "join" | "leave";
/** What the store steps pick from (the shoppers' roles and groups), their limits, and what each needs to be published. */
export type StoreMeta = {
  roles: Array<{ key: string; name: Partial<Record<"ar" | "en" | "he", string>> | null }>;
  groups: Array<{ id: string; name: string }>;
  limits?: { money: number; uses: number; days: number; quantity: number };
  rights?: { coupon: string; stock: string; customer: string; customerRead: string };
};
/** What an "http" step may reach: the allowed sites, and each secret's name with the sites it is for (never a value). */
export type Outside = {
  sites: string[];
  secrets: Array<{ name: string; sites: string[] }>;
  /** The ready connections a step may pick: which settings each holds (never their values, nor a key). */
  ready?: Array<{ id: string; name: string; kind: string; set: string[] }>;
  /** What each kind of ready connection can do, and what that asks for. */
  kinds?: Array<{ kind: string; label: string; actions: Array<{ id: string; fields: Array<{ id: string; required: boolean; long: boolean; or?: string }> }> }>;
};
export type GroupStep = { act: "if"; if: Cond[]; match?: Match; do: Step[]; else?: Step[] } | { act: "each"; list: string; as?: string; do: Step[] };
export type Step = PlainStep | GroupStep;
export type StepKind = Step["act"];

export type InputType = "text" | "number" | "bool" | "list" | "any";
export type InputFormat = "email" | "phone" | "url" | "date";
/** One thing a function is handed, with its rules (backend lib/fnInputs.ts): a number's least and most; words' letters, choices or format; a list's count. */
export type FnInput = { name: string; type: InputType; required?: boolean; note?: string; min?: number; max?: number; choices?: string[]; format?: InputFormat };
/** What a function promises to give back (backend lib/fnGives.ts): the kind of its answer, and the fields of a thing (or of each thing in a list). */
export type GiveType = "any" | "text" | "number" | "bool" | "list" | "thing";
export type GiveField = { name: string; type: GiveType; /** It is always there. */ required?: boolean };
export type Gives = { type: GiveType; fields?: GiveField[] };
export type FnDef = { lang?: "ar" | "en" | "he"; inputs: FnInput[]; if?: Cond[]; match?: Match; do: Step[]; else?: Step[]; fail?: PlainStep[]; gives?: Gives };

/** One of a function's own tests (F4): what it is handed, and what must come of it. */
export type FnTest = { id: string; name: string; input: Record<string, unknown>; /** Who it is run as, where the steps name the caller. */ caller?: { name?: string; email?: string }; expect: { /** It goes through; or it stops. */ ok: boolean; /** Going through: what it gives back, exactly. */ value?: unknown; /** Stopping: words its reason holds. */ error?: string } };
export type TestWhy = "stopped" | "wentThrough" | "value" | "reason" | "time" | "shape";
/** How a test went: whether it passed (else why not), and what the run it made came to. */
export type TestResult = { id: string; name: string; pass: boolean; why: TestWhy | null; /** With "shape": how the answer differs from what the function promises. */ said?: string; ok: boolean; value: unknown; valueCut?: boolean; error: string | null; failedAt: string | null; ms: number };
export type TestsOutcome = { results: TestResult[]; passed: number; failed: number; ms: number };

export type FnLite = {
  id: string;
  name: string;
  note: string | null;
  enabled: boolean;
  published: boolean;
  /** Which version is published (every publish is kept as one). */
  version?: number | null;
  publishedAt: string | null;
  /** The draft isn't what runs. */
  changed: boolean;
  steps: number;
  inputs: number;
  /** What the published one is handed (for a function that calls it). */
  takes: FnInput[];
  /** What the published one promises to give back, when it says. */
  gives?: Gives | null;
  /** Its call addresses (a shop page's button runs it through one), and who may call each. */
  calls?: Array<{ address: string; who: "customer" | "key" | "public" }>;
  runs: number;
  lastRunAt: string | null;
  updatedAt: string;
};
/** A function as it was published one time: when, by whom, how big; `back`: the version whose steps this one brought back. */
export type FnVersion = { n: number; at: string; by: string | null; back: number | null; steps: number; inputs: number };
/** Where a problem is ("do.2", "do.2.else.0", "if.0", "fail.1") and what it is. */
export type Problem = { at: string; message: string };
export type FnFull = FnLite & { draft: FnDef; live: FnDef | null; problems: Problem[]; triggers: FnTrigger[]; /** Its versions, newest first, and how many are kept. */ versions?: FnVersion[]; versionsKept?: number; /** The feature it is part of (admin → ميزاتي); one that is off keeps it from being started. */ feature?: { id: string; name: string; enabled: boolean } | null; /** Its own tests (F4): run before every publish. */ tests?: FnTest[] };

/** What starts a function (backend lib/fnTriggers.ts). It fires only while the function is published and switched on. */
export type TriggerKind = "row" | "schedule" | "event" | "call" | "webhook" | "route";
export type FnTrigger = {
  id: string;
  kind: TriggerKind;
  /** row: { table, on }; schedule: { everyMinutes } or { at: "HH:MM" }; event: { event }; call: { who, perMinute? }; webhook: {}; route: { method, path, who, perMinute?, status? } */
  config: Record<string, unknown>;
  /** A call's address (the owner's word). */
  slug: string | null;
  /** "/v1/fn/<address>", "/v1/hooks/<secret>" or "/v1/api/<path>"; a webhook's is null for a member who can only look. */
  address: string | null;
  enabled: boolean;
  fired: number;
  lastAt: string | null;
  nextAt: string | null;
  /** What it hands the function (the function takes the ones it has an input for). */
  hands: string[];
};
export type TriggerMeta = {
  kinds: TriggerKind[];
  events: string[];
  callPerMinute: Record<string, number>;
  limits: { perFunction: number; everyMinutes: { min: number; max: number } };
  /** An address of the owner's own: where it starts, its methods, what a good answer is sent with. */
  route?: { base: string; methods: string[]; status: number[]; limits: { parts: number; length: number } };
};

type Local = Partial<Record<"ar" | "en" | "he", string>>;
export type FnField = { id: string; type: string; name: Local | null; required: boolean; options?: Array<{ id: string; name: Local | null }> };
export type FnTable = { id: string; slug: string; name: Local | null; fields: FnField[] };
export type FnLimits = { steps: number; depth: number; conditions: number; inputs: number; values: number; text: number; found: number; loop: number; executed: number; writes: number; messages: number; calls: number; ms: number; /** A code step's code, in letters. */ code?: number; /** The cage a code step runs in. */ cage?: { ms: number; memoryMb: number }; /** Tests one function keeps. */ tests?: number; /** A call to a site: how long it may take, and how many a run makes. */ http?: { ms: number; calls: number } };
export type FnList = { functions: FnLite[]; tables: FnTable[]; ops: Record<string, Op[]>; cmps: Cmp[]; limits: FnLimits; triggers: TriggerMeta; outside?: Outside; /** What an input's rules may be. */ inputRules?: { formats: InputFormat[]; limits: { choices: number; choice: number } }; /** The store steps' roles, groups and limits. */ store?: StoreMeta };

export type TraceLine = { at: string; act: StepKind; ok: boolean; ms: number; note?: string; say?: [string, ...Array<string | number>]; error?: string; /** What a code step wrote with log(). */ log?: string[] };
export type Outcome = { ok: boolean; dry: boolean; value: unknown; valueCut?: boolean; error: string | null; failedAt: string | null; trace: TraceLine[]; counts: { steps: number; found: number; added: number; changed: number; deleted: number; sent: number; /** Coupons made, quantities changed, customers marked. */ store?: number }; ms: number; /** The published version that ran (a real run). */ version?: number | null; /** A real run's line in the run log. */ runId?: string; /** It went through, and what it gave back isn't what it promises: how. */ shape?: string };

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
export async function saveFunction(id: string, body: { name?: string; note?: string | null; enabled?: boolean; draft?: FnDef; tests?: FnTest[] }) {
  return (await api.put(at(id), body)).data as FnFull;
}
/** Its own tests run against the draft, as try-outs (nothing is written or sent): how each went. */
export async function runFnTests(id: string) {
  return (await api.post(`${at(id)}/tests/run`)).data as TestsOutcome;
}
/** The draft becomes what runs. Refused (409) while it has problems (FN_HAS_PROBLEMS), or while one of its own tests doesn't pass (FN_TESTS_FAILED, with how each went); refused (403 FN_NEEDS_RIGHT, `missing`) when a store step needs a permission the member hasn't. */
export async function publishFunction(id: string) {
  return (await api.post(`${at(id)}/publish`)).data as FnFull;
}
/** Run it now. `dry`: nothing is written or sent. The draft runs dry only. */
export async function runFunction(id: string, body: { input: Record<string, unknown>; dry: boolean; which: "draft" | "live" }) {
  return (await api.post(`${at(id)}/run`, body)).data as Outcome;
}
/** A version's steps, as they were published. */
export async function getFnVersion(id: string, n: number) {
  return (await api.get(`${at(id)}/versions/${n}`)).data as { n: number; def: FnDef };
}
/** An older version published again (a new version with its steps; refused, 409 FN_HAS_PROBLEMS, when it points at things that are gone), or taken into the draft. */
export async function restoreFnVersion(id: string, n: number, to: "live" | "draft") {
  return (await api.post(`${at(id)}/versions/${n}/restore`, { to })).data as FnFull;
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
