/** Emitted only by an explicit swatch selection, never by scroll or hover. */
export function selectStorefrontColor(color?: string | null) {
  if (!color || typeof window === "undefined") return;
  const hex = color.startsWith("#") ? color : `#${color}`;
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: hex }));
  }
}
