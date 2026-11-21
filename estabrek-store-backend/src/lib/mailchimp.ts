/**
 * The newsletter → the store's Mailchimp audience (admin → الإعدادات → النشرة البريدية → Mailchimp). Each new
 * subscriber (modules/ugc subscribeNewsletter) goes to the audience through the queue (lib/tasks.ts), so a moment
 * when Mailchimp doesn't answer is tried again later; the owner can also send the ones from before. The key is kept
 * sealed (lib/secretBox.ts) and never sent back to the admin; a subscriber who reached the audience is marked
 * (NewsletterSubscriber.mailchimpAt). Adding is Mailchimp's PUT of a member: safe to repeat, it never adds one twice.
 */
import { createHash } from "node:crypto";
import { prisma } from "./prisma.js";
import { SITE_ROW_ORDER } from "./siteRow.js";
import { open } from "./secretBox.js";
import { enqueueTask, registerTask } from "./tasks.js";

export const MAILCHIMP_TASK = "mailchimp-member";
/** At most this many from before are sent in one go (the rest the next time it's pressed). */
export const MAILCHIMP_SYNC_LIMIT = 5000;
type Fetch = typeof fetch;

/** A key's data centre, the part after its last dash ("…-us21"); none = not a Mailchimp key. */
export function dataCentre(key: string): string | null {
  const m = /^[0-9a-f]{16,64}-([a-z]{2,4}\d{1,3})$/i.exec(key.trim());
  return m ? m[1].toLowerCase() : null;
}
/** Mailchimp names a member by the MD5 of the lower-cased address. */
export const memberHash = (email: string) => createHash("md5").update(email.trim().toLowerCase()).digest("hex");

export class MailchimpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call(key: string, path: string, init: { method?: string; body?: unknown } = {}, f: Fetch = fetch): Promise<any> {
  const dc = dataCentre(key);
  if (!dc) throw new MailchimpError(400, "Not a Mailchimp API key (it ends in -us21 or the like)");
  const res = await f(`https://${dc}.api.mailchimp.com/3.0${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Basic ${Buffer.from(`store:${key.trim()}`).toString("base64")}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new MailchimpError(res.status, String((data && (data.detail || data.title)) || `Mailchimp answered ${res.status}`).slice(0, 300));
  return data;
}

/** The key's audiences, to pick one (it checks the key on the way). */
export async function mailchimpLists(key: string, f?: Fetch): Promise<Array<{ id: string; name: string; members: number }>> {
  const data = await call(key, "/lists?count=100&fields=lists.id,lists.name,lists.stats.member_count", {}, f);
  return (Array.isArray(data?.lists) ? data.lists : []).map((l: any) => ({ id: String(l.id), name: String(l.name ?? ""), members: Number(l.stats?.member_count ?? 0) }));
}

/** One subscriber in the audience: added as subscribed (or asked to confirm first), one already there left as they are. */
export async function putMember(key: string, listId: string, email: string, doubleOptIn: boolean, f?: Fetch) {
  return call(key, `/lists/${encodeURIComponent(listId)}/members/${memberHash(email)}`, { method: "PUT", body: { email_address: email.trim().toLowerCase(), status_if_new: doubleOptIn ? "pending" : "subscribed" } }, f);
}

export type MailchimpConnection = { key: string; listId: string; doubleOptIn: boolean };
/** The store's connection when it's switched on with a key and an audience (none otherwise). */
export async function mailchimpConnection(): Promise<MailchimpConnection | null> {
  const s = await prisma.siteSettings.findFirst({ orderBy: SITE_ROW_ORDER, select: { mailchimpEnabled: true, mailchimpApiKey: true, mailchimpListId: true, mailchimpDoubleOptIn: true } });
  if (!s?.mailchimpEnabled || !s.mailchimpApiKey || !s.mailchimpListId) return null;
  try {
    return { key: open(s.mailchimpApiKey), listId: s.mailchimpListId, doubleOptIn: s.mailchimpDoubleOptIn };
  } catch {
    return null; // sealed with another server key: the owner types it again
  }
}

/** A subscriber sent to the audience through the queue (`run`: one more go for an address sent before). */
export async function queueMailchimp(email: string, run?: string): Promise<boolean> {
  if (!(await mailchimpConnection())) return false;
  const address = email.trim().toLowerCase();
  await enqueueTask(MAILCHIMP_TASK, { email: address }, { key: `mailchimp:${address}${run ? `:${run}` : ""}` });
  return true;
}

/** The subscribers not in the audience yet (from before it was connected, or that failed), each queued. */
export async function queueAllMailchimp(): Promise<number> {
  if (!(await mailchimpConnection())) return 0;
  const run = Date.now().toString(36);
  const rows = await prisma.newsletterSubscriber.findMany({ where: { mailchimpAt: null }, select: { email: true }, orderBy: { createdAt: "asc" }, take: MAILCHIMP_SYNC_LIMIT });
  for (const r of rows) await queueMailchimp(r.email, run);
  return rows.length;
}

/** What the task does: one address into the audience; an address Mailchimp refuses for itself isn't tried again. */
export async function sendMailchimpMember(payload: unknown, f?: Fetch): Promise<Record<string, unknown>> {
  const email = (payload as { email?: unknown } | null)?.email;
  if (typeof email !== "string" || !email.includes("@")) throw new Error("No email address");
  const c = await mailchimpConnection();
  if (!c) return { skipped: "Mailchimp isn't connected (switched off meanwhile)" };
  const had = await prisma.newsletterSubscriber.findUnique({ where: { email }, select: { mailchimpAt: true } });
  if (had?.mailchimpAt) return { skipped: "Already in the audience" };
  try {
    await putMember(c.key, c.listId, email, c.doubleOptIn, f);
  } catch (e) {
    const message = (e as Error).message;
    // Seen by the owner on the newsletter's Mailchimp card (only on a failure: a success writes nothing to the settings).
    await prisma.siteSettings.updateMany({ data: { mailchimpError: `${email}: ${message}`.slice(0, 400) } });
    // The address itself refused (fake, unsubscribed before, cleaned): asking again won't change it.
    if (e instanceof MailchimpError && e.status >= 400 && e.status < 500 && ![401, 403, 404, 429].includes(e.status)) return { refused: message };
    throw e;
  }
  await prisma.newsletterSubscriber.updateMany({ where: { email }, data: { mailchimpAt: new Date() } });
  return { sent: email };
}

/** At start: new subscribers are tasks of kind "mailchimp-member". */
export function startMailchimp() {
  registerTask(MAILCHIMP_TASK, (payload) => sendMailchimpMember(payload), { maxAttempts: 6, timeoutMs: 30_000 });
}
