# Estabrek Four-Page Redesign Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution. The user approved implementation on 2026-10-03; work is being verified in the existing feature checkout.

**Goal:** Extend Estabrek's rose identity with scroll-driven palettes, a real campaign video and improved fabric 3D, and redesign Shop, Contact and About around their existing data and behavior.

**Architecture:** Build shared palette tokens and a scoped theme provider inside the existing storefront shell. Reuse the CMS resolver, video data type, catalog filters and contact submission service. Add rose presentation components for the three interior pages with native rendering retained for unsupported composed CMS sections.

**Tech Stack:** Existing Next.js 14/React 18, GSAP ScrollTrigger, Three.js/R3F, native HTML video and Playwright. No new scroll library is required.

**Spec:** ../specs/2026-10-03-estabrek-four-page-design.md

**Opening reference added 2026-10-03:** [Lady90s](https://lady90s.ps/) was inspected in Chrome. Its opening holds a full-screen canvas while the large wordmark recedes, the bottle rotates and its cap rises, and fragrance labels appear in successive chapters. Adapt that held scene and text choreography to Estabrek's draped hijab, combine it with the requested large-to-small ending, and add Estabrek's scroll palettes. The reference's opening background remains berry; palette changes are our proposed addition.

## Global constraints

- Preserve published CMS visibility, section order, anchors, custom form fields and actions.
- Preserve prices, availability, catalog filters and URL/back-button behavior.
- Arabic remains the default. Interface labels use the existing language context; authored CMS text keeps its original language.
- Every chapter is readable with reduced motion, disabled CMS animation or unavailable WebGL. Missing video has a usable poster and playback state.
- Product photos retain their original colors. Manual scarf color selection lasts until the next story chapter.
- Use one opening timeline and one heavy canvas. Keep the shop action available; preserve native wheel/touch scrolling. Respect `rose3dEnabled`, authored HERO content and CMS section order.
- Select an actual owned/licensed video before the video phase; record origin and rights in public/editorial/README.md.
- Test form delivery against fixtures; do not send real contact messages or mutate the live CMS during verification.
- Deployment is a later integration step; this plan does not publish the current working tree.

## Review focus

- Route changes must restore default palettes and remove prior triggers/inline style state.
- Rapid forward/reverse scroll and resize must retain text contrast and the correct scene color.
- Opening phase transitions must reverse cleanly; entering/leaving 3D must not produce empty frames, duplicate canvases, or two consecutive long pinned introductions.
- CMS composed Contact/RICH_TEXT sections and custom fields must remain available.
- Video autoplay refusal, network failure and low-motion preferences must retain a readable, controllable section.
- Rapid filter changes, empty results and network errors must preserve current product-state behavior.

## Task 1: Shared design and scroll palettes

**Files:** Create `src/components/cinematic/roseDesign.ts`, `RoseThemeProvider.tsx`, `ScrollPalette.tsx`, `RosePageFrame.tsx`. Modify `StorefrontChrome.tsx`, `RoseHome.tsx`, `RoseCmsHome.tsx`, `src/app/cinematic.css` and `tests/cinematic.spec.ts`.

**Interfaces:** `RosePaletteId = "pearl" | "blush" | "rose" | "lilac" | "berry"`. `RosePresentationOptions` contains optional `palette` and `motionIntensity: "subtle" | "cinematic"`. Each visible scene declares `data-rose-palette`; the page frame owns the controller. The provider supplies paired background/surface/text/muted/accent/border variables to the shell without rerendering React on every scroll frame.

- [x] Add a failing test: scroll through two differently tagged sections, compare computed background colors, reverse scroll and verify restoration.
- [x] Implement the palette tokens listed in the spec, interpolate with existing ScrollTrigger, and reset on route/preference/language changes.
- [x] Keep neutral card surfaces and readable foreground pairs while the page changes palette. Convert rose components' relevant hard-coded colors to variables.
- [x] Add the optional `data.rosePresentation` controls to `estabrek-admin/src/features/pages/SectionEditor.tsx`, preserving all existing section data. Mirror presentation types where needed in `src/cms/sectionTypes.ts`.
- [x] Verify preference-disabled/static states, route cleanup, resize, hidden/reordered CMS sections and readable contrast.

## Task 2: Lady90s-inspired opening, real campaign video and scarf choreography

**Files:** Create `src/components/cinematic/RoseVideoSection.tsx`. Modify `RoseCmsHome.tsx`, `RoseSections.tsx`, `ScrollOpening.tsx`, `DesignStudy.tsx`, `ScarfScene.tsx`, `HijabGeometry.ts`, `cinematic.css`, `public/editorial/README.md` and browser fixtures/tests. Reuse `VideoData` in `src/cms/sectionTypes.ts` and existing VIDEO controls.

**Interfaces:** `RoseVideoSection` consumes `VideoData` plus optional `RosePresentationOptions`. Extract the reusable scene/controls presentation from `DesignStudy` so it can consume the opening's normalized progress without creating another pin or canvas. Scene props retain manual rotation and add explicit automatic/manual cloth-color behavior; one opening timeline supplies the chapter, camera/framing progression and automatic color interpolation. Keep the existing standalone wrapper when the first CMS section cannot host the opening.

- [x] Prototype the hijab's front/back/side presentation with improved folds and material before locking the opening choreography. If the procedural geometry cannot meet the reviewed appearance, use an owned/licensed optimized garment model and record its provenance.
- [x] Add a failing opening test for the held viewport, receding Estabrek wordmark, successive chapter labels, model framing and final large-to-small transition. Cover forward/reverse scroll, resizing midway through a phase and the always-available shop action.
- [x] Build the single opening sequence described in the spec: 0–20% campaign/wordmark, 20–45% full hijab, 45–70% fabric detail, 70–85% full view and 85–100% smaller frame/release. Use the existing brand assets and editable Arabic/English labels; preserve the authored HERO title, actions and image.
- [x] Consolidate the optional model into the opening only when the first supported HERO allows it. Suppress the old standalone long model scene in that case. Keep the existing placement when the first section is unsupported and omit the model when CMS disables it; never rearrange published VIDEO/product sections.
- [x] Start with total opening height 300–350svh on desktop and 220–250svh on mobile, then tune against the prototype. Keep native scrolling and reduce to a compact, readable static composition for reduced motion, disabled CMS animation or missing JavaScript. Keep a matching campaign-image fallback for WebGL/loading failure.
- [x] Lazy-load the scene near the opening, retain the poster until the model is ready, pause offscreen rendering and verify that only one canvas is mounted. Do not require scene loading to reveal content or enable navigation.

- [x] Select an owned store clip or a licensed fabric clip, verify rights, create `public/editorial/rose-campaign-poster.webp` and optimize a muted 8–12-second `rose-campaign.mp4`. Keep `rose-campaign-mobile.mp4`; target at most 5MB for the selected mobile clip. CMS URLs can replace these defaults.
- [x] Add tests for playback refusal/error, visible pause/play controls and stopping playback outside the viewport.
- [x] Map simple VIDEO sections to the rose video presentation while retaining native rendering for composed blocks and non-MP4 providers. Video ordering follows CMS.
- [x] Animate the frame with scroll. Defer per-frame video seeking to a separate measured enhancement.
- [x] Add a failing test showing the active scarf color follows progress, manual selection remains usable, and reverse scrolling restores the earlier chapter color.
- [x] Improve cloth surfaces/UVs/materials and interpolate cloth color continuously from rose through lilac to pearl. Keep head/display materials unchanged; update fallback color and swatch state coherently.
- [x] Review isolated front/back/side renders and then the full scene on desktop and 360×640. Check geometry seams, clipping, color-control access and offscreen resource use.

## Task 3: Shop presentation

**Files:** Modify `src/app/shop/page.tsx`, `ShopBrowseClient.tsx`, `ShopResultsClient.tsx`, `ShopToolbar.tsx`, `ProductFiltersBar.tsx`, `MobileFiltersDrawer.tsx`, `FiltersChips.tsx`, `ProductTile.tsx` and `cinematic.css`. Create a small `RoseShopIntro.tsx` under cinematic components if needed.

**Interfaces:** Introduce an optional `appearance: "rose" | "default"` through the shop components, defaulting to existing behavior where used elsewhere. Preserve filter/query types and API requests.

- [x] Extend fixtures to cover category/color/size/price filters, sort, zero results, load-more and an API failure; add tests for resulting URLs and back/forward restoration.
- [x] Add the campaign intro and compact section/category bar. Restyle the actual grid and controls with 3:4 product imagery, legible prices and neutral surfaces.
- [x] Use existing add-to-cart/wishlist/product links. Show secondary photos and available-color details only when provided by the catalog.
- [x] Preserve desktop sidebar and mobile drawer behavior, focus trapping, Escape/focus restoration and selected-filter chips.
- [x] Keep page palettes restrained and hover effects lightweight; inspect 2-column mobile and 4-column desktop layouts plus long Arabic titles and decimal prices.

## Task 4: Contact

**Files:** Modify `src/app/contact/page.tsx`, `src/cms/renderCmsPage.tsx`. Create `RoseContact.tsx` and `RoseCmsInterior.tsx` under cinematic components. Reuse `src/lib/contactForm.ts` and existing data readers. Use `src/cms/renderer/PageRenderer.tsx` for native composed sections.

**Interfaces:** `RoseCmsInterior` receives resolved CMS sections, page kind and normalized public store data. `RoseContact` receives configured channels/form fields and submits through `submitContactMessage`. No fabricated contact defaults.

- [x] Add failing tests for published Contact content/fields/actions, fallback public contact links and missing optional channels.
- [x] Implement the split Contact layout, useful validation and submit/loading/success/error states while preserving configured field names and backend payloads.
- [x] Mock `/ugc/contact` in tests; verify error recovery and repeat submission without sending to production.
- [x] Adapt supported simple contact sections, retaining order/anchors/labels and native composed blocks. Honor cmsOverrideContact and ESTABREK_HOME_MODE=cms. Inspect the actual published RICH_TEXT and CONTACT combination.

## Task 5: About

**Files:** Modify `src/app/about/page.tsx`, `src/cms/renderCmsPage.tsx` and `RoseCmsInterior.tsx`. Create `RoseAbout.tsx` under cinematic components and extend browser fixtures/tests.

**Interfaces:** `RoseAbout` receives authored story/images/values or factual store-description fallback. The existing interior adapter gains About presentation using the same section and palette contract. Founder details and statistics require authored content.

- [ ] Add tests for About with/without published CMS content. Verify story order, native composed content, links, reduced-motion access and absence of the stock fake statistics.
- [x] Implement the About story with real logo and cloth imagery, three restrained palette/reveal scenes and shop/contact actions. Founder content appears only when authored.
- [x] Adapt supported simple About sections, retaining order/anchors/labels and native composed blocks. Honor cmsOverrideAbout and ESTABREK_HOME_MODE=cms.

About validation: bilingual factual fallback is covered in the browser; published About adaptation was reviewed through the shared interior adapter. The live CMS has no published About page, and a dedicated published-About browser fixture is not included.

## Task 6: Integrated review and handoff

- [x] Run `npm.cmd run typecheck`, targeted/full Playwright checks and `npm.cmd run build` from estabrek-storefront; run relevant Admin control tests and build into a separate temporary output directory.
- [x] Inspect all four pages in a live-data local preview. Check 360×640, 390×844, desktop, Arabic/English, keyboard input, reduced motion, video/GL failure and repeated navigation.
- [x] Measure initial JavaScript against the 350KiB target, video transfer/decode cost and long-frame behavior. Reduce assets, scene detail or optional effects where the measurement misses the target.
- [x] Request an independent read-only review of CMS preservation, resource/trigger cleanup, filter behavior, real contact delivery wiring and media failure paths.
- [x] Provide local preview and before/after screenshots. Summarize remaining asset/content needs and prepare the reviewed changes for the later GitHub/Vercel integration step.

Verification: ../verification/2026-10-03-estabrek-redesign.md. Local review is ready; publishing remains outside this plan.

## تنفيذ على مراحل قابلة للمراجعة

1. الهوية والألوان مع التمرير.
2. افتتاح مستوحى من Lady90s مع تصغير المشهد، ثم الفيديو ونموذج الحجاب المحسّن.
3. Shop والفلاتر والبطاقات.
4. Contact وAbout ومحتواهما الحقيقي.
5. التحقق الشامل والمعاينة وتجهيز النشر.

المدخل الأكثر أهمية: فيديو حملة حقيقي، ثم قصة المتجر/المؤسس إن أُريدت صفحة About شخصية. توجد حالياً أصول صور ونموذج إجرائي يمكن البناء عليهما.
