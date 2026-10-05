-- Brings the database in line with schema.prisma.
--
-- Some fields were added to schema.prisma without a migration (stock commit on
-- orders, order statuses CANCELED/REFUNDED, Stripe/PayPal settings, SMS login
-- codes, page revisions, password-reset token ids, several indexes). A database
-- built only from migrations (Railway runs `prisma migrate deploy`) was missing
-- them; a database made with `prisma db push` may already have them. Every
-- statement below checks first, so this is safe on both and changes nothing that
-- is already right. Nothing is dropped.

-- Enum values -------------------------------------------------------------
ALTER TYPE "OrderReqStatus" ADD VALUE IF NOT EXISTS 'CANCELED';
ALTER TYPE "OrderReqStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminOtpPurpose') THEN
    CREATE TYPE "AdminOtpPurpose" AS ENUM ('MFA_SMS', 'PHONE_LOGIN', 'ENABLE_SMS_2FA', 'PHONE_VERIFY');
  END IF;
END $$;
ALTER TYPE "AdminOtpPurpose" ADD VALUE IF NOT EXISTS 'MFA_SMS';
ALTER TYPE "AdminOtpPurpose" ADD VALUE IF NOT EXISTS 'PHONE_LOGIN';
ALTER TYPE "AdminOtpPurpose" ADD VALUE IF NOT EXISTS 'ENABLE_SMS_2FA';
ALTER TYPE "AdminOtpPurpose" ADD VALUE IF NOT EXISTS 'PHONE_VERIFY';

-- Orders: stock is committed once (accept) and given back once (reject/refund)
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "stockCommitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "stockCommittedAt" TIMESTAMP(3);

-- Store settings: country and online payments
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "storeCountryCode" TEXT NOT NULL DEFAULT 'IL';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "stripeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "stripePublicKey" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "stripeSecretKey" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "stripeWebhookSecret" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "paypalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "paypalClientId" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "paypalClientSecret" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "paypalWebhookId" TEXT;

-- What 20260205140000_add_payments adds, in case that migration never applied
-- (it fails on a database where checkoutMode already exists).
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "checkoutMode" TEXT NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "ordersEmail" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "paymentReference" TEXT;
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

-- checkoutMode is a plain text field in the schema; an older migration made it an enum,
-- which the app can't write to. Turn it into text (values are kept).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'SiteSettings' AND column_name = 'checkoutMode' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE "SiteSettings" ALTER COLUMN "checkoutMode" DROP DEFAULT;
    ALTER TABLE "SiteSettings" ALTER COLUMN "checkoutMode" TYPE TEXT USING "checkoutMode"::TEXT;
    ALTER TABLE "SiteSettings" ALTER COLUMN "checkoutMode" SET DEFAULT 'WHATSAPP';
  END IF;
END $$;

-- Pages: scheduled publishing
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "publishAt" TIMESTAMP(3);
ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "unpublishAt" TIMESTAMP(3);

-- Password reset links ("tokenId.secret"): rows from before get their own id as tokenId
ALTER TABLE "AdminPasswordReset" ADD COLUMN IF NOT EXISTS "tokenId" TEXT;
UPDATE "AdminPasswordReset" SET "tokenId" = "id" WHERE "tokenId" IS NULL;
ALTER TABLE "AdminPasswordReset" ALTER COLUMN "tokenId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "AdminPasswordReset_tokenId_key" ON "AdminPasswordReset"("tokenId");
CREATE INDEX IF NOT EXISTS "AdminPasswordReset_tokenId_expiresAt_idx" ON "AdminPasswordReset"("tokenId", "expiresAt");

-- SMS codes for admin login / 2FA
CREATE TABLE IF NOT EXISTS "AdminOtpChallenge" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "purpose" "AdminOtpPurpose" NOT NULL,
    "channel" "Channel" NOT NULL DEFAULT 'SMS',
    "to" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "requesterIp" TEXT,
    "requesterUa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdminOtpChallenge_adminUserId_purpose_expiresAt_idx" ON "AdminOtpChallenge"("adminUserId", "purpose", "expiresAt");
CREATE INDEX IF NOT EXISTS "AdminOtpChallenge_to_purpose_expiresAt_idx" ON "AdminOtpChallenge"("to", "purpose", "expiresAt");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminOtpChallenge_adminUserId_fkey') THEN
    ALTER TABLE "AdminOtpChallenge" ADD CONSTRAINT "AdminOtpChallenge_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Page history (restore an earlier version of a page)
CREATE TABLE IF NOT EXISTS "PageRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "PageStatus" NOT NULL,
    "publishAt" TIMESTAMP(3),
    "unpublishAt" TIMESTAMP(3),
    "canonicalUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "customCss" TEXT,
    "headScripts" JSONB,
    "bodyScripts" JSONB,
    "sections" JSONB NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PageRevision_pageId_createdAt_idx" ON "PageRevision"("pageId", "createdAt");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PageRevision_pageId_fkey') THEN
    ALTER TABLE "PageRevision" ADD CONSTRAINT "PageRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes the schema declares (faster lists: orders by status, reviews, pages, media)
CREATE INDEX IF NOT EXISTS "NavigationMenu_location_isDefault_idx" ON "NavigationMenu"("location", "isDefault");
CREATE INDEX IF NOT EXISTS "NavigationItem_menuId_isActive_idx" ON "NavigationItem"("menuId", "isActive");
CREATE INDEX IF NOT EXISTS "Page_status_slug_idx" ON "Page"("status", "slug");
CREATE INDEX IF NOT EXISTS "Page_status_publishAt_unpublishAt_idx" ON "Page"("status", "publishAt", "unpublishAt");
CREATE INDEX IF NOT EXISTS "MediaAsset_kind_folder_createdAt_idx" ON "MediaAsset"("kind", "folder", "createdAt");
CREATE INDEX IF NOT EXISTS "Review_status_createdAt_idx" ON "Review"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ProductComment_status_createdAt_idx" ON "ProductComment"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderRequest_status_createdAt_idx" ON "OrderRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "OutboxMessage_status_createdAt_idx" ON "OutboxMessage"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");
