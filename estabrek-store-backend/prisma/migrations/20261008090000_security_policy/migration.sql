-- Security policy (2026-10-08): server & sign-in rules set from the admin.
-- Every statement is guarded, so it is safe on a database that already has them.

-- Sign-ins from an IP the admin hasn't used before.
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'NEW_DEVICE_LOGIN';

-- One row ("default"). Missing values fall back to the environment variables.
CREATE TABLE IF NOT EXISTS "SecurityPolicy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityPolicy_pkey" PRIMARY KEY ("id")
);

-- The policy as it was before each change (latest 30 kept).
CREATE TABLE IF NOT EXISTS "SecurityPolicyRevision" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "changed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityPolicyRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SecurityPolicyRevision_createdAt_idx" ON "SecurityPolicyRevision"("createdAt");
