-- A function's own tests (F4): what it is handed and what must come of it. They run before every
-- publish; one that doesn't pass stops it. Kept beside the function, not in its steps: adding a
-- test doesn't make a published function "changed".
ALTER TABLE "Fn" ADD COLUMN IF NOT EXISTS "tests" JSONB NOT NULL DEFAULT '[]';
