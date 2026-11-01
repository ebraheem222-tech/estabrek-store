import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";

// Saved blocks of the new editor (src/lib/pageBlocks.ts) through the admin and the shop.
const band = { id: "band", type: "section", props: {}, children: [{ id: "t", type: "heading", props: { text: { ar: "عرض الأسبوع" }, level: 2 } }] };

beforeEach(async () => {
  await prisma.page.deleteMany();
});

async function pageLinking(blockId: string) {
  return prisma.page.create({
    data: { name: "Home", slug: "/with-block", status: "PUBLISHED", format: 2, tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "lnk", type: "block", props: { blockId } }] } } as any },
  });
}

describe("Saved blocks", () => {
  test("a block is saved from sections, listed apart from the pages, and never served as a page", async () => {
    const made = (await request(app).post("/v1/admin/pages/blocks").send({ name: " Weekly offer ", sections: [band] }).expect(201)).body;
    expect(made).toMatchObject({ name: "Weekly offer", sections: 1, uses: 0 });
    const row = await prisma.page.findUnique({ where: { id: made.id } });
    expect(row).toMatchObject({ kind: "block", status: "PUBLISHED", format: 2 });
    expect(row!.slug.startsWith("/__block/")).toBe(true);
    // Not among the pages, not a page of the shop.
    expect((await request(app).get("/v1/admin/pages").expect(200)).body.some((p: any) => p.id === made.id)).toBe(false);
    await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(row!.slug)}`).expect(404);
    expect((await request(app).get("/v1/storefront/pages").expect(200)).body.pages.some((p: any) => p.slug === row!.slug)).toBe(false);
    // Only sections, checked like a page.
    await request(app).post("/v1/admin/pages/blocks").send({ name: "x", sections: [{ id: "h", type: "heading", props: {} }] }).expect(400);
    await request(app).post("/v1/admin/pages/blocks").send({ name: "", sections: [band] }).expect(400);
  });

  test("a page linking a block gets its published sections in place; a published change reaches it", async () => {
    const made = (await request(app).post("/v1/admin/pages/blocks").send({ name: "Offer", sections: [band] }).expect(201)).body;
    await pageLinking(made.id);
    const shop = async () => (await request(app).get("/v1/storefront/page?slug=/with-block").expect(200)).body.tree.root.children;
    const first = await shop();
    expect(first.map((n: any) => n.id)).toEqual(["lnk"]);
    expect(first[0].children[0]).toMatchObject({ id: "lnk_0", props: { text: { ar: "عرض الأسبوع" } } });
    expect((await request(app).get("/v1/admin/pages/blocks").expect(200)).body[0].uses).toBe(1);
    // The block is edited and published like a page: the page shows the new words.
    const rev = (await request(app).get(`/v1/admin/pages/${made.id}/draft`).expect(200)).body.draft?.rev ?? 0;
    await request(app).post(`/v1/admin/pages/${made.id}/draft/ops`).send({ rev, ops: [{ op: "setProps", nodeId: "t", props: { text: { ar: "عرض جديد" }, level: 2 } }] }).expect(200);
    await request(app).post(`/v1/admin/pages/${made.id}/draft/publish`).send({}).expect(200);
    expect((await shop())[0].children[0].props.text.ar).toBe("عرض جديد");
    // Deleted: the link draws nothing.
    await request(app).delete(`/v1/admin/pages/${made.id}`).expect(200);
    expect(await shop()).toEqual([]);
  });
});
