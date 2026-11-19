import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetHits } from "../lib/hitLimit.js";
import { forgetShoppers } from "../modules/data/data.routes.js";
import { BOOT, closeLive, eventId, missed, resetLiveForTests, sees, setLiveRelay, type Lens } from "../lib/live.js";

// Live (stage 2, item 5): a shop page holds one stream open (GET /v1/live) and is told when a row of a table it
// listens to is added, changed or deleted: which row and what happened, never its values, and only rows it could
// read. A page that comes back with the last id it heard is told what it missed. The stream is real here: the app
// listens on a port and the spec reads it as a page would (fetch, line by line).

const PREFIX = "live-spec-";
const CHAT = `${PREFIX}chat`;
const BOARD = `${PREFIX}board`;
const NOTES = `${PREFIX}notes`;
const admin = "/v1/admin";
type Obj = Record<string, any>;
type Ev = { event: string; id?: string; data: any };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let server: Server;
let base = "";
let chat = "";
let board = "";
let notes = "";
let mona = "";
let sami = "";
let dana = "";
let key = "";
const streams: Array<{ close: () => void }> = [];

const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const open = (id: string, settings: Obj) => request(app).put(`${admin}/api/tables/${id}`).send({ read: "off", create: "off", update: "off", delete: "off", ...settings });
const auth = (req: request.Test, who: string | null) => (!who ? req : who.startsWith("ek_") ? req.set("X-Api-Key", who) : req.set("Authorization", `Bearer ${who}`));
const add = (table: string, who: string | null, body: Obj) => auth(request(app).post(`/v1/data/${table}`), who).send(body);
const change = (table: string, row: string, who: string | null, body: Obj) => auth(request(app).patch(`/v1/data/${table}/${row}`), who).send(body);
const remove = (table: string, row: string, who: string | null) => auth(request(app).delete(`/v1/data/${table}/${row}`), who);

/** A stream as a page reads it: its events in order, as they come. */
function stream(tables: string, who: string | null, after?: string) {
  const ctrl = new AbortController();
  const events: Ev[] = [];
  const out = { events, status: 0, body: null as any, ended: false };
  const headers: Record<string, string> = {};
  if (who) headers[who.startsWith("ek_") ? "X-Api-Key" : "Authorization"] = who.startsWith("ek_") ? who : `Bearer ${who}`;
  if (after) headers["Last-Event-ID"] = after;
  const done = (async () => {
    const res = await fetch(`${base}/v1/live?tables=${tables}`, { headers, signal: ctrl.signal });
    out.status = res.status;
    if (!res.ok) {
      out.body = await res.json();
      return;
    }
    expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    try {
      for (;;) {
        const { value, done: over } = await reader.read();
        if (over) break;
        buf += dec.decode(value, { stream: true });
        let at: number;
        while ((at = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, at);
          buf = buf.slice(at + 2);
          if (block.startsWith(":") || block.startsWith("retry:")) continue;
          const ev: Ev = { event: "message", data: null };
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) ev.event = line.slice(7);
            else if (line.startsWith("data: ")) ev.data = JSON.parse(line.slice(6));
            else if (line.startsWith("id: ")) ev.id = line.slice(4);
          }
          events.push(ev);
        }
      }
    } catch {
      // closed by the spec
    }
    out.ended = true;
  })();
  const until = async (pred: (e: Ev) => boolean, ms = 4000): Promise<Ev> => {
    const end = Date.now() + ms;
    for (;;) {
      const found = events.find(pred);
      if (found) return found;
      if (Date.now() > end) throw new Error(`Not heard; heard: ${JSON.stringify(events)}`);
      await sleep(15);
    }
  };
  const close = () => ctrl.abort();
  streams.push({ close });
  return Object.assign(out, { done, until, close, rows: () => events.filter((e) => e.event === "row").map((e) => e.data), ready: () => until((e) => e.event === "ready") });
}
const rowEv = (id: string, op?: string) => (e: Ev) => e.event === "row" && e.data.id === id && (!op || e.data.op === op);

async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}
async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.apiKey.deleteMany({ where: { name: "Live spec" } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@live-spec.test" } } });
  forgetKeys();
  forgetHits();
  forgetShoppers();
}

beforeAll(async () => {
  await clean();
  await setAccounts(true);
  resetLiveForTests();
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const [a, b, c] = await Promise.all(["mona", "sami", "dana"].map((name) => prisma.user.create({ data: { email: `${name}@live-spec.test`, name } })));
  // Mona and Dana share a group.
  await prisma.user.update({ where: { id: a.id }, data: { groups: ["live-team"] } });
  await prisma.user.update({ where: { id: c.id }, data: { groups: ["live-team"] } });
  forgetShoppers();
  [mona, sami, dana] = [a, b, c].map((u) => signCustomerToken(u.id));
  // A chat: each shopper reads their own messages and the ones sent to them.
  chat = await mk(CHAT, [{ id: "text", type: "text", required: true }, { id: "to", type: "customer" }]);
  // A board everyone reads (the published rows); only a key writes.
  board = await mk(BOARD, [{ id: "title", type: "text", required: true }]);
  // Notes a group shares.
  notes = await mk(NOTES, [{ id: "text", type: "text", required: true }]);
  await open(chat, { read: "customer", create: "customer", update: "customer", delete: "customer" }).expect(200);
  await open(board, { read: "public", create: "key", update: "key" }).expect(200);
  await open(notes, { read: "customer", create: "customer", group: true }).expect(200);
  key = (await request(app).post(`${admin}/api/keys`).send({ name: "Live spec", scopes: { tables: "*", acts: ["read", "create", "update", "delete"] } }).expect(201)).body.secret as string;
});
afterAll(async () => {
  for (const s of streams) s.close();
  closeLive();
  await new Promise((r) => server.close(r));
  setLiveRelay(null);
  await clean();
  await setAccounts(false);
});
beforeEach(() => {
  forgetHits();
});

describe("Who hears of what", () => {
  const all: Lens = { all: true, published: false, owners: new Set(), email: null };
  const anyone: Lens = { all: false, published: true, owners: new Set(), email: null };
  const shopper: Lens = { all: false, published: false, owners: new Set(["u1", "u2"]), email: "mona@x.test" };
  const fact = (f: Partial<Parameters<typeof sees>[1]>) => ({ op: "added" as const, owner: null, published: false, emails: [], ...f });
  test("a key or a role every row; anyone the published ones (and ones published before); a shopper their own and their group's, and the ones pointing at them", () => {
    expect(sees(all, fact({}))).toBe(true);
    expect(sees(anyone, fact({}))).toBe(false);
    expect(sees(anyone, fact({ published: true }))).toBe(true);
    expect(sees(shopper, fact({ owner: "u2" }))).toBe(true);
    expect(sees(shopper, fact({ owner: "u3" }))).toBe(false);
    expect(sees(shopper, fact({ owner: "u3", emails: ["mona@x.test"] }))).toBe(true);
    expect(sees(shopper, fact({ owner: "u3", published: true }))).toBe(false);
    // A lot at once names no row: everyone listening reads again.
    expect(sees(shopper, fact({ op: "many" }))).toBe(true);
  });
  test("what a page that comes back missed: only this run's numbers, only while they are all kept", () => {
    const l = { lenses: new Map([["t", all]]) };
    expect(missed(l, `${BOOT === "00000000" ? "11111111" : "00000000"}.0`)).toBeNull();
    expect(missed(l, `${BOOT}.0`)).toEqual([]);
    expect(missed(l, "not-an-id")).toBeNull();
    expect(missed(l, `${BOOT}.999999999`)).toBeNull();
  });
});

describe("The stream", () => {
  test("refused before it starts: no tables, too many, none open, a shopper's table without one", async () => {
    const none = stream("", null);
    await none.done;
    expect(none.status).toBe(400);
    const many = stream(Array.from({ length: 9 }, (_, i) => `t${i}`).join(","), null);
    await many.done;
    expect(many.status).toBe(400);
    const nowhere = stream(`${PREFIX}nothing`, null);
    await nowhere.done;
    expect(nowhere.status).toBe(404);
    const guest = stream(CHAT, null);
    await guest.done;
    expect(guest).toMatchObject({ status: 401, body: { error: "SIGN_IN_NEEDED" } });
  });

  test("a chat: the one who wrote and the one written to hear of it; nobody else; never its words", async () => {
    const m = stream(CHAT, mona);
    const s = stream(CHAT, sami);
    const d = stream(CHAT, dana);
    const k = stream(`${CHAT},${BOARD}`, key);
    for (const x of [m, s, d, k]) await x.ready();
    expect(k.events[0]).toMatchObject({ event: "ready", data: { tables: [CHAT, BOARD], closed: [], replayed: false } });
    // Where the numbers stand: a page that hears nothing yet still comes back from there.
    expect(k.events[0].data.at).toMatch(new RegExp(`^${BOOT}\\.\\d+$`));

    // Mona writes to herself: hers alone (and the key's).
    const own = (await add(CHAT, mona, { values: { text: "note to self" } }).expect(201)).body;
    expect((await m.until(rowEv(own.id))).data).toEqual({ table: CHAT, op: "added", id: own.id, mine: true });
    expect((await k.until(rowEv(own.id))).data).toMatchObject({ mine: false });
    // Mona writes to Sami: Sami hears of it too.
    const msg = (await add(CHAT, mona, { values: { text: "hi Sami", to: "sami@live-spec.test" } }).expect(201)).body;
    expect((await s.until(rowEv(msg.id))).data).toEqual({ table: CHAT, op: "added", id: msg.id, mine: false });
    await m.until(rowEv(msg.id));
    await change(CHAT, msg.id, mona, { values: { text: "hi Sami!" } }).expect(200);
    await s.until(rowEv(msg.id, "changed"));
    await remove(CHAT, msg.id, mona).expect(200);
    await s.until(rowEv(msg.id, "deleted"));
    await m.until(rowEv(msg.id, "deleted"));
    await sleep(150);
    // Sami never heard of Mona's note to herself; Dana (in Mona's group, but this table isn't shared) of nothing.
    expect(s.rows().map((r) => r.id)).not.toContain(own.id);
    expect(d.rows()).toEqual([]);
    // Never a value.
    expect(JSON.stringify(k.events)).not.toContain("hi Sami");
    for (const x of [m, s, d, k]) x.close();
  });

  test("a group's table: a member hears of what a fellow member added", async () => {
    const d = stream(NOTES, dana);
    const s = stream(NOTES, sami);
    await d.ready();
    await s.ready();
    const row = (await add(NOTES, mona, { values: { text: "team plan" } }).expect(201)).body;
    expect((await d.until(rowEv(row.id))).data).toMatchObject({ op: "added", mine: false });
    await sleep(150);
    expect(s.rows()).toEqual([]);
    d.close();
    s.close();
  });

  test("a board: anyone hears of published rows, and of one taken down; never of a draft", async () => {
    const anyone = stream(BOARD, null);
    await anyone.ready();
    const draft = (await add(BOARD, key, { status: "DRAFT", values: { title: "coming soon" } }).expect(201)).body;
    const shown = (await add(BOARD, key, { status: "PUBLISHED", values: { title: "open today" } }).expect(201)).body;
    await anyone.until(rowEv(shown.id, "added"));
    expect(anyone.rows().map((r) => r.id)).not.toContain(draft.id);
    await change(BOARD, shown.id, key, { status: "DRAFT" }).expect(200);
    await anyone.until(rowEv(shown.id, "changed"));
    // The owner publishes many at once: one "many", no row named.
    await request(app).post(`${admin}/collections/${board}/rows/bulk`).send({ query: {}, op: "publish" }).expect(200);
    expect((await anyone.until((e) => e.event === "row" && e.data.op === "many")).data).toEqual({ table: BOARD, op: "many", id: "", mine: false });
    anyone.close();
  });

  test("a page that comes back is told what it missed; with an id of another run, it reads again", async () => {
    const first = stream(BOARD, null);
    await first.ready();
    const a = (await add(BOARD, key, { status: "PUBLISHED", values: { title: "first" } }).expect(201)).body;
    const last = (await first.until(rowEv(a.id))).id!;
    expect(last).toMatch(new RegExp(`^${BOOT}\\.\\d+$`));
    first.close();
    await first.done;
    const b = (await add(BOARD, key, { status: "PUBLISHED", values: { title: "while away" } }).expect(201)).body;
    const back = stream(BOARD, null, last);
    const ready = await back.ready();
    expect(ready.data.replayed).toBe(true);
    await back.until(rowEv(b.id, "added"));
    expect(back.rows().map((r) => r.id)).not.toContain(a.id);
    back.close();
    const other = stream(BOARD, null, `${BOOT === "00000000" ? "11111111" : "00000000"}.3`);
    expect((await other.ready()).data.replayed).toBe(false);
    other.close();
  });

  test("a change to a table nobody listens to isn't read; a page coming back from before it reads its list again", async () => {
    const quiet = await mk(`${PREFIX}quiet`, [{ id: "title", type: "text", required: true }]);
    await open(quiet, { read: "public", create: "key" }).expect(200);
    const b = stream(BOARD, null);
    await b.ready();
    const row = (await add(BOARD, key, { status: "PUBLISHED", values: { title: "a mark" } }).expect(201)).body;
    const last = (await b.until(rowEv(row.id))).id!;
    b.close();
    await add(`${PREFIX}quiet`, key, { status: "PUBLISHED", values: { title: "while nobody listened" } }).expect(201);
    await sleep(50);
    const back = stream(`${PREFIX}quiet`, null, last);
    expect((await back.ready()).data.replayed).toBe(false);
    back.close();
  });

  test("so many streams at once for one shopper; the server going down says bye to each", async () => {
    const mine = Array.from({ length: 6 }, () => stream(CHAT, sami));
    for (const x of mine) await x.ready();
    const more = stream(CHAT, sami);
    await more.done;
    expect(more).toMatchObject({ status: 429, body: { error: "TOO_MANY_STREAMS" } });
    closeLive();
    for (const x of mine) {
      await x.until((e) => e.event === "bye");
      await x.done;
      expect(x.ended).toBe(true);
    }
  });

  test("with several servers: another server's change is told here; this server's own, coming back, isn't told twice", async () => {
    const heard: string[] = [];
    let deliver: (message: string) => void = () => {};
    setLiveRelay({ publish: (m) => heard.push(m), subscribe: (on) => void (deliver = on) });
    const anyone = stream(BOARD, null);
    await anyone.ready();
    const row = (await add(BOARD, key, { status: "PUBLISHED", values: { title: "here" } }).expect(201)).body;
    await anyone.until(rowEv(row.id));
    // What this server passed on, and the same coming back to it.
    await sleep(50);
    const sent = heard.map((m) => JSON.parse(m)).find((m) => m.fact.id === row.id);
    expect(sent).toMatchObject({ from: BOOT, fact: { slug: BOARD, op: "added", id: row.id, published: true } });
    deliver(JSON.stringify(sent));
    // Another server's.
    deliver(JSON.stringify({ from: "other123", fact: { ...sent.fact, op: "changed" } }));
    await anyone.until(rowEv(row.id, "changed"));
    await sleep(100);
    expect(anyone.rows().filter((r) => r.id === row.id).map((r) => r.op)).toEqual(["added", "changed"]);
    expect(eventId(1)).toBe(`${BOOT}.1`);
    anyone.close();
    setLiveRelay(null);
  });
});
