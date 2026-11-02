/**
 * The page's colour names (text, accent, surface…) as one theme's colours, for drawing a
 * template small in the store's own look (TemplateThumb).
 */
export type ThumbColours = Record<"bg" | "surface" | "text" | "muted" | "accent" | "accent-soft" | "accent-contrast" | "border", string>;
/** The rose design's colours (a store without a theme). */
export const ROSE_COLOURS: ThumbColours = { bg: "#fff8f4", surface: "#ffffff", text: "#462c3b", muted: "#8b6d7b", accent: "#a43b64", "accent-soft": "#f7dbe6", "accent-contrast": "#ffffff", border: "#efdde5" };
/** A theme's palette (the shop's storeThemes/colour.ts Palette) as the page's colour names. */
export function coloursOf(p: Record<string, string> | undefined): ThumbColours {
  if (!p) return ROSE_COLOURS;
  const pick = (k: string, fallback: string) => (typeof p[k] === "string" && /^#[0-9a-f]{3,8}$/i.test(p[k]) ? p[k] : fallback);
  return {
    bg: pick("bg", ROSE_COLOURS.bg), surface: pick("surface", ROSE_COLOURS.surface), text: pick("ink", ROSE_COLOURS.text), muted: pick("muted", ROSE_COLOURS.muted),
    accent: pick("strong", pick("accent", ROSE_COLOURS.accent)), "accent-soft": pick("soft", ROSE_COLOURS["accent-soft"]), "accent-contrast": pick("onStrong", "#ffffff"), border: pick("line", ROSE_COLOURS.border),
  };
}
