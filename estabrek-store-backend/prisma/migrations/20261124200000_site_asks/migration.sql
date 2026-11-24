-- A copy's admin put up by hand on Cloudflare Pages asks this store's press to make its database, server and shop
-- (src/lib/siteAsk.ts); the owner says yes in نسخ الزباين. A new table only.
CREATE TABLE IF NOT EXISTS "SiteAsk" (
    "id" TEXT NOT NULL,
    "admin" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'waiting',
    "copyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAsk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteAsk_admin_key" ON "SiteAsk"("admin");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteAsk_copyId_key" ON "SiteAsk"("copyId");
CREATE INDEX IF NOT EXISTS "SiteAsk_state_createdAt_idx" ON "SiteAsk"("state", "createdAt");
