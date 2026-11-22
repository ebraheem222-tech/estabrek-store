/**
 * Functions run (F1; lib/fnDef.ts says what one is, lib/fnValues.ts how its values are filled).
 * A run goes through the steps one after another, keeps what they make under their names, and
 * ends with what it gives back, or with why it stopped. It writes the owner's own tables the way
 * the admin writes them (lib/rowWrites.ts), so a field's rules hold here too.
 *
 * - `dry`: nothing is written or sent. Each step still checks what it would do and says so, and
 *   the steps after it see the row as it would have been (a "find" asks the table as it is).
 *   A code step runs as it is either way: in its cage it can't write or send anything.
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
import { FN_LIMITS, STORE_NUMBERS, defOf, isBlank, isGroup, numberProblem, type FnDef, type FnInput, type PlainStep, type Step } from "../../lib/fnDef.js";
import { runCode, type CodeCall, type CodeCallAnswer } from "../../lib/fnCode.js";
import { HTTP_LIMITS, HTTP_METHODS, SiteError, callSite } from "../../lib/fnHttp.js";
import { useReady } from "../../lib/fnReady.js";
import { versionDef } from "../../lib/fnVersions.js";
import { answerProblem } from "../../lib/fnGives.js";
import { TEST_LIMITS, verdict, type FnTest, type TestWhy } from "../../lib/fnTests.js";
import { switchedOff } from "../../lib/featureGate.js";
import { settingsFor, valuesIn } from "../../lib/siteSettings.js";
import { emitRow, inChain, type FnTask } from "../../lib/fnTriggers.js";
import { registerTask } from "../../lib/tasks.js";
import { allHold, fill, numberOf, words, type Scope } from "../../lib/fnValues.js";
import { readInputs as inputsRead } from "../../lib/fnInputs.js";
import { errorText, triggerJob } from "../../lib/jobs.js";
import { relationsOf, splitLinks, trashRows, withLinks } from "../../lib/links.js";
import { LONG, addRow, changeRow, refresh, writeRows } from "../../lib/rowWrites.js";
import { newRunId, recordRun } from "../../lib/runs.js";
import { shownRow } from "../../lib/schemaChange.js";
import { getOrCreateSettings } from "../admin/settings.controller.js";
import { enqueueMessage } from "../outbox/outbox.service.js";
import { PUSH_LIMITS, pushAudienceCount, pushSettings, queuePush, shopPath } from "../../lib/push.js";
import { StoreError, changeStock, makeCoupon, markCustomer } from "../../lib/fnStore.js";
import { PayError, makePayRequest } from "../../lib/payLinks.js";

/** What a step did, as a code and its things, so the admin can say it in its own language. */
export type Said = [code: keyof typeof NOTE, ...things: Array<string | number>];
export type TraceLine = { /** Where the step is: "do.2", "do.2.do[1].0". */ at: string; act: string; ok: boolean; ms: number; /** What it did (or, dry, would do), in English. */ note?: string; say?: Said; error?: string; /** What a code step wrote with log(). */ log?: string[] };

const KIND = { email: "an email", whatsapp: "a WhatsApp", sms: "an SMS" } as Record<string, string>;
const WHO = { all: "everyone", customers: "the signed-in customers", customer: "the customer" } as Record<string, string>;
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
  pushed: (who: string, phones: number) => `Sent a notification to ${WHO[who]} (${phones} ${phones === 1 ? "phone" : "phones"})`,
  wouldPush: (who: string, phones: number) => `Would send a notification to ${WHO[who]} (${phones} ${phones === 1 ? "phone" : "phones"})`,
  called: (name: string) => `Called ${name}`,
  ran: (ms: number) => `Ran the code (${ms} ms)`,
  answered: (line: string, status: number) => `${line} answered ${status}`,
  wouldCall: (line: string) => `Would call ${line}`,
  used: (line: string) => `Sent through ${line}`,
  wouldUse: (line: string) => `Would send through ${line}`,
  couponMade: (code: string, off: string) => `Made the coupon ${code} (${off} off)`,
  wouldCoupon: (code: string, off: string) => `Would make a coupon like ${code} (${off} off)`,
  stocked: (sku: string, before: number, after: number) => `${sku}: ${before} → ${after}`,
  wouldStock: (sku: string, before: number, after: number) => `Would make ${sku} ${before} → ${after}`,
  customer: (who: string) => `The customer ${who}`,
  gaveRole: (role: string, who: string) => `Gave ${who} the role ${role}`,
  wouldGiveRole: (role: string, who: string) => `Would give ${who} the role ${role}`,
  tookRole: (role: string, who: string) => `Took the role ${role} from ${who}`,
  wouldTakeRole: (role: string, who: string) => `Would take the role ${role} from ${who}`,
  joined: (group: string, who: string) => `Put ${who} in ${group}`,
  wouldJoin: (group: string, who: string) => `Would put ${who} in ${group}`,
  left: (group: string, who: string) => `Took ${who} out of ${group}`,
  wouldLeave: (group: string, who: string) => `Would take ${who} out of ${group}`,
  asked: (title: string, sum: string) => `Asked for a payment: ${title} (${sum})`,
  wouldAsk: (title: string, sum: string) => `Would ask for a payment: ${title} (${sum})`,
  returned: () => "Gave back its answer",
  yes: () => "Yes",
  no: () => "No",
  other: () => "No: the other way",
  times: (n: number) => `${n} times`,
} as const;
const english = (said: Said): string => (NOTE[said[0]] as (...things: Array<string | number>) => string)(...said.slice(1));
export type Counts = { steps: number; found: number; added: number; changed: number; deleted: number; sent: number; /** Coupons made, quantities changed, customers marked. */ store: number };
export type Outcome = { ok: boolean; dry: boolean; /** What it gave back. */ value: unknown; error: string | null; /** Where it failed. */ failedAt: string | null; trace: TraceLine[]; counts: Counts; ms: number; /** The published version that ran (a saved function's published steps). */ version?: number | null; /** A real run's line in the run log. */ runId?: string; /** It went through, and what it gave back isn't what it promises (lib/fnGives.ts): how. */ shape?: string };

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
type Budget = { deadline: number; /** How long the run was given. */ ms: number; used: { writes: number; messages: number; http: number; store: number }; trace: TraceLine[]; counts: Counts; /** A dry run: the rows as its steps would have left them (null: deleted). */ pretend: Map<string, Stored | null>; /** A dry run: the pieces' quantities as its steps would have left them. */ stock: Map<string, number> };
type Stored = { id: string; slug: string; status: string; data: unknown; createdAt: Date; updatedAt: Date; publishedAt: Date | null; collectionId: string };
type Ctx = { dry: boolean; lang: Lang; depth: number; budget: Budget; tables: Map<string, Table>; caller: FnCaller; /** What the code step just run wrote with log(): the step's line takes it. */ logged?: string[]; /** The saved function running (a payment it asks for says which). */ fnId?: string };
/** Who started a run. */
export type FnCaller = { kind: "admin" | "customer" | "key" | "public" | "system"; id?: string; name?: string; email?: string; /** A shopper's (lib/shopperRoles.ts). */ roles?: string[]; groups?: string[]; /** A shopper's game accounts, once linked (lib/socialSignIn.ts). */ discordId?: string | null; steamId?: string | null };
const SYSTEM: FnCaller = { kind: "system" };
const TRACE_MAX = 300;
const PHONE = /^\+?[0-9][0-9 ()-]{4,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------------- Rows, as a function sees them ---------------- */

/**
 * A row for a function: its fields by their ids ({{order.total}}), words in the function's
 * language, a relation as the rows it links; and the row's own things under "$" names, as the
 * grid calls them. Its id is also plain {{row.id}} (as the gallery's functions name it), unless
 * the table has a field of its own called "id": that field is what the name means then.
 */
async function rowsOut(table: Table, rows: Array<Omit<Stored, "collectionId">>, lang: Lang) {
  const links: LinkModes = new Map(relationsOf(table.fields).map((f) => [f.id, "all" as const]));
  const linked = await withLinks(prisma, table, rows.map((row) => shownRow(row, table.fields)));
  return linked.map((row) => {
    const r = apiRow(row, table.fields, { lang, links });
    return { id: r.id, ...r.values, $id: r.id, $slug: r.slug, $status: r.status, $createdAt: r.createdAt.toISOString(), $updatedAt: r.updatedAt.toISOString() };
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

/**
 * A call to a site that a code step asked for (lib/fnCode.ts http()): checked and made as an "http"
 * step's (lib/fnHttp.ts callSite: the owner's sites, a secret only to a site it is for), from the
 * code's own words (only its {{secret.NAME}} marks are filled). It counts with the run's calls and
 * time. What can't be done is the code's to catch: said back as the error it throws.
 */
async function codeCall(call: CodeCall, ctx: Ctx, dry: boolean, said: string[]): Promise<CodeCallAnswer> {
  const { budget } = ctx;
  const method = typeof call.method === "string" ? call.method.toUpperCase() : "";
  if (!(HTTP_METHODS as readonly string[]).includes(method)) return { error: "http(method, …): GET, POST, PUT, PATCH or DELETE" };
  if (typeof call.url !== "string" || !call.url.trim()) return { error: "http(…, url): the address, in words" };
  const options = call.options && typeof call.options === "object" && !Array.isArray(call.options) ? (call.options as Record<string, unknown>) : {};
  const raw = options.headers;
  if (raw !== undefined && raw !== null && (typeof raw !== "object" || Array.isArray(raw))) return { error: "http(…, { headers }): name: value pairs" };
  const headers = Object.fromEntries(Object.entries((raw ?? {}) as Record<string, unknown>).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v) ?? ""]));
  if (budget.used.http >= HTTP_LIMITS.calls) return { error: `A run calls sites up to ${HTTP_LIMITS.calls} times` };
  const left = budget.deadline - Date.now();
  if (left < 500) return { error: "The run has no time left for a call" };
  budget.used.http += 1;
  try {
    const out = await callSite({ method: method as (typeof HTTP_METHODS)[number], url: call.url, headers, body: options.body, scope: {}, literal: true, dry, ms: Math.min(HTTP_LIMITS.ms, left) });
    said.push(out.dry ? `↗ ${out.line} (dry)` : `↗ ${out.line} → ${out.status}`);
    return { value: out.dry ? { status: 0, ok: true, body: null, dry: true } : { status: out.status, ok: out.ok, body: out.body, type: out.type, ...(out.cut ? { cut: true } : {}) } };
  } catch (e) {
    if (e instanceof SiteError) {
      said.push(`↗ ${method} ✕ ${e.message}`.slice(0, 300));
      return { error: e.message };
    }
    throw e;
  }
}

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
      let ownerId = s.owner === undefined ? null : rowName(fill(s.owner, scope)) || null;
      // The one who started the run isn't a shopper (the admin trying it, a key): the row is the store's.
      if (ownerId && ownerId === ctx.caller.id && ctx.caller.kind !== "customer") ownerId = null;
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
    case "push": {
      // A notification on shoppers' phones (lib/push.ts), sent in the background.
      if (budget.used.messages >= FN_LIMITS.messages) throw new Failure(`A run sends up to ${FN_LIMITS.messages} messages`, at);
      const title = words(fill(s.title, scope)).trim().slice(0, PUSH_LIMITS.title);
      if (!title) throw new Failure("Nothing to say (the title is empty)", at);
      let userId: string | null = null;
      if (s.who === "customer") {
        const to = words(fill(s.to ?? "", scope)).trim();
        if (!to) throw new Failure("Which customer? (nobody here)", at);
        const user = await prisma.user.findFirst({ where: EMAIL.test(to) ? { email: to.toLowerCase() } : { id: to }, select: { id: true } });
        if (!user) throw new Failure(`No customer "${to.slice(0, 60)}"`, at);
        userId = user.id;
      }
      let link: string | null;
      try {
        link = shopPath(words(fill(s.link ?? "", scope)));
      } catch {
        throw new Failure("A place in the shop starts with / (/shop)", at);
      }
      if (!(await pushSettings()).on) throw new Failure("Notifications are switched off (Settings → the app)", at);
      budget.used.messages += 1;
      budget.counts.sent += 1;
      const phones = await pushAudienceCount(s.who, userId);
      if (dry) return ["wouldPush", s.who, phones];
      // Nobody's phone said yes: nothing to send, and nothing wrong.
      if (phones) await queuePush({ title, body: words(fill(s.text ?? "", scope)), url: link, audience: s.who, userId, from: "function" });
      return ["pushed", s.who, phones];
    }
    case "call": {
      if (ctx.depth >= FN_LIMITS.calls) throw new Failure(`Functions call each other ${FN_LIMITS.calls} deep at most`, at);
      const fn = await prisma.fn.findUnique({ where: { id: s.fn }, select: { name: true, live: true, enabled: true } });
      const def = fn ? defOf(fn.live) : null;
      if (!fn) throw new Failure("The function it calls isn't there any more", at);
      if (!def) throw new Failure(`"${fn.name}" isn't published`, at);
      if (!fn.enabled) throw new Failure(`"${fn.name}" is switched off`, at);
      // The one called reads its own site's settings (if it is part of one).
      const inner = await runDef(def, filled(s.input ?? {}), { dry, depth: ctx.depth + 1, budget, caller: ctx.caller, fnId: s.fn, settings: await fnSettings(s.fn) });
      if (!inner.ok) throw new Failure(`${fn.name}: ${inner.error}`, at);
      if (s.as) scope[s.as] = inner.value;
      return ["called", fn.name];
    }
    case "http": {
      // A call to a site the owner allowed (lib/fnHttp.ts): its secrets go in as it leaves, and nowhere else.
      if (budget.used.http >= HTTP_LIMITS.calls) throw new Failure(`A run calls sites up to ${HTTP_LIMITS.calls} times`, at);
      budget.used.http += 1;
      let out;
      try {
        out = await callSite({ method: s.method, url: s.url, headers: s.headers, body: s.body, scope, dry, ms: Math.max(500, budget.deadline - Date.now()) });
      } catch (e) {
        if (e instanceof SiteError) throw new Failure(e.message, at);
        throw e;
      }
      // Tried, not made: the steps after it see an answer with nothing in it.
      if (s.as) scope[s.as] = out.dry ? { status: 0, ok: true, body: null, dry: true } : { status: out.status, ok: out.ok, body: out.body, type: out.type, ...(out.cut ? { cut: true } : {}) };
      if (out.dry) return ["wouldCall", out.line];
      if (!out.ok && !s.anyStatus) throw new Failure(`${out.line} answered ${out.status}`, at);
      return ["answered", out.line, out.status];
    }
    case "ready": {
      // Through a ready connection (lib/fnReady.ts): the kind's own site, with the connection's own key. It counts as a call to a site.
      if (budget.used.http >= HTTP_LIMITS.calls) throw new Failure(`A run calls sites up to ${HTTP_LIMITS.calls} times`, at);
      budget.used.http += 1;
      let out;
      try {
        out = await useReady({ id: s.via, what: s.what, give: s.give ?? {}, scope, dry, ms: Math.max(500, budget.deadline - Date.now()) });
      } catch (e) {
        if (e instanceof SiteError) throw new Failure(e.message, at);
        throw e;
      }
      if (s.as) scope[s.as] = out.dry ? { status: 0, ok: true, body: null, dry: true } : { status: out.status, ok: out.ok, body: out.body };
      if (out.dry) return ["wouldUse", out.line];
      // The service's "no" stops the run, with its own words for why.
      // (A "no" inside a "yes", GraphQL's errors in a 200, is said as one: "answered 200" would read as a yes.)
      if (!out.ok) throw new Failure(out.status >= 200 && out.status < 300 ? `${out.line} said no${out.why ? `: ${out.why}` : ""}` : `${out.line} answered ${out.status}${out.why ? `: ${out.why}` : ""}`, at);
      return ["used", out.line];
    }
    case "code": {
      // In its cage (lib/fnCode.ts): handed these values and nothing else, it gives one back; its calls to sites are made
      // here, as an "http" step's are (the run's own count and time, the owner's sites and secrets), each said in its lines.
      const calls: string[] = [];
      const out = await runCode(s.code, fill(s.give ?? {}, scope), { http: (call) => codeCall(call, ctx, dry, calls) });
      const said = [...calls, ...out.logs].slice(0, 60);
      if (said.length) ctx.logged = said;
      if (!out.ok) throw new Failure(out.line ? `${out.error} (line ${out.line})` : out.error, at);
      if (s.as) scope[s.as] = out.value;
      return ["ran", out.ms];
    }
    case "coupon":
    case "stock":
    case "customer":
    case "pay": {
      // The store itself (lib/fnStore.ts, lib/payLinks.ts): its own limit in a run, beside the rows a run writes.
      if (budget.used.store >= FN_LIMITS.store) throw new Failure(`A run changes the store up to ${FN_LIMITS.store} times`, at);
      const text = (v: unknown) => words(fill(v ?? "", scope));
      try {
        if (s.act === "pay") {
          const amount = fill(s.amount, scope);
          const days = s.days === undefined ? undefined : fill(s.days, scope);
          for (const [v, rule] of [[amount, STORE_NUMBERS.sum], [days, STORE_NUMBERS.payDays]] as const) {
            const problem = numberProblem(v, rule);
            if (problem) throw new Failure(problem, at);
          }
          if (isBlank(amount)) throw new Failure("The sum is empty", at);
          const made = await makePayRequest({ title: text(s.title), amount: Number(typeof amount === "string" ? amount.trim() : amount), ref: text(s.ref), email: text(s.email), phone: text(s.phone), days: isBlank(days) ? undefined : Number(typeof days === "string" ? days.trim() : days), back: text(s.back), lang, fnId: ctx.fnId ?? null }, dry);
          budget.used.store += 1;
          budget.counts.store += 1;
          if (s.as) scope[s.as] = made;
          return dry ? ["wouldAsk", made.title, `${made.amount} ${made.currency}`] : ["asked", made.title, `${made.amount} ${made.currency}`];
        }
        if (s.act === "coupon") {
          const made = await makeCoupon({ code: text(s.code), off: s.off, value: fill(s.value, scope), max: s.max === undefined ? undefined : fill(s.max, scope), minCart: s.minCart === undefined ? undefined : fill(s.minCart, scope), uses: s.uses === undefined ? undefined : fill(s.uses, scope), days: s.days === undefined ? undefined : fill(s.days, scope), phone: text(s.phone), note: text(s.note) }, dry);
          budget.used.store += 1;
          budget.counts.store += 1;
          if (s.as) scope[s.as] = made;
          const off = made.off === "percent" ? `${made.value}%` : String(made.value);
          return dry ? ["wouldCoupon", made.code, off] : ["couponMade", made.code, off];
        }
        if (s.act === "stock") {
          const done = await changeStock({ sku: text(s.sku), how: s.how, amount: fill(s.amount, scope), reason: text(s.reason) }, dry, budget.stock);
          budget.used.store += 1;
          budget.counts.store += 1;
          if (s.as) scope[s.as] = done;
          return dry ? ["wouldStock", done.sku, done.before, done.after] : ["stocked", done.sku, done.before, done.after];
        }
        const done = await markCustomer({ who: text(s.who), mark: s.mark, what: text(s.what) }, dry, lang);
        if (s.as) scope[s.as] = done.customer;
        const who = done.customer.name || done.customer.email;
        if (s.mark === "read") return ["customer", who];
        budget.used.store += 1;
        if (done.changed) budget.counts.store += 1;
        const said = { giveRole: ["gaveRole", "wouldGiveRole"], takeRole: ["tookRole", "wouldTakeRole"], join: ["joined", "wouldJoin"], leave: ["left", "wouldLeave"] } as const;
        return [said[s.mark][dry ? 1 : 0], done.shown, who];
      } catch (e) {
        if (e instanceof StoreError || e instanceof PayError) throw new Failure(e.message, at);
        throw e;
      }
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
    // What a code step logged goes on its own line, done or failed.
    const log = ctx.logged;
    ctx.logged = undefined;
    if (budget.trace.length < TRACE_MAX) budget.trace.push({ ...l, ...(l.say ? { note: english(l.say) } : {}), ...(log?.length ? { log } : {}) });
  };
  for (let k = 0; k < steps.length; k++) {
    const s = steps[k];
    const at = `${base}.${k}`;
    if (budget.counts.steps >= FN_LIMITS.executed) throw new Failure(`A run does up to ${FN_LIMITS.executed} steps`, at);
    if (Date.now() > budget.deadline) throw new Failure(`A run takes ${budget.ms / 1000} seconds at most`, at);
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
/** The inputs as the run keeps them (lib/fnInputs.ts); the first problem stops it. */
function readInputs(inputs: FnInput[], raw: Record<string, unknown>): Record<string, unknown> {
  const { values, problems } = inputsRead(inputs, raw);
  if (problems.length) throw new Failure(problems[0].message, "inputs");
  return values;
}

const newBudget = (ms: number = FN_LIMITS.ms): Budget => ({ deadline: Date.now() + ms, ms, used: { writes: 0, messages: 0, http: 0, store: 0 }, trace: [], counts: { steps: 0, found: 0, added: 0, changed: 0, deleted: 0, sent: 0, store: 0 }, pretend: new Map(), stock: new Map() });

/** A definition run with what it was handed. Never throws: a failure is the outcome. `ms`: a shorter time than a run's own (a test's). */
export async function runDef(def: FnDef, input: Record<string, unknown>, opts: { dry?: boolean; depth?: number; budget?: Budget; caller?: FnCaller; ms?: number; /** The saved function it is (a payment it asks for says which). */ fnId?: string; /** Its whole site's settings, private ones too (lib/siteSettings.ts): "{{settings.x}}". */ settings?: RunSettings | null } = {}): Promise<Outcome> {
  const t0 = Date.now();
  const budget = opts.budget ?? newBudget(opts.ms ? Math.min(opts.ms, FN_LIMITS.ms) : undefined);
  // A function inside another keeps its own steps' lines to itself; the limits and counts are shared.
  const own: Budget = opts.budget ? { ...budget, trace: [] } : budget;
  const caller = opts.caller ?? SYSTEM;
  const ctx: Ctx = { dry: !!opts.dry, lang: def.lang ?? "ar", depth: opts.depth ?? 0, budget: own, tables: new Map(), caller, fnId: opts.fnId };
  const scope: Scope = { now: new Date().toISOString(), caller: { kind: caller.kind, id: caller.id ?? null, name: caller.name ?? null, email: caller.email ?? null, roles: caller.roles ?? [], groups: caller.groups ?? [], discordId: caller.discordId ?? null, steamId: caller.steamId ?? null } };
  // A whole site's function reads its site's settings, words in its own language.
  if (opts.settings) scope.settings = valuesIn(opts.settings.values, opts.settings.decls, ctx.lang);
  const done = (ok: boolean, value: unknown, error: string | null, failedAt: string | null): Outcome => {
    // What it promises to give back is looked at, never enforced on a run: what the run did is done.
    const shape = ok ? answerProblem(def.gives, value) : null;
    return { ok, dry: ctx.dry, value: ok ? value : null, error, failedAt, trace: own.trace, counts: own.counts, ms: Date.now() - t0, ...(shape ? { shape } : {}) };
  };
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

/** A whole site's settings as a run is handed them. */
type RunSettings = NonNullable<Awaited<ReturnType<typeof settingsFor>>>;
/** The settings of the whole site a function is part of (none: it is in no site that has any). */
export const fnSettings = (fnId: string) => settingsFor("function", fnId);

const some = (counts: Counts) => Object.fromEntries(Object.entries(counts).filter(([k, n]) => k !== "steps" && n > 0));

/* ---------------- Its own tests (F4; lib/fnTests.ts) ---------------- */

/** How a test went: whether it passed (else why not), and what the run it made came to. */
export type TestResult = { id: string; name: string; pass: boolean; why: TestWhy | null; /** With "shape": how the answer differs from what is promised. */ said?: string; ok: boolean; value: unknown; valueCut?: boolean; error: string | null; failedAt: string | null; ms: number };
export type TestsOutcome = { results: TestResult[]; passed: number; failed: number; ms: number };

/**
 * A function's tests run against these steps, one after another, each as a try-out (nothing is
 * written or sent). Each has its own few seconds, and all of them together a limit: a test that
 * never got its turn didn't pass.
 */
export async function runTests(def: FnDef, tests: FnTest[], caller: FnCaller, settings?: RunSettings | null): Promise<TestsOutcome> {
  const t0 = Date.now();
  const results: TestResult[] = [];
  for (const test of tests) {
    const left = TEST_LIMITS.total - (Date.now() - t0);
    if (left <= 0) {
      results.push({ id: test.id, name: test.name, pass: false, why: "time", ok: false, value: null, error: null, failedAt: null, ms: 0 });
      continue;
    }
    // Run as the member who asked, under the name and address the test says (where the steps name the caller).
    const as: FnCaller = { ...caller, ...(test.caller?.name ? { name: test.caller.name } : {}), ...(test.caller?.email ? { email: test.caller.email.toLowerCase() } : {}) };
    const out = await runDef(def, test.input, { dry: true, caller: as, ms: Math.min(TEST_LIMITS.ms, left), settings });
    const why = verdict(test, out);
    // What it gave back is shown beside what was expected: the beginning of a long one.
    const big = JSON.stringify(out.value ?? null).length > 4000;
    results.push({ id: test.id, name: test.name, pass: !why, why, ...(why === "shape" && out.shape ? { said: out.shape } : {}), ok: out.ok, value: big ? null : out.value, ...(big ? { valueCut: true } : {}), error: out.error, failedAt: out.failedAt, ms: out.ms });
  }
  const failed = results.filter((r) => !r.pass).length;
  return { results, passed: results.length - failed, failed, ms: Date.now() - t0 };
}

/** How much of a run's steps the run log keeps: so many lines, each thing said cut to so many letters. */
export const LOG_STEPS = { lines: 40, text: 120, error: 300 } as const;
/** Who a message went to isn't the log's to keep whole: an address keeps its first letter and its site, a phone number its last two digits. */
const hush = (s: string) =>
  s
    .replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g, "$1•••@$2")
    .replace(/\+\d[\d\s-]{6,}\d|\b0\d{8,10}\b/g, (m) => `•••${m.replace(/\D/g, "").slice(-2)}`);
/**
 * A run's steps as the run log keeps them (lib/runs.ts `detail.steps`): where each step is, what
 * it did or why it failed, and how long it took. A long run keeps how it began and how it ended.
 * What a code step wrote with log() isn't kept (it is the code's own to say anything in).
 */
export function stepsForLog(trace: TraceLine[]): unknown[] {
  const line = (l: TraceLine) => ({
    at: l.at,
    act: l.act,
    ok: l.ok,
    ms: l.ms,
    ...(l.say ? { say: l.say.map((x) => (typeof x === "string" ? hush(x).slice(0, LOG_STEPS.text) : x)) } : {}),
    ...(l.error ? { error: hush(l.error).slice(0, LOG_STEPS.error) } : {}),
  });
  if (trace.length <= LOG_STEPS.lines) return trace.map(line);
  const tail = 10;
  return [...trace.slice(0, LOG_STEPS.lines - tail).map(line), { cut: trace.length - LOG_STEPS.lines }, ...trace.slice(-tail).map(line)];
}

/**
 * A saved function run: its published steps (or, from the admin's editor, the draft). A real run is
 * written in the run log and counted on the function; a dry one leaves no trace anywhere.
 */
export async function runFn(id: string, input: Record<string, unknown>, opts: { dry?: boolean; which?: "live" | "draft"; trigger: string; caller?: FnCaller; /** Only when it is switched on (everything but the admin's own run). */ needOn?: boolean; /** The published version to run: the one that was published when the run was asked for (a run from the queue). */ version?: number }): Promise<Outcome> {
  const fn = await prisma.fn.findUnique({ where: { id } });
  if (!fn) throw new AppError(404, "FN_NOT_FOUND", "No such function");
  let def = defOf(opts.which === "draft" ? fn.draft : fn.live);
  if (!def) throw new AppError(409, opts.which === "draft" ? "FN_INVALID" : "FN_NOT_PUBLISHED", opts.which === "draft" ? "The draft can't be read" : "This function isn't published yet");
  let version = opts.which === "draft" ? null : (fn.version ?? null);
  if (opts.which !== "draft" && opts.version && opts.version !== fn.version) {
    // Asked for while another version was published: that one runs. (One that is no longer kept runs what is published now.)
    const then = await versionDef(fn.id, opts.version);
    if (then) {
      def = then;
      version = opts.version;
    }
  }
  // Off by itself, or as part of a feature that is switched off (admin → ميزاتي).
  if (opts.needOn && (!fn.enabled || (await switchedOff()).fns.has(fn.id))) throw new AppError(409, "FN_OFF", "This function is switched off");
  const t0 = Date.now();
  const out = await runDef(def, input, { dry: opts.dry, caller: opts.caller, fnId: fn.id, settings: await fnSettings(fn.id) });
  // Its line in the run log, said to who asked for the run: with it the owner finds what each step did.
  const runId = opts.dry ? undefined : newRunId();
  if (!opts.dry) {
    recordRun({ id: runId, kind: "function", name: fn.name, ref: fn.id, trigger: opts.trigger, subject: opts.caller && opts.caller.kind !== "system" && opts.caller.kind !== "admin" ? opts.caller.kind : null, startedAt: t0, ms: out.ms, ok: out.ok, result: out.ok ? some(out.counts) : null, error: out.error, detail: { ...(version ? { v: version } : {}), ...(out.shape ? { answer: out.shape } : {}), steps: stepsForLog(out.trace) } });
    await prisma.fn.update({ where: { id }, data: { runs: { increment: 1 }, lastRunAt: new Date(t0) } }).catch(() => undefined);
  }
  return { ...out, version, ...(runId ? { runId } : {}) };
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
      const fn = await prisma.fn.findUnique({ where: { id: p.fnId }, select: { enabled: true, live: true, version: true } });
      // The version that was published when it was asked for (lib/fnVersions.ts); one that isn't kept any more: what is published now.
      const then = fn && p.version && p.version !== fn.version ? await versionDef(p.fnId, p.version) : null;
      const def = then ?? (fn ? defOf(fn.live) : null);
      // Removed, unpublished or switched off (itself, or its feature) since it was asked for: nothing to run.
      if (!trigger?.enabled || !fn?.enabled || !def || (await switchedOff()).fns.has(p.fnId)) return { skipped: 1 };
      const input = p.row ? await rowInput(p.row, def.lang ?? "ar") : p.input ?? {};
      if (!input) return { skipped: 1 };
      await prisma.task.update({ where: { id: task.id }, data: { payload: { ...p, started: true } as unknown as Prisma.InputJsonValue } });
      const out = await inChain(p.chain ?? 1, () => runFn(p.fnId, input, { trigger: p.trigger, needOn: true, version: p.version }));
      await prisma.fnTrigger.update({ where: { id: trigger.id }, data: { fired: { increment: 1 }, lastAt: new Date() } }).catch(() => undefined);
      return out.ok ? { ran: 1 } : { ran: 1, stopped: 1 };
    },
    { maxAttempts: 3, timeoutMs: 30_000 },
  );
}
