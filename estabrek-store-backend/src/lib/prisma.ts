import { Prisma, PrismaClient } from "@prisma/client";
import { getRequestMetrics } from "./requestMetrics.js";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient<Prisma.PrismaClientOptions, "query">;
};

const logConfig: Prisma.PrismaClientOptions["log"] =
  process.env.NODE_ENV === "development"
    ? [{ emit: "event", level: "query" }, "error", "warn"]
    : [{ emit: "event", level: "query" }, "error", "warn"];

const client =
  globalForPrisma.prisma ??
  new PrismaClient<Prisma.PrismaClientOptions, "query">({
    log: logConfig,
  });

client.$on("query", (e: Prisma.QueryEvent) => {
  const metrics = getRequestMetrics();
  if (!metrics) return;
  metrics.dbMs += e.duration ?? 0;
  metrics.dbCount += 1;
});

// Hardening: disable Prisma *Unsafe raw methods* to reduce accidental SQL injection
// (use prisma.$queryRaw / prisma.$executeRaw with tagged templates instead)
(client as any).$queryRawUnsafe = undefined;
(client as any).$executeRawUnsafe = undefined;

export const prisma = client;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
