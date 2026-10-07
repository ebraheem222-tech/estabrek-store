-- AI features (2026-10-19): saved answers and daily usage per feature. Guarded.

CREATE TABLE IF NOT EXISTS "AiCache" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCache_pkey" PRIMARY KEY ("key")
);
CREATE INDEX IF NOT EXISTS "AiCache_expiresAt_idx" ON "AiCache"("expiresAt");

CREATE TABLE IF NOT EXISTS "AiUsage" (
    "day" DATE NOT NULL,
    "feature" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("day", "feature")
);
