-- The queue (E0.3): background work that must not be lost. A task is a row until it is done, so a
-- restart in the middle doesn't drop it; a failure is tried again after a growing wait; one that
-- keeps failing is set aside for the owner to look at.
-- CreateTable
CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Task_key_key" ON "Task"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_status_runAt_idx" ON "Task"("status", "runAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_createdAt_idx" ON "Task"("createdAt");
