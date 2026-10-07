/**
 * The backup file: the database as JSON, gzipped, then encrypted (AES-256-GCM).
 *
 *   "ESTBK1" | iv (12 bytes) | tag (16 bytes) | encrypted gzip(JSON)
 *
 * The key is BACKUP_ENCRYPTION_KEY (keep a copy of it outside Railway!), or,
 * when that isn't set, one made from JWT_SECRET.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { env } from "../../config/env.js";

const MAGIC = Buffer.from("ESTBK1");

export type BackupData = {
  format: "estabrek-backup";
  version: 1;
  createdAt: string;
  /** The last migration applied when the backup was taken. */
  migration: string | null;
  tables: Record<string, Array<Record<string, unknown>>>;
};

export const usesCustomKey = () => Boolean(env.BACKUP_ENCRYPTION_KEY);

export function backupKey(secret = env.BACKUP_ENCRYPTION_KEY ?? `estabrek-backup:${env.JWT_SECRET}`) {
  return createHash("sha256").update(secret).digest();
}

export function packBackup(data: BackupData, key = backupKey()): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(gzipSync(Buffer.from(JSON.stringify(data)), { level: 9 })), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

export function unpackBackup(file: Buffer, key = backupKey()): BackupData {
  if (file.length < MAGIC.length + 28 || !file.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("NOT_A_BACKUP_FILE");
  const iv = file.subarray(6, 18);
  const tag = file.subarray(18, 34);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let plain: Buffer;
  try {
    plain = Buffer.concat([decipher.update(file.subarray(34)), decipher.final()]);
  } catch {
    throw new Error("WRONG_KEY_OR_DAMAGED_FILE");
  }
  const data = JSON.parse(gunzipSync(plain).toString("utf8")) as BackupData;
  if (data?.format !== "estabrek-backup" || !data.tables) throw new Error("NOT_A_BACKUP_FILE");
  return data;
}

export function backupFileName(at = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `estabrek-backup-${at.getUTCFullYear()}-${p(at.getUTCMonth() + 1)}-${p(at.getUTCDate())}-${p(at.getUTCHours())}${p(at.getUTCMinutes())}.estbk`;
}
