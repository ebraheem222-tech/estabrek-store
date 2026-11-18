-- Files from shoppers (stage 2, item 4): each file uploaded into a picture or file field of the owner's tables
-- (src/lib/shopperFiles.ts).
-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "ownerId" TEXT,
    "location" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoredFile_collectionId_field_idx" ON "StoredFile"("collectionId", "field");

-- CreateIndex
CREATE INDEX "StoredFile_createdAt_idx" ON "StoredFile"("createdAt");
