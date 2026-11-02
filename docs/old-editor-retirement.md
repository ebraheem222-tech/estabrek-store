# Retiring the old page editor (CMS track B, phase 8)

The old page editor (`estabrek-admin/src/features/pages/PageEditorPage.tsx`, its preview page,
and the section editors and catalogs under `src/cms`) was removed on 2026-11-02, after the live
store's pages were checked. Every page opens in the new editor (`/studio/:id`). This file is the
record of what moved, what stays an old section, and what was removed.

## What changed

- `/admin/pages/:id` (and the old `/classic` and `/preview` addresses) open `/studio/:id`; the
  pages list opens the new editor, and its preview opens the page on the shop.
- The new editor has the page's own settings (name, address, status and schedule, search words
  per language, canonical address, hiding from search engines, the page's CSS and scripts).
- An old section can be turned into the new editor's own elements (`src/studio/convert.ts`):
  one from its panel, or every old section of a page from the page's panel. It's one change:
  the old section goes to the bin, and Undo brings it back.

## Everything the old editor did, in the new one

| The old editor | The new editor |
| --- | --- |
| Add, order, hide, delete sections | The Add panel, layers, section actions |
| Words, pictures, buttons and links in a section | Edited in place on the page, in each language |
| Lists (questions, reviews, team, plans, numbers, cards, galleries) | Turned into blocks with their own item editors |
| Products and categories sections | The products and categories elements |
| Section themes and Tailwind classes | Looks, shared styles, theme packs (the old classes aren't carried over) |
| Hero, slider, pricing, feature and alert themes | Templates (353 sections, 108 pages) and theme packs |
| Page SEO, schedule, canonical, CSS and scripts | Page settings (select the page) |
| Translations of a section | Every converted element keeps each language's words |
| Custom HTML section | Stays an old section; its HTML is edited in its settings |
| The rose opening (film, scenes, colours) | Already edited in the new editor; stays as it is |

## What stays an old section

These are drawn by the shop as before (`legacy` nodes) and aren't turned into new elements:

- the rose opening (`HERO` with `rose…` fields): the new editor sets it already;
- `CUSTOM_HTML`: its HTML is edited in the new editor's section settings;
- `VIDEO` from YouTube, Vimeo or HLS: the new video element plays files only;
- `GRID` holding other sections (`blocks`);
- `GLOBAL_ANNOUNCEMENT`, `GLOBAL_HEADER`, `GLOBAL_FOOTER`.

Of these, only a YouTube/Vimeo `VIDEO`'s address and a nested `GRID`'s inner sections can't be
changed without the old editor. Before removing it, check the live store for them:

```sql
SELECT p.slug, s.type, s.data->>'provider' AS provider
FROM "PageSection" s JOIN "Page" p ON p.id = s."pageId"
WHERE (s.type = 'VIDEO' AND coalesce(s.data->>'provider', '') IN ('YOUTUBE', 'VIMEO', 'HLS'))
   OR (s.type = 'GRID' AND jsonb_array_length(coalesce(s.data->'blocks', '[]'::jsonb)) > 0);
```

## The live store, checked on 2026-11-02

Read from the store's public API (published pages only; the Neon account connected to the
editor here holds no projects, so drafts couldn't be read):

| Page | Format | Old sections |
| --- | --- | --- |
| `/` (البيت) | old (1) | HERO, HERO, NEW_ARRIVALS_SLIDER, COLLECTIONS_GRID, FAQ, CTA |
| `/contact` (تواصل) | old (1) | RICH_TEXT, CONTACT |
| `/demo` (home2) | old (1) | HERO, GRID (empty, no inner sections), BEST_SELLERS_SLIDER, FAQ, CTA |

No YouTube/Vimeo clip, no grid holding other sections, no custom HTML and no global section:
nothing published needs the old editor. Unpublished pages weren't visible from there.

The store wears the rose design (a modest fashion store with no store theme). There the shop
draws old sections its own way: the home's first HERO is the rose opening (its film and
scenes), other HEROs become rose panels, and contact, calls to action and product rows take
rose versions. So in the rose design the new editor keeps the home's opening as it is and says,
for every other section, that turning it gives it the new elements' look instead. Keeping them
as old sections is fine: the new editor edits their words, pictures, links and looks in place.

## The code removed

The two pages' routes went (their addresses open the new editor), then the files below: what
the admin's import graph showed nothing else reaches once those pages are gone, their tests,
the READMEs of the theme folders that went, and `src/motion/gsapPresets.ts` (the old sections'
animation presets, imported by nothing). The admin's type check found no new errors, its tests
and build passed. That's about 56,765 lines. The files under `src/cms` that the settings, the admin's
own buttons, cursors, loaders and website themes still use stayed.

### Removed: used only by the old editor and its preview (60)

- `estabrek-admin/src/cms/animated-shapes/AnimatedShapeLayer.tsx`
- `estabrek-admin/src/cms/animated-shapes/AnimatedShapes.tsx`
- `estabrek-admin/src/cms/animated-shapes/AnimatedShapesExtra.tsx`
- `estabrek-admin/src/cms/animated-shapes/index.ts`
- `estabrek-admin/src/cms/banner_themes/banner-themes-v2.jsx`
- `estabrek-admin/src/cms/catagory_themes/category-themes-50.jsx`
- `estabrek-admin/src/cms/contact-forms/ContactFormComponents.tsx`
- `estabrek-admin/src/cms/contact-forms/ContactFormThemes.tsx`
- `estabrek-admin/src/cms/contact-forms/index.ts`
- `estabrek-admin/src/cms/decorations/DecorationLayer.tsx`
- `estabrek-admin/src/cms/decorations/svgLibrary/icons.ts`
- `estabrek-admin/src/cms/decorations/svgLibrary/index.ts`
- `estabrek-admin/src/cms/decorations/svgLibrary/patterns.ts`
- `estabrek-admin/src/cms/decorations/svgLibrary/shapes.ts`
- `estabrek-admin/src/cms/effects/interactionEffects.ts`
- `estabrek-admin/src/cms/feature-themes/FeatureComponents.tsx`
- `estabrek-admin/src/cms/feature-themes/FeatureThemes.tsx`
- `estabrek-admin/src/cms/feature-themes/index.ts`
- `estabrek-admin/src/cms/feature_pack_themes/feature-pack-themes.jsx`
- `estabrek-admin/src/cms/hero-themes/AdvancedHeroThemes.tsx`
- `estabrek-admin/src/cms/hero-themes/HeroComponents.tsx`
- `estabrek-admin/src/cms/hero-themes/HeroThemes.tsx`
- `estabrek-admin/src/cms/hero-themes/index.ts`
- `estabrek-admin/src/cms/pricing-themes/PricingComponents.tsx`
- `estabrek-admin/src/cms/pricing-themes/PricingThemes.tsx`
- `estabrek-admin/src/cms/pricing-themes/index.ts`
- `estabrek-admin/src/cms/renderer/CmsComponentsRenderer.tsx`
- `estabrek-admin/src/cms/shapes/shapeRegistry.ts`
- `estabrek-admin/src/cms/slider-themes/SliderComponents.tsx`
- `estabrek-admin/src/cms/slider-themes/SliderThemes.tsx`
- `estabrek-admin/src/cms/slider-themes/index.ts`
- `estabrek-admin/src/cms/spotlight-themes/SpotlightThemes.tsx`
- `estabrek-admin/src/cms/spotlight-themes/index.ts`
- `estabrek-admin/src/cms/style/containerStyles.ts`
- `estabrek-admin/src/cms/style/fontFamilyPresets.ts`
- `estabrek-admin/src/cms/style/googleFontsLoader.ts`
- `estabrek-admin/src/cms/style/tokens-extended.ts`
- `estabrek-admin/src/cms/style/tokens.ts`
- `estabrek-admin/src/cms/style/tokensToTw.ts`
- `estabrek-admin/src/cms/style/twMaps.ts`
- `estabrek-admin/src/cms/theme-packs/externalThemePacks.tsx`
- `estabrek-admin/src/cms/themes/GalleryThemeMotionBackdrop.tsx`
- `estabrek-admin/src/cms/types.ts`
- `estabrek-admin/src/components/ThemePreview.tsx`
- `estabrek-admin/src/components/effects/TypewriterText.tsx`
- `estabrek-admin/src/features/pages/CmsComponentsRenderer.tsx`
- `estabrek-admin/src/features/pages/ComponentsEditor.tsx`
- `estabrek-admin/src/features/pages/DividerStylePicker.tsx`
- `estabrek-admin/src/features/pages/PageEditorPage.tsx`
- `estabrek-admin/src/features/pages/PagePreviewPage.tsx`
- `estabrek-admin/src/features/pages/PageRenderer.tsx`
- `estabrek-admin/src/features/pages/ResponsiveTokensPanel.tsx`
- `estabrek-admin/src/features/pages/RoseHeroSettings.tsx`
- `estabrek-admin/src/features/pages/RosePresentationSettings.tsx`
- `estabrek-admin/src/features/pages/SectionEditor.tsx`
- `estabrek-admin/src/features/pages/SectionPreview.tsx`
- `estabrek-admin/src/features/pages/SectionStylingPanel.tsx`
- `estabrek-admin/src/features/pages/SvgLibraryPicker.tsx`
- `estabrek-admin/src/lib/sanitizeHtml.ts`
- `estabrek-admin/src/lib/scopeCss.ts`

### Removed: used by nothing (19)

- `estabrek-admin/src/cms/alert-themes/AlertThemesDemo.tsx`
- `estabrek-admin/src/cms/animated-shapes/AnimatedShapesDemo.tsx`
- `estabrek-admin/src/cms/contact-forms/ContactFormThemesDemo.tsx`
- `estabrek-admin/src/cms/ecommerce/index.ts`
- `estabrek-admin/src/cms/ecommerce/types.ts`
- `estabrek-admin/src/cms/feature-themes/FeatureThemesDemo.tsx`
- `estabrek-admin/src/cms/hero-themes/HeroThemesDemo.tsx`
- `estabrek-admin/src/cms/hero-themes/hero-advanced-themes.jsx`
- `estabrek-admin/src/cms/index-extended.ts`
- `estabrek-admin/src/cms/index.ts`
- `estabrek-admin/src/cms/pricing-themes/PricingThemesDemo.tsx`
- `estabrek-admin/src/cms/renderer/PageRenderer.tsx`
- `estabrek-admin/src/cms/sanitizeHtml.ts`
- `estabrek-admin/src/cms/sectionTypes.ts`
- `estabrek-admin/src/cms/seo.ts`
- `estabrek-admin/src/cms/slider-themes/SliderThemesDemo.tsx`
- `estabrek-admin/src/cms/spotlight-themes/SpotlightThemesDemo.tsx`
- `estabrek-admin/src/features/pages/SectionEditorImports.ts`
- `estabrek-admin/src/features/pages/SectionStylingPanelExtended.tsx`

### Removed: their tests (8)

- `estabrek-admin/src/cms/renderer/PageRenderer.splitHero.test.tsx`
- `estabrek-admin/src/cms/style/containerStyles.test.ts`
- `estabrek-admin/src/cms/style/fontFamilyPresets.test.ts`
- `estabrek-admin/src/cms/style/googleFontsLoader.test.ts`
- `estabrek-admin/src/cms/style/mediaShapeTokens.test.ts`
- `estabrek-admin/src/features/pages/DividerStylePicker.test.tsx`
- `estabrek-admin/src/features/pages/RoseHeroSettings.test.tsx`
- `estabrek-admin/src/features/pages/RosePresentationSettings.test.tsx`

### Kept (other screens use them) (35)

- `estabrek-admin/src/cms/alert-themes/AlertComponents.tsx`
- `estabrek-admin/src/cms/alert-themes/AlertThemes.tsx`
- `estabrek-admin/src/cms/alert-themes/index.ts`
- `estabrek-admin/src/cms/button-themes/ButtonThemes.ts`
- `estabrek-admin/src/cms/button-themes/index.ts`
- `estabrek-admin/src/cms/effects/effects.css`
- `estabrek-admin/src/cms/effects/loadingAnimations.ts`
- `estabrek-admin/src/cms/nav/navTemplates.ts`
- `estabrek-admin/src/cms/nav/templates/corporate.ts`
- `estabrek-admin/src/cms/nav/templates/ecommerce.ts`
- `estabrek-admin/src/cms/nav/templates/gaming.ts`
- `estabrek-admin/src/cms/nav/templates/glass.ts`
- `estabrek-admin/src/cms/nav/templates/gradient.ts`
- `estabrek-admin/src/cms/nav/templates/luxury.ts`
- `estabrek-admin/src/cms/nav/templates/minimal.ts`
- `estabrek-admin/src/cms/nav/templates/neon.ts`
- `estabrek-admin/src/cms/nav/templates/sidebar.ts`
- `estabrek-admin/src/cms/nav/types.ts`
- `estabrek-admin/src/cms/style/cursorStyles.ts`
- `estabrek-admin/src/cms/style/searchStyles.ts`
- `estabrek-admin/src/cms/themes/cms-themes-gallery.jsx`
- `estabrek-admin/src/cms/themes/galleryThemeSpecs.ts`
- `estabrek-admin/src/cms/themes/galleryThemes.ts`
- `estabrek-admin/src/cms/themes/templates/dark.ts`
- `estabrek-admin/src/cms/themes/templates/galleryExtra.ts`
- `estabrek-admin/src/cms/themes/templates/gradient.ts`
- `estabrek-admin/src/cms/themes/templates/light.ts`
- `estabrek-admin/src/cms/themes/templates/luxury.ts`
- `estabrek-admin/src/cms/themes/templates/modern.ts`
- `estabrek-admin/src/cms/themes/types.ts`
- `estabrek-admin/src/cms/themes/websiteThemes.ts`
- `estabrek-admin/src/features/pages/OpenInStudio.tsx`
- `estabrek-admin/src/features/pages/PageFormatControl.tsx`
- `estabrek-admin/src/features/pages/PagesListPage.tsx`
- `estabrek-admin/src/features/pages/pageTemplates.ts`
