-- Razan (the storefront guide): daily counts for the admin report (2026-10-16).
-- Her settings live in SiteSettings.header.razan (no column needed). Guarded.

CREATE TABLE IF NOT EXISTS "RazanStat" (
    "day" DATE NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RazanStat_pkey" PRIMARY KEY ("day","key")
);
