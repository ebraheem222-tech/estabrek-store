-- Add new CMS section types for landing pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'FEATURED_CATEGORIES'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'FEATURED_CATEGORIES';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'COLLECTIONS_GRID'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'COLLECTIONS_GRID';
  END IF;
END $$;
