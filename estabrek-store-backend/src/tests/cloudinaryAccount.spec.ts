import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { signAccessToken } from "../config/security.js";
import { cloudinaryCreds, loadCloudinaryAccount, setCloudinaryPingForTests, type CloudinaryCreds } from "../lib/cloudinaryAccount.js";
import { isCloudinaryEnabled } from "../lib/cloudinary.js";

// The store's own Cloudinary account, given in the admin (إعداد المتجر) instead of the server's
// variables: tried with Cloudinary first, kept with its secret sealed and never answered back; the
// server's own variables still win. With the database; Cloudinary is stood in for. Requests to
// /v1/admin without a token run as the test owner.

const at = "/v1/admin/settings/cloudinary";
// Made up, in the shape Cloudinary gives them.
const GOOD: CloudinaryCreds = { cloudName: "rose-store", apiKey: "123456789012345", apiSecret: "made-up-secret-for-a-test-0001" };
const ENV = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;
const had: Record<string, string | undefined> = {};
let tried: CloudinaryCreds[] = [];

async function clean() {
  const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
  if (row && row.data && typeof row.data === "object") {
    const data = { ...(row.data as Record<string, unknown>) };
    delete data.cloudinary;
    await prisma.performanceSettings.update({ where: { id: "default" }, data: { data: data as object } });
  }
  await loadCloudinaryAccount();
  tried = [];
}
beforeAll(() => {
  for (const k of ENV) {
    had[k] = process.env[k];
    delete process.env[k];
  }
  setCloudinaryPingForTests(async (c) => {
    tried.push(c);
    return c.apiSecret === GOOD.apiSecret ? { ok: true, status: 200, why: null } : { ok: false, status: 401, why: "Invalid Signature" };
  });
});
beforeEach(clean);
afterEach(() => {
  for (const k of ENV) delete process.env[k];
});
afterAll(async () => {
  await clean();
  setCloudinaryPingForTests(null);
  for (const k of ENV) if (had[k] !== undefined) process.env[k] = had[k];
});

describe("The store's own Cloudinary account", () => {
  test("none at first: pictures go to the server's disk", async () => {
    expect((await request(app).get(at).expect(200)).body).toEqual({ source: "none", cloudName: null, apiKeyEnd: null, savedAt: null });
    expect(isCloudinaryEnabled()).toBe(false);
  });

  test("tried with Cloudinary, then kept: in force at once, its secret sealed and never answered", async () => {
    const out = (await request(app).put(at).send(GOOD).expect(200)).body;
    expect(out).toMatchObject({ source: "saved", cloudName: "rose-store", apiKeyEnd: "2345", savedAt: expect.any(String) });
    expect(tried).toEqual([GOOD]);
    expect(JSON.stringify(out)).not.toContain(GOOD.apiSecret);
    expect(JSON.stringify((await request(app).get(at).expect(200)).body)).not.toContain(GOOD.apiSecret);
    // Kept sealed: the secret isn't in the database as it was typed.
    const row = await prisma.performanceSettings.findUniqueOrThrow({ where: { id: "default" } });
    expect(JSON.stringify(row.data)).not.toContain(GOOD.apiSecret);
    // In force: uploads go to it.
    expect(cloudinaryCreds()).toEqual(GOOD);
    expect(isCloudinaryEnabled()).toBe(true);
    // Read again from the database (another copy of the server): the same.
    await loadCloudinaryAccount();
    expect(cloudinaryCreds()).toEqual(GOOD);
    // Taken away: the disk again.
    expect((await request(app).delete(at).expect(200)).body.source).toBe("none");
    expect(isCloudinaryEnabled()).toBe(false);
  });

  test("one Cloudinary refuses, or that can't be one, isn't kept", async () => {
    expect((await request(app).put(at).send({ ...GOOD, apiSecret: "made-up-but-wrong-secret-0002" }).expect(400)).body).toMatchObject({ error: "CLOUDINARY_REFUSED", message: "Cloudinary refused it: Invalid Signature" });
    await request(app).put(at).send({ ...GOOD, apiKey: "not-digits" }).expect(400);
    await request(app).put(at).send({ ...GOOD, cloudName: "has space" }).expect(400);
    await request(app).put(at).send({ ...GOOD, extra: 1 }).expect(400);
    expect((await request(app).get(at).expect(200)).body.source).toBe("none");
  });

  test("the server's own variables win, and aren't changed from here", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "server-cloud";
    process.env.CLOUDINARY_API_KEY = "999999999999";
    process.env.CLOUDINARY_API_SECRET = "made-up-server-secret-0003";
    expect((await request(app).get(at).expect(200)).body).toEqual({ source: "env", cloudName: "server-cloud", apiKeyEnd: "9999", savedAt: null });
    expect((await request(app).put(at).send(GOOD).expect(409)).body.error).toBe("CLOUDINARY_FROM_SERVER");
    expect(cloudinaryCreds()?.cloudName).toBe("server-cloud");
  });

  test("where pictures go is the owner's to change", async () => {
    const role = await prisma.staffRole.create({ data: { name: "cld-spec-settings", permissions: ["settings:read", "settings:write"] } });
    const member = await prisma.adminUser.create({ data: { email: "member@cld-spec.test", name: "member", passwordHash: "x", role: "STAFF", status: "ACTIVE", staffRoleId: role.id } });
    try {
      const token = `Bearer ${signAccessToken({ sub: member.id, role: "STAFF", email: member.email })}`;
      await request(app).get(at).set("Authorization", token).expect(200);
      expect((await request(app).put(at).set("Authorization", token).send(GOOD).expect(403)).body.error).toBe("OWNER_ONLY");
      await request(app).delete(at).set("Authorization", token).expect(403);
    } finally {
      await prisma.adminUser.delete({ where: { id: member.id } });
      await prisma.staffRole.delete({ where: { id: role.id } });
    }
  });
});
