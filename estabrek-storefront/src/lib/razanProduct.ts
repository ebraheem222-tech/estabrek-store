/**
 * The piece on screen, shared with Razan (her guided ordering starts from it),
 * and how undecided the shopper seems on it (colours/sizes picked back and forth).
 */
import type { CatalogProduct } from "./catalog";

export const RAZAN_PRODUCT_EVENT = "razan:product";
export const RAZAN_HESITATION_EVENT = "razan:hesitation";

let current: CatalogProduct | null = null;
let picks = 0;
let selection: { color?: string; size?: string } = {};

export function setRazanProduct(p: CatalogProduct | null) {
  current = p;
  picks = 0;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(RAZAN_PRODUCT_EVENT));
}

export function razanProduct() {
  return current;
}

/** A colour or size was picked; after a few, Razan may offer help sooner. */
export function notePick() {
  picks++;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(RAZAN_HESITATION_EVENT, { detail: picks }));
}

/** The colour (item key) and size the page has selected now, so Razan starts from them. */
export function setRazanSelection(color?: string, size?: string) {
  selection = { color, size };
}

export function razanSelection() {
  return selection;
}
