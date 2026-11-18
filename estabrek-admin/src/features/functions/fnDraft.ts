// الـ Functions: the builder's own sums, apart from the page so they can be tested. A function's
// steps are a tree (a question and a loop hold steps of their own); a step is named by its way
// in, the same way the server names it: ["do", 2, "else", 0] is "do.2.else.0".
import type { FnDef, FnField, FnLite, FnTable, GroupStep, Outside, PlainStep, Step, StepKind, Val } from "../../api/functions.api";

export type Path = Array<string | number>;
export const atOf = (path: Path) => path.join(".");
/** A line of a run names the turn of a loop too ("do.0.do[3].1"): the step it is, without the turn. */
export const stepOfLine = (at: string) => at.replace(/\[\d+\]/g, "");

export const isGroup = (s: Step): s is GroupStep => s.act === "if" || s.act === "each";
export const GROUPS: Array<{ key: "data" | "control" | "out" | "outside" | "code"; acts: StepKind[] }> = [
  { key: "data", acts: ["find", "get", "add", "change", "delete"] },
  { key: "control", acts: ["if", "each", "set", "call", "stop", "return"] },
  { key: "out", acts: ["notify", "push", "email", "whatsapp", "sms"] },
  // Outside the store: through a service the owner connected, or a call to a site the owner allowed.
  { key: "outside", acts: ["ready", "http"] },
  // For what the steps can't say: JavaScript, run in a cage on the server.
  { key: "code", acts: ["code"] },
];
/** After a failure a function tells someone or writes it down, nothing else. */
export const FAIL_ACTS: StepKind[] = ["notify", "push", "email", "whatsapp", "sms", "add", "change", "set", "ready", "http"];
export const NAME = /^[a-z][a-zA-Z0-9_]{0,30}$/;
export const RESERVED = ["input", "now", "error", "index", "caller", "secret"];
export const nameOk = (name: string) => NAME.test(name) && !RESERVED.includes(name);

/* ---------------- Changing the tree (nothing is changed in place) ---------------- */

const getIn = (root: unknown, path: Path): unknown => path.reduce<unknown>((at, key) => (at == null ? undefined : (at as Record<string | number, unknown>)[key]), root);
function setIn<T>(root: T, path: Path, value: unknown): T {
  if (!path.length) return value as T;
  const [key, ...rest] = path;
  const copy = (Array.isArray(root) ? [...root] : { ...(root as object) }) as Record<string | number, unknown>;
  const next = setIn((root as Record<string | number, unknown> | undefined)?.[key], rest, value);
  // Nothing under a name: the name goes (a question's "else", taken away).
  if (next === undefined && !Array.isArray(copy)) delete copy[key];
  else copy[key] = next;
  return copy as T;
}

/** The steps of one list: the function's own ("do", "else", "fail") or a step's (["do", 2, "else"]). */
export const listAt = (def: FnDef, list: Path): Step[] => (getIn(def, list) as Step[] | undefined) ?? [];
export const stepAt = (def: FnDef, path: Path): Step | undefined => getIn(def, path) as Step | undefined;
export const setStep = (def: FnDef, path: Path, step: Step): FnDef => setIn(def, path, step);
export const addStep = (def: FnDef, list: Path, step: Step): FnDef => setIn(def, list, [...listAt(def, list), step]);
export function removeStep(def: FnDef, path: Path): FnDef {
  const list = path.slice(0, -1);
  return setIn(def, list, listAt(def, list).filter((_s, k) => k !== path[path.length - 1]));
}
/** One place up (-1) or down (+1) in its own list; as it was at either end. */
export function moveStep(def: FnDef, path: Path, by: -1 | 1): FnDef {
  const list = path.slice(0, -1);
  const steps = [...listAt(def, list)];
  const from = Number(path[path.length - 1]);
  const to = from + by;
  if (to < 0 || to >= steps.length) return def;
  [steps[from], steps[to]] = [steps[to], steps[from]];
  return setIn(def, list, steps);
}
/** A list that is there or not (a question's "else", the function's "fail"): made empty, or taken away. */
export const setList = (def: FnDef, list: Path, steps: Step[] | undefined): FnDef => setIn(def, list, steps);

/** How many steps, counting the ones inside others. */
export function countSteps(steps: Step[] | undefined): number {
  return (steps ?? []).reduce((n, s) => n + 1 + (isGroup(s) ? countSteps(s.do) + (s.act === "if" ? countSteps(s.else) : 0) : 0), 0);
}

/* ---------------- Names: what a step can talk about ---------------- */

/** Something the run keeps under a name: rows of a table, one row, a site's answer, or any value. */
export type Known = { name: string; kind: "rows" | "row" | "value" | "answer"; table?: string; /** What a "call" step keeps: the function it called (whose promised answer says its fields). */ fn?: string };

/** The list a loop goes over, when it is one name: "{{orders}}" → "orders". */
const oneName = (text: string) => /^\{\{\s*([A-Za-z_$][\w$.]*)\s*\}\}$/.exec(text.trim())?.[1] ?? null;

function keep(have: Map<string, Known>, s: Step) {
  if (s.act === "find") have.set(s.as, { name: s.as, kind: "rows", table: s.table });
  else if (s.act === "get") have.set(s.as, { name: s.as, kind: "row", table: s.table });
  else if ((s.act === "add" || s.act === "change") && s.as) have.set(s.as, { name: s.as, kind: "row", table: s.table });
  else if (s.act === "set" && nameOk(s.name) && !have.has(s.name)) have.set(s.name, { name: s.name, kind: "value" });
  else if (s.act === "call" && s.as) have.set(s.as, { name: s.as, kind: "value", fn: s.fn });
  else if (s.act === "code" && s.as) have.set(s.as, { name: s.as, kind: "value" });
  else if ((s.act === "http" || s.act === "ready") && s.as) have.set(s.as, { name: s.as, kind: "answer" });
}

/**
 * What is kept under a name before the step at `target` runs (or, for a place one past a list's
 * end, before a step added there), in the order the steps are written. Each side of a question
 * knows only what came before the question; a loop's own names end with the loop.
 */
export function namesBefore(def: FnDef, target: Path): Known[] {
  const want = atOf(target);
  const become = (have: Map<string, Known>, other: Map<string, Known>) => {
    have.clear();
    for (const [n, v] of other) have.set(n, v);
  };
  /** Goes down a list; true once the wanted place is reached (`have` is then what was kept before it). */
  const walk = (steps: Step[], base: Path, have: Map<string, Known>): boolean => {
    for (let k = 0; k <= steps.length; k++) {
      if (atOf([...base, k]) === want) return true;
      const s = steps[k];
      if (!s) break;
      if (s.act === "if") {
        const yes = new Map(have);
        const no = new Map(have);
        if (walk(s.do, [...base, k, "do"], yes)) return become(have, yes), true;
        if (walk(s.else ?? [], [...base, k, "else"], no)) return become(have, no), true;
        for (const [n, v] of [...yes, ...no]) if (!have.has(n)) have.set(n, v);
      } else if (s.act === "each") {
        const inside = new Map(have);
        const over = oneName(s.list);
        const list = over ? have.get(over.split(".")[0]) : undefined;
        const item = s.as ?? "item";
        // Going over rows, each thing is a row of that table.
        inside.set(item, list?.kind === "rows" && over === list.name ? { name: item, kind: "row", table: list.table } : { name: item, kind: "value" });
        inside.set("index", { name: "index", kind: "value" });
        if (walk(s.do, [...base, k, "do"], inside)) return become(have, inside), true;
        for (const [n, v] of inside) if (n !== item && n !== "index" && !have.has(n)) have.set(n, v);
      } else keep(have, s);
    }
    return false;
  };
  const have = new Map<string, Known>();
  if (target[0] === "fail") {
    // After a failure: whatever either way of the function kept, and the failure itself.
    for (const side of ["do", "else"] as const) {
      const kept = new Map<string, Known>();
      walk(def[side] ?? [], [side], kept);
      for (const [n, v] of kept) if (!have.has(n)) have.set(n, v);
    }
    have.set("error", { name: "error", kind: "value" });
    walk(def.fail ?? [], ["fail"], have);
  } else if (target[0] === "do" || target[0] === "else") walk(def[target[0]] ?? [], [target[0]], have);
  return [...have.values()];
}

/**
 * The names a value can be given at a step, ready to put in a text: the function's inputs, the
 * moment, and what is kept (a row with its fields, rows with how many and the first).
 */
export function offers(def: FnDef, target: Path, tables: FnTable[], /** The other functions: one that says what it gives back has its answer's fields offered. */ fns: FnLite[] = []): string[] {
  // Who started the run: a shopper's button, a key, the admin, or (a row event, a schedule) the system.
  const out = [...def.inputs.map((i) => `input.${i.name}`), "now", "caller", "caller.id", "caller.name", "caller.email", "caller.kind", "caller.roles", "caller.groups"];
  const fieldsOf = (id?: string) => tables.find((t) => t.id === id)?.fields ?? [];
  for (const k of namesBefore(def, target)) {
    if (k.kind === "rows") out.push(k.name, `${k.name}.length`, ...fieldsOf(k.table).map((f) => `${k.name}.first.${f.id}`));
    else if (k.kind === "row") out.push(k.name, `${k.name}.$id`, `${k.name}.$slug`, ...fieldsOf(k.table).map((f) => `${k.name}.${f.id}`));
    // A site's answer: what it said, whether it said yes, and its status.
    else if (k.kind === "answer") out.push(`${k.name}.body`, `${k.name}.ok`, `${k.name}.status`);
    else {
      out.push(k.name);
      // What another function gave back: its promised fields (a list's: of its first thing).
      const gives = k.fn ? fns.find((f) => f.id === k.fn)?.gives : null;
      if (gives?.type === "thing") out.push(...(gives.fields ?? []).map((f) => `${k.name}.${f.name}`));
      else if (gives?.type === "list") out.push(`${k.name}.length`, ...(gives.fields ?? []).map((f) => `${k.name}.first.${f.name}`));
    }
  }
  return out;
}

/* ---------------- New steps ---------------- */

/** A name nobody uses yet: "rows", "rows2", "rows3"… */
export function freeName(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}${n}`)) return `${base}${n}`;
}

/** Every name the steps keep something under (so a new step takes another). */
export function namesUsed(def: FnDef): string[] {
  const out: string[] = [];
  const walk = (steps: Step[] | undefined) => {
    for (const s of steps ?? []) {
      if ("as" in s && s.as) out.push(s.as);
      if (s.act === "set") out.push(s.name);
      if (isGroup(s)) {
        walk(s.do);
        if (s.act === "if") walk(s.else);
      }
    }
  };
  walk(def.do);
  walk(def.else);
  walk(def.fail);
  return out;
}

/** What a kind of ready connection does first (each has one thing it does, for now: "message"). */
export const firstAction = (outside: Outside | undefined, kind: string | undefined) => outside?.kinds?.find((k) => k.kind === kind)?.actions[0]?.id ?? "message";

/** A fresh step of a kind, with what it needs to start from. */
export function newStep(act: StepKind, ctx: { tables: FnTable[]; fns: FnLite[]; def: FnDef; /** What a new code step starts with (a few lines saying how it works). */ code?: string; /** The ready connections and their kinds: a new "ready" step starts on the first one. */ outside?: Outside }): Step {
  const table = ctx.tables[0]?.id ?? "";
  const free = (base: string) => freeName(base, [...namesUsed(ctx.def), ...RESERVED, "item"]);
  switch (act) {
    case "find":
      return { act, table, as: free("rows") };
    case "get":
      return { act, table, row: "", as: free("row") };
    case "add":
      return { act, table, values: {}, as: free("made") };
    case "change":
      return { act, table, row: "", values: {} };
    case "delete":
      return { act, table, row: "" };
    case "set":
      return { act, name: free("value"), value: "" };
    case "if":
      return { act, if: [{ left: "", cmp: "eq", right: "" }], do: [] };
    case "each":
      return { act, list: "", do: [] };
    case "call":
      return { act, fn: ctx.fns.find((f) => f.published)?.id ?? "", input: {} };
    case "code":
      return { act, code: ctx.code ?? "return input;", give: {}, as: free("result") };
    case "http":
      return { act, method: "POST", url: "https://", as: free("answer") };
    case "ready": {
      const first = ctx.outside?.ready?.[0];
      return { act, via: first?.id ?? "", what: firstAction(ctx.outside, first?.kind), give: {} };
    }
    case "stop":
      return { act, message: "" };
    case "return":
      return { act, value: "" };
    case "email":
      return { act, subject: "", text: "" };
    case "notify":
      return { act, title: "" };
    case "push":
      // Most often the one who started the run: the shopper whose button it was.
      return { act, who: "customer", to: "{{caller.id}}", title: "" };
    default:
      return { act, text: "" } as PlainStep;
  }
}

/* ---------------- A value as the owner types it ---------------- */

/** What is typed, as a value: a number, yes/no, a list or a thing written as JSON; else words. */
export function toVal(text: string): Val {
  const t = text.trim();
  if (/^-?\d+(\.\d+)?$/.test(t) && t.length <= 15) return Number(t);
  if (t === "true") return true;
  if (t === "false") return false;
  if ((t.startsWith("{") && !t.startsWith("{{")) || t.startsWith("[")) {
    try {
      return JSON.parse(t) as Val;
    } catch {
      return text;
    }
  }
  return text;
}
/** A value as it is shown to be typed over. */
export const fromVal = (v: Val | undefined): string => (v == null ? "" : typeof v === "string" ? v : JSON.stringify(v));

/** A field's name in the admin's language, else its id. */
export function fieldName(f: Pick<FnField, "id" | "name">, lang: "ar" | "en" | "he"): string {
  return f.name?.[lang] || f.name?.ar || f.name?.en || f.name?.he || f.id;
}
export function tableName(t: Pick<FnTable, "slug" | "name"> | undefined, lang: "ar" | "en" | "he"): string {
  return t ? t.name?.[lang] || t.name?.ar || t.name?.en || t.name?.he || t.slug : "";
}
