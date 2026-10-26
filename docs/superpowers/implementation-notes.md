# Rose storefront implementation notes

The initial ivory editorial/handbag design was rejected and removed. The current design is pink, Arabic-first and focused on hijab/modest clothing. The live site and its public CMS/catalog were inspected read-only.

The existing optional catch-all route previously exported a helper that Next.js does not permit in route modules. Shared CMS rendering now lives in src/cms/renderCmsPage.tsx. Shopping/search/about/contact/cart imports use that shared module.

The homepage now goes through the published CMS resolver and preserves visibility, order, anchors, labels and both Hero actions. Simple sections receive the rose presentation; composed/native batches preserve the existing renderer and receive scoped CMS motion. This avoids refreshing all ScrollTriggers when the fabric chapter text changes. Configured child categories are included in mobile navigation.

The scarf scene uses procedural geometry, a deterministic woven texture and local lights. It loads near the section and pauses offscreen. Demand rendering serves reduced motion and explicit controls. The long sticky section is removed for reduced motion or disabled CMS scroll animation. An SVG scarf provides WebGL failure fallback.

Campaign images were generated with image_gen and copied into public/editorial as optimized WebP. Cairo is locally served with Arabic/Latin support and its OFL license. Previous unrelated campaign and handbag assets were removed. A local ignored .env.local points at the existing public backend for preview; automated tests override it with isolated fixtures.

Independent code review found lost CMS anchors, a discarded secondary Hero button, missing mobile child navigation, and suppressed native CMS motion. All were addressed. No confirmed remaining 3D lifecycle issue was reported.

Validation results are recorded after the final checks below.

Final verification:
- Full browser suite: 9 passed. After native-motion and saved-link fixes, 3 focused CMS/scroll cases passed. After the short-screen CSS adjustment, both mobile checks passed, covering all 10 browser cases.
- Admin Hero controls: 3 tests passed.
- Storefront TypeScript: passed; final production build passed.
- Admin production build: passed, output isolated under .tmp/admin-rose-build. Tracked legacy dist output was restored.
- Production preview with live public backend: 20 catalog products, WebGL ready, no browser page errors, no horizontal overflow. On 360x640, rotation control bottom is 624px and manual rotation works.
- Independent reviewer confirmed the native CMS motion fix.
- Local production preview runs at http://127.0.0.1:3000. Work remains uncommitted/unpushed on feat/cinematic-storefront. No live CMS or Vercel writes were performed.


Scroll / hijab refinement verification (2026-10-03):
- Inspected the referenced Apple iPhone 17 Pro page in Chrome: close-up hero, held camera scenes, large headings and progressive reveals. Applied the scroll rhythm to the rose campaign without copying Apple assets.
- Opening scene red/green: the new browser test failed on the missing scene, then passed after implementation. The full suite subsequently passed all 13 tests in 1.9 minutes, including reverse scroll, desktop-to-360x640 resizing, CMS motion disabled and no-JavaScript content.
- Storefront typecheck passed; production build passed with 17 generated pages.
- Visual review covered desktop/mobile opening close-up and arch, the original logo card, hijab front/back and rose/lilac/pearl colors. Fixed the bust protruding through the cape, smoothed normals at the hood's shared UV seam/pole, softened material sheen and checked short-screen purchase visibility.
- Independent review found SSR missing later fabric chapters and an overridden Arabic short-screen height. Fixed static-first chapter rendering/spacing and RTL specificity. Reviewer reported no remaining actionable issues.
- Ruling: keep procedural garment/display geometry and native lights rather than adding a downloaded model dependency; this preserves licensing, offline reliability and the existing lazy WebGL fallback.
- Local work is still uncommitted and unpushed. No live CMS configuration or deployment has been changed.

- Final production preview with the live public backend: 20 products; campaign frame measured 1612.8px at close-up and 655px after scrolling; no desktop/mobile horizontal overflow or browser page errors. On 360x640 the model rotation control bottom is 624px. Preview is running at http://127.0.0.1:3000 (next start).
