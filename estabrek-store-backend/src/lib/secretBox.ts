/**
 * Small secrets kept in the database encrypted (codes sold one per piece: game
 * keys, gift cards, licences). AES-256-GCM, a fresh 12-byte nonce each time, the
 * key from CODES_ENCRYPTION_KEY (or, unset, made from JWT_SECRET, as the backups
 * do). A keyed hash (HMAC-SHA256) finds the same code twice without decrypting.
 * Stored as "v1.<nonce>.<tag>.<ciphertext>" (base64url).
 */
import crypto from "node:crypto";
import { env } from "../config/env.js";

const VERSION = "v1";

function keys(secret = env.CODES_ENCRYPTION_KEY ?? `estabrek-codes:${env.JWT_SECRET}`) {
  const base = Buffer.from(secret, "utf8");
  const salt = Buffer.from("estabrek/secret-box", "utf8");
  const derive = (info: string) => Buffer.from(crypto.hkdfSync("sha256", base, salt, Buffer.from(info, "utf8"), 32));
  return { enc: derive("encrypt"), mac: derive("match") };
}

let cached: { secret: string; k: ReturnType<typeof keys> } | null = null;
const current = () => {
  const secret = env.CODES_ENCRYPTION_KEY ?? `estabrek-codes:${env.JWT_SECRET}`;
  if (!cached || cached.secret !== secret) cached = { secret, k: keys(secret) };
  return cached.k;
};

/** True when no key of its own is set (codes then depend on JWT_SECRET staying the same). */
export const secretBoxFromJwt = () => !env.CODES_ENCRYPTION_KEY;

export function seal(plain: string, k = current()): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k.enc, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [VERSION, iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function open(sealed: string, k = current()): string {
  const [v, iv, tag, ct] = sealed.split(".");
  if (v !== VERSION || !iv || !tag || ct === undefined) throw new Error("SECRET_BOX_FORMAT");
  const d = crypto.createDecipheriv("aes-256-gcm", k.enc, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

const BYTES_MAGIC = Buffer.from("SB1", "ascii");

/** Files (protected products' masters): "SB1" | nonce (12) | tag (16) | ciphertext. */
export function sealBytes(plain: Buffer, k = current()): Buffer {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k.enc, iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([BYTES_MAGIC, iv, c.getAuthTag(), ct]);
}

export function openBytes(sealed: Buffer | Uint8Array, k = current()): Buffer {
  const b = Buffer.from(sealed);
  if (b.length < 31 || !b.subarray(0, 3).equals(BYTES_MAGIC)) throw new Error("SECRET_BOX_FORMAT");
  const d = crypto.createDecipheriv("aes-256-gcm", k.enc, b.subarray(3, 15));
  d.setAuthTag(b.subarray(15, 31));
  return Buffer.concat([d.update(b.subarray(31)), d.final()]);
}

/** The same code, however it was typed (case, spaces, dashes), gives the same hash. */
export function normalizeCode(raw: string) {
  return String(raw ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

export function keyedHash(plain: string, k = current()): string {
  return crypto.createHmac("sha256", k.mac).update(normalizeCode(plain)).digest("base64url");
}

/** Tests: a key of their own. */
export const keysForTests = (secret: string) => keys(secret);
