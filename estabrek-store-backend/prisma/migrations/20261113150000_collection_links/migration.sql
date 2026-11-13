-- Relations between tables (B3): one table of links, read both ways. A row deleted for good takes
-- its links with it, whichever end of them it is.
-- CreateTable
CREATE TABLE IF NOT EXISTS "CollectionLink" (
    "collectionId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toTable" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionLink_pkey" PRIMARY KEY ("collectionId","fieldId","fromId","toId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollectionLink_toId_collectionId_fieldId_idx" ON "CollectionLink"("toId", "collectionId", "fieldId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollectionLink_fromId_idx" ON "CollectionLink"("fromId");

-- AddForeignKey (asked again after a half-run migration: already there is fine)
DO $$ BEGIN
  ALTER TABLE "CollectionLink" ADD CONSTRAINT "CollectionLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "CollectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CollectionLink" ADD CONSTRAINT "CollectionLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "CollectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
