-- Smart selling (2026-10-24), admin → البيع الذكي: the settings document (forecast
-- numbers, sale rules), price changes kept for undo, skipped suggestions, seasons, A/B tests. Guarded.

CREATE TABLE IF NOT EXISTS "SellingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellingSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PriceAction" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rule" TEXT,
    "campaignId" TEXT,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoneAt" TIMESTAMP(3),

    CONSTRAINT "PriceAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PriceAction_createdAt_idx" ON "PriceAction"("createdAt");
CREATE INDEX IF NOT EXISTS "PriceAction_productId_createdAt_idx" ON "PriceAction"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "PriceAction_campaignId_idx" ON "PriceAction"("campaignId");

CREATE TABLE IF NOT EXISTS "SaleSuggestionSkip" (
    "rule" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "until" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleSuggestionSkip_pkey" PRIMARY KEY ("rule","productId")
);

CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "themePresetId" TEXT,
    "themeBefore" TEXT,
    "percentOff" INTEGER,
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "log" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Campaign_status_startsAt_idx" ON "Campaign"("status", "startsAt");

CREATE TABLE IF NOT EXISTS "Experiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "field" TEXT,
    "a" JSONB NOT NULL,
    "b" JSONB NOT NULL,
    "split" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "winner" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Experiment_status_idx" ON "Experiment"("status");

CREATE TABLE IF NOT EXISTS "ExperimentDay" (
    "experimentId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "variant" TEXT NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "bags" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ExperimentDay_pkey" PRIMARY KEY ("experimentId","day","variant")
);

DO $$ BEGIN
  ALTER TABLE "ExperimentDay" ADD CONSTRAINT "ExperimentDay_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
