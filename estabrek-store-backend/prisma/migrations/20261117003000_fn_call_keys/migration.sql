-- A call that isn't run twice (lib/fnCallKeys.ts): a caller names its request with an
-- Idempotency-Key header; the same key again, from the same caller at the same address, is
-- answered with what the first call was answered. A key is remembered for a day.
CREATE TABLE IF NOT EXISTS "FnCallKey" (
    "id" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "asked" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'running',
    "status" INTEGER,
    "answer" JSONB,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FnCallKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FnCallKey_triggerId_who_key_key" ON "FnCallKey"("triggerId", "who", "key");
CREATE INDEX IF NOT EXISTS "FnCallKey_createdAt_idx" ON "FnCallKey"("createdAt");
