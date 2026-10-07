import { describe, test, expect, beforeEach } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { applyPolicy, envDefaults } from "../lib/securityPolicy.js";

// Requests without a token run as the test owner (NODE_ENV=test bypass).
// Requests with a Bearer token run as that member.

const asMember = (id: string) => `Bearer ${signAccessToken({ sub: id, role: "STAFF", email: `${id}@t.local` })}`;

async function clean() {
  invalidateAccess();
  await prisma.securityPolicy.deleteMany();
  applyPolicy(envDefaults());
  await prisma.adminAuditLog.deleteMany();
  await prisma.adminPasswordReset.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.adminSecurityEvent.deleteMany();
  await prisma.settingsRevision.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.staffRole.deleteMany();
  await prisma.page.deleteMany({ where: { slug: { startsWith: "/team-test" } } });
}

async function makeRole(name: string, permissions: string[]) {
  return prisma.staffRole.create({ data: { name, permissions } });
}

async function makeMember(email: string, roleId: string | null, extra: Record<string, unknown> = {}) {
  return prisma.adminUser.create({
    data: {
      email,
      name: email.split("@")[0],
      passwordHash: await argon2.hash("Member-pass-123", { type: argon2.argon2id }),
      role: "STAFF",
      status: "ACTIVE",
      staffRoleId: roleId,
      ...extra,
    },
  });
}

beforeEach(clean);

describe("Team: inviting a member", () => {
  test("invite → set password from the link → sign in → only their role's pages", async () => {
    const support = await makeRole("طلبات", ["dashboard:read", "orders:read", "orders:write", "catalog:read"]);

    const inv = await request(app)
      .post("/v1/admin/staff/members")
      .send({ name: "سارة", email: "Sara@Shop.test", staffRoleId: support.id })
      .expect(201);
    expect(inv.body.member).toMatchObject({ email: "sara@shop.test", status: "INVITED", owner: false });
    expect(inv.body.invite.kind).toBe("invite");

    // No password yet: can't sign in.
    await request(app).post("/v1/auth/login").send({ email: "sara@shop.test", password: "anything-123" }).expect(401);

    const joined = await request(app)
      .post("/v1/auth/password/reset")
      .send({ token: inv.body.invite.token, newPassword: "Sara-pass-2026" })
      .expect(200);
    expect(joined.body.joined).toBe(true);

    const login = await request(app).post("/v1/auth/login").send({ email: "sara@shop.test", password: "Sara-pass-2026" }).expect(200);
    expect(login.body.admin).toMatchObject({ owner: false, status: "ACTIVE", staffRole: { name: "طلبات" } });
    expect(login.body.admin.permissions).toEqual(expect.arrayContaining(["orders:write", "account:read"]));
    expect(login.body.admin.permissions).not.toContain("settings:read");

    const auth = `Bearer ${login.body.accessToken}`;
    await request(app).get("/v1/admin/orders").set("Authorization", auth).expect(200);
    await request(app).get("/v1/admin/catalog/products").set("Authorization", auth).expect(200);
    const denied = await request(app).post("/v1/admin/catalog/categories").set("Authorization", auth).send({ name: "x", slug: "x" }).expect(403);
    expect(denied.body).toMatchObject({ error: "PERMISSION_DENIED", required: ["catalog:write"] });
    await request(app).get("/v1/admin/settings").set("Authorization", auth).expect(403);
    await request(app).get("/v1/admin/staff/members").set("Authorization", auth).expect(403);

    const me = await request(app).get("/v1/admin/account/me").set("Authorization", auth).expect(200);
    expect(me.body.staffRole.name).toBe("طلبات");
  });

  test("an unused invite can be removed; a member who joined can only be suspended", async () => {
    const r = await makeRole("مشاهدة", ["dashboard:read"]);
    const inv = await request(app).post("/v1/admin/staff/members").send({ name: "Lina", email: "lina@shop.test", staffRoleId: r.id }).expect(201);
    await request(app).delete(`/v1/admin/staff/members/${inv.body.member.id}`).expect(200);
    const joined = await makeMember("joined@shop.test", r.id, { lastLoginAt: new Date() });
    const out = await request(app).delete(`/v1/admin/staff/members/${joined.id}`).expect(409);
    expect(out.body.error).toBe("USE_SUSPEND");
  });
});

describe("Team: what members can and can't do to access", () => {
  test("a member can only hand out permissions they hold, and can't touch themselves", async () => {
    const lead = await makeRole("قائدة", ["staff:read", "staff:write", "orders:read"]);
    const strong = await makeRole("قوي", ["settings:write"]);
    const me = await makeMember("lead@shop.test", lead.id);
    const other = await makeMember("other@shop.test", lead.id);
    const auth = asMember(me.id);

    const grant = await request(app)
      .post("/v1/admin/staff/roles")
      .set("Authorization", auth)
      .send({ name: "دور جديد", permissions: ["orders:read", "settings:write"] })
      .expect(403);
    expect(grant.body.error).toBe("CANNOT_GRANT");
    await request(app).post("/v1/admin/staff/roles").set("Authorization", auth).send({ name: "دور طلبات", permissions: ["orders:read"] }).expect(201);

    // Own role, own account, owners and stronger roles are off limits.
    expect((await request(app).patch(`/v1/admin/staff/roles/${lead.id}`).set("Authorization", auth).send({ permissions: ["settings:write"] }).expect(403)).body.error).toBe("OWN_ROLE");
    expect((await request(app).patch(`/v1/admin/staff/members/${me.id}`).set("Authorization", auth).send({ status: "SUSPENDED" }).expect(400)).body.error).toBe("SELF_CHANGE");
    expect((await request(app).post("/v1/admin/staff/members").set("Authorization", auth).send({ name: "Boss", email: "boss@shop.test", owner: true }).expect(403)).body.error).toBe("OWNERS_ONLY");
    expect((await request(app).patch(`/v1/admin/staff/members/${other.id}`).set("Authorization", auth).send({ staffRoleId: strong.id }).expect(403)).body.error).toBe("CANNOT_GRANT");
  });

  test("suspending a member stops them at once and signs them out everywhere", async () => {
    const r = await makeRole("طلبات", ["dashboard:read", "orders:read"]);
    const m = await makeMember("sus@shop.test", r.id);
    await prisma.adminSession.create({ data: { adminUserId: m.id, status: "ACTIVE", expiresAt: new Date(Date.now() + 86_400_000) } });
    await request(app).get("/v1/admin/orders").set("Authorization", asMember(m.id)).expect(200);

    const out = await request(app).patch(`/v1/admin/staff/members/${m.id}`).send({ status: "SUSPENDED" }).expect(200);
    expect(out.body).toMatchObject({ status: "SUSPENDED", activeSessions: 0 });
    const blocked = await request(app).get("/v1/admin/orders").set("Authorization", asMember(m.id)).expect(403);
    expect(blocked.body.error).toBe("ACCOUNT_SUSPENDED");
    await request(app).post("/v1/auth/login").send({ email: "sus@shop.test", password: "Member-pass-123" }).expect(403);

    await request(app).patch(`/v1/admin/staff/members/${m.id}`).send({ status: "ACTIVE" }).expect(200);
    await request(app).get("/v1/admin/orders").set("Authorization", asMember(m.id)).expect(200);
  });

  test("the store always keeps one active owner", async () => {
    const owner = await prisma.adminUser.create({
      data: { email: "owner@shop.test", name: "Owner", passwordHash: "x", role: "SUPERADMIN", status: "ACTIVE" },
    });
    const out = await request(app).patch(`/v1/admin/staff/members/${owner.id}`).send({ status: "SUSPENDED" }).expect(409);
    expect(out.body.error).toBe("LAST_OWNER");
    await prisma.adminUser.create({ data: { email: "owner2@shop.test", name: "Owner 2", passwordHash: "x", role: "SUPERADMIN" } });
    await request(app).patch(`/v1/admin/staff/members/${owner.id}`).send({ status: "SUSPENDED" }).expect(200);
  });

  test("a role in use can't be deleted", async () => {
    const r = await makeRole("مستخدم", ["orders:read"]);
    await makeMember("x@shop.test", r.id);
    expect((await request(app).delete(`/v1/admin/staff/roles/${r.id}`).expect(409)).body.error).toBe("ROLE_IN_USE");
  });
});

describe("Activity log", () => {
  test("records who changed what (field names, never values); reads are not logged", async () => {
    const r = await makeRole("إعدادات", ["settings:read", "settings:write", "activity:read"]);
    const m = await makeMember("set@shop.test", r.id);
    const auth = asMember(m.id);
    await request(app).get("/v1/admin/settings").set("Authorization", auth).expect(200);
    await request(app).patch("/v1/admin/settings").set("Authorization", auth).send({ siteName: "استبرق" }).expect(200);
    await new Promise((res) => setTimeout(res, 150));

    const log = await request(app).get("/v1/admin/activity").set("Authorization", auth).expect(200);
    expect(log.body.rows).toHaveLength(1);
    expect(log.body.rows[0]).toMatchObject({ area: "settings", verb: "update", method: "PATCH", path: "/settings", fields: ["siteName"] });
    expect(log.body.rows[0].adminUser.email).toBe("set@shop.test");
    expect(JSON.stringify(log.body.rows[0])).not.toContain("استبرق");

    const mine = await request(app).get(`/v1/admin/staff/members/${m.id}`).expect(200);
    expect(mine.body.activity).toHaveLength(1);
  });
});

describe("Payment keys", () => {
  test("members without payments:write never see the secrets and can't change payment settings", async () => {
    await prisma.siteSettings.deleteMany();
    await prisma.siteSettings.create({ data: { siteName: "استبرق", stripeSecretKey: "sk_live_real", stripeEnabled: true } });
    const r = await makeRole("إعدادات", ["settings:read", "settings:write"]);
    const m = await makeMember("pay@shop.test", r.id);
    const auth = asMember(m.id);

    const got = await request(app).get("/v1/admin/settings").set("Authorization", auth).expect(200);
    expect(got.body).toMatchObject({ stripeSecretKey: null, paymentsLocked: true });

    await request(app)
      .patch("/v1/admin/settings")
      .set("Authorization", auth)
      .send({ siteName: "استبرق ستور", stripeSecretKey: "sk_live_attacker", stripeEnabled: false })
      .expect(200);
    const s = await prisma.siteSettings.findFirst();
    expect(s).toMatchObject({ siteName: "استبرق ستور", stripeSecretKey: "sk_live_real", stripeEnabled: true });

    // The owner sees and edits them.
    const owner = await request(app).get("/v1/admin/settings").expect(200);
    expect(owner.body).toMatchObject({ stripeSecretKey: "sk_live_real", paymentsLocked: false });
  });
});

describe("Pages: publishing needs pages:publish", () => {
  test("saving a published page's text is fine; publishing or unpublishing isn't", async () => {
    const r = await makeRole("كاتبة", ["pages:read", "pages:write"]);
    const m = await makeMember("writer@shop.test", r.id);
    const auth = asMember(m.id);
    const live = await prisma.page.create({ data: { name: "عن", slug: "/team-test-about", status: "PUBLISHED" } });
    const draft = await prisma.page.create({ data: { name: "جديدة", slug: "/team-test-new", status: "DRAFT" } });

    await request(app).patch(`/v1/admin/pages/${live.id}`).set("Authorization", auth).send({ name: "من نحن", status: "PUBLISHED", publishAt: null }).expect(200);
    const pub = await request(app).patch(`/v1/admin/pages/${draft.id}`).set("Authorization", auth).send({ status: "PUBLISHED" }).expect(403);
    expect(pub.body.required).toEqual(["pages:publish"]);
    await request(app).patch(`/v1/admin/pages/${live.id}`).set("Authorization", auth).send({ status: "DRAFT" }).expect(403);
  });
});

describe("Sign-in hardening", () => {
  test("there is no way to get tokens for a session without the 2-step code", async () => {
    await request(app).post("/v1/auth/mfa/tokens-from-session").send({ sessionId: "anything" }).expect(404);
  });

  test("the 2-step step only finishes the session that admin started", async () => {
    const a = await makeMember("a@shop.test", null);
    const b = await makeMember("b@shop.test", null);
    const s = await prisma.adminSession.create({ data: { adminUserId: a.id, status: "ACTIVE", expiresAt: new Date(Date.now() + 60_000) } });
    await request(app).post("/v1/auth/mfa/finalize").send({ sessionId: s.id, adminId: b.id, totp: "123456" }).expect(401);
  });
});
