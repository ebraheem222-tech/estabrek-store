import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTriggers } from "../lib/fnTriggers.js";

// Upgrading a feature made from a template (stage 4), with the database. A help desk is installed
// from version 1.0.0; the owner changes some of it; then 1.1.0 comes: what the owner didn't touch takes
// the new version, what they changed stays theirs (unless they ask for the template's), new things are
// made, a webhook keeps its address, and a field change that would set values aside waits for them.
// Requests without a token run as the test owner.

const PREFIX = "up-spec-";
const at = "/v1/admin/my-features";
type Obj = Record<string, any>;
const L = (en: string) => ({ ar: en, en, he: en });

/** The template, at a version, with what each version changes. */
function file(version: "1.0.0" | "1.1.0" | "1.2.0"): Obj {
  const v11 = version !== "1.0.0";
  const v12 = version === "1.2.0";
  const fields: Obj[] = [
    { id: "subject", type: v11 ? "number" : "text", name: L("Subject"), required: true },
    { id: "status", type: "select", name: L("Status"), options: [{ id: "open" }, { id: "closed" }, ...(v11 ? [{ id: "pending" }] : [])] },
    { id: "note", type: "longText", name: L(v11 ? "Their note" : "Note") },
    ...(v11 ? [{ id: "email", type: "email", name: L("Email") }, { id: "priority", type: "number", name: L("Priority") }] : []),
  ];
  return {
    format: "estabrek.feature",
    formatVersion: 1,
    key: "up-spec-help",
    version,
    name: L(`${PREFIX}Help desk`),
    tables: [{ key: "tickets", slug: `${PREFIX}tickets`, name: L(v11 ? `${PREFIX}Tickets v2` : `${PREFIX}Tickets`), fields, api: { read: "customer", create: "off", update: "off", delete: "off", private: [] } }],
    functions: [
      { key: "open", name: `${PREFIX}open`, def: { lang: "en", inputs: [{ name: "subject", type: "text", required: true }], do: [{ act: "add", table: "@table:tickets", values: { subject: "{{input.subject}}" } }, { act: "return", value: v12 ? "v1.2" : v11 ? "v1.1" : "v1" }] }, triggers: [{ kind: "call", slug: `${PREFIX}open`, config: { who: "customer" } }] },
      { key: "notify", name: `${PREFIX}notify`, def: { lang: "en", inputs: [], do: [{ act: "notify", title: v11 ? "A ticket (new words)" : "A ticket" }] }, triggers: [{ kind: "row", config: { table: "@table:tickets", on: v11 ? ["added", "changed"] : ["added"] } }, { kind: "webhook", config: {} }] },
      { key: "report", name: `${PREFIX}report`, def: { lang: "en", inputs: [], do: [{ act: "find", table: "@table:tickets", as: "all" }, { act: "return", value: v11 ? "{{all.length}} tickets" : "{{all.length}}" }] } },
      ...(v11 ? [{ key: "fresh", name: `${PREFIX}fresh`, def: { lang: "en", inputs: [], do: [{ act: "return", value: 1 }] }, triggers: [{ kind: "call", slug: `${PREFIX}fresh`, config: { who: "public" } }] }] : []),
    ],
    pages: [
      {
        key: "help",
        name: `${PREFIX}help`,
        slug: `/${PREFIX}help`,
        tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s1", type: "section", props: {}, children: [...(v11 ? [{ id: "h1", type: "heading", props: { text: L("Help"), level: 1 } }] : []), { id: "f1", type: "form", props: { kind: "custom", fields: [{ name: "subject", kind: "text", label: L("Subject") }], send: { to: "fn", fn: `${PREFIX}open` } } }] }] } },
      },
    ],
  };
}

async function clean() {
  await prisma.feature.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.page.deleteMany({ where: { slug: { startsWith: `/${PREFIX}` } } });
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  forgetFeatureGate();
  forgetTriggers();
}
beforeAll(clean);
beforeEach(clean);
afterAll(clean);

/** Installed at 1.0.0, then the owner's own changes: the "open" function's steps, a field's name, a field of their own; and a row. */
async function installedAndChanged() {
  const f = (await request(app).post(`${at}/templates/install`).send({ template: file("1.0.0") }).expect(201)).body;
  const table = f.tables[0].id as string;
  const fns = Object.fromEntries(f.functions.map((x: Obj) => [x.name.replace(PREFIX, ""), x.id]));
  const open = (await request(app).get(`/v1/admin/functions/${fns.open}`).expect(200)).body;
  await request(app).put(`/v1/admin/functions/${fns.open}`).send({ draft: { ...open.draft, do: [...open.draft.do.slice(0, 1), { act: "return", value: "the owner's own" }] } }).expect(200);
  const t = await prisma.collection.findUniqueOrThrow({ where: { id: table } });
  const fields = (t.fields as Obj[]).map((x) => (x.id === "note" ? { ...x, name: L("My note") } : x));
  await request(app).put(`/v1/admin/collections/${table}`).send({ slug: t.slug, name: t.name, fields: [...fields, { id: "priority", type: "text", name: L("Mine") }] }).expect(200);
  await request(app).post(`/v1/admin/collections/${table}/items`).send({ slug: "first", data: { subject: { en: "hello" } } }).expect(201);
  const webhook = (await prisma.fnTrigger.findFirstOrThrow({ where: { fnId: fns.notify, kind: "webhook" } })).slug;
  return { feature: f.id as string, table, fns, page: f.pages[0].id as string, webhook };
}
const actions = (items: Obj[]) => Object.fromEntries(items.map((x) => [x.id, x.action]));

describe("Upgrading a feature made from a template", () => {
  test("says piece by piece what would happen, and writes nothing", async () => {
    const h = await installedAndChanged();
    const before = await prisma.fn.findUniqueOrThrow({ where: { id: h.fns.notify } });
    const p = (await request(app).post(`${at}/${h.feature}/upgrade/preview`).send({ template: file("1.1.0"), lang: "en" }).expect(200)).body;
    expect(p).toMatchObject({ ok: true, from: "1.0.0", to: "1.1.0", key: "up-spec-help", problems: [] });
    expect(actions(p.items)).toEqual({
      "table:tickets": "update",
      "field:tickets.subject": "waits",
      "field:tickets.status": "update",
      "field:tickets.note": "conflict",
      "field:tickets.email": "add",
      "field:tickets.priority": "conflict",
      "function:open": "conflict",
      "function:notify": "update",
      "triggers:notify": "update",
      "function:report": "update",
      "function:fresh": "add",
      "page:help": "update",
    });
    expect(p.counts).toMatchObject({ add: 2, update: 6, conflict: 3, waits: 1 });
    expect((await prisma.fn.findUniqueOrThrow({ where: { id: h.fns.notify } })).draft).toEqual(before.draft);
  });

  test("takes the new where the owner didn't change it, keeps theirs where they did, makes what is new", async () => {
    const h = await installedAndChanged();
    const done = (await request(app).post(`${at}/${h.feature}/upgrade`).send({ template: file("1.1.0") }).expect(200)).body;
    expect(done).toMatchObject({ from: "1.0.0", to: "1.1.0" });
    expect(done.feature.template).toMatchObject({ key: "up-spec-help", version: "1.1.0", from: "1.0.0" });
    // The table: its new name, a new choice, the new field at the end; the owner's names and their own field stay; the change that would set "hello" aside waits.
    const t = await prisma.collection.findUniqueOrThrow({ where: { id: h.table } });
    expect(t.name).toEqual(L(`${PREFIX}Tickets v2`));
    const fields = t.fields as Obj[];
    expect(fields.map((f) => f.id)).toEqual(["subject", "status", "note", "priority", "email"]);
    expect(fields[0].type).toBe("text");
    expect(fields[1].options.map((o: Obj) => o.id)).toEqual(["open", "closed", "pending"]);
    expect(fields[2].name).toEqual(L("My note"));
    expect(fields[3]).toMatchObject({ type: "text", name: L("Mine") });
    expect(await prisma.studioRevision.count({ where: { kind: "table", objectId: h.table } })).toBe(2);
    expect((await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: h.table } })).data).toMatchObject({ subject: { en: "hello" } });
    // Functions: the owner's "open" stays; "notify" and "report" take the new steps as their draft; "notify" starts on more, its webhook at the same address.
    expect(((await prisma.fn.findUniqueOrThrow({ where: { id: h.fns.open } })).draft as Obj).do[1]).toEqual({ act: "return", value: "the owner's own" });
    expect(((await prisma.fn.findUniqueOrThrow({ where: { id: h.fns.notify } })).draft as Obj).do[0]).toMatchObject({ act: "notify", title: "A ticket (new words)" });
    const triggers = await prisma.fnTrigger.findMany({ where: { fnId: h.fns.notify }, orderBy: { createdAt: "asc" } });
    expect(triggers.map((x) => [x.kind, (x.config as Obj).on ?? null])).toEqual([["row", ["added", "changed"]], ["webhook", null]]);
    expect(triggers[1].slug).toBe(h.webhook);
    expect(await prisma.fnTrigger.count({ where: { fnId: h.fns.open, slug: `${PREFIX}open` } })).toBe(1);
    // The new function is the feature's, as a draft, at its own address.
    const fresh = done.feature.functions.find((x: Obj) => x.name === `${PREFIX}fresh`);
    expect(fresh).toMatchObject({ published: false });
    expect(await prisma.fnTrigger.count({ where: { fnId: fresh.id, slug: `${PREFIX}fresh` } })).toBe(1);
    // The page (a draft page) takes the new design.
    const page = await prisma.page.findUniqueOrThrow({ where: { id: h.page } });
    expect((page.tree as Obj).root.children[0].children.map((n: Obj) => n.id)).toEqual(["h1", "f1"]);
    // The same version again is nothing new.
    expect((await request(app).post(`${at}/${h.feature}/upgrade/preview`).send({ template: file("1.1.0") }).expect(409)).body).toMatchObject({ error: "NOT_NEWER", details: { version: "1.1.0" } });

    // 1.2.0: what is still the owner's stays theirs; asked for, the template's version comes in.
    const p = (await request(app).post(`${at}/${h.feature}/upgrade/preview`).send({ template: file("1.2.0") }).expect(200)).body;
    expect(actions(p.items)).toEqual({ "function:open": "conflict" });
    const taken = (await request(app).post(`${at}/${h.feature}/upgrade`).send({ template: file("1.2.0"), take: ["function:open"] }).expect(200)).body;
    expect(actions(taken.items)).toEqual({ "function:open": "taken" });
    expect(((await prisma.fn.findUniqueOrThrow({ where: { id: h.fns.open } })).draft as Obj).do[1]).toEqual({ act: "return", value: "v1.2" });
  });

  test("a piece the owner removed isn't brought back; one installed before fingerprints were kept counts as theirs", async () => {
    const h = await installedAndChanged();
    await request(app).delete(`${at}/${h.feature}/items/function/${h.fns.report}`).expect(200);
    const f = await prisma.feature.findUniqueOrThrow({ where: { id: h.feature } });
    const { prints: _prints, ...older } = f.template as Obj;
    await prisma.feature.update({ where: { id: h.feature }, data: { template: older } });
    const p = (await request(app).post(`${at}/${h.feature}/upgrade/preview`).send({ template: file("1.1.0") }).expect(200)).body;
    const a = actions(p.items);
    expect(a["function:report"]).toBe("gone");
    expect(a["function:notify"]).toBe("conflict");
    expect(a["page:help"]).toBe("conflict");
    expect(a["function:fresh"]).toBe("add");
  });

  test("is refused for another template, or for a feature not made from one", async () => {
    const h = await installedAndChanged();
    expect((await request(app).post(`${at}/${h.feature}/upgrade/preview`).send({ template: { ...file("1.1.0"), key: "other" } }).expect(400)).body.error).toBe("TEMPLATE_OTHER");
    expect((await request(app).post(`${at}/${h.feature}/upgrade/preview`).send({ template: { hello: 1 } }).expect(200)).body).toEqual({ ok: false, problems: [{ at: "format", message: "This file isn't a feature template" }] });
    const plain = (await request(app).post(at).send({ name: `${PREFIX}plain` }).expect(201)).body;
    expect((await request(app).post(`${at}/${plain.id}/upgrade/preview`).send({ template: file("1.1.0") }).expect(409)).body.error).toBe("NOT_FROM_TEMPLATE");
  });
});
