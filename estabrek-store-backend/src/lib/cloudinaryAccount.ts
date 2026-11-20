/**
 * The store's own Cloudinary account (its pictures, videos and 3D models), given in the admin
 * (إعداد المتجر, or الإعدادات → الوسائط) instead of the server's variables: a client's copy is set
 * up without anyone opening Railway. Kept in PerformanceSettings.data.cloudinary, its secret sealed
 * (lib/secretBox.ts) and never answered back; read synchronously from a copy refreshed every 15
 * seconds, as the media settings are.
 *
 * The server's own variables (CLOUDINARY_CLOUD_NAME, _API_KEY, _API_SECRET) still win when they
 * are all set: a store set up that way (Estabrek) stays as it is.
 */
import { prisma } from "./prisma.js";
import { open, seal } from "./secretBox.js";

export type CloudinaryCreds = { cloudName: string; apiKey: string; apiSecret: string };
type Saved = { cloudName: string; apiKey: string; sealed: string; savedAt: string };

/** A cloud's name, an API key and secret as Cloudinary gives them. */
export const CLOUD_NAME = /^[a-z0-9][a-z0-9_-]{1,60}$/i;
export const API_KEY = /^\d{6,24}$/;
export const API_SECRET = /^[A-Za-z0-9_-]{16,64}$/;

let saved: Saved | null = null;
let loadedAt = 0;
let loading: Promise<void> | null = null;

function fromEnv(): CloudinaryCreds | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}
const savedOf = (raw: unknown): Saved | null => {
  const r = raw as Partial<Saved> | null;
  return r && typeof r.cloudName === "string" && typeof r.apiKey === "string" && typeof r.sealed === "string" ? { cloudName: r.cloudName, apiKey: r.apiKey, sealed: r.sealed, savedAt: String(r.savedAt ?? "") } : null;
};

export function loadCloudinaryAccount(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
      const data = row?.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
      saved = savedOf(data.cloudinary);
    } catch {
      // keep what we have
    } finally {
      loadedAt = Date.now();
      loading = null;
    }
  })();
  return loading;
}

/** The account in force now: the server's variables, else the one given in the admin, else none. Never waits. */
export function cloudinaryCreds(): CloudinaryCreds | null {
  const env = fromEnv();
  if (env) return env;
  if (Date.now() - loadedAt > 15_000 && !loading) void loadCloudinaryAccount();
  if (!saved) return null;
  try {
    return { cloudName: saved.cloudName, apiKey: saved.apiKey, apiSecret: open(saved.sealed) };
  } catch {
    // Sealed with another server key: as if none was given.
    return null;
  }
}

/** Where the account comes from, as the admin shows it: never the secret. */
export function cloudinarySource(): { source: "env" | "saved" | "none"; cloudName: string | null; apiKeyEnd: string | null; savedAt: string | null } {
  const env = fromEnv();
  if (env) return { source: "env", cloudName: env.cloudName, apiKeyEnd: env.apiKey.slice(-4), savedAt: null };
  if (saved) return { source: "saved", cloudName: saved.cloudName, apiKeyEnd: saved.apiKey.slice(-4), savedAt: saved.savedAt || null };
  return { source: "none", cloudName: null, apiKeyEnd: null, savedAt: null };
}

/** The account given in the admin kept (or, null, taken away), in force at once on this server. */
export async function saveCloudinaryAccount(creds: CloudinaryCreds | null): Promise<void> {
  const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
  const data = row?.data && typeof row.data === "object" ? { ...(row.data as Record<string, unknown>) } : {};
  const next: Saved | null = creds ? { cloudName: creds.cloudName, apiKey: creds.apiKey, sealed: seal(creds.apiSecret), savedAt: new Date().toISOString() } : null;
  if (next) data.cloudinary = next;
  else delete data.cloudinary;
  await prisma.performanceSettings.upsert({ where: { id: "default" }, create: { id: "default", data: data as object }, update: { data: data as object } });
  saved = next;
  loadedAt = Date.now();
}

/* ---------------- Trying an account before it is kept ---------------- */

export type PingOut = { ok: boolean; status: number; why: string | null };
type Ping = (creds: CloudinaryCreds) => Promise<PingOut>;
/** Cloudinary's own question that changes nothing: GET /v1_1/<cloud>/ping, with the key and secret. */
const overNetwork: Ping = async ({ cloudName, apiKey, apiSecret }) => {
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/ping`, {
      headers: { authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    let why: string | null = null;
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: unknown } } | null;
      why = typeof body?.error?.message === "string" ? body.error.message.slice(0, 200) : null;
    }
    return { ok: res.ok, status: res.status, why };
  } catch {
    return { ok: false, status: 0, why: "Cloudinary couldn't be reached" };
  }
};
let ping: Ping = overNetwork;
export const pingCloudinary = (creds: CloudinaryCreds) => ping(creds);
/** For tests: Cloudinary stood in for (null: the real one again). */
export function setCloudinaryPingForTests(p: Ping | null) {
  ping = p ?? overNetwork;
}
