-- A function's versions (admin → الـ Functions → النسخ): every publish is kept as a version with
-- its own number, never changed afterwards. "Fn"."version" is the one that runs now. A run in the
-- log says which version it was ("Run"."detail").
ALTER TABLE "Fn" ADD COLUMN IF NOT EXISTS "version" INTEGER;
ALTER TABLE "Run" ADD COLUMN IF NOT EXISTS "detail" JSONB;

CREATE TABLE IF NOT EXISTS "FnVersion" (
    "id" TEXT NOT NULL,
    "fnId" TEXT NOT NULL,
    "n" INTEGER NOT NULL,
    "def" JSONB NOT NULL,
    "from" TEXT,
    "byEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FnVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FnVersion_fnId_n_key" ON "FnVersion"("fnId", "n");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FnVersion_fnId_fkey') THEN
    ALTER TABLE "FnVersion" ADD CONSTRAINT "FnVersion_fnId_fkey" FOREIGN KEY ("fnId") REFERENCES "Fn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- What is published today becomes each function's version 1 (nothing about how it runs changes).
INSERT INTO "FnVersion" ("id", "fnId", "n", "def", "createdAt")
SELECT 'fv' || md5(random()::text || clock_timestamp()::text || f."id"), f."id", 1, f."live", COALESCE(f."publishedAt", CURRENT_TIMESTAMP)
FROM "Fn" f
WHERE f."live" IS NOT NULL AND f."live" <> 'null'::jsonb
  AND NOT EXISTS (SELECT 1 FROM "FnVersion" v WHERE v."fnId" = f."id");

UPDATE "Fn" SET "version" = 1 WHERE "version" IS NULL AND "live" IS NOT NULL AND "live" <> 'null'::jsonb;
