// ============================================================
// ESTABREK GSAP ANIMATION SYSTEM
// ============================================================
// Comprehensive GSAP animation presets for CMS sections
// Supports scroll-triggered animations, stagger, parallax, and continuous
// ============================================================

import type { AnimPreset, EasingPreset } from "@/cms/style/tokens";

export type MotionPreset = "none" | "reveal" | "stagger" | "parallax" | "pin";

// ============================================================
// ANIMATION FROM/TO DEFINITIONS
// ============================================================

export type AnimationFromTo = {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
};

export const ANIMATION_PRESETS: Record<AnimPreset, AnimationFromTo> = {
  "none": { from: {}, to: {} },
  
  // Fade animations
  "fade-in": {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  "fade-up": {
    from: { opacity: 0, y: 40 },
    to: { opacity: 1, y: 0 },
  },
  "fade-down": {
    from: { opacity: 0, y: -40 },
    to: { opacity: 1, y: 0 },
  },
  "fade-left": {
    from: { opacity: 0, x: 40 },
    to: { opacity: 1, x: 0 },
  },
  "fade-right": {
    from: { opacity: 0, x: -40 },
    to: { opacity: 1, x: 0 },
  },
  
  // Zoom animations
  "zoom-in": {
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1 },
  },
  "zoom-out": {
    from: { opacity: 0, scale: 1.2 },
    to: { opacity: 1, scale: 1 },
  },
  
  // Slide animations
  "slide-up": {
    from: { y: 80, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  "slide-down": {
    from: { y: -80, opacity: 0 },
    to: { y: 0, opacity: 1 },
  },
  "slide-left": {
    from: { x: 80, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  "slide-right": {
    from: { x: -80, opacity: 0 },
    to: { x: 0, opacity: 1 },
  },
  
  // Scale animations
  "scale-in": {
    from: { scale: 0.5, opacity: 0 },
    to: { scale: 1, opacity: 1 },
  },
  "scale-up": {
    from: { scale: 0.9, y: 20, opacity: 0 },
    to: { scale: 1, y: 0, opacity: 1 },
  },
  
  // Rotate animations
  "rotate-in": {
    from: { rotation: -15, opacity: 0, scale: 0.9 },
    to: { rotation: 0, opacity: 1, scale: 1 },
  },
  
  // Flip animations
  "flip-up": {
    from: { rotationX: 90, opacity: 0 },
    to: { rotationX: 0, opacity: 1 },
  },
  "flip-left": {
    from: { rotationY: -90, opacity: 0 },
    to: { rotationY: 0, opacity: 1 },
  },
  
  // Bounce & elastic
  "bounce-in": {
    from: { scale: 0.3, opacity: 0 },
    to: { scale: 1, opacity: 1, ease: "bounce.out" },
  },
  "elastic-in": {
    from: { scale: 0.5, opacity: 0 },
    to: { scale: 1, opacity: 1, ease: "elastic.out(1, 0.3)" },
  },
  
  // Blur animation
  "blur-in": {
    from: { opacity: 0, filter: "blur(10px)" },
    to: { opacity: 1, filter: "blur(0px)" },
  },
  
  // Reveal animations (with clip-path)
  "reveal-up": {
    from: { clipPath: "inset(100% 0% 0% 0%)", opacity: 0 },
    to: { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 },
  },
  "reveal-left": {
    from: { clipPath: "inset(0% 100% 0% 0%)", opacity: 0 },
    to: { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 },
  },
  
  // Stagger animations (children will be animated)
  "stagger-fade": {
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0 },
  },
  "stagger-slide": {
    from: { opacity: 0, x: 50 },
    to: { opacity: 1, x: 0 },
  },
  "stagger-scale": {
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1 },
  },
  
  // Parallax (scrub linked to scroll)
  "parallax-slow": {
    from: { y: 0 },
    to: { y: -50 },
  },
  "parallax-fast": {
    from: { y: 0 },
    to: { y: -100 },
  },
  
  // Continuous animations (looping)
  "float": {
    from: { y: 0 },
    to: { y: -10, repeat: -1, yoyo: true, duration: 2 },
  },
  "pulse": {
    from: { scale: 1 },
    to: { scale: 1.05, repeat: -1, yoyo: true, duration: 1.5 },
  },
};

// ============================================================
// DEFAULT MOTION BY SECTION TYPE
// ============================================================

export const DEFAULT_MOTION_BY_SECTION_TYPE: Record<string, AnimPreset> = {
  HERO: "fade-up",
  BANNER: "fade-in",
  RICH_TEXT: "fade-up",
  FAQ: "stagger-fade",
  TESTIMONIALS: "stagger-fade",
  CTA: "zoom-in",
  CARDS: "stagger-scale",
  IMAGE_GALLERY: "stagger-fade",
  VIDEO: "scale-in",
  NEWSLETTER: "fade-up",
  FEATURED_PRODUCTS: "stagger-fade",
  GRID: "stagger-fade",
  CATEGORY_TILES: "stagger-fade",
  PRODUCT_GRID: "stagger-fade",
  PRODUCT_SLIDER: "fade-in",
  STATS: "stagger-scale",
  PRICING: "stagger-fade",
  TEAM: "stagger-fade",
  LOGOS: "fade-in",
};

// Luxury-ish defaults (calm motion)
export const MOTION_DEFAULTS = {
  y: 14,
  duration: 0.6,
  stagger: 0.1,
  ease: "power2.out" as const,
} as const;

// ============================================================
// EASING PRESETS
// ============================================================

export const EASING_OPTIONS: Record<EasingPreset, string> = {
  "power1.out": "power1.out",
  "power2.out": "power2.out",
  "power3.out": "power3.out",
  "power4.out": "power4.out",
  "back.out(1.7)": "back.out(1.7)",
  "elastic.out(1, 0.3)": "elastic.out(1, 0.3)",
  "bounce.out": "bounce.out",
  "circ.out": "circ.out",
  "expo.out": "expo.out",
  "sine.out": "sine.out",
};

// ============================================================
// ANIMATION CONFIG TYPE
// ============================================================

export type AnimationConfig = {
  preset: AnimPreset;
  duration?: number;
  delay?: number;
  easing?: EasingPreset;
  stagger?: number;
  staggerDir?: "start" | "end" | "center" | "edges" | "random";
  threshold?: number;
  once?: boolean;
  scrub?: boolean;
  markers?: boolean; // Debug only
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function isStaggerAnimation(preset: AnimPreset): boolean {
  return preset.startsWith("stagger-");
}

export function isParallaxAnimation(preset: AnimPreset): boolean {
  return preset.startsWith("parallax-");
}

export function isContinuousAnimation(preset: AnimPreset): boolean {
  return preset === "float" || preset === "pulse";
}

export function getAnimationPreset(preset: AnimPreset): AnimationFromTo {
  return ANIMATION_PRESETS[preset] || ANIMATION_PRESETS["none"];
}

// ============================================================
// SCROLL TRIGGER ANIMATION CREATOR
// ============================================================

/**
 * Creates a GSAP ScrollTrigger animation for an element
 * Should be called client-side only
 */
export function createScrollAnimation(
  element: Element,
  config: AnimationConfig,
  gsap: any,
  ScrollTrigger: any
): gsap.core.Tween | gsap.core.Timeline | null {
  if (!element || !gsap || !ScrollTrigger || config.preset === "none") {
    return null;
  }

  const preset = getAnimationPreset(config.preset);
  const duration = config.duration ?? 0.8;
  const delay = config.delay ?? 0;
  const ease = config.easing ?? "power3.out";
  const threshold = config.threshold ?? 0.2;
  const once = config.once ?? true;

  // Continuous animations (no ScrollTrigger)
  if (isContinuousAnimation(config.preset)) {
    return gsap.to(element, {
      ...preset.to,
      duration: (preset.to as any).duration ?? duration,
    });
  }

  // Parallax animations (scrub linked to scroll)
  if (isParallaxAnimation(config.preset)) {
    return gsap.fromTo(element, preset.from, {
      ...preset.to,
      scrollTrigger: {
        trigger: element,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
        markers: config.markers ?? false,
      },
    });
  }

  // Standard scroll-triggered animation
  const scrollTriggerConfig: any = {
    trigger: element,
    start: `top ${100 - threshold * 100}%`,
    toggleActions: once ? "play none none none" : "play reverse play reverse",
    markers: config.markers ?? false,
  };

  // Stagger animation for children
  if (isStaggerAnimation(config.preset)) {
    const stagger = config.stagger ?? 0.1;
    const staggerConfig: any = { amount: stagger * 5 };
    
    if (config.staggerDir === "end") staggerConfig.from = "end";
    else if (config.staggerDir === "center") staggerConfig.from = "center";
    else if (config.staggerDir === "edges") staggerConfig.from = "edges";
    else if (config.staggerDir === "random") staggerConfig.from = "random";

    const children = element.querySelectorAll("[data-stagger-item], > *");
    if (children.length === 0) {
      // Fall back to animating the element itself
      return gsap.fromTo(element, preset.from, {
        ...preset.to,
        duration,
        delay,
        ease,
        scrollTrigger: scrollTriggerConfig,
      });
    }

    gsap.set(children, preset.from);
    return gsap.to(children, {
      ...preset.to,
      duration,
      delay,
      ease,
      stagger: staggerConfig,
      scrollTrigger: scrollTriggerConfig,
    });
  }

  // Standard animation
  gsap.set(element, preset.from);
  return gsap.to(element, {
    ...preset.to,
    duration,
    delay,
    ease,
    scrollTrigger: scrollTriggerConfig,
  });
}

// ============================================================
// CLEANUP UTILITIES
// ============================================================

export function killAllScrollTriggers(ScrollTrigger: any): void {
  if (ScrollTrigger) {
    ScrollTrigger.getAll().forEach((trigger: any) => trigger.kill());
  }
}

export function refreshScrollTriggers(ScrollTrigger: any): void {
  if (ScrollTrigger) {
    ScrollTrigger.refresh();
  }
}
