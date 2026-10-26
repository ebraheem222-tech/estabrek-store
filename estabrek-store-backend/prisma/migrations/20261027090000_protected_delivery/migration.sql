-- Protected digital products, phase 2 (2026-10-27): master files kept encrypted,
-- the owner's file types, serials sold one per piece and their downloads. Guarded.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isProtected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "licenceHours" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "licenceDownloads" INTEGER;

CREATE TABLE IF NOT EXISTS "ProtectedFile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "dataEnc" BYTEA NOT NULL,
    "probe" JSONB NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProtectedFile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProtectedFile_productId_position_idx" ON "ProtectedFile"("productId", "position");
DO $$ BEGIN
  ALTER TABLE "ProtectedFile" ADD CONSTRAINT "ProtectedFile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ProtectedFileType" (
    "ext" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "commentStart" TEXT,
    "commentEnd" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProtectedFileType_pkey" PRIMARY KEY ("ext")
);

CREATE TABLE IF NOT EXISTS "Licence" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "serialEnc" TEXT NOT NULL,
    "serialHash" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "markId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "revokedReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxDownloads" INTEGER NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Licence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Licence_serialHash_key" ON "Licence"("serialHash");
CREATE UNIQUE INDEX IF NOT EXISTS "Licence_markId_key" ON "Licence"("markId");
CREATE INDEX IF NOT EXISTS "Licence_orderRequestId_idx" ON "Licence"("orderRequestId");
CREATE INDEX IF NOT EXISTS "Licence_productId_status_idx" ON "Licence"("productId", "status");
DO $$ BEGIN
  ALTER TABLE "Licence" ADD CONSTRAINT "Licence_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Licence" ADD CONSTRAINT "Licence_orderRequestId_fkey" FOREIGN KEY ("orderRequestId") REFERENCES "OrderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LicenceDownload" (
    "id" TEXT NOT NULL,
    "licenceId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "LicenceDownload_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LicenceDownload_licenceId_at_idx" ON "LicenceDownload"("licenceId", "at");
DO $$ BEGIN
  ALTER TABLE "LicenceDownload" ADD CONSTRAINT "LicenceDownload_licenceId_fkey" FOREIGN KEY ("licenceId") REFERENCES "Licence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
