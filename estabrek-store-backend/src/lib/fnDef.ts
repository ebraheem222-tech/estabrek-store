/**
 * What a function is (F1; admin → الـ Functions). Logic the owner builds from steps, in the same
 * sentence as the shop's recipes: if → do, else, and what to do when a step fails. It is data,
 * checked before it is saved (its shape, here) and before it is published (that the tables,
 * fields and names it talks about exist, and that no step was left unfinished: `problemsOf`).
 * A draft may be saved half-written: a step with nothing in it yet is a problem, not a refusal.
 * Nothing in it is code.
 *
 * The steps:
 *   data     find, get, add, change, delete (the owner's own tables, written as the admin writes them)
 *   control  if, each, set, call (another function), stop, return
 *   out      email, whatsapp, sms (through the outbox), notify (the admin's bell)
 *
 * A step that makes something can keep it under a name (`as`); a later step names it in its
 * values: "{{order.total}}" (lib/fnValues.ts).
 */
import { z } from "zod";
import type { Field } from "./collectionTree.js";
import { OPS, OPS_BY_KIND, VIEWS, columnKind } from "./dataQuery.js";
import { LANGS } from "./dataRows.js";
import { ALONE, CMPS, PATH, holesOf, type Cmp } from "./fnValues.js";

export const FN_LIMITS = {
  /** Steps in one function, counting the ones inside others. */
  steps: 60,
  /** Steps inside steps inside steps. */
  depth: 4,
  conditions: 8,
  inputs: 20,
  values: 40,
  text: 2000,
  /** Rows one "find" takes. */
  found: 200,
  /** Things one "each" goes over. */
  loop: 200,
  /** In one run: steps done, rows written, messages sent, functions inside functions, and how long. */
  executed: 1000,
  writes: 200,
  messages: 20,
  calls: 3,
  ms: 10_000,
} as const;

/** A name the run keeps something under. */
export const NAME = /^[a-z][a-zA-Z0-9_]{0,30}$/;
/** Names the run itself uses. */
export const RESERVED = ["input", "now", "error", "index", "caller"] as const;
/** Who started the run, as its steps name them: {{caller.kind}} is "customer", "key", "public", "admin" or "system". */
export const CALLER_KEYS = ["kind", "id", "name", "email"] as const;

/* ---------------- The shape ---------------- */

export type Val = string | number | boolean | null | Val[] | { [key: string]: Val };
export type Cond = { left: Val; cmp: Cmp; right?: Val };
export type Match = "all" | "any";
export type Filter = { field: string; op: (typeof OPS)[number]; value?: Val; value2?: Val };
export type Sort = { field: string; dir?: "asc" | "desc" };
export type RowStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type PlainStep =
  | { act: "find"; table: string; filters?: Filter[]; match?: Match; sort?: Sort[]; view?: "all" | "draft" | "published" | "archived"; limit?: number; as: string }
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
export const isGroup = (s: Step): s is GroupStep => s.act === "if" || s.act === "each";

export const INPUT_TYPES = ["text", "number", "bool", "list", "any"] as const;
export type FnInput = { name: string; type: (typeof INPUT_TYPES)[number]; required?: boolean; note?: string };
export type FnDef = {
  /** The language words are read and written in (a text field holds one per language). */
  lang?: (typeof LANGS)[number];
  inputs: FnInput[];
  if?: Cond[];
  match?: Match;
  do: Step[];
  else?: Step[];
  /** When a step failed: what to do about it (the failure is `{{error}}`). */
  fail?: PlainStep[];
};

/** The steps a function may take after a failure: telling someone, writing it down. */
export const FAIL_ACTS: ReadonlyArray<StepKind> = ["set", "notify", "email", "whatsapp", "sms", "add", "change"];

const Text = z.string().max(FN_LIMITS.text);
const Name = z.string().regex(NAME, "A name starts with a small letter: letters, digits and _");
const Var = Name.refine((n) => !(RESERVED as readonly string[]).includes(n), "This name is the run's own");
/** A table's or a function's id ("" while the step is being written). */
const Id = z.string().max(40);
const ValSchema: z.ZodType<Val> = z.lazy(() => z.union([Text, z.number().finite(), z.boolean(), z.null(), z.array(ValSchema).max(50), z.record(z.string().max(60), ValSchema)]));
const small = (v: unknown) => JSON.stringify(v ?? null).length <= 8000;
const Value = ValSchema.refine(small, "Too long");
const Values = z.record(z.string().min(1).max(60), ValSchema).refine((v) => Object.keys(v).length <= FN_LIMITS.values && small(v), "Too many values");
const MatchSchema = z.enum(["all", "any"]);
const CondSchema = z.object({ left: Value, cmp: z.enum(CMPS), right: Value.optional() }).strict();
const Conds = z.array(CondSchema).max(FN_LIMITS.conditions);
const FilterSchema = z.object({ field: z.string().min(1).max(160), op: z.enum(OPS), value: Value.optional(), value2: Value.optional() }).strict();
const Status = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const PLAIN = [
  z
    .object({
      act: z.literal("find"),
      table: Id,
      filters: z.array(FilterSchema).max(12).optional(),
      match: MatchSchema.optional(),
      sort: z.array(z.object({ field: z.string().min(1).max(160), dir: z.enum(["asc", "desc"]).optional() }).strict()).max(3).optional(),
      view: z.enum(VIEWS).exclude(["trash"]).optional(),
      limit: z.number().int().min(1).max(FN_LIMITS.found).optional(),
      as: Var,
    })
    .strict(),
  z.object({ act: z.literal("get"), table: Id, row: Value, as: Var }).strict(),
  z.object({ act: z.literal("add"), table: Id, values: Values, status: Status.optional(), owner: Value.optional(), as: Var.optional() }).strict(),
  z.object({ act: z.literal("change"), table: Id, row: Value, values: Values, status: Status.optional(), as: Var.optional() }).strict(),
  z.object({ act: z.literal("delete"), table: Id, row: Value }).strict(),
  z.object({ act: z.literal("set"), name: Var, op: z.enum(["set", "add", "multiply", "append"]).optional(), value: Value }).strict(),
  z.object({ act: z.literal("email"), to: z.string().max(200).optional(), subject: z.string().max(200), text: Text }).strict(),
  z.object({ act: z.literal("whatsapp"), to: z.string().max(200).optional(), text: Text }).strict(),
  z.object({ act: z.literal("sms"), to: z.string().max(200).optional(), text: z.string().max(600) }).strict(),
  z.object({ act: z.literal("notify"), title: z.string().max(150), text: z.string().max(500).optional(), link: z.string().max(300).optional() }).strict(),
  z.object({ act: z.literal("call"), fn: Id, input: z.record(Name, ValSchema).refine(small, "Too long").optional(), as: Var.optional() }).strict(),
  z.object({ act: z.literal("stop"), message: z.string().max(300) }).strict(),
  z.object({ act: z.literal("return"), value: Value.optional() }).strict(),
] as const;

export const StepSchema: z.ZodType<Step> = z.lazy(() =>
  z.discriminatedUnion("act", [
    ...PLAIN,
    z.object({ act: z.literal("if"), if: Conds, match: MatchSchema.optional(), do: StepsSchema, else: StepsSchema.optional() }).strict(),
    z.object({ act: z.literal("each"), list: z.string().max(200), as: Var.optional(), do: StepsSchema }).strict(),
  ]),
) as z.ZodType<Step>;
const StepsSchema: z.ZodType<Step[]> = z.lazy(() => z.array(StepSchema).max(FN_LIMITS.steps));

const InputSchema = z.object({ name: Name, type: z.enum(INPUT_TYPES), required: z.boolean().optional(), note: z.string().max(200).optional() }).strict();

/** How many steps, counting the ones inside others; and how deep they go. */
export function sizeOf(steps: Step[] | undefined, depth = 1): { steps: number; depth: number } {
  let count = 0;
  let deepest = steps?.length ? depth : depth - 1;
  for (const s of steps ?? []) {
    count += 1;
    if (!isGroup(s)) continue;
    for (const inner of [s.do, s.act === "if" ? s.else : undefined]) {
      const size = sizeOf(inner, depth + 1);
      count += size.steps;
      deepest = Math.max(deepest, size.depth);
    }
  }
  return { steps: count, depth: deepest };
}

export const FnDefSchema: z.ZodType<FnDef> = z
  .object({
    lang: z.enum(LANGS).optional(),
    inputs: z.array(InputSchema).max(FN_LIMITS.inputs),
    if: Conds.optional(),
    match: MatchSchema.optional(),
    do: StepsSchema,
    else: StepsSchema.optional(),
    fail: z.array(z.discriminatedUnion("act", [...PLAIN])).max(8).optional(),
  })
  .strict()
  .superRefine((def, ctx) => {
    const names = def.inputs.map((i) => i.name);
    if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", path: ["inputs"], message: "Two inputs have the same name" });
    const size = [sizeOf(def.do), sizeOf(def.else)];
    if (size[0].steps + size[1].steps + (def.fail?.length ?? 0) > FN_LIMITS.steps) ctx.addIssue({ code: "custom", path: ["do"], message: `A function holds up to ${FN_LIMITS.steps} steps` });
    if (Math.max(size[0].depth, size[1].depth) > FN_LIMITS.depth) ctx.addIssue({ code: "custom", path: ["do"], message: `Steps go ${FN_LIMITS.depth} deep at most` });
    def.fail?.forEach((s, k) => {
      if (!FAIL_ACTS.includes(s.act)) ctx.addIssue({ code: "custom", path: ["fail", k], message: "After a failure a function tells someone or writes it down, nothing else" });
    });
  }) as z.ZodType<FnDef>;

export const EMPTY_DEF: FnDef = { inputs: [], do: [] };

/** A saved function's definition as it is used (one written by an older server still reads). */
export function defOf(raw: unknown): FnDef | null {
  const parsed = FnDefSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/* ---------------- Before it is published: does what it talks about exist? ---------------- */

export type Problem = { /** Where: "do.2", "do.2.else.0", "if.0", "fail.1". */ at: string; message: string };
export type KnownTable = { id: string; slug: string; fields: Field[]; name?: unknown };
export type KnownFn = { id: string; name: string; live: boolean; inputs: FnInput[] };
export type Known = { tables: KnownTable[]; fns: KnownFn[]; /** This function's own id (it can't call itself). */ self?: string };

/**
 * What stands in the way of publishing: a table or field that isn't there, a question a field's
 * kind can't answer, a name used before anything was kept under it, a function that isn't
 * published. Names are followed in the order the steps are written.
 */
export function problemsOf(def: FnDef, known: Known): Problem[] {
  const out: Problem[] = [];
  const tables = new Map(known.tables.map((t) => [t.id, t]));
  const fns = new Map(known.fns.map((f) => [f.id, f]));
  const inputs = new Set(def.inputs.map((i) => i.name));

  const names = (value: unknown, at: string, have: Set<string>) => {
    for (const hole of holesOf(value)) {
      if (!PATH.test(hole)) out.push({ at, message: `"{{${hole}}}" isn't a name` });
      else {
        const [root, next] = hole.split(".");
        if (root === "input") {
          if (next && !inputs.has(next)) out.push({ at, message: `No input called "${next}"` });
        } else if (root === "caller") {
          if (next && !(CALLER_KEYS as readonly string[]).includes(next)) out.push({ at, message: `The caller has no "${next}"` });
        } else if (root !== "now" && !have.has(root)) out.push({ at, message: `Nothing is kept under "${root}" before this step` });
      }
    }
  };
  const blank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && !v.trim());
  const conds = (list: Cond[] | undefined, at: string, have: Set<string>) =>
    list?.forEach((c, k) => {
      if (blank(c.left)) out.push({ at: `${at}.${k}`, message: "What is compared?" });
      names(c.left, `${at}.${k}`, have);
      if (ALONE.includes(c.cmp)) return;
      if (c.right === undefined) out.push({ at: `${at}.${k}`, message: "Compared with what?" });
      names(c.right, `${at}.${k}`, have);
    });
  const tableOf = (id: string, at: string) => {
    const t = tables.get(id);
    if (!t) out.push({ at, message: id ? "This table isn't there any more" : "Pick a table" });
    return t;
  };
  /** A step's text that was left empty. */
  const need = (v: unknown, at: string, what: string) => {
    if (blank(v)) out.push({ at, message: `${what} is empty` });
  };
  const values = (t: KnownTable | undefined, given: Record<string, Val>, at: string, have: Set<string>) => {
    for (const [id, v] of Object.entries(given)) {
      // "title.en": one language of a words field.
      if (t && !t.fields.some((f) => f.id === id.split(".")[0])) out.push({ at, message: `No field "${id}" in this table` });
      names(v, at, have);
    }
  };

  const walk = (steps: Step[] | undefined, base: string, have: Set<string>) => {
    (steps ?? []).forEach((s, k) => {
      const at = `${base}.${k}`;
      switch (s.act) {
        case "find": {
          const t = tableOf(s.table, at);
          for (const f of s.filters ?? []) {
            const kind = t ? columnKind(t.fields, f.field) : null;
            if (t && !kind) out.push({ at, message: `No column "${f.field}" in this table` });
            else if (kind && !OPS_BY_KIND[kind].includes(f.op)) out.push({ at, message: `"${f.field}" can't be asked "${f.op}"` });
            names([f.value, f.value2], at, have);
          }
          for (const o of s.sort ?? []) if (t && !columnKind(t.fields, o.field)) out.push({ at, message: `No column "${o.field}" in this table` });
          have.add(s.as);
          break;
        }
        case "get":
          tableOf(s.table, at);
          need(s.row, at, "Which row");
          names(s.row, at, have);
          have.add(s.as);
          break;
        case "add":
        case "change":
          if (s.act === "change") {
            need(s.row, at, "Which row");
            names(s.row, at, have);
            if (!Object.keys(s.values).length && !s.status) out.push({ at, message: "Nothing to change" });
          }
          values(tableOf(s.table, at), s.values, at, have);
          if (s.act === "add") names(s.owner, at, have);
          if (s.as) have.add(s.as);
          break;
        case "delete":
          tableOf(s.table, at);
          need(s.row, at, "Which row");
          names(s.row, at, have);
          break;
        case "set":
          // "add 1 to count" needs a count; "set" makes one.
          if (s.op && s.op !== "set" && s.op !== "append" && !have.has(s.name)) out.push({ at, message: `Nothing is kept under "${s.name}" before this step` });
          names(s.value, at, have);
          have.add(s.name);
          break;
        case "call": {
          const f = fns.get(s.fn);
          if (!s.fn) out.push({ at, message: "Pick a function" });
          else if (s.fn === known.self) out.push({ at, message: "A function can't call itself" });
          else if (!f) out.push({ at, message: "This function isn't there any more" });
          else {
            if (!f.live) out.push({ at, message: `"${f.name}" isn't published yet` });
            for (const i of f.inputs) if (i.required && s.input?.[i.name] === undefined) out.push({ at, message: `"${f.name}" needs "${i.name}"` });
            for (const given of Object.keys(s.input ?? {})) if (!f.inputs.some((i) => i.name === given)) out.push({ at, message: `"${f.name}" takes no "${given}"` });
          }
          names(s.input, at, have);
          if (s.as) have.add(s.as);
          break;
        }
        case "if": {
          if (!s.if.length) out.push({ at, message: "A question that asks nothing" });
          conds(s.if, `${at}.if`, have);
          // Each side knows only what came before the question; what either keeps is known after it.
          const yes = new Set(have);
          const no = new Set(have);
          walk(s.do, `${at}.do`, yes);
          walk(s.else, `${at}.else`, no);
          for (const n of [...yes, ...no]) have.add(n);
          break;
        }
        case "each": {
          names(s.list, at, have);
          if (!/^\{\{[^{}]+\}\}$/.test(s.list.trim())) out.push({ at, message: "A loop goes over one named list: {{rows}}" });
          const inside = new Set(have).add(s.as ?? "item").add("index");
          walk(s.do, `${at}.do`, inside);
          for (const n of inside) if (n !== (s.as ?? "item") && n !== "index") have.add(n);
          break;
        }
        default:
          // The steps that only say something: every text they hold, and none of the needed ones empty.
          if (s.act === "email") need(s.subject, at, "The subject");
          if (s.act === "email" || s.act === "whatsapp" || s.act === "sms") need(s.text, at, "The text");
          if (s.act === "notify") need(s.title, at, "The title");
          if (s.act === "stop") need(s.message, at, "The reason");
          names(Object.values(s), at, have);
      }
    });
  };

  conds(def.if, "if", new Set());
  const yes = new Set<string>();
  const no = new Set<string>();
  walk(def.do, "do", yes);
  walk(def.else, "else", no);
  walk(def.fail, "fail", new Set([...yes, ...no, "error"]));
  return out;
}
