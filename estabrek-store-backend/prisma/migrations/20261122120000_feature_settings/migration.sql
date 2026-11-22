-- A whole site's settings as its owner set them (src/lib/siteSettings.ts).
ALTER TABLE "Feature" ADD COLUMN "settings" JSONB;
