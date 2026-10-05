-- Add missing CMS section types (Postgres enum)
-- Older DBs created from early migrations may be missing these values, causing 500s
-- when the Admin tries to create sections like PRICING / CONTACT.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'FEATURES'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'FEATURES';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'STATS'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'STATS';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'TEAM'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'TEAM';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'PRICING'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'PRICING';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'CONTACT'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'CONTACT';
  END IF;
END $$;

