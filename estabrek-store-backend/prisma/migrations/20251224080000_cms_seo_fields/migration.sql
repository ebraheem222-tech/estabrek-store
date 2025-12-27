-- AlterTable
ALTER TABLE "Page" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "Page" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "Page" ADD COLUMN "ogImageUrl" TEXT;
ALTER TABLE "Page" ADD COLUMN "robotsNoIndex" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Page" ADD COLUMN "robotsNoFollow" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Page" ADD COLUMN "jsonLd" JSONB;

-- AlterTable
ALTER TABLE "PageSection" ADD COLUMN "anchorId" TEXT;
ALTER TABLE "PageSection" ADD COLUMN "ariaLabel" TEXT;
