/**
 * Live (stage 2, item 5 of docs/fullstack-platform-plan.ar.md): a shop page holds one stream open
 * (GET /v1/live, server-sent events) and is told when a row of a table it listens to is added,
 * changed or deleted, so a list reads itself again (a chat, a live board) and a recipe can say so
 * on the page ("a new message from …").
 *
 * What is told is only which row and what happened: `{ table, op, id, mine }`, never its values.
 * The page reads the row itself through the table's API, where the table's own rules answer.
 * And each listener hears only of rows it could read (`sees`): a key or a role's holder every
 * row; anyone the published ones (also one published before, so a row taken down leaves the
 * list); a shopper their own rows (added by them, by their group's members where the table says
 * so, or pointing at their email).
 *
 * Every change is numbered, and the last few minutes of them are kept: a page that comes back
 * with the last number it heard is told what it missed (`replayed`), else it reads its lists
 * again. A stream lasts a few minutes and is then closed by the server (`bye`), so a token that
 * ran out, a group changed or a table closed is looked at again on the next one.
 *
 * With several servers, a change is passed on through Redis (when the server has one) to the
 * others' listeners; each server numbers what it hears in its own run (`boot`).
 */
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import { getRedis } from "./redis.js";
import { reachFields } from "./dataApi.js";
import type { Field } from "./collectionTree.js";

/** "many": a lot of a table's rows at once (the admin's bulk change, an import): the page reads its list again. */
export type LiveOp = "added" | "changed" | "deleted" | "many";

export const LIVE_LIMITS = {
  /** Tables one stream listens to. */
  tables: 8,
  /** Streams open at once: one signed-in shopper's, one key's, one place's (anyone). */
  perShopper: 6,
  perKey: 20,
  perPlace: 60,
  /** Streams opened in a minute from one place (a page reconnecting in a loop). */
  opensPerMinute: 60,
  /** How long a stream stays open before the server closes it (the page opens the next at once). */
  lifeMs: 5 * 60_000,
  /** A comment every so often, so nothing on the way thinks the stream went quiet. */
  beatMs: 20_000,
  /** The changes kept for a page that comes back: so many, so long. */
  keep: 500,
  keepMs: 10 * 60_000,
} as const;

/** This server's run: a page's last number means something only to the run that gave it. */
export const BOOT = randomBytes(4).toString("hex");

/** A change as the listeners' server holds it: whose row, and who may hear of it. */
export type LiveFact = {
  table: string;
  slug: string;
  op: LiveOp;
  id: string;
  /** The shopper who added the row (null: the owner, a key, an import). */
  owner: string | null;
  /** Published now, or ever before (a row taken down is still heard of by those who saw it). */
  published: boolean;
  /** The emails the row points at through its customer fields, now and before the change (small letters). */
  emails: string[];
};
export type Kept = LiveFact & { seq: number; at: number };

/** What one listener may hear of in one table. */
export type Lens = { all: boolean; published: boolean; owners: ReadonlySet<string>; email: string | null };
export const sees = (lens: Lens, f: Pick<LiveFact, "op" | "owner" | "published" | "emails">): boolean =>
  f.op === "many" || lens.all || (lens.published && f.published) || (!!f.owner && lens.owners.has(f.owner)) || (!!lens.email && f.emails.includes(lens.email));

/** What a page is told of a change: the row and what happened, and whether the one listening added it. */
export type LiveNote = { table: string; op: LiveOp; id: string; mine: boolean };

export type Listener = {
  /** By the table's id. */
  lenses: Map<string, Lens>;
  /** The signed-in shopper listening (their own rows are `mine`). */
  me: string | null;
  /** Who holds it, for the counts: "c:<shopper>", "k:<key>", "p:<place>". */
  holder: string;
  send: (id: string, note: LiveNote) => void;
  close: () => void;
};

const listeners = new Set<Listener>();
const kept: Kept[] = [];
let seq = 0;

/** How many streams are open: all of them, or one holder's. */
export const openStreams = (holder?: string) => (holder ? [...listeners].filter((l) => l.holder === holder).length : listeners.size);
/**
 * When a page last stopped listening to a table: a change there is still kept for a while after, for a page that
 * comes back (a stream closed by the server, a phone that slept a moment). After that, changes to a table nobody
 * listens to aren't read at all; the last such one is noted (`skipped`), so a page coming back from before it is
 * never told it missed nothing.
 */
const heardAt = new Map<string, number>();
const skipped = new Map<string, number>();
const heard = (tableId: string, now = Date.now()) => [...listeners].some((l) => l.lenses.has(tableId)) || now - (heardAt.get(tableId) ?? -Infinity) < LIVE_LIMITS.keepMs;
const skip = (tableId: string) => void skipped.set(tableId, seq);

/** A change's number as a page keeps it ("<boot>.<n>"). */
export const eventId = (n: number) => `${BOOT}.${n}`;
/** Where the numbers stand now: a page that heard nothing yet comes back from here. */
export const lastId = () => eventId(seq);

function take(fact: LiveFact, now = Date.now()) {
  const k: Kept = { ...fact, seq: ++seq, at: now };
  kept.push(k);
  while (kept.length > LIVE_LIMITS.keep || (kept.length && now - kept[0].at > LIVE_LIMITS.keepMs)) kept.shift();
  for (const l of listeners) {
    const lens = l.lenses.get(fact.table);
    if (lens && sees(lens, fact)) tell(l, k);
  }
}
/** What a listener is told of a kept change. */
export const noteOf = (l: Pick<Listener, "me">, k: Kept): LiveNote => ({ table: k.slug, op: k.op, id: k.id, mine: !!l.me && k.owner === l.me });
function tell(l: Listener, k: Kept) {
  try {
    l.send(eventId(k.seq), noteOf(l, k));
  } catch {
    l.close();
  }
}

/**
 * What a page that comes back missed, from the number it last heard ("<boot>.<n>"): null when that number isn't
 * this run's or the changes after it aren't all kept any more (the page reads its lists again).
 */
export function missed(l: Pick<Listener, "lenses">, last: string): Kept[] | null {
  const m = /^([0-9a-f]{8})\.(\d{1,12})$/.exec(last);
  if (!m || m[1] !== BOOT) return null;
  const n = Number(m[2]);
  if (n > seq) return null;
  // The one right after it must still be kept (or nothing came since).
  if (n < seq && (!kept.length || kept[0].seq > n + 1)) return null;
  // A change to one of its tables wasn't kept since.
  for (const table of l.lenses.keys()) if ((skipped.get(table) ?? -1) >= n) return null;
  return kept.filter((k) => k.seq > n && l.lenses.has(k.table) && sees(l.lenses.get(k.table)!, k));
}

/** A stream starts listening (what it missed, from `missed`, is told by the stream itself before this). */
export const listen = (l: Listener) => void listeners.add(l);
export function unlisten(l: Listener) {
  if (!listeners.delete(l)) return;
  const now = Date.now();
  for (const table of l.lenses.keys()) heardAt.set(table, now);
  if (heardAt.size > 1000) heardAt.clear();
}

/** Every stream closed (the server is going down: it waits for open requests otherwise). */
export function closeLive() {
  for (const l of [...listeners]) l.close();
  for (const l of [...listeners]) unlisten(l);
}

/* ---------------- A change, from the write to every server's listeners ---------------- */

const lower = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null);
const TABLE_TTL_MS = 10_000;
const tables = new Map<string, { at: number; slug: string; fields: Field[] } | null>();

async function tableOf(id: string) {
  const known = tables.get(id);
  if (known !== undefined && known && Date.now() - known.at < TABLE_TTL_MS) return known;
  const c = await prisma.collection.findUnique({ where: { id }, select: { slug: true, fields: true } });
  const out = c ? { at: Date.now(), slug: c.slug, fields: (Array.isArray(c.fields) ? c.fields : []) as Field[] } : null;
  if (tables.size > 500) tables.clear();
  tables.set(id, out);
  return out;
}

/** A change, as the listeners' servers need it: read once, where the write happened. */
export async function factOf(op: LiveOp, tableId: string, rowId: string, before?: unknown): Promise<LiveFact | null> {
  const [table, row] = await Promise.all([tableOf(tableId), prisma.collectionItem.findUnique({ where: { id: rowId }, select: { status: true, publishedAt: true, ownerId: true, data: true } })]);
  if (!table) return null;
  const to = reachFields(table.fields);
  const emails = new Set<string>();
  for (const data of [row?.data, before]) {
    const d = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
    for (const id of d ? to : []) {
      const email = lower(d![id]);
      if (email) emails.add(email);
    }
  }
  return { table: tableId, slug: table.slug, op, id: rowId, owner: row?.ownerId ?? null, published: !!row && (row.status === "PUBLISHED" || !!row.publishedAt), emails: [...emails] };
}

/* Several servers: each change goes to the others through Redis (when the server has one). */
const CHANNEL = "estabrek:live";
type Relay = { publish: (message: string) => void; subscribe: (on: (message: string) => void) => void; close?: () => void };
let relay: Relay | null | undefined;

function redisRelay(): Relay | null {
  const redis = getRedis();
  if (!redis) return null;
  let sub: ReturnType<typeof redis.duplicate> | null = null;
  return {
    publish: (message) => void redis.publish(CHANNEL, message).catch(() => {}),
    subscribe: (on) => {
      sub = redis.duplicate();
      sub.on("error", () => {});
      sub.on("message", (channel: string, message: string) => {
        if (channel === CHANNEL) on(message);
      });
      void sub.subscribe(CHANNEL).catch((e: unknown) => console.error("[live] relay:", e instanceof Error ? e.message : e));
    },
    close: () => {
      try {
        sub?.disconnect();
      } catch {
        // gone already
      }
    },
  };
}

/** Another server's change (its own come back too, and are left: they were told here already). */
function hear(message: string) {
  try {
    const m = JSON.parse(message) as { from?: unknown; fact?: LiveFact };
    const f = m.fact;
    if (m.from !== BOOT && f && typeof f.table === "string" && typeof f.slug === "string" && typeof f.id === "string" && Array.isArray(f.emails)) take(f);
  } catch {
    // not ours
  }
}
function relayed(): Relay | null {
  if (relay !== undefined) return relay;
  relay = redisRelay();
  relay?.subscribe(hear);
  return relay;
}

/** For tests: changes passed on through this instead of Redis (null: none). */
export function setLiveRelay(next: Relay | null) {
  relay?.close?.();
  relay = next;
  next?.subscribe(hear);
}

/** A row was added, changed or deleted (lib/fnTriggers.ts emitRow): the listeners that may hear of it are told. Never fails the write. */
export async function announce(op: LiveOp, tableId: string, rowId: string, before?: unknown) {
  const out = relayed();
  // Nobody listens to it here (nor did a moment ago), and no other server to tell: nothing to read.
  if (!out && !heard(tableId)) return skip(tableId);
  const fact = await factOf(op, tableId, rowId, before);
  if (!fact) return;
  take(fact);
  out?.publish(JSON.stringify({ from: BOOT, fact }));
}

/** A lot of a table's rows changed at once (no row is named): every page listening to it reads it again. */
export async function announceMany(tableId: string) {
  const out = relayed();
  if (!out && !heard(tableId)) return skip(tableId);
  const table = await tableOf(tableId);
  if (!table) return;
  const fact: LiveFact = { table: tableId, slug: table.slug, op: "many", id: "", owner: null, published: false, emails: [] };
  take(fact);
  out?.publish(JSON.stringify({ from: BOOT, fact }));
}

/** For tests: nothing kept, nobody listening, numbers from the start. */
export function resetLiveForTests() {
  closeLive();
  kept.length = 0;
  seq = 0;
  tables.clear();
  heardAt.clear();
  skipped.clear();
}
