-- Product popularity (2026-10-21): a fading score per product from views, wishlists,
-- bags and purchases (no shopper data), and counts per day for the admin's charts.
-- The cache keeps popular products longer (lib/popularity.ts). Guarded.

CREATE TABLE IF NOT EXISTS "ProductPopularity" (
    "productId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL DEFAULT 0,
    "wishlists" INTEGER NOT NULL DEFAULT 0,
    "bags" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "lastSignalAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPopularity_pkey" PRIMARY KEY ("productId")
);

CREATE TABLE IF NOT EXISTS "ProductPopularityDay" (
    "day" DATE NOT NULL,
    "productId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "wishlists" INTEGER NOT NULL DEFAULT 0,
    "bags" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductPopularityDay_pkey" PRIMARY KEY ("day","productId")
);

CREATE INDEX IF NOT EXISTS "ProductPopularity_score_idx" ON "ProductPopularity"("score");
CREATE INDEX IF NOT EXISTS "ProductPopularityDay_productId_day_idx" ON "ProductPopularityDay"("productId", "day");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductPopularity_productId_fkey') THEN
    ALTER TABLE "ProductPopularity" ADD CONSTRAINT "ProductPopularity_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductPopularityDay_productId_fkey') THEN
    ALTER TABLE "ProductPopularityDay" ADD CONSTRAINT "ProductPopularityDay_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
