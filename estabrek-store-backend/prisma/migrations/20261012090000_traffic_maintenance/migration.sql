-- Traffic protection & maintenance mode (2026-10-12): IPs blocked by hand from
-- the admin (traffic page), and the maintenance switch with its message and
-- the owner's preview key. Every statement is guarded.

ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "maintenanceMessage" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "maintenanceKey" TEXT;

CREATE TABLE IF NOT EXISTS "IpBlock" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "reason" TEXT,
    "until" TIMESTAMP(3),
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IpBlock_ip_key" ON "IpBlock"("ip");
CREATE INDEX IF NOT EXISTS "IpBlock_until_idx" ON "IpBlock"("until");
