"use client";
/**
 * A store theme's home parts, scripts of their own: only a store under a store theme loads them (ThemedHome, a
 * server file every page reaches, imported them directly, and every page of every store loaded them).
 * See components/cinematic/homeScenes.tsx for how the shop splits its script.
 */
import { earlyFrom } from "@/lib/earlyPart";

// Each part's script starts with the page, as the server draws it (lib/earlyPart.ts says why).
const early = earlyFrom("storeThemes/home/lazyHome.tsx");

export const ThemeHero = early("./heroes", () => import("./heroes").then((m) => m.ThemeHero));
export const DesignOpening = early("./openings", () => import("./openings").then((m) => m.DesignOpening));
export const DesignSignature = early("./signatures", () => import("./signatures").then((m) => m.DesignSignature));
export const StageHero = early("./StageHero", () => import("./StageHero").then((m) => m.StageHero));
export const ThCollections = early("./sections", () => import("./sections").then((m) => m.ThCollections));
export const ThCta = early("./sections", () => import("./sections").then((m) => m.ThCta));
export const ThDivider = early("./sections", () => import("./sections").then((m) => m.ThDivider));
export const ThFaq = early("./sections", () => import("./sections").then((m) => m.ThFaq));
export const ThMarquee = early("./sections", () => import("./sections").then((m) => m.ThMarquee));
export const ThPanel = early("./sections", () => import("./sections").then((m) => m.ThPanel));
export const ThProducts = early("./sections", () => import("./sections").then((m) => m.ThProducts));
export const ThTestimonials = early("./sections", () => import("./sections").then((m) => m.ThTestimonials));
export const ThVideo = early("./sections", () => import("./sections").then((m) => m.ThVideo));
