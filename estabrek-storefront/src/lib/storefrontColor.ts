/**
 * Emitted only by a swatch selection, never by scroll or hover. `auto` marks
 * the colour a product page takes on its own when it opens (it still becomes
 * the shopper's colour, but Rose does not cheer for a pick nobody made).
 */
import { emitVisualInteraction } from "./visualInteractions";
export function selectStorefrontColor(color?: string | null, { auto = false, source }: { auto?: boolean; source?: Element | null } = {}) {
  if (!color || typeof window === "undefined") return;
  const hex = color.startsWith("#") ? color : `#${color}`;
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    if (emitVisualInteraction("colorChange", { color: hex, auto, source: source ?? document.activeElement })) return;
    window.dispatchEvent(Object.assign(new CustomEvent("storefront-color-selected", { detail: hex }), { auto }));
  }
}
