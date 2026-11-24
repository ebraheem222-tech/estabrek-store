-- The rose design (its hijab film, seasons, fabric story and the guide Razan) becomes one store's own
-- theme (2026-11-24). No store falls back to it any more: a store with no theme wears its kind's theme.
-- No table change: it lives in SiteSettings.header.
--
-- The Estabrek shop keeps exactly what it shows: it has now picked the rose design
-- (header.storeTheme = {"id":"rose"}, unless it already picked another theme or draws its own design)
-- and owns it (header.privateThemes), so it alone sees it in the admin's gallery. Only a store named
-- Estabrek is touched; a new store's copy never is. Running it again changes nothing.
UPDATE "SiteSettings"
SET "header" =
  (CASE WHEN jsonb_typeof("header") = 'object' THEN "header" ELSE '{}'::jsonb END)
  || jsonb_build_object('privateThemes',
       CASE
         WHEN jsonb_typeof("header" -> 'privateThemes') = 'array' AND ("header" -> 'privateThemes') @> '["rose"]'::jsonb
           THEN "header" -> 'privateThemes'
         WHEN jsonb_typeof("header" -> 'privateThemes') = 'array'
           THEN ("header" -> 'privateThemes') || '["rose"]'::jsonb
         ELSE '["rose"]'::jsonb
       END)
  || CASE
       WHEN jsonb_typeof("header" -> 'storeTheme') = 'object' OR ("header" -> 'storeDesign' ->> 'mode') = 'cms'
         THEN '{}'::jsonb
       ELSE jsonb_build_object('storeTheme', jsonb_build_object('id', 'rose'))
     END
WHERE ("siteName" ILIKE '%استبرق%' OR "siteName" ILIKE '%estabrek%');
