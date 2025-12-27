-- Add new values to PageSectionType enum
DO $$ BEGIN
  ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'BUTTON';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'INPUT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
