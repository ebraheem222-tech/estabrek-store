# Full storefront theme on explicit color selection

The user's latest correction expands explicit product and 3D color selection from the navbar to the whole storefront. The existing model placement, scrolling behavior and Shop layout remain in place.

`storefrontPalette.ts` derives coordinated page, surface, accent, text and control-border colors from the selected swatch. The shell applies the palette to backgrounds, buttons, filters, headings, cards, footer and navbar. Shared selection tokens also reach quick view, accessibility and chat overlays rendered outside the shell. Real product images and swatch fills retain their original colors.

The selection listener is ready before interactive paint. Manual selection takes precedence over subsequent scroll palettes and persists while scrolling. Route changes clear it through the existing keyed shell. Home and Shop do not change palette on scroll; About and Contact retain their existing scroll palettes when no manual color is selected.

Text and button colors target at least 4.5:1 contrast; input and selected-control borders target at least 3:1. Light selections receive darker controls rather than white-on-pale buttons. Existing CSS colors remain fallbacks when no explicit selection is active.

## Verification

- All ten focused color-selection tests passed in `.tmp/full-theme-verified-tests.log`. They cover palette contrast, 3D selection persistence, Shop surfaces and filters, PDP and quick view, mobile filter positioning, category access and accessibility dialog colors.
- That run also included a navigation test which failed because the cold Next.js development compilation exceeded its URL timeout. The destination is now compiled before measuring navigation. Its separate rerun passed: `.tmp/full-theme-navigation-check.log` (1/1).
- The earlier broad suite had 40 passes and two failures. Both affected cases were subsequently corrected and passed in the focused reruns above; a new complete broad-suite run was not performed.
- The final production build passed, including lint and TypeScript checks: `.tmp/full-theme-production-build.log`.
- Live-catalog production inspection passed at desktop and phone widths. Shop selection changed the full palette and remained selected after scrolling; Home 3D selections changed the palette; About navigation cleared the selection and retained its scroll colors. No page errors or horizontal overflow occurred. The model controls fit the checked 360 x 640 viewport.
- Actual computed styles for representative chat markup were checked across black, white, navy, pearl, lilac and berry. Minimum notice contrast was 9.60:1 and heading contrast was 10.08:1. The configured live backend did not expose the chat panel, so this check exercised its real CSS with representative markup.
- Browser measurements are in `.tmp/full-theme-visual.json`. Screenshots include `.tmp/full-theme-shop-1440.png`, `.tmp/full-theme-shop-390.png`, `.tmp/full-theme-filters-mobile.png`, `.tmp/full-theme-model-lilac.png` and `.tmp/full-theme-model-pearl-mobile.png`.

The production preview is running at `http://127.0.0.1:3000`. These changes are local and uncommitted; this correction did not push to GitHub or deploy to Vercel.
