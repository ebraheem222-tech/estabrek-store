// src/config/env.ts
import "dotenv/config";
import { z } from "zod";

/** Parse comma-separated origins into array or "*" */
export function parseOrigins(raw: string): (string | RegExp)[] | "*" {
  const s = raw.trim();
  if (s === "" || s === "*") return "*";
  return s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((o) =>
      o.startsWith("/") && o.endsWith("/") ? new RegExp(o.slice(1, -1)) : o
    );
}

const Boolish = z
  .union([z.enum(["0", "1", "true", "false"]), z.coerce.number()])
  .optional()
  .transform((v) => (v == null ? false : v === "1" || v === "true" || Number(v) > 0));

const OptionalUrl = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().url(),

  // Auth / security
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  WEBHOOK_TOKEN: z
    .string()
    .min(16, "WEBHOOK_TOKEN must be at least 16 chars")
    .default("dev-webhook-please-change-123456"), // long enough to satisfy .min

  // CORS & rate limit
  CORS_ORIGINS: z.string().default("*"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  RATE_LIMIT_IP_MAX: z.coerce.number().default(600),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(20),
  RATE_LIMIT_USE_REDIS: Boolish,
  RATE_LIMIT_MEMORY_MAX_KEYS: z.coerce.number().int().min(1_000).default(50_000),

  // Body size limits
  BODY_JSON_LIMIT: z.string().default("2mb"),
  BODY_URLENCODED_LIMIT: z.string().default("2mb"),

  // Brute-force protection
  AUTH_MAX_FAILED: z.coerce.number().int().min(3).max(20).default(5),
  AUTH_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

  // OTP (SMS/email) settings
  OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),

  // Messaging provider (optional). Default senders are stubs.
  SMS_FROM: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),

  // Optional: trust proxy for real client IP behind reverse proxies
  TRUST_PROXY: Boolish,

  // IP allow/block lists (comma-separated IPs or CIDRs)
  IP_ALLOWLIST: z.string().default(""),
  IP_BLOCKLIST: z.string().default(""),
  ADMIN_IP_ALLOWLIST: z.string().default(""),
  ADMIN_IP_BLOCKLIST: z.string().default(""),
  WEBHOOK_IP_ALLOWLIST: z.string().default(""),
  WEBHOOK_IP_BLOCKLIST: z.string().default(""),

  // HTTPS + CSRF hardening
  ENFORCE_HTTPS: Boolish,
  HSTS_MAX_AGE: z.coerce.number().int().min(0).default(15_552_000), // 180 days
  CSRF_ORIGIN_CHECK: Boolish,
  CSRF_TOKEN_ENABLED: Boolish,
  CSRF_STRICT: Boolish,
  CSRF_COOKIE_NAME: z.string().default("csrf_token"),
  CSRF_HEADER_NAME: z.string().default("x-csrf-token"),
  CSRF_COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  CSRF_COOKIE_SECURE: Boolish,
  CSRF_COOKIE_HTTP_ONLY: Boolish,
  CSRF_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(120),

  // HTTP server timeouts (ms)
  HTTP_HEADER_TIMEOUT_MS: z.coerce.number().int().min(1).default(10_000),
  HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1).default(20_000),
  HTTP_KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().min(1).default(5_000),
  HTTP_SERVER_TIMEOUT_MS: z.coerce.number().int().min(1).default(30_000),

  // Optional: trigger storefront revalidation after CMS/admin updates
  STOREFRONT_REVALIDATE_URL: OptionalUrl,
  STOREFRONT_REVALIDATE_SECRET: z.string().optional(),

  // Email (Resend). Without RESEND_API_KEY + EMAIL_FROM emails are only logged.
  RESEND_API_KEY: z.string().optional(),
  /** e.g. "استبرق <hello@your-domain.com>" (the domain must be verified in Resend). */
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),
  /** Admin site address, used in invite / password links, e.g. https://estabrek-store.pages.dev */
  ADMIN_APP_URL: OptionalUrl,
  /** Storefront address, used in customer emails, e.g. https://estabrek-store.vercel.app */
  STOREFRONT_URL: OptionalUrl,

  // Backups (admin → النسخ الاحتياطي). The files are encrypted with this key; keep a copy of it
  // somewhere safe — without it a backup can't be opened. Unset: a key made from JWT_SECRET.
  BACKUP_ENCRYPTION_KEY: z.string().min(16).optional(),
  /** How many backups to keep in storage (older ones are removed). */
  BACKUP_KEEP: z.coerce.number().int().min(1).max(365).default(14),
  /** Hour of the day (Israel time) for the automatic backup. */
  BACKUP_HOUR: z.coerce.number().int().min(0).max(23).default(3),
  /** Largest file the storage takes (Cloudinary free plan: 10 MB for raw files). */
  BACKUP_MAX_UPLOAD_MB: z.coerce.number().min(1).max(500).default(10),

  // Digital products (files the shopper downloads after paying / acceptance).
  /** How many times one order can download each file. */
  DIGITAL_MAX_DOWNLOADS: z.coerce.number().int().min(1).max(1000).default(10),
  /** Largest file uploaded to storage (Cloudinary free plan: 10 MB); bigger files go in as a link. */
  DIGITAL_MAX_UPLOAD_MB: z.coerce.number().min(1).max(500).default(10),

  // Redis (optional)
  REDIS_URL: z.string().optional(),
  REDIS_KEY_PREFIX: z.string().default("estabrak"),

  // Antivirus scanning (optional)
  AV_SCAN_ENABLED: Boolish,
  AV_SCAN_CMD: z.string().optional(),
  AV_SCAN_ARGS: z.string().optional(),
  AV_SCAN_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(15_000),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const [key, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  - ${key}: ${msgs?.join(", ")}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type AppEnv = z.infer<typeof EnvSchema>;

/** Parsed CORS origins ready for `cors({ origin })` */
export const corsOrigins = parseOrigins(env.CORS_ORIGINS);
