import { deepInk, dyeStops, flowPaint, hexToOklab, meshBackground } from "./colourMix";
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
 *
 * And each colour's hue and colourfulness (OKLCH), for the scenes that blend their own colour into the mix (a
 * world in gold, winter in blue): the rules take the scene's colour and turn it to these hues, keeping its
 * lightness, so its words read the same (relative colours, `oklch(from …)`):
 *   --mix-h1…3  the hue (degrees)
 *   --mix-c1…3  the colourfulness, calmed (at most 0.14)
 *   --mix-k1…3  1, or 0 for a colourless one (black, white, grey: the scene's colour goes grey there, not red)
 */
export const MIX_PAINTS = [
  "--mix-accent-paint", "--mix-ink-paint", "--mix-decor-paint", "--mix-soft-paint",
  "--mix-h1", "--mix-h2", "--mix-h3", "--mix-c1", "--mix-c2", "--mix-c3", "--mix-k1", "--mix-k2", "--mix-k3",
] as const;

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
  (dyeStops(mix) ?? []).forEach((hex, i) => {
    const { a, b } = hexToOklab(hex);
    const chroma = Math.hypot(a, b);
    const n = (i + 1) as 1 | 2 | 3;
    out[`--mix-h${n}`] = (((Math.atan2(b, a) * 180) / Math.PI + 360) % 360).toFixed(1);
    out[`--mix-c${n}`] = Math.min(0.14, chroma).toFixed(3);
    out[`--mix-k${n}`] = chroma < 0.03 ? "0" : "1";
  });
  return out;
}
