import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signCustomerToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { forgetKeys } from "../lib/apiKeys.js";
import { forgetFeatures } from "../lib/features.js";
import { forgetHits } from "../lib/hitLimit.js";
import { forgetShoppers } from "../modules/data/data.routes.js";
import { withCollections } from "../lib/collections.js";
import { checkTree } from "../lib/pageTree.js";

// Lists from tables on shop pages (M): a collection list with a `feed` isn't drawn with the page; the shop reads
// its rows in the visitor's browser from the table's own API, as that visitor. Here: the two halves of a shopper's
// own rows (`mine=added`, `mine=tome`), a row answered also as a page shows it (`shown=1`), who added a row as far
// as its reader may know, a function that lets the one a request points at accept it, and the page as the shop
// gets it. Requests to /v1/admin without a token run as the test owner.

const PREFIX = "rowlist-spec-";
const R = `${PREFIX}requests`;
const N = `${PREFIX}notes`;
type Row = { id: string; slug: string; status: string; values: Record<string, any>; shown?: Record<string, string>; links?: Record<string, string> };
type Page = { data: Row[]; total: number };
const admin = "/v1/admin";
const api = (path = "") => `/v1/data${path}`;
const mk = async (slug: string, fields: unknown[]) => (await request(app).post(`${admin}/collections`).send({ slug, name: { en: slug }, fields }).expect(201)).body.id as string;
const open = (id: string, settings: Record<string, unknown>) => request(app).put(`${admin}/api/tables/${id}`).send({ read: "off", create: "off", update: "off", delete: "off", ...settings });
const as = (who: string | null) => {
  const head = (req: request.Test) => (!who ? req : who.startsWith("ek_") ? req.set("X-Api-Key", who) : req.set("Authorization", `Bearer ${who}`));
  return { get: (path: string) => head(request(app).get(api(path))), post: (path: string, body: object) => head(request(app).post(api(path))).send(body) };
};
// A row's words, whether they came in one language or in all of them.
const notes = (page: Page) => page.data.map((r) => (typeof r.values.note === "string" ? r.values.note : r.values.note?.en)).sort();

let requests = "";
let plain = "";
let sara = "";
let lina = "";
let dana = "";
let key = "";

async function setAccounts(on: boolean) {
  const s = (await prisma.siteSettings.findFirst()) ?? (await prisma.siteSettings.create({ data: {} }));
  await prisma.siteSettings.update({ where: { id: s.id }, data: { customerAccountsEnabled: on } });
  forgetFeatures();
}

async function clean() {
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.apiKey.deleteMany({ where: { name: "Row lists spec" } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@rowlist-spec.test" } } });
  forgetKeys();
  forgetHits();
  forgetShoppers();
  invalidateAccess();
}

beforeAll(async () => {
  await clean();
  await setAccounts(true);
  // Friend requests: the one who adds it owns it; `to` points at the friend.
  requests = await mk(R, [
    { id: "to", type: "customer", required: true },
    { id: "note", type: "text" },
    { id: "state", type: "select", options: [{ id: "waiting", name: { ar: "ناطر", en: "Waiting" } }, { id: "accepted", name: { ar: "مقبول", en: "Accepted" } }] },
    { id: "gift", type: "money" },
    { id: "seen", type: "boolean" },
    { id: "site", type: "link" },
  ]);
  // Notes everyone reads; no row points at anyone.
  plain = await mk(N, [{ id: "note", type: "text", required: true }]);
  const [a, b, c] = await Promise.all([
    prisma.user.create({ data: { email: "sara@rowlist-spec.test", name: "Sara Haddad" } }),
    prisma.user.create({ data: { email: "lina@rowlist-spec.test", name: "Lina Nasser" } }),
    prisma.user.create({ data: { email: "dana@rowlist-spec.test", name: "" } }),
  ]);
  sara = signCustomerToken(a.id);
  lina = signCustomerToken(b.id);
  dana = signCustomerToken(c.id);
  key = (await request(app).post(`${admin}/api/keys`).send({ name: "Row lists spec", scopes: { tables: "*", acts: ["read", "create", "update", "delete"] } }).expect(201)).body.secret as string;
  await open(requests, { read: "customer", create: "customer", update: "customer" }).expect(200);
  await open(plain, { read: "public", create: "customer" }).expect(200);
  // Sara asks Lina and Dana; Lina asks Sara; Dana (who has no name) asks Lina.
  await as(sara).post(`/${R}`, { values: { to: "lina@rowlist-spec.test", note: "Sara to Lina", state: "waiting", gift: 25, seen: false, site: "/shop" }, lang: "en" }).expect(201);
  await as(sara).post(`/${R}`, { values: { to: "dana@rowlist-spec.test", note: "Sara to Dana", state: "accepted" }, lang: "en" }).expect(201);
  await as(lina).post(`/${R}`, { values: { to: "sara@rowlist-spec.test", note: "Lina to Sara", state: "waiting" }, lang: "en" }).expect(201);
  await as(dana).post(`/${R}`, { values: { to: "lina@rowlist-spec.test", note: "Dana to Lina", state: "waiting" }, lang: "en" }).expect(201);
  await as(sara).post(`/${N}`, { values: { note: "Sara's note" }, lang: "en" }).expect(201);
});
afterAll(async () => {
  await clean();
  await setAccounts(false);
});
beforeEach(() => {
  forgetHits();
});

describe("A shop page's list reads the table's API as its visitor", () => {
  test("the two halves of a shopper's own rows: the ones they added, the ones that point at them", async () => {
    // A table open to shoppers: their rows are both halves; `mine` asks for one.
    expect(notes((await as(sara).get(`/${R}`).expect(200)).body)).toEqual(["Lina to Sara", "Sara to Dana", "Sara to Lina"]);
    expect(notes((await as(sara).get(`/${R}?mine=1`).expect(200)).body)).toEqual(["Lina to Sara", "Sara to Dana", "Sara to Lina"]);
    expect(notes((await as(sara).get(`/${R}?mine=added`).expect(200)).body)).toEqual(["Sara to Dana", "Sara to Lina"]);
    expect(notes((await as(sara).get(`/${R}?mine=tome`).expect(200)).body)).toEqual(["Lina to Sara"]);
    expect(notes((await as(lina).get(`/${R}?mine=tome`).expect(200)).body)).toEqual(["Dana to Lina", "Sara to Lina"]);
    // With a filter, as a list on a page asks: the requests still waiting for her; the total is of those.
    const waiting = (await as(lina).get(`/${R}?mine=tome&state[is]=waiting&sort=-createdAt&pageSize=1&page=1`).expect(200)).body as Page;
    expect([waiting.total, waiting.data.length]).toEqual([2, 1]);
    expect(notes((await as(dana).get(`/${R}?mine=tome&state[is]=accepted`).expect(200)).body)).toEqual(["Sara to Dana"]);
    // A table where no row points at anyone: nothing was sent to her; what she added is hers.
    expect((await as(sara).get(`/${N}?mine=tome`).expect(200)).body.total).toBe(0);
    expect(notes((await as(sara).get(`/${N}?mine=added`).expect(200)).body)).toEqual(["Sara's note"]);
    // It is a shopper's question: not anyone's, not a key's; and only these words.
    expect((await as(null).get(`/${N}?mine=tome`).expect(401)).body.error).toBe("SIGN_IN_NEEDED");
    expect((await as(key).get(`/${R}?mine=tome`).expect(400)).body.error).toBe("BAD_QUERY");
    expect((await as(sara).get(`/${R}?mine=theirs`).expect(400)).body.error).toBe("BAD_QUERY");
  });

  test("a row also as a page shows it: its words in the asked language, the address a field opens, who it is from", async () => {
    // Lina reads what was sent to her: her own whole name where it points at her, the sender by first name.
    const got = (await as(lina).get(`/${R}?mine=tome&shown=1&lang=ar&sort=createdAt`).expect(200)).body as Page;
    const first = got.data[0];
    expect(first.shown).toEqual({ to: "Lina Nasser", note: "Sara to Lina", state: "ناطر", gift: expect.stringContaining("25"), seen: "لا", $by: "Sara" });
    expect(first.links).toEqual({ site: "/shop" });
    // The values themselves are answered as before.
    expect(first.values).toMatchObject({ note: "Sara to Lina", state: "waiting", gift: 25, seen: false, to: { name: "Lina Nasser", me: true, email: "lina@rowlist-spec.test" } });
    // Dana has no name on her account: nothing stands in for it (never her email).
    expect(got.data[1].shown).toEqual({ to: "Lina Nasser", note: "Dana to Lina", state: "ناطر" });
    expect(JSON.stringify(got)).not.toContain("dana@rowlist-spec.test");
    expect(JSON.stringify(got)).not.toContain("sara@rowlist-spec.test");

    // Sara reads what she sent: the other's first name, her own name as the one who added it.
    const sent = (await as(sara).get(`/${R}?mine=added&shown=1&lang=en&note[contains]=Lina`).expect(200)).body as Page;
    expect(sent.data.map((r) => r.shown)).toEqual([{ to: "Lina", note: "Sara to Lina", state: "Waiting", gift: expect.stringContaining("25"), seen: "No", $by: "Sara Haddad" }]);
    // One row, by its address.
    const one = (await as(lina).get(`/${R}/${first.id}?shown=1&lang=en`).expect(200)).body as Row;
    expect(one.shown).toMatchObject({ state: "Waiting", $by: "Sara" });

    // Not asked for: not answered. Asked for oddly: refused.
    expect((await as(lina).get(`/${R}?mine=tome`).expect(200)).body.data[0]).not.toHaveProperty("shown");
    expect((await as(lina).get(`/${R}?shown=yes`).expect(400)).body.error).toBe("BAD_QUERY");
    // Who a row points at still can't be asked about without a key.
    await as(lina).get(`/${R}?shown=1&to[is]=sara@rowlist-spec.test`).expect(400);
  });

  test("where everyone reads: anyone gets the words, never who added the row; a key gets the email it would anyway", async () => {
    await prisma.collectionItem.updateMany({ where: { collectionId: plain }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    const anyone = (await as(null).get(`/${N}?shown=1&lang=en`).expect(200)).body as Page;
    expect(anyone.data.map((r) => r.shown)).toEqual([{ note: "Sara's note" }]);
    // Signed in but reading as everyone does: the rows aren't hers, so who added them isn't said.
    expect(((await as(lina).get(`/${N}?shown=1&lang=en`).expect(200)).body as Page).data[0].shown).toEqual({ note: "Sara's note" });
    // Her own rows of it: she is told it was her.
    expect(((await as(sara).get(`/${N}?mine=1&shown=1&lang=en`).expect(200)).body as Page).data[0].shown).toEqual({ note: "Sara's note", $by: "Sara Haddad" });
    const byKey = (await as(key).get(`/${R}?shown=1&lang=en&note[is]=Sara to Lina`).expect(200)).body as Page;
    expect(byKey.data[0].shown).toMatchObject({ to: "lina@rowlist-spec.test", state: "Waiting" });
    expect(byKey.data[0].shown).not.toHaveProperty("$by");
  });

  test("a button in a row: a function lets the one a request points at accept it, and nobody else", async () => {
    const id = (await request(app).post(`${admin}/functions`).send({ name: `${PREFIX}accept` }).expect(201)).body.id as string;
    const saved = (await request(app).put(`${admin}/functions/${id}`).send({ draft: { inputs: [{ name: "id", type: "text", required: true }], do: [
      { act: "get", table: requests, row: "{{input.id}}", as: "req" },
      { act: "if", if: [{ left: "{{req.to}}", cmp: "ne", right: "{{caller.email}}" }], do: [{ act: "stop", message: "This request isn't yours" }] },
      { act: "change", table: requests, row: "{{req.$id}}", values: { state: "accepted" } },
      { act: "return", value: "ok" },
    ] } }).expect(200)).body;
    expect(saved.problems).toEqual([]);
    await request(app).post(`${admin}/functions/${id}/publish`).expect(200);
    await request(app).post(`${admin}/functions/${id}/triggers`).send({ kind: "call", config: { who: "customer" }, slug: `${PREFIX}accept` }).expect(201);
    const call = (who: string, row: string) => request(app).post(`/v1/fn/${PREFIX}accept`).set("Authorization", `Bearer ${who}`).send({ input: { id: row } });
    const mine = (await as(lina).get(`/${R}?mine=tome&state[is]=waiting&note[is]=Sara to Lina`).expect(200)).body as Page;
    const row = mine.data[0].id;
    // The one who sent it can't accept it for her; neither can a stranger, nor anyone for a row that isn't there.
    expect((await call(sara, row).expect(422)).body).toMatchObject({ ok: false, error: "This request isn't yours" });
    expect((await call(dana, row).expect(422)).body.ok).toBe(false);
    expect((await call(lina, "no-such-row").expect(422)).body.ok).toBe(false);
    expect((await call(lina, row).expect(200)).body).toEqual({ ok: true, value: "ok" });
    // It left her waiting list and is among both shoppers' accepted rows.
    expect(notes((await as(lina).get(`/${R}?mine=tome&state[is]=waiting`).expect(200)).body)).toEqual(["Dana to Lina"]);
    expect(notes((await as(lina).get(`/${R}?mine=1&state[is]=accepted`).expect(200)).body)).toEqual(["Sara to Lina"]);
    expect(notes((await as(sara).get(`/${R}?mine=1&state[is]=accepted`).expect(200)).body)).toEqual(["Sara to Dana", "Sara to Lina"]);
  });

  test("the page as the shop gets it: the list's question and its card once, nobody's rows", async () => {
    const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: {}, children: [
      { id: "inbox", type: "collectionList", props: { collectionId: requests, feed: "tome", limit: 4, columns: 2, where: [{ field: "state", op: "is", value: "waiting" }], empty: { en: "No requests" }, signin: { en: "Sign in to see who asked" } }, children: [
        { id: "card", type: "stack", props: {}, children: [
          { id: "from", type: "heading", props: { level: 3, text: { en: "Someone" }, bind: { text: "$by" } } },
          { id: "note", type: "text", props: { text: { en: "Their words" }, bind: { text: "note" } } },
          { id: "yes", type: "button", props: { label: { en: "Accept" }, href: "/", triggers: [{ on: "click", do: [{ act: "fn", fn: `${PREFIX}accept`, input: { id: "{{row_id}}" } }] }] } },
        ] },
      ] },
    ] }] } };
    const checked = checkTree(tree);
    expect(checked.ok ? [] : checked.issues).toEqual([]);
    const drawn = (await withCollections(tree as never)) as any;
    const grid = drawn.root.children[0].children[0];
    expect(grid.type).toBe("grid");
    expect(grid.props).toEqual({ live: { table: R, feed: "tome", limit: 4, sort: "-createdAt", where: [{ field: "state", op: "is", value: "waiting" }], empty: { en: "No requests" }, signin: { en: "Sign in to see who asked" } } });
    expect(grid.children.map((c: { id: string }) => c.id)).toEqual(["card"]);
    expect(grid.children[0].children[0].props.bind).toEqual({ text: "$by" });
    expect(JSON.stringify(drawn)).not.toContain("Sara to Lina");
    // The editor's preview: the card as designed, without the question.
    const preview = (await withCollections(tree as never, { preview: true })) as any;
    expect(preview.root.children[0].children[0].props).toEqual({});
    expect(preview.root.children[0].children[0].children[0].children[0].props).toEqual({ level: 3, text: { en: "Someone" } });
  });
});
