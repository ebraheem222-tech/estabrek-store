/**
 * The database's updates this server's code has and the database hasn't run (admin → الاستضافة). A client's
 * copy made by hand had no step that runs them before its server starts, so the tables added since its first
 * day were missing and their pages answered 500 (نسخ الزباين, المشروع كملف, pictures kept without Cloudinary).
 * Read from the migrations folder the server was built with and Prisma's own record of what ran; null when
 * either can't be read.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { prisma } from "./prisma.js";

export function migrationNames(dir = path.resolve(process.cwd(), "prisma/migrations")): string[] | null {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d{14}_[\w-]+$/.test(d.name))
      .map((d) => d.name)
      .sort();
  } catch {
    return null;
  }
}

export async function pendingMigrations(dir?: string): Promise<string[] | null> {
  const all = migrationNames(dir);
  if (!all) return null;
  try {
    const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`;
    const done = new Set(rows.map((r) => r.migration_name));
    return all.filter((name) => !done.has(name));
  } catch {
    return null;
  }
}
