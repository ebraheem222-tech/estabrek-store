-- Team & permissions (2026-10-07): staff accounts with roles, and the activity log.
-- Every statement is guarded, so it is safe on a database that already has them.

-- Owners keep "SUPERADMIN" (every permission). Team members are "STAFF".
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminStatus') THEN
    CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
  END IF;
END $$;

-- Only one admin account was allowed until now.
DROP INDEX IF EXISTS "AdminUser_role_key";

ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "invitedById" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "staffRoleId" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS "StaffRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "actorEmail" TEXT,
    "area" TEXT NOT NULL,
    "verb" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "targetId" TEXT,
    "status" INTEGER NOT NULL,
    "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffRole_name_key" ON "StaffRole"("name");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_area_createdAt_idx" ON "AdminAuditLog"("area", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminUser_role_idx" ON "AdminUser"("role");
CREATE INDEX IF NOT EXISTS "AdminUser_staffRoleId_idx" ON "AdminUser"("staffRoleId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminUser_staffRoleId_fkey') THEN
    ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_staffRoleId_fkey"
      FOREIGN KEY ("staffRoleId") REFERENCES "StaffRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminAuditLog_adminUserId_fkey') THEN
    ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey"
      FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Ready-made roles to start from (all editable from the admin).
INSERT INTO "StaffRole" ("id", "name", "description", "permissions", "updatedAt") VALUES
  ('staffrole_manager', 'مدير المتجر', 'كل شيء ما عدا إدارة الفريق ومفاتيح الدفع.', ARRAY['dashboard:read', 'orders:read', 'orders:write', 'catalog:read', 'catalog:write', 'inventory:read', 'inventory:write', 'discounts:read', 'discounts:write', 'ugc:read', 'ugc:write', 'pages:read', 'pages:write', 'pages:publish', 'nav:read', 'nav:write', 'media:read', 'media:write', 'chatbot:read', 'chatbot:write', 'outbox:read', 'outbox:write', 'settings:read', 'settings:write', 'staff:read', 'activity:read']::TEXT[], CURRENT_TIMESTAMP),
  ('staffrole_support', 'طلبات وخدمة الزبائن', 'الطلبات والتقييمات والرسائل، ومشاهدة المنتجات والمخزون.', ARRAY['dashboard:read', 'orders:read', 'orders:write', 'catalog:read', 'inventory:read', 'discounts:read', 'ugc:read', 'ugc:write', 'outbox:read', 'chatbot:read']::TEXT[], CURRENT_TIMESTAMP),
  ('staffrole_content', 'محتوى وتسويق', 'المنتجات والصفحات والقوائم والوسائط والكوبونات.', ARRAY['dashboard:read', 'catalog:read', 'catalog:write', 'inventory:read', 'discounts:read', 'discounts:write', 'pages:read', 'pages:write', 'pages:publish', 'nav:read', 'nav:write', 'media:read', 'media:write', 'ugc:read', 'chatbot:read', 'chatbot:write']::TEXT[], CURRENT_TIMESTAMP),
  ('staffrole_viewer', 'مشاهدة فقط', 'يشوف كل شيء وما بيقدر يغيّر.', ARRAY['dashboard:read', 'orders:read', 'catalog:read', 'inventory:read', 'discounts:read', 'ugc:read', 'pages:read', 'nav:read', 'media:read', 'chatbot:read', 'outbox:read', 'settings:read', 'staff:read', 'activity:read']::TEXT[], CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
