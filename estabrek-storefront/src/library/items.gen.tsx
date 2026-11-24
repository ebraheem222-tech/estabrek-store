"use client";
// Made by scripts/library/convert.mjs: do not edit.
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export const LIB_COMPONENTS: Record<string, ComponentType> = {
  "site-maison": dynamic(() => import("./entries/site-maison")),
  "nav-glass-pill": dynamic(() => import("./entries/nav-glass-pill")),
  "hero-aurora": dynamic(() => import("./entries/hero-aurora")),
  "features-bento": dynamic(() => import("./entries/features-bento")),
  "cards-product": dynamic(() => import("./entries/cards-product")),
  "pricing-three": dynamic(() => import("./entries/pricing-three")),
  "testimonials-marquee": dynamic(() => import("./entries/testimonials-marquee")),
  "faq-classic": dynamic(() => import("./entries/faq-classic")),
  "cta-conic": dynamic(() => import("./entries/cta-conic")),
  "contact-split": dynamic(() => import("./entries/contact-split")),
  "footer-mega": dynamic(() => import("./entries/footer-mega")),
};
