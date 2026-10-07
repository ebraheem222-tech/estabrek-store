-- Product types with their own fields (2026-10-14). The store's current
-- products become the "ملابس" (clothes) type with four ready fields: fabric,
-- length, washing care and occasion. Nothing existing changes. Guarded.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "attributes" JSONB;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "typeId" TEXT;

CREATE TABLE IF NOT EXISTS "ProductType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "colorLabel" TEXT NOT NULL DEFAULT 'اللون',
    "sizeLabel" TEXT NOT NULL DEFAULT 'المقاس',
    "showColor" BOOLEAN NOT NULL DEFAULT true,
    "showSize" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductType_slug_key" ON "ProductType"("slug");
CREATE INDEX IF NOT EXISTS "Product_typeId_idx" ON "Product"("typeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_typeId_fkey') THEN
    ALTER TABLE "Product" ADD CONSTRAINT "Product_typeId_fkey"
      FOREIGN KEY ("typeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "ProductType" ("id", "name", "slug", "description", "fields", "position", "updatedAt")
VALUES (
  'ptype_clothes',
  'ملابس',
  'clothes',
  'فساتين، عبايات، حجابات وكل اللبس.',
  '[
    {"key":"fabric","label":"القماش","kind":"select","options":["كريب","شيفون","جيرسي","كتان","ساتان","قطن","مخمل","صوف","حرير","تول"],"filterable":true,"showOnPage":true},
    {"key":"length","label":"الطول","kind":"number","unit":"سم","filterable":false,"showOnPage":true},
    {"key":"care","label":"تعليمات الغسيل","kind":"longtext","filterable":false,"showOnPage":true,"help":"مثلاً: غسيل يدوي بماء بارد، بدون نشّافة"},
    {"key":"occasion","label":"المناسبة","kind":"multiselect","options":["يومي","عمل","سهرة","عرس","صلاة","رمضان والعيد"],"filterable":true,"showOnPage":true}
  ]'::jsonb,
  0,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

UPDATE "Product" SET "typeId" = 'ptype_clothes'
WHERE "typeId" IS NULL AND EXISTS (SELECT 1 FROM "ProductType" WHERE "id" = 'ptype_clothes');
