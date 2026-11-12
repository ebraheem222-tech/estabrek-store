"use client";
/**
 * The older sections' client parts, each a script of its own: a page loads only those of the sections it has.
 *
 * How the shop splits its script (2026-11-12): a client part imported directly by a file that every page draws
 * through (renderCmsPage, TreeNodeView, the old sections' renderer) went into every page's first load, the cart's
 * and a product's too (about 640 KB gzipped on each). Imported here, through lib/earlyPart.ts in a client file, each is
 * a script of its own that only the pages drawing it load (lib/earlyPart.ts starts it with the page there). They are still drawn on
 * the server. A dynamic import in a server file did not split them (Next 14 keeps every client part a server file
 * reaches in the page's first load).
 */
import { earlyFrom } from "@/lib/earlyPart";

// Each part's script starts with the page, as the server draws it (lib/earlyPart.ts says why).
const early = earlyFrom("cms/renderer/lazySections.tsx");

export const HeroSlider = early("./HeroSlider", () => import("./HeroSlider").then((m) => m.default));
export const NewsletterForm = early("@/components/NewsletterForm", () => import("@/components/NewsletterForm").then((m) => m.default));
export const FormSection = early("./sections/FormSection", () => import("./sections/FormSection").then((m) => m.FormSection));
export const TypewriterText = early("@/components/effects/TypewriterText", () => import("@/components/effects/TypewriterText").then((m) => m.TypewriterText));
export const HeroRenderer = early("./NativeThemeRenderers", () => import("./NativeThemeRenderers").then((m) => m.HeroRenderer));
export const ContactFormRenderer = early("./NativeThemeRenderers", () => import("./NativeThemeRenderers").then((m) => m.ContactFormRenderer));
export const FeatureRenderer = early("./NativeThemeRenderers", () => import("./NativeThemeRenderers").then((m) => m.FeatureRenderer));
export const PricingRenderer = early("./NativeThemeRenderers", () => import("./NativeThemeRenderers").then((m) => m.PricingRenderer));
export const SliderRenderer = early("./NativeThemeRenderers", () => import("./NativeThemeRenderers").then((m) => m.SliderRenderer));
export const StreamVideo = early("@/components/StreamVideo", () => import("@/components/StreamVideo").then((m) => m.StreamVideo));
export const SpotlightContainer = early("@/cms/spotlight-themes", () => import("@/cms/spotlight-themes").then((m) => m.SpotlightContainer));
export const ProductFiltersBar = early("@/components/ProductFiltersBar", () => import("@/components/ProductFiltersBar").then((m) => m.ProductFiltersBar));
