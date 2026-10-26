import { describe, test, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { encryptedZip } from "../modules/protected/zipAes.js";
import { newSigningKey, signToken } from "../modules/protected/licenceToken.js";
import { makePackage } from "../modules/protected/package.js";
import { probeFile } from "../modules/protected/marks.js";

// The Windows launcher (estabrek-launcher, C#) against what the backend and the
// vault make: built here with a test key, then asked to open copies and check
// licences. Windows only (it needs the .NET Framework compiler).

const BUILD = path.resolve(__dirname, "../../../estabrek-launcher/build.ps1");
const CSC = path.join(process.env.WINDIR ?? "C:/Windows", "Microsoft.NET/Framework64/v4.0.30319/csc.exe");
const CAN = process.platform === "win32" && fs.existsSync(BUILD) && fs.existsSync(CSC);
const serial = "ESTB-7KQ2-M9XD-4HFA-PZ3C-W8RT";

describe.skipIf(!CAN)("The Windows launcher", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estb-launcher-"));
  const home = path.join(dir, "home");
  const key = newSigningKey();
  const exe = path.join(dir, "EstabrekLauncher.exe");
  // The script the launcher runs writes here (its own console window isn't ours to read).
  const marker = path.join(dir, "ran.txt");
  const ranNow = () => { const t = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8") : ""; fs.rmSync(marker, { force: true }); return t; };
  const run = (...args: string[]) => spawnSync(exe, args, { encoding: "utf8", timeout: 60_000, env: { ...process.env, ESTABREK_LAUNCHER_HOME: home } });
  /** The same, without blocking this process (the stand-in API answers from here). */
  const runAsync = (...args: string[]) =>
    new Promise<{ status: number | null; stdout: string; stderr: string }>((ok) => {
      const p = spawn(exe, args, { env: { ...process.env, ESTABREK_LAUNCHER_HOME: home, ESTB_TEST_OUT: marker } });
      let stdout = "";
      let stderr = "";
      p.stdout.on("data", (d) => (stdout += d.toString("utf8")));
      p.stderr.on("data", (d) => (stderr += d.toString("utf8")));
      p.on("close", (status) => ok({ status, stdout, stderr }));
    });

  // A stand-in for the shop's licence API (the real one is tested in vault.admin.spec.ts).
  const shop = { serial: "", due: false, old: false, stopped: false, checks: 0 };
  let server: http.Server;
  const now = () => Math.floor(Date.now() / 1000);
  const tokenFor = (dev: string) =>
    signToken({ v: 1, lic: "LIC1", act: "A1", prod: "p1", title: "سكربت الطلبات", mark: "K7QM2XHPAB", dev, iat: now(), chk: shop.old ? now() - 15 * 86400 : shop.due ? now() - 10 : now() + 7 * 86400 }, key);

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const b = raw ? JSON.parse(raw) : {};
        const send = (status: number, body: object) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
        if (req.url === "/v1/licences/activate") {
          if (b.serial !== shop.serial) return send(404, { error: "SERIAL_NOT_FOUND" });
          if (!/^[0-9a-f]{64}$/.test(b.deviceHash) || b.appVersion !== "9.9.9") return send(400, { error: "BAD_DEVICE" });
          return send(200, { token: tokenFor(b.deviceHash), product: { id: "p1", title: "سكربت الطلبات" }, devices: { used: 1, max: 1 } });
        }
        if (req.url === "/v1/licences/check") {
          shop.checks++;
          if (shop.stopped) return send(403, { error: "LICENCE_STOPPED" });
          return send(200, { token: tokenFor(b.deviceHash) });
        }
        send(404, { error: "NOT_FOUND" });
      });
    });
    await new Promise<void>((ok) => server.listen(0, "127.0.0.1", () => ok()));
    const api = `http://127.0.0.1:${(server.address() as any).port}`;
    const keys = JSON.stringify({ keys: [key.info] });
    const b = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", BUILD, "-ApiUrl", api, "-Version", "9.9.9", "-KeysJson", keys, "-OutDir", dir], { encoding: "utf8", timeout: 180_000 });
    expect(b.status, b.stdout + b.stderr).toBe(0);
  }, 200_000);
  afterAll(async () => {
    await new Promise((ok) => server.close(ok));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("it opens the shop's copies (deflated and stored, Arabic names) with the serial only", () => {
    const files = [
      { name: "tool.py", data: Buffer.from("print('ok')\n".repeat(100)) },
      { name: "نموذج.stl", data: crypto.randomBytes(3000) },
      { name: "x.txt", data: Buffer.from("x") },
    ];
    const zip = path.join(dir, "copy.zip");
    fs.writeFileSync(zip, encryptedZip(files, serial));
    const out = path.join(dir, "out");
    const r = run("--unzip", zip, serial, out);
    expect(r.status, r.stderr).toBe(0);
    for (const f of files) expect(fs.readFileSync(path.join(out, f.name)).equals(f.data)).toBe(true);
    expect(run("--unzip", zip, "ESTB-AAAA-BBBB-CCCC-DDDD-EEEE", path.join(dir, "no")).status).toBe(3);

    // A whole buyer's package too (marked file + LICENCE.txt).
    const pkg = makePackage({ serial, markId: "K7QM2XHPAB", orderShortId: "A1B2C3", title: "Tool", issuedAt: new Date(), customTypes: [], files: [{ name: "run.ps1", ext: "ps1", data: Buffer.from("Write-Output 1\r\n"), probe: probeFile(Buffer.from("Write-Output 1\r\n")) }] });
    fs.writeFileSync(zip, pkg.data);
    const out2 = path.join(dir, "out2");
    expect(run("--unzip", zip, serial, out2).status).toBe(0);
    expect(fs.readFileSync(path.join(out2, "run.ps1"), "utf8")).toContain("estb:K7QM2XHPAB");
    expect(fs.readFileSync(path.join(out2, "LICENCE.txt"), "utf8")).toContain("A1B2C3");
  });

  test("it checks licences signed by the shop's key, and refuses changed or foreign ones", () => {
    const payload = { v: 1, lic: "L1", act: "A1", prod: "p1", title: "سكربت", mark: "K7QM2XHPAB", dev: "a".repeat(64), iat: 1, chk: 2 };
    const t = signToken(payload, key);
    const ok = run("--verify", t);
    expect(ok.status, ok.stderr).toBe(0);
    expect(JSON.parse(ok.stdout)).toMatchObject({ lic: "L1", dev: "a".repeat(64), title: "سكربت" });
    const parts = t.split(".");
    const changed = [parts[0], parts[1], Buffer.from(JSON.stringify({ ...payload, dev: "b".repeat(64) })).toString("base64url"), parts[3]].join(".");
    expect(run("--verify", changed).status).toBe(4);
    expect(run("--verify", signToken(payload, newSigningKey())).status).toBe(4);
  });

  test("the PC fingerprint is a stable hash; the build carries its version and key", () => {
    const a = run("--fingerprint").stdout.trim();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(run("--fingerprint").stdout.trim()).toBe(a);
    expect(run("--version").stdout.trim()).toBe("9.9.9");
    expect(run("--keys").stdout.trim()).toBe(key.info.kid);
  });

  test("activate on this PC, kept sealed; a script runs and leaves nothing behind; the shop's checks hold", async () => {
    shop.serial = serial;
    const zip = path.join(dir, "bought.zip");
    const script = Buffer.from("Set-Content -Path $env:ESTB_TEST_OUT -Value 'ran-from-launcher'\r\n");
    fs.writeFileSync(zip, makePackage({ serial, markId: "K7QM2XHPAB", orderShortId: "A1B2C3", title: "سكربت الطلبات", issuedAt: new Date(), customTypes: [], files: [{ name: "go.ps1", ext: "ps1", data: script, probe: probeFile(script) }] }).data);

    // The serial has to open the copy before anything goes online.
    const wrong = await runAsync("--activate", zip, "ESTB-AAAA-BBBB-CCCC-DDDD-EEEE");
    expect(wrong.status).toBe(5);
    expect(wrong.stdout).toContain("السيريال مش صحيح");
    const ok = await runAsync("--activate", zip, serial.toLowerCase());
    expect(ok.status, ok.stdout + ok.stderr).toBe(0);
    expect(ok.stdout.trim()).toBe("ok LIC1");
    expect((await runAsync("--list")).stdout.trim()).toBe("LIC1\tسكربت الطلبات");
    // Sealed for this Windows user: the serial isn't readable in the file.
    const sealedFile = fs.readFileSync(path.join(home, "LIC1", "licence.dat"));
    expect(sealedFile.includes(Buffer.from(serial))).toBe(false);
    expect(sealedFile.includes(Buffer.from("ESTB"))).toBe(false);

    const ran = await runAsync("--run", "LIC1", "go.ps1");
    expect(ran.status, ran.stdout + ran.stderr).toBe(0);
    expect(ranNow()).toContain("ran-from-launcher");
    expect(ran.stdout).toMatch(/exit 0 left 0/);
    expect(shop.checks).toBe(0); // not due yet: no call

    // Due: it checks online, gets a fresh licence and runs.
    shop.due = true;
    expect((await runAsync("--activate", zip, serial)).status).toBe(0);
    expect((await runAsync("--run", "LIC1", "go.ps1")).stdout).toMatch(/exit 0/);
    expect(ranNow()).toContain("ran-from-launcher");
    expect(shop.checks).toBe(1);
    // The shop stopped the serial: it no longer runs.
    shop.stopped = true;
    const stopped = await runAsync("--run", "LIC1", "go.ps1");
    expect(stopped.status).toBe(6);
    expect(stopped.stdout).toContain("موقوف");
  }, 120_000);

  test("offline: it keeps working for the grace days, then asks to go online once", async () => {
    const zip = path.join(dir, "bought.zip");
    const port = (server.address() as any).port;
    const down = () => new Promise((ok) => server.close(ok));
    const up = () => new Promise<void>((ok) => server.listen(port, "127.0.0.1", () => ok()));
    Object.assign(shop, { stopped: false, due: true, old: false });
    expect((await runAsync("--activate", zip, serial)).status).toBe(0);
    await down();
    expect((await runAsync("--run", "LIC1", "go.ps1")).stdout).toMatch(/exit 0/);
    expect(ranNow()).toContain("ran-from-launcher");
    // Last renewed 15 days ago and still offline: not any more.
    await up();
    shop.old = true;
    expect((await runAsync("--activate", zip, serial)).status).toBe(0);
    await down();
    const late = await runAsync("--run", "LIC1", "go.ps1");
    expect(late.status).toBe(6);
    expect(late.stdout).toContain("صار وقت طويل بدون إنترنت");
    await up();
  }, 120_000);
});
