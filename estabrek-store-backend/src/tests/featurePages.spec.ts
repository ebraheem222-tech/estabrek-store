import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { resetCacheForTests } from "../lib/cache.js";
import { groupsWritten } from "../lib/dbWrites.js";
import { forgetFeatureGate, isStorePage, shownPagesWhere } from "../lib/featureGate.js";

// A feature's pages follow its switch (M, stage 1 of the platform plan), with the database: switched off, the
// feature's pages answer on the shop as pages that aren't there, at once (the shop's copies are dropped); switched
// on, they are back. The editor still opens them and says why they are hidden. The store's own pages (the home,
// the shop, the cart) never follow a switch. Requests to /v1/admin without a token run as the test owner.

const PREFIX = "fp-spec-";
const admin = "/v1/admin";
const at = `${admin}/my-features`;
type Full = { id: string; enabled: boolean; pages: Array<{ id: string; slug: string; hidden: boolean }>; free: { pages: Array<{ id: string; slug: string }> } };

const mkPage = async (name: string, status: "PUBLISHED" | "DRAFT" = "PUBLISHED") => prisma.page.create({ data: { name: `${PREFIX}${name}`, slug: `/${PREFIX}${name}`, kind: "page", status } });
const feature = async (name: string) => (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body as Full;
const add = (id: string, refId: string) => request(app).post(`${at}/${id}/items`).send({ kind: "page", refId });
const turn = async (id: string, enabled: boolean) => (await request(app).put(`${at}/${id}`).send({ enabled }).expect(200)).body as Full;
/** The shop asking for a page by its address: 200 with the page, or 404. */
const shop = async (slug: string) => (await request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}`)).status;
/** The addresses the shop lists (its sitemap and menus read this). */
const listed = async () => ((await request(app).get("/v1/storefront/pages").expect(200)).body.pages as Array<{ slug: string }>).map((p) => p.slug).filter((s) => s.startsWith(`/${PREFIX}`));
const publication = async (id: string) => (await request(app).get(`${admin}/pages/${id}/publication`).expect(200)).body as { publication: { state: string; public: boolean }; hiddenBy: { id: string; name: string } | null };

async function clean() {
  await prisma.feature.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.page.deleteMany({ where: { name: { startsWith: PREFIX } } });
  forgetFeatureGate();
  resetCacheForTests();
}
beforeAll(clean);
beforeEach(clean);
afterAll(clean);

describe("A feature's pages follow its switch", () => {
  test("switched off, its pages aren't there for the shop, at once; switched on, they are back", async () => {
    const friends = await mkPage("friends");
    const requests = await mkPage("requests");
    const about = await mkPage("about");
    const f = await feature("friends");
    await add(f.id, friends.id).expect(201);
    await add(f.id, requests.id).expect(201);
    // On: everything shows, and the shop's copies are warm.
    expect([await shop(friends.slug), await shop(requests.slug), await shop(about.slug)]).toEqual([200, 200, 200]);
    expect(await listed()).toEqual([about.slug, friends.slug, requests.slug]);

    const off = await turn(f.id, false);
    expect(off.pages.map((p) => [p.slug, p.hidden])).toEqual([[friends.slug, true], [requests.slug, true]]);
    // No waiting for a copy to run out: the very next question is answered "not there".
    expect([await shop(friends.slug), await shop(requests.slug)]).toEqual([404, 404]);
    expect(await listed()).toEqual([about.slug]);
    // A page of no feature is as it was.
    expect(await shop(about.slug)).toBe(200);

    const on = await turn(f.id, true);
    expect(on.pages.map((p) => p.hidden)).toEqual([false, false]);
    expect([await shop(friends.slug), await shop(requests.slug)]).toEqual([200, 200]);
    expect(await listed()).toEqual([about.slug, friends.slug, requests.slug]);
  });

  test("the editor still opens a hidden page and says which feature hides it; its own publication is untouched", async () => {
    const page = await mkPage("wall");
    const f = await feature("wall");
    await add(f.id, page.id).expect(201);
    expect((await publication(page.id)).hiddenBy).toBeNull();
    await turn(f.id, false);
    const now = await publication(page.id);
    expect(now.hiddenBy).toEqual({ id: f.id, name: `${PREFIX}wall` });
    // Still published as far as the page itself goes: switched on, it shows without publishing again.
    expect(now.publication).toMatchObject({ state: "live", public: true });
    expect((await prisma.page.findUnique({ where: { id: page.id } }))?.status).toBe("PUBLISHED");
    // Asked whether it is public: no, whatever its status.
    expect((await request(app).get(`${admin}/pages/${page.id}/publication/check`).expect(200)).body).toMatchObject({ state: "not_public", targets: [] });
    // The admin's own routes still give the page (its tree, its row in the list).
    await request(app).get(`${admin}/pages/${page.id}`).expect(200);
    expect(((await request(app).get(`${admin}/pages`).expect(200)).body as Array<{ id: string }>).some((p) => p.id === page.id)).toBe(true);
    await turn(f.id, true);
    expect((await publication(page.id)).hiddenBy).toBeNull();
  });

  test("a page joining a feature that is off hides with it; leaving it, or the feature deleted, it shows again", async () => {
    const a = await mkPage("a");
    const b = await mkPage("b");
    const f = await feature("late");
    await turn(f.id, false);
    expect([await shop(a.slug), await shop(b.slug)]).toEqual([200, 200]);
    expect((await add(f.id, a.id).expect(201)).body.pages[0].hidden).toBe(true);
    await add(f.id, b.id).expect(201);
    expect([await shop(a.slug), await shop(b.slug)]).toEqual([404, 404]);
    // One leaves: it is no feature's, so it shows.
    await request(app).delete(`${at}/${f.id}/items/page/${a.id}`).expect(200);
    expect([await shop(a.slug), await shop(b.slug)]).toEqual([200, 404]);
    // The feature goes: only the name went, and what it hid shows.
    await request(app).delete(`${at}/${f.id}`).expect(200);
    expect(await shop(b.slug)).toBe(200);
  });

  test("a page that isn't published stays unseen either way; a draft in a feature that is on isn't shown by it", async () => {
    const draft = await mkPage("draft", "DRAFT");
    const f = await feature("draft");
    await add(f.id, draft.id).expect(201);
    expect(await shop(draft.slug)).toBe(404);
    await turn(f.id, false);
    expect(await shop(draft.slug)).toBe(404);
    await turn(f.id, true);
    expect(await shop(draft.slug)).toBe(404);
  });

  test("the store's own pages (the home, the shop, the cart) aren't a feature's, and never hide", async () => {
    // The cart's page as the store has it, or one made for this test (taken away with it).
    const cart = (await prisma.page.findUnique({ where: { slug: "/cart" } })) ?? (await prisma.page.create({ data: { name: `${PREFIX}cart`, slug: "/cart", kind: "page", status: "PUBLISHED" } }));
    const before = await shop("/cart");
    const f = await feature("store");
    // Not offered, and refused when asked for by name.
    expect(((await request(app).get(`${at}/${f.id}`).expect(200)).body as Full).free.pages.some((p) => p.slug === "/cart")).toBe(false);
    expect((await add(f.id, cart.id).expect(400)).body).toMatchObject({ error: "STORE_PAGE" });
    // Even one that got in some other way doesn't follow the switch.
    await prisma.featureItem.create({ data: { featureId: f.id, kind: "page", refId: cart.id } });
    const off = await turn(f.id, false);
    expect(off.pages.find((p) => p.id === cart.id)?.hidden).toBe(false);
    expect(await shop("/cart")).toBe(before);
    expect((await publication(cart.id)).hiddenBy).toBeNull();
  });

  test("the rule itself: which pages the shop is answered, and what a change to a feature clears", () => {
    expect(isStorePage("/")).toBe(true);
    expect(isStorePage("/shop")).toBe(true);
    expect(isStorePage("/cart")).toBe(true);
    expect(isStorePage("/friends")).toBe(false);
    // No feature is off: the shop's question is as it always was.
    expect(shownPagesWhere(new Set())).toEqual({});
    expect(shownPagesWhere(new Set(["p1", "p2"]))).toEqual({ NOT: { id: { in: ["p1", "p2"] }, slug: { notIn: ["/", "/shop", "/cart"] } } });
    // A write to a feature drops the answers kept about pages.
    expect(groupsWritten('UPDATE "public"."Feature" SET "enabled" = $1 WHERE "id" = $2')).toEqual(["cms"]);
    expect(groupsWritten('INSERT INTO "public"."FeatureItem" ("featureId","kind","refId") VALUES ($1,$2,$3)')).toEqual(["cms"]);
    expect(groupsWritten('DELETE FROM "public"."FeatureItem" WHERE "kind" = $1')).toEqual(["cms"]);
  });
});
