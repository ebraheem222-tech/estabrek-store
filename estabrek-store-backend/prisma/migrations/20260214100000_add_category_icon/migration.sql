-- Add optional icon URL for categories
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "iconUrl" TEXT;
