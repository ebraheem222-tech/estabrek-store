import { describe, test, expect, beforeAll, beforeEach, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import request from "supertest";
import argon2 from "argon2";
import { authenticator } from "otplib";
import app from "./helpers/testApp.js";
import { prisma, resetDb, seedCatalog } from "./helpers/db.js";
import { env } from "../config/env.js";
import { releaseOrder } from "../modules/fulfillment/fulfillment.service.js";
import { readEncryptedZip } from "../modules/protected/zipAes.js";
import { verifyToken } from "../modules/protected/licenceToken.js";
import { resetLimitsForTests } from "../modules/protected/activation.service.js";
import { closeVaultSession } from "../modules/vault/vaultAdmin.service.js";
import { createVault } from "../vault/vault.js";

// Phases 3–4 with the database and a real vault (in this process, on a free
// port): the owner's vault session, masters in the vault, activations on PCs,
// and the launcher. Requests without a token run as the test owner "test-superadmin".

const SECRET = "vault-shared-secret-at-least-32-chars!";
const PASSWORD = "Correct horse battery 9";
const TOTP = authenticator.generateSecret();
const base = "/v1/admin/catalog/products/p1/protected";
const dev = (c: string) => crypto.createHash("sha256").update(`pc-${c}`).digest("hex");
const binary = (res: any, cb: (e: Error | null, b: Buffer) => void) => {
  const c: Buffer[] = [];
  res.on("data", (d: Buffer) => c.push(d));
  res.on("end", () => cb(null, Buffer.concat(c)));
};

let dir: string;
let server: http.Server;
let vault: ReturnType<typeof createVault>;
let vaultUrl: string;
const useVault = (on: boolean) => {
  (env as any).VAULT_URL = on ? vaultUrl : undefined;
  (env as any).VAULT_SHARED_SECRET = on ? SECRET : undefined;
};

async function clean() {
  await prisma.activation.deleteMany();
  await prisma.licence.deleteMany();
  await prisma.protectedFile.deleteMany();
  await prisma.launcherRelease.deleteMany();
  await resetDb();
  await prisma.productType.deleteMany({ where: { slug: "scripts-v" } });
}
async function order(qty = 1) {
  const r = await request(app).post("/v1/catalog/order-requests").send({ items: [{ variantId: "cvariant01", quantity: qty }], customerName: "سما يوسف", phone: "0599111222" });
  expect([200, 201]).toContain(r.status);
  return String(r.body.id);
}
const tokenOf = async (id: string) => (await prisma.orderRequest.findUniqueOrThrow({ where: { id }, select: { accessToken: true } })).accessToken!;
const page = async (id: string) => (await request(app).get(`/v1/orders/access/${await tokenOf(id)}`).expect(200)).body;
const openSession = () => request(app).post("/v1/admin/vault/session").send({ password: PASSWORD, code: authenticator.generate(TOTP) });

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "estb-vault-db-"));
  vault = createVault({ dataDir: dir, sharedSecret: SECRET, masterKey: "vault-master-key-at-least-32-chars!!", allowIps: [], maxUploadMb: 10, sessionMinutes: 20 });
  server = http.createServer(vault.app);
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", () => ok()));
  vaultUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  await prisma.admin2FADevice.deleteMany({ where: { adminUserId: "test-superadmin" } });
  await prisma.adminUser.deleteMany({ where: { email: "vault-owner@shop.test", NOT: { id: "test-superadmin" } } });
  await prisma.adminUser.upsert({
    where: { id: "test-superadmin" },
    create: { id: "test-superadmin", email: "vault-owner@shop.test", name: "Owner", passwordHash: await argon2.hash(PASSWORD), twoFactorEnabled: true },
    update: { passwordHash: await argon2.hash(PASSWORD), twoFactorEnabled: true, status: "ACTIVE" },
  });
  await prisma.admin2FADevice.create({ data: { adminUserId: "test-superadmin", method: "TOTP", totpSecretEnc: TOTP, enabled: true } });
}, 60_000);

beforeEach(async () => {
  useVault(true);
  resetLimitsForTests();
  await closeVaultSession("test-superadmin");
  await clean();
  await seedCatalog();
  const t = await prisma.productType.create({ data: { name: "سكربتات", slug: "scripts-v", fulfillment: "DIGITAL", showColor: false, showSize: false } });
  await prisma.product.update({ where: { id: "p1" }, data: { typeId: t.id, isProtected: true } });
});

afterAll(async () => {
  useVault(false);
  await clean();
  await prisma.admin2FADevice.deleteMany({ where: { adminUserId: "test-superadmin" } });
  await prisma.adminSecurityEvent.deleteMany({ where: { adminUserId: "test-superadmin" } });
  vault.close();
  await new Promise((ok) => server.close(ok));
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("The vault session", () => {
  test("locked until the owner gives her password and code; then masters go into the vault", async () => {
    await request(app).post(base).attach("file", Buffer.from("print('x')\n"), "tool.py").expect(423);
    await request(app).post("/v1/admin/vault/session").send({ password: "wrong-password", code: authenticator.generate(TOTP) }).expect(401);
    await request(app).post("/v1/admin/vault/session").send({ password: PASSWORD, code: "000000" }).expect(401);
    expect(await prisma.adminSecurityEvent.count({ where: { adminUserId: "test-superadmin", type: "VAULT_SESSION_DENIED" } })).toBeGreaterThanOrEqual(2);
    const s = await openSession().expect(200);
    expect((Date.parse(s.body.expiresAt) - Date.now()) / 60_000).toBeLessThanOrEqual(20);
    expect(await prisma.adminSecurityEvent.count({ where: { adminUserId: "test-superadmin", type: "VAULT_SESSION_OPENED" } })).toBeGreaterThanOrEqual(1);

    const up = await request(app).post(base).attach("file", Buffer.from("print('secret')\n"), "tool.py").expect(201);
    expect(up.body).toMatchObject({ storedIn: "vault", placed: "inside" });
    const row = await prisma.protectedFile.findFirstOrThrow();
    expect(row.dataEnc).toBeNull();
    expect(row.vaultFileId).toBeTruthy();
    const status = await request(app).get("/v1/admin/vault").expect(200);
    expect(status.body).toMatchObject({ on: true, reachable: true, files: { inVault: 1, inDatabase: 0 } });
    expect(status.body.session.expiresAt).toBeTruthy();
    expect((await request(app).get(base).expect(200)).body.vault).toMatchObject({ on: true });

    // The buyer's copy comes from the vault.
    const id = await order();
    await releaseOrder(id, "paid");
    const [l] = (await page(id)).licences;
    const res = await request(app).post(`/v1/orders/access/${await tokenOf(id)}/licences/${l.id}`).buffer(true).parse(binary).expect(200);
    expect(readEncryptedZip(res.body, l.serial)[0].data.toString()).toMatch(/print\('secret'\)\n# Licensed copy .* estb:[0-9A-Z]{10}\n/);

    // Closed: deleting needs a new session.
    await request(app).delete("/v1/admin/vault/session").expect(200);
    await request(app).delete(`${base}/${row.id}`).expect(423);
  });

  test("masters kept in the database before the vault move in", async () => {
    useVault(false);
    await request(app).post(base).attach("file", Buffer.from("echo old\n"), "old.sh").expect(201);
    useVault(true);
    expect((await prisma.protectedFile.findFirstOrThrow()).dataEnc).not.toBeNull();
    await openSession().expect(200);
    expect((await request(app).post("/v1/admin/vault/move-in").expect(200)).body).toEqual({ moved: 1 });
    const row = await prisma.protectedFile.findFirstOrThrow();
    expect(row).toMatchObject({ dataEnc: null });
    expect(row.vaultFileId).toBeTruthy();
    const events = await request(app).get("/v1/admin/vault/events").expect(200);
    expect(events.body.events.map((e: any) => e.event)).toContain("file.added");
  });
});

describe("Activations on PCs", () => {
  async function sold() {
    await openSession().expect(200);
    await request(app).post(base).attach("file", Buffer.from("print(1)\n"), "tool.py").expect(201);
    const id = await order();
    await releaseOrder(id, "paid");
    return { id, l: (await page(id)).licences[0] as { id: string; serial: string } };
  }

  test("one PC per serial by default: the licence is signed for that PC; another PC is refused", async () => {
    const { id, l } = await sold();
    const keys = (await request(app).get("/v1/licences/public-key").expect(200)).body.keys;
    const a = await request(app).post("/v1/licences/activate").send({ serial: l.serial.toLowerCase().replace(/-/g, " "), deviceHash: dev("A"), deviceName: "Sama-PC", appVersion: "1.0.0" }).expect(200);
    expect(a.body).toMatchObject({ product: { id: "p1" }, devices: { used: 1, max: 1 }, checkEveryDays: 7 });
    const p = verifyToken<any>(a.body.token, keys);
    expect(p).toMatchObject({ v: 1, lic: l.id, dev: dev("A"), prod: "p1" });
    expect(p.chk - p.iat).toBe(7 * 86400);
    // Signed by the vault's own key.
    expect(a.body.token.split(".")[1]).toBe(vault.key.info.kid);

    const b = await request(app).post("/v1/licences/activate").send({ serial: l.serial, deviceHash: dev("B") }).expect(403);
    expect(b.body.error).toBe("DEVICE_LIMIT");
    await request(app).post("/v1/licences/activate").send({ serial: l.serial, deviceHash: dev("A") }).expect(200);
    await request(app).post("/v1/licences/check").send({ token: a.body.token, deviceHash: dev("A") }).expect(200);
    expect((await request(app).post("/v1/licences/check").send({ token: a.body.token, deviceHash: dev("B") }).expect(403)).body.error).toBe("OTHER_PC");

    // The owner frees PC A: it stops there, and PC B can take the place.
    const card = await request(app).get(`/v1/admin/orders/${id}/delivery`).expect(200);
    const lic = card.body.licences[0];
    expect(lic).toMatchObject({ maxDevices: 1 });
    expect(lic.activations).toHaveLength(1);
    expect(lic.activations[0]).toMatchObject({ deviceName: "Sama-PC", status: "active", appVersion: "1.0.0" });
    await request(app).post(`/v1/admin/orders/${id}/delivery/licences/${l.id}/activations/${lic.activations[0].id}/reset`).expect(200);
    expect((await request(app).post("/v1/licences/check").send({ token: a.body.token, deviceHash: dev("A") }).expect(403)).body.error).toBe("DEVICE_RESET");
    await request(app).post("/v1/licences/activate").send({ serial: l.serial, deviceHash: dev("B") }).expect(200);
    expect((await page(id)).licences[0].devices).toEqual({ used: 1, max: 1 });
  });

  test("more PCs when the product allows; a stopped serial or a cancelled order stops everywhere", async () => {
    const { id, l } = await sold();
    await prisma.product.update({ where: { id: "p1" }, data: { licenceDevices: 2 } });
    const a = await request(app).post("/v1/licences/activate").send({ serial: l.serial, deviceHash: dev("A") }).expect(200);
    await request(app).post("/v1/licences/activate").send({ serial: l.serial, deviceHash: dev("B") }).expect(200);
    await request(app).post("/v1/licences/activate").send({ serial: l.serial, deviceHash: dev("C") }).expect(403);
    await request(app).post(`/v1/admin/orders/${id}/delivery/licences/${l.id}/stop`).expect(200);
    expect((await request(app).post("/v1/licences/check").send({ token: a.body.token, deviceHash: dev("A") }).expect(403)).body.error).toBe("LICENCE_STOPPED");
    expect((await request(app).post("/v1/licences/activate").send({ serial: l.serial, deviceHash: dev("A") }).expect(403)).body.error).toBe("LICENCE_STOPPED");
  });

  test("wrong serials are slow to guess; a forged licence is refused", async () => {
    for (let i = 0; i < 10; i++) await request(app).post("/v1/licences/activate").send({ serial: `ESTB-NOPE-${i}000-0000-0000-0000`, deviceHash: dev("A") }).expect(404);
    await request(app).post("/v1/licences/activate").send({ serial: "ESTB-NOPE-9999-0000-0000-0000", deviceHash: dev("A") }).expect(429);
    const fake = `v1.${vault.key.info.kid}.${Buffer.from(JSON.stringify({ v: 1, lic: "x", act: "x", dev: dev("A") })).toString("base64url")}.${Buffer.alloc(64).toString("base64url")}`;
    expect((await request(app).post("/v1/licences/check").send({ token: fake, deviceHash: dev("A") }).expect(401)).body.error).toBe("BAD_LICENCE");
  });

  test("without a vault the backend signs with its own key", async () => {
    useVault(false);
    await request(app).post(base).attach("file", Buffer.from("print(1)\n"), "tool.py").expect(201);
    const id = await order();
    await releaseOrder(id, "paid");
    const [l] = (await page(id)).licences;
    const keys = (await request(app).get("/v1/licences/public-key").expect(200)).body.keys;
    const a = await request(app).post("/v1/licences/activate").send({ serial: l.serial, deviceHash: dev("A") }).expect(200);
    expect(verifyToken(a.body.token, keys)).toMatchObject({ lic: l.id });
    expect(a.body.token.split(".")[1]).not.toBe(vault.key.info.kid);
  });
});

describe("The launcher", () => {
  test("the owner uploads it; order pages with protected products offer it", async () => {
    await request(app).get("/v1/licences/launcher").expect(404);
    await request(app).post("/v1/admin/vault/launchers").field("version", "1.0.0").attach("file", Buffer.from("not a program"), "x.exe").expect(400);
    const exe = Buffer.concat([Buffer.from("MZ"), crypto.randomBytes(4000)]);
    await request(app).post("/v1/admin/vault/launchers").field("version", "1.0.0").attach("file", exe, "EstabrekLauncher.exe").expect(201);
    await request(app).post("/v1/admin/vault/launchers").field("version", "1.0.1").attach("file", exe, "EstabrekLauncher.exe").expect(201);
    const cur = await request(app).get("/v1/licences/launcher").expect(200);
    expect(cur.body).toMatchObject({ version: "1.0.1", bytes: exe.length, path: "/licences/launcher/download" });
    const dl = await request(app).get("/v1/licences/launcher/download").buffer(true).parse(binary).expect(200);
    expect(dl.headers["content-disposition"]).toContain("EstabrekLauncher-1.0.1.exe");
    expect(Buffer.compare(dl.body, exe)).toBe(0);

    useVault(false);
    await request(app).post(base).attach("file", Buffer.from("print(1)\n"), "tool.py").expect(201);
    const id = await order();
    await releaseOrder(id, "paid");
    expect((await page(id)).launcher).toMatchObject({ version: "1.0.1" });
  });
});
