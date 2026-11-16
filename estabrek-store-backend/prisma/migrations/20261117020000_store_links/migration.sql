-- A relation's links to the store's own rows (lib/storeLinks.ts): a row of one of the owner's
-- tables links a product, a category, an order or a customer by its id. The store's tables are
-- never written from here; a store row that is deleted simply stops showing.
CREATE TABLE IF NOT EXISTS "StoreLink" (
    "collectionId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toTable" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreLink_pkey" PRIMARY KEY ("collectionId", "fieldId", "fromId", "toId")
);

CREATE INDEX IF NOT EXISTS "StoreLink_toTable_toId_idx" ON "StoreLink"("toTable", "toId");
CREATE INDEX IF NOT EXISTS "StoreLink_fromId_idx" ON "StoreLink"("fromId");

DO $$ BEGIN
    ALTER TABLE "StoreLink" ADD CONSTRAINT "StoreLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "CollectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
