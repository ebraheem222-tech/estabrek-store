# Storefront color and shop correction

The navbar-only color behavior recorded here was superseded by the user's later request for a full coordinated theme. See [verification on 2026-10-04](2026-10-04-estabrek-full-color-theme.md) for the current behavior and checks. The placement and Shop corrections below remain in effect.

The user's correction replaces the opening-embedded fabric model and scroll-driven Home/Shop palettes from the earlier four-page design. About and Contact keep their existing scroll palettes and presentation.

Home now inserts the standalone fabric study after its first visible product section. If no product section exists, it follows the first Hero; the published 3D visibility flag and authored story words still apply. The fallback homepage follows the same placement. Home stays blush and Shop stays pearl while scrolling. Cloth color changes only when its swatch is selected, and a later chapter never resets that selection.

Explicit color selections from 3D, product cards, product galleries, buy boxes, quick-add drawers and quick view emit a validated color event. The shell updates only navbar variables and computes readable text. Route changes clear the manual navbar selection through the existing keyed shell. Product-card selections also keep their selected preview image after pointer leave.

Shop has a compact campaign, larger rectangular garment images, category pills and a scrollable desktop filter sidebar. Child categories remain available through the sidebar tree; phones and tablets use the existing focus-trapped drawer. GSAP reveals product cards once and animates the drawer, respecting reduced motion and the CMS motion setting. Rose cards no longer update tilt values on every pointer move. Safe GSAP layout refreshes defer until scrolling settles instead of interrupting native smooth navigation.

The focused static review found a missing desktop child-category path, which was restored. Its follow-up found no remaining Important/Critical issues. Earlier embedded-model screenshots and measurements belong to the earlier design; current captures and verification are recorded below after the final run.

## Verification on 2026-10-03

- Full browser suite: 40/40 passed before the final mobile filter positioning correction (`.tmp/selection-complete-suite.log`).
- The added mobile positioning regression failed before the fix: the toggle began at y=565.44 while the category row ended at y=659.44. The Rose button now clears the inherited fixed-button offsets.
- After that CSS correction, all seven color-selection tests passed, including mobile/tablet layout, drawer filtering, desktop child categories, product detail, quick view and persistence of the chosen 3D color (`.tmp/selection-mobile-regression-green.log`).
- TypeScript check passed; the final production build and `git diff --check` exited successfully. The build emitted nonfatal Windows fetch-cache EBUSY warnings (`.tmp/selection-production-build-final.log`).
- Chrome inspection of the final production preview used the configured live catalog. Home and Shop backgrounds remained stable, an explicit dark product swatch produced a dark navbar with white text, About retained its scroll palettes, and the Home canvas appeared only in the standalone study. No browser page errors or horizontal overflow were observed at the checked desktop and phone sizes.
- At 390px width, the mobile filter button sits below categories and its drawer closes with Escape. At 360×640, the 3D rotation controls fit the viewport (bottom=624px) and rotation responds.

Current local screenshots: `.tmp/selection-shop-desktop.png`, `.tmp/selection-shop-products.png`, `.tmp/selection-shop-mobile.png`, `.tmp/selection-filters-mobile.png`, `.tmp/selection-model-desktop.png`, `.tmp/selection-model-mobile.png`. Browser measurements: `.tmp/selection-visual-check.json`.

The preview is served at `http://127.0.0.1:3000`. These changes remain local and uncommitted; no GitHub push or Vercel deployment was performed in this correction.
