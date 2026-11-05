# Motion and media editor implementation plan

**Goal:** Expose real GSAP/Anime.js choices, ready animated media sections, 3D model controls and video overlays throughout the existing template/editor flow.

**Architecture:** Shared dependency-free profile transforms; optional validated `motion.engine`; lazy Anime.js adapter alongside the existing GSAP renderer; existing tree nodes/styles for video and3D sections. Frontend/admin bundles consume the same profile helper. Header/footer/home stay copied independent documents.

**Spec:** `docs/superpowers/specs/2026-11-05-motion-media-editor.md`

## Contracts and ownership

- Parent owns `shared/motionProfiles.ts`: `MotionEngine = 'gsap'|'anime'`, `MotionPreset = 'original'|'none'|'calm'|'rich'`, `MotionProfile = {engine?:MotionEngine,preset?:MotionPreset}`, `withMotionProfile<T extends ProfileNode>(nodes:readonly T[], options?:MotionProfile):T[]`. ProfileNode has id,type,props,optional children,motion. The helper recursively clones; no-options leaves values unchanged; original only sets engine on existing motion; none removes movement; calm/rich add appropriate motions to content, preserving non-motion data. Skip own motion on page/legacy/roseBlock/block. No engine on empty effects. Parent owns backend/Storefront schema, media fallback, public API/design-frame integration and tests.
- Runtime worker owns Storefront `TreeMotion.tsx`, new Anime adapter/modules/tests, and Storefront package/lockfile. Consume `TreeMotionSpec.engine?:'gsap'|'anime'`; use actual Anime.js tweening, same cleanup/editor/reduced-motion contracts. GSAP may remain the coordinator for pin/scroll geometry and existing specialized plugins. Keep existing exported motion math APIs/tests compatible.
- Editor worker owns Admin changes/tests/translations: engine selector in MotionPanel; shared page-motion application controls; media and poster fields; ready video-hero/3D-showcase insertions. Template API `getStoreTemplateImport(id, options?:MotionProfile)`, Picker optional `motionOptions` and `onMotionOptions`, preview queries `motionEngine`/`motionPreset`, SetupWizard passes selected profile. Imports of the shared helper from `src/studio`/`src/api` use `../../../shared/motionProfiles`.
- Parent adds backend `NodeMotion.engine` enum, video `label`, model3d `poster` safe media URL. Editor can persist these now-planned fields without schema drift. Video opacity remains `node.style[screen].overlay = {color,opacity,to?,angle?,blend?}` with opacity0..1. New section prefabs reuse node types and verified style tokens. Model3d poster is `props.poster` and label `props.label`.

## Tasks

- [x] Add failing persistence/profile tests; implement shared profiles and validated wire fields.
- [x] Parallel runtime work: Anime dependency, lazy engine adapter, actual movement/cleanup tests.
- [x] Parallel Admin work: engine/profile selection, video and3D section presets, overlay/poster controls, translations and tests.
- [x] Integrate public template previews/import profiles across all1000; add resilient poster loading/error behavior and accessible video labels.
- [x] Verify unit/API/browser behavior, existing page-tree animation regressions, all1000 gallery/live trees and1001 owned imports; fix demonstrated integration problems.
- [x] Review final changes, complete appropriate builds, update user documentation and ledger.

## Constraints and review focus

Preserve all existing uncommitted work; no commits/push/migrations/deployment. Only one engine may animate the same motion channel at a time. Route changes, streamed pages, repeated editor play and reduced-motion must not leak players/listeners or hide content. Do not silently rewrite all saved customer pages. Page-wide presets remain undoable ordinary draft operations. Never point customer media presets at Estabrek's own film. Explicitly validate unsupported/unsafe inputs rather than accepting arbitrary animation code or model URLs.

## Ledger

Inspection found rich GSAP effects, per-node motion presets, editable Three.js models, GLB library, and colour/gradient overlays already implemented. The work extends these systems rather than creating another renderer. User's comparison URL was inaccessible via browsing; official Anime.js documentation was retrieved. Default GSAP compatibility and optional merchant-selected Anime.js are implementation choices consistent with the request.

Completed50 Admin,36 Backend and59 distinct Storefront cases (145 total) across targeted batches. Review caught stale3D keys, partial undo/redo loss and legacy look profile coverage; all were corrected with schema/profile/history tests and a follow-up review. Browser tests demonstrate real Anime movement, reverse scroll, reduce-motion cleanup, an actual playable clip under colour overlays, poster fallback and preserved GSAP effects. Admin and Backend builds and Storefront standalone TypeScript pass; production Storefront build remains in progress. User guide and validation ledger are `docs/motion-media-editor-guide.md` and `docs/motion-media-validation.md`.

Final verification: Next production build exited0, including type checking and45 static pages. All three builds passed; Admin full TypeScript still reports only the documented baseline files. Generated Admin HTML restored, disposable fixture stopped, diff whitespace check clean. No deployment, migration or commits.
