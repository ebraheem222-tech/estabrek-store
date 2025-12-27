-- Create Locale enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Locale') THEN
    EXECUTE 'CREATE TYPE "Locale" AS ENUM (''ar'',''he'',''en'')';
  END IF;
END$$;

-- Create PageTranslation table
CREATE TABLE IF NOT EXISTS "PageTranslation" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "locale" "Locale" NOT NULL,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "ogImageUrl" TEXT,
  "canonicalUrl" TEXT,
  "noIndex" BOOLEAN,
  "headScripts" JSONB,
  "bodyScripts" JSONB,
  "customCss" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageTranslation_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PageTranslation_pageId_fkey'
  ) THEN
    ALTER TABLE "PageTranslation"
      ADD CONSTRAINT "PageTranslation_pageId_fkey"
      FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "PageTranslation_pageId_locale_key" ON "PageTranslation"("pageId", "locale");

-- Create PageSectionTranslation table
CREATE TABLE IF NOT EXISTS "PageSectionTranslation" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "locale" "Locale" NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageSectionTranslation_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PageSectionTranslation_sectionId_fkey'
  ) THEN
    ALTER TABLE "PageSectionTranslation"
      ADD CONSTRAINT "PageSectionTranslation_sectionId_fkey"
      FOREIGN KEY ("sectionId") REFERENCES "PageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "PageSectionTranslation_sectionId_locale_key" ON "PageSectionTranslation"("sectionId", "locale");
