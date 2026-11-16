/**
 * Functions run (F1; lib/fnDef.ts says what one is, lib/fnValues.ts how its values are filled).
 * A run goes through the steps one after another, keeps what they make under their names, and
 * ends with what it gives back, or with why it stopped. It writes the owner's own tables the way
 * the admin writes them (lib/rowWrites.ts), so a field's rules hold here too.
 *
 * - `dry`: nothing is written or sent. Each step still checks what it would do and says so, and
 *   the steps after it see the row as it would have been (a "find" asks the table as it is).
 * - A run has limits (lib/fnDef.ts FN_LIMITS): steps done, rows written, messages sent, functions
 *   inside functions, and ten seconds.
 * - A real run is written in the run log (lib/runs.ts) as kind "function".
 * - Who started it is {{caller}}: the admin, a signed-in shopper, an API key, anyone, or (a row
 *   event, a schedule, a webhook) the system. A caller never says who they are: the door they
 *   came through does.
 * - What starts a function by itself (lib/fnTriggers.ts) comes through the queue as a task of
 *   kind "function" (`startFunctions`). A run that was interrupted isn't run again by itself:
 *   its steps may not be safe to repeat.
 */
import { Prisma, type CollectionItem } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";
import type { Field } from "../../lib/collectionTree.js";
import { apiRow, type LinkModes } from "../../lib/dataApi.js";
import { GridQuerySchema, queryRows } from "../../lib/dataQuery.js";
import { patchData, rowData, type Lang } from "../../lib/dataRows.js";
import { FN_LIMITS, defOf, isGroup, type FnDef, type FnInput, type PlainStep, type Step } from "../../lib/fnDef.js";
import { emitRow, inChain, type FnTask } from "../../lib/fnTriggers.js";
import { registerTask } from "../../lib/tasks.js";
import { allHold, fill, numberOf, words, type Scope } from "../../lib/fnValues.js";
import { errorText, triggerJob } from "../../lib/jobs.js";
import { relationsOf, splitLinks, trashRows, withLinks } from "../../lib/links.js";
import { LONG, addRow, changeRow, refresh, writeRows } from "../../lib/rowWrites.js";
import { recordRun } from "../../lib/runs.js";
import { shownRow } from "../../lib/schemaChange.js";
import { getOrCreateSettings } from "../admin/settings.controller.js";
import { enqueueMessage } from "../outbox/outbox.service.js";

/** What a step did, as a code and its things, so the admin can say it in its own language. */
export type Said = [code: keyof typeof NOTE, ...things: Array<string | number>];
export type TraceLine = { /** Where the step is: "do.2", "do.2.do[1].0". */ at: string; act: string; ok: boolean; ms: number; /** What it did (or, dry, would do), in English. */ note?: string; say?: Said; error?: string };

const KIND = { email: "an email", whatsapp: "a WhatsApp", sms: "an SMS" } as Record<string, string>;
/** What each code says in English (the admin has the same list in its three languages: features/functions/fnText.ts). */
const NOTE = {
  found: (n: number, total: number) => (total > n ? `${n} of ${total} rows` : `${n} rows`),
  row: (slug: string) => `Row ${slug}`,
  noRow: () => "No such row",
  added: (slug: string, table: string) => `Added ${slug} to ${table}`,
  wouldAdd: (table: string) => `Would add a row to ${table}`,
  changed: (slug: string, table: string) => `Changed ${slug} in ${table}`,
  wouldChange: (slug: string, table: string) => `Would change ${slug} in ${table}`,
  deleted: (slug: string, table: string) => `Moved ${slug} to the trash of ${table}`,
  wouldDelete: (slug: string, table: string) => `Would move ${slug} to the trash of ${table}`,
  nothingToDelete: () => "No such row (nothing to delete)",
  set: (name: string, value: string) => `${name} = ${value}`,
  queued: (kind: string, to: string) => `Queued ${KIND[kind]} to ${to}`,
  wouldSend: (kind: string, to: string) => `Would send ${KIND[kind]} to ${to}`,
  rang: (title: string) => `Rang the bell: ${title}`,
  wouldRing: (title: string) => `Would ring the bell: ${title}`,
  called: (name: string) => `Called ${name}`,
  returned: () => "Gave back its answer",
  yes: () => "Yes",
  no: () => "No",
  other: () => "No: the other way",
  times: (n: number) => `${n} times`,
} as const;
const english = (said: Said): string => (NOTE[said[0]] as (...things: Array<string | number>) => string)(...said.slice(1));
export type Counts = { steps: number; found: number; added: number; changed: number; deleted: number; sent: number };
export type Outcome = { ok: boolean; dry: boolean; /** What it gave back. */ value: unknown; error: string | null; /** Where it failed. */ failedAt: string | null; trace: TraceLine[]; counts: Counts; ms: number };

/** "return": the run ends here, well. */
class Finish {
  constructor(readonly value: unknown) {}
}
/** A step couldn't do its thing (or "stop" said so). */
class Failure extends Error {
  constructor(
    message: string,
    readonly at: string,
  ) {
    super(message);
  }
}

type Table = { id: string; slug: string; fields: Field[] };
/** A run's limits, shared with the functions it calls; each keeps its own steps' lines. */
type Budget = { deadline: number; used: { writes: number; messages: number }; trace: TraceLine[]; counts: Counts; /** A dry run: the rows as its steps would have left them (null: deleted). */ pretend: Map<string, Stored | null> };
type Stored = { id: string; slug: string; status: string; data: unknown; createdAt: Date; updatedAt: Date; publishedAt: Date | null; collectionId: string };
type Ctx = { dry: boolean; lang: Lang; depth: number; budget: Budget; tables: Map<string, Table>; caller: FnCaller };
/** Who started a run. */
export type FnCaller = { kind: "admin" | "customer" | "key" | "public" | "system"; id?: string; name?: string; email?: string };
const SYSTEM: FnCaller = { kind: "system" };
const TRACE_MAX = 300;
const PHONE = /^\+?[0-9][0-9 ()-]{4,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------------- Rows, as a function sees them ---------------- */

/**
 * A row for a function: its fields by their ids ({{order.total}}), words in the function's
 * language, a relation as the rows it links; and the row's own things under "$" names, as the
 * grid calls them.
 */
async function rowsOut(table: Table, rows: Array<Omit<Stored, "collectionId">>, lang: Lang) {
  const links: LinkModes = new Map(relationsOf(table.fields).map((f) => [f.id, "all" as const]));
  const linked = await withLinks(prisma, table, rows.map((row) => shownRow(row, table.fields)));
  return linked.map((row) => {
    const r = apiRow(row, table.fields, { lang, links });
    return { ...r.values, $id: r.id, $slug: r.slug, $status: r.status, $createdAt: r.createdAt.toISOString(), $updatedAt: r.updatedAt.toISOString() };
  });
}

/** Which row a step means: its id or its address, or a row the run already holds. */
function rowName(v: unknown): string {
  if (typeof v === "string" || typeof v === "number") return String(v).trim();
  if (v && typeof v === "object" && !Array.isArray(v)) return rowName((v as Record<string, unknown>).$id ?? (v as Record<string, unknown>).id);
  return "";
}

async function findRow(table: Table, name: string, pretend: Map<string, Stored | null>): Promise<Stored | null> {
  if (!name || name.length > 100) return null;
  // A dry run: a row an earlier step would have made, changed or deleted is as that step left it.
  for (const [id, row] of pretend) if (id === name || (row?.collectionId === table.id && row.slug === name.toLowerCase())) return row?.collectionId === table.id ? row : null;
  const found = await prisma.collectionItem.findMany({ where: { collectionId: table.id, deletedAt: null, OR: [{ id: name }, { slug: name.toLowerCase() }] }, take: 2 });
  const row = found.find((x) => x.id === name) ?? found[0] ?? null;
  return row && pretend.get(row.id) === null ? null : row;
}

/** Why a row was refused, in a line. */
const issuesText = (issues: Array<{ field: string; message: string }>) => issues.slice(0, 4).map((i) => `${i.field}: ${i.message}`).join("; ");
function sayError(e: unknown): string {
  // (A question the grid can't read: its first complaint, not the whole list.)
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Bad value";
  if (e instanceof AppError) {
    const issues = (e.details as { issues?: Array<{ field: string; message: string }> } | undefined)?.issues;
    return issues?.length ? issuesText(issues) : e.message && e.message !== e.code ? e.message : e.code;
  }
  return errorText(e);
}

/* ---------------- One step ---------------- */

/** The step done; what it says about it. */
async function plain(s: PlainStep, scope: Scope, at: string, ctx: Ctx): Promise<Said> {
  const { budget, dry, lang } = ctx;
  const table = async (id: string): Promise<Table> => {
    const known = ctx.tables.get(id);
    if (known) return known;
    const c = await prisma.collection.findUnique({ where: { id }, select: { id: true, slug: true, fields: true } });
    if (!c) throw new Failure("This table isn't there any more", at);
    const t = { id: c.id, slug: c.slug, fields: (Array.isArray(c.fields) ? c.fields : []) as Field[] };
    ctx.tables.set(id, t);
    return t;
  };
  const writing = () => {
    if (budget.used.writes >= FN_LIMITS.writes) throw new Failure(`A run writes up to ${FN_LIMITS.writes} rows`, at);
    budget.used.writes += 1;
  };
  const filled = (values: Record<string, unknown>) => fill(values, scope) as Record<string, unknown>;

  switch (s.act) {
    case "find": {
      const t = await table(s.table);
      const q = GridQuerySchema.parse({
        pageSize: s.limit ?? 50,
        lang,
        view: s.view ?? "all",
        sort: s.sort ?? [],
        match: s.match ?? "all",
        filters: (s.filters ?? []).map((f) => ({ field: f.field, op: f.op, ...(f.value !== undefined ? { value: fill(f.value, scope) } : {}), ...(f.value2 !== undefined ? { value2: fill(f.value2, scope) } : {}) })),
      });
      const page = await queryRows(prisma, t, q);
      scope[s.as] = await rowsOut(t, page.rows, lang);
      budget.counts.found += page.rows.length;
      return ["found", page.rows.length, page.total];
    }
    case "get": {
      const t = await table(s.table);
      const row = await findRow(t, rowName(fill(s.row, scope)), budget.pretend);
      scope[s.as] = row ? (await rowsOut(t, [row], lang))[0] : null;
      if (row) budget.counts.found += 1;
      return row ? ["row", row.slug] : ["noRow"];
    }
    case "add": {
      const t = await table(s.table);
      const values = filled(s.values);
      // Whose row it is: a shopper, by their id (or {{caller}}). Nobody: the store's own row.
      const ownerId = s.owner === undefined ? null : rowName(fill(s.owner, scope)) || null;
      if (ownerId && !(await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } }))) throw new Failure("No such shopper to own the row", at);
      writing();
      if (dry) {
        const check = await writeRows(t, [{ status: s.status, values }], { mode: "create", lang, dryRun: true });
        if (check.rejected.length) throw new Failure(issuesText(check.rejected[0].issues), at);
        // The row as it would be kept, under a made-up id the later steps can name.
        const made = rowData(t.fields, splitLinks(t.fields, values, false).rest, lang);
        const id = `(new ${budget.pretend.size + 1})`;
        const now = new Date();
        const row: Stored = { id, slug: id, status: s.status ?? "DRAFT", data: made.ok ? made.data : {}, createdAt: now, updatedAt: now, publishedAt: s.status === "PUBLISHED" ? now : null, collectionId: t.id };
        budget.pretend.set(id, row);
        if (s.as) scope[s.as] = (await rowsOut(t, [row], lang))[0];
        budget.counts.added += 1;
        return ["wouldAdd", t.slug];
      }
      const row = await addRow(t, { status: s.status, values, ownerId }, lang);
      if (!row) throw new Failure("The row wasn't saved", at);
      if (s.as) scope[s.as] = (await rowsOut(t, [row], lang))[0];
      budget.counts.added += 1;
      return ["added", row.slug, t.slug];
    }
    case "change": {
      const t = await table(s.table);
      const was = await findRow(t, rowName(fill(s.row, scope)), budget.pretend);
      if (!was) throw new Failure("No such row to change", at);
      const values = filled(s.values);
      writing();
      if (dry) {
        // The same checks the write makes on the values, without the write.
        const split = splitLinks(t.fields, values, true);
        if (split.issues.length) throw new Failure(issuesText(split.issues), at);
        const next = patchData(t.fields, (was.data ?? {}) as Record<string, unknown>, split.rest, lang);
        if (!next.ok) throw new Failure(issuesText(next.issues), at);
        const row: Stored = { ...was, data: next.data, status: s.status ?? was.status, updatedAt: new Date() };
        budget.pretend.set(was.id, row);
        if (s.as) scope[s.as] = (await rowsOut(t, [row], lang))[0];
        budget.counts.changed += 1;
        return ["wouldChange", was.slug, t.slug];
      }
      // (Outside a dry run a row is always the table's own.)
      const saved = await changeRow(t, was as CollectionItem, { values, status: s.status, lang });
      if (s.as) scope[s.as] = (await rowsOut(t, [saved], lang))[0];
      budget.counts.changed += 1;
      return ["changed", saved.slug, t.slug];
    }
    case "delete": {
      const t = await table(s.table);
      const row = await findRow(t, rowName(fill(s.row, scope)), budget.pretend);
      // Gone already: nothing to do (a run tried again mustn't fail on what its first try did).
      if (!row) return ["nothingToDelete"];
      writing();
      budget.counts.deleted += 1;
      if (dry) {
        budget.pretend.set(row.id, null);
        return ["wouldDelete", row.slug, t.slug];
      }
      await prisma.$transaction((tx) => trashRows(tx, Prisma.sql`i."collectionId" = ${t.id} AND i."id" = ${row.id}`, new Date()), LONG);
      refresh();
      emitRow("deleted", t.id, row);
      return ["deleted", row.slug, t.slug];
    }
    case "set": {
      const value = fill(s.value, scope);
      const op = s.op ?? "set";
      if (op === "set") scope[s.name] = value;
      else if (op === "append") scope[s.name] = [...(Array.isArray(scope[s.name]) ? (scope[s.name] as unknown[]) : scope[s.name] == null ? [] : [scope[s.name]]), value].slice(0, 1000);
      else {
        const a = numberOf(scope[s.name] ?? 0);
        const b = numberOf(value);
        if (a == null || b == null) throw new Failure(`"${s.name}" and what is ${op === "add" ? "added" : "multiplied"} have to be numbers`, at);
        scope[s.name] = op === "add" ? a + b : a * b;
      }
      const now = scope[s.name];
      return ["set", s.name, typeof now === "object" && now !== null ? (Array.isArray(now) ? `[${now.length}]` : "{…}") : words(now).slice(0, 80)];
    }
    case "email":
    case "whatsapp":
    case "sms": {
      if (budget.used.messages >= FN_LIMITS.messages) throw new Failure(`A run sends up to ${FN_LIMITS.messages} messages`, at);
      let to = words(fill(s.to ?? "", scope)).trim();
      if (!to) {
        // Nobody named: the shop's own address (as the automations do).
        const shop = await getOrCreateSettings();
        to = (s.act === "email" ? shop.ordersEmail || shop.contactEmail : s.act === "whatsapp" ? shop.whatsappNumber || shop.contactPhone : shop.contactPhone || shop.whatsappNumber) || "";
      }
      if (!(s.act === "email" ? EMAIL : PHONE).test(to)) throw new Failure(to ? `"${to.slice(0, 60)}" isn't ${s.act === "email" ? "an email address" : "a phone number"}` : s.act === "email" ? "No address to send to (none here, none in the settings)" : "No number to send to (none here, none in the settings)", at);
      const text = words(fill(s.text, scope)).trim();
      if (!text) throw new Failure("Nothing to send (the text is empty)", at);
      budget.used.messages += 1;
      budget.counts.sent += 1;
      if (dry) return ["wouldSend", s.act, to];
      await enqueueMessage(
        s.act === "email"
          ? { channel: "EMAIL", to, template: "FN_MESSAGE", payloadJson: { subject: words(fill(s.subject, scope)).slice(0, 200), text } }
          : { channel: s.act === "whatsapp" ? "WHATSAPP" : "SMS", to, template: "FN_MESSAGE", payloadJson: { text } },
      );
      // Sent now when the server sends messages by itself (OUTBOX_WORKER), else with the next "send now".
      triggerJob("outbox");
      return ["queued", s.act, to];
    }
    case "notify": {
      const title = words(fill(s.title, scope)).trim().slice(0, 150);
      if (!title) throw new Failure("Nothing to say (the title is empty)", at);
      if (dry) return ["wouldRing", title];
      const link = words(fill(s.link ?? "", scope)).trim();
      await prisma.adminNotification.create({ data: { title, body: words(fill(s.text ?? "", scope)).slice(0, 500) || null, link: link.startsWith("/") ? link.slice(0, 300) : null } });
      return ["rang", title];
    }
    case "call": {
      if (ctx.depth >= FN_LIMITS.calls) throw new Failure(`Functions call each other ${FN_LIMITS.calls} deep at most`, at);
      const fn = await prisma.fn.findUnique({ where: { id: s.fn }, select: { name: true, live: true, enabled: true } });
      const def = fn ? defOf(fn.live) : null;
      if (!fn) throw new Failure("The function it calls isn't there any more", at);
      if (!def) throw new Failure(`"${fn.name}" isn't published`, at);
      if (!fn.enabled) throw new Failure(`"${fn.name}" is switched off`, at);
      const inner = await runDef(def, filled(s.input ?? {}), { dry, depth: ctx.depth + 1, budget, caller: ctx.caller });
      if (!inner.ok) throw new Failure(`${fn.name}: ${inner.error}`, at);
      if (s.as) scope[s.as] = inner.value;
      return ["called", fn.name];
    }
    case "stop":
      throw new Failure(words(fill(s.message, scope)).trim().slice(0, 300) || "Stopped", at);
    case "return":
      throw new Finish(s.value === undefined ? null : fill(s.value, scope));
  }
}

async function runSteps(steps: Step[], scope: Scope, base: string, ctx: Ctx): Promise<void> {
  const { budget } = ctx;
  const line = (l: Omit<TraceLine, "note">) => {
    if (budget.trace.length < TRACE_MAX) budget.trace.push({ ...l, ...(l.say ? { note: english(l.say) } : {}) });
  };
  for (let k = 0; k < steps.length; k++) {
    const s = steps[k];
    const at = `${base}.${k}`;
    if (budget.counts.steps >= FN_LIMITS.executed) throw new Failure(`A run does up to ${FN_LIMITS.executed} steps`, at);
    if (Date.now() > budget.deadline) throw new Failure(`A run takes ${FN_LIMITS.ms / 1000} seconds at most`, at);
    budget.counts.steps += 1;
    const t0 = Date.now();
    if (!isGroup(s)) {
      try {
        const said = await plain(s, scope, at, ctx);
        line({ at, act: s.act, ok: true, ms: Date.now() - t0, say: said });
      } catch (e) {
        if (e instanceof Finish) {
          line({ at, act: s.act, ok: true, ms: Date.now() - t0, say: ["returned"] });
          throw e;
        }
        const failure = e instanceof Failure ? e : new Failure(sayError(e), at);
        line({ at, act: s.act, ok: false, ms: Date.now() - t0, error: failure.message });
        throw failure;
      }
    } else if (s.act === "if") {
      const yes = allHold(s.if, s.match, scope);
      line({ at, act: "if", ok: true, ms: Date.now() - t0, say: [yes ? "yes" : s.else?.length ? "other" : "no"] });
      await runSteps(yes ? s.do : s.else ?? [], scope, `${at}.${yes ? "do" : "else"}`, ctx);
    } else {
      const list = fill(s.list, scope);
      if (!Array.isArray(list)) {
        line({ at, act: "each", ok: false, ms: Date.now() - t0, error: `${s.list} isn't a list` });
        throw new Failure(`${s.list} isn't a list`, at);
      }
      if (list.length > FN_LIMITS.loop) {
        line({ at, act: "each", ok: false, ms: Date.now() - t0, error: `The list has ${list.length} things; a loop goes over ${FN_LIMITS.loop} at most` });
        throw new Failure(`The list has ${list.length} things; a loop goes over ${FN_LIMITS.loop} at most`, at);
      }
      line({ at, act: "each", ok: true, ms: Date.now() - t0, say: ["times", list.length] });
      const name = s.as ?? "item";
      const before = { item: scope[name], index: scope.index };
      for (let i = 0; i < list.length; i++) {
        scope[name] = list[i];
        scope.index = i;
        await runSteps(s.do, scope, `${at}.do[${i}]`, ctx);
      }
      scope[name] = before.item;
      scope.index = before.index;
    }
  }
}

/* ---------------- A run ---------------- */

/** What the function was handed, as its inputs ask for it. */
function readInputs(inputs: FnInput[], raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const i of inputs) {
    let v = raw[i.name];
    if (v === undefined || v === null || v === "") {
      if (i.required) throw new Failure(`It needs "${i.name}"`, "inputs");
      out[i.name] = null;
      continue;
    }
    if (i.type === "number") {
      const n = numberOf(v);
      if (n == null) throw new Failure(`"${i.name}" has to be a number`, "inputs");
      v = n;
    } else if (i.type === "bool") v = v === true || v === "true" || v === 1 || v === "1";
    else if (i.type === "text") v = words(v).slice(0, 10_000);
    else if (i.type === "list" && !Array.isArray(v)) throw new Failure(`"${i.name}" has to be a list`, "inputs");
    out[i.name] = v;
  }
  return out;
}

const newBudget = (): Budget => ({ deadline: Date.now() + FN_LIMITS.ms, used: { writes: 0, messages: 0 }, trace: [], counts: { steps: 0, found: 0, added: 0, changed: 0, deleted: 0, sent: 0 }, pretend: new Map() });

/** A definition run with what it was handed. Never throws: a failure is the outcome. */
export async function runDef(def: FnDef, input: Record<string, unknown>, opts: { dry?: boolean; depth?: number; budget?: Budget; caller?: FnCaller } = {}): Promise<Outcome> {
  const t0 = Date.now();
  const budget = opts.budget ?? newBudget();
  // A function inside another keeps its own steps' lines to itself; the limits and counts are shared.
  const own: Budget = opts.budget ? { ...budget, trace: [] } : budget;
  const caller = opts.caller ?? SYSTEM;
  const ctx: Ctx = { dry: !!opts.dry, lang: def.lang ?? "ar", depth: opts.depth ?? 0, budget: own, tables: new Map(), caller };
  const scope: Scope = { now: new Date().toISOString(), caller: { kind: caller.kind, id: caller.id ?? null, name: caller.name ?? null, email: caller.email ?? null } };
  const done = (ok: boolean, value: unknown, error: string | null, failedAt: string | null): Outcome => ({ ok, dry: ctx.dry, value: ok ? value : null, error, failedAt, trace: own.trace, counts: own.counts, ms: Date.now() - t0 });
  let failure: Failure;
  try {
    scope.input = readInputs(def.inputs, input ?? {});
    const yes = allHold(def.if, def.match, scope);
    // The function's own question, said like a step's (a run that did nothing says why).
    if (def.if?.length) own.trace.push({ at: "if", act: "if", ok: true, ms: 0, say: [yes ? "yes" : def.else?.length ? "other" : "no"], note: english([yes ? "yes" : def.else?.length ? "other" : "no"]) });
    await runSteps(yes ? def.do : def.else ?? [], scope, yes ? "do" : "else", ctx);
    return done(true, null, null, null);
  } catch (e) {
    if (e instanceof Finish) return done(true, e.value, null, null);
    failure = e instanceof Failure ? e : new Failure(sayError(e), "");
  }
  // It failed: what the function does about that (telling someone, writing it down). A failure in there changes nothing.
  if (def.fail?.length) {
    scope.error = failure.message;
    await runSteps(def.fail, scope, "fail", ctx).catch(() => undefined);
  }
  return done(false, null, failure.message, failure.at || null);
}

const some = (counts: Counts) => Object.fromEntries(Object.entries(counts).filter(([k, n]) => k !== "steps" && n > 0));

/**
 * A saved function run: its published steps (or, from the admin's editor, the draft). A real run is
 * written in the run log and counted on the function; a dry one leaves no trace anywhere.
 */
export async function runFn(id: string, input: Record<string, unknown>, opts: { dry?: boolean; which?: "live" | "draft"; trigger: string; caller?: FnCaller; /** Only when it is switched on (everything but the admin's own run). */ needOn?: boolean }): Promise<Outcome> {
  const fn = await prisma.fn.findUnique({ where: { id } });
  if (!fn) throw new AppError(404, "FN_NOT_FOUND", "No such function");
  const def = defOf(opts.which === "draft" ? fn.draft : fn.live);
  if (!def) throw new AppError(409, opts.which === "draft" ? "FN_INVALID" : "FN_NOT_PUBLISHED", opts.which === "draft" ? "The draft can't be read" : "This function isn't published yet");
  if (opts.needOn && !fn.enabled) throw new AppError(409, "FN_OFF", "This function is switched off");
  const t0 = Date.now();
  const out = await runDef(def, input, { dry: opts.dry, caller: opts.caller });
  if (!opts.dry) {
    recordRun({ kind: "function", name: fn.name, ref: fn.id, trigger: opts.trigger, subject: opts.caller && opts.caller.kind !== "system" && opts.caller.kind !== "admin" ? opts.caller.kind : null, startedAt: t0, ms: out.ms, ok: out.ok, result: out.ok ? some(out.counts) : null, error: out.error });
    await prisma.fn.update({ where: { id }, data: { runs: { increment: 1 }, lastRunAt: new Date(t0) } }).catch(() => undefined);
  }
  return out;
}

/* ---------------- Started by a trigger: through the queue ---------------- */

/** What a row event hands the function: the row as it is now, as it was before a change, and what happened. */
async function rowInput(r: NonNullable<FnTask["row"]>, lang: Lang): Promise<Record<string, unknown> | null> {
  const c = await prisma.collection.findUnique({ where: { id: r.table }, select: { id: true, slug: true, fields: true } });
  // (A deleted row is in the trash, and still read from there.)
  const row = c ? await prisma.collectionItem.findUnique({ where: { id: r.id } }) : null;
  if (!c || !row) return null;
  const table: Table = { id: c.id, slug: c.slug, fields: (Array.isArray(c.fields) ? c.fields : []) as Field[] };
  const [now] = await rowsOut(table, [row], lang);
  const before = r.before === undefined ? null : (await rowsOut(table, [{ ...row, data: r.before }], lang))[0];
  return { row: now, before, event: r.event, table: table.slug };
}

/**
 * At start: runs asked for by a trigger (a row event, a schedule, a store event, a webhook) are
 * tasks of kind "function". The function's own failure is its outcome, written in the run log:
 * the task is done either way. What is tried again is only a run that never began.
 */
export function startFunctions() {
  registerTask(
    "function",
    async (payload, task) => {
      const p = payload as FnTask;
      if (!p || typeof p.fnId !== "string" || typeof p.trigger !== "string") throw new Error("Not a function's run");
      // It began once and the server stopped in the middle: its steps may not be safe to repeat. (Asked for again from the queue's page, it runs.)
      if (p.started && task.attempts > 1) throw new Error("It was interrupted mid-run; it isn't run again by itself");
      const trigger = p.triggerId ? await prisma.fnTrigger.findUnique({ where: { id: p.triggerId }, select: { id: true, enabled: true } }) : null;
      const fn = await prisma.fn.findUnique({ where: { id: p.fnId }, select: { enabled: true, live: true } });
      const def = fn ? defOf(fn.live) : null;
      // Removed, unpublished or switched off since it was asked for: nothing to run.
      if (!trigger?.enabled || !fn?.enabled || !def) return { skipped: 1 };
      const input = p.row ? await rowInput(p.row, def.lang ?? "ar") : p.input ?? {};
      if (!input) return { skipped: 1 };
      await prisma.task.update({ where: { id: task.id }, data: { payload: { ...p, started: true } as unknown as Prisma.InputJsonValue } });
      const out = await inChain(p.chain ?? 1, () => runFn(p.fnId, input, { trigger: p.trigger, needOn: true }));
      await prisma.fnTrigger.update({ where: { id: trigger.id }, data: { fired: { increment: 1 }, lastAt: new Date() } }).catch(() => undefined);
      return out.ok ? { ran: 1 } : { ran: 1, stopped: 1 };
    },
    { maxAttempts: 3, timeoutMs: 30_000 },
  );
}
