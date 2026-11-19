/**
 * The page's one live stream (the backend's GET /v1/live, lib/live.ts): told at once when a row of the owner's
 * tables is added, changed or deleted, one the visitor may read. A list that updates by itself (RowsView.tsx,
 * `stream`) reads itself again; a recipe waiting for a row ("row", TreeTriggers.tsx) runs with the row's values.
 *
 * However many lists and recipes listen, the page holds one stream for all their tables (opened a moment after
 * the first one asks, opened again when the set of tables changes). It is read with fetch, as whoever is signed in
 * (the shop's hands: components/RecipeHands.tsx), never EventSource (which can't carry the shopper's token).
 *
 * The server closes a stream every few minutes ("bye"): the next one opens at once, with the last change heard,
 * and is told what it missed. When it can't be (the server restarted, or too long away), the tables are read
 * again ("again"). The same when who's signed in changes. A failure tries again a little later each time; a stream
 * refused (none of its tables open to this visitor) isn't asked for again until who's signed in changes, or the
 * tables asked change. A tab hidden for a while lets its stream go, and comes back to it when it's seen.
 */
import { WHO_EVENT, whenHands } from "./recipeHands";

export const LIVE_OPS = ["added", "changed", "deleted", "many"] as const;
export type LiveNote = { table: string; op: (typeof LIVE_OPS)[number]; id: string; mine: boolean };
/** What a listener hears: a change, or "again": read the table again (what changed meanwhile isn't known). */
export type LiveSignal = LiveNote | { table: string; op: "again" };

/** Tables in one stream (the backend's LIVE_LIMITS.tables). */
export const LIVE_TABLES = 8;
/** How long after a failure the stream is tried again: longer each time. */
export const RETRY_MS = [1000, 2000, 5000, 10_000, 30_000] as const;
/** A tab hidden this long lets its stream go. */
export const HIDDEN_MS = 60_000;

const TABLE = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** One event of a stream as the server wrote it. */
export type SseEvent = { event: string; id: string; data: string };
/** The whole events in what came so far (a blank line ends one); what's left waits for more. Comments and `retry:` are no events. */
export function sseEvents(buf: string): { events: SseEvent[]; rest: string } {
  const text = buf.replace(/\r\n?/g, "\n");
  const events: SseEvent[] = [];
  let from = 0;
  for (let at = text.indexOf("\n\n"); at >= 0; at = text.indexOf("\n\n", from)) {
    const block = text.slice(from, at);
    from = at + 2;
    const ev: SseEvent = { event: "message", id: "", data: "" };
    let any = false;
    for (const line of block.split("\n")) {
      const colon = line.indexOf(":");
      if (colon === 0) continue;
      const name = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
      if (name === "event") (ev.event = value), (any = true);
      else if (name === "data") (ev.data = ev.data ? `${ev.data}\n${value}` : value), (any = true);
      else if (name === "id") ev.id = value;
    }
    if (any) events.push(ev);
  }
  return { events, rest: text.slice(from) };
}

/** A change as the server tells it, checked (anything else is nothing). */
export function liveNoteOf(raw: unknown): LiveNote | null {
  const n = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!n || typeof n.table !== "string" || !TABLE.test(n.table) || !(LIVE_OPS as readonly unknown[]).includes(n.op)) return null;
  const id = typeof n.id === "string" && /^[A-Za-z0-9_-]{0,60}$/.test(n.id) ? n.id : null;
  if (id === null || (n.op !== "many" && !id)) return null;
  return { table: n.table, op: n.op as LiveNote["op"], id, mine: n.mine === true };
}

/* ---------------- The page's stream ---------------- */

type Fn = (s: LiveSignal) => void;
const subs = new Map<string, Set<Fn>>();
let open: { tables: string; ctrl: AbortController } | null = null;
/** The last change heard ("<run>.<n>"): a stream opened again starts after it. */
let last = "";
let fails = 0;
let timer = 0;
let hiddenAt = 0;
let hideTimer = 0;
let wired = false;
/** The tables of a stream that was refused: not asked for again as they are. */
let refused = "";

const wantedTables = () => [...subs.keys()].filter((t) => (subs.get(t)?.size ?? 0) > 0).sort().slice(0, LIVE_TABLES);
const tell = (s: LiveSignal) => subs.get(s.table)?.forEach((fn) => { try { fn(s); } catch { /* one listener's trouble isn't the others' */ } });
const againAll = (tables: string[]) => tables.forEach((table) => tell({ table, op: "again" }));

function soon(ms: number) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void connect(), ms);
}
function drop() {
  open?.ctrl.abort();
  open = null;
}

async function connect() {
  const tables = wantedTables();
  const key = tables.join(",");
  if (open && open.tables === key) return;
  drop();
  if (!tables.length || document.visibilityState === "hidden" || key === refused) return;
  const hands = await whenHands();
  if (!hands?.live || wantedTables().join(",") !== key || open) return;
  const ctrl = new AbortController();
  const mine = { tables: key, ctrl };
  open = mine;
  const out = await hands.live(tables, last, ctrl.signal);
  if (open !== mine) return;
  if (!out.ok) {
    open = null;
    // Not open to this visitor: asked again only when who's signed in changes (or other tables are asked).
    if (out.status >= 400 && out.status < 500 && out.status !== 429) {
      refused = key;
      return;
    }
    fails += 1;
    return soon(RETRY_MS[Math.min(fails - 1, RETRY_MS.length - 1)] * (out.status === 429 ? 3 : 1));
  }
  let bye = false;
  const reader = out.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done || open !== mine) break;
      const got = sseEvents(buf + dec.decode(value, { stream: true }));
      buf = got.rest;
      for (const ev of got.events) {
        if (ev.event === "ready") {
          fails = 0;
          let said: { replayed?: unknown; at?: unknown } = {};
          try { said = JSON.parse(ev.data) as typeof said; } catch { /* said nothing */ }
          // Opened again without what was missed: what this page shows may be old.
          if (last && said.replayed !== true) againAll(tables);
          // Where the numbers stand: a stream that hears nothing still comes back from here.
          if ((!last || said.replayed !== true) && typeof said.at === "string" && /^[0-9a-f]{8}\.\d{1,12}$/.test(said.at)) last = said.at;
        } else if (ev.event === "row") {
          if (ev.id) last = ev.id;
          let note: LiveNote | null = null;
          try { note = liveNoteOf(JSON.parse(ev.data)); } catch { /* not a change */ }
          if (note) tell(note);
        } else if (ev.event === "bye") bye = true;
      }
    }
  } catch {
    // closed here, or the connection dropped
  }
  if (open !== mine) return;
  open = null;
  // The server closed it on time: the next one at once. Anything else: a moment later, longer each time.
  if (bye) soon(50);
  else soon(RETRY_MS[Math.min(fails++, RETRY_MS.length - 1)]);
}

function wire() {
  if (wired) return;
  wired = true;
  // Who's signed in changed: the stream is theirs now (their rows, their groups).
  window.addEventListener(WHO_EVENT, () => {
    if (!open && !refused) return;
    refused = "";
    drop();
    soon(50);
  });
  document.addEventListener("visibilitychange", () => {
    window.clearTimeout(hideTimer);
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      hideTimer = window.setTimeout(drop, HIDDEN_MS);
    } else if (!open || Date.now() - hiddenAt > HIDDEN_MS) soon(50);
  });
}

/** `fn` hears of the changes to a table (by its address) while the page is open. Returns how to stop. */
export function listenLive(table: string, fn: Fn): () => void {
  if (typeof window === "undefined" || !TABLE.test(table)) return () => {};
  wire();
  let set = subs.get(table);
  if (!set) subs.set(table, (set = new Set()));
  const had = set.size;
  set.add(fn);
  if (!had) soon(60);
  return () => {
    const now = subs.get(table);
    if (!now?.delete(fn)) return;
    if (!now.size) {
      subs.delete(table);
      soon(60);
    }
  };
}

/** For tests: how the page's stream stands. */
export const liveState = () => ({ tables: open?.tables ?? "", last, fails, refused });
