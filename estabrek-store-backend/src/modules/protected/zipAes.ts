/**
 * ZIP files encrypted with AES-256 (the WinZip "AE-2" format), opened with a
 * password in 7-Zip, WinRAR and most archive tools (not Windows Explorer's own
 * ZIP view). The password is the buyer's serial.
 *
 * Per entry: a random 16-byte salt; PBKDF2-HMAC-SHA1 (1000 rounds, as the format
 * fixes it) turns password + salt into a 32-byte AES key, a 32-byte HMAC key and
 * a 2-byte check; the (deflated) data is encrypted with AES-256 in counter mode
 * (counter little-endian, from 1) and signed with HMAC-SHA1 (first 10 bytes). The
 * slow-hash count doesn't matter much here: serials are random (100 bits), not
 * words someone could guess.
 *
 * File names stay readable in the listing (the ZIP format never hides them).
 */
import crypto from "node:crypto";
import zlib from "node:zlib";

export type ZipEntry = { name: string; data: Buffer; date?: Date };

const AES_EXTRA = (method: number) => {
  const b = Buffer.alloc(11);
  b.writeUInt16LE(0x9901, 0); // AES extra field
  b.writeUInt16LE(7, 2);
  b.writeUInt16LE(2, 4); // AE-2 (no CRC stored)
  b.write("AE", 6, "ascii");
  b.writeUInt8(3, 8); // AES-256
  b.writeUInt16LE(method, 9); // the real compression: 8 deflate, 0 stored
  return b;
};

function dosTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function deriveKeys(password: string, salt: Buffer) {
  const k = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, 1000, 66, "sha1");
  return { aes: k.subarray(0, 32), mac: k.subarray(32, 64), check: k.subarray(64, 66) };
}

/** AES-256 in WinZip's counter mode (little-endian counter starting at 1). */
function ctr(key: Buffer, data: Buffer) {
  const blocks = Math.ceil(data.length / 16);
  const counters = Buffer.alloc(blocks * 16);
  for (let i = 0; i < blocks; i++) {
    const n = i + 1;
    counters.writeUInt32LE(n >>> 0, i * 16);
    counters.writeUInt32LE(Math.floor(n / 0x1_0000_0000), i * 16 + 4);
  }
  const ecb = crypto.createCipheriv("aes-256-ecb", key, null);
  ecb.setAutoPadding(false);
  const stream = Buffer.concat([ecb.update(counters), ecb.final()]);
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ stream[i];
  return out;
}

/** Only the file's own name, with no folders or tricks ("../", drive letters). */
export function safeEntryName(name: string) {
  const base = String(name ?? "").replace(/\\/g, "/").split("/").pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f<>:"|?*]/g, "_").replace(/^\.+/, "").trim();
  return clean.slice(0, 180) || "file";
}

/** Several files with the same name: "a.py", "a (2).py". */
function uniqueNames(entries: ZipEntry[]) {
  const seen = new Map<string, number>();
  return entries.map((e) => {
    const name = safeEntryName(e.name);
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
  });
}

export function encryptedZip(entries: ZipEntry[], password: string): Buffer {
  if (!password) throw new Error("ZIP_PASSWORD_REQUIRED");
  const names = uniqueNames(entries);
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  entries.forEach((e, i) => {
    const name = Buffer.from(names[i], "utf8");
    const deflated = zlib.deflateRawSync(e.data, { level: 9 });
    const method = deflated.length < e.data.length ? 8 : 0;
    const body = method === 8 ? deflated : e.data;
    const salt = crypto.randomBytes(16);
    const k = deriveKeys(password, salt);
    const encrypted = ctr(k.aes, body);
    const auth = crypto.createHmac("sha1", k.mac).update(encrypted).digest().subarray(0, 10);
    const payload = Buffer.concat([salt, k.check, encrypted, auth]);
    const extra = AES_EXTRA(method);
    const { time, date } = dosTime(e.date ?? new Date());
    const flags = 0x0001 | 0x0800; // encrypted, UTF-8 names

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(51, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(99, 8); // AES
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(0, 14); // CRC: none in AE-2
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(extra.length, 28);
    const localPart = Buffer.concat([local, name, extra, payload]);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(51, 4); // made by: MS-DOS, spec 5.1
    cd.writeUInt16LE(51, 6);
    cd.writeUInt16LE(flags, 8);
    cd.writeUInt16LE(99, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(0, 16);
    cd.writeUInt32LE(payload.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt16LE(extra.length, 30);
    cd.writeUInt16LE(0, 32); // comment
    cd.writeUInt16LE(0, 34); // disk
    cd.writeUInt16LE(0, 36); // internal attributes
    cd.writeUInt32LE(0, 38); // external attributes
    cd.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([cd, name, extra]));

    locals.push(localPart);
    offset += localPart.length;
  });
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cdBuf, end]);
}

/**
 * Reads back a ZIP made by encryptedZip (tests; the owner's leak check of a copy
 * she can open). Throws ZIP_BAD_PASSWORD or ZIP_TAMPERED.
 */
export function readEncryptedZip(zip: Buffer, password: string): ZipEntry[] {
  const out: ZipEntry[] = [];
  let p = 0;
  while (p + 30 <= zip.length && zip.readUInt32LE(p) === 0x04034b50) {
    const method = zip.readUInt16LE(p + 8);
    const size = zip.readUInt32LE(p + 18);
    const nameLen = zip.readUInt16LE(p + 26);
    const extraLen = zip.readUInt16LE(p + 28);
    const name = zip.subarray(p + 30, p + 30 + nameLen).toString("utf8");
    const extra = zip.subarray(p + 30 + nameLen, p + 30 + nameLen + extraLen);
    const start = p + 30 + nameLen + extraLen;
    const payload = zip.subarray(start, start + size);
    if (method !== 99 || extra.readUInt16LE(0) !== 0x9901) throw new Error("ZIP_NOT_AES");
    const real = extra.readUInt16LE(9);
    const salt = payload.subarray(0, 16);
    const k = deriveKeys(password, salt);
    if (!payload.subarray(16, 18).equals(k.check)) throw new Error("ZIP_BAD_PASSWORD");
    const encrypted = payload.subarray(18, payload.length - 10);
    const auth = crypto.createHmac("sha1", k.mac).update(encrypted).digest().subarray(0, 10);
    if (!auth.equals(payload.subarray(payload.length - 10))) throw new Error("ZIP_TAMPERED");
    const body = ctr(k.aes, encrypted);
    out.push({ name, data: real === 8 ? zlib.inflateRawSync(body) : body });
    p = start + size;
  }
  return out;
}
