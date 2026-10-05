-- Add new CMS section types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'SVG') THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'SVG';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'DIVIDER') THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'DIVIDER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'SPACER') THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'SPACER';
  END IF;
END $$;
