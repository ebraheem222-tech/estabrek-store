-- The backend studio's versions: a table's fields before each change (functions and endpoints later).
-- CreateTable
CREATE TABLE IF NOT EXISTS "StudioRevision" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudioRevision_kind_objectId_createdAt_idx" ON "StudioRevision"("kind", "objectId", "createdAt");
