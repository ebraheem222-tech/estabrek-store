-- The data grid: a deleted row waits in the trash (deletedAt) before it goes for good.
-- AlterTable
ALTER TABLE "CollectionItem" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollectionItem_collectionId_deletedAt_createdAt_idx" ON "CollectionItem"("collectionId", "deletedAt", "createdAt");
