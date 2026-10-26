-- The shop in Arabic, English and Hebrew (admin → الإعدادات → لغات المتجر).
--
-- Products, categories and product types keep their text in the store's main
-- language; `translations` holds the other languages ({ "en": {...}, "he": {...} }),
-- written by the owner or drafted by the AI and checked by the owner. Empty = the
-- main language's text everywhere, as before.
ALTER TABLE "Product" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Category" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ProductType" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';

-- The language the shopper used, so the store's emails to her come in it.
-- Empty (every older row) = the store's main language.
ALTER TABLE "OrderRequest" ADD COLUMN "locale" "Locale";
ALTER TABLE "StockAlert" ADD COLUMN "locale" "Locale";
ALTER TABLE "CustomerRequest" ADD COLUMN "locale" "Locale";
