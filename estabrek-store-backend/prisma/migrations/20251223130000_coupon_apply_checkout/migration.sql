-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable: Coupon (add discount fields)
ALTER TABLE "Coupon"
ADD COLUMN     "discountType" "CouponDiscountType" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "discountValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "maxDiscount" DECIMAL(10,2);

-- AlterTable: OrderRequest (store coupon + pricing snapshot)
ALTER TABLE "OrderRequest"
ADD COLUMN     "unitPrice" DECIMAL(10,2),
ADD COLUMN     "subtotal" DECIMAL(10,2),
ADD COLUMN     "discountAmount" DECIMAL(10,2),
ADD COLUMN     "total" DECIMAL(10,2),
ADD COLUMN     "couponId" TEXT,
ADD COLUMN     "couponCode" TEXT;

-- Index
CREATE INDEX "OrderRequest_couponId_idx" ON "OrderRequest"("couponId");

-- AddForeignKey
ALTER TABLE "OrderRequest" ADD CONSTRAINT "OrderRequest_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderRequestId" TEXT NOT NULL,
    "phone" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderRequestId_key" ON "CouponRedemption"("orderRequestId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");

-- CreateIndex
CREATE INDEX "CouponRedemption_redeemedAt_idx" ON "CouponRedemption"("redeemedAt");

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderRequestId_fkey" FOREIGN KEY ("orderRequestId") REFERENCES "OrderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
