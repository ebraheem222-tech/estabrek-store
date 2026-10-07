/**
 * Reading the whole database into a backup, and putting a backup back.
 * Works on any version of the schema: tables and columns are read from
 * Postgres itself, and a restore only fills the columns both sides have.
 */
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../lib/prisma.js";
import type { BackupData } from "./backupFile.js";

/** Short-lived or secret-only tables: not worth keeping (everyone just signs in again after a restore). */
export const SKIPPED_TABLES = new Set([
  "_prisma_migrations",
  "AdminSession",
  "AdminPasswordReset",
  "AdminOtpChallenge",
  "AdminEmailChange",
  "CustomerOtp",
  "CustomerSession",
]);

type Db = Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe">;

const q = (name: string) => `"${name.replace(/"/g, '""')}"`;

async function tableNames(db: Db): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT table_name::text AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  return rows.map((r) => r.name);
}

async function lastMigration(db: Db): Promise<string | null> {
  try {
    const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT migration_name::text AS name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1`,
    );
    return rows[0]?.name ?? null;
  } catch {
    return null;
  }
}

export async function dumpDatabase(db: Db = defaultPrisma): Promise<BackupData> {
  const tables: BackupData["tables"] = {};
  for (const name of await tableNames(db)) {
    if (SKIPPED_TABLES.has(name)) continue;
    const res = await db.$queryRawUnsafe<Array<{ rows: unknown }>>(`SELECT coalesce(json_agg(t), '[]'::json) AS rows FROM ${q(name)} t`);
    const rows = res[0]?.rows;
    tables[name] = (typeof rows === "string" ? JSON.parse(rows) : rows) as Array<Record<string, unknown>>;
  }
  return { format: "estabrek-backup", version: 1, createdAt: new Date().toISOString(), migration: await lastMigration(db), tables };
}

export function countRows(data: BackupData) {
  const counts: Record<string, number> = {};
  for (const [t, rows] of Object.entries(data.tables)) counts[t] = rows.length;
  return { counts, tables: Object.keys(counts).length, rows: Object.values(counts).reduce((a, b) => a + b, 0) };
}

type ForeignKey = { child: string; childColumn: string; parent: string; parentColumn: string };

async function foreignKeys(db: Db): Promise<ForeignKey[]> {
  return db.$queryRawUnsafe<ForeignKey[]>(`
    SELECT tc.relname::text AS child, ca.attname::text AS "childColumn", tp.relname::text AS parent, pa.attname::text AS "parentColumn"
    FROM pg_constraint c
    JOIN pg_class tc ON tc.oid = c.conrelid
    JOIN pg_class tp ON tp.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = tc.relnamespace AND n.nspname = 'public'
    JOIN pg_attribute ca ON ca.attrelid = c.conrelid AND ca.attnum = c.conkey[1]
    JOIN pg_attribute pa ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f'`);
}

async function columnsOf(db: Db, table: string): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT column_name::text AS name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    table,
  );
  return rows.map((r) => r.name);
}

/** Parents before children (self-references are handled per row). */
export function insertOrder(tables: string[], fks: ForeignKey[]): string[] {
  const set = new Set(tables);
  const deps = new Map(tables.map((t) => [t, new Set<string>()]));
  for (const fk of fks) if (fk.child !== fk.parent && set.has(fk.child) && set.has(fk.parent)) deps.get(fk.child)!.add(fk.parent);
  const out: string[] = [];
  const state = new Map<string, "visiting" | "done">();
  const visit = (t: string) => {
    if (state.get(t) === "done" || state.get(t) === "visiting") return; // a cycle: keep going, best effort
    state.set(t, "visiting");
    for (const p of [...deps.get(t)!].sort()) visit(p);
    state.set(t, "done");
    out.push(t);
  };
  for (const t of [...tables].sort()) visit(t);
  return out;
}

/** Rows of a table that points at itself (e.g. sub-categories): parents first. */
export function parentsFirst(rows: Array<Record<string, unknown>>, column: string, key = "id") {
  const byId = new Map(rows.map((r) => [String(r[key]), r]));
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  const add = (r: Record<string, unknown>, depth = 0) => {
    const id = String(r[key]);
    if (seen.has(id) || depth > 1000) return;
    const parentId = r[column];
    if (parentId != null && byId.has(String(parentId)) && String(parentId) !== id) add(byId.get(String(parentId))!, depth + 1);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(r);
    }
  };
  for (const r of rows) add(r);
  return out;
}

export type RestoreReport = { tables: number; rows: number; skipped: string[]; counts: Record<string, number> };

/**
 * Replaces the data of every table in the backup with the backup's rows, in
 * one transaction (all or nothing). Tables the backup doesn't have are left
 * alone, except rows removed because they pointed at replaced rows.
 */
export async function restoreDatabase(data: BackupData, db: PrismaClient = defaultPrisma): Promise<RestoreReport> {
  const current = new Set(await tableNames(db));
  const wanted = Object.keys(data.tables).filter((t) => current.has(t) && !SKIPPED_TABLES.has(t));
  const skipped = Object.keys(data.tables).filter((t) => !wanted.includes(t));
  const fks = await foreignKeys(db);
  const order = insertOrder(wanted, fks);
  const columns = new Map<string, string[]>();
  for (const t of order) columns.set(t, await columnsOf(db, t));

  const counts: Record<string, number> = {};
  await db.$transaction(
    async (tx) => {
      if (order.length) await tx.$executeRawUnsafe(`TRUNCATE ${order.map(q).join(", ")} CASCADE`);
      for (const t of order) {
        let rows = data.tables[t] ?? [];
        if (!rows.length) {
          counts[t] = 0;
          continue;
        }
        const cols = (columns.get(t) ?? []).filter((c) => c in rows[0]);
        const self = fks.find((fk) => fk.child === t && fk.parent === t);
        if (self) rows = parentsFirst(rows, self.childColumn, self.parentColumn);
        const list = cols.map(q).join(", ");
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          await tx.$executeRawUnsafe(`INSERT INTO ${q(t)} (${list}) SELECT ${list} FROM json_populate_recordset(NULL::${q(t)}, $1::json)`, JSON.stringify(chunk));
        }
        counts[t] = rows.length;
      }
    },
    { timeout: 10 * 60_000, maxWait: 30_000 },
  );
  return { tables: order.length, rows: Object.values(counts).reduce((a, b) => a + b, 0), skipped, counts };
}
