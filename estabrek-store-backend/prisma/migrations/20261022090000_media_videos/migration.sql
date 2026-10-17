-- Videos in the media library (2026-10-22): length, frame rate, cover image,
-- converted versions and what was uploaded. Guarded.

ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "fps" DOUBLE PRECISION;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "posterUrl" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "renditions" JSONB;
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "videoMeta" JSONB;
