import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";

// The new CMS's page tree (src/lib/pageTree.ts) through the admin and the shop:
// converting, saving, switching back, the old editor's changes, and revisions.
async function makePage() {
  const page = await prisma.page.create({ data: { name: "About", slug: "/about-tree", status: "PUBLISHED" } });
  const add = (type: string, data: unknown, order: number) => prisma.pageSection.create({ data: { pageId: page.id, type: type as any, data: data as any, order } });
  const hero = await add("HERO", { title: "Welcome" }, 0);
  const faq = await add("FAQ", { title: "Questions", items: [] }, 1);
  return { page, hero, faq };
}
const shopPage = async () => (await request(app).get("/v1/storefront/page?slug=/about-tree").expect(200)).body;
const legacyIds = (tree: any) => tree.root.children.filter((n: any) => n.type === "legacy").map((n: any) => n.props.sectionId);

beforeEach(async () => {
  await prisma.page.deleteMany();
});

describe("A page as a tree", () => {
  test("an old page reads as the tree it would become, and the shop still gets its sections", async () => {
    const { page, hero, faq } = await makePage();
    const r = (await request(app).get(`/v1/admin/pages/${page.id}/tree`).expect(200)).body;
    expect(r).toMatchObject({ format: 1, saved: false });
    expect(legacyIds(r.tree)).toEqual([hero.id, faq.id]);
    const shop = await shopPage();
    expect(shop).toMatchObject({ format: 1, tree: null });
    expect(shop.sections.map((s: any) => s.id)).toEqual([hero.id, faq.id]);
  });

  test("switching to the tree converts once, the shop gets it, and switching back keeps it", async () => {
    const { page, hero, faq } = await makePage();
    const on = (await request(app).post(`/v1/admin/pages/${page.id}/format`).send({ format: 2 }).expect(200)).body;
    expect(on).toMatchObject({ format: 2, saved: true });
    const shop = await shopPage();
    expect(shop.format).toBe(2);
    expect(legacyIds(shop.tree)).toEqual([hero.id, faq.id]);
    // The sections are still there for the tree's old sections.
    expect(shop.sections.map((s: any) => s.id)).toEqual([hero.id, faq.id]);

    await request(app).post(`/v1/admin/pages/${page.id}/format`).send({ format: 1 }).expect(200);
    expect(await shopPage()).toMatchObject({ format: 1, tree: null });
    expect((await prisma.page.findUnique({ where: { id: page.id } }))?.tree).toBeTruthy();
    await request(app).post(`/v1/admin/pages/${page.id}/format`).send({ format: 3 }).expect(400);
  });

  test("a saved tree is checked: bad links, sections of another page or twice are refused", async () => {
    const { page, hero } = await makePage();
    const other = await prisma.page.create({ data: { name: "Other", slug: "/other-tree", sections: { create: { type: "FAQ", data: {}, order: 0 } } }, include: { sections: true } });
    const tree = (children: unknown[]) => ({ tree: { version: 1, root: { id: "page", type: "page", children } } });
    const good = tree([
      { id: "intro", type: "section", children: [{ id: "t", type: "heading", props: { text: { ar: "من نحن", en: "About us", he: "עלינו" }, level: 1 } }] },
      { id: "old", type: "legacy", props: { sectionId: hero.id } },
    ]);
    const saved = (await request(app).put(`/v1/admin/pages/${page.id}/tree`).send(good).expect(200)).body;
    expect(saved.tree.root.children[0].children[0].props.text).toEqual({ ar: "من نحن", en: "About us", he: "עלינו" });
    // Saving doesn't change what the shop shows until the page is switched.
    expect((await shopPage()).format).toBe(1);

    const bad = await request(app).put(`/v1/admin/pages/${page.id}/tree`).send(tree([{ id: "s", type: "section", children: [{ id: "b", type: "button", props: { label: { ar: "x" }, href: "javascript:alert(1)" } }] }])).expect(400);
    expect(bad.body).toMatchObject({ error: "TREE_INVALID", issues: [{ path: "root.children[0].children[0].props.href" }] });
    const foreign = await request(app).put(`/v1/admin/pages/${page.id}/tree`).send(tree([{ id: "x", type: "legacy", props: { sectionId: other.sections[0].id } }])).expect(400);
    expect(foreign.body.issues[0].message).toMatch(/aren't on this page/);
    await request(app).put(`/v1/admin/pages/${page.id}/tree`).send(tree([{ id: "a", type: "legacy", props: { sectionId: hero.id } }, { id: "b", type: "legacy", props: { sectionId: hero.id } }])).expect(400);
  });

  test("the old editor keeps working on a converted page: add, move, delete", async () => {
    const { page, hero, faq } = await makePage();
    await request(app).post(`/v1/admin/pages/${page.id}/format`).send({ format: 2 }).expect(200);
    const cta = (await request(app).post(`/v1/admin/pages/${page.id}/sections`).send({ type: "CTA", data: { title: "Visit us" }, order: 2 }).expect(201)).body;
    const tree = async () => legacyIds((await request(app).get(`/v1/admin/pages/${page.id}/tree`).expect(200)).body.tree);
    expect(await tree()).toEqual([hero.id, faq.id, cta.id]);
    await request(app).post(`/v1/admin/pages/sections/${cta.id}/move`).send({ order: 0 }).expect(200);
    await request(app).post(`/v1/admin/pages/sections/${hero.id}/move`).send({ order: 3 }).expect(200);
    expect(await tree()).toEqual([cta.id, faq.id, hero.id]);
    await request(app).delete(`/v1/admin/pages/sections/${faq.id}`).expect(200);
    expect(await tree()).toEqual([cta.id, hero.id]);
  });

  test("restoring a revision brings back the tree and its sections with the same ids", async () => {
    const { page, hero, faq } = await makePage();
    await request(app).post(`/v1/admin/pages/${page.id}/format`).send({ format: 2 }).expect(200);
    // A later change the owner wants to undo: the FAQ goes.
    await prisma.pageRevision.deleteMany({ where: { pageId: page.id } });
    await request(app).delete(`/v1/admin/pages/sections/${faq.id}`).expect(200);
    const rev = await prisma.pageRevision.findFirst({ where: { pageId: page.id }, orderBy: { createdAt: "desc" } });
    expect(rev).toMatchObject({ format: 2 });
    await request(app).post(`/v1/admin/pages/${page.id}/revisions/${rev!.id}/restore`).send({ reason: "undo" }).expect(200);
    const shop = await shopPage();
    expect(shop.format).toBe(2);
    expect(legacyIds(shop.tree)).toEqual([hero.id, faq.id]);
    expect(shop.sections.map((s: any) => s.id)).toEqual([hero.id, faq.id]);
  });

  test("the editor's preview shows a draft page as a tree, with its ticket only", async () => {
    const { page, hero, faq } = await makePage();
    await prisma.page.update({ where: { id: page.id }, data: { status: "DRAFT" } });
    const { token } = (await request(app).post(`/v1/admin/pages/${page.id}/preview-token`).expect(200)).body;
    const r = await request(app).get(`/v1/storefront/page-preview?token=${encodeURIComponent(token)}&locale=en`).expect(200);
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(r.body.format).toBe(2);
    expect(legacyIds(r.body.tree)).toEqual([hero.id, faq.id]);
    // The public page stays hidden, and a wrong ticket opens nothing.
    await request(app).get("/v1/storefront/page?slug=/about-tree").expect(404);
    await request(app).get(`/v1/storefront/page-preview?token=${encodeURIComponent(token.slice(0, -2))}xx`).expect(401);
    await request(app).post("/v1/admin/pages/nope/preview-token").expect(404);
  });

  test("the editor's draft: changes wait, the preview shows them, publish writes them all", async () => {
    const { page, hero, faq } = await makePage();
    const ops = (body: object) => request(app).post(`/v1/admin/pages/${page.id}/draft/ops`).send(body);
    let d = (await ops({ ops: [
      { op: "setField", sectionId: hero.id, lang: "ar", path: ["title"], value: "أهلاً بالجديد" },
      { op: "setField", sectionId: hero.id, lang: "en", path: ["title"], value: "Hello, new" },
      { op: "move", nodeId: `s-${faq.id}`, index: 0 },
      { op: "placeBlock", block: "seasons", index: 1 },
    ] }).expect(200)).body.draft;
    expect(d.rev).toBe(1);
    // The shop's public page hasn't changed; the editor's preview has.
    expect((await shopPage()).sections.find((s: any) => s.id === hero.id).data.title).toBe("Welcome");
    const { token } = (await request(app).post(`/v1/admin/pages/${page.id}/preview-token`).expect(200)).body;
    const preview = (await request(app).get(`/v1/storefront/page-preview?token=${encodeURIComponent(token)}&locale=en`).expect(200)).body;
    expect(preview.draft.rev).toBe(1);
    expect(preview.sections.find((s: any) => s.id === hero.id).data.title).toBe("Hello, new");
    expect(preview.tree.root.children.map((n: any) => n.id)).toEqual([`s-${faq.id}`, "rb-seasons", `s-${hero.id}`]);
    // An old revision number is refused (another tab changed it).
    await ops({ rev: 0, ops: [{ op: "setVisible", sectionId: faq.id, visible: false }] }).expect(409);
    await ops({ ops: [{ op: "setField", sectionId: hero.id, lang: "ar", path: ["title"], value: { x: 1 } }] }).expect(400);

    await request(app).post(`/v1/admin/pages/${page.id}/draft/publish`).send({}).expect(200);
    const live = await shopPage();
    expect(live.format).toBe(2);
    expect(live.sections.map((s: any) => s.id)).toEqual([faq.id, hero.id]);
    expect(live.tree.root.children.map((n: any) => n.id)).toEqual([`s-${faq.id}`, "rb-seasons", `s-${hero.id}`]);
    expect((await request(app).get("/v1/storefront/page?slug=/about-tree&locale=en").expect(200)).body.sections.find((s: any) => s.id === hero.id).data.title).toBe("Hello, new");
    expect((await request(app).get(`/v1/admin/pages/${page.id}/draft`).expect(200)).body.draft).toBeNull();
    expect(await prisma.pageRevision.count({ where: { pageId: page.id, reason: "Publish from the new editor" } })).toBe(1);
  });

  test("publishing over changes made elsewhere needs a yes; deleting goes through the bin", async () => {
    const { page, hero, faq } = await makePage();
    const ops = (o: unknown[]) => request(app).post(`/v1/admin/pages/${page.id}/draft/ops`).send({ ops: o });
    await ops([{ op: "remove", nodeId: `s-${faq.id}` }]).expect(200);
    await ops([{ op: "restore", sectionId: faq.id }, { op: "remove", nodeId: `s-${faq.id}` }]).expect(200);
    // Someone edits the hero in the old editor meanwhile.
    await request(app).patch(`/v1/admin/pages/sections/${hero.id}`).send({ data: { title: "Changed elsewhere" } }).expect(200);
    await request(app).post(`/v1/admin/pages/${page.id}/draft/publish`).send({}).expect(409);
    await request(app).post(`/v1/admin/pages/${page.id}/draft/publish`).send({ force: true }).expect(200);
    expect(await prisma.pageSection.findMany({ where: { pageId: page.id }, select: { id: true } })).toEqual([{ id: hero.id }]);
    // A fresh draft can be thrown away.
    await ops([{ op: "setVisible", sectionId: hero.id, visible: false }]).expect(200);
    await request(app).delete(`/v1/admin/pages/${page.id}/draft`).expect(200);
    expect((await request(app).get(`/v1/admin/pages/${page.id}/draft`).expect(200)).body.draft).toBeNull();
  });
});
