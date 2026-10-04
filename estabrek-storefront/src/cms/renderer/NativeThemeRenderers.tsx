"use client";
import dynamic from "next/dynamic";

// A client boundary lets Next split unused template libraries. Keep default SSR
// so selected templates still produce their authored HTML on the server.
export const HeroRenderer = dynamic(() => import("../hero-themes").then(module => module.HeroRenderer));
export const ContactFormRenderer = dynamic(() => import("../contact-forms").then(module => module.ContactFormRenderer));
export const FeatureRenderer = dynamic(() => import("../feature-themes").then(module => module.FeatureRenderer));
export const PricingRenderer = dynamic(() => import("../pricing-themes").then(module => module.PricingRenderer));
export const SliderRenderer = dynamic(() => import("../slider-themes").then(module => module.SliderRenderer));
