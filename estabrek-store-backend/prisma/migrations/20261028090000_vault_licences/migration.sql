-- Protected products, phases 3-4 (2026-10-28): masters can live in the vault,
-- PCs per serial, activations (the Windows launcher) and launcher releases. Guarded.

ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'VAULT_SESSION_OPENED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'VAULT_SESSION_DENIED';

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "licenceDevices" INTEGER;

ALTER TABLE "ProtectedFile" ALTER COLUMN "dataEnc" DROP NOT NULL;
ALTER TABLE "ProtectedFile" ADD COLUMN IF NOT EXISTS "vaultFileId" TEXT;

CREATE TABLE IF NOT EXISTS "Activation" (
    "id" TEXT NOT NULL,
    "licenceId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "deviceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "appVersion" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetAt" TIMESTAMP(3),
    CONSTRAINT "Activation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Activation_licenceId_deviceHash_key" ON "Activation"("licenceId", "deviceHash");
CREATE INDEX IF NOT EXISTS "Activation_licenceId_status_idx" ON "Activation"("licenceId", "status");
DO $$ BEGIN
  ALTER TABLE "Activation" ADD CONSTRAINT "Activation_licenceId_fkey" FOREIGN KEY ("licenceId") REFERENCES "Licence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LauncherRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LauncherRelease_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LauncherRelease_isActive_createdAt_idx" ON "LauncherRelease"("isActive", "createdAt");
