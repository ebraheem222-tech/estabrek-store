-- Add CARDS to PageSectionType enum (Postgres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'CARDS'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'CARDS';
  END IF;
END $$;
