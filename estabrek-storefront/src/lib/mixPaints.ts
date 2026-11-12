import { deepInk, flowPaint, meshBackground } from "./colourMix";
import { storefrontPalette } from "./storefrontPalette";

/**
 * The paints the store wears with a mix of colours (RoseThemeProvider writes them on the page; the rules are
 * at the end of app/rose-showcase.css). Each one is made of every colour's own version of a part of the theme,
 * so it reads wherever that part does:
 *   --mix-accent-paint  each colour's button colour (white text reads on all of it): buttons, the top bar,
 *                       the hero's words, prices, the active tab and dots
 *   --mix-ink-paint     each colour, deep (lib/colourMix.ts deepInk): the big headings
 *   --mix-decor-paint   each colour's soft decorative tint: the footer's big name
 *   --mix-soft-paint    a light mesh of the colours: the footer
 * A paint the mix can't make (its colours came out the same, e.g. two near-blacks) is left out: the rules
 * fall back to the theme's one colour.
 */
export const MIX_PAINTS = ["--mix-accent-paint", "--mix-ink-paint", "--mix-decor-paint", "--mix-soft-paint"] as const;

export function mixPaints(mix: string[]): Partial<Record<(typeof MIX_PAINTS)[number], string>> {
  const palettes = mix.map((c) => storefrontPalette(c));
  const out: Partial<Record<(typeof MIX_PAINTS)[number], string>> = {};
  const put = (name: (typeof MIX_PAINTS)[number], value: string) => {
    if (value !== "none") out[name] = value;
  };
  put("--mix-accent-paint", flowPaint(palettes.map((p) => p["--selection-accent"])));
  // Headings run several lines: the colours flow down them (across, a wide heading showed only one end).
  put("--mix-ink-paint", flowPaint(mix.map((c) => deepInk(c)), 170));
  put("--mix-decor-paint", flowPaint(palettes.map((p) => p["--selection-decorative"])));
  put("--mix-soft-paint", meshBackground(mix, { light: 0.72 }));
  return out;
}
