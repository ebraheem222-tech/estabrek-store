-- Checkout terms (a box the shopper ticks, with when she did), and the newsletter's Mailchimp connection
-- (the key sealed: src/lib/mailchimp.ts, src/lib/secretBox.ts).
-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "checkoutTermsRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkoutTermsText" JSONB,
ADD COLUMN     "checkoutTermsUrl" TEXT,
ADD COLUMN     "mailchimpApiKey" TEXT,
ADD COLUMN     "mailchimpDoubleOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mailchimpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mailchimpError" TEXT,
ADD COLUMN     "mailchimpListId" TEXT,
ADD COLUMN     "mailchimpSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderRequest" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "mailchimpAt" TIMESTAMP(3);
