# Scroll and Hijab Refinement Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add reversible big-to-small campaign scrolling and a recognizable draped 3D hijab while retaining the pink store identity.

**Architecture:** A scoped ScrollOpening wrapper owns the campaign ScrollTrigger and progressive enhancement. Static CMS sections remain intact. ScarfScene builds a reusable draped garment geometry and animates only its display group; DesignStudy retains its existing controls and chapter lifecycle.

**Tech Stack:** Next.js 14, React 18, GSAP, Three.js/R3F, Playwright.

**Spec:** ../specs/2026-10-03-scroll-and-hijab-refinement.md

## Constraints and review focus

- Preserve published CMS actions, visibility, order, product prices and navigation.
- Keep all content readable with reduced motion, disabled CMS motion, JavaScript unavailable or WebGL unavailable.
- Check responsive measurements after resizing and changing language.
- Keep manual rotation/color controls within a 360x640 viewport.
- Clean up timelines, textures and geometries on navigation.

## Task 1: Opening scene

- [x] Add and run a failing browser test comparing the campaign image width at the beginning and end of the held opening, and assert reverse scrolling restores the large view.
- [x] Create `src/components/cinematic/ScrollOpening.tsx`; wrap RoseHero's section, expose a stable `data-motion` attribute, and add responsive sticky CSS. Use scoped transforms and preserve static layout when animation is disabled.
- [x] Include the CMS logo in an arched brand card and preserve the current campaign image and actions.
- [x] Run the new test and existing CMS/navigation/reduced-motion checks.

## Task 2: Hijab display

- [x] Replace the thin ribbon in `ScarfScene.tsx` with a crown and cape surface, asymmetric scarf layers, rolled hems and a smooth display bust. Reuse geometries; limit cloth movement to subtle breathing of the garment group.
- [x] Improve the matching SVG fallback and update the display caption in `DesignStudy.tsx`.
- [x] Use scroll progress to reveal the full garment from a closer initial view and change the rotation. Check colors, manual rotation, WebGL fallback and short mobile controls.
- [x] Review desktop and mobile screenshots of the actual rendered model; correct visual defects before completion.

## Task 3: Validation

- [x] Run frontend typecheck, Playwright suite and production build, then inspect a live-data local preview.
- [x] Request a focused independent review of lifecycle, CMS preservation, disabled-motion behavior and responsive measurements.
- [x] Document verification and leave a working local preview for the user.
