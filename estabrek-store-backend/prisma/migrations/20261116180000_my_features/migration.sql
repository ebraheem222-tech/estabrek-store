-- A feature the owner built (M): a name over tables, functions and pages made in the studio,
-- to find them together and switch them off together.
-- CreateTable
CREATE TABLE IF NOT EXISTS "Feature" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FeatureItem" (
    "featureId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureItem_pkey" PRIMARY KEY ("kind","refId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Feature_createdAt_idx" ON "Feature"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeatureItem_featureId_idx" ON "FeatureItem"("featureId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "FeatureItem" ADD CONSTRAINT "FeatureItem_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
