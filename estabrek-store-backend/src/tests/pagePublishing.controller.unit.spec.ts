import { beforeEach, expect, test, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { applyOps, draftFromPage } from "../lib/pageDraft.js";
import { storePageDraft } from "../lib/storePageTemplates.js";

// Storage and external cache are isolated; real router, policy, snapshots and validation run.
const m = vi.hoisted(() => ({ row: null as any, revisions: [] as any[], owner: true, write: true, failSection: false,
  db: { page: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() }, pageRevision: { findFirst: vi.fn(), create: vi.fn() },
    pageSection: { update: vi.fn(), deleteMany: vi.fn() }, pageSectionTranslation: { upsert: vi.fn(), deleteMany: vi.fn() },
    siteSettings: { findFirst: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn() },
  revalidate: vi.fn(), clear: vi.fn(),
}));
vi.mock("../lib/prisma.js", () => ({ prisma: m.db }));
vi.mock("../config/env.js", () => ({ env: { NODE_ENV: "test", JWT_SECRET: "test-only-not-a-production-key", CORS_ORIGINS: "*" } }));
vi.mock("../lib/cache.js", () => ({ cacheDel: m.clear, cacheDelPrefix: m.clear }));
vi.mock("../lib/storefrontRevalidate.js", () => ({ revalidateStorefront: m.revalidate }));
import pages from "../modules/admin/pages.controller.js";

const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).access = { owner: m.owner, permissions: new Set(["pages:read", ...(m.write ? ["pages:write"] : [])]) }; (req as any).user = { sub: "fixture-owner" }; next(); });
app.use("/pages", pages);
app.use((err: any, _req: any, res: any, _next: any) => res.status(err.statusCode ?? err.status ?? (err.name === "ZodError" ? 400 : 500)).json({ error: err.code ?? err.name }));
const publish = (body = {}) => request(app).post("/pages/page/draft/publish").send(body);
const started = () => {
  m.row.draft = applyOps(draftFromPage(m.row), [{ op: "insert", parentId: "page", index: 0, node: { id: "section", type: "section", props: {}, children: [{ id: "copy", type: "heading", props: { text: { en: "Published content" } } }] } }], { main: "en" });
};

beforeEach(() => {
  vi.clearAllMocks(); m.owner = true; m.write = true; m.failSection = false; m.revisions = [];
  m.row = { id: "page", name: "Test page", slug: "/t", kind: "page", status: "DRAFT", publishAt: null, unpublishAt: null,
    sections: [], tree: null, format: 1, draft: null, publicationDelivery: null, updatedAt: new Date("2026-11-07T10:00:00Z"), createdAt: new Date("2026-11-01T10:00:00Z") };
  m.db.page.findUnique.mockImplementation(async () => structuredClone(m.row));
  m.db.page.upsert.mockImplementation(async ({ where, create }) => { if (m.row?.slug !== where.slug) m.row = { id: "system-page", ...structuredClone(create) }; return structuredClone(m.row); });
  m.db.page.update.mockImplementation(async ({ data }) => { Object.assign(m.row, data, { ...(data.draft === Prisma.DbNull ? { draft: null } : {}) }); return structuredClone(m.row); });
  m.db.page.updateMany.mockImplementation(async ({ where, data }) => {
    if (where?.publicationDelivery && "equals" in where.publicationDelivery) {
      const expected = where.publicationDelivery.equals === Prisma.DbNull || where.publicationDelivery.equals === Prisma.AnyNull ? null : where.publicationDelivery.equals;
      if (JSON.stringify(expected) !== JSON.stringify(m.row.publicationDelivery ?? null)) return { count: 0 };
    }
    Object.assign(m.row, data); return { count: 1 };
  });
  m.db.pageRevision.findFirst.mockResolvedValue(null);
  m.db.pageRevision.create.mockImplementation(async ({ data }) => { m.revisions.push(structuredClone(data)); return { id: "revision" }; });
  m.db.pageSection.update.mockImplementation(async () => { if (m.failSection) throw new Error("fixture write failure"); return {}; });
  m.db.pageSection.deleteMany.mockResolvedValue({ count: 0 });
  m.db.pageSectionTranslation.upsert.mockResolvedValue({}); m.db.pageSectionTranslation.deleteMany.mockResolvedValue({ count: 0 });
  m.db.$queryRaw.mockResolvedValue([{ id: "page" }]);
  m.db.$transaction.mockImplementation(async (run: any) => {
    const before = structuredClone(m.row), revisions = structuredClone(m.revisions);
    try { return await run(m.db); } catch (error) { m.row = before; m.revisions = revisions; throw error; }
  });
  m.revalidate.mockResolvedValue({ state: "success", targets: [{ origin: "https://shop.example.test", ok: true }] }); m.clear.mockResolvedValue(undefined);
  started();
});

test("publish makes a fresh draft live and keeps the previous draft status in its revision", async () => {
  const response = await publish().expect(200);
  expect(response.body).toMatchObject({ ok: true, format: 2, publication: { status: "PUBLISHED", state: "live", public: true, slug: "/t" } });
  expect(m.row.status).toBe("PUBLISHED"); expect(m.row.draft).toBeNull();
  expect(m.row.tree.root.children[0].children[0].props.text.en).toBe("Published content");
  expect(m.revisions).toMatchObject([{ status: "DRAFT", slug: "/t" }]);
});

test("a schedule is preserved and reported as scheduled rather than live", async () => {
  m.row.publishAt = new Date("2099-01-01T00:00:00Z"); started();
  const response = await publish().expect(200);
  expect(response.body.publication).toMatchObject({ state: "scheduled", public: false, publishAt: "2099-01-01T00:00:00.000Z" });
  expect(m.row.publishAt.toISOString()).toBe("2099-01-01T00:00:00.000Z");
});

test("publish now clears schedule only when explicitly requested", async () => {
  m.row.publishAt = new Date("2099-01-01T00:00:00Z"); m.row.unpublishAt = new Date("2099-02-01T00:00:00Z"); started();
  const response = await publish({ mode: "now" }).expect(200);
  expect(response.body.publication).toMatchObject({ state: "live", publishAt: null, unpublishAt: null });
  expect(m.row).toMatchObject({ status: "PUBLISHED", publishAt: null, unpublishAt: null });
});

test("archived pages need explicit republish consent", async () => {
  m.row.status = "ARCHIVED"; started();
  await publish().expect(409); expect(m.row.status).toBe("ARCHIVED"); expect(m.row.draft).not.toBeNull();
  await publish({ republishArchived: true }).expect(200); expect(m.row.status).toBe("PUBLISHED");
});

test("force-overwriting content does not bypass a concurrent archive", async () => {
  m.row.status = "ARCHIVED";
  const response = await publish({ force: true }).expect(409);
  expect(response.body.error).toBe("PUBLICATION_CHANGED"); expect(m.row.draft).not.toBeNull(); expect(m.revisions).toHaveLength(0);
});

test("a stale UI lifecycle confirmation or draft revision cannot overwrite newer changes", async () => {
  await publish({ expectedPublication: { status: "PUBLISHED", slug: "/t", publishAt: null, unpublishAt: null } }).expect(409);
  await publish({ rev: 0, force: true }).expect(409);
  expect(m.row.status).toBe("DRAFT"); expect(m.row.draft.rev).toBe(1); expect(m.revisions).toHaveLength(0);
});

test("a user who can edit content but cannot publish gets no write or cache side effect", async () => {
  m.owner = false;
  await publish().expect(403);
  expect(m.row.status).toBe("DRAFT"); expect(m.revisions).toHaveLength(0); expect(m.revalidate).not.toHaveBeenCalled();
});

test("publication diagnostics separate saved content from delivery and retry requires publish permission", async () => {
  expect((await request(app).get("/pages/page/publication").expect(200)).body).toMatchObject({ publication: { state: "draft", public: false }, hasDraft: true });
  await publish().expect(200);
  expect((await request(app).get("/pages/page/publication").expect(200)).body).toMatchObject({ publication: { state: "live", public: true }, delivery: { state: "delivered" }, hasDraft: false });
  const id = m.row.publicationDelivery.id; m.owner = false;
  await request(app).post("/pages/page/publication/retry").expect(403);
  expect(m.row.publicationDelivery.id).toBe(id);
});

test("a retry started from an older read never replaces a newer publication delivery", async () => {
  await publish().expect(200);
  const observed = structuredClone(m.row);
  const newer = { ...observed.publicationDelivery, id: "newer-publication", state: "pending", paths: ["/previous", "/latest"] };
  m.db.page.findUnique.mockImplementationOnce(async () => { m.row.publicationDelivery = newer; return observed; });
  const response = await request(app).post("/pages/page/publication/retry").expect(200);
  expect(m.row.publicationDelivery).toEqual(newer);
  expect(response.body.delivery.id).toBe("newer-publication");
});

test("opening a missing system page creates an unpublished editable draft, and reopening preserves edits", async () => {
  const first = (await request(app).post("/pages/system/cart").expect(200)).body;
  expect(first).toMatchObject({ id: "system-page", slug: "/cart", status: "DRAFT" });
  expect(first.draft.tree.root.children[0].children).toHaveLength(2);
  m.row.draft.rev = 77; m.row.name = "Merchant's own cart";
  const again = (await request(app).post("/pages/system/cart").expect(200)).body;
  expect(again).toMatchObject({ id: "system-page", name: "Merchant's own cart", draft: { rev: 77 } });
  expect(m.revisions).toEqual([]);
});
test("system page creation rejects unsupported kinds and read-only staff", async () => {
  await request(app).post("/pages/system/checkout").expect(400);
  m.owner = false; m.write = false;
  await request(app).post("/pages/system/shop").expect(403);
  expect(m.row.slug).toBe("/t");
});
test("a cart draft without checkout is rejected before any publication writes, including force", async () => {
  m.row.slug = "/cart";
  m.row.draft = applyOps(storePageDraft("cart"), [{ op: "remove", nodeId: "commerce-cartCheckout" }], { main: "ar" });
  const response = await publish({ force: true }).expect(422);
  expect(response.body).toMatchObject({ error: "COMMERCE_PAGE_INVALID", issues: [{ code: "REQUIRED_COMMERCE_OBJECT", nodeType: "cartCheckout", count: 0 }] });
  expect(m.row.status).toBe("DRAFT"); expect(m.row.draft).not.toBeNull(); expect(m.revisions).toEqual([]);
});
test("a complete cart draft publishes its independent commerce objects", async () => {
  m.row.slug = "/cart"; m.row.draft = storePageDraft("cart");
  await publish().expect(200);
  expect(m.row.format).toBe(2); expect(m.row.status).toBe("PUBLISHED");
  expect(m.row.tree.root.props.commerceVersion).toBe(1);
  expect(JSON.stringify(m.row.tree)).toContain('"cartCheckout"');
});

test("cache propagation failure is a committed publication with separately reported pending delivery", async () => {
  m.revalidate.mockResolvedValue({ state: "failed", targets: [{ origin: "https://shop.example.test", ok: false }] });
  const response = await publish().expect(200);
  expect(response.body.publication).toMatchObject({ public: true });
  expect(response.body.delivery).toMatchObject({ state: "pending" });
  expect(m.row.status).toBe("PUBLISHED"); expect(m.row.publicationDelivery.state).toBe("pending");
});

test("malformed options cannot change content or schedule", async () => {
  await publish({ mode: "unexpected", republishArchived: "yes" }).expect(400);
  expect(m.row.status).toBe("DRAFT"); expect(m.row.draft).not.toBeNull();
});

test("rescheduling through page settings also registers the next cache invalidation boundary", async () => {
  await publish().expect(200);
  await request(app).patch("/pages/page").send({ status: "PUBLISHED", publishAt: "2099-01-01T00:00:00Z" }).expect(200);
  expect(m.row.publicationDelivery.nextBoundaryAt).toBe("2099-01-01T00:00:00.000Z");
  expect((await request(app).get("/pages/page/publication").expect(200)).body.publication).toMatchObject({ state: "scheduled", public: false });
});

test("a section write failure rolls back content, publication and the revision together", async () => {
  m.row.sections = [{ id: "old", type: "HERO", order: 0, isVisible: true, data: { title: "Before" }, translations: [] }]; started(); m.failSection = true;
  await publish().expect(500);
  expect(m.row.status).toBe("DRAFT"); expect(m.row.draft).not.toBeNull(); expect(m.revisions).toHaveLength(0);
});
