-- Add payment settings to SiteSettings
ALTER TABLE "SiteSettings"
ADD COLUMN "checkoutMode" TEXT NOT NULL DEFAULT 'WHATSAPP',
ADD COLUMN "ordersEmail" TEXT,
ADD COLUMN "whatsappNumber" TEXT,
ADD COLUMN "stripeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripePublicKey" TEXT,
ADD COLUMN "stripeSecretKey" TEXT,
ADD COLUMN "stripeWebhookSecret" TEXT,
ADD COLUMN "paypalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "paypalClientId" TEXT,
ADD COLUMN "paypalClientSecret" TEXT,
ADD COLUMN "paypalWebhookId" TEXT;

-- Add payment metadata to OrderRequest
ALTER TABLE "OrderRequest"
ADD COLUMN "paymentProvider" TEXT,
ADD COLUMN "paymentStatus" TEXT,
ADD COLUMN "paymentReference" TEXT;

-- Checkout session storage
CREATE TABLE "CheckoutSession" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "sessionRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CheckoutSession_provider_status_idx" ON "CheckoutSession"("provider", "status");
CREATE INDEX "CheckoutSession_sessionRef_idx" ON "CheckoutSession"("sessionRef");
