-- Add CMS section types: BEST_SELLERS_SLIDER, NEW_ARRIVALS_SLIDER, BRANDS_SLIDER
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'BEST_SELLERS_SLIDER'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'BEST_SELLERS_SLIDER';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'NEW_ARRIVALS_SLIDER'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'NEW_ARRIVALS_SLIDER';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PageSectionType' AND e.enumlabel = 'BRANDS_SLIDER'
  ) THEN
    ALTER TYPE "PageSectionType" ADD VALUE 'BRANDS_SLIDER';
  END IF;
END $$;
