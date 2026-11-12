"use client";
/**
 * The cart and contact pages drawn when the store has no published page for them (renderCmsPage), scripts of their
 * own (renderCmsPage, reached from every page, imported them directly). See cinematic/homeScenes.tsx.
 */
import { earlyFrom } from "@/lib/earlyPart";

// Each part's script starts with the page, as the server draws it (lib/earlyPart.ts says why).
const early = earlyFrom("components/lazyFallbacks.tsx");

export const CartClient = early("./CartClient", () => import("./CartClient").then((m) => m.default));
export const FallbackContact = early("./FallbackContact", () => import("./FallbackContact").then((m) => m.default));
