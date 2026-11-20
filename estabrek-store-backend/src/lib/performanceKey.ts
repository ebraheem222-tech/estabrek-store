/**
 * One part of the shared PerformanceSettings document written alone, in one statement: the store's
 * Cloudinary account (lib/cloudinaryAccount.ts), its own shop (lib/shopLink.ts) and the speed
 * settings' parts (lib/performanceSettings.ts) live side by side in it. Each used to read the whole
 * document and write it back, so two saves at once (the setup's pictures step while its shop was
 * being made) could put back the other's old part. Postgres merges the part in (`||`) or takes it
 * out (`-`) itself.
 */
import { prisma } from "./prisma.js";

/** These parts set (each key replaced whole), the rest of the document as it is; made if missing. */
export function mergePerformance(parts: Record<string, unknown>, updatedById?: string | null) {
  const json = JSON.stringify(parts);
  return updatedById === undefined
    ? prisma.$executeRaw`INSERT INTO "PerformanceSettings" ("id", "data", "updatedAt") VALUES ('default', ${json}::jsonb, now())
        ON CONFLICT ("id") DO UPDATE SET "data" = COALESCE("PerformanceSettings"."data", '{}'::jsonb) || ${json}::jsonb, "updatedAt" = now()`
    : prisma.$executeRaw`INSERT INTO "PerformanceSettings" ("id", "data", "updatedById", "updatedAt") VALUES ('default', ${json}::jsonb, ${updatedById}, now())
        ON CONFLICT ("id") DO UPDATE SET "data" = COALESCE("PerformanceSettings"."data", '{}'::jsonb) || ${json}::jsonb, "updatedById" = ${updatedById}, "updatedAt" = now()`;
}

/** One part taken out, the rest as it is. */
export function dropPerformance(key: string) {
  return prisma.$executeRaw`UPDATE "PerformanceSettings" SET "data" = "data" - ${key}::text, "updatedAt" = now() WHERE "id" = 'default'`;
}
