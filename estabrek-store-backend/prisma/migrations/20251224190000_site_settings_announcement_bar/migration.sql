-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "announcementIsActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN "announcementText" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "announcementLinkUrl" TEXT;
