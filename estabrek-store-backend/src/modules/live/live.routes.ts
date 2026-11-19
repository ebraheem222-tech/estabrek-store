/**
 * GET /v1/live?tables=chat,friends — the shop page's live stream (lib/live.ts): server-sent events
 * about the rows of these tables that the caller may read, as the automatic API reads them
 * (modules/data/data.routes.ts): through a key, as a role's holder, as a signed-in shopper, or as
 * anyone. A shopper sends their token in `Authorization: Bearer …` (so a page reads it with
 * fetch, not EventSource); a program its key.
 *
 *   event: ready   { tables: [the ones heard], closed: [the ones not], replayed, at }
 *                                                                                    first, once; `at`: where the
 *                                                                                    numbers stand (a page that heard
 *                                                                                    nothing yet comes back from there)
 *   event: row     { table, op: added|changed|deleted|many, id, mine }             with an id ("<run>.<n>")
 *   event: bye     {}                                                               the server closes it now;
 *                                                                                    open the next at once
 *   : beat                                                                          every so often
 *
 * A page that comes back sends the last id it heard (`Last-Event-ID`, or `?after=`): what it
 * missed comes first and `replayed` is true; false means it reads its lists again.
 *
 * Refused before it starts, as JSON: 400 (no tables, too many), 401 / 403 / 404 when not one of
 * the tables may be read (as the table's own address would answer), 429 too many streams.
 */
import { Router, type Request, type Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/async.js";
import { AppError } from "../../utils/httpError.js";
import { COLLECTION_SLUG } from "../../lib/collections.js";
import { apiCaller, callerOf, ipOf, type Caller } from "../../middleware/apiCaller.js";
import { allow, isOpen, tableFrom, type ApiTable } from "../../lib/dataApi.js";
import { switchedOff } from "../../lib/featureGate.js";
import { groupMates } from "../../lib/shopperRoles.js";
import { hit } from "../../lib/hitLimit.js";
import { LIVE_LIMITS, eventId, lastId, listen, missed, noteOf, openStreams, unlisten, type Lens, type Listener, type LiveNote } from "../../lib/live.js";

const r = Router();
r.use(apiCaller);

const TABLE = { id: true, slug: true, name: true, fields: true, api: true } as const;
const MINUTE = 60_000;

/** What one caller may hear of in a table they may read; why not otherwise. */
async function lensOf(table: ApiTable, who: Caller, mates: () => Promise<string[]>): Promise<Lens | "signInNeeded" | "closed"> {
  const verdict = allow(table.access, "read", who.key, table.id, who.customer, { mine: who.roles, table: table.roles });
  if (!("as" in verdict)) return verdict.no === "signInNeeded" ? "signInNeeded" : "closed";
  if (verdict.as === "key" || verdict.as === "role") return { all: true, published: false, owners: new Set(), email: null };
  // A shopper's own rows: the ones they added (and their group's members, where the table says so) and the ones pointing at them.
  const owners = new Set<string>(who.customer ? [who.customer, ...(table.group ? await mates() : [])] : []);
  return { all: false, published: verdict.as === "public", owners, email: who.customer ? who.email : null };
}

r.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const who = callerOf(req);
    const asked = [...new Set(String(req.query.tables ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))];
    if (!asked.length) throw new AppError(400, "BAD_QUERY", "Which tables: ?tables=a,b");
    if (asked.length > LIVE_LIMITS.tables) throw new AppError(400, "BAD_QUERY", `Up to ${LIVE_LIMITS.tables} tables in one stream`);
    if (asked.some((s) => !COLLECTION_SLUG.test(s))) throw new AppError(400, "BAD_QUERY", "A table by its address");

    // So many streams at once, and so many opened in a minute, from one holder.
    const place = ipOf(req);
    const holder = who.key ? `k:${who.key.id}` : who.customer ? `c:${who.customer}` : `p:${place}`;
    const most = who.key ? LIVE_LIMITS.perKey : who.customer ? LIVE_LIMITS.perShopper : LIVE_LIMITS.perPlace;
    const opened = await hit(`live:${place}`, MINUTE);
    if (openStreams(holder) >= most || opened.count > LIVE_LIMITS.opensPerMinute) {
      res.setHeader("Retry-After", String(opened.count > LIVE_LIMITS.opensPerMinute ? Math.max(1, Math.ceil((opened.resetAt - Date.now()) / 1000)) : 30));
      throw new AppError(429, "TOO_MANY_STREAMS", "Too many live streams open; close one first");
    }

    // Each table as its own address would answer a read: one that isn't open (or whose feature is off) isn't there.
    const [rows, off] = await Promise.all([prisma.collection.findMany({ where: { slug: { in: asked } }, select: TABLE }), switchedOff()]);
    let mates: Promise<string[]> | null = null;
    const matesOnce = () => (mates ??= groupMates(who.groups));
    const lenses = new Map<string, Lens>();
    const heard: string[] = [];
    const closed: string[] = [];
    let signIn = false;
    for (const slug of asked) {
      const c = rows.find((x) => x.slug === slug);
      const table = c ? tableFrom(c) : null;
      const lens = table && isOpen(table.access, table.roles) && !off.tables.has(table.id) ? await lensOf(table, who, matesOnce) : "closed";
      if (typeof lens === "string") {
        closed.push(slug);
        if (lens === "signInNeeded") signIn = true;
        continue;
      }
      lenses.set(table!.id, lens);
      heard.push(slug);
    }
    if (!heard.length) {
      if (signIn) throw new AppError(401, "SIGN_IN_NEEDED", "This needs a signed-in shopper");
      throw new AppError(404, "NOT_FOUND", "No such table, or it isn't open");
    }

    // The stream: never kept by a cache, never held back by a proxy, never counted as a slow answer.
    res.locals.stream = true;
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);

    let done = false;
    const write = (chunk: string) => {
      if (!done) res.write(chunk);
    };
    const timers: NodeJS.Timeout[] = [];
    const listener: Listener = {
      lenses,
      me: who.customer,
      holder,
      send: (id: string, note: LiveNote) => write(`id: ${id}\nevent: row\ndata: ${JSON.stringify(note)}\n\n`),
      close: () => end(true),
    };
    function end(sayBye: boolean) {
      if (done) return;
      if (sayBye) write("event: bye\ndata: {}\n\n");
      done = true;
      unlisten(listener);
      for (const t of timers) clearTimeout(t);
      res.end();
    }
    req.on("close", () => end(false));

    // "ready" first, then what a page that came back missed, then what happens from now on (all at once: nothing
    // can come in between).
    const after = String(req.get("last-event-id") ?? req.query.after ?? "").trim().slice(0, 40);
    const back = after ? missed(listener, after) : null;
    write("retry: 3000\n\n");
    write(`event: ready\ndata: ${JSON.stringify({ tables: heard, closed, replayed: back !== null, at: lastId() })}\n\n`);
    for (const k of back ?? []) listener.send(eventId(k.seq), noteOf(listener, k));
    listen(listener);
    timers.push(setInterval(() => write(": beat\n\n"), LIVE_LIMITS.beatMs));
    timers.push(setTimeout(() => end(true), LIVE_LIMITS.lifeMs));
  }),
);

export default r;
