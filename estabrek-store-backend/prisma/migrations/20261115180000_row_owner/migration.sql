-- A row's owner (B4): the shopper who added it through the API. A table open "to the shopper"
-- shows each one their own rows only. Rows there already have no owner, as before.
-- AlterTable
ALTER TABLE "CollectionItem" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollectionItem_collectionId_ownerId_idx" ON "CollectionItem"("collectionId", "ownerId");

-- AddForeignKey (asked again after a half-run migration: already there is fine). A shopper's account
-- deleted leaves the rows, ownerless.
DO $$ BEGIN
  ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
