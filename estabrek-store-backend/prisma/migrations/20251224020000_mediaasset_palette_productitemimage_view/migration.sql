-- Add color metadata to MediaAsset and ProductItemImage + optional image view role

ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "dominantColorHex" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "palette" JSONB;

ALTER TABLE "ProductItemImage" ADD COLUMN IF NOT EXISTS "view" TEXT;
ALTER TABLE "ProductItemImage" ADD COLUMN IF NOT EXISTS "dominantColorHex" TEXT;
ALTER TABLE "ProductItemImage" ADD COLUMN IF NOT EXISTS "palette" JSONB;
