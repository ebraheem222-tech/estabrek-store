/**
 * Server & sign-in rules, set from the admin (Security page) instead of
 * environment variables. Anything not set (or a broken saved value) falls back
 * to the environment, so the server always has a sane policy.
 *
 * Emergency switch: SECURITY_POLICY_FROM_DB=false makes the server ignore the
 * saved policy and use the environment only (e.g. if an IP list locked you out).
 *
 * Reading is synchronous (`policy()`), from a copy refreshed every 15 seconds,
 * so middleware never waits on the database.
 */
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { compileIpRule } from "../utils/ip.js";

/** Allowed range and meaning of every number, shared with the admin page. */
export const LIMITS = {
  "login.maxFailed": { min: 3, max: 20 },
  "login.lockMinutes": { min: 1, max: 1440 },
  "session.lifetimeDays": { min: 1, max: 90 },
  "session.idleHours": { min: 0, max: 720 },
  "session.accessMinutes": { min: 5, max: 60 },
  "otp.ttlMinutes": { min: 1, max: 60 },
  "otp.maxAttempts": { min: 3, max: 20 },
  "rateLimit.windowSeconds": { min: 10, max: 3600 },
  "rateLimit.perPath": { min: 10, max: 10000 },
  "rateLimit.perIp": { min: 30, max: 50000 },
  "rateLimit.authWindowSeconds": { min: 10, max: 3600 },
  "rateLimit.auth": { min: 3, max: 500 },
  "pressure.halfLifeSeconds": { min: 10, max: 3600 },
  "pressure.capacity": { min: 20, max: 5000 },
  "pressure.slowAt": { min: 30, max: 99 },
  "pressure.blockAt": { min: 50, max: 100 },
  "pressure.blockMinutes": { min: 1, max: 1440 },
  "pressure.maxBlockHours": { min: 1, max: 168 },
  "pressure.weightRead": { min: 1, max: 20 },
  "pressure.weightWrite": { min: 1, max: 50 },
  "pressure.weightAuth": { min: 1, max: 100 },
  "pressure.weightFail": { min: 0, max: 100 },
} as const;

const n = (key: keyof typeof LIMITS) => z.coerce.number().int().min(LIMITS[key].min).max(LIMITS[key].max);

export const IpRuleSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((r) => compileIpRule(r) !== null, { message: "Not an IP address or range" });

const IpList = (max: number) => z.array(IpRuleSchema).max(max);

export const PolicySchema = z.object({
  login: z.object({ maxFailed: n("login.maxFailed"), lockMinutes: n("login.lockMinutes") }),
  session: z.object({
    lifetimeDays: n("session.lifetimeDays"),
    /** 0 = off. Sign out a device that wasn't used for this long. */
    idleHours: n("session.idleHours"),
    accessMinutes: n("session.accessMinutes"),
  }),
  twoFactor: z.object({ required: z.enum(["off", "owners", "everyone"]) }),
  otp: z.object({ ttlMinutes: n("otp.ttlMinutes"), maxAttempts: n("otp.maxAttempts") }),
  alerts: z.object({ newDevice: z.boolean() }),
  rateLimit: z.object({
    windowSeconds: n("rateLimit.windowSeconds"),
    perPath: n("rateLimit.perPath"),
    perIp: n("rateLimit.perIp"),
    authWindowSeconds: n("rateLimit.authWindowSeconds"),
    auth: n("rateLimit.auth"),
  }),
  /**
   * Traffic protection with decay (the "e^-x" model, see lib/pressure.ts): every
   * request adds a weight to the IP's score, the score halves every
   * halfLifeSeconds, and pressure = 1 − e^(−score/capacity) runs 0 → 1.
   * From slowAt% answers get slower, at blockAt% the IP is blocked for
   * blockMinutes, doubling for repeat offenders (up to maxBlockHours).
   * "watch" only records who would be slowed/blocked.
   */
  pressure: z
    .object({
      mode: z.enum(["off", "watch", "on"]),
      halfLifeSeconds: n("pressure.halfLifeSeconds"),
      capacity: n("pressure.capacity"),
      slowAt: n("pressure.slowAt"),
      blockAt: n("pressure.blockAt"),
      blockMinutes: n("pressure.blockMinutes"),
      maxBlockHours: n("pressure.maxBlockHours"),
      weightRead: n("pressure.weightRead"),
      weightWrite: n("pressure.weightWrite"),
      weightAuth: n("pressure.weightAuth"),
      weightFail: n("pressure.weightFail"),
      /** Never counted or blocked (e.g. the storefront server, your office). */
      allow: IpList(50),
    })
    .refine((p) => p.slowAt < p.blockAt, { message: "slowAt must be below blockAt", path: ["slowAt"] }),
  ip: z.object({
    /** When not empty, only these IPs/ranges can use the admin. */
    adminAllow: IpList(50),
    adminBlock: IpList(200),
    /** Blocked from the whole site and API. */
    siteBlock: IpList(500),
  }),
});

export type Policy = z.infer<typeof PolicySchema>;
export type PolicySection = keyof Policy;
export const SECTIONS = Object.keys(PolicySchema.shape) as PolicySection[];

const clamp = (key: keyof typeof LIMITS, v: number) =>
  Math.min(LIMITS[key].max, Math.max(LIMITS[key].min, Math.round(Number.isFinite(v) ? v : LIMITS[key].min)));

/** The policy the environment variables describe (also the "reset" target). */
export function envDefaults(): Policy {
  return {
    login: { maxFailed: clamp("login.maxFailed", env.AUTH_MAX_FAILED), lockMinutes: clamp("login.lockMinutes", env.AUTH_LOCK_MINUTES) },
    session: { lifetimeDays: 30, idleHours: 0, accessMinutes: 15 },
    twoFactor: { required: "off" },
    otp: { ttlMinutes: clamp("otp.ttlMinutes", env.OTP_TTL_MINUTES), maxAttempts: clamp("otp.maxAttempts", env.OTP_MAX_ATTEMPTS) },
    alerts: { newDevice: true },
    rateLimit: {
      windowSeconds: clamp("rateLimit.windowSeconds", env.RATE_LIMIT_WINDOW_MS / 1000),
      perPath: clamp("rateLimit.perPath", env.RATE_LIMIT_MAX),
      perIp: clamp("rateLimit.perIp", env.RATE_LIMIT_IP_MAX),
      authWindowSeconds: clamp("rateLimit.authWindowSeconds", env.RATE_LIMIT_AUTH_WINDOW_MS / 1000),
      auth: clamp("rateLimit.auth", env.RATE_LIMIT_AUTH_MAX),
    },
    pressure: {
      mode: "watch",
      halfLifeSeconds: 60,
      capacity: 150,
      slowAt: 75,
      blockAt: 95,
      blockMinutes: 10,
      maxBlockHours: 24,
      weightRead: 1,
      weightWrite: 3,
      weightAuth: 8,
      weightFail: 4,
      allow: [],
    },
    ip: { adminAllow: [], adminBlock: [], siteBlock: [] },
  };
}

/**
 * Saved (possibly partial or old) data on top of the defaults. A section that
 * doesn't validate falls back to its default instead of breaking the server.
 */
export function mergePolicy(saved: unknown, base: Policy = envDefaults()): Policy {
  const s = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const out = { ...base } as Record<string, unknown>;
  for (const key of SECTIONS) {
    const part = s[key];
    if (!part || typeof part !== "object") continue;
    const merged = { ...(base[key] as object), ...(part as object) };
    const ok = PolicySchema.shape[key].safeParse(merged);
    if (ok.success) out[key] = ok.data;
  }
  return out as Policy;
}

/** "login.maxFailed"-style names of what differs between two policies. */
export function policyChanges(a: Policy, b: Policy): string[] {
  const out: string[] = [];
  for (const key of SECTIONS) {
    const x = a[key] as Record<string, unknown>;
    const y = b[key] as Record<string, unknown>;
    for (const f of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (JSON.stringify(x[f]) !== JSON.stringify(y[f])) out.push(`${key}.${f}`);
    }
  }
  return out;
}

export const policyFromDbEnabled = () => process.env.SECURITY_POLICY_FROM_DB !== "false";

let current: Policy = envDefaults();
let version = 1;
let loadedAt = 0;
let loading: Promise<void> | null = null;
const REFRESH_MS = 15_000;

/** The rules in force now. Never waits: refreshes in the background when stale. */
export function policy(): Policy {
  if (Date.now() - loadedAt > REFRESH_MS && !loading) void loadPolicy();
  return current;
}

/** Changes every time the rules change (used to rebuild compiled IP lists). */
export function policyVersion() {
  return version;
}

function setCurrent(next: Policy) {
  if (JSON.stringify(next) !== JSON.stringify(current)) version += 1;
  current = next;
  loadedAt = Date.now();
}

export function loadPolicy(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      if (!policyFromDbEnabled()) return setCurrent(envDefaults());
      const row = await prisma.securityPolicy.findUnique({ where: { id: "default" } });
      setCurrent(mergePolicy(row?.data));
    } catch {
      // Database unreachable: keep what we have, try again later.
      loadedAt = Date.now();
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** After a save from the admin: in force at once on this server. */
export function applyPolicy(next: Policy) {
  setCurrent(policyFromDbEnabled() ? next : envDefaults());
}
