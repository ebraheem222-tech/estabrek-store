import { describe, test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { applyMark, extOf, findMarks, markLine, newMarkId, newSerial, normalizeSerial, placementFor, probeFile, ruleFor, serialLast4, allTypes } from "../modules/protected/marks.js";

// The buyer's mark in each kind of file, and that marked scripts still run.
const m = { orderShortId: "G7H8J9", markId: "K7QM2XHPAB" };
const mark = (name: string, data: Buffer, custom = [] as Parameters<typeof ruleFor>[1]) => applyMark(data, ruleFor(extOf(name), custom), m);
const has = (cmd: string, args: string[]) => {
  try {
    return spawnSync(cmd, args, { encoding: "utf8", timeout: 20000 }).status === 0;
  } catch {
    return false;
  }
};
const PY = has("python", ["--version"]);
const PS = process.platform === "win32" && has("powershell", ["-NoProfile", "-Command", "exit 0"]);
const CMD = process.platform === "win32";

function runIn(dir: string, file: string, data: Buffer, cmd: string, args: string[]) {
  const p = path.join(dir, file);
  fs.writeFileSync(p, data);
  return spawnSync(cmd, [...args, p], { encoding: "utf8", timeout: 30000 });
}

describe("Where the mark goes", () => {
  test("a licence line at the end of a script, in its own comment", () => {
    const py = mark("tool.py", Buffer.from("#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\nprint('hi')"));
    expect(py.placed).toBe("inside");
    const text = py.data.toString("utf8");
    expect(text.startsWith("#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n")).toBe(true);
    expect(text.endsWith(`print('hi')\n# ${markLine(m)}\n`)).toBe(true);

    expect(mark("x.lua", Buffer.from("print(1)\n")).data.toString()).toBe(`print(1)\n-- ${markLine(m)}\n`);
    expect(mark("x.luau", Buffer.from("local a = 1\n")).data.toString()).toContain("-- Licensed copy");
    expect(mark("x.ahk", Buffer.from("MsgBox hi\n")).data.toString()).toContain("; Licensed copy");
    expect(mark("x.lsp", Buffer.from("(defun c:hi () (princ))\n")).data.toString()).toContain("; Licensed copy");
    expect(mark("x.gcode", Buffer.from("G28\nG1 X10\n")).data.toString()).toContain("; Licensed copy");
    expect(mark("page.html", Buffer.from("<p>x</p>\n")).data.toString()).toContain(`<!-- ${markLine(m)} -->`);
    // Windows line endings stay Windows line endings.
    expect(mark("run.bat", Buffer.from("@echo off\r\necho hi\r\n")).data.toString()).toBe(`@echo off\r\necho hi\r\nREM ${markLine(m)}\r\n`);
  });

  test("UTF-16 PowerShell keeps its encoding; a signed script is left alone", () => {
    const body = "Write-Output 'مرحبا'\r\n";
    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(body, "utf16le")]);
    const out = mark("x.ps1", utf16);
    expect(out.placed).toBe("inside");
    expect(out.data.subarray(0, 2).equals(Buffer.from([0xff, 0xfe]))).toBe(true);
    expect(out.data.subarray(2).toString("utf16le")).toBe(`${body}# ${markLine(m)}\r\n`);
    const signed = Buffer.from("Write-Output 1\r\n# SIG # Begin signature block\r\n# MIIx\r\n# SIG # End signature block\r\n");
    const s = mark("x.ps1", signed);
    expect(s).toMatchObject({ placed: "package", why: "signed" });
    expect(s.data.equals(signed)).toBe(true);
  });

  test("not text after all, or a type that can't carry it: left as it is, in the package", () => {
    const bin = Buffer.from([0x4d, 0x5a, 0x00, 0x01, 0x02, 0x00]);
    expect(mark("fake.py", bin)).toMatchObject({ placed: "package", why: "binary" });
    expect(mark("app.exe", bin)).toMatchObject({ placed: "package", why: "type" });
    expect(mark("model.rbxm", bin).placed).toBe("package");
    expect(mark("drawing.dwg", bin).placed).toBe("package");
    expect(mark("unknown.xyz", Buffer.from("text")).placed).toBe("package");
    expect(mark("noext", Buffer.from("text")).placed).toBe("package");
  });

  test("STL: in the binary header, or after the name of an ASCII one", () => {
    const tri = Buffer.alloc(84 + 50 * 2);
    tri.write("solid-looking header that must go", 0, "ascii");
    tri.writeUInt32LE(2, 80);
    const b = mark("part.stl", tri);
    expect(b.placed).toBe("inside");
    expect(b.data.length).toBe(tri.length);
    expect(b.data.subarray(0, 80).toString("ascii")).toMatch(/^Licensed copy for order G7H8J9/);
    expect(b.data.subarray(80).equals(tri.subarray(80))).toBe(true);
    const ascii = Buffer.from("solid part\nfacet normal 0 0 1\nendfacet\nendsolid part\n");
    expect(mark("part.stl", ascii).data.toString()).toBe("solid part estb:K7QM2XHPAB\nfacet normal 0 0 1\nendfacet\nendsolid part\n");
    expect(mark("broken.stl", Buffer.from([1, 2, 3])).placed).toBe("package");
  });

  test("the owner's own types and changes win", () => {
    expect(ruleFor("rbxmx").mode).toBe("package");
    const custom = [{ ext: "rbxmx", label: "Roblox XML", mode: "comment" as const, commentStart: "<!--", commentEnd: "-->" }, { ext: "nut", label: "Squirrel", mode: "comment" as const, commentStart: "//" }];
    expect(mark("m.rbxmx", Buffer.from("<roblox></roblox>\n"), custom).data.toString()).toContain("<!-- Licensed copy");
    expect(mark("s.nut", Buffer.from("print(1)\n"), custom).data.toString()).toContain("// Licensed copy");
    const types = allTypes(custom);
    expect(types.find((t) => t.ext === "rbxmx")).toMatchObject({ mode: "comment", builtIn: false });
    expect(types.find((t) => t.ext === "py")).toMatchObject({ builtIn: true });
    expect(placementFor(ruleFor("py"), probeFile(Buffer.from("x")))).toEqual({ placed: "inside" });
  });

  test("a leaked file says whose copy it was (UTF-8, UTF-16, STL)", () => {
    expect(findMarks(mark("a.py", Buffer.from("print(1)\n")).data)).toEqual(["K7QM2XHPAB"]);
    const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("x\r\n", "utf16le")]);
    expect(findMarks(mark("a.ps1", utf16).data)).toEqual(["K7QM2XHPAB"]);
    const tri = Buffer.alloc(84);
    expect(findMarks(mark("a.stl", tri).data)).toEqual(["K7QM2XHPAB"]);
    expect(findMarks(Buffer.from("nothing here estb:short"))).toEqual([]);
  });
});

describe("Serials", () => {
  test("random, readable, and the same however it's typed", () => {
    const a = newSerial();
    expect(a).toMatch(/^ESTB(-[0-9A-HJKMNP-TV-Z]{4}){5}$/);
    expect(new Set(Array.from({ length: 500 }, newSerial)).size).toBe(500);
    expect(newMarkId()).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
    expect(normalizeSerial(" estb-7kq2 m9xd-4hfa ")).toBe("ESTB7KQ2M9XD4HFA");
    expect(normalizeSerial("ESTB-OOIL")).toBe("ESTB0011");
    expect(serialLast4("ESTB-7KQ2-M9XD-4HFA-PZ3C-W8RT")).toBe("W8RT");
  });
});

describe("Marked scripts still run", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estb-mark-"));

  test.skipIf(!PY)("Python", () => {
    const r = runIn(dir, "t.py", mark("t.py", Buffer.from("import sys\nprint('ok', sys.version_info[0])")).data, "python", []);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toMatch(/^ok \d$/);
  });

  test.skipIf(!PS)("PowerShell (UTF-16, Windows line endings)", () => {
    const src = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("$x = 2 + 3\r\nWrite-Output \"ok $x\"\r\n", "utf16le")]);
    const r = runIn(dir, "t.ps1", mark("t.ps1", src).data, "powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe("ok 5");
  });

  test.skipIf(!CMD)("Batch", () => {
    const r = runIn(dir, "t.bat", mark("t.bat", Buffer.from("@echo off\r\necho ok\r\n")).data, "cmd", ["/c"]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe("ok");
  });

  test("JavaScript", () => {
    const r = runIn(dir, "t.js", mark("t.js", Buffer.from("console.log('ok')")).data, process.execPath, []);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe("ok");
  });
});
