-- Add perceptual hash fields for image deduplication
ALTER TABLE "MediaAsset" ADD COLUMN "imageHash" TEXT;
ALTER TABLE "ProductItemImage" ADD COLUMN "imageHash" TEXT;

CREATE INDEX "MediaAsset_imageHash_idx" ON "MediaAsset" ("imageHash");
