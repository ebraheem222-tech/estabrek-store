import { afterAll, beforeEach, describe, expect, test } from "vitest";
import request from "supertest";
import app from "./helpers/testApp.js";
import { prisma } from "./helpers/db.js";
import { announceFirstRun, codeMatches, forgetSetupCodeForTests, newSetupCode, plainCode, setupCode } from "../lib/firstRun.js";

// A store with no one in it (a client's new copy): its admin opens on a first setup, where the
// one-time setup code makes the owner's account, once. With the database, emptied of admins
// (as staff.roles.spec.ts does) before and after each test.

const at = "/v1/auth/first-run";
// Made up for the test.
const PASSWORD = "a-long-made-up-password";

async function empty() {
  await prisma.adminAuditLog.deleteMany();
  await prisma.adminPasswordReset.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.adminSecurityEvent.deleteMany();
  await prisma.settingsRevision.deleteMany();
  await prisma.adminUser.deleteMany();
  forgetSetupCodeForTests();
}
beforeEach(empty);
afterAll(empty);

const claim = (body: Record<string, unknown>) => request(app).post(at).send({ name: "Sara", email: "Owner@Rose.test", password: PASSWORD, ...body });

describe("The setup code", () => {
  test("16 letters in four groups, none that read as another; typed in any case, with or without its dashes", () => {
    const code = newSetupCode();
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}(-[A-HJKMNP-Z2-9]{4}){3}$/);
    expect(newSetupCode()).not.toBe(code);
    expect(plainCode(" ab-cd ef ")).toBe("ABCDEF");
    const now = setupCode();
    expect(setupCode()).toBe(now);
    expect([codeMatches(now), codeMatches(now.toLowerCase().replace(/-/g, "")), codeMatches(newSetupCode())]).toEqual([true, true, false]);
  });

  test("written to the server's log when it starts with no one in the store; nothing once someone is", async () => {
    const lines: string[] = [];
    await announceFirstRun((l) => lines.push(l));
    expect(lines).toEqual([`[first-run] This store has no one in it yet. Open the admin and use this one-time setup code to make the owner's account: ${setupCode()}`]);
    await prisma.adminUser.create({ data: { email: "someone@rose.test", name: "x", passwordHash: "x" } });
    await announceFirstRun((l) => lines.push(l));
    expect(lines).toHaveLength(1);
  });
});

describe("The first setup", () => {
  test("open while the store has no one: the owner's account made with the code, signed in, then closed for good", async () => {
    expect((await request(app).get(at).expect(200)).body).toEqual({ needed: true, codeFrom: "log" });
    const made = (await claim({ code: setupCode().toLowerCase() }).expect(201)).body;
    expect(made).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String), admin: { email: "owner@rose.test", name: "Sara", role: "SUPERADMIN" } });
    const owner = await prisma.adminUser.findUniqueOrThrow({ where: { email: "owner@rose.test" } });
    expect(owner).toMatchObject({ role: "SUPERADMIN", status: "ACTIVE" });
    // Its own password, kept as a hash.
    expect(owner.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(owner.passwordHash).not.toContain(PASSWORD);
    // Signed in as the owner.
    expect((await request(app).get("/v1/auth/me").set("Authorization", `Bearer ${made.accessToken}`).expect(200)).body).toMatchObject({ user: { email: "owner@rose.test" } });
    // And it signs in as any owner does.
    expect((await request(app).post("/v1/auth/login").send({ email: "owner@rose.test", password: PASSWORD }).expect(200)).body.admin).toMatchObject({ email: "owner@rose.test" });
    // Closed: the same code opens nothing now.
    expect((await request(app).get(at).expect(200)).body).toEqual({ needed: false });
    expect((await claim({ code: setupCode(), email: "second@rose.test" }).expect(409)).body).toMatchObject({ error: "FIRST_RUN_DONE" });
    expect(await prisma.adminUser.count()).toBe(1);
  });

  test("a wrong code, or an account that can't be one, makes nothing", async () => {
    expect((await claim({ code: newSetupCode() }).expect(403)).body).toMatchObject({ error: "SETUP_CODE_WRONG" });
    await claim({ code: setupCode(), password: "short" }).expect(400);
    await claim({ code: setupCode(), email: "not an email" }).expect(400);
    await claim({ code: setupCode(), name: "" }).expect(400);
    await claim({ code: setupCode(), role: "STAFF" }).expect(400);
    expect(await prisma.adminUser.count()).toBe(0);
  });

  test("two at once: one owner is made, the other is told the store has one", async () => {
    const [a, b] = await Promise.all([claim({ code: setupCode(), email: "a@rose.test" }), claim({ code: setupCode(), email: "b@rose.test" })]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.adminUser.count()).toBe(1);
  });
});
