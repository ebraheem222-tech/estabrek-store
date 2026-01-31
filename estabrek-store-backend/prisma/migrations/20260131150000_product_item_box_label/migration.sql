-- Add boxLabel to ProductItem and update unique constraint
ALTER TABLE "ProductItem" ADD COLUMN "boxLabel" TEXT NOT NULL DEFAULT '';

-- Replace unique index (productId, colorName) -> (productId, colorName, boxLabel)
DROP INDEX "ProductItem_productId_colorName_key";
CREATE UNIQUE INDEX "ProductItem_productId_colorName_boxLabel_key" ON "ProductItem"("productId", "colorName", "boxLabel");
