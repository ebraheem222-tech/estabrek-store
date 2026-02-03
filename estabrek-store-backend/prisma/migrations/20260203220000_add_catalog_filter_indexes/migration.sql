-- Add indexes to speed up catalog filters

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_isActive_categoryId_idx" ON "Product"("isActive", "categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductItem_productId_isActive_idx" ON "ProductItem"("productId", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductItem_colorName_idx" ON "ProductItem"("colorName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_productItemId_idx" ON "ProductVariant"("productItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_sizeId_idx" ON "ProductVariant"("sizeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_price_idx" ON "ProductVariant"("price");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_salePrice_idx" ON "ProductVariant"("salePrice");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductVariant_stock_idx" ON "ProductVariant"("stock");
