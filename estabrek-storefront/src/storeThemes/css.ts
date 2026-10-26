/**
 * A theme as CSS: the rose design's colours repainted (--st-<hex>, see postcss/theme-tokens.cjs),
 * the theme's own variables for its home sections (--th-*), its fonts and corners.
 * One <style> per page, from the layout (or the admin's preview).
 */
import { mix, remapRose, type Palette } from "./colour";
import { THEME_FONT_FILES } from "./fonts.gen";
import { ROSE_COLOURS } from "./roseColours.gen";
import type { StoreTheme } from "./types";

export function themePalette(theme: StoreTheme, mode?: "light" | "dark" | null): { palette: Palette; mode: "light" | "dark" } {
  const want = mode ?? theme.mode;
  const palette = theme.palettes[want] ?? theme.palettes[theme.mode]!;
  return { palette, mode: theme.palettes[want] ? want : theme.mode };
}

const SHADOW: Record<StoreTheme["shadow"], (p: Palette) => [string, string]> = {
  flat: () => ["none", "none"],
  soft: (p) => [`0 1px 2px ${mix(p.ink, p.bg, 0.9)}, 0 8px 24px -12px ${mix(p.ink, p.bg, 0.75)}`, `0 24px 60px -24px ${mix(p.ink, p.bg, 0.6)}`],
  deep: (p) => [`4px 4px 0 ${p.ink}`, `8px 8px 0 ${p.ink}`],
  glow: (p) => [`0 0 0 1px ${mix(p.strong, p.bg, 0.6)}, 0 0 24px -6px ${p.accent}`, `0 0 0 1px ${p.strong}, 0 0 48px -4px ${p.accent}`],
};

const fontFaces = (families: string[]) => {
  const slugs = new Set(families.filter((f) => f.startsWith("th-")).map((f) => f.slice(3)));
  return THEME_FONT_FILES.filter((f) => slugs.has(f.slug))
    .map((f) => `@font-face{font-family:"th-${f.slug}";src:url("${f.file}") format("woff2");font-weight:${f.weight};font-display:swap;unicode-range:${f.unicodeRange}}`)
    .join("\n");
};
const stack = (fonts: string[]) => fonts.map((f) => (/^(serif|sans-serif|monospace)$/.test(f) ? f : `"${f}"`)).join(",");

export function themeCss(theme: StoreTheme, mode?: "light" | "dark" | null): string {
  const { palette: p, mode: m } = themePalette(theme, mode);
  const rose = remapRose(ROSE_COLOURS, p);
  const [shadow, shadowLift] = SHADOW[theme.shadow](p);
  const vars: Record<string, string> = {
    ...Object.fromEntries(Object.entries(rose).map(([hex, to]) => [`--st-${hex}`, to])),
    "--st-font-display": stack(theme.fonts.display),
    "--st-font-text": stack(theme.fonts.text),
    "--st-round": String(theme.round),
    "--st-pill": theme.pill,
    "--th-bg": p.bg,
    "--th-surface": p.surface,
    "--th-soft": p.soft,
    "--th-line": p.line,
    "--th-glow": p.glow,
    "--th-muted": p.muted,
    "--th-accent": p.accent,
    "--th-strong": p.strong,
    "--th-ink": p.ink,
    "--th-on-strong": p.onStrong,
    "--th-display": stack(theme.fonts.display),
    "--th-text": stack(theme.fonts.text),
    "--th-radius": `${Math.round(16 * theme.round)}px`,
    "--th-radius-lg": `${Math.round(28 * theme.round)}px`,
    "--th-pill": theme.pill,
    "--th-shadow": shadow,
    "--th-shadow-lift": shadowLift,
  };
  const body = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `${fontFaces([...theme.fonts.display, ...theme.fonts.text])}
:root[data-store-theme="${theme.id}"]{${body};color-scheme:${m}}
:root[data-store-theme="${theme.id}"] body{background:${p.bg};color:${p.ink}}`;
}
