/**
 * Changing a table's fields without surprises (B2): before anything is saved, what the change
 * would do to the rows that are there is counted and shown; then it is applied the same way.
 *
 *  - a field's kind changes: each value is written as words and read as the new kind (the way a
 *    file's cell is); the value it had is kept beside it, hidden ("<id>$was"), so changing back
 *    brings every value back as it was, the ones that couldn't be turned too;
 *  - a field is removed: its values stay in the rows, hidden; they show again when a field with
 *    that id comes back and they fit it;
 *  - a field's rules or choices change: nothing is rewritten; the rows that wouldn't pass now are
 *    counted (they are refused the next time that value is changed).
 *
 * Nothing is deleted by a change of fields. Hidden values aren't shown, searched, exported or
 * counted for "the only value".
 *
 * A relation's rows are links in a table of their own (lib/links.ts): a change never rewrites
 * them. A relation removed, turned into another kind, or pointed at another table leaves its
 * links where they are, hidden (counted like hidden values: the change needs a yes); they show
 * again when the field comes back.
 */
import { Prisma } from "@prisma/client";
import { checkItemData } from "./collections.js";
import type { Field, FieldType } from "./collectionTree.js";
import { coerceValue, same, type Lang } from "./dataRows.js";
import { uniqueKeys } from "./fieldRules.js";
import { isRelation, linkCounts } from "./links.js";
import { dayOf } from "./storeTime.js";

export type Change = "removed" | "retyped" | "ruled" | "added";
export type FieldPlan = { id: string; change: Change; from?: Field; to?: Field };
export type Impact = {
  field: string;
  change: Change;
  from?: FieldType;
  to?: FieldType;
  /** Rows that hold a value in this field. */
  rows: number;
  /** Retyped: values that turn into the new kind (or come back as they were). */
  converted: number;
  /** Retyped or added over old values: values that don't fit; they are put aside, hidden. */
  lost: number;
  /** Removed: values that stay in the rows, hidden. */
  hidden: number;
  /** Ruled: values that don't pass the new rules or choices (left as they are). */
  failing: number;
  /** Now required: rows that hold nothing there. */
  missing: number;
  /** Now "no doubles": rows whose value another row holds too. */
  doubles: number;
  /** A few of the values that don't fit, with why. */
  samples: Array<{ slug: string; value: string; why: string }>;
};

/** The hidden place a value is kept in when its field's kind changes. */
export const wasKey = (id: string) => `${id}$was`;
const WORDS = new Set<FieldType>(["text", "longText"]);
// A relation's table and how many rows it links are rules too (what deleting does isn't: it touches no row).
const RULES = ["unique", "min", "max", "shape", "pattern", "required", "to", "many", "exclusive"] as const;

/** What changed between two lists of fields, as far as the rows care (names, hints and messages don't count). */
export function planChange(before: Field[], after: Field[]): FieldPlan[] {
  const old = new Map(before.map((f) => [f.id, f]));
  const next = new Map(after.map((f) => [f.id, f]));
  const out: FieldPlan[] = [];
  for (const f of before) if (!next.has(f.id)) out.push({ id: f.id, change: "removed", from: f });
  for (const f of after) {
    const was = old.get(f.id);
    if (!was) out.push({ id: f.id, change: "added", to: f });
    else if (was.type !== f.type) out.push({ id: f.id, change: "retyped", from: was, to: f });
    else if (RULES.some((k) => !same(was[k], f[k])) || (was.options ?? []).map((o) => o.id).join("\n") !== (f.options ?? []).map((o) => o.id).join("\n")) out.push({ id: f.id, change: "ruled", from: was, to: f });
  }
  return out;
}

const firstWords = (v: unknown, lang: Lang) => {
  const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  return [o[lang], o.ar, o.en, o.he].find((x): x is string => typeof x === "string" && x.trim() !== "") ?? "";
};

/** A value as the words a person would write for it (what a file's cell would hold). */
export function wordsOf(field: Field, v: unknown, lang: Lang): string {
  if (v === undefined || v === null) return "";
  switch (field.type) {
    case "text":
    case "longText":
      return typeof v === "string" ? v : firstWords(v, lang);
    case "multiSelect":
      return Array.isArray(v) ? v.join(", ") : "";
    case "json":
      return typeof v === "string" ? v : JSON.stringify(v);
    case "location": {
      const at = v as { lat?: unknown; lng?: unknown; label?: unknown };
      return typeof at.lat === "number" && typeof at.lng === "number" ? [at.lat, at.lng, ...(typeof at.label === "string" && at.label ? [at.label] : [])].join(", ") : "";
    }
    default:
      return typeof v === "object" ? "" : String(v);
  }
}

const YES_NO = { yes: { ar: "نعم", en: "Yes", he: "כן" }, no: { ar: "لا", en: "No", he: "לא" } };

/** A value of one kind as the other kind would hold it, before that kind's own check (undefined: nothing to hold). */
export function convertValue(from: Field, to: Field, v: unknown, lang: Lang): unknown {
  if (v === undefined || v === null || v === "") return undefined;
  if (from.type === to.type) return v;
  if (WORDS.has(to.type)) {
    if (WORDS.has(from.type)) return v;
    // A choice becomes its name in each language; yes/no becomes the words.
    if (from.type === "select" || from.type === "multiSelect") {
      const ids = Array.isArray(v) ? v : [v];
      const picked = ids.map((id) => from.options?.find((o) => o.id === id) ?? { id: String(id), name: undefined });
      const out: Record<string, string> = {};
      for (const l of ["ar", "en", "he"] as const) {
        const names = picked.map((o) => o.name?.[l]).filter((x): x is string => !!x);
        if (names.length === picked.length) out[l] = names.join(l === "ar" ? "، " : ", ");
      }
      return Object.keys(out).length ? out : { [lang]: picked.map((o) => o.name?.[lang] ?? o.name?.ar ?? o.name?.en ?? o.name?.he ?? o.id).join(", ") };
    }
    if (from.type === "boolean") return v === true ? YES_NO.yes : YES_NO.no;
    const words = wordsOf(from, v, lang);
    return words ? { [lang]: words } : undefined;
  }
  // Anything is JSON: kept whole.
  if (to.type === "json") return v;
  // One choice out of several: the first.
  if (from.type === "multiSelect" && to.type === "select") return Array.isArray(v) ? v[0] : undefined;
  // A moment becomes the store day it falls on (not the day it is in UTC).
  if (from.type === "datetime" && to.type === "date") return typeof v === "string" ? dayOf(v) || undefined : undefined;
  return coerceValue(to, wordsOf(from, v, lang), lang);
}

/** Does the value pass the field's kind and rules (required and "the only value" aside)? Its kept form, or why not. */
function fits(field: Field, v: unknown): { ok: true; value: unknown } | { ok: false; why: string } {
  // A relation holds links to rows, never a written value: what was written is put aside.
  if (field.type === "relation") return { ok: false, why: "Links to rows, not a written value" };
  const checked = checkItemData([{ ...field, required: false }], { [field.id]: v });
  if (!checked.ok) return { ok: false, why: checked.issues[0]?.message ?? "Doesn't fit" };
  return field.id in checked.data ? { ok: true, value: checked.data[field.id] } : { ok: false, why: "Nothing left" };
}

type Effect = { has: boolean; outcome: "none" | "converted" | "lost" | "hidden" | "kept" | "failing"; patch?: Record<string, unknown>; remove?: string[]; why?: string; shown?: unknown };

/** What one planned change does to one row's values. */
export function rowEffect(plan: FieldPlan, data: Record<string, unknown>, lang: Lang): Effect {
  const v = data[plan.id];
  const has = v !== undefined && v !== null;
  if (plan.change === "removed") return { has, outcome: has ? "hidden" : "none" };
  const to = plan.to!;
  const kept = data[wasKey(plan.id)];
  if (plan.change === "ruled") {
    if (!has) return { has, outcome: "none" };
    const now = fits(to, v);
    return now.ok ? { has, outcome: "kept" } : { has, outcome: "failing", why: now.why, shown: v };
  }
  // Retyped, or added where values are left from an earlier field of that id.
  // Changing back: the value kept from before fits the new kind as it is.
  if (kept !== undefined) {
    const back = fits(to, kept);
    if (back.ok) return { has: true, outcome: "converted", patch: { [plan.id]: back.value }, remove: [wasKey(plan.id)] };
  }
  if (!has) return { has, outcome: "none" };
  const turned = plan.change === "retyped" ? fits(to, convertValue(plan.from!, to, v, lang)) : fits(to, v);
  if (turned.ok) {
    // An added field whose old values fit: they show as they are.
    if (plan.change === "added") return { has, outcome: "converted", ...(same(turned.value, v) ? {} : { patch: { [plan.id]: turned.value } }) };
    return { has, outcome: "converted", patch: { [plan.id]: turned.value, [wasKey(plan.id)]: v } };
  }
  return { has, outcome: "lost", patch: { [wasKey(plan.id)]: v }, remove: [plan.id], why: turned.why, shown: v };
}

const short = (v: unknown) => {
  const text = typeof v === "string" ? v : JSON.stringify(v) ?? "";
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
};

type Db = { $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>; $executeRaw: (query: Prisma.Sql) => Promise<number> };
type Scanned = { id: string; slug: string; v: Record<string, unknown> | null };
const STEP = 1000;

/** The table's rows (the trash too), a thousand at a time, each with only the asked values. */
async function scan(db: Pick<Db, "$queryRaw">, collectionId: string, keys: string[], each: (rows: Scanned[]) => Promise<void> | void) {
  let after = "";
  for (;;) {
    const rows = await db.$queryRaw<Scanned[]>(
      Prisma.sql`SELECT i."id", i."slug", (SELECT jsonb_object_agg(k, i."data"->k) FROM unnest(${keys}::text[]) AS k WHERE i."data"->k IS NOT NULL) AS v FROM "CollectionItem" i WHERE i."collectionId" = ${collectionId} AND i."id" > ${after} ORDER BY i."id" ASC LIMIT ${STEP}`,
    );
    if (!rows.length) return;
    await each(rows);
    if (rows.length < STEP) return;
    after = rows[rows.length - 1].id;
  }
}

const keysOf = (plans: FieldPlan[]) => plans.flatMap((p) => [p.id, wasKey(p.id)]);

/** What the change would do to the rows that are there. Nothing is written. */
export async function previewSchemaChange(db: Pick<Db, "$queryRaw">, collectionId: string, before: Field[], after: Field[], lang: Lang): Promise<Impact[]> {
  const plans = planChange(before, after);
  if (!plans.length) return [];
  const impacts = new Map<string, Impact>(plans.map((p) => [p.id, { field: p.id, change: p.change, ...(p.from ? { from: p.from.type } : {}), ...(p.to ? { to: p.to.type } : {}), rows: 0, converted: 0, lost: 0, hidden: 0, failing: 0, missing: 0, doubles: 0, samples: [] }]));
  // For "no doubles" newly asked: how many rows hold each value.
  const seen = new Map<string, Map<string, number>>();
  const newlyUnique = plans.filter((p) => p.to?.unique && !(p.change === "ruled" && p.from?.unique));
  const newlyRequired = plans.filter((p) => p.to?.required && !(p.change !== "added" && p.from?.required));
  let total = 0;
  await scan(db, collectionId, keysOf(plans), (rows) => {
    total += rows.length;
    for (const row of rows) {
      const data = row.v ?? {};
      for (const plan of plans) {
        const impact = impacts.get(plan.id)!;
        const effect = rowEffect(plan, data, lang);
        if (effect.has) impact.rows += 1;
        if (effect.outcome === "converted") impact.converted += 1;
        else if (effect.outcome === "hidden") impact.hidden += 1;
        else if (effect.outcome === "lost" || effect.outcome === "failing") {
          impact[effect.outcome] += 1;
          if (impact.samples.length < 5) impact.samples.push({ slug: row.slug, value: short(effect.shown), why: effect.why ?? "" });
        }
        // What the row would hold after the change, for "required" and "no doubles".
        const next = effect.patch && plan.id in effect.patch ? effect.patch[plan.id] : effect.remove?.includes(plan.id) || plan.change === "removed" ? undefined : data[plan.id];
        if (plan.to && newlyUnique.includes(plan)) {
          const counts = seen.get(plan.id) ?? new Map<string, number>();
          for (const key of new Set(uniqueKeys(plan.to, next))) counts.set(key, (counts.get(key) ?? 0) + 1);
          seen.set(plan.id, counts);
        }
        if (newlyRequired.includes(plan) && (next === undefined || next === null)) impact.missing += 1;
      }
    }
  });
  for (const [id, counts] of seen) impacts.get(id)!.doubles = [...counts.values()].filter((n) => n > 1).reduce((sum, n) => sum + n, 0);
  // A required field without a default, added to a table that has rows: every row lacks it.
  for (const plan of newlyRequired) if (plan.change === "added" && plan.to?.default === undefined) impacts.get(plan.id)!.missing = Math.max(impacts.get(plan.id)!.missing, total);
  // A relation's rows are links, counted in their own table: a change never rewrites them, it shows or hides them.
  for (const plan of plans) {
    const was = isRelation(plan.from) ? plan.from : null;
    const now = isRelation(plan.to) ? plan.to : null;
    if (!was && !now) continue;
    const impact = impacts.get(plan.id)!;
    const moved = !was || !now || was.to !== now.to;
    const before = was ? await linkCounts(db, collectionId, plan.id, was.to) : null;
    const after = now ? (moved ? await linkCounts(db, collectionId, plan.id, now.to) : before!) : null;
    // Removed, another kind now, or pointed at another table: its links stay where they are, hidden.
    if (before && moved) {
      impact.hidden += before.rows;
      impact.rows += before.rows;
    }
    if (now && after) {
      impact.rows += after.rows;
      // Links left from before (the field was here once, or pointed here) show again.
      if (moved) impact.converted += after.rows;
      if (!now.many) impact.failing += after.several;
      if (now.exclusive) impact.doubles += after.shared;
      if (newlyRequired.includes(plan)) impact.missing = Math.max(0, total - after.rows);
    }
  }
  return [...impacts.values()].filter((i) => i.change !== "added" || i.rows > 0 || i.missing > 0);
}

/** Values would stop showing (put aside or hidden): the change needs a yes. */
export const needsAccept = (impacts: Impact[]) => impacts.some((i) => i.lost > 0 || i.hidden > 0);

/** The rows rewritten for the change (kinds changed, old values under a new field). Run inside the transaction that saves the fields. */
export async function applySchemaChange(db: Db, collectionId: string, before: Field[], after: Field[], lang: Lang): Promise<{ rows: number }> {
  const plans = planChange(before, after).filter((p) => p.change === "retyped" || p.change === "added");
  if (!plans.length) return { rows: 0 };
  let changed = 0;
  await scan(db, collectionId, keysOf(plans), async (rows) => {
    const updates: Array<{ id: string; patch: Record<string, unknown>; remove: string[] }> = [];
    for (const row of rows) {
      const data = row.v ?? {};
      const patch: Record<string, unknown> = {};
      const remove: string[] = [];
      for (const plan of plans) {
        const effect = rowEffect(plan, data, lang);
        Object.assign(patch, effect.patch ?? {});
        remove.push(...(effect.remove ?? []));
      }
      if (Object.keys(patch).length || remove.length) updates.push({ id: row.id, patch, remove });
    }
    if (!updates.length) return;
    changed += await db.$executeRaw(
      Prisma.sql`UPDATE "CollectionItem" AS i SET "data" = (i."data" - ARRAY(SELECT jsonb_array_elements_text(u.remove))) || u.patch FROM jsonb_to_recordset(${JSON.stringify(updates)}::jsonb) AS u(id text, patch jsonb, remove jsonb) WHERE i."id" = u.id AND i."collectionId" = ${collectionId}`,
    );
  });
  return { rows: changed };
}

/** A row as the routes answer it: only the values of the table's own fields (what was put aside stays in the database). */
export function shownRow<T extends { data: unknown }>(row: T, fields: Field[]): T {
  const data = row.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  // A relation's rows aren't among the values (lib/links.ts withLinks adds them to the answer).
  for (const f of fields) if (f.type !== "relation" && f.id in data) out[f.id] = data[f.id];
  return { ...row, data: out };
}

/** A row's values that no field of the table shows (kept from removed fields and changed kinds): carried over when the row is rewritten whole. */
export function hiddenOf(data: unknown, fields: Field[]): Record<string, unknown> {
  const known = new Set(fields.map((f) => f.id));
  const out: Record<string, unknown> = {};
  if (data && typeof data === "object" && !Array.isArray(data)) for (const [k, v] of Object.entries(data)) if (!known.has(k)) out[k] = v;
  return out;
}
