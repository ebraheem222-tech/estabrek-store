import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import request from "supertest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";

let app: Express;
let prisma: PrismaClient;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL || "http://invalid");
  if (process.env.TEST_DATABASE_ISOLATED !== "true" || !["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/estabrek_cms_publish_test") {
    throw new Error("Publishing integration tests require the dedicated localhost estabrek_cms_publish_test fixture; no live database is allowed.");
  }
  app = (await import("./helpers/testApp.js")).default;
  prisma = (await import("../lib/prisma.js")).prisma;
});
beforeEach(async () => { await prisma.page.deleteMany(); });
afterAll(async () => { if (prisma) await prisma.$disconnect(); });

async function create() {
  const page = (await request(app).post("/v1/admin/pages").send({ name: "Publishing fixture", slug: "/t" }).expect(201)).body;
  const edge = { height: 20, color: "accent", front: true, art: { viewBox: "0 0 100 20", nodes: [{ t: "path", a: { d: "M0 20L50 0L100 20Z", fill: "currentColor" } }] } };
  const draft = (await request(app).post(`/v1/admin/pages/${page.id}/draft/ops`).send({ ops: [{ op: "insert", parentId: "page", index: 0, node: { id: "section", type: "section", props: {}, children: [{ id: "copy", type: "heading", props: { text: { en: "Visible after publish", ar: "صفحة منشورة" }, edges: { top: edge, bottom: edge } } }] } }] }).expect(200)).body.draft;
  return { page, draft, edge, publish: (body = {}) => request(app).post(`/v1/admin/pages/${page.id}/draft/publish`).send(body) };
}

test("a fresh page is404 before publish, then publicly readable in every enabled content locale with its SVG edges", async () => {
  const { page, draft, edge, publish } = await create();
  expect((await prisma.page.findUniqueOrThrow({ where: { id: page.id } })).status).toBe("DRAFT");
  await request(app).get("/v1/storefront/page?slug=/t").expect(404);
  const result = (await publish({ rev: draft.rev }).expect(200)).body;
  expect(result.publication).toMatchObject({ state: "live", public: true });
  for (const locale of ["ar", "en", "he"]) {
    const live = (await request(app).get(`/v1/storefront/page?slug=/t&locale=${locale}`).expect(200)).body;
    expect(live.tree.root.children[0].children[0].props.edges).toEqual({ top: edge, bottom: edge });
  }
  expect((await prisma.page.findUniqueOrThrow({ where: { id: page.id } })).draft).toBeNull();
  expect(await prisma.pageRevision.count({ where: { pageId: page.id, reason: "Publish from the new editor", status: "DRAFT" } })).toBe(1);
});

test("concurrent system-page opening creates one draft and never resets subsequent merchant changes", async () => {
  const opened = await Promise.all([request(app).post("/v1/admin/pages/system/cart"), request(app).post("/v1/admin/pages/system/cart")]);
  expect(opened.map(response => response.status)).toEqual([200, 200]);
  expect(opened[0].body.id).toBe(opened[1].body.id);
  expect(await prisma.page.count({ where: { slug: "/cart" } })).toBe(1);
  const id = opened[0].body.id;
  await request(app).post(`/v1/admin/pages/${id}/draft/ops`).send({ ops: [{ op: "setName", nodeId: "commerce-cartItems", name: "Our bag" }] }).expect(200);
  const before = await prisma.page.findUniqueOrThrow({ where: { id } });
  const reopened = (await request(app).post("/v1/admin/pages/system/cart").expect(200)).body;
  expect(reopened.draft).toEqual(before.draft);
  expect(reopened.status).toBe("DRAFT");
  await request(app).get("/v1/storefront/page?slug=/cart").expect(404);
});

test("a future schedule remains private until explicitly overridden by publish-now", async () => {
  const page = (await request(app).post("/v1/admin/pages").send({ name: "Scheduled", slug: "/t", publishAt: "2099-01-01T00:00:00Z" }).expect(201)).body;
  const edit = () => request(app).post(`/v1/admin/pages/${page.id}/draft/ops`).send({ ops: [{ op: "insert", parentId: "page", index: 0, node: { id: "s", type: "section", props: {}, children: [] } }] });
  const d = (await edit().expect(200)).body.draft;
  expect((await request(app).post(`/v1/admin/pages/${page.id}/draft/publish`).send({ rev: d.rev }).expect(200)).body.publication.state).toBe("scheduled");
  await request(app).get("/v1/storefront/page?slug=/t").expect(404);
  const d2 = (await request(app).post(`/v1/admin/pages/${page.id}/draft/ops`).send({ ops: [{ op: "setName", nodeId: "s", name: "Republish now" }] }).expect(200)).body.draft;
  expect((await request(app).post(`/v1/admin/pages/${page.id}/draft/publish`).send({ rev: d2.rev, mode: "now" }).expect(200)).body.publication.state).toBe("live");
  await request(app).get("/v1/storefront/page?slug=/t").expect(200);
});

test("a concurrent archive is not overwritten by an older editor even with force", async () => {
  const { page, draft, publish } = await create();
  await request(app).patch(`/v1/admin/pages/${page.id}`).send({ status: "ARCHIVED" }).expect(200);
  expect((await publish({ rev: draft.rev, force: true }).expect(409)).body.error).toBe("PUBLICATION_CHANGED");
  expect((await prisma.page.findUniqueOrThrow({ where: { id: page.id } })).status).toBe("ARCHIVED");
  await request(app).get("/v1/storefront/page?slug=/t").expect(404);
});

test("a database transaction abort rolls back the pre-publish revision too", async () => {
  const { page, publish } = await create();
  const original = prisma.$transaction;
  const transaction = original.bind(prisma);
  // Prisma exposes this method through a Proxy; restoring a spy can delete it.
  prisma.$transaction = ((run: any) => transaction(async tx => { await run(tx); throw new Error("Isolated transaction abort"); })) as any;
  try { await publish().expect(500); } finally { prisma.$transaction = original; }
  expect((await prisma.page.findUniqueOrThrow({ where: { id: page.id } })).status).toBe("DRAFT");
  expect(await prisma.pageRevision.count({ where: { pageId: page.id, reason: "Publish from the new editor" } })).toBe(0);
});

test.each(["section", "translation"] as const)("a concurrent legacy %s edit waits for the publication snapshot and is not lost", async target => {
  const page = (await request(app).post("/v1/admin/pages").send({ name: "Concurrent fixture", slug: "/t" }).expect(201)).body;
  const section = await prisma.pageSection.create({ data: { pageId: page.id, type: "HERO", order: 0, data: { title: "Original" }, translations: { create: { locale: "en", data: { title: "Original" } } } }, include: { translations: true } });
  await request(app).post(`/v1/admin/pages/${page.id}/draft/ops`).send({ ops: [{ op: "insert", parentId: "page", index: 0, node: { id: "native", type: "section", props: {}, children: [] } }] }).expect(200);
  let reached!: () => void, release!: () => void;
  const paused = new Promise<void>(resolve => { reached = resolve; });
  const resume = new Promise<void>(resolve => { release = resolve; });
  const original = prisma.$transaction;
  const transaction = original.bind(prisma);
  // Pause after the publisher's authoritative read, retaining real PostgreSQL locks.
  prisma.$transaction = ((run: any) => transaction(async tx => {
    let first = true;
    const wrapped = new Proxy(tx, { get(db, key) {
      if (key !== "page") return Reflect.get(db, key);
      return new Proxy(db.page, { get(model, method) {
        if (method !== "findUnique") return Reflect.get(model, method);
        return async (args: any) => { const row = await model.findUnique(args); if (first) { first = false; reached(); await resume; } return row; };
      } });
    } });
    return run(wrapped);
  }, { timeout: 10000 })) as any;
  const publishing = request(app).post(`/v1/admin/pages/${page.id}/draft/publish`).send({}).then(response => response);
  let writing: Promise<unknown> | undefined;
  let finished = false, blocked = false;
  try {
    await paused;
    let identify!: (pid: number) => void;
    const identified = new Promise<number>(resolve => { identify = resolve; });
    writing = transaction(async tx => {
      const [connection] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      identify(connection.pid);
      if (target === "section") await tx.pageSection.update({ where: { id: section.id }, data: { data: { title: "Concurrent edit" } } });
      else await tx.pageSectionTranslation.update({ where: { id: section.translations[0].id }, data: { data: { title: "Concurrent edit" } } });
    }).finally(() => { finished = true; });
    const pid = await identified;
    const deadline = Date.now() + 2000;
    while (!finished && !blocked && Date.now() < deadline) {
      const [activity] = await prisma.$queryRaw<Array<{ wait_event_type: string | null }>>`SELECT wait_event_type FROM pg_stat_activity WHERE pid = ${pid}`;
      blocked = activity?.wait_event_type === "Lock";
      if (!blocked && !finished) await new Promise(resolve => setTimeout(resolve, 10));
    }
  } finally {
    release(); prisma.$transaction = original;
    const published = await publishing;
    await writing;
    expect(published.status).toBe(200);
  }
  expect(blocked, "legacy child writes must wait rather than change content after the publish conflict check").toBe(true);
  const saved = target === "section" ? await prisma.pageSection.findUniqueOrThrow({ where: { id: section.id } }) : await prisma.pageSectionTranslation.findUniqueOrThrow({ where: { id: section.translations[0].id } });
  expect(saved.data).toEqual({ title: "Concurrent edit" });
});

test("the real PostgreSQL JSON query picks a due publication boundary and invalidates it once", async () => {
  const { retryPublicationDeliveries } = await import("../lib/pagePublicationDelivery.js");
  const { page, publish } = await create();
  await publish().expect(200);
  const row = await prisma.page.findUniqueOrThrow({ where: { id: page.id } });
  const prior = row.publicationDelivery as any;
  // Completed records without a future boundary must not fill the bounded batch
  // and starve a genuinely due page behind them.
  await prisma.page.createMany({ data: Array.from({ length: 51 }, (_, i) => ({ id: `idle-cache-${i}`, name: "Idle fixture", slug: `/idle-cache-${i}`, status: "PUBLISHED" as const, updatedAt: new Date("2020-01-01T00:00:00Z"), publicationDelivery: { ...prior, state: "delivered", retryAt: null, nextBoundaryAt: null } })) });
  await prisma.page.update({ where: { id: page.id }, data: { unpublishAt: new Date(Date.now() - 60_000), publicationDelivery: { ...prior, state: "delivered", nextBoundaryAt: new Date(Date.now() - 60_000).toISOString() } } });
  expect(await retryPublicationDeliveries()).toMatchObject({ checked: 1 });
  const after = await prisma.page.findUniqueOrThrow({ where: { id: page.id } });
  expect((after.publicationDelivery as any).id).not.toBe(prior.id);
  expect((after.publicationDelivery as any).nextBoundaryAt).toBeNull();
  expect(await retryPublicationDeliveries()).toMatchObject({ checked: 0 });
  await request(app).get("/v1/storefront/page?slug=/t").expect(404);
});
