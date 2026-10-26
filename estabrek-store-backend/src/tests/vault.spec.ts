import { describe, test, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { canonical, ipAllowed, makeVerifier, signRequest } from "../modules/vault/requestSigning.js";
import { keyFromPem, keyFromSeed, keyToPem, newSigningKey, signToken, verifyToken } from "../modules/protected/licenceToken.js";
import { createVault } from "../vault/vault.js";
import { readEncryptedZip } from "../modules/protected/zipAes.js";

// The vault (no database): signed requests, owner sessions, copies, licences.

const SECRET = "s".repeat(40);

describe("Signed licences", () => {
  test("signed, checked, and refused when changed or signed by another key", () => {
    const k = newSigningKey();
    const t = signToken({ v: 1, lic: "L1", dev: "a".repeat(64) }, k);
    expect(t.split(".")).toHaveLength(4);
    expect(verifyToken(t, [k.info])).toMatchObject({ lic: "L1" });
    const parts = t.split(".");
    const forged = [parts[0], parts[1], Buffer.from(JSON.stringify({ v: 1, lic: "L2", dev: "a".repeat(64) })).toString("base64url"), parts[3]].join(".");
    expect(verifyToken(forged, [k.info])).toBeNull();
    expect(verifyToken(t, [newSigningKey().info])).toBeNull();
    expect(verifyToken("nonsense", [k.info])).toBeNull();
    // The signature is r||s (64 bytes): what .NET's ECDsa reads.
    expect(Buffer.from(parts[3], "base64url")).toHaveLength(64);
  });

  test("a key from a secret is always the same key; PEM round-trips", () => {
    expect(keyFromSeed("seed-one-123456").info).toEqual(keyFromSeed("seed-one-123456").info);
    expect(keyFromSeed("seed-one-123456").info.kid).not.toBe(keyFromSeed("seed-two-123456").info.kid);
    const k = newSigningKey();
    expect(keyFromPem(keyToPem(k)).info).toEqual(k.info);
  });
});

describe("Signed requests", () => {
  test("right secret, fresh, once", () => {
    const verify = makeVerifier(SECRET);
    const body = Buffer.from('{"a":1}');
    const h = signRequest(SECRET, "POST", "/v1/sign", body);
    expect(verify("POST", "/v1/sign", h, body)).toEqual({ ok: true });
    expect(verify("POST", "/v1/sign", h, body)).toEqual({ ok: false, why: "REPLAYED" });
    expect(verify("POST", "/v1/sign", signRequest("x".repeat(40), "POST", "/v1/sign", body), body)).toEqual({ ok: false, why: "BAD_SIGNATURE" });
    expect(verify("POST", "/v1/sign", signRequest(SECRET, "POST", "/v1/sign", Buffer.from("{}")), body)).toEqual({ ok: false, why: "BAD_SIGNATURE" });
    expect(verify("POST", "/v1/sign", signRequest(SECRET, "POST", "/v1/sign", body, Date.now() - 10 * 60_000), body)).toEqual({ ok: false, why: "STALE" });
    expect(verify("POST", "/v1/sign", {}, body)).toEqual({ ok: false, why: "UNSIGNED" });
    expect(canonical("get", "/x", "1", "n", Buffer.alloc(0)).startsWith("GET\n/x\n1\nn\n")).toBe(true);
  });

  test("addresses: Tailscale's range, one address, or anyone", () => {
    expect(ipAllowed("100.101.5.9", ["100.64.0.0/10"])).toBe(true);
    expect(ipAllowed("::ffff:100.101.5.9", ["100.64.0.0/10"])).toBe(true);
    expect(ipAllowed("8.8.8.8", ["100.64.0.0/10"])).toBe(false);
    expect(ipAllowed("10.0.0.5", ["10.0.0.5"])).toBe(true);
    expect(ipAllowed("fd12::1", ["fd12::1"])).toBe(true);
    expect(ipAllowed("1.2.3.4", [])).toBe(true);
  });
});

describe("The vault", () => {
  let dir: string;
  let v: ReturnType<typeof createVault>;
  const signed = (method: "get" | "post" | "delete", url: string, body?: Buffer | object, session?: string) => {
    const buf = body === undefined ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
    let r = request(v.app)[method](url).set(signRequest(SECRET, method.toUpperCase(), url, buf));
    if (session) r = r.set("x-vault-session", session);
    if (buf.length) r = Buffer.isBuffer(body) ? r.set("content-type", "application/octet-stream").send(buf) : r.set("content-type", "application/json").send(buf.toString("utf8"));
    return r;
  };
  const binary = (res: any, cb: (e: Error | null, b: Buffer) => void) => {
    const c: Buffer[] = [];
    res.on("data", (d: Buffer) => c.push(d));
    res.on("end", () => cb(null, Buffer.concat(c)));
  };

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "estb-vault-"));
    v = createVault({ dataDir: dir, sharedSecret: SECRET, masterKey: "m".repeat(40), allowIps: [], maxUploadMb: 5, sessionMinutes: 20 });
  });
  afterAll(() => {
    v.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("unsigned or wrongly signed requests get nothing; health says only that it's up", async () => {
    await request(v.app).get("/health").expect(200);
    await request(v.app).get("/v1/public-key").expect(401);
    await request(v.app).post("/v1/sign").set(signRequest("y".repeat(40), "POST", "/v1/sign")).expect(401);
  });

  test("changing files needs an owner session, at most 20 minutes; files are kept encrypted", async () => {
    await signed("post", "/v1/files", Buffer.from("print(1)\n")).set("x-product-id", "p1").set("x-file-name", Buffer.from("tool.py").toString("base64url")).expect(423);
    const s = await signed("post", "/v1/sessions", { adminId: "a1", email: "owner@shop.test", minutes: 999 }).expect(201);
    const minutes = (Date.parse(s.body.expiresAt) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(19);
    expect(minutes).toBeLessThanOrEqual(20);
    const up = await signed("post", "/v1/files", Buffer.from("print('secret')\n"), s.body.id).set("x-product-id", "p1").set("x-file-name", Buffer.from("tool.py").toString("base64url")).expect(201);
    expect(up.body).toMatchObject({ productId: "p1", name: "tool.py", ext: "py", bytes: 16 });
    const stored = fs.readFileSync(path.join(dir, "files", `${up.body.id}.bin`));
    expect(stored.includes(Buffer.from("secret"))).toBe(false);
    // Closed: locked again.
    await signed("delete", `/v1/sessions/${s.body.id}`).expect(200);
    await signed("delete", `/v1/files/${up.body.id}`, undefined, s.body.id).expect(423);
    const events = fs.readFileSync(path.join(dir, "audit.log"), "utf8");
    expect(events).toContain('"event":"session.opened"');
    expect(events).toContain('"event":"file.added"');
  });

  test("a buyer's copy without any session: opens with her serial, carries her mark", async () => {
    const res = await signed("post", "/v1/package", { productId: "p1", serial: "ESTB-AAAA-BBBB-CCCC-DDDD-EEEE", markId: "K7QM2XHPAB", orderShortId: "A1B2C3", title: "Tool", slug: "tool", issuedAt: new Date().toISOString(), customTypes: [] }).buffer(true).parse(binary).expect(200);
    const files = readEncryptedZip(res.body, "ESTB-AAAA-BBBB-CCCC-DDDD-EEEE");
    expect(files.map((f) => f.name)).toEqual(["tool.py", "LICENCE.txt"]);
    expect(files[0].data.toString()).toContain("estb:K7QM2XHPAB");
    expect(Buffer.from(res.headers["x-file-name"], "base64url").toString()).toBe("tool-A1B2C3.zip");
    await signed("post", "/v1/package", { productId: "nothing", serial: "x".repeat(20), markId: "K7QM2XHPAB", orderShortId: "A", title: "T", issuedAt: new Date().toISOString() }).expect(409);
  });

  test("it signs licences with its own key, kept on its disk", async () => {
    const keys = (await signed("get", "/v1/public-key").expect(200)).body.keys;
    const payload = { v: 1, lic: "L1", act: "A1", prod: "p1", title: "Tool", mark: "K7QM2XHPAB", dev: "b".repeat(64), iat: 1, chk: 2 };
    const t = (await signed("post", "/v1/sign", { payload }).expect(200)).body.token;
    expect(verifyToken(t, keys)).toMatchObject({ lic: "L1" });
    await signed("post", "/v1/sign", { payload: { ...payload, dev: "not-a-hash" } }).expect(400);
    expect(fs.existsSync(path.join(dir, "signing-key.pem"))).toBe(true);
    // Restarted: same key.
    const again = createVault({ dataDir: dir, sharedSecret: SECRET, masterKey: "m".repeat(40), allowIps: [], maxUploadMb: 5, sessionMinutes: 20 });
    expect(again.key.info).toEqual(v.key.info);
    again.close();
  });

  test("only the allowed addresses get in", async () => {
    const d2 = fs.mkdtempSync(path.join(os.tmpdir(), "estb-vault-"));
    const narrow = createVault({ dataDir: d2, sharedSecret: SECRET, masterKey: "m".repeat(40), allowIps: ["100.64.0.0/10"], maxUploadMb: 5, sessionMinutes: 20 });
    const r = await request(narrow.app).get("/v1/public-key").set(signRequest(SECRET, "GET", "/v1/public-key")).expect(403);
    expect(r.body.error).toBe("IP_NOT_ALLOWED");
    narrow.close();
    fs.rmSync(d2, { recursive: true, force: true });
  });
});
