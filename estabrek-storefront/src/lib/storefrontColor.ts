/**
 * Emitted only by a swatch selection, never by scroll or hover. `auto` marks
 * the colour a product page takes on its own when it opens (it still becomes
 * the shopper's colour, but Rose does not cheer for a pick nobody made). `mix` marks a colour tapped on a
 * shop card: it blends with the last ones she tapped there (lib/colourMix.ts, RoseThemeProvider).
 */
import { emitVisualInteraction } from "./visualInteractions";
export function selectStorefrontColor(color?: string | null, { auto = false, mix = false, source }: { auto?: boolean; mix?: boolean; source?: Element | null } = {}) {
  if (!color || typeof window === "undefined") return;
  const hex = color.startsWith("#") ? color : `#${color}`;
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    if (emitVisualInteraction("colorChange", { color: hex, auto, source: source ?? document.activeElement })) return;
    window.dispatchEvent(Object.assign(new CustomEvent("storefront-color-selected", { detail: hex }), { auto, mix }));
  }
}
