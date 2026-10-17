-- Control and safety (2026-10-25): scheduled changes (الجدول الزمني), automations
-- (التلقائيات) and the admin's notifications. Guarded.

CREATE TABLE IF NOT EXISTS "ScheduledChange" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL,
    "undoAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "before" JSONB,
    "appliedAt" TIMESTAMP(3),
    "undoneAt" TIMESTAMP(3),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScheduledChange_status_runAt_idx" ON "ScheduledChange"("status", "runAt");
CREATE INDEX IF NOT EXISTS "ScheduledChange_status_undoAt_idx" ON "ScheduledChange"("status", "undoAt");

CREATE TABLE IF NOT EXISTS "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastFiredAt" TIMESTAMP(3),
    "fired" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AutomationRun" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject" TEXT,
    "ok" BOOLEAN NOT NULL,
    "detail" TEXT,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AutomationRun_ruleId_at_idx" ON "AutomationRun"("ruleId", "at");
CREATE INDEX IF NOT EXISTS "AutomationRun_at_idx" ON "AutomationRun"("at");

DO $$ BEGIN
  ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AutomationState" (
    "ruleId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "lastAt" TIMESTAMP(3) NOT NULL,
    "latched" BOOLEAN NOT NULL DEFAULT false,
    "until" TIMESTAMP(3),

    CONSTRAINT "AutomationState_pkey" PRIMARY KEY ("ruleId","subject")
);

CREATE TABLE IF NOT EXISTS "AdminNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminNotification_readAt_idx" ON "AdminNotification"("readAt");
