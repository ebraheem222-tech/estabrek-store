/**
 * Keys for the automatic API (B4; the routes are modules/data, the admin's side
 * modules/admin/api.controller.ts). A key is made once and shown once: only its SHA-256 is
 * kept, with its first letters so the owner can tell one from another. Each key says which
 * tables it reaches and what it may do there, and how many requests a minute it gets.
 */
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma.js";

/** What can be done to a table's rows from outside. */
export const ACTS = ["read", "create", "update", "delete"] as const;
export type Act = (typeof ACTS)[number];

export const KEY_MARK = "ek_";
export const KEY_LIMITS = { name: 80, tables: 200, keys: 100, perMinute: { min: 1, max: 1000, default: 60 } } as const;

export const ScopesSchema = z
  .object({
    /** Every table (those made later too), or these (by id). */
    tables: z.union([z.literal("*"), z.array(z.string().min(1).max(64)).max(KEY_LIMITS.tables)]),
    acts: z.array(z.enum(ACTS)).min(1, "A key that may do nothing opens nothing").max(ACTS.length),
  })
  .strict();
export type Scopes = z.infer<typeof ScopesSchema>;

/** The scopes as kept; anything that isn't one opens nothing. */
export function scopesOf(raw: unknown): Scopes {
  const parsed = ScopesSchema.safeParse(raw);
  if (!parsed.success) return { tables: [], acts: ["read"] };
  const acts = ACTS.filter((a) => parsed.data.acts.includes(a));
  return { tables: parsed.data.tables === "*" ? "*" : [...new Set(parsed.data.tables)], acts };
}

/** Does the key reach this table for this act? (The table has to be open to keys too: lib/dataApi.ts.) */
export function keyCovers(scopes: Scopes, tableId: string, act: Act): boolean {
  return scopes.acts.includes(act) && (scopes.tables === "*" || scopes.tables.includes(tableId));
}

export const hashKey = (secret: string) => createHash("sha256").update(secret, "utf8").digest("hex");
/** A new key: the whole of it (to show once), what is kept of it, and what the list shows. */
export function newSecret(): { secret: string; hash: string; prefix: string } {
  const secret = `${KEY_MARK}${randomBytes(24).toString("base64url")}`;
  return { secret, hash: hashKey(secret), prefix: secret.slice(0, KEY_MARK.length + 5) };
}
/** Does this look like one of our keys? (Other tokens in the same header are someone else's.) */
export const looksLikeKey = (v: string) => v.startsWith(KEY_MARK) && v.length >= 20 && v.length <= 80 && /^[A-Za-z0-9_-]+$/.test(v);

export type KeyState = "active" | "revoked" | "expired";
export function keyState(key: { revokedAt: Date | null; expiresAt: Date | null }, now = Date.now()): KeyState {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt && key.expiresAt.getTime() <= now) return "expired";
  return "active";
}

/** A key as a request carries it. */
export type KeyLite = { id: string; name: string; prefix: string; scopes: Scopes; perMinute: number; revokedAt: Date | null; expiresAt: Date | null };

/* Looked up once every few seconds per key, so a busy client doesn't ask the database each time;
   a change from the admin forgets them all at once. */
const TTL_MS = 10_000;
const cache = new Map<string, { at: number; key: KeyLite | null }>();
export function forgetKeys() {
  cache.clear();
}

export async function findKey(secret: string): Promise<KeyLite | null> {
  const hash = hashKey(secret);
  const hit = cache.get(hash);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.key;
  const row = await prisma.apiKey.findUnique({ where: { hash }, select: { id: true, name: true, prefix: true, scopes: true, perMinute: true, revokedAt: true, expiresAt: true } });
  const key = row ? { ...row, scopes: scopesOf(row.scopes) } : null;
  cache.set(hash, { at: Date.now(), key });
  if (cache.size > 2000) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return key;
}

/* "Last used" is written once a minute per key at most. */
const touched = new Map<string, number>();
export function touchKey(id: string, ip: string | null, now = Date.now()) {
  if (now - (touched.get(id) ?? 0) < 60_000) return;
  touched.set(id, now);
  prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date(now), lastUsedIp: ip } }).catch(() => {
    /* a key deleted meanwhile: nothing to mark */
  });
}

/** A key as the admin sees it: never the key itself, nor what is kept of it. */
export function keyView(k: { id: string; name: string; prefix: string; scopes: unknown; perMinute: number; expiresAt: Date | null; revokedAt: Date | null; lastUsedAt: Date | null; lastUsedIp: string | null; createdBy: string | null; createdAt: Date; updatedAt: Date }, now = Date.now()) {
  return { id: k.id, name: k.name, prefix: k.prefix, scopes: scopesOf(k.scopes), perMinute: k.perMinute, expiresAt: k.expiresAt, revokedAt: k.revokedAt, lastUsedAt: k.lastUsedAt, lastUsedIp: k.lastUsedIp, createdBy: k.createdBy, createdAt: k.createdAt, updatedAt: k.updatedAt, state: keyState(k, now) };
}
