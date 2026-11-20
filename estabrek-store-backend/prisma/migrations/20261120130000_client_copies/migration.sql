-- A client's copy of the store being made, or made (stage 6.1: src/lib/pressMake.ts).
-- CreateTable
CREATE TABLE "ClientCopy" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "via" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'making',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "made" JSONB NOT NULL DEFAULT '{}',
    "sealed" TEXT NOT NULL,
    "byEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCopy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientCopy_server_key" ON "ClientCopy"("server");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCopy_site_key" ON "ClientCopy"("site");

-- CreateIndex
CREATE INDEX "ClientCopy_createdAt_idx" ON "ClientCopy"("createdAt");
