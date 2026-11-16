-- What starts a function (F3): a row event, a schedule, a store event, a call, a webhook.
-- CreateTable
CREATE TABLE IF NOT EXISTS "FnTrigger" (
    "id" TEXT NOT NULL,
    "fnId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "slug" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "fired" INTEGER NOT NULL DEFAULT 0,
    "lastAt" TIMESTAMP(3),
    "nextAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FnTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FnTrigger_slug_key" ON "FnTrigger"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FnTrigger_fnId_idx" ON "FnTrigger"("fnId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FnTrigger_kind_enabled_idx" ON "FnTrigger"("kind", "enabled");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "FnTrigger" ADD CONSTRAINT "FnTrigger_fnId_fkey" FOREIGN KEY ("fnId") REFERENCES "Fn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
