-- Settings centre (2026-10-06): product SEO fields and the settings history.
-- Every statement is guarded, so it is safe on a database that already has them.

-- Search-engine title and description per product.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seoTitle" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;

-- The site settings as they were before each save (payment secrets are never copied).
CREATE TABLE IF NOT EXISTS "SettingsRevision" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "changed" JSONB,
    "note" TEXT,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettingsRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SettingsRevision_createdAt_idx" ON "SettingsRevision"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SettingsRevision_adminUserId_fkey') THEN
    ALTER TABLE "SettingsRevision" ADD CONSTRAINT "SettingsRevision_adminUserId_fkey"
      FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
