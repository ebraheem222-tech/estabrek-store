"use client";
/**
 * The home's scenes, each a script of its own (only the home loads them).
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
const early = earlyFrom("components/cinematic/homeScenes.tsx");

export const RoseVideoSection = early("./RoseVideoSection", () => import("./RoseVideoSection").then((m) => m.RoseVideoSection));
export const RoseParticles = early("./RoseParticles", () => import("./RoseParticles").then((m) => m.RoseParticles));
export const RoseRooms = early("./RoseRooms", () => import("./RoseRooms").then((m) => m.RoseRooms));
export const RoseWorld = early("./RoseWorld", () => import("./RoseWorld").then((m) => m.RoseWorld));
export const RosePageHero = early("./RosePageHero", () => import("./RosePageHero").then((m) => m.RosePageHero));
export const RoseStoryMode = early("./RoseStoryMode", () => import("./RoseStoryMode").then((m) => m.RoseStoryMode));
export const RoseSeasons = early("./RoseSeasons", () => import("./RoseSeasons").then((m) => m.RoseSeasons));
export const RoseCollectionStory = early("./RoseCollectionStory", () => import("./RoseCollectionStory").then((m) => m.RoseCollectionStory));
