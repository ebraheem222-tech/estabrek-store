-- Add FORM to PageSectionType enum
DO $$ BEGIN
  ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'FORM';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
