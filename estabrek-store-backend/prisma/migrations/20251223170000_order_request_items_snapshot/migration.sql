-- AlterTable: OrderRequest (store currency at request time)
ALTER TABLE "OrderRequest"
ADD COLUMN     "currencyCode" TEXT NOT NULL DEFAULT 'ILS';

-- CreateTable: OrderRequestItem (multi-item orders + snapshot)
CREATE TABLE "OrderRequestItem" (
    "id" TEXT NOT NULL,
    "orderRequestId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineSubtotal" DECIMAL(10,2) NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productSlug" TEXT,
    "itemId" TEXT,
    "colorName" TEXT,
    "colorHex" TEXT,
    "sizeId" TEXT,
    "sizeName" TEXT,
    "sku" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderRequestItem_orderRequestId_idx" ON "OrderRequestItem"("orderRequestId");
CREATE INDEX "OrderRequestItem_variantId_idx" ON "OrderRequestItem"("variantId");

-- AddForeignKey
ALTER TABLE "OrderRequestItem" ADD CONSTRAINT "OrderRequestItem_orderRequestId_fkey" FOREIGN KEY ("orderRequestId") REFERENCES "OrderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderRequestItem" ADD CONSTRAINT "OrderRequestItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
