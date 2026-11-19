import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTriggers } from "../lib/fnTriggers.js";
import { draftFromPage } from "../lib/pageDraft.js";
import { GALLERY } from "../lib/gallery/index.js";

// The project as one file (stage 3, item 2), with the database. The whole store's project goes out as a
// file and comes back in: a file that is the project as it is changes nothing; one from before brings
// the project back as it was (the project as it is kept first, so it can go back again); a copy made
// from it has the same ids. The store holds other specs' things too: only this spec's are looked at.
// Requests without a token run as the test owner.

const PREFIX = "proj-spec-";
const at = "/v1/admin/system/project";
type Obj = Record<string, any>;
const L = (en: string) => ({ ar: en, en, he: en });
const tree = (text: string) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s1", type: "section", props: {}, children: [{ id: "h1", type: "heading", props: { text: L(text), level: 1 } }] }] } });
const ids = { posts: "projspecposts01", tags: "projspectags001", send: "projspecsend001", call: "projspeccall001", hook: "projspechook001", row: "projspecrow0001", page: "projspecpage001", group: "projspecgroup01", feature: "projspecfeat001" };
const ROLE = "proj-spec-editor";

async function clean() {
  await prisma.feature.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.fnTrigger.deleteMany({ where: { fn: { name: { startsWith: PREFIX } } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.page.deleteMany({ where: { OR: [{ slug: { startsWith: `/${PREFIX}` } }, { name: { startsWith: PREFIX } }] } });
  const old = await prisma.collection.findMany({ where: { slug: { startsWith: PREFIX } }, select: { id: true, templateId: true } });
  await prisma.studioRevision.deleteMany({ where: { objectId: { in: old.map((c) => c.id) } } });
  await prisma.collection.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  await prisma.shopperRole.deleteMany({ where: { key: { startsWith: "proj-spec" } } });
  await prisma.shopperGroup.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.projectSnapshot.deleteMany({});
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@proj-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  forgetFeatureGate();
  forgetTriggers();
}
beforeAll(clean);
beforeEach(clean);
afterAll(clean);

/** A small project of this spec's: two tables (one links the other), a published function with three triggers, a page with unpublished changes, a role, a group and a feature. */
async function made() {
  await prisma.collection.create({ data: { id: ids.tags, slug: `${PREFIX}tags`, name: L(`${PREFIX}Tags`), fields: [{ id: "label", type: "text", name: L("Label") }] } });
  await prisma.collection.create({
    data: {
      id: ids.posts,
      slug: `${PREFIX}posts`,
      name: L(`${PREFIX}Posts`),
      fields: [
        { id: "title", type: "text", name: L("Title"), required: true },
        { id: "tags", type: "relation", name: L("Tags"), to: ids.tags, many: true },
      ],
      api: { read: "public", create: "off", update: "off", delete: "off", private: [] },
    },
  });
  const live = { lang: "en", inputs: [{ name: "title", type: "text", required: true }], do: [{ act: "add", table: ids.posts, values: { title: "{{input.title}}" } }, { act: "return", value: "v1" }] };
  await prisma.fn.create({ data: { id: ids.send, name: `${PREFIX}send`, draft: { ...live, do: [...live.do.slice(0, 1), { act: "return", value: "draft" }] }, live, version: 1, publishedAt: new Date(), tests: [] } });
  await prisma.fnVersion.create({ data: { fnId: ids.send, n: 1, def: live } });
  await prisma.fnTrigger.create({ data: { id: ids.call, fnId: ids.send, kind: "call", config: { who: "public" }, slug: `${PREFIX}send` } });
  await prisma.fnTrigger.create({ data: { id: ids.hook, fnId: ids.send, kind: "webhook", config: {}, slug: `${PREFIX}hook-token-kept` } });
  await prisma.fnTrigger.create({ data: { id: ids.row, fnId: ids.send, kind: "row", config: { table: ids.tags, on: ["added"] } } });
  // Published, with unpublished changes the editor keeps.
  const page = await prisma.page.create({ data: { id: ids.page, name: `${PREFIX}about`, slug: `/${PREFIX}about`, status: "PUBLISHED", kind: "page", format: 2, tree: tree("About") } });
  await prisma.page.update({ where: { id: page.id }, data: { draft: draftFromPage({ ...page, sections: [] } as never) as never } });
  await prisma.shopperRole.create({ data: { key: ROLE, name: L("Editor") } });
  await prisma.shopperGroup.create({ data: { id: ids.group, name: `${PREFIX}team` } });
  await prisma.feature.create({ data: { id: ids.feature, name: `${PREFIX}blog`, enabled: true, items: { create: [{ kind: "table", refId: ids.posts }, { kind: "function", refId: ids.send }, { kind: "page", refId: ids.page }] } } });
  forgetTriggers();
}

const fileNow = async () => JSON.parse((await request(app).get(`${at}/file`).expect(200)).text);
const preview = async (file: unknown, extra: Obj = {}) => (await request(app).post(`${at}/preview`).send({ file, ...extra }).expect(200)).body;
const mine = (items: Obj[]) => items.filter((i) => Object.values(ids).includes(i.id) || i.id === ROLE);

describe("The project as one file", () => {
  test("goes out with everything of the project, and back in it changes nothing", async () => {
    await made();
    const res = await request(app).get(`${at}/file`).expect(200);
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="estabrek-project-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json"$/);
    const file = JSON.parse(res.text);
    expect(file).toMatchObject({ format: "estabrek.project", formatVersion: 1 });
    expect(file.tables.find((t: Obj) => t.id === ids.posts)).toMatchObject({ slug: `${PREFIX}posts`, fields: [{ id: "title" }, { id: "tags", to: ids.tags }], api: { read: "public" } });
    const fn = file.functions.find((f: Obj) => f.id === ids.send);
    expect(fn).toMatchObject({ live: { do: [{ act: "add" }, { value: "v1" }] }, draft: { do: [{ act: "add" }, { value: "draft" }] } });
    // A webhook's address is how a system calls in: it is never in a file.
    expect(fn.triggers.map((t: Obj) => [t.id, t.slug ?? null])).toEqual([[ids.call, `${PREFIX}send`], [ids.hook, null], [ids.row, null]]);
    expect(file.pages.find((p: Obj) => p.id === ids.page)).toMatchObject({ status: "PUBLISHED", tree: tree("About"), draft: tree("About") });
    expect(file.roles).toEqual(expect.arrayContaining([{ key: ROLE, name: L("Editor") }]));
    expect(file.features.find((f: Obj) => f.id === ids.feature).items).toHaveLength(3);

    const p = await preview(file);
    expect(p).toMatchObject({ ok: true, counts: { add: 0, change: 0, clash: 0 }, problems: [], waits: [] });
    expect(mine(p.items).map((i: Obj) => [i.ref, i.action])).toEqual([
      [`table:${ids.tags}`, "same"],
      [`table:${ids.posts}`, "same"],
      [`function:${ids.send}`, "same"],
      [`page:${ids.page}`, "same"],
      [`role:${ROLE}`, "same"],
      [`group:${ids.group}`, "same"],
      [`feature:${ids.feature}`, "same"],
    ]);
    // Nothing to do: nothing is written, and no copy is kept for it.
    expect((await request(app).post(`${at}/apply`).send({ file }).expect(200)).body).toMatchObject({ snapshot: null, made: 0, changed: 0, removed: 0 });
    expect(await prisma.projectSnapshot.count()).toBe(0);
  });

  test("a file from before brings the project back as it was; the project as it was is kept first", async () => {
    await made();
    const before = await fileNow();
    // Then the project changes.
    await prisma.collection.update({ where: { id: ids.posts }, data: { name: L(`${PREFIX}Articles`), fields: [{ id: "title", type: "text", name: L("Headline"), required: true }, { id: "tags", type: "relation", name: L("Tags"), to: ids.tags, many: true }, { id: "extra", type: "number", name: L("Extra") }] } });
    const v2 = { lang: "en", inputs: [], do: [{ act: "return", value: "v2" }] };
    await prisma.fnVersion.create({ data: { fnId: ids.send, n: 2, def: v2 } });
    await prisma.fn.update({ where: { id: ids.send }, data: { live: v2, version: 2, draft: v2, enabled: false } });
    await prisma.fnTrigger.delete({ where: { id: ids.call } });
    await prisma.page.update({ where: { id: ids.page }, data: { status: "DRAFT", tree: tree("About (new)"), draft: null } });
    await prisma.shopperRole.update({ where: { key: ROLE }, data: { name: L("Writer") } });
    await prisma.shopperGroup.delete({ where: { id: ids.group } });
    const extra = await prisma.fn.create({ data: { name: `${PREFIX}extra`, draft: { lang: "en", inputs: [], do: [] } } });
    forgetTriggers();

    const p = await preview(before);
    expect(p.ok).toBe(true);
    const of = (ref: string) => p.items.find((i: Obj) => i.ref === ref);
    expect(of(`table:${ids.posts}`)).toMatchObject({ action: "change", parts: ["name", "fields"], fields: { added: [], removed: ["Extra"], changed: ["Title"] } });
    expect(of(`function:${ids.send}`)).toMatchObject({ action: "change", parts: ["enabled", "draft", "live", "triggers"] });
    expect(of(`page:${ids.page}`)).toMatchObject({ action: "change", parts: ["status", "design", "draft"] });
    expect(of(`role:${ROLE}`)).toMatchObject({ action: "change", parts: ["name"] });
    expect(of(`group:${ids.group}`)).toMatchObject({ action: "add" });
    expect(of(`function:${extra.id}`)).toMatchObject({ action: "only", going: false });

    const done = (await request(app).post(`${at}/apply`).send({ file: before, remove: [`function:${extra.id}`], label: "Before the spec" }).expect(200)).body;
    expect(done).toMatchObject({ removed: 1, snapshot: { label: "Before the spec", reason: "before" } });

    // As it was, everything this spec made.
    const now = await preview(before);
    expect(mine(now.items).every((i: Obj) => i.action === "same")).toBe(true);
    expect(await prisma.fn.findUnique({ where: { id: extra.id } })).toBeNull();
    const fn = await prisma.fn.findUniqueOrThrow({ where: { id: ids.send }, include: { triggers: true, versions: { orderBy: { n: "asc" } } } });
    // What was published comes back as a new version of its own (its versions page can go back again).
    expect(fn).toMatchObject({ enabled: true, version: 3, live: { do: [{ act: "add" }, { value: "v1" }] } });
    expect(fn.versions.map((v) => [v.n, v.from])).toEqual([[1, null], [2, null], [3, "project"]]);
    expect(fn.triggers.find((t) => t.id === ids.call)).toMatchObject({ slug: `${PREFIX}send`, kind: "call" });
    // A webhook keeps its address.
    expect(fn.triggers.find((t) => t.id === ids.hook)?.slug).toBe(`${PREFIX}hook-token-kept`);
    const page = await prisma.page.findUniqueOrThrow({ where: { id: ids.page }, include: { revisions: true } });
    expect(page).toMatchObject({ status: "PUBLISHED", tree: tree("About") });
    expect((page.draft as Obj).tree).toEqual(tree("About"));
    expect(page.revisions.some((r) => r.reason === "From a project file")).toBe(true);
    expect(await prisma.shopperGroup.findUnique({ where: { id: ids.group } })).toMatchObject({ name: `${PREFIX}team` });
    // The table's fields changed as they would from its page: kept as a version of the table.
    expect(await prisma.studioRevision.count({ where: { objectId: ids.posts } })).toBe(1);

    // The project as it was before is kept: going back to it brings the changes again.
    const list = (await request(app).get(at).expect(200)).body;
    expect(list.snapshots).toHaveLength(1);
    const snap = list.snapshots[0];
    expect(snap).toMatchObject({ label: "Before the spec", reason: "before", byEmail: expect.any(String) });
    const back = (await request(app).post(`${at}/snapshots/${snap.id}/preview`).send({}).expect(200)).body;
    expect(back.items.find((i: Obj) => i.ref === `group:${ids.group}`)).toMatchObject({ action: "only" });
    expect(back.suggested).toContain(`group:${ids.group}`);
    const went = (await request(app).post(`${at}/snapshots/${snap.id}/back`).send({ remove: [`group:${ids.group}`] }).expect(200)).body;
    expect(went).toMatchObject({ snapshot: { reason: "back", label: "Before going back to: Before the spec" } });
    expect(await prisma.fn.findUniqueOrThrow({ where: { id: ids.send } })).toMatchObject({ enabled: false, live: { do: [{ value: "v2" }] } });
    expect(await prisma.fn.findUnique({ where: { id: extra.id } })).toMatchObject({ name: `${PREFIX}extra` });
    expect(await prisma.shopperGroup.findUnique({ where: { id: ids.group } })).toBeNull();
    expect((await request(app).get(at).expect(200)).body.snapshots.map((s: Obj) => s.reason)).toEqual(["back", "before"]);
  });

  test("a copy made from it has the same ids: published functions run, a webhook gets an address of its own", async () => {
    await made();
    const file = await fileNow();
    await clean();
    const p = await preview(file);
    expect(mine(p.items).map((i: Obj) => i.action)).toEqual(["add", "add", "add", "add", "add", "add", "add"]);
    await request(app).post(`${at}/apply`).send({ file }).expect(200);
    const posts = await prisma.collection.findUniqueOrThrow({ where: { id: ids.posts } });
    expect(posts.fields).toMatchObject([{ id: "title" }, { id: "tags", to: ids.tags }]);
    const fn = await prisma.fn.findUniqueOrThrow({ where: { id: ids.send }, include: { triggers: true, versions: true } });
    expect(fn).toMatchObject({ version: 1, live: { do: [{ act: "add", table: ids.posts }, { value: "v1" }] } });
    expect(fn.versions.map((v) => v.from)).toEqual(["project"]);
    const hook = fn.triggers.find((t) => t.id === ids.hook)!;
    expect(hook.slug).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(hook.slug).not.toBe(`${PREFIX}hook-token-kept`);
    expect((await prisma.feature.findUniqueOrThrow({ where: { id: ids.feature }, include: { items: true } })).items).toHaveLength(3);
    // It runs, at its own address.
    forgetTriggers();
    const out = (await request(app).post(`/v1/fn/${PREFIX}send`).send({ input: { title: "From the copy" } }).expect(200)).body;
    expect(out).toEqual({ ok: true, value: "v1" });
    expect(await prisma.collectionItem.count({ where: { collectionId: ids.posts } })).toBe(1);
    // And brought in again, it is the same.
    expect(mine((await preview(file)).items).every((i: Obj) => i.action === "same")).toBe(true);
  });

  test("a field change that would set values aside waits until the owner accepts it", async () => {
    await made();
    const file = await fileNow();
    await prisma.collection.update({ where: { id: ids.tags }, data: { fields: [{ id: "label", type: "text", name: L("Label") }, { id: "color", type: "text", name: L("Color") }] } });
    await prisma.collectionItem.create({ data: { collectionId: ids.tags, slug: "red", status: "PUBLISHED", data: { label: { en: "Red" }, color: { en: "#f00" } } } });
    const p = await preview(file);
    expect(p.ok).toBe(false);
    expect(p.waits).toEqual([{ ref: `table:${ids.tags}`, name: `${PREFIX}Tags`, impacts: [expect.objectContaining({ field: "color", change: "removed", hidden: 1 })] }]);
    expect((await request(app).post(`${at}/apply`).send({ file }).expect(409)).body).toMatchObject({ error: "PROJECT_WAITS" });
    await request(app).post(`${at}/apply`).send({ file, accept: [`table:${ids.tags}`] }).expect(200);
    expect((await prisma.collection.findUniqueOrThrow({ where: { id: ids.tags } })).fields).toEqual([{ id: "label", type: "text", name: L("Label") }]);
    // Its values stay in the rows, hidden, as when a field is removed from the table's page.
    expect((await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: ids.tags } })).data).toMatchObject({ color: { en: "#f00" } });
  });

  test("ready features from the gallery go into another copy and come out the same", async () => {
    // A few of each kind, published where they can be: their designs, forms, steps and rules are the real ones.
    const picked = [...GALLERY.filter((e) => e.kind === "feature").slice(0, 25), ...GALLERY.filter((e) => e.kind === "function").slice(0, 15), ...GALLERY.filter((e) => e.kind === "api").slice(0, 15)];
    const installed: string[] = [];
    try {
      for (const e of picked) installed.push((await request(app).post("/v1/admin/my-features/templates/install").send({ template: e.template }).expect(201)).body.id);
      const fns = await prisma.featureItem.findMany({ where: { featureId: { in: installed }, kind: "function" }, select: { refId: true } });
      let published = 0;
      for (const f of fns) if ((await request(app).post(`/v1/admin/functions/${f.refId}/publish`)).status === 200) published++;
      expect(published).toBeGreaterThan(20);
      const file = await fileNow();
      const theirs = new Set((await prisma.featureItem.findMany({ where: { featureId: { in: installed } } })).map((i) => `${i.kind}:${i.refId}`).concat(installed.map((id) => `feature:${id}`)));
      expect(theirs.size).toBeGreaterThan(100);
      // Another copy: they aren't there.
      for (const id of installed) await request(app).post(`/v1/admin/my-features/${id}/remove`).send({ rows: "delete" }).expect(200);
      const p = await preview(file);
      expect(p.problems).toEqual([]);
      expect(p.items.filter((i: Obj) => theirs.has(i.ref)).every((i: Obj) => i.action === "add")).toBe(true);
      await request(app).post(`${at}/apply`).send({ file }).expect(200);
      // Out again, every piece is as it went: nothing to change.
      const again = await preview(await fileNow());
      expect(again.counts).toMatchObject({ add: 0, change: 0 });
      const after = await preview(file);
      expect(after.items.filter((i: Obj) => theirs.has(i.ref) && i.action !== "same")).toEqual([]);
    } finally {
      for (const id of installed) await request(app).post(`/v1/admin/my-features/${id}/remove`).send({ rows: "delete" });
    }
  }, 240_000);

  test("an address something else holds stops it, until that other thing is ticked to go", async () => {
    await made();
    const file = await fileNow();
    await clean();
    const other = await prisma.collection.create({ data: { slug: `${PREFIX}posts`, name: L(`${PREFIX}Other posts`), fields: [{ id: "t", type: "text", name: L("T") }] } });
    const p = await preview(file);
    expect(p.ok).toBe(false);
    expect(p.items.find((i: Obj) => i.ref === `table:${ids.posts}`)).toMatchObject({ action: "clash", clash: { what: "slug", word: `${PREFIX}posts`, by: `${PREFIX}Other posts` } });
    expect(p.items.find((i: Obj) => i.ref === `table:${other.id}`)).toMatchObject({ action: "only", rows: 0 });
    expect((await request(app).post(`${at}/apply`).send({ file }).expect(400)).body).toMatchObject({ error: "PROJECT_INVALID" });
    const freed = await preview(file, { remove: [`table:${other.id}`] });
    expect(freed).toMatchObject({ ok: true });
    expect(freed.items.find((i: Obj) => i.ref === `table:${ids.posts}`)).toMatchObject({ action: "add" });
    await request(app).post(`${at}/apply`).send({ file, remove: [`table:${other.id}`] }).expect(200);
    expect(await prisma.collection.findUnique({ where: { id: other.id } })).toBeNull();
    expect(await prisma.collection.findUnique({ where: { id: ids.posts } })).toMatchObject({ slug: `${PREFIX}posts` });
  });

  test("what goes mustn't break what stays; a file that isn't one is said", async () => {
    await made();
    const file = await fileNow();
    // Without the tags table in the file, while the posts it links stay: it can't go.
    const cut = { ...file, tables: file.tables.filter((t: Obj) => t.id !== ids.tags), functions: file.functions.filter((f: Obj) => f.id !== ids.send) };
    const p = await preview(cut, { remove: [`table:${ids.tags}`] });
    expect(p.ok).toBe(false);
    expect(p.problems).toEqual(expect.arrayContaining([{ at: `table:${ids.tags}`, message: `"${PREFIX}Posts" links "${PREFIX}Tags": it can't go while it does` }]));
    expect((await preview({ format: "estabrek.feature", formatVersion: 1 })).problems).toEqual([{ at: "format", message: "This is a feature template: install it from my features" }]);
  });

  test("is the owner's alone, and saved copies are kept, downloaded and removed", async () => {
    const role = await prisma.staffRole.create({ data: { name: `${PREFIX}system`, permissions: ["system:read", "system:write"] } });
    const member = await prisma.adminUser.create({ data: { email: "member@proj-spec.test", name: "member", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    const token = `Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`;
    expect((await request(app).get(`${at}/file`).set("Authorization", token).expect(403)).body).toMatchObject({ error: "OWNER_ONLY" });
    await request(app).post(`${at}/apply`).set("Authorization", token).send({ file: {} }).expect(403);

    await made();
    const saved = (await request(app).post(`${at}/snapshots`).send({ label: "Before the sale" }).expect(201)).body;
    expect(saved).toMatchObject({ label: "Before the sale", reason: "saved", size: { tables: expect.any(Number) }, bytes: expect.any(Number) });
    expect(saved).not.toHaveProperty("file");
    const down = await request(app).get(`${at}/snapshots/${saved.id}/file`).expect(200);
    expect(JSON.parse(down.text).tables.some((t: Obj) => t.id === ids.posts)).toBe(true);
    await request(app).delete(`${at}/snapshots/${saved.id}`).expect(204);
    await request(app).delete(`${at}/snapshots/${saved.id}`).expect(404);
  });
});
