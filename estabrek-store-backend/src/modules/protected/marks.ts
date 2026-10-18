/**
 * Where a protected file carries its buyer's mark ("estb:" + the licence's mark id):
 *   - comment: a licence line at the end of a text script, in the language's own
 *     comment ("# …" for Python, "-- …" for Lua/Roblox, "REM …" for batch…). At the
 *     end, so shebangs, encodings and "#Requires" lines stay first.
 *   - stl: in a binary STL's 80-byte header, or after the name of an ASCII one.
 *   - package: the file is left as it is (programs, models, archives); the mark is
 *     in LICENCE.txt beside it in the encrypted ZIP.
 * A file that turns out not to be plain text (or a signed PowerShell script, which
 * any change would break) falls back to "package" whatever its type says.
 *
 * The mark is a deterrent and a trace, not a lock: someone who knows can delete
 * the line. The encrypted ZIP and the serial are the lock; the launcher (phase 4)
 * is what binds a copy to one PC.
 */
import crypto from "node:crypto";

export type MarkMode = "comment" | "stl" | "package";
export type FileTypeRule = { ext: string; label: string; mode: MarkMode; commentStart?: string | null; commentEnd?: string | null; builtIn?: boolean };

/** What an uploaded file is (kept with it, so the placement shows without opening it again). */
export type Probe = { encoding: "utf8" | "utf8bom" | "utf16le" | "utf16be" | null; signed: boolean; stl: "binary" | "ascii" | null };

const t = (ext: string, label: string, mode: MarkMode, commentStart?: string, commentEnd?: string): FileTypeRule => ({ ext, label, mode, commentStart, commentEnd, builtIn: true });

/** The types the shop knows; the owner can change these or add her own (ProtectedFileType). */
export const BUILT_IN_TYPES: FileTypeRule[] = [
  t("py", "Python", "comment", "#"),
  t("pyw", "Python (بدون شاشة)", "comment", "#"),
  t("ps1", "PowerShell", "comment", "#"),
  t("psm1", "PowerShell (مكتبة)", "comment", "#"),
  t("bat", "Batch", "comment", "REM"),
  t("cmd", "Batch", "comment", "REM"),
  t("sh", "Shell", "comment", "#"),
  t("vbs", "VBScript", "comment", "'"),
  t("ahk", "AutoHotkey", "comment", ";"),
  t("ahk2", "AutoHotkey v2", "comment", ";"),
  t("js", "JavaScript", "comment", "//"),
  t("mjs", "JavaScript", "comment", "//"),
  t("cjs", "JavaScript", "comment", "//"),
  t("ts", "TypeScript", "comment", "//"),
  t("lua", "Lua", "comment", "--"),
  t("luau", "Roblox (Luau)", "comment", "--"),
  t("rbxm", "Roblox model", "package"),
  t("rbxl", "Roblox place", "package"),
  t("rbxmx", "Roblox model (XML)", "package"),
  t("rbxlx", "Roblox place (XML)", "package"),
  t("lsp", "AutoCAD (AutoLISP)", "comment", ";"),
  t("dcl", "AutoCAD dialog (DCL)", "comment", "//"),
  t("scr", "AutoCAD script", "package"),
  t("fas", "AutoCAD (compiled)", "package"),
  t("vlx", "AutoCAD (compiled)", "package"),
  t("dwg", "AutoCAD drawing", "package"),
  t("dxf", "AutoCAD DXF", "package"),
  t("stl", "3D print (STL)", "stl"),
  t("obj", "3D model (OBJ)", "comment", "#"),
  t("3mf", "3D print (3MF)", "package"),
  t("gcode", "3D print (G-code)", "comment", ";"),
  t("gco", "3D print (G-code)", "comment", ";"),
  t("scad", "OpenSCAD", "comment", "//"),
  t("step", "CAD (STEP)", "package"),
  t("stp", "CAD (STEP)", "package"),
  t("sql", "SQL", "comment", "--"),
  t("html", "HTML", "comment", "<!--", "-->"),
  t("exe", "Windows program", "package"),
  t("dll", "Windows library", "package"),
  t("msi", "Windows installer", "package"),
  t("zip", "ZIP folder", "package"),
  t("rar", "RAR folder", "package"),
  t("7z", "7z folder", "package"),
  t("json", "JSON", "package"),
  t("pdf", "PDF", "package"),
];

export const extOf = (name: string) => {
  const m = /\.([A-Za-z0-9_+-]{1,16})$/.exec(String(name ?? "").trim());
  return m ? m[1].toLowerCase() : "";
};

/** The owner's own types win over the built-in ones; unknown types go in the package. */
export function ruleFor(ext: string, custom: FileTypeRule[] = []): FileTypeRule {
  const e = ext.toLowerCase();
  return custom.find((r) => r.ext === e) ?? BUILT_IN_TYPES.find((r) => r.ext === e) ?? { ext: e, label: e ? e.toUpperCase() : "ملف", mode: "package" };
}

/** Built-in and custom types together, custom first where both have one. */
export function allTypes(custom: FileTypeRule[] = []) {
  const byExt = new Map(BUILT_IN_TYPES.map((r) => [r.ext, r] as const));
  for (const c of custom) byExt.set(c.ext, { ...c, builtIn: false });
  return [...byExt.values()].sort((a, b) => a.ext.localeCompare(b.ext));
}

const SIG_BLOCK = "# SIG # Begin signature block";

export function probeFile(data: Buffer): Probe {
  const stl = stlKind(data);
  let encoding: Probe["encoding"] = null;
  if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) encoding = "utf8bom";
  else if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) encoding = "utf16le";
  else if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) encoding = "utf16be";
  else if (!data.subarray(0, 8192).includes(0) && looksLikeUtf8(data.subarray(0, 65536))) encoding = "utf8";
  const text = encoding ? decode(data, encoding) : "";
  return { encoding, signed: Boolean(text) && text.includes(SIG_BLOCK), stl };
}

function looksLikeUtf8(b: Buffer) {
  // A cut-off last character at the 64 KB edge is fine.
  const s = new TextDecoder("utf-8", { fatal: false }).decode(b);
  const bad = (s.match(/�/g) ?? []).length;
  return bad <= 1;
}

function stlKind(data: Buffer): Probe["stl"] {
  if (data.length >= 84) {
    const n = data.readUInt32LE(80);
    if (84 + n * 50 === data.length) return "binary";
  }
  if (/^\s*solid\b/i.test(data.subarray(0, 256).toString("latin1")) && /endsolid/i.test(data.subarray(Math.max(0, data.length - 512)).toString("latin1"))) return "ascii";
  return null;
}

function decode(data: Buffer, enc: NonNullable<Probe["encoding"]>) {
  if (enc === "utf8bom") return data.subarray(3).toString("utf8");
  if (enc === "utf8") return data.toString("utf8");
  if (enc === "utf16le") return data.subarray(2).toString("utf16le");
  const body = Buffer.from(data.subarray(2));
  body.swap16();
  return body.toString("utf16le");
}

function encode(text: string, enc: NonNullable<Probe["encoding"]>) {
  if (enc === "utf8bom") return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, "utf8")]);
  if (enc === "utf8") return Buffer.from(text, "utf8");
  if (enc === "utf16le") return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
  const body = Buffer.from(text, "utf16le");
  body.swap16();
  return Buffer.concat([Buffer.from([0xfe, 0xff]), body]);
}

export type MarkInfo = { orderShortId: string; markId: string };

/** The words of the mark (plain ASCII, so every language's comment and file encoding takes it). */
export const markLine = (m: MarkInfo) => `Licensed copy for order ${m.orderShortId} - personal use only - estb:${m.markId}`;

/** Where the mark will go for this rule and file, and why when it can't go inside. */
export function placementFor(rule: FileTypeRule, probe: Probe): { placed: "inside" | "package"; why?: "type" | "binary" | "signed" } {
  if (rule.mode === "package") return { placed: "package", why: "type" };
  if (rule.mode === "stl") return probe.stl ? { placed: "inside" } : { placed: "package", why: "binary" };
  if (!probe.encoding) return { placed: "package", why: "binary" };
  if (probe.signed) return { placed: "package", why: "signed" };
  if (!rule.commentStart) return { placed: "package", why: "type" };
  return { placed: "inside" };
}

/** A copy of the file with the buyer's mark (or the file as it is, see placementFor). */
export function applyMark(data: Buffer, rule: FileTypeRule, m: MarkInfo, probe = probeFile(data)) {
  const where = placementFor(rule, probe);
  if (where.placed === "package") return { data, ...where };
  if (rule.mode === "stl") return { data: markStl(data, probe.stl!, m), ...where };
  const enc = probe.encoding!;
  const text = decode(data, enc);
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const line = [rule.commentStart, markLine(m), rule.commentEnd].filter(Boolean).join(" ");
  const out = text + (text === "" || text.endsWith("\n") ? "" : nl) + line + nl;
  return { data: encode(out, enc), ...where };
}

function markStl(data: Buffer, kind: "binary" | "ascii", m: MarkInfo) {
  if (kind === "binary") {
    const copy = Buffer.from(data);
    // 80 bytes of free text; it must not start with "solid" (that means ASCII to readers).
    const header = Buffer.alloc(80, 0x20);
    header.write(`Estabrek ${markLine(m)}`.slice(0, 80), 0, "ascii");
    header.copy(copy, 0);
    return copy;
  }
  const text = data.toString("latin1");
  const i = text.search(/\r?\n/);
  const first = i < 0 ? text : text.slice(0, i);
  return Buffer.from(`${first} estb:${m.markId}${i < 0 ? "" : text.slice(i)}`, "latin1");
}

/** Marks in a leaked file (any of its text: UTF-8, UTF-16, an STL header). */
export function findMarks(data: Buffer): string[] {
  const found = new Set<string>();
  const re = /estb:([0-9A-HJKMNP-TV-Z]{10})/g;
  for (const text of [data.toString("latin1"), data.toString("utf16le"), data.length > 1 ? data.subarray(1).toString("utf16le") : ""]) {
    for (const m of text.matchAll(re)) found.add(m[1]);
  }
  return [...found];
}

/* ---------------- Serials and mark ids ---------------- */

/** Crockford's base 32: no I, L, O or U, so a serial read aloud or retyped can't be misread. */
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function base32(bytes: Buffer, chars: number) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5 && out.length < chars) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out;
}

/** ESTB-XXXX-XXXX-XXXX-XXXX-XXXX: 100 random bits (never from the date or the order). */
export function newSerial() {
  const s = base32(crypto.randomBytes(13), 20);
  return `ESTB-${s.match(/.{4}/g)!.join("-")}`;
}

/** 10 characters, 50 random bits: the mark in every copy. */
export const newMarkId = () => base32(crypto.randomBytes(7), 10);

/** The same serial however it's typed (case, spaces, dashes, O for 0, I/L for 1). */
export function normalizeSerial(raw: string) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

export const serialLast4 = (serial: string) => normalizeSerial(serial).slice(-4);
