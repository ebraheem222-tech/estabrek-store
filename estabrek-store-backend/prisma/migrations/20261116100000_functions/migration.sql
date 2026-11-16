-- Functions (F1): logic the owner builds from steps. `draft` is what is being edited; `live` is
-- what runs, changed only by publishing.
-- CreateTable
CREATE TABLE IF NOT EXISTS "Fn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "draft" JSONB NOT NULL,
    "live" JSONB,
    "publishedAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Fn_createdAt_idx" ON "Fn"("createdAt");
