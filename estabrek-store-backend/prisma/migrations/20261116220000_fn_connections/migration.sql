-- What a function may reach outside (F5; admin → الاتصالات والأسرار): the sites it may call, and
-- the secrets it may send them. A secret's value is kept encrypted (lib/secretBox.ts) and is never
-- answered back; it names the sites it may be sent to.
CREATE TABLE IF NOT EXISTS "FnSite" (
    "host" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FnSite_pkey" PRIMARY KEY ("host")
);

CREATE TABLE IF NOT EXISTS "FnSecret" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sealed" TEXT NOT NULL,
    "sites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "createdById" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FnSecret_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FnSecret_name_key" ON "FnSecret"("name");
