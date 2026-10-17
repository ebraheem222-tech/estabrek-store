-- Performance settings (2026-10-20): the cache layers, TTLs, eviction rules and memory,
-- set from the admin (Performance page), with the latest 30 versions. Guarded.

CREATE TABLE IF NOT EXISTS "PerformanceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PerformanceSettingsRevision" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "changed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceSettingsRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PerformanceSettingsRevision_createdAt_idx" ON "PerformanceSettingsRevision"("createdAt");
