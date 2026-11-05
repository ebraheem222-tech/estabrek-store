# Motion and media controls for every customer template

The owner requested GSAP and Anime.js animation options in the CMS editor, 3D models, and video with a black or coloured opacity layer and content above it. The thousand templates and independent owned-design behavior remain intact.

Use the existing rich motion schema, GSAP implementation, Three.js model editor, video library and overlay styles. Add actual Anime.js execution selected by `motion.engine` (`gsap` or `anime`, optional with GSAP as legacy default). Keep viewport entry, text animation, scroll, hover and loops configurable; preserve reduced-motion, phone settings, editor play controls and cleanup when a page changes. Load Anime.js only when needed. Existing advanced drawing/physics features must retain their behavior; never silently lose selected effects.

All template previews/imports gain optional `motionEngine` and `motionPreset` query parameters. Presets are `original`, `none`, `calm`, `rich`. A shared plain-TypeScript helper clones nodes and applies these choices to home/header/footer, while leaving an unconfigured legacy import unchanged. Never put motion on page/legacy/linked-block nodes, and never change the original template objects. Editor controls offer the same page-wide profiles plus per-element engine choice.

Provide ready editable video-hero and 3D-showcase sections in the editor. The video section has an actual video node, black overlay at50% initially, and foreground text/button; the merchant picks their own media rather than inheriting Estabrek's film. Selected video elements show overlay colour/opacity controls close to media settings. Existing gradient/blending and responsive styles remain available.

3D sections use the existing built-in product models or the merchant's GLB, with pose, lighting, orbit/hover/scroll animation and interaction controls. Add an optional poster as a loading/error/reduced-device fallback; this must not load unrelated store artwork. Preserve lazy loading and context limits.

No database migration, account changes, deployment, commits or reset of existing customer designs. Validate backend persistence, shared profiles, all1000 template trees/imports, editor operations, real Anime.js browser movement and video overlay stacking, 3D fallback behavior and production builds.
