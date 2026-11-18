import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { forgetConnections } from "../lib/fnHttp.js";

// Feature templates (stage 4), with the database: a feature the owner built goes out as one file
// (export), comes into a store as a draft under a feature that is off (install: new ids, and new
// addresses where they are taken, written wherever its pages use them), and leaves with everything
// it holds (remove: its tables' rows kept or deleted). Here the file is installed back into the
// store it came from, so every address is taken and has to move. Requests without a token run as
// the test owner.

const PREFIX = "ft-spec-";
const admin = "/v1/admin";
const at = `${admin}/my-features`;
type Obj = Record<string, any>;

async function mkTable(slug: string, fields: Obj[]) {
  return (await request(app).post(`${admin}/collections`).send({ slug: `${PREFIX}${slug}`, name: { ar: `جدول ${slug}`, en: slug }, fields }).expect(201)).body.id as string;
}
async function mkFn(name: string, def: Obj) {
  const made = (await request(app).post(`${admin}/functions`).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  await request(app).put(`${admin}/functions/${made.id}`).send({ draft: { lang: "en", inputs: [], ...def } }).expect(200);
  return made.id as string;
}
const trigger = (fn: string, body: Obj) => request(app).post(`${admin}/functions/${fn}/triggers`).send(body).expect(201);
const section = (children: Obj[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s1", type: "section", props: {}, children }] } });
const mkPage = async (slug: string, tree: Obj) => (await prisma.page.create({ data: { name: `${PREFIX}${slug}`, slug: `/${PREFIX}${slug}`, kind: "page", format: 2, status: "PUBLISHED", tree } })).id;
const add = (id: string, kind: string, refId: string) => request(app).post(`${at}/${id}/items`).send({ kind, refId }).expect(201);

/** A help desk built by hand: tickets and their replies, opening a ticket from the shop, a page with the customer's own tickets. */
async function helpDesk() {
  const outside = await mkTable("notes", [{ id: "title", type: "text" }]);
  const tickets = await mkTable("tickets", [
    { id: "subject", type: "text", required: true },
    { id: "status", type: "select", options: [{ id: "open" }, { id: "closed" }], default: "open" },
    // Links a table outside the feature: it can't travel.
    { id: "note", type: "relation", to: outside },
    { id: "product", type: "relation", to: "store:products" },
  ]);
  const replies = await mkTable("replies", [{ id: "text", type: "longText", required: true }, { id: "ticket", type: "relation", to: tickets, onDelete: "cascade" }]);
  await request(app).put(`${admin}/api/tables/${tickets}`).send({ read: "customer", create: "customer", update: "off", delete: "off", private: [] }).expect(200);
  const notify = await mkFn("notify", { do: [{ act: "return", value: 1 }] });
  const open = await mkFn("open-ticket", {
    inputs: [{ name: "subject", type: "text", required: true }],
    do: [
      { act: "add", table: tickets, values: { subject: "{{input.subject}}" }, owner: "{{caller}}", as: "ticket" },
      { act: "if", if: [{ left: "{{input.subject}}", cmp: "contains", right: "urgent" }], do: [{ act: "call", fn: notify, as: "told" }] },
      { act: "find", table: outside, as: "notes" },
      { act: "http", method: "POST", url: "https://help.example.com/tickets", headers: { "X-Key": "{{secret.HELP_KEY}}" }, body: { id: "{{ticket.id}}" } },
      { act: "ready", via: "c0nnection0000000000000000", what: "message", give: { text: "New ticket" } },
      { act: "return", value: "{{ticket.id}}" },
    ],
  });
  await trigger(open, { kind: "call", slug: `${PREFIX}open-ticket`, config: { who: "customer" } });
  await trigger(notify, { kind: "row", config: { table: replies, on: ["added"] } });
  await trigger(notify, { kind: "webhook", config: {} });
  await trigger(notify, { kind: "row", config: { table: outside, on: ["added"] } });
  const page = await mkPage("help", section([
    { id: "mine", type: "collectionList", props: { collectionId: tickets, feed: "mine" }, children: [{ id: "card", type: "text", props: { text: { en: "{{row_subject}}" } } }] },
    { id: "f1", type: "form", props: { kind: "custom", fields: [{ name: "subject", kind: "text", label: { en: "Subject" } }], send: { to: "fn", fn: `${PREFIX}open-ticket` } } },
    { id: "f2", type: "form", props: { kind: "custom", fields: [{ name: "text", kind: "text", label: { en: "Reply" } }], send: { to: "table", table: `${PREFIX}replies` } } },
    { id: "b1", type: "button", props: { label: { en: "Again" }, href: `/${PREFIX}help`, triggers: [{ on: "click", do: [{ act: "fn", fn: `${PREFIX}open-ticket`, input: { subject: "hi" } }] }] } },
    { id: "theirs", type: "collectionList", props: { collectionId: outside }, children: [{ id: "c2", type: "text", props: { text: { en: "x" } } }] },
  ]));
  const f = (await request(app).post(at).send({ name: `${PREFIX}Help desk`, note: "Tickets and replies" }).expect(201)).body;
  for (const [kind, id] of [["table", tickets], ["table", replies], ["function", open], ["function", notify], ["page", page]]) await add(f.id, kind, id);
  return { feature: f.id as string, outside, tickets, replies, open, notify, page };
}

async function clean() {
  await prisma.feature.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.page.deleteMany({ where: { OR: [{ name: { startsWith: PREFIX } }, { slug: { startsWith: `/${PREFIX}` } }] } });
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true, templateId: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.page.deleteMany({ where: { id: { in: old.map((c) => c.templateId).filter((x): x is string => !!x) } } });
  await prisma.fnSecret.deleteMany({ where: { name: "FT_SPEC_KEY" } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@ft-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  forgetFeatureGate();
  forgetTriggers();
  forgetConnections();
  invalidateAccess();
}
beforeAll(clean);
beforeEach(clean);
afterAll(clean);

const exported = async (id: string, query = "") => (await request(app).get(`${at}/${id}/export${query}`).expect(200)).body as { template: Obj; notes: Obj[] };
const walk = (v: unknown, visit: (o: Obj) => void): void => {
  if (Array.isArray(v)) v.forEach((x) => walk(x, visit));
  else if (v && typeof v === "object") {
    visit(v as Obj);
    Object.values(v).forEach((x) => walk(x, visit));
  }
};

describe("A feature as a template file", () => {
  test("names its own things by key, leaves out what can't travel and says so, and lists what it needs", async () => {
    const h = await helpDesk();
    const { template, notes } = await exported(h.feature, "?key=help-desk&version=1.0.0");
    expect(template).toMatchObject({ format: "estabrek.feature", formatVersion: 1, key: "help-desk", version: "1.0.0", name: { ar: `${PREFIX}Help desk` }, note: { ar: "Tickets and replies" } });
    // Only the feature's own things, keyed by their ids here; the outside table isn't in it.
    expect(template.tables.map((t: Obj) => [t.key, t.slug])).toEqual([[h.tickets, `${PREFIX}tickets`], [h.replies, `${PREFIX}replies`]]);
    const tickets = template.tables[0];
    expect(tickets.fields.map((f: Obj) => f.id)).toEqual(["subject", "status", "product"]);
    expect(tickets.fields[2]).toMatchObject({ type: "relation", to: "store:products" });
    expect(tickets.api).toMatchObject({ read: "customer", create: "customer" });
    expect(template.tables[1].fields[1]).toMatchObject({ type: "relation", to: `@table:${h.tickets}` });
    const open = template.functions.find((f: Obj) => f.key === h.open);
    expect(open.def.do[0]).toMatchObject({ act: "add", table: `@table:${h.tickets}` });
    expect(open.def.do[1].do[0]).toMatchObject({ act: "call", fn: `@fn:${h.notify}` });
    expect(open.def.do[2]).toMatchObject({ act: "find", table: "" });
    expect(open.def.do[4]).toMatchObject({ act: "ready", via: "" });
    expect(open.triggers).toEqual([{ kind: "call", config: { who: "customer" }, slug: `${PREFIX}open-ticket`, enabled: true }]);
    const notify = template.functions.find((f: Obj) => f.key === h.notify);
    expect(notify.triggers.map((t: Obj) => [t.kind, t.config])).toEqual([["row", { table: `@table:${h.replies}`, on: ["added"] }], ["webhook", {}]]);
    expect(template.needs).toEqual({ secrets: ["HELP_KEY"], sites: ["help.example.com"] });
    // The page: its own table's list by key, the outside table's list left out, its words as they are.
    const page = template.pages[0];
    expect(page).toMatchObject({ key: h.page, slug: `/${PREFIX}help` });
    const kids = page.tree.root.children[0].children;
    expect(kids.map((k: Obj) => k.id)).toEqual(["mine", "f1", "f2", "b1"]);
    expect(kids[0].props.collectionId).toBe(`@table:${h.tickets}`);
    expect(notes).toEqual(
      expect.arrayContaining([
        { what: "relationOut", table: `جدول tickets`, field: "note" },
        { what: "stepTableOut", fn: `${PREFIX}open-ticket`, at: "do.2" },
        { what: "readyOut", fn: `${PREFIX}open-ticket`, at: "do.4" },
        { what: "triggerTableOut", fn: `${PREFIX}notify` },
        { what: "webhookNew", fn: `${PREFIX}notify` },
        { what: "listOut", page: `${PREFIX}help` },
      ]),
    );
    expect(notes).toHaveLength(6);
    // A key or a version that isn't one is refused; without them the feature's name gives the key, and 1.0.0.
    expect((await request(app).get(`${at}/${h.feature}/export?version=one`).expect(400)).body.error).toBe("VALIDATION_ERROR");
    expect((await exported(h.feature)).template).toMatchObject({ key: "ft-spec-help-desk", version: "1.0.0" });
  });
});

describe("Installing a template", () => {
  test("shows what it would make first, with each taken address moved and what it needs from this store", async () => {
    const h = await helpDesk();
    const { template } = await exported(h.feature, "?key=help-desk&version=1.0.0");
    await request(app).post(`${admin}/connections/secrets`).send({ name: "FT_SPEC_KEY", value: "not-a-real-value-123", sites: ["help.example.com"] }).expect(201);
    const before = await prisma.collection.count();
    const p = (await request(app).post(`${at}/templates/preview`).send({ template }).expect(200)).body;
    expect(p).toMatchObject({ ok: true, problems: [], template: { key: "help-desk", version: "1.0.0" }, installed: [] });
    expect(p.tables).toEqual([
      expect.objectContaining({ key: h.tickets, slug: `${PREFIX}tickets-2`, was: `${PREFIX}tickets`, fields: 3, api: { read: "customer", create: "customer", update: "off", delete: "off" } }),
      expect.objectContaining({ key: h.replies, slug: `${PREFIX}replies-2`, was: `${PREFIX}replies`, fields: 2 }),
    ]);
    expect(p.functions.find((f: Obj) => f.key === h.open)).toMatchObject({ steps: 7, triggers: [{ kind: "call", slug: `${PREFIX}open-ticket-2`, was: `${PREFIX}open-ticket` }] });
    expect(p.pages).toEqual([{ key: h.page, name: `${PREFIX}help`, slug: `/${PREFIX}help-2`, was: `/${PREFIX}help` }]);
    // The secret it names isn't kept here (another is); the site isn't allowed yet.
    expect(p.needs).toEqual({ secrets: [{ name: "HELP_KEY", kept: false }], sites: [{ host: "help.example.com", allowed: false }] });
    expect(await prisma.collection.count(), "nothing is written").toBe(before);
  });

  test("makes everything as a draft under a feature that is off, with this store's ids and the new addresses wherever its pages use them", async () => {
    const h = await helpDesk();
    const { template } = await exported(h.feature, "?key=help-desk&version=1.0.0");
    const made = (await request(app).post(`${at}/templates/install`).send({ template, lang: "en" }).expect(201)).body;
    expect(made).toMatchObject({ name: `${PREFIX}Help desk`, enabled: false, template: { key: "help-desk", version: "1.0.0", name: { ar: `${PREFIX}Help desk` } } });
    expect(made.tables.map((t: Obj) => t.slug)).toEqual([`${PREFIX}tickets-2`, `${PREFIX}replies-2`]);
    // Functions unpublished (nothing starts them), the page a draft (not on the shop).
    expect(made.functions.map((f: Obj) => [f.name, f.published])).toEqual([[`${PREFIX}open-ticket`, false], [`${PREFIX}notify`, false]]);
    expect(made.pages).toEqual([expect.objectContaining({ slug: `/${PREFIX}help-2`, status: "DRAFT", hidden: true })]);
    const [tickets, replies] = made.tables.map((t: Obj) => t.id);
    expect([tickets, replies]).not.toContain(h.tickets);
    const [open, notify] = made.functions.map((f: Obj) => f.id);
    // The references are this store's new things.
    const replyFields = (await prisma.collection.findUniqueOrThrow({ where: { id: replies } })).fields as Obj[];
    expect(replyFields[1]).toMatchObject({ type: "relation", to: tickets, onDelete: "cascade" });
    expect((await prisma.collection.findUniqueOrThrow({ where: { id: tickets } })).api).toMatchObject({ read: "customer", create: "customer" });
    const fn = await prisma.fn.findUniqueOrThrow({ where: { id: open }, include: { triggers: true } });
    expect(fn.live).toBeNull();
    const def = fn.draft as Obj;
    expect(def.do[0]).toMatchObject({ act: "add", table: tickets });
    expect(def.do[1].do[0]).toMatchObject({ act: "call", fn: notify });
    expect(fn.triggers.map((t) => [t.kind, t.slug])).toEqual([["call", `${PREFIX}open-ticket-2`]]);
    const nt = await prisma.fnTrigger.findMany({ where: { fnId: notify }, orderBy: { createdAt: "asc" } });
    expect(nt.map((t) => [t.kind, (t.config as Obj).table ?? null])).toEqual([["row", replies], ["webhook", null]]);
    expect(nt[1].slug).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    // Its page: the list is the new table, the form and the button run the new address, the link goes to the new page.
    const page = await prisma.page.findUniqueOrThrow({ where: { id: made.pages[0].id } });
    let list: Obj | undefined;
    const words: string[] = [];
    walk(page.tree, (o) => {
      if (o.type === "collectionList") list = o;
      if (o.to === "fn" || o.act === "fn") words.push(`fn:${o.fn}`);
      if (o.to === "table") words.push(`table:${o.table}`);
      if (typeof o.href === "string") words.push(`href:${o.href}`);
    });
    expect(list?.props.collectionId).toBe(tickets);
    expect(words.sort()).toEqual([`fn:${PREFIX}open-ticket-2`, `fn:${PREFIX}open-ticket-2`, `href:/${PREFIX}help-2`, `table:${PREFIX}replies-2`].sort());
    // The draft says what it still lacks here: the step whose table stayed behind, and the connection to pick.
    const problems = (await request(app).get(`${admin}/functions/${open}`).expect(200)).body.problems.map((x: Obj) => `${x.at}: ${x.message}`);
    expect(problems).toEqual(expect.arrayContaining(["do.2: Pick a table", "do.4: Pick a connection"]));
    // Installed again, it is a second copy: the preview says the first is there.
    const again = (await request(app).post(`${at}/templates/preview`).send({ template }).expect(200)).body;
    expect(again.installed).toEqual([{ id: made.id, name: `${PREFIX}Help desk`, version: "1.0.0" }]);
    expect(again.tables.map((t: Obj) => t.slug)).toEqual([`${PREFIX}tickets-3`, `${PREFIX}replies-3`]);
    // Exported again, it keeps the template's key and keys, a version up.
    const out = (await exported(made.id)).template;
    expect(out).toMatchObject({ key: "help-desk", version: "1.1.0" });
    expect(out.tables.map((t: Obj) => t.key)).toEqual([h.tickets, h.replies]);
    expect(out.functions.map((f: Obj) => f.key)).toEqual([h.open, h.notify]);
  });

  test("refuses a file that isn't a template, or one whose parts don't hold, saying where", async () => {
    const h = await helpDesk();
    const { template } = await exported(h.feature, "?key=help-desk&version=1.0.0");
    const preview = async (t: unknown) => (await request(app).post(`${at}/templates/preview`).send({ template: t }).expect(200)).body;
    expect(await preview({ hello: 1 })).toEqual({ ok: false, problems: [{ at: "format", message: "This file isn't a feature template" }] });
    expect((await preview({ ...template, formatVersion: 2 })).problems[0].message).toMatch(/newer version/);
    expect((await preview({ ...template, version: "one" })).problems).toEqual([{ at: "version", message: "A version is three numbers, like 1.0.0" }]);
    // A reference to a table the file doesn't have.
    const broken = structuredClone(template);
    broken.tables[1].fields[1].to = "@table:nothing";
    broken.functions[0].def.do[0].table = "@table:gone";
    const p = await preview(broken);
    expect(p.ok).toBe(false);
    expect(p.problems).toEqual(expect.arrayContaining([{ at: "tables.1.fields.1.to", message: 'No table "nothing" in this template' }, { at: "functions.0.def.do.0.table", message: 'No table "gone" in this template' }]));
    // A page whose tree isn't one.
    const bad = structuredClone(template);
    bad.pages[0].tree.root.children[0].children[1].props.send = { to: "fn", fn: "Not An Address" };
    expect((await preview(bad)).problems[0].at).toMatch(/^pages\.0\.tree/);
    // Install refuses what the preview refuses, and writes nothing.
    const count = await prisma.collection.count();
    expect((await request(app).post(`${at}/templates/install`).send({ template: broken }).expect(400)).body).toMatchObject({ error: "TEMPLATE_INVALID" });
    expect(await prisma.collection.count()).toBe(count);
  });

  test("needs the permissions its things need", async () => {
    const h = await helpDesk();
    const { template } = await exported(h.feature, "?key=help-desk&version=1.0.0");
    const member = async (name: string, permissions: string[]) => {
      const role = await prisma.staffRole.create({ data: { name: `${PREFIX}${name}`, permissions } });
      const m = await prisma.adminUser.create({ data: { email: `${name}@ft-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
      return `Bearer ${signAccessToken({ sub: m.id, role: "STAFF", email: m.email })}`;
    };
    const features = await member("features", ["features:read", "features:write"]);
    expect((await request(app).post(`${at}/templates/install`).set("Authorization", features).send({ template }).expect(403)).body).toMatchObject({ error: "FORBIDDEN", details: { lacking: ["functions:write", "pages:write"] } });
    expect((await request(app).get(`${at}/${h.feature}/export`).set("Authorization", features).expect(403)).body).toMatchObject({ error: "FORBIDDEN", details: { lacking: ["functions:read", "pages:read"] } });
    expect((await request(app).post(`${at}/${h.feature}/remove`).set("Authorization", features).send({ rows: "keep" }).expect(403)).body.details.lacking).toEqual(["functions:write", "pages:write"]);
    const all = await member("all", ["features:read", "features:write", "functions:read", "functions:write", "pages:read", "pages:write"]);
    await request(app).post(`${at}/templates/install`).set("Authorization", all).send({ template }).expect(201);
  });
});

describe("Removing a feature with what it holds", () => {
  async function installed() {
    const h = await helpDesk();
    const { template } = await exported(h.feature, "?key=help-desk&version=1.0.0");
    const made = (await request(app).post(`${at}/templates/install`).send({ template }).expect(201)).body;
    const [tickets, replies] = made.tables.map((t: Obj) => t.id);
    const [open, notify] = made.functions.map((f: Obj) => f.id);
    for (const s of ["a", "b"]) await request(app).post(`${admin}/collections/${tickets}/items`).send({ slug: `t-${s}`, data: { subject: { en: s } } }).expect(201);
    return { h, made, tickets, replies, open, notify, page: made.pages[0] as Obj };
  }

  test("says what would go, and what outside goes on naming it", async () => {
    const i = await installed();
    // Outside the feature: a function reading its table, and a page listing it.
    await mkFn("report", { do: [{ act: "find", table: i.tickets, as: "all" }] });
    await mkPage("report", section([{ id: "l", type: "collectionList", props: { collectionId: i.tickets }, children: [{ id: "c", type: "text", props: { text: { en: "x" } } }] }]));
    const r = (await request(app).get(`${at}/${i.made.id}/removal?lang=en`).expect(200)).body;
    expect(r.tables).toEqual([{ id: i.tickets, name: "tickets", slug: `${PREFIX}tickets-2`, rows: 2 }, { id: i.replies, name: "replies", slug: `${PREFIX}replies-2`, rows: 0 }]);
    expect(r.functions.map((f: Obj) => f.id)).toEqual([i.open, i.notify]);
    expect(r.pages).toEqual([{ id: i.page.id, name: `${PREFIX}help`, slug: `/${PREFIX}help-2`, status: "DRAFT" }]);
    expect(r.blockers).toEqual({ linked: [], called: [] });
    expect(r.uses).toEqual({ functions: [`${PREFIX}report`], pages: [`${PREFIX}report`] });
  });

  test("with its rows: nothing of it is left", async () => {
    const i = await installed();
    expect((await request(app).post(`${at}/${i.made.id}/remove`).send({ rows: "delete" }).expect(200)).body).toEqual({ ok: true, removed: { tables: 2, keptTables: 0, functions: 2, pages: 1, rows: 2 } });
    expect(await prisma.collection.count({ where: { id: { in: [i.tickets, i.replies] } } })).toBe(0);
    expect(await prisma.collectionItem.count({ where: { collectionId: i.tickets } })).toBe(0);
    expect(await prisma.fn.count({ where: { id: { in: [i.open, i.notify] } } })).toBe(0);
    expect(await prisma.fnTrigger.count({ where: { fnId: { in: [i.open, i.notify] } } })).toBe(0);
    expect(await prisma.page.count({ where: { id: i.page.id } })).toBe(0);
    expect(await prisma.feature.count({ where: { id: i.made.id } })).toBe(0);
    // The feature it was exported from is untouched.
    expect((await request(app).get(`${at}/${i.h.feature}`).expect(200)).body.tables).toHaveLength(2);
    // The call address is free again.
    expect(await prisma.fnTrigger.count({ where: { slug: `${PREFIX}open-ticket-2` } })).toBe(0);
  });

  test("keeping its rows: the tables stay where they are, in no feature; the rest goes", async () => {
    const i = await installed();
    expect((await request(app).post(`${at}/${i.made.id}/remove`).send({ rows: "keep" }).expect(200)).body.removed).toEqual({ tables: 0, keptTables: 2, functions: 2, pages: 1, rows: 0 });
    expect(await prisma.collectionItem.count({ where: { collectionId: i.tickets, deletedAt: null } })).toBe(2);
    expect(await prisma.featureItem.count({ where: { refId: { in: [i.tickets, i.replies] } } })).toBe(0);
    expect(await prisma.fn.count({ where: { id: { in: [i.open, i.notify] } } })).toBe(0);
  });

  test("is refused while something outside would break", async () => {
    const i = await installed();
    // A table outside linking one of its tables: its rows can't go (kept, they can).
    await mkTable("links", [{ id: "t", type: "relation", to: i.tickets }]);
    const r = (await request(app).get(`${at}/${i.made.id}/removal?lang=en`).expect(200)).body;
    expect(r.blockers.linked).toEqual([{ table: "tickets", by: "links", field: "t" }]);
    expect((await request(app).post(`${at}/${i.made.id}/remove`).send({ rows: "delete" }).expect(409)).body).toMatchObject({ error: "TABLE_LINKED" });
    // A function outside calling one of its functions: nothing goes.
    const caller = await mkFn("caller", { do: [{ act: "call", fn: i.notify }] });
    expect((await request(app).post(`${at}/${i.made.id}/remove`).send({ rows: "keep" }).expect(409)).body).toMatchObject({ error: "FN_USED", details: { called: [{ fn: `${PREFIX}notify`, by: `${PREFIX}caller` }] } });
    await prisma.fn.delete({ where: { id: caller } });
    await request(app).post(`${at}/${i.made.id}/remove`).send({ rows: "keep" }).expect(200);
    expect(await prisma.collection.count({ where: { id: i.tickets } })).toBe(1);
  });
});
