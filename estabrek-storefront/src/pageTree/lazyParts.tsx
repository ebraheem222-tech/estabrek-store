"use client";
/**
 * The parts of each kind of page-tree element (TreeNodeView draws them), each a script of its own: a page loads only
 * those of the elements it has (the shop's filters, the product page, the drawn backgrounds, the 3D, the sliders…).
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
const early = earlyFrom("pageTree/lazyParts.tsx");

export const ProductDetail = early("@/components/ProductDetail", () => import("@/components/ProductDetail").then((m) => m.default));
export const SceneView = early("./SceneView", () => import("./SceneView").then((m) => m.SceneView));
export const Model3dSpot = early("./Model3dSpot", () => import("./Model3dSpot").then((m) => m.Model3dSpot));
export const PopupView = early("./Interactive", () => import("./Interactive").then((m) => m.PopupView));
export const SpinView = early("@/components/cinematic/ProductSpin", () => import("@/components/cinematic/ProductSpin").then((m) => m.SpinView));
export const SliderControls = early("./SliderControls", () => import("./SliderControls").then((m) => m.SliderControls));
export const InstrumentView = early("./InstrumentView", () => import("./InstrumentView").then((m) => m.InstrumentView));
export const ClockView = early("./ClockView", () => import("./ClockView").then((m) => m.ClockView));
export const ScheduleView = early("./ReferenceDataViews", () => import("./ReferenceDataViews").then((m) => m.ScheduleView));
export const ComparisonView = early("./ReferenceDataViews", () => import("./ReferenceDataViews").then((m) => m.ComparisonView));
export const DeckView = early("./DeckView", () => import("./DeckView").then((m) => m.DeckView));
export const ShowcaseView = early("./ShowcaseView", () => import("./ShowcaseView").then((m) => m.ShowcaseView));
export const CommerceShop = early("./CommerceShop", () => import("./CommerceShop").then((m) => m.CommerceShop));
