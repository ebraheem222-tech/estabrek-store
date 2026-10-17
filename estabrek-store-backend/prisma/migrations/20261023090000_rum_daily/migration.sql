-- Real shoppers' speed (2026-10-23): per store day, page kind, device and system,
-- how many visits fell in each time or fps bucket, per measure (lib/rum.ts). Guarded.

CREATE TABLE IF NOT EXISTS "RumDaily" (
    "day" DATE NOT NULL,
    "page" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "sum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "buckets" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "RumDaily_pkey" PRIMARY KEY ("day","page","device","os","metric")
);

CREATE INDEX IF NOT EXISTS "RumDaily_day_idx" ON "RumDaily"("day");
