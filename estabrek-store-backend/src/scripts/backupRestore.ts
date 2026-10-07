/**
 * Puts a backup back into the database (admin → النسخ الاحتياطي explains when).
 *
 *   npm run backup:restore -- <file.estbk>           shows what's inside (changes nothing)
 *   npm run backup:restore -- <file.estbk> --yes     replaces the data with the backup
 *   npm run backup:restore -- --latest [--yes]       the newest stored backup (Cloudinary)
 *
 * Run it on the server (Railway → the service → shell) or anywhere with the
 * production DATABASE_URL and the same BACKUP_ENCRYPTION_KEY (or JWT_SECRET)
 * the backup was made with. Before replacing anything it saves the current data
 * to before-restore-<time>.estbk next to you, so a restore can be undone.
 */
import dotenv from "dotenv";
dotenv.config();

import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../lib/prisma.js";
import { packBackup, unpackBackup } from "../modules/backups/backupFile.js";
import { countRows, dumpDatabase, restoreDatabase } from "../modules/backups/backupDb.js";
import { backupStorage } from "../modules/backups/backup.service.js";

async function load(arg: string | undefined): Promise<Buffer> {
  if (arg && arg !== "--latest") return readFileSync(arg);
  const last = await prisma.backupRun.findFirst({ where: { status: "SUCCEEDED", location: { not: null } }, orderBy: { startedAt: "desc" } });
  if (!last?.location) throw new Error("No stored backup found");
  console.log(`Downloading ${last.fileName} (${last.startedAt.toISOString()})…`);
  const res = await fetch(await backupStorage().link(last.location));
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const args = process.argv.slice(2);
  const yes = args.includes("--yes");
  const source = args.find((a) => a !== "--yes");
  if (!source) {
    console.error("Usage: npm run backup:restore -- <file.estbk | --latest> [--yes]");
    process.exit(1);
  }
  const data = unpackBackup(await load(source));
  const { counts, tables, rows } = countRows(data);
  console.log(`Backup from ${data.createdAt} (migration ${data.migration ?? "?"}): ${tables} tables, ${rows} rows.`);
  for (const [t, n] of Object.entries(counts).sort()) if (n) console.log(`  ${t}: ${n}`);
  if (!yes) {
    console.log("\nNothing changed. Add --yes to replace the database with this backup.");
    return;
  }
  const safety = `before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.estbk`;
  writeFileSync(safety, packBackup(await dumpDatabase()));
  console.log(`\nSaved the current data to ${safety} (to undo: restore that file).`);
  const report = await restoreDatabase(data);
  console.log(`Restored ${report.rows} rows in ${report.tables} tables.${report.skipped.length ? ` Skipped (not in this database): ${report.skipped.join(", ")}` : ""}`);
}

main()
  .catch((e) => {
    console.error("Restore failed:", (e as Error)?.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
