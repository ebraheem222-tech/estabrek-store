import { describe, test, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { invalidateAccess } from "../middleware/access.js";
import { applyPolicy, envDefaults, policy } from "../lib/securityPolicy.js";
import { checkIpAccess } from "../config/ipAccess.js";
import { issueTokensFromSession } from "../modules/auth/auth.service.js";
import { createOtpChallenge } from "../modules/auth/otp.service.js";

// Requests without a token run as the test owner (NODE_ENV=test bypass, 2FA on).

const asMember = (id: string) => `Bearer ${signAccessToken({ sub: id, role: "STAFF", email: `${id}@t.local` })}`;

async function member(email: string, extra: Record<string, unknown> = {}) {
  const role = await prisma.staffRole.create({ data: { name: `r-${email}`, permissions: ["dashboard:read", "orders:read"] } });
  return prisma.adminUser.create({
    data: {
      email,
      name: email.split("@")[0],
      passwordHash: await argon2.hash("Member-pass-123", { type: argon2.argon2id }),
      role: "STAFF",
      staffRoleId: role.id,
      ...extra,
    },
  });
}

beforeEach(async () => {
  invalidateAccess();
  await prisma.securityPolicyRevision.deleteMany();
  await prisma.securityPolicy.deleteMany();
  applyPolicy(envDefaults());
  await prisma.adminAuditLog.deleteMany();
  await prisma.adminOtpChallenge.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.adminSecurityEvent.deleteMany();
  await prisma.adminPasswordReset.deleteMany();
  await prisma.settingsRevision.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.staffRole.deleteMany();
});

// Leave the database on the default rules for the other test files.
afterAll(async () => {
  await prisma.securityPolicyRevision.deleteMany();
  await prisma.securityPolicy.deleteMany();
  applyPolicy(envDefaults());
});

describe("Security policy: reading and saving", () => {
  test("starts from the environment, with the allowed ranges and the caller's IP", async () => {
    const out = await request(app).get("/v1/admin/system/security").expect(200);
    expect(out.body.policy).toEqual(envDefaults());
    expect(out.body.limits["login.maxFailed"]).toEqual({ min: 3, max: 20 });
    expect(out.body.yourIp).toBe("127.0.0.1");
    expect(out.body.fromDb).toBe(true);
  });

  test("a change is in force at once, keeps the old rules, and can be undone", async () => {
    const out = await request(app).patch("/v1/admin/system/security").send({ login: { maxFailed: 3 }, session: { idleHours: 12 } }).expect(200);
    expect(out.body.changed.sort()).toEqual(["login.maxFailed", "session.idleHours"]);
    expect(policy().login.maxFailed).toBe(3);

    const got = await request(app).get("/v1/admin/system/security").expect(200);
    expect(got.body.revisions).toHaveLength(1);
    await request(app).post(`/v1/admin/system/security/revisions/${got.body.revisions[0].id}/restore`).expect(200);
    expect(policy().login.maxFailed).toBe(envDefaults().login.maxFailed);

    await request(app).patch("/v1/admin/system/security").send({ otp: { ttlMinutes: 3 } }).expect(200);
    await request(app).post("/v1/admin/system/security/reset").expect(200);
    expect(policy()).toEqual(envDefaults());
  });

  test("values outside the allowed range are refused", async () => {
    await request(app).patch("/v1/admin/system/security").send({ login: { maxFailed: 1 } }).expect(400);
    await request(app).patch("/v1/admin/system/security").send({ ip: { siteBlock: ["not-an-ip"] } }).expect(400);
    await request(app).patch("/v1/admin/system/security").send({ nonsense: {} }).expect(400);
  });

  test("members need system:read / system:write", async () => {
    const m = await member("m@shop.test");
    await request(app).get("/v1/admin/system/security").set("Authorization", asMember(m.id)).expect(403);
  });
});

describe("Security policy: rules that would lock you out are refused", () => {
  test("blocking your own IP, or an allow-list without it", async () => {
    const a = await request(app).patch("/v1/admin/system/security").send({ ip: { adminBlock: ["127.0.0.1"] } }).expect(409);
    expect(a.body.error).toBe("BLOCKS_YOUR_IP");
    const b = await request(app).patch("/v1/admin/system/security").send({ ip: { adminAllow: ["10.0.0.0/8"] } }).expect(409);
    expect(b.body.error).toBe("NOT_IN_ALLOWLIST");
    await request(app).patch("/v1/admin/system/security").send({ ip: { adminAllow: ["127.0.0.0/8"], siteBlock: ["203.0.113.5"] } }).expect(200);
    expect(checkIpAccess({ ip: "203.0.113.5", path: "/v1/catalog/products" })).toMatchObject({ allowed: false, code: "IP_BLOCKED" });
    expect(checkIpAccess({ ip: "198.51.100.9", path: "/v1/admin/orders" })).toMatchObject({ allowed: false, code: "IP_NOT_ALLOWED" });
    expect(checkIpAccess({ ip: "198.51.100.9", path: "/v1/catalog/products" })).toMatchObject({ allowed: true });
  });
});

describe("Sign-in rules", () => {
  test("lockout after the number of wrong passwords the policy sets", async () => {
    await request(app).patch("/v1/admin/system/security").send({ login: { maxFailed: 3, lockMinutes: 5 } }).expect(200);
    await member("lock@shop.test");
    for (let i = 0; i < 3; i++) {
      await request(app).post("/v1/auth/login").send({ email: "lock@shop.test", password: "wrong-pass-1" }).expect(401);
    }
    await request(app).post("/v1/auth/login").send({ email: "lock@shop.test", password: "Member-pass-123" }).expect(401);
    const locked = await prisma.adminSecurityEvent.findFirst({ where: { type: "ACCOUNT_LOCKED" } });
    expect(locked?.metadata).toMatchObject({ minutes: 5 });
  });

  test("two-step sign-in required: members without it can only open their own account", async () => {
    const m = await member("no2fa@shop.test");
    await request(app).patch("/v1/admin/system/security").send({ twoFactor: { required: "everyone" } }).expect(200);
    const out = await request(app).get("/v1/admin/orders").set("Authorization", asMember(m.id)).expect(403);
    expect(out.body.error).toBe("MFA_SETUP_REQUIRED");
    await request(app).get("/v1/admin/account/me").set("Authorization", asMember(m.id)).expect(200);

    await request(app).patch("/v1/admin/system/security").send({ twoFactor: { required: "owners" } }).expect(200);
    await request(app).get("/v1/admin/orders").set("Authorization", asMember(m.id)).expect(200);
  });

  test("a device unused for longer than the idle time is signed out", async () => {
    await request(app).patch("/v1/admin/system/security").send({ session: { idleHours: 1 } }).expect(200);
    const m = await member("idle@shop.test");
    const s = await prisma.adminSession.create({ data: { adminUserId: m.id, status: "ACTIVE", expiresAt: new Date(Date.now() + 86_400_000) } });
    await prisma.adminSession.update({ where: { id: s.id }, data: { updatedAt: new Date(Date.now() - 2 * 3_600_000) } });
    await expect(issueTokensFromSession(s.id)).rejects.toThrow(/expired/i);
    expect((await prisma.adminSession.findUnique({ where: { id: s.id } }))?.revocationReason).toBe("idle");

    const fresh = await prisma.adminSession.create({ data: { adminUserId: m.id, status: "ACTIVE", expiresAt: new Date(Date.now() + 86_400_000) } });
    await expect(issueTokensFromSession(fresh.id)).resolves.toHaveProperty("accessToken");
  });

  test("sign-in from a new IP is noted (not the very first sign-in)", async () => {
    const m = await member("dev@shop.test");
    await request(app).post("/v1/auth/login").send({ email: "dev@shop.test", password: "Member-pass-123" }).expect(200);
    expect(await prisma.adminSecurityEvent.count({ where: { type: "NEW_DEVICE_LOGIN" } })).toBe(0);
    await prisma.adminSession.updateMany({ where: { adminUserId: m.id }, data: { ip: "198.51.100.7" } });
    await request(app).post("/v1/auth/login").send({ email: "dev@shop.test", password: "Member-pass-123" }).expect(200);
    expect(await prisma.adminSecurityEvent.count({ where: { type: "NEW_DEVICE_LOGIN", adminUserId: m.id } })).toBe(1);
    const page = await request(app).get("/v1/admin/system/security").expect(200);
    expect(page.body.alerts.map((a: any) => a.type)).toContain("NEW_DEVICE_LOGIN");
  });

  test("sign-in codes last as long as the policy says", async () => {
    await request(app).patch("/v1/admin/system/security").send({ otp: { ttlMinutes: 2 } }).expect(200);
    const c = await createOtpChallenge({ to: "+972500000000", purpose: "PHONE_LOGIN" });
    const mins = (c.expiresAt.getTime() - Date.now()) / 60_000;
    expect(mins).toBeGreaterThan(1.9);
    expect(mins).toBeLessThan(2.1);
  });

  test("you can't require two-step sign-in for yourself before turning it on", async () => {
    const m = await member("lead@shop.test");
    await prisma.staffRole.update({ where: { id: m.staffRoleId! }, data: { permissions: ["system:read", "system:write"] } });
    invalidateAccess();
    const out = await request(app).patch("/v1/admin/system/security").set("Authorization", asMember(m.id)).send({ twoFactor: { required: "everyone" } }).expect(409);
    expect(out.body.error).toBe("ENABLE_2FA_FIRST");
  });
});

describe("Rate limits from the policy", () => {
  // Last: request counters are kept per IP for the rest of this file.
  test("sign-in requests over the limit get 429", async () => {
    await request(app).patch("/v1/admin/system/security").send({ rateLimit: { auth: 3, authWindowSeconds: 60 } }).expect(200);
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) {
      codes.push((await request(app).post("/v1/auth/login").send({ email: "nobody@shop.test", password: "whatever-1" })).status);
    }
    expect(codes).toContain(429);
  });
});
