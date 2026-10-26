// ============================================================
// ESTABREK SCROLL ANIMATION HOOK
// ============================================================
// React hooks for GSAP scroll-triggered animations
// SSR-safe with automatic cleanup
// ============================================================

"use client";

import { useEffect, useRef, useCallback } from "react";
import type { AnimPreset, EasingPreset } from "@/cms/style/tokens";
import {
  type AnimationConfig,
  createScrollAnimation,
  isStaggerAnimation,
  isContinuousAnimation,
  isParallaxAnimation,
  getAnimationPreset,
  DEFAULT_MOTION_BY_SECTION_TYPE,
} from "./gsapPresets";

// ============================================================
// MAIN SCROLL ANIMATION HOOK
// ============================================================

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  config: AnimationConfig
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const animationRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ref.current || config.preset === "none") return;

    let gsap: any;
    let ScrollTrigger: any;

    const init = async () => {
      try {
        // Dynamic import for SSR safety
        const gsapModule = await import("gsap");
        gsap = gsapModule.gsap || gsapModule.default;
        
        const stModule = await import("gsap/ScrollTrigger");
        ScrollTrigger = stModule.ScrollTrigger;
        
        gsap.registerPlugin(ScrollTrigger);

        if (!ref.current) return;

        // Create the animation
        animationRef.current = createScrollAnimation(
          ref.current,
          config,
          gsap,
          ScrollTrigger
        );
      } catch (error) {
        console.warn("GSAP animation failed to initialize:", error);
      }
    };

    // Use requestAnimationFrame to defer initialization
    requestAnimationFrame(() => {
      init();
    });

    return () => {
      if (animationRef.current) {
        if (typeof animationRef.current.kill === "function") {
          animationRef.current.kill();
        }
        animationRef.current = null;
      }
    };
  }, [config.preset, config.duration, config.delay, config.easing, config.threshold, config.once]);

  return ref;
}

// ============================================================
// SIMPLIFIED PRESET HOOKS
// ============================================================

export function useFadeUp(duration = 0.8, delay = 0) {
  return useScrollAnimation({ preset: "fade-up", duration, delay });
}

export function useFadeIn(duration = 0.8, delay = 0) {
  return useScrollAnimation({ preset: "fade-in", duration, delay });
}

export function useZoomIn(duration = 0.8, delay = 0) {
  return useScrollAnimation({ preset: "zoom-in", duration, delay });
}

export function useScaleIn(duration = 0.8, delay = 0) {
  return useScrollAnimation({ preset: "scale-in", duration, delay });
}

export function useSlideUp(duration = 0.8, delay = 0) {
  return useScrollAnimation({ preset: "slide-up", duration, delay });
}

export function useStaggerFade(stagger = 0.1, duration = 0.6) {
  return useScrollAnimation({ preset: "stagger-fade", stagger, duration });
}

export function useStaggerScale(stagger = 0.1, duration = 0.6) {
  return useScrollAnimation({ preset: "stagger-scale", stagger, duration });
}

export function useParallax(speed: "slow" | "fast" = "slow") {
  return useScrollAnimation({ 
    preset: speed === "fast" ? "parallax-fast" : "parallax-slow",
    scrub: true
  });
}

// ============================================================
// ANIMATED SECTION HOOK
// ============================================================

export type AnimatedSectionConfig = {
  sectionType?: string;
  motion?: Partial<AnimationConfig>;
  staggerSelector?: string;
  disabled?: boolean;
};

export function useAnimatedSection<T extends HTMLElement = HTMLDivElement>(
  config: AnimatedSectionConfig = {}
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const animationRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ref.current || config.disabled) return;

    // Determine animation preset
    const defaultPreset = config.sectionType
      ? DEFAULT_MOTION_BY_SECTION_TYPE[config.sectionType] || "fade-up"
      : "fade-up";
    
    const preset = config.motion?.preset || defaultPreset;
    if (preset === "none") return;

    let gsap: any;
    let ScrollTrigger: any;

    const init = async () => {
      try {
        const gsapModule = await import("gsap");
        gsap = gsapModule.gsap || gsapModule.default;
        
        const stModule = await import("gsap/ScrollTrigger");
        ScrollTrigger = stModule.ScrollTrigger;
        
        gsap.registerPlugin(ScrollTrigger);

        if (!ref.current) return;

        const fullConfig: AnimationConfig = {
          preset,
          duration: config.motion?.duration ?? 0.8,
          delay: config.motion?.delay ?? 0,
          easing: config.motion?.easing ?? "power3.out",
          stagger: config.motion?.stagger ?? 0.1,
          staggerDir: config.motion?.staggerDir ?? "start",
          threshold: config.motion?.threshold ?? 0.2,
          once: config.motion?.once ?? true,
          scrub: config.motion?.scrub ?? false,
        };

        // If stagger animation, handle children
        if (isStaggerAnimation(preset) && config.staggerSelector) {
          const children = ref.current.querySelectorAll(config.staggerSelector);
          if (children.length > 0) {
            const animPreset = getAnimationPreset(preset);
            const staggerConfig: any = { amount: (fullConfig.stagger ?? 0.1) * children.length };
            
            if (fullConfig.staggerDir === "end") staggerConfig.from = "end";
            else if (fullConfig.staggerDir === "center") staggerConfig.from = "center";

            gsap.set(children, animPreset.from);
            animationRef.current = gsap.to(children, {
              ...animPreset.to,
              duration: fullConfig.duration,
              delay: fullConfig.delay,
              ease: fullConfig.easing,
              stagger: staggerConfig,
              scrollTrigger: {
                trigger: ref.current,
                start: `top ${100 - (fullConfig.threshold ?? 0.2) * 100}%`,
                toggleActions: fullConfig.once ? "play none none none" : "play reverse play reverse",
              },
            });
            return;
          }
        }

        // Standard animation
        animationRef.current = createScrollAnimation(
          ref.current,
          fullConfig,
          gsap,
          ScrollTrigger
        );
      } catch (error) {
        console.warn("Animated section failed to initialize:", error);
      }
    };

    requestAnimationFrame(() => {
      init();
    });

    return () => {
      if (animationRef.current) {
        if (typeof animationRef.current.kill === "function") {
          animationRef.current.kill();
        }
        animationRef.current = null;
      }
    };
  }, [
    config.sectionType,
    config.motion?.preset,
    config.motion?.duration,
    config.motion?.delay,
    config.motion?.easing,
    config.motion?.stagger,
    config.motion?.threshold,
    config.motion?.once,
    config.disabled,
  ]);

  return ref;
}

// ============================================================
// UTILITY HOOKS
// ============================================================

export function useScrollTriggerRefresh() {
  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    
    try {
      const stModule = await import("gsap/ScrollTrigger");
      const ScrollTrigger = stModule.ScrollTrigger;
      ScrollTrigger.refresh();
    } catch {
      // Ignore
    }
  }, []);

  return refresh;
}

export function useCleanupAnimations() {
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      }).catch(() => {
        // Ignore
      });
    };
  }, []);
}

// ============================================================
// INTERSECTION OBSERVER FALLBACK
// ============================================================

export function useIntersectionAnimation<T extends HTMLElement = HTMLDivElement>(
  options: {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
    animationClass?: string;
  } = {}
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const {
    threshold = 0.2,
    rootMargin = "0px",
    once = true,
    animationClass = "animate-in",
  } = options;

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(animationClass);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            entry.target.classList.remove(animationClass);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once, animationClass]);

  return ref;
}
