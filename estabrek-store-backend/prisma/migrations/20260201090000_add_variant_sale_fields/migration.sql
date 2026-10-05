-- Add sale/original pricing fields to ProductVariant
ALTER TABLE "ProductVariant"
  ADD COLUMN "originalPrice" DECIMAL(10,2),
  ADD COLUMN "salePrice" DECIMAL(10,2),
  ADD COLUMN "saleStartsAt" TIMESTAMP(3),
  ADD COLUMN "saleEndsAt" TIMESTAMP(3);