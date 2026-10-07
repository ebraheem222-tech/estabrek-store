-- Backups (2026-10-13): one row per backup (daily automatic or by hand) and the
-- on/off switch for the daily one. Every statement is guarded.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BackupStatus') THEN
    CREATE TYPE "BackupStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');
  END IF;
END $$;

ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "backupsEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "BackupRun" (
    "id" TEXT NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'RUNNING',
    "trigger" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "sizeBytes" INTEGER,
    "tables" INTEGER,
    "rows" INTEGER,
    "counts" JSONB,
    "storage" TEXT,
    "location" TEXT,
    "fileName" TEXT,
    "error" TEXT,
    "adminUserId" TEXT,

    CONSTRAINT "BackupRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BackupRun_status_startedAt_idx" ON "BackupRun"("status", "startedAt");
