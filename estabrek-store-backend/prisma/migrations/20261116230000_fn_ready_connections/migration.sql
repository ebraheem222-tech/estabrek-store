-- Ready connections (F5; admin → الاتصالات والأسرار): a service the owner connected once
-- (Telegram, Slack), which a function's step then picks by its id. The key is kept encrypted
-- (lib/secretBox.ts) and is never answered back; the settings are the kind's own plain values.
CREATE TABLE IF NOT EXISTS "FnConnection" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sealed" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FnConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FnConnection_name_key" ON "FnConnection"("name");
