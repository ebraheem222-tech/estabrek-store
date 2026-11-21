import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";

// Admin → القصص and the shop's story circles, on the database (src/lib/stories.ts, modules/admin/stories.controller.ts,
// modules/storefront/stories.routes.ts).
const pic = (n: number) => `https://res.cloudinary.com/x/image/upload/s${n}.jpg`;
const reel = (title: string, extra: Record<string, unknown> = {}) => ({
  title: { ar: title },
  slides: [{ id: "s1", kind: "image", src: pic(1), caption: { ar: "جديد" } }],
  ...extra,
});
const make = (body: Record<string, unknown>) => request(app).post("/v1/admin/stories").send(body);

beforeEach(async () => {
  await prisma.storyReel.deleteMany();
});
afterAll(async () => {
  await prisma.storyReel.deleteMany();
});

describe("admin → القصص", () => {
  test("a new reel goes last; the list in the owner's order with its numbers", async () => {
    const a = (await make(reel("وصل جديد")).expect(201)).body;
    const b = (await make(reel("عروض")).expect(201)).body;
    expect([a.order, b.order]).toEqual([0, 1]);
    expect(a.slides[0]).toMatchObject({ id: "s1", kind: "image", src: pic(1), caption: { ar: "جديد" } });
    const list = (await request(app).get("/v1/admin/stories").expect(200)).body;
    expect(list.reels.map((r: { title: { ar: string } }) => r.title.ar)).toEqual(["وصل جديد", "عروض"]);
    expect(list.reels[0]).toMatchObject({ views: 0, taps: 0, isActive: true });
    expect(list.limits.slides).toBe(20);
  });

  test("a whole reel changed, the order changed, one taken away; bad ones refused", async () => {
    const a = (await make(reel("أ")).expect(201)).body;
    const b = (await make(reel("ب")).expect(201)).body;
    const changed = (await request(app).patch(`/v1/admin/stories/${a.id}`).send(reel("أ٢", { isActive: false, startsAt: "2026-11-27T00:00:00.000Z", endsAt: "2026-11-30T00:00:00.000Z", cover: pic(9) })).expect(200)).body;
    expect(changed).toMatchObject({ title: { ar: "أ٢" }, isActive: false, cover: pic(9), startsAt: "2026-11-27T00:00:00.000Z", endsAt: "2026-11-30T00:00:00.000Z" });
    await request(app).post("/v1/admin/stories/order").send({ ids: [b.id, a.id] }).expect(200);
    expect((await request(app).get("/v1/admin/stories")).body.reels.map((r: { id: string }) => r.id)).toEqual([b.id, a.id]);
    await request(app).post("/v1/admin/stories/order").send({ ids: [b.id, "nope"] }).expect(400);
    await request(app).patch(`/v1/admin/stories/${a.id}`).send(reel("x", { slides: [{ id: "s", kind: "image", src: "javascript:alert(1)" }] })).expect(400);
    await request(app).patch("/v1/admin/stories/missing").send(reel("x")).expect(404);
    await request(app).delete(`/v1/admin/stories/${a.id}`).expect(200);
    await request(app).delete(`/v1/admin/stories/${a.id}`).expect(404);
    expect(await prisma.storyReel.count()).toBe(1);
  });
});

describe("the shop's story circles", () => {
  test("only live reels, in order; a reel's view and tap counted once a half hour per browser", async () => {
    const live = (await make(reel("شغّالة")).expect(201)).body;
    await make(reel("مطفية", { isActive: false })).expect(201);
    await make(reel("خلص وقتها", { endsAt: "2020-01-01T00:00:00.000Z" })).expect(201);
    await make(reel("فاضية", { slides: [] })).expect(201);
    const shop = (await request(app).get("/v1/storefront/stories").expect(200)).body;
    expect(shop.reels.map((r: { title: { ar: string } }) => r.title.ar)).toEqual(["شغّالة"]);
    expect(shop.reels[0]).toMatchObject({ id: live.id, cover: pic(1), endsAt: null });

    await request(app).post(`/v1/storefront/stories/${live.id}/view`).expect(204);
    await request(app).post(`/v1/storefront/stories/${live.id}/view`).expect(204);
    await request(app).post(`/v1/storefront/stories/${live.id}/tap`).expect(204);
    await request(app).post(`/v1/storefront/stories/${live.id}/like`).expect(400);
    await request(app).post("/v1/storefront/stories/missing-reel/view").expect(404);
    const stat = await prisma.storyStat.findUnique({ where: { reelId: live.id } });
    expect([stat?.views, stat?.taps]).toEqual([1, 1]);
    expect((await request(app).get("/v1/admin/stories")).body.reels[0]).toMatchObject({ views: 1, taps: 1 });
  });
});
