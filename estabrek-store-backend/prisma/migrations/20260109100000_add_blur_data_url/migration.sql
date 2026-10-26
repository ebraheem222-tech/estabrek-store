-- Add blurDataUrl placeholder to MediaAsset and ProductItemImage

ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "blurDataUrl" TEXT;
ALTER TABLE "ProductItemImage" ADD COLUMN IF NOT EXISTS "blurDataUrl" TEXT;
