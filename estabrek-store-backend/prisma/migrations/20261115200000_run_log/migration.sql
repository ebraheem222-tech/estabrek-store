-- The run log (E0.2): every time the server did something on its own (a job's run, an
-- automation's action, a webhook taken in), kept through restarts.
-- CreateTable
CREATE TABLE IF NOT EXISTS "Run" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ref" TEXT,
    "trigger" TEXT,
    "subject" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastAt" TIMESTAMP(3),
    "times" INTEGER NOT NULL DEFAULT 1,
    "ms" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL,
    "result" JSONB,
    "error" TEXT,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Run_startedAt_idx" ON "Run"("startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Run_kind_name_startedAt_idx" ON "Run"("kind", "name", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Run_ok_startedAt_idx" ON "Run"("ok", "startedAt");
