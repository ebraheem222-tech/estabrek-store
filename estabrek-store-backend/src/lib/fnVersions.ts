/**
 * A function's versions (admin → الـ Functions → النسخ). Every publish is kept as a version with
 * a number of its own (1, 2, 3…) and is never changed after that. The function runs its newest
 * version; a run that was asked for through the queue runs the version that was published when it
 * was asked for, whatever was published since. An older version can be published again (which
 * makes a new version with the old steps, so the history only ever grows) or taken back into the
 * draft to work on.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { defOf, sizeOf, type FnDef } from "./fnDef.js";

export const VERSION_LIMITS = {
  /** Versions kept for one function: the oldest go when there are more. */
  kept: 50,
} as const;

export type VersionLine = { n: number; at: Date; by: string | null; /** The version these steps were published as before, when this one brought them back. */ back: number | null; steps: number; inputs: number };

const backOf = (from: string | null): number | null => {
  const m = /^back:(\d+)$/.exec(from ?? "");
  return m ? Number(m[1]) : null;
};

/**
 * These steps published: a new version, and what the function runs from now on. Two publishes at
 * once can't take the same number (the second one tries again with the next).
 */
export async function publishVersion(fnId: string, def: FnDef, by: string | null, back?: number): Promise<{ n: number }> {
  const json = def as unknown as Prisma.InputJsonValue;
  for (let tries = 0; ; tries++) {
    const last = await prisma.fnVersion.findFirst({ where: { fnId }, orderBy: { n: "desc" }, select: { n: true } });
    const n = (last?.n ?? 0) + 1;
    try {
      await prisma.$transaction([
        prisma.fnVersion.create({ data: { fnId, n, def: json, from: back ? `back:${back}` : null, byEmail: by } }),
        prisma.fn.update({ where: { id: fnId }, data: { live: json, version: n, publishedAt: new Date() } }),
        prisma.fnVersion.deleteMany({ where: { fnId, n: { lte: n - VERSION_LIMITS.kept } } }),
      ]);
      return { n };
    } catch (e) {
      const taken = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!taken || tries >= 3) throw e;
    }
  }
}

/** A version's steps, as they were published (null: no such version, or it was written by a server that knew other steps). */
export async function versionDef(fnId: string, n: number): Promise<FnDef | null> {
  if (!Number.isInteger(n) || n < 1) return null;
  const row = await prisma.fnVersion.findUnique({ where: { fnId_n: { fnId, n } }, select: { def: true } });
  return row ? defOf(row.def) : null;
}

/** The versions kept, newest first: when, by whom, and how big. */
export async function versionsOf(fnId: string): Promise<VersionLine[]> {
  const rows = await prisma.fnVersion.findMany({ where: { fnId }, orderBy: { n: "desc" }, take: VERSION_LIMITS.kept });
  return rows.map((v) => {
    const def = defOf(v.def);
    return { n: v.n, at: v.createdAt, by: v.byEmail, back: backOf(v.from), steps: def ? sizeOf(def.do).steps + sizeOf(def.else).steps : 0, inputs: def?.inputs.length ?? 0 };
  });
}
