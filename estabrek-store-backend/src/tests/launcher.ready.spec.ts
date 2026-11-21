import { describe, test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { newSigningKey } from "../modules/protected/licenceToken.js";
import { publicOrigin, readStamp, stampLauncher } from "../modules/protected/launcherStamp.js";
import { LAUNCHER_ASSETS, readyLauncher } from "../modules/protected/launcher.service.js";

// The launcher every shop has ready (no database): the blank program kept in
// assets/launcher, and the shop's details written at its end on download.

const LAUNCHER_DIR = path.resolve(__dirname, "../../../estabrek-launcher");

/** What the blank program was built from: the same hash build.ps1 -Blank writes into launcher.json. */
function sourcesHash() {
  const names = [...fs.readdirSync(path.join(LAUNCHER_DIR, "src")).filter((n) => n.endsWith(".cs")).map((n) => `src/${n}`), "build.ps1"].sort();
  let all = "";
  for (const n of names) all += `${n}\n${fs.readFileSync(path.join(LAUNCHER_DIR, n), "utf8").replace(/\r/g, "").replace(/^﻿/, "")}\n`;
  return crypto.createHash("sha256").update(all, "utf8").digest("hex");
}

describe("The ready launcher", () => {
  test("is kept with the server and was built from the launcher's sources as they are now", () => {
    const r = readyLauncher();
    expect(r, `missing in ${LAUNCHER_ASSETS}`).not.toBeNull();
    expect(r!.data.subarray(0, 2).toString("latin1")).toBe("MZ");
    // Blank: no shop's details in it.
    expect(readStamp(r!.data)).toBeNull();
    const info = JSON.parse(fs.readFileSync(path.join(LAUNCHER_ASSETS, "launcher.json"), "utf8"));
    expect(info.version).toBe(r!.version);
    expect(
      info.sources,
      "estabrek-launcher changed: build the blank program again (powershell -ExecutionPolicy Bypass -File estabrek-launcher/build.ps1 -Blank -Version <next>) and commit assets/launcher",
    ).toBe(sourcesHash());
  });

  test("a download carries the shop's address, name and keys at its end; the program before them is untouched", () => {
    const blank = Buffer.concat([Buffer.from("MZ"), crypto.randomBytes(5000)]);
    const keys = [newSigningKey().info, newSigningKey().info];
    const exe = stampLauncher(blank, { api: "https://api.shop.example/v1/", name: "  متجر عرب لايف  ", keys });
    expect(exe.subarray(0, blank.length).equals(blank)).toBe(true);
    expect(exe.subarray(exe.length - 8).toString("ascii")).toBe("ESTBCFG1");
    expect(readStamp(exe)).toEqual({ api: "https://api.shop.example", name: "متجر عرب لايف", keys });
    // Once only, and only what the launcher can read.
    expect(() => stampLauncher(exe, { api: "https://x.example", name: "", keys })).toThrow();
    expect(() => stampLauncher(blank, { api: "ftp://x.example", name: "", keys })).toThrow();
    expect(() => stampLauncher(blank, { api: "https://x.example", name: "", keys: [] })).toThrow();
    expect(() => stampLauncher(blank, { api: "https://x.example", name: "", keys: [{ kid: 'a"b', x: "x", y: "y" }] })).toThrow();
    expect(readStamp(stampLauncher(blank, { api: "https://x.example", name: "x".repeat(200), keys }))!.name).toHaveLength(60);
  });

  test("the address the launcher calls back is the one the request came by", () => {
    const req = (headers: Record<string, string>, protocol = "http") => ({ protocol, get: (n: string) => headers[n.toLowerCase()] });
    expect(publicOrigin(req({ host: "localhost:4000" }))).toBe("http://localhost:4000");
    expect(publicOrigin(req({ host: "internal:8080", "x-forwarded-host": "api.shop.example", "x-forwarded-proto": "https" }))).toBe("https://api.shop.example");
    expect(publicOrigin(req({ host: "api.shop.example", "x-forwarded-proto": "https, http" }))).toBe("https://api.shop.example");
    expect(publicOrigin(req({ host: "bad host/x" }))).toBeNull();
    expect(publicOrigin(req({}))).toBeNull();
  });
});
