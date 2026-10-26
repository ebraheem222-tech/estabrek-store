-- The store's identity (admin → هوية المتجر) lives in SiteSettings.header.identity:
-- no table change. Every shop on the platform shows its own name from there.
--
-- The Estabrek shop keeps exactly what it showed before: «متجر استبرق» in titles and
-- messages, «استبرق» / "Estabrek" in the logo, its English line, and that it is a
-- clothes shop for women (so the rose design keeps its words). Only a store named
-- Estabrek that has no identity yet is touched; a new store's copy never is.
UPDATE "SiteSettings"
SET "header" = (CASE WHEN jsonb_typeof("header") = 'object' THEN "header" ELSE '{}'::jsonb END)
  || jsonb_build_object('identity', jsonb_build_object(
    'name', jsonb_build_object('ar', "siteName", 'en', 'Estabrek', 'he', ''),
    'shortName', jsonb_build_object('ar', 'استبرق', 'en', 'Estabrek', 'he', ''),
    'tagline', jsonb_build_object('ar', '', 'en', 'MODESTLY, BEAUTIFULLY YOU', 'he', ''),
    'about', jsonb_build_object(
      'ar', 'حجاب، عبايات، فساتين وملابس محتشمة للنساء.',
      'en', 'Hijabs, abayas, dresses and modest clothing for women.',
      'he', ''),
    'industry', 'fashion',
    'audience', 'women',
    'legalName', ''))
WHERE ("siteName" ILIKE '%استبرق%' OR "siteName" ILIKE '%estabrek%')
  AND NOT (CASE WHEN jsonb_typeof("header") = 'object' THEN "header" ELSE '{}'::jsonb END ? 'identity');
