-- Feature 6: Stock/Alerts (lowStockThreshold per variant) + InventoryAdjustment log

ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "InventoryAdjustment" (
  "id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "beforeStock" INTEGER NOT NULL,
  "afterStock" INTEGER NOT NULL,
  "reason" TEXT,
  "adminUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryAdjustment_variantId_idx" ON "InventoryAdjustment"("variantId");
CREATE INDEX IF NOT EXISTS "InventoryAdjustment_adminUserId_idx" ON "InventoryAdjustment"("adminUserId");
CREATE INDEX IF NOT EXISTS "InventoryAdjustment_createdAt_idx" ON "InventoryAdjustment"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryAdjustment_variantId_fkey'
  ) THEN
    ALTER TABLE "InventoryAdjustment"
      ADD CONSTRAINT "InventoryAdjustment_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryAdjustment_adminUserId_fkey'
  ) THEN
    ALTER TABLE "InventoryAdjustment"
      ADD CONSTRAINT "InventoryAdjustment_adminUserId_fkey"
      FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
