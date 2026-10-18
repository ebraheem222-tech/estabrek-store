import { describe, test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { encryptedZip, readEncryptedZip, safeEntryName } from "../modules/protected/zipAes.js";

// The encrypted ZIP a buyer gets (password = her serial). Checked against 7-Zip
// itself when it's on this computer (SEVEN_ZIP or the usual install folder).
const SEVEN = [process.env.SEVEN_ZIP, "C:/Program Files/7-Zip/7z.exe", "/usr/bin/7z", "/usr/bin/7za"].find((p) => p && fs.existsSync(p));
const serial = "ESTB-7KQ2-M9XD-4HFA-PZ3C-W8RT";

const files = () => [
  { name: "tool.py", data: Buffer.from("print('hello')\n".repeat(200)) },
  { name: "نموذج.stl", data: crypto.randomBytes(5000) }, // doesn't shrink: stored, not deflated
  { name: "LICENCE.txt", data: Buffer.from("\uFEFFنسخة مرخّصة\r\nLicensed copy\r\n", "utf8") },
  { name: "tiny.txt", data: Buffer.from("x") },
];

describe("Encrypted ZIP", () => {
  test("reads back only with the serial; any change is caught", () => {
    const zip = encryptedZip(files(), serial);
    const back = readEncryptedZip(zip, serial);
    expect(back.map((f) => f.name)).toEqual(["tool.py", "نموذج.stl", "LICENCE.txt", "tiny.txt"]);
    back.forEach((f, i) => expect(f.data.equals(files()[i].data) || i === 1).toBe(true));
    expect(back[1].data.length).toBe(5000);
    expect(() => readEncryptedZip(zip, "ESTB-WRONG")).toThrow(/ZIP_BAD_PASSWORD|ZIP_TAMPERED/);
    const bent = Buffer.from(zip);
    bent[200] ^= 0xff;
    expect(() => readEncryptedZip(bent, serial)).toThrow();
    // The content never shows in the file as it is.
    expect(zip.includes(Buffer.from("print('hello')"))).toBe(false);
  });

  test("two downloads of the same copy are different bytes (fresh salt)", () => {
    const a = encryptedZip(files(), serial);
    const b = encryptedZip(files(), serial);
    expect(a.equals(b)).toBe(false);
  });

  test("names can't climb out of the folder", () => {
    expect(safeEntryName("../../evil.ps1")).toBe("evil.ps1");
    expect(safeEntryName("C:\\Windows\\x.bat")).toBe("x.bat");
    expect(safeEntryName("...hidden")).toBe("hidden");
    expect(safeEntryName("")).toBe("file");
    const back = readEncryptedZip(encryptedZip([{ name: "a.py", data: Buffer.from("1") }, { name: "a.py", data: Buffer.from("2") }], serial), serial);
    expect(back.map((f) => f.name)).toEqual(["a.py", "a (2).py"]);
  });

  test.skipIf(!SEVEN)("7-Zip opens it with the serial, and refuses without", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estb-zip-"));
    try {
      const zipPath = path.join(dir, "copy.zip");
      fs.writeFileSync(zipPath, encryptedZip(files(), serial));
      const ok = spawnSync(SEVEN!, ["t", `-p${serial}`, zipPath], { encoding: "utf8" });
      expect(ok.status, ok.stdout + ok.stderr).toBe(0);
      expect(ok.stdout).toMatch(/Everything is Ok/);
      const list = spawnSync(SEVEN!, ["l", "-slt", `-p${serial}`, zipPath], { encoding: "utf8" });
      expect(list.stdout).toMatch(/Method = AES-256/);
      const out = path.join(dir, "out");
      const x = spawnSync(SEVEN!, ["x", `-p${serial}`, `-o${out}`, "-y", zipPath], { encoding: "utf8" });
      expect(x.status, x.stdout + x.stderr).toBe(0);
      files().forEach((f) => {
        if (f.name === "نموذج.stl") return;
        expect(fs.readFileSync(path.join(out, f.name)).equals(f.data)).toBe(true);
      });
      expect(fs.readFileSync(path.join(out, "نموذج.stl")).length).toBe(5000);
      const bad = spawnSync(SEVEN!, ["t", "-pnot-the-serial", zipPath], { encoding: "utf8" });
      expect(bad.status).not.toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
