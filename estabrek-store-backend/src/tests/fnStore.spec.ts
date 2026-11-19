import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { FN_LIMITS, type FnDef } from "../lib/fnDef.js";
import { resetRunsForTests } from "../lib/runs.js";

// A function's store steps (stage 2, item 7; lib/fnStore.ts), with the database: a coupon made, a
// piece's quantity changed, a shopper given a role or put in a group, each as a real run and as a
// try-out that changes nothing; and who may publish them. Requests to /v1/admin without a token
// run as the test owner.

const PREFIX = "fnstore-spec-";
const at = "/v1/admin/functions";
const SKU = "FNSTORE-SPEC-M";
const EMAIL = "sara@fnstore-spec.test";
const ROLE = "fnstore-vip";
const GROUP = `${PREFIX}club`;
type Line = { at: string; act: string; ok: boolean; say?: unknown[]; error?: string };
type Out = { ok: boolean; dry: boolean; value: any; error: string | null; failedAt: string | null; trace: Line[]; counts: Record<string, number> };

const make = async (name: string, def: Partial<FnDef>, publish = true) => {
  const made = (await request(app).post(at).send({ name: `${PREFIX}${name}` }).expect(201)).body;
  const saved = (await request(app).put(`${at}/${made.id}`).send({ draft: { lang: "en", inputs: [], do: [], ...def } }).expect(200)).body;
  if (publish) {
    expect(saved.problems).toEqual([]);
    await request(app).post(`${at}/${made.id}/publish`).expect(200);
  }
  return { id: made.id as string, problems: saved.problems as Array<{ at: string; message: string }> };
};
const run = async (id: string, input: Record<string, unknown> = {}, dry = false) => (await request(app).post(`${at}/${id}/run`).send({ input, dry, which: dry ? "draft" : "live" }).expect(200)).body as Out;
const stockNow = async () => (await prisma.productVariant.findUniqueOrThrow({ where: { sku: SKU }, select: { stock: true } })).stock;
const sara = () => prisma.user.findUniqueOrThrow({ where: { email: EMAIL }, select: { id: true, roles: true, groups: true } });

async function clean() {
  await resetRunsForTests();
  await prisma.run.deleteMany({ where: { kind: "function", name: { startsWith: PREFIX } } });
  await prisma.fn.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.coupon.deleteMany({ where: { OR: [{ note: { startsWith: PREFIX } }, { code: { startsWith: "FNSPEC" } }] } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.size.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@fnstore-spec.test" } } });
  await prisma.shopperRole.deleteMany({ where: { key: { startsWith: "fnstore" } } });
  await prisma.shopperGroup.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: "@fnstore-spec.test" } } });
  await prisma.staffRole.deleteMany({ where: { name: { startsWith: PREFIX } } });
  invalidateAccess();
}
beforeEach(async () => {
  await clean();
  const cat = await prisma.category.create({ data: { name: "Shawls", slug: `${PREFIX}shawls` } });
  const size = await prisma.size.create({ data: { name: `${PREFIX}M` } });
  await prisma.product.create({
    data: {
      title: "Chiffon shawl",
      slug: `${PREFIX}shawl`,
      categoryId: cat.id,
      items: { create: [{ colorName: "Black", skuBase: "FNSTORE-SPEC", variants: { create: [{ sku: SKU, price: new Prisma.Decimal(60), stock: 5, size: { connect: { id: size.id } } }] } }] },
    },
  });
  await prisma.user.create({ data: { email: EMAIL, name: "Sara", phone: "+970 599-123-456" } });
  await prisma.shopperRole.create({ data: { key: ROLE, name: { en: "VIP", ar: "مميّزة" } } });
  await prisma.shopperGroup.create({ data: { name: GROUP } });
});
afterAll(clean);

describe("Make a coupon", () => {
  test("made from what the run knows, kept for the steps after it, and in admin → Coupons like any other", async () => {
    const fn = await make("gift", {
      inputs: [{ name: "phone", type: "text" }],
      do: [
        { act: "coupon", off: "percent", value: 15, max: 40, minCart: 100, uses: 2, days: 7, phone: "{{input.phone}}", note: `${PREFIX}gift`, as: "coupon" },
        { act: "return", value: "{{coupon}}" },
      ],
    });
    const t0 = Date.now();
    const out = await run(fn.id, { phone: "0599 123 456" });
    expect(out.ok).toBe(true);
    // A made-up code: eight letters and digits that read clearly (no 0/O, 1/I/L).
    expect(out.value.code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    expect(out.value).toMatchObject({ off: "percent", value: 15, max: 40, minCart: 100, uses: 2, phone: "599123456" });
    expect(Math.abs(new Date(out.value.endsAt).getTime() - (t0 + 7 * 86_400_000))).toBeLessThan(60_000);
    expect(out.trace[0]).toMatchObject({ at: "do.0", act: "coupon", ok: true, say: ["couponMade", out.value.code, "15%"] });
    expect(out.counts.store).toBe(1);
    const c = await prisma.coupon.findUniqueOrThrow({ where: { code: out.value.code } });
    expect({ type: c.discountType, value: Number(c.discountValue), max: Number(c.maxDiscount), minCart: Number(c.minCart), uses: c.usageLimit, used: c.usedCount, phone: c.phone, active: c.isActive, note: c.note }).toEqual({ type: "PERCENT", value: 15, max: 40, minCart: 100, uses: 2, used: 0, phone: "599123456", active: true, note: `${PREFIX}gift` });
    expect(c.id).toBe(out.value.id);
    // The admin's own list shows it.
    const listed = (await request(app).get("/v1/admin/coupons").query({ q: out.value.code }).expect(200)).body;
    expect(JSON.stringify(listed)).toContain(out.value.code);
  });

  test("a try-out makes up a code and keeps nothing; a code of its own is the owner's, and taken only once", async () => {
    const fn = await make("own-code", { inputs: [{ name: "name", type: "text" }], do: [{ act: "coupon", code: "fnspec-{{input.name}}", off: "amount", value: "20", note: `${PREFIX}own`, as: "c" }, { act: "return", value: "{{c.code}}" }] });
    const dry = await run(fn.id, { name: "sara" }, true);
    expect(dry).toMatchObject({ ok: true, dry: true, value: "FNSPEC-SARA" });
    expect(dry.trace[0].say).toEqual(["wouldCoupon", "FNSPEC-SARA", "20"]);
    expect(await prisma.coupon.count({ where: { note: `${PREFIX}own` } })).toBe(0);

    expect((await run(fn.id, { name: "sara" })).value).toBe("FNSPEC-SARA");
    const c = await prisma.coupon.findUniqueOrThrow({ where: { code: "FNSPEC-SARA" } });
    expect({ type: c.discountType, value: Number(c.discountValue), uses: c.usageLimit, ends: c.endsAt, phone: c.phone }).toEqual({ type: "FIXED", value: 20, uses: 1, ends: null, phone: null });
    // The same code again: the run stops at the step, and says why (a try-out says it too).
    for (const dryRun of [false, true]) expect(await run(fn.id, { name: "Sara" }, dryRun)).toMatchObject({ ok: false, failedAt: "do.0", error: 'A coupon "FNSPEC-SARA" is there already' });
    expect(await prisma.coupon.count({ where: { note: `${PREFIX}own` } })).toBe(1);
  });

  test("what it can't be: said before publishing when written as it is, and when the run fills it", async () => {
    const bad = await make(
      "bad",
      {
        do: [
          { act: "coupon", off: "percent", value: 120, note: PREFIX },
          { act: "coupon", off: "amount", value: 10, max: 5, note: PREFIX },
          { act: "coupon", code: "two words", off: "percent", value: 10, uses: 1.5, days: 0, phone: "12", note: PREFIX },
          { act: "coupon", off: "percent", value: "", note: PREFIX },
        ],
      },
      false,
    );
    expect(bad.problems).toEqual([
      { at: "do.0", message: "The discount is at most 100" },
      { at: "do.1", message: "The most off is for a percent" },
      { at: "do.2", message: "The uses is a whole number" },
      { at: "do.2", message: "The days is more than 0" },
      { at: "do.2", message: "A coupon's code is 2 to 32 letters, digits, - or _" },
      { at: "do.2", message: '"12" isn\'t a phone number' },
      { at: "do.3", message: "The discount is empty" },
    ]);
    await request(app).post(`${at}/${bad.id}/publish`).expect(409);
    const filled = await make("filled", { inputs: [{ name: "v", type: "any" }], do: [{ act: "coupon", off: "percent", value: "{{input.v}}", note: PREFIX }] });
    expect(await run(filled.id, { v: "lots" })).toMatchObject({ ok: false, failedAt: "do.0", error: "The discount has to be a number" });
    expect(await run(filled.id, { v: 0 })).toMatchObject({ ok: false, error: "The discount is more than 0" });
    expect(await prisma.coupon.count({ where: { note: PREFIX } })).toBe(0);
  });
});

describe("Change a piece's stock", () => {
  test("so many fewer, more, or exactly so many, by its SKU or its id; written in its stock history", async () => {
    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { sku: SKU } });
    const fn = await make("stock", {
      inputs: [{ name: "n", type: "number" }],
      do: [
        { act: "stock", sku: SKU, how: "take", amount: "{{input.n}}", reason: `${PREFIX}sold by hand`, as: "s" },
        { act: "stock", sku: variant.id, how: "add", amount: 4 },
        { act: "return", value: "{{s}}" },
      ],
    });
    const out = await run(fn.id, { n: 2 });
    expect(out.ok).toBe(true);
    expect(out.value).toEqual({ sku: SKU, product: "Chiffon shawl", color: "Black", size: `${PREFIX}M`, before: 5, after: 3 });
    expect(out.trace.map((l) => l.say)).toEqual([["stocked", SKU, 5, 3], ["stocked", SKU, 3, 7], ["returned"]]);
    expect(out.counts.store).toBe(2);
    expect(await stockNow()).toBe(7);
    // (Made in the same moment: in the order the quantity went.)
    const history = await prisma.inventoryAdjustment.findMany({ where: { variantId: variant.id }, orderBy: { beforeStock: "desc" } });
    expect(history.map((h) => [h.delta, h.beforeStock, h.afterStock, h.reason, h.adminUserId])).toEqual([
      [-2, 5, 3, `${PREFIX}sold by hand`, null],
      [4, 3, 7, "من function", null],
    ]);
    const exact = await make("exact", { do: [{ act: "stock", sku: SKU, how: "set", amount: 0 }] });
    expect((await run(exact.id)).trace[0].say).toEqual(["stocked", SKU, 7, 0]);
    expect(await stockNow()).toBe(0);
  });

  test("never below 0; a try-out changes nothing, and each of its steps sees what the one before would have left", async () => {
    const fn = await make("take", { inputs: [{ name: "n", type: "number" }], do: [{ act: "stock", sku: SKU, how: "take", amount: "{{input.n}}" }, { act: "stock", sku: SKU, how: "take", amount: "{{input.n}}" }] });
    const dry = await run(fn.id, { n: 2 }, true);
    expect(dry.ok).toBe(true);
    expect(dry.trace.map((l) => l.say)).toEqual([["wouldStock", SKU, 5, 3], ["wouldStock", SKU, 3, 1]]);
    expect(await stockNow()).toBe(5);
    // Not enough for the second: the first is done, the second stops the run with how many are left.
    const real = await run(fn.id, { n: 3 });
    expect(real).toMatchObject({ ok: false, failedAt: "do.1", error: `Only 2 left of ${SKU}` });
    expect(await stockNow()).toBe(2);
    expect(await run(fn.id, { n: 1.5 })).toMatchObject({ ok: false, failedAt: "do.0", error: "The amount is a whole number" });
    const none = await make("none", { do: [{ act: "stock", sku: "NO-SUCH-SKU", how: "add", amount: 1 }] });
    expect(await run(none.id)).toMatchObject({ ok: false, error: 'No piece with the SKU "NO-SUCH-SKU"' });
    expect((await make("empty", { do: [{ act: "stock", sku: " ", how: "add", amount: "" }] }, false)).problems).toEqual([
      { at: "do.0", message: "The piece is empty" },
      { at: "do.0", message: "The amount is empty" },
    ]);
  });
});

describe("Mark a customer", () => {
  test("a role given and taken, a group joined and left, by their email or id; and only read, for the steps after it", async () => {
    const fn = await make("mark", {
      inputs: [{ name: "who", type: "text" }],
      do: [
        { act: "customer", who: "{{input.who}}", mark: "giveRole", what: ROLE, as: "buyer" },
        { act: "customer", who: "{{buyer.id}}", mark: "join", what: GROUP },
        { act: "return", value: "{{buyer}}" },
      ],
    });
    const out = await run(fn.id, { who: EMAIL.toUpperCase() });
    expect(out.ok).toBe(true);
    const group = await prisma.shopperGroup.findUniqueOrThrow({ where: { name: GROUP } });
    const { id } = await sara();
    expect(out.value).toEqual({ id, name: "Sara", email: EMAIL, phone: "+970 599-123-456", roles: [ROLE], groups: [] });
    expect(out.trace.map((l) => l.say)).toEqual([["gaveRole", "VIP", "Sara"], ["joined", GROUP, "Sara"], ["returned"]]);
    expect(await sara()).toEqual({ id, roles: [ROLE], groups: [group.id] });
    // (A role is said by its name in the function's language.) Again: nothing more to do, and nothing counted as changed.
    const again = await run(fn.id, { who: id });
    expect(again.ok).toBe(true);
    expect(again.counts.store ?? 0).toBe(0);
    expect(await sara()).toEqual({ id, roles: [ROLE], groups: [group.id] });

    const undo = await make("undo", { do: [{ act: "customer", who: EMAIL, mark: "takeRole", what: ROLE }, { act: "customer", who: EMAIL, mark: "leave", what: group.id }] });
    // A try-out says what it would do, and does nothing.
    expect((await run(undo.id, {}, true)).trace.map((l) => l.say)).toEqual([["wouldTakeRole", "VIP", "Sara"], ["wouldLeave", GROUP, "Sara"]]);
    expect(await sara()).toEqual({ id, roles: [ROLE], groups: [group.id] });
    expect((await run(undo.id)).trace.map((l) => l.say)).toEqual([["tookRole", "VIP", "Sara"], ["left", GROUP, "Sara"]]);
    expect(await sara()).toEqual({ id, roles: [], groups: [] });

    // Only read: who they are, for a coupon kept for their phone.
    const read = await make("read", { do: [{ act: "customer", who: EMAIL, mark: "read", as: "buyer" }, { act: "coupon", off: "amount", value: 25, phone: "{{buyer.phone}}", note: `${PREFIX}theirs`, as: "c" }, { act: "return", value: "{{c.phone}}" }] });
    expect(await run(read.id)).toMatchObject({ ok: true, value: "599123456" });
  });

  test("a role or a group that isn't there, a customer who isn't", async () => {
    const draft = await make("unknown", { do: [{ act: "customer", who: EMAIL, mark: "giveRole", what: "nope" }, { act: "customer", who: EMAIL, mark: "join", what: "no such club" }, { act: "customer", who: "", mark: "leave", what: "" }] }, false);
    expect(draft.problems).toEqual([
      { at: "do.0", message: 'No role "nope"' },
      { at: "do.1", message: 'No group "no such club"' },
      { at: "do.2", message: "The customer is empty" },
      { at: "do.2", message: "The group is empty" },
    ]);
    const fn = await make("who", { inputs: [{ name: "who", type: "text" }], do: [{ act: "customer", who: "{{input.who}}", mark: "giveRole", what: ROLE }] });
    expect(await run(fn.id, { who: "nobody@fnstore-spec.test" })).toMatchObject({ ok: false, failedAt: "do.0", error: 'No customer "nobody@fnstore-spec.test"' });
  });
});

describe("From the gallery", () => {
  test("the loyalty points feature swaps a customer's points for a coupon for their phone", async () => {
    const { template } = (await request(app).get("/v1/admin/my-features/templates/gallery/feat-loyalty").expect(200)).body;
    const feature = (await request(app).post("/v1/admin/my-features/templates/install").send({ template }).expect(201)).body;
    try {
      const fns = feature.functions as Array<{ id: string; name: string }>;
      const swap = fns.find((f) => f.name === "بدّل نقاط بكوبون")!;
      const earn = fns.find((f) => f.name === "نقاط على الطلب")!;
      const table = (feature.tables as Array<{ id: string }>)[0];
      await request(app).post(`/v1/admin/collections/${table.id}/items`).send({ slug: "sara", status: "PUBLISHED", data: { phone: "0599123456", points: 200 } }).expect(201);
      // Points on an order, for a customer who has some already: the row is found and changed by its id ({{row.0.id}}).
      await request(app).post(`${at}/${earn.id}/publish`).expect(200);
      expect(await run(earn.id, { orderId: "ORD-1", phone: "0599123456", total: 500 })).toMatchObject({ ok: true, error: null });
      await request(app).post(`${at}/${swap.id}/publish`).expect(200);
      const out = await run(swap.id, { phone: "0599123456", points: 250 });
      expect({ error: out.error, at: out.failedAt }).toEqual({ error: null, at: null });
      // 200 of the 250 points: 20 off, and 50 points left.
      expect(out.value).toMatchObject({ off: 20, left: 50 });
      const c = await prisma.coupon.findUniqueOrThrow({ where: { code: out.value.code } });
      expect({ type: c.discountType, value: Number(c.discountValue), phone: c.phone, uses: c.usageLimit, note: c.note }).toEqual({ type: "FIXED", value: 20, phone: "599123456", uses: 1, note: "نقاط الولاء" });
      expect(Math.round((c.endsAt!.getTime() - Date.now()) / 86_400_000)).toBe(60);
      const row = await prisma.collectionItem.findFirstOrThrow({ where: { collectionId: table.id, slug: "sara" } });
      expect((row.data as { points: number }).points).toBe(50);
      expect(await run(swap.id, { phone: "0599123456", points: 100 })).toMatchObject({ ok: false, error: "النقاط ما بتكفي" });
      await prisma.coupon.delete({ where: { id: c.id } });
    } finally {
      await prisma.run.deleteMany({ where: { kind: "function", ref: { in: (feature.functions as Array<{ id: string }>).map((f) => f.id) } } });
      await request(app).post(`/v1/admin/my-features/${feature.id}/remove`).send({ rows: "delete" }).expect(200);
    }
  });
});

describe("Who may publish them, and how many a run does", () => {
  test("building functions isn't a way around the coupons', the stock's or the customers' own permissions", async () => {
    const member = async (name: string, permissions: string[]) => {
      const role = await prisma.staffRole.create({ data: { name: `${PREFIX}${name}`, permissions } });
      const u = await prisma.adminUser.create({ data: { email: `${name}@fnstore-spec.test`, name, passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
      return `Bearer ${signAccessToken({ sub: u.id, email: u.email, role: "STAFF" } as never)}`;
    };
    const builder = await member("builder", ["functions:read", "functions:write"]);
    const seller = await member("seller", ["functions:read", "functions:write", "discounts:write", "customers:read"]);
    const fn = await make("rights", { do: [{ act: "coupon", off: "percent", value: 10, note: PREFIX }, { act: "customer", who: EMAIL, mark: "read" }] }, false);
    const refused = await request(app).post(`${at}/${fn.id}/publish`).set("Authorization", builder).expect(403);
    expect(refused.body).toMatchObject({ error: "FN_NEEDS_RIGHT", details: { missing: ["customers:read", "discounts:write"] } });
    // The builder may still try it: a try-out changes nothing.
    expect((await request(app).post(`${at}/${fn.id}/run`).set("Authorization", builder).send({ input: {}, dry: true, which: "draft" }).expect(200)).body.ok).toBe(true);
    await request(app).post(`${at}/${fn.id}/publish`).set("Authorization", seller).expect(200);
    // Giving a role is more than reading a customer.
    await request(app).put(`${at}/${fn.id}`).set("Authorization", seller).send({ draft: { lang: "en", inputs: [], do: [{ act: "customer", who: EMAIL, mark: "giveRole", what: ROLE }] } }).expect(200);
    expect((await request(app).post(`${at}/${fn.id}/publish`).set("Authorization", seller).expect(403)).body.details.missing).toEqual(["customers:write"]);
    // Publishing an older version again is asked the same.
    expect((await request(app).post(`${at}/${fn.id}/versions/1/restore`).set("Authorization", builder).send({ to: "live" }).expect(403)).body.error).toBe("FN_NEEDS_RIGHT");
    // The builder's page still names the roles and groups a step picks from.
    const store = (await request(app).get(at).set("Authorization", builder).expect(200)).body.store;
    expect(store.roles).toContainEqual({ key: ROLE, name: { en: "VIP", ar: "مميّزة" } });
    expect(store.groups.map((g: { name: string }) => g.name)).toContain(GROUP);
  });

  test(`a run changes the store up to ${FN_LIMITS.store} times`, async () => {
    const fn = await make("many", { inputs: [{ name: "list", type: "list" }], do: [{ act: "each", list: "{{input.list}}", do: [{ act: "stock", sku: SKU, how: "add", amount: 0 }] }] }, false);
    const out = await run(fn.id, { list: Array.from({ length: FN_LIMITS.store + 1 }, (_x, i) => i) }, true);
    expect(out).toMatchObject({ ok: false, error: `A run changes the store up to ${FN_LIMITS.store} times`, failedAt: `do.0.do[${FN_LIMITS.store}].0` });
    expect(await stockNow()).toBe(5);
  });
});
