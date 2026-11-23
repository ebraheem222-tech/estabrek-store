// Builds the blank Paper plugin (paper/) into estabrek-store-backend/assets/link/minecraft/site-link.jar, the file the
// site stamps with a site's key as its owner downloads it (estabrek-store-backend/src/lib/gameLink.ts).
//
//   node estabrek-link/build.mjs            (JAVAC=path\to\javac.exe to pick one; Java 17 or newer)
//
// It compiles against paper/stubs: stand-ins with the exact shapes of the Bukkit/Paper API the plugin calls, so
// nothing is downloaded; the stand-ins are never packed. It runs paper/check (the plugin's JSON) before packing.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const paper = path.join(here, "paper");
const out = path.resolve(here, "../estabrek-store-backend/assets/link/minecraft");
const INTELLIJ = "C:/Program Files/JetBrains/IntelliJ IDEA 2025.2/jbr/bin";
const javac = process.env.JAVAC || (fs.existsSync(`${INTELLIJ}/javac.exe`) ? `${INTELLIJ}/javac.exe` : "javac");
const java = javac.replace(/javac(\.exe)?$/i, (m) => m.replace("javac", "java"));

const javaFiles = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith(".java")).map((f) => path.join(dir, String(f)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "site-link-"));
const stubs = path.join(tmp, "stubs");
const classes = path.join(tmp, "classes");
const check = path.join(tmp, "check");
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });

run(javac, ["--release", "17", "-encoding", "UTF-8", "-d", stubs, ...javaFiles(path.join(paper, "stubs"))]);
run(javac, ["--release", "17", "-encoding", "UTF-8", "-Xlint:all", "-Werror", "-cp", stubs, "-d", classes, ...javaFiles(path.join(paper, "src"))]);
run(javac, ["--release", "17", "-encoding", "UTF-8", "-cp", `${classes}${path.delimiter}${stubs}`, "-d", check, ...javaFiles(path.join(paper, "check"))]);
run(java, ["-cp", `${classes}${path.delimiter}${check}`, "site.link.JsonCheck"]);

/* ---------------- A JAR (a ZIP), with fixed dates so the same source makes the same file ---------------- */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const time = 0, date = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, "utf8");
    const deflated = zlib.deflateRawSync(raw);
    const stored = deflated.length >= raw.length;
    const body = stored ? raw : deflated;
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt16LE(time, 12); central.writeUInt16LE(date, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

const classFiles = fs.readdirSync(classes, { recursive: true }).filter((f) => String(f).endsWith(".class")).map((f) => String(f).replace(/\\/g, "/")).sort();
const entries = [
  { name: "META-INF/MANIFEST.MF", data: "Manifest-Version: 1.0\r\nCreated-By: site-link\r\n\r\n" },
  { name: "plugin.yml", data: fs.readFileSync(path.join(paper, "resources", "plugin.yml")) },
  { name: "site-link.properties", data: fs.readFileSync(path.join(paper, "resources", "site-link.properties")) },
  ...classFiles.map((f) => ({ name: f, data: fs.readFileSync(path.join(classes, f)) })),
];
const jar = zip(entries);
// Nothing in what a store's owner gets names the platform.
if (/estabrek/i.test(jar.toString("latin1")) || entries.some((e) => /estabrek/i.test(String(e.data)))) throw new Error("The plugin names the platform");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "site-link.jar"), jar);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`site-link.jar: ${classFiles.length} classes, ${jar.length} bytes -> ${path.relative(process.cwd(), path.join(out, "site-link.jar"))}`);
