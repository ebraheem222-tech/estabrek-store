-- Add suggestedColors JSONB to ProductItem
ALTER TABLE "ProductItem" ADD COLUMN IF NOT EXISTS "suggestedColors" JSONB;
