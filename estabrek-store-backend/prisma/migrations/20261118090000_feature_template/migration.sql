-- A feature made by installing a template (stage 4; src/lib/featureInstall.ts) keeps the file it came
-- from and which of its things is which, so an upgrade can tell the owner's own changes from the template's.
ALTER TABLE "Feature" ADD COLUMN IF NOT EXISTS "template" JSONB;
