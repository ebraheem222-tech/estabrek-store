import { PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { getRequestMetrics } from "./requestMetrics.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

client.$use(async (params, next) => {
  const start = performance.now();
  const result = await next(params);
  const duration = performance.now() - start;
  const metrics = getRequestMetrics();
  if (metrics) {
    metrics.dbMs += duration;
    metrics.dbCount += 1;
  }
  return result;
});

// Hardening: disable Prisma *Unsafe raw methods* to reduce accidental SQL injection
// (use prisma.$queryRaw / prisma.$executeRaw with tagged templates instead)
(client as any).$queryRawUnsafe = undefined;
(client as any).$executeRawUnsafe = undefined;

export const prisma = client;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
