/**
 * Outgoing webhooks (F6; admin → Webhooks طالعة): the events the owner chose are sent to an
 * address of theirs.
 *
 * - An endpoint: a name, an https address, the events it wants (a row of the owner's tables
 *   added / changed / deleted, of every table or of chosen ones; the store's own events: a new
 *   order, low stock…) and a signing secret, made here and shown once.
 * - A delivery: one event for one endpoint. Its body is written once ({ id, event, at, data })
 *   and sent letter for letter, signed: HMAC-SHA256 over "<delivery id>.<seconds>.<body>" with the
 *   secret's bytes, in the headers webhook-id / webhook-timestamp / webhook-signature ("v1,<base64>").
 *   Every try is signed again with the moment it leaves, so a receiver can refuse an old one.
 * - Sending goes through the queue (lib/tasks.ts): a delivery that isn't answered 2xx is tried
 *   again after a growing wait, eight times over about fifteen hours, then it has failed. So a
 *   delivery arrives at least once, and may arrive twice: the receiver tells by its id.
 * - An endpoint whose deliveries keep failing for good is paused (and the owner told), and one
 *   that is far behind isn't piled on.
 * - Deliveries are kept two weeks for the owner to read and send again, then removed.
 *
 * The call itself is lib/fnHttp.ts `sendRaw`: https, a site by its name, an address out on the
 * internet, no redirect followed, a few seconds.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma.js";
import { TRIGGERS } from "./automations.js";
import type { Field } from "./collectionTree.js";
import { apiRow, type LinkModes } from "./dataApi.js";
import { HTTP_LIMITS, SiteError, sendRaw } from "./fnHttp.js";
import { relationsOf, withLinks } from "./links.js";
import { shownRow } from "./schemaChange.js";
import { open } from "./secretBox.js";
import { enqueueTask, registerTask, retryDelayMs } from "./tasks.js";

export const WEBHOOK_ROW_EVENTS = ["row.added", "row.changed", "row.deleted"] as const;
/** The store's own events: the ones the automations know (lib/automations.ts). */
export const WEBHOOK_STORE_EVENTS = TRIGGERS;
export const WEBHOOK_EVENTS: readonly string[] = [...WEBHOOK_ROW_EVENTS, ...WEBHOOK_STORE_EVENTS];
/** The event of a try the owner asks for from the page. */
export const PING = "ping";
export const WEBHOOK_TASK = "webhook-out";
export const WEBHOOK_LIMITS = {
  endpoints: 20,
  tables: 50,
  name: 60,
  url: 500,
  /** Tries of one delivery before it has failed. */
  tries: 8,
  /** Deliveries waiting for one endpoint; past this, new events aren't queued for it. */
  waiting: 1000,
  /** Deliveries failed for good in a row before the endpoint is paused. */
  pauseAfter: 10,
  keepDays: 14,
  ms: HTTP_LIMITS.ms,
  /** A receiver's clock may differ from ours by this much (seconds) and a delivery still counts as fresh. */
  freshSeconds: 300,
} as const;

/* ---------------- The signature ---------------- */

const PREFIX = "whsec_";
/** A new signing secret: 24 random bytes in base64 behind the prefix receivers' libraries know. */
export const newSecret = () => `${PREFIX}${randomBytes(24).toString("base64")}`;
const keyOf = (secret: string) => Buffer.from(secret.startsWith(PREFIX) ? secret.slice(PREFIX.length) : secret, "base64");

/** One delivery's signature: "v1,<base64 of HMAC-SHA256 over '<id>.<seconds>.<body>'>". */
export function sign(secret: string, id: string, seconds: number, body: string): string {
  return `v1,${createHmac("sha256", keyOf(secret)).update(`${id}.${seconds}.${body}`).digest("base64")}`;
}

/** What a receiver does with a delivery: is it signed with this secret, and fresh. (The page's own try and the tests use it.) */
export function verify(secret: string, headers: { id: string; timestamp: string; signature: string }, body: string, now = Date.now()): boolean {
  const seconds = Number(headers.timestamp);
  if (!Number.isInteger(seconds) || Math.abs(now / 1000 - seconds) > WEBHOOK_LIMITS.freshSeconds) return false;
  const mine = Buffer.from(sign(secret, headers.id, seconds, body));
  // Several signatures may be sent (a secret being renewed): any one of them is enough.
  return headers.signature.split(" ").some((s) => {
    const theirs = Buffer.from(s);
    return theirs.length === mine.length && timingSafeEqual(theirs, mine);
  });
}

/* ---------------- The endpoints that are on (read every few seconds, at once after a change) ---------------- */

type Live = { id: string; events: string[]; tables: string[] };
let cache: { at: number; list: Live[] } | null = null;
export function forgetEndpoints() {
  cache = null;
}
async function liveEndpoints(now = Date.now()): Promise<Live[]> {
  if (!cache || now - cache.at > 10_000) cache = { at: now, list: await prisma.webhookEndpoint.findMany({ where: { enabled: true }, select: { id: true, events: true, tables: true } }) };
  return cache.list;
}

/* ---------------- An event → deliveries ---------------- */

/** What is sent. One too large to send whole says what it is about and that the rest was left out (the receiver reads the row itself). */
export function bodyOf(p: { id: string; event: string; at: string; data: unknown }): string {
  const whole = JSON.stringify(p);
  if (Buffer.byteLength(whole) <= HTTP_LIMITS.body) return whole;
  const d = (p.data ?? {}) as { table?: unknown; row?: { id?: unknown; slug?: unknown } };
  return JSON.stringify({ ...p, data: { ...(d.table ? { table: d.table } : {}), ...(d.row ? { row: { id: d.row.id, slug: d.row.slug } } : {}), truncated: true } });
}

const eventId = () => `evt_${randomBytes(12).toString("base64url")}`;

/**
 * An event happened: a delivery is written for each endpoint that asked for it, and queued.
 * `data` is worked out once, and only when some endpoint wants the event (null: nothing to say,
 * nothing is sent). `table`: a row event's table, for the endpoints that chose their tables.
 */
export async function emitWebhooks(event: string, data: () => Promise<unknown> | unknown, opts: { table?: string } = {}): Promise<number> {
  const wanted = (await liveEndpoints()).filter((e) => e.events.includes(event) && (!opts.table || !e.tables.length || e.tables.includes(opts.table)));
  if (!wanted.length) return 0;
  const said = await data();
  if (said === null || said === undefined) return 0;
  const id = eventId();
  const body = bodyOf({ id, event, at: new Date().toISOString(), data: said });
  let queued = 0;
  for (const e of wanted) {
    // An endpoint that is far behind isn't piled on (it would never catch up): said on it, and this event skipped for it.
    if ((await prisma.webhookDelivery.count({ where: { endpointId: e.id, status: "waiting" } })) >= WEBHOOK_LIMITS.waiting) {
      await prisma.webhookEndpoint.updateMany({ where: { id: e.id }, data: { lastError: `More than ${WEBHOOK_LIMITS.waiting} deliveries are waiting: new events aren't queued until it catches up`, lastErrorAt: new Date() } });
      continue;
    }
    const d = await prisma.webhookDelivery.create({ data: { endpointId: e.id, event, eventId: id, body }, select: { id: true } });
    await enqueueTask(WEBHOOK_TASK, { delivery: d.id }, { key: `${WEBHOOK_TASK}:${d.id}` });
    queued += 1;
  }
  return queued;
}

/**
 * A row as a delivery says it: the table, the row as the data API answers it to a key that reads
 * everything (every field, words in all their languages, a relation as the rows it links), and
 * for a change the values as they were before.
 */
export async function rowHookData(tableId: string, rowId: string, before?: unknown): Promise<unknown | null> {
  const c = await prisma.collection.findUnique({ where: { id: tableId }, select: { id: true, slug: true, fields: true } });
  // (A deleted row is in the trash, and still read from there.)
  const row = c ? await prisma.collectionItem.findUnique({ where: { id: rowId } }) : null;
  if (!c || !row) return null;
  const fields = (Array.isArray(c.fields) ? c.fields : []) as Field[];
  const links: LinkModes = new Map(relationsOf(fields).map((f) => [f.id, "all" as const]));
  const [linked] = await withLinks(prisma, { id: c.id, fields }, [shownRow(row, fields)]);
  const now = apiRow(linked, fields, { lang: null, links });
  const was = before === undefined ? undefined : apiRow(shownRow({ ...row, data: before }, fields), fields, { lang: null }).values;
  return { table: { id: c.id, slug: c.slug }, row: { id: now.id, slug: now.slug, status: now.status, values: now.values, createdAt: now.createdAt, updatedAt: now.updatedAt, publishedAt: now.publishedAt }, ...(was ? { before: was } : {}) };
}

/** A row of the owner's tables was added, changed or deleted (lib/fnTriggers.ts emitRow calls this beside the functions' triggers). */
export function emitRowWebhooks(event: "added" | "changed" | "deleted", tableId: string, rowId: string, before?: unknown): Promise<number> {
  return emitWebhooks(`row.${event}`, () => rowHookData(tableId, rowId, event === "changed" ? before : undefined), { table: tableId });
}

/* ---------------- One try ---------------- */

export type Try = { ok: boolean; code: number | null; ms: number; error: string | null };
/** What a receiver answered, in a line: a page of HTML is read for its words, not its tags. */
export const oneLine = (s: string) =>
  s
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

/** One delivery sent once, signed with the moment it leaves. Never throws: how it went is its answer. */
export async function sendDelivery(d: { id: string; body: string }, e: { url: string; sealed: string }): Promise<Try> {
  let secret: string;
  try {
    secret = open(e.sealed);
  } catch {
    return { ok: false, code: null, ms: 0, error: "The signing secret can't be read (was the server's key changed?): renew it" };
  }
  const seconds = Math.floor(Date.now() / 1000);
  const t0 = Date.now();
  try {
    const got = await sendRaw({
      method: "POST",
      url: e.url,
      headers: { "content-type": "application/json", accept: "*/*", "user-agent": "store-webhooks/1", "webhook-id": d.id, "webhook-timestamp": String(seconds), "webhook-signature": sign(secret, d.id, seconds, d.body) },
      body: d.body,
      ms: WEBHOOK_LIMITS.ms,
    });
    const ok = got.status >= 200 && got.status < 300;
    // What a refusing receiver said, in a line: the owner reads why without opening their own logs.
    return { ok, code: got.status, ms: Date.now() - t0, error: ok ? null : `It answered ${got.status}${oneLine(got.text) ? `: ${oneLine(got.text)}` : ""}` };
  } catch (err) {
    return { ok: false, code: null, ms: Date.now() - t0, error: err instanceof SiteError ? err.message : "It couldn't be sent" };
  }
}

const bell = (name: string) =>
  prisma.adminNotification
    .create({ data: { title: "Webhook توقّف لحاله", body: `«${name}»: ${WEBHOOK_LIMITS.pauseAfter} تسليمات ورا بعض فشلت للآخر، فتوقّف. شغّله من صفحته لما يرجع العنوان يجاوب.`.slice(0, 300), link: "/admin/webhooks" } })
    .catch(() => undefined);

/** How a try went, written on the delivery and on its endpoint. `last`: there is no try after this one. */
async function settle(d: { id: string; endpointId: string }, out: Try, tries: number, last: boolean, counts = true) {
  const now = new Date();
  await prisma.webhookDelivery.updateMany({
    where: { id: d.id },
    data: { attempts: { increment: 1 }, code: out.code, ms: out.ms, error: out.error, status: out.ok ? "sent" : last ? "failed" : "waiting", nextAt: out.ok || last ? null : new Date(now.getTime() + retryDelayMs(tries)), finishedAt: out.ok || last ? now : null },
  });
  if (out.ok) {
    await prisma.webhookEndpoint.updateMany({ where: { id: d.endpointId }, data: { ...(counts ? { failures: 0 } : {}), lastOkAt: now } });
    return;
  }
  await prisma.webhookEndpoint.updateMany({ where: { id: d.endpointId }, data: { lastError: out.error, lastErrorAt: now, ...(last && counts ? { failures: { increment: 1 } } : {}) } });
  if (!last || !counts) return;
  // Failed for good, again and again: the endpoint is paused rather than tried for every new event.
  const e = await prisma.webhookEndpoint.findUnique({ where: { id: d.endpointId }, select: { name: true, failures: true, enabled: true } });
  if (e?.enabled && e.failures >= WEBHOOK_LIMITS.pauseAfter) {
    await prisma.webhookEndpoint.updateMany({ where: { id: d.endpointId }, data: { enabled: false, pausedAt: now } });
    forgetEndpoints();
    await bell(e.name);
  }
}

/** At start: deliveries are tasks of kind "webhook-out". A try that isn't answered 2xx fails the task's try, and the queue tries again later. */
export function startWebhooksOut() {
  registerTask(
    WEBHOOK_TASK,
    async (payload, task) => {
      const id = (payload as { delivery?: unknown } | null)?.delivery;
      if (typeof id !== "string") throw new Error("Not a webhook delivery");
      const d = await prisma.webhookDelivery.findUnique({ where: { id }, select: { id: true, endpointId: true, body: true, status: true, endpoint: { select: { url: true, sealed: true, enabled: true } } } });
      // Removed with its endpoint, or already through (a worker that died after sending).
      if (!d || d.status === "sent") return { skipped: 1 };
      if (!d.endpoint.enabled) {
        await prisma.webhookDelivery.updateMany({ where: { id }, data: { status: "failed", error: "The endpoint was switched off before this was sent", nextAt: null, finishedAt: new Date() } });
        return { skipped: 1 };
      }
      const out = await sendDelivery(d, d.endpoint);
      await settle(d, out, task.attempts, task.attempts >= WEBHOOK_LIMITS.tries);
      if (!out.ok) throw new Error(out.error ?? "Not delivered");
      return { sent: 1 };
    },
    { maxAttempts: WEBHOOK_LIMITS.tries, timeoutMs: 20_000 },
  );
}

/**
 * A try the owner asks for: one "ping" sent now, once, and kept in the log like any delivery.
 * It tells whether the address answers and the secret is the receiver's; it doesn't count toward
 * pausing the endpoint.
 */
export async function pingEndpoint(endpointId: string): Promise<(Try & { delivery: string }) | null> {
  const e = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId }, select: { id: true, url: true, sealed: true } });
  if (!e) return null;
  const id = eventId();
  const body = bodyOf({ id, event: PING, at: new Date().toISOString(), data: { message: "A test delivery: nothing happened in the store" } });
  const d = await prisma.webhookDelivery.create({ data: { endpointId: e.id, event: PING, eventId: id, body }, select: { id: true, endpointId: true } });
  const out = await sendDelivery({ id: d.id, body }, e);
  await settle(d, out, 1, true, false);
  return { ...out, delivery: d.id };
}

/** A delivery sent again from the log: a new round of tries (the receiver sees the same id). */
export async function resendDelivery(id: string): Promise<boolean> {
  const changed = await prisma.webhookDelivery.updateMany({ where: { id, status: { in: ["failed", "sent"] } }, data: { status: "waiting", nextAt: null, finishedAt: null } });
  if (!changed.count) return false;
  await enqueueTask(WEBHOOK_TASK, { delivery: id }, { key: `${WEBHOOK_TASK}:${id}:${Date.now()}` });
  return true;
}

/** The waits between a delivery's tries, in seconds (for the page to say). */
export const retryWaits = () => Array.from({ length: WEBHOOK_LIMITS.tries - 1 }, (_, i) => Math.round(retryDelayMs(i + 1) / 1000));

/** Deliveries older than the log keeps are removed (the job "tasksClean" calls this). */
export async function cleanDeliveries(now = Date.now()): Promise<{ removed: number }> {
  const out = await prisma.webhookDelivery.deleteMany({ where: { createdAt: { lt: new Date(now - WEBHOOK_LIMITS.keepDays * 24 * 60 * 60_000) } } });
  return { removed: out.count };
}
