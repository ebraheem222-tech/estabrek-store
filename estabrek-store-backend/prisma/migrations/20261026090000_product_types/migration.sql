-- Product types, phase 1 (2026-10-26): delivery ("ships from", days) on products
-- and their types, how to use a code, and codes sold one per piece. Guarded.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shipsFrom" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deliveryMinDays" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deliveryMaxDays" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "redeemNote" TEXT;

ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "shipsFrom" TEXT;
ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "deliveryMinDays" INTEGER;
ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "deliveryMaxDays" INTEGER;

CREATE TABLE IF NOT EXISTS "DigitalCode" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "codeEnc" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "orderRequestId" TEXT,
    "orderItemId" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "batch" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigitalCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalCode_codeHash_key" ON "DigitalCode"("codeHash");
CREATE INDEX IF NOT EXISTS "DigitalCode_variantId_status_idx" ON "DigitalCode"("variantId", "status");
CREATE INDEX IF NOT EXISTS "DigitalCode_productId_status_idx" ON "DigitalCode"("productId", "status");
CREATE INDEX IF NOT EXISTS "DigitalCode_orderRequestId_idx" ON "DigitalCode"("orderRequestId");

DO $$ BEGIN
  ALTER TABLE "DigitalCode" ADD CONSTRAINT "DigitalCode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DigitalCode" ADD CONSTRAINT "DigitalCode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
