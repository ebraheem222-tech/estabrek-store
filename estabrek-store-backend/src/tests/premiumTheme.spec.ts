import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { PREMIUM_THEMES, buildTemplate } from "../../../estabrek-admin/src/studio/templates/catalog";
import { planTheme, replaceOps } from "../../../estabrek-admin/src/studio/themePlan";

// Plan 3.9c of the themes library: a whole premium theme put into a store's pages' drafts (the admin's
// studio/themeApply.ts), through the real drafts: an old page's sections give way to the theme's, nothing changes in
// the shop until the draft is published, and once it is the page is drawn from its tree, its sections across the
// whole screen. A store's own header takes the theme's header the same way.
const kit = PREMIUM_THEMES.find((k) => k.theme.key === "midnight")!;
const build = (template: string) => {
  let n = 0;
  return buildTemplate(template, { ids: (p) => `pt-${p}-${n++}`, fam: "fashion", lang: "ar", all: true }) as any[];
};
const shopPage = async (slug: string) => (await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}`).expect(200)).body;
/** What putTheme does for one page: the draft (or the tree its first draft starts from), then the changes in turn. */
async function putPart(pageId: string, template: string) {
  const draft = (await request(app).get(`/v1/admin/pages/${pageId}/draft`).expect(200)).body.draft;
  const tree = draft?.tree ?? (await request(app).get(`/v1/admin/pages/${pageId}/tree`).expect(200)).body.tree;
  let rev = draft?.rev;
  for (const ops of replaceOps(tree.root.id, tree.root.children ?? [], build(template))) {
    const r = await request(app).post(`/v1/admin/pages/${pageId}/draft/ops`).send({ ops, ...(rev !== undefined ? { rev } : {}) });
    expect(r.status, JSON.stringify(r.body).slice(0, 300)).toBe(200);
    rev = r.body.draft.rev;
  }
}

beforeEach(async () => {
  await prisma.page.deleteMany({ where: { slug: { in: ["/about", "/contact"] } } });
  await prisma.page.deleteMany({ where: { name: "Theme header" } });
});

describe("a whole premium theme put into the store's drafts", () => {
  test("an old page's sections give way to the theme's, the shop keeps the old page until it's published, then draws the theme across the screen", async () => {
    const page = await prisma.page.create({ data: { name: "About", slug: "/about", status: "PUBLISHED", sections: { create: [{ type: "HERO", data: { title: "Welcome" } as any, order: 0 }, { type: "FAQ", data: { title: "Questions", items: [] } as any, order: 1 }] } } });
    const [about] = planTheme(kit, [{ id: page.id, slug: "/about" }], null).filter((t) => t.part === "about");
    expect(about.pageId).toBe(page.id);
    await putPart(page.id, about.template);

    // Not yet in the shop.
    const before = await shopPage("/about");
    expect(before.format).toBe(1);
    expect(before.sections).toHaveLength(2);

    await request(app).post(`/v1/admin/pages/${page.id}/draft/publish`).send({}).expect(200);
    const after = await shopPage("/about");
    expect(after.format).toBe(2);
    const kids = after.tree.root.children;
    expect(kids.map((n: any) => n.type)).toEqual(kit.theme.pages.about.map(() => "section"));
    expect(kids.every((n: any) => n.props.bleed === true)).toBe(true);
    // The old sections went to the draft's bin with the draft: none left in the tree.
    expect(kids.some((n: any) => n.type === "legacy")).toBe(false);
  });

  test("a new contact page, made as the gallery makes it, takes the theme's contact page as a draft", async () => {
    const made = (await request(app).post("/v1/admin/pages").send({ name: "تواصل", slug: "/contact" }).expect(201)).body;
    await request(app).post(`/v1/admin/pages/${made.id}/format`).send({ format: 2 }).expect(200);
    await putPart(made.id, kit.parts.find((p) => p.part === "contact")!.id);
    const draft = (await request(app).get(`/v1/admin/pages/${made.id}/draft`).expect(200)).body.draft;
    expect(draft.tree.root.children).toHaveLength(kit.theme.pages.contact.length);
    // A new page is a draft page: nothing in the shop until it's published.
    expect((await prisma.page.findUnique({ where: { id: made.id } }))?.status).toBe("DRAFT");
  });

  test("a store's own header block takes the theme's header", async () => {
    const block = await prisma.page.create({ data: { name: "Theme header", slug: `/__block/theme-${Date.now().toString(36)}`, kind: "block", status: "PUBLISHED", format: 2, tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "old-head", type: "section", props: { tag: "header" }, children: [] }] } } as any } });
    const [header] = planTheme(kit, [], { storeDesign: { mode: "cms", headerId: block.id, footerId: "f" } }).filter((t) => t.part === "header");
    expect(header.pageId).toBe(block.id);
    await putPart(block.id, header.template);
    await request(app).post(`/v1/admin/pages/${block.id}/draft/publish`).send({}).expect(200);
    const saved = await prisma.page.findUnique({ where: { id: block.id } });
    const kids = (saved?.tree as any).root.children;
    expect(kids).toHaveLength(1);
    expect(kids[0].id).not.toBe("old-head");
    expect(kids[0].props.tag).toBe("header");
  });
});
