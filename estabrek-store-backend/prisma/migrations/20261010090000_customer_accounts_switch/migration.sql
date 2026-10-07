-- Shopper accounts become a switch in the admin (Settings → حسابات الزبائن). Off by default: visitors only.
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "customerAccountsEnabled" BOOLEAN NOT NULL DEFAULT false;
