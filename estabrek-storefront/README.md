# Estabrek Rose Storefront

Arabic-first pink design for hijabs, dresses and modest clothing. The held opening changes from a close-up to an arched campaign frame as you scroll, with the original logo in a pink brand card. A procedural Three.js hijab drapes over a display bust and rotates from close-up to full view. Campaign images are editorial inspiration; products, prices and availability come from the catalog.

Run npm install and npm run dev from this directory. Configure API_BASE_URL and NEXT_PUBLIC_API_BASE_URL in .env.local; see .env.example. Open http://localhost:3000.

The published CMS homepage controls content, section order and visibility. Simple Hero, product, collection, FAQ and CTA sections receive the rose presentation. Composed components, slides, custom row/grid layouts and unsupported sections keep the original renderer. When no homepage is published, the rose fallback reads the catalog. cmsOverrideHome=false selects the fallback. ESTABREK_HOME_MODE=cms restores the original shell and CMS presentation.

In Admin → Pages → homepage → first Hero, open استبرق — الصفحة الوردية وتجربة الأقمشة 3D. Edit the campaign title/image/alt and 3D visibility. Existing Hero subtitle and buttons still apply. If the previous Hero image is the site logo, the default hijab campaign is used. Native style controls and Admin inline previews use the original renderer; the storefront shows the new rose presentation. Catalog products are never replaced by campaign art.

The language switch translates interface text; CMS-authored text remains in its authored language. Reduced-motion and the CMS animation switch show a static opening and all three fabric chapters without long sticky spacing. Every chapter is also rendered without JavaScript. WebGL failure shows a matching hijab illustration. The scene loads near the section and pauses offscreen.

Validation: npm run typecheck, npm run build, npm test. Browser tests use installed Google Chrome and an isolated catalog/CMS fixture. Stop manual previews before testing. Admin controls: npm test -- src/features/pages/RoseHeroSettings.test.tsx from estabrek-admin.

See public/editorial/README.md for image prompts and font licenses. Real product GLB viewers still use their existing configuration.
