import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Hardening: disable Prisma *Unsafe raw methods* to reduce accidental SQL injection
// (use prisma.$queryRaw / prisma.$executeRaw with tagged templates instead)
(client as any).$queryRawUnsafe = undefined;
(client as any).$executeRawUnsafe = undefined;

export const prisma = client;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
