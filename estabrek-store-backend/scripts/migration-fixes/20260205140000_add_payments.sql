-- Safe copy of prisma/migrations/20260205140000_add_payments, for scripts/migrate-deploy.mjs.
--
-- The migration adds "checkoutMode", "ordersEmail" and "whatsappNumber" to "SiteSettings" again:
-- 20251225040000_checkout_settings already made them. On a database that applied the migrations one by
-- one as they were written (Estabrek's), that never came up; on a new client's empty database it always
-- stops with 42701 (column already exists), and every deploy after it fails.
--
-- The migration file itself stays as it is: databases that already applied it keep its checksum. When it
-- stops on "already exists", the deploy script runs this copy instead (the same changes, each one only if
-- it isn't there yet) and marks the migration applied. Running it twice changes nothing.
-- src/tests/migrate.deploy.spec.ts checks that it makes exactly what the migration makes.

BEGIN;

ALTER TABLE "SiteSettings"
ADD COLUMN IF NOT EXISTS "checkoutMode" TEXT NOT NULL DEFAULT 'WHATSAPP',
ADD COLUMN IF NOT EXISTS "ordersEmail" TEXT,
ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT,
ADD COLUMN IF NOT EXISTS "stripeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "stripePublicKey" TEXT,
ADD COLUMN IF NOT EXISTS "stripeSecretKey" TEXT,
ADD COLUMN IF NOT EXISTS "stripeWebhookSecret" TEXT,
ADD COLUMN IF NOT EXISTS "paypalEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "paypalClientId" TEXT,
ADD COLUMN IF NOT EXISTS "paypalClientSecret" TEXT,
ADD COLUMN IF NOT EXISTS "paypalWebhookId" TEXT;

ALTER TABLE "OrderRequest"
ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT,
ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT,
ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;

CREATE TABLE IF NOT EXISTS "CheckoutSession" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "sessionRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CheckoutSession_provider_status_idx" ON "CheckoutSession"("provider", "status");
CREATE INDEX IF NOT EXISTS "CheckoutSession_sessionRef_idx" ON "CheckoutSession"("sessionRef");

COMMIT;
