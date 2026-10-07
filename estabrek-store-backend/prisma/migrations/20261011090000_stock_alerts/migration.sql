-- Back-in-stock alerts (2026-10-11): a shopper leaves her email on a sold-out
-- size and gets one email when it is back. Switched on from the admin
-- (المخزون → تنبيهات التوفّر); off by default.
-- Every statement is guarded, so it is safe on a database that already has them.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockAlertStatus') THEN
    CREATE TYPE "StockAlertStatus" AS ENUM ('WAITING', 'SENT', 'CANCELLED', 'FAILED');
  END IF;
END $$;

ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "stockAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "StockAlert" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "StockAlertStatus" NOT NULL DEFAULT 'WAITING',
    "token" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StockAlert_token_key" ON "StockAlert"("token");
CREATE INDEX IF NOT EXISTS "StockAlert_status_variantId_idx" ON "StockAlert"("status", "variantId");
CREATE INDEX IF NOT EXISTS "StockAlert_productId_idx" ON "StockAlert"("productId");
CREATE INDEX IF NOT EXISTS "StockAlert_ip_createdAt_idx" ON "StockAlert"("ip", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "StockAlert_email_variantId_key" ON "StockAlert"("email", "variantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockAlert_variantId_fkey') THEN
    ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockAlert_productId_fkey') THEN
    ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
