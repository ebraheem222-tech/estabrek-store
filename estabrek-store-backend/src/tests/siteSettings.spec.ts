import { afterAll, beforeAll, describe, expect, test } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { forgetFeatureGate } from "../lib/featureGate.js";
import { forgetTriggers } from "../lib/fnTriggers.js";

// A whole site's settings (wave 1 of docs/sites-300-plan.ar.md), with the database: a site installed from the
// admin's own files carries what its owner can change; the owner changes them on the feature's page; the shop
// draws its pages with the public ones (the notice bar, the hours, the prices, booking open or closed) and never
// sees the private ones; its function reads them all ("{{settings.notifyOn}}"). Requests without a token run
// as the test owner.

const at = "/v1/admin/my-features";
const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
type Obj = Record<string, any>;
let sites: { siteFile: (key: string, o: { lang: "ar" | "en" | "he" }) => Obj };
const made: string[] = [];

async function clean() {
  for (const id of made) await request(app).post(`${at}/${id}/remove`).send({ rows: "delete" });
  made.length = 0;
  forgetFeatureGate();
  forgetTriggers();
}
beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as typeof sites;
  await clean();
});
afterAll(clean);

const shop = (slug: string) => request(app).get(`/v1/storefront/page?slug=${encodeURIComponent(slug)}&locale=en`);
/** Every element of a tree, with what is inside it. */
const all = (n: Obj): Obj[] => [n, ...(n.children ?? []).flatMap(all)];
/** The price elements of a page as the shop draws it: the stored page's own (bound to the price field), and their copies in a list (same id, or the id and _n). */
const priceIds = (stored: Obj) => all(stored.root).filter((n) => n.props?.bind?.text === "price").map((n) => n.id as string);
const prices = (tree: Obj, ids: string[]) => all(tree.root).filter((n) => ids.some((id) => n.id === id || String(n.id).startsWith(`${id.slice(0, 30)}_`))).length;

describe("A whole site's settings", () => {
  test("the owner changes them on the site's page: the shop shows the public ones, the bell reads them all", async () => {
    const file = sites.siteFile("site-restaurant", { lang: "en" });
    const res = await request(app).post(`${at}/templates/install`).send({ template: file, lang: "en" });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    made.push(res.body.id);
    const id = res.body.id as string;
    // What its file declares, each at its default.
    const settings = res.body.settings as { declared: Obj[]; values: Obj };
    expect(settings.declared.map((d) => d.key)).toEqual(file.settings.map((d: Obj) => d.key));
    expect(settings.values).toMatchObject({ noticeOn: false, bookingOpen: true, showPrices: true, notifyOn: true, notifyEmail: "" });
    expect(settings.values.hours).toEqual(file.settings[0].default);

    const ids: Obj = (await prisma.feature.findUnique({ where: { id }, select: { template: true } }))!.template!.ids;
    await prisma.page.updateMany({ where: { id: { in: Object.values(ids.page) as string[] } }, data: { status: "PUBLISHED" } });
    await request(app).put(`${at}/${id}`).send({ enabled: true }).expect(200);
    const slug = async (key: string) => (await prisma.page.findUnique({ where: { id: ids.page[key] }, select: { slug: true } }))!.slug;
    const [home, menu, book, contact] = [await slug("home"), await slug("offers"), await slug("book"), await slug("contact")];

    // As it came: no notice bar, the booking form, the prices.
    const before = { home: (await shop(home).expect(200)).body, menu: (await shop(menu).expect(200)).body, book: (await shop(book).expect(200)).body };
    expect(JSON.stringify(before.home)).not.toContain("call us before you come");
    expect(all(before.book.tree.root).some((n) => n.type === "form")).toBe(true);
    expect(JSON.stringify(before.book)).not.toContain("Online booking is closed");
    const menuPrices = priceIds((await prisma.page.findUnique({ where: { id: ids.page.offers }, select: { tree: true } }))!.tree as Obj);
    expect(menuPrices.length).toBeGreaterThan(0);
    expect(prices(before.menu.tree, menuPrices)).toBeGreaterThan(1);
    // The marks are the server's: the shop never sees one.
    for (const page of Object.values(before)) expect(JSON.stringify(page)).not.toMatch(/showIf|fromSetting/);

    // Out of shape: every problem said, nothing changed.
    const bad = await request(app).put(`${at}/${id}/settings`).send({ values: { bookingOpen: "no", nope: 1 } }).expect(400);
    expect(bad.body.details.problems.map((p: Obj) => p.key)).toEqual(["bookingOpen", "nope"]);

    const saved = await request(app)
      .put(`${at}/${id}/settings`)
      .send({ values: { noticeOn: true, notice: { en: "Closed on Friday for a family wedding" }, hours: { en: "Daily 8:00–16:00" }, bookingOpen: false, showPrices: false, notifyEmail: "owner@abusamir.example" } })
      .expect(200);
    expect(saved.body.settings.values).toMatchObject({ noticeOn: true, bookingOpen: false, showPrices: false, notifyEmail: "owner@abusamir.example" });

    const after = { home: (await shop(home).expect(200)).body, menu: (await shop(menu).expect(200)).body, book: (await shop(book).expect(200)).body, contact: (await shop(contact).expect(200)).body };
    // The notice bar opens the first page, in the owner's words.
    expect(JSON.stringify(after.home.tree.root.children[0])).toContain("Closed on Friday for a family wedding");
    // Booking closed: the owner's words and a call where the form was.
    expect(all(after.book.tree.root).some((n) => n.type === "form")).toBe(false);
    expect(JSON.stringify(after.book)).toContain("Online booking is closed");
    // No prices in the menu, nor on a dish's own page.
    expect(prices(after.menu.tree, menuPrices)).toBe(0);
    const dishes = await prisma.collection.findUnique({ where: { id: ids.table.offers }, select: { slug: true, templateId: true } });
    const dishPrices = priceIds((await prisma.page.findUnique({ where: { id: dishes!.templateId! }, select: { tree: true } }))!.tree as Obj);
    expect(dishPrices.length).toBe(1);
    const dish = (await shop(`/${dishes!.slug}/hummus`).expect(200)).body;
    expect(prices(dish.tree, dishPrices)).toBe(0);
    // The hours, where the pages give them.
    expect(JSON.stringify(after.contact)).toContain("Daily 8:00–16:00");
    // The address the bell writes to is private: never on the shop.
    for (const page of Object.values(after)) expect(JSON.stringify(page)).not.toContain("owner@abusamir.example");

    // The bell: its steps name settings its site declares (nothing in the way of publishing), and its runs read them.
    const fnId = ids.function.notify as string;
    const fn = (await request(app).get(`/v1/admin/functions/${fnId}`).expect(200)).body;
    expect(fn.problems).toEqual([]);
    expect(fn.settings.map((s: Obj) => s.key)).toContain("notifyEmail");
    const run = async () => (await request(app).post(`/v1/admin/functions/${fnId}/run`).send({ input: { row: { name: "Rana", phone: "050-123-4567" } }, dry: true, which: "draft" }).expect(200)).body;
    const on = await run();
    expect(on.ok).toBe(true);
    expect(on.trace[0]).toMatchObject({ at: "if", say: ["yes"] });
    // An email too, to the address in the settings.
    expect(JSON.stringify(on.trace)).toContain("owner@abusamir.example");
    await request(app).put(`${at}/${id}/settings`).send({ values: { notifyOn: false } }).expect(200);
    const off = await run();
    expect(off.trace[0]).toMatchObject({ at: "if", say: ["no"] });
    expect(off.trace).toHaveLength(1);

    // Exported, the site keeps its settings as declared; the owner's values stay here.
    const exported = (await request(app).get(`${at}/${id}/export`).expect(200)).body.template;
    expect(exported.settings.map((d: Obj) => d.key)).toEqual(file.settings.map((d: Obj) => d.key));
    await clean();
  });

  test("a feature built by hand has none", async () => {
    const hand = (await request(app).post(at).send({ name: "Friends" }).expect(201)).body;
    made.push(hand.id);
    expect(hand.settings).toBeNull();
    const res = await request(app).put(`${at}/${hand.id}/settings`).send({ values: { x: 1 } }).expect(409);
    expect(res.body.error ?? res.body.code).toBeTruthy();
    await request(app).delete(`${at}/${hand.id}`).expect(200);
    made.length = 0;
  });
});
