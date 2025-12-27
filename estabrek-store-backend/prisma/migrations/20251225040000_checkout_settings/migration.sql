-- CreateEnum
CREATE TYPE "CheckoutMode" AS ENUM ('WHATSAPP', 'STRIPE');

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "checkoutMode" "CheckoutMode" NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "SiteSettings" ADD COLUMN     "whatsappNumber" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN     "ordersEmail" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN     "stripePublishableKey" TEXT;
