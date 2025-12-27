ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'NEWSLETTER';

ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;

ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;

ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "ogImageUrl" TEXT;

ALTER TABLE "Page" ADD COLUMN IF NOT EXISTS "noIndex" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "newsletterIsActive" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "newsletterTitle" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "newsletterText" TEXT;

ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "newsletterSuccess" TEXT;

CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
