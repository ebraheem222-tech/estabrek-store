/**
 * A theme as CSS: the rose design's colours repainted (--st-<hex>, see postcss/theme-tokens.cjs),
 * the theme's own variables for its home sections (--th-*), its fonts and corners.
 * One <style> per page, from the layout (or the admin's preview).
 */
import { contrast, mix, remapRose, type Palette } from "./colour";
import { THEME_FONT_FILES } from "./fonts.gen";
import { TREE_FONTS, googleFontsHref } from "../pageTree/fonts";
import { ROSE_COLOURS } from "./roseColours.gen";
import type { StoreTheme } from "./types";
import type { CSSProperties } from "react";

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

export const fontFaces = (families: string[]) => {
  const slugs = new Set(families.filter((f) => f.startsWith("th-")).map((f) => f.slice(3)));
  return THEME_FONT_FILES.filter((f) => slugs.has(f.slug))
    .map((f) => `@font-face{font-family:"th-${f.slug}";src:url("${f.file}") format("woff2");font-weight:${f.weight};font-display:swap;unicode-range:${f.unicodeRange}}`)
    .join("\n");
};
// A template's families from the editor's library (kits/themes.ts) load from Google, as a page's do.
const GOOGLE_BY_NAME = new Map(TREE_FONTS.filter((f) => f.source === "google").map((f) => [f.name, f.slug]));
const googleImport = (families: string[]) => {
  const href = googleFontsHref(families.map((f) => GOOGLE_BY_NAME.get(f)).filter((f): f is string => Boolean(f)));
  return href ? `@import url("${href}");\n` : "";
};
const stack = (fonts: string[]) => fonts.map((f) => (/^(serif|sans-serif|monospace)$/.test(f) ? f : `"${f}"`)).join(",");

/**
 * The theme's colour for words on a dark box and on a light one (pageTree/css.ts gives them to a box painted
 * its own colour): its ink where that is already the right side, else its page colour.
 */
export function wordsOn(p: Palette, mode: "light" | "dark"): { dark: string; light: string } {
  return mode === "dark" ? { dark: p.ink, light: p.bg } : { dark: p.bg, light: p.ink };
}

/**
 * The theme's deepest band («night», a game site's opening: pageTree/css.ts tokens deep, on-deep, deep-pop) and the
 * words and the colour that stands out on it. In a light mode that is its text colour, as a «dark» section is; in a
 * dark one a night under its page, not its (light) text colour, so a dark theme's opening stays dark.
 */
export function deepOf(p: Palette, mode: "light" | "dark"): { deep: string; on: string; pop: string } {
  const deep = mode === "dark" ? mix(p.bg, "#000000", 0.45) : p.ink;
  const on = mode === "dark" ? p.ink : p.bg;
  const pop = [p.strong, p.accent, p.soft, p.glow, on].find((c) => /^#[0-9a-f]{6}$/i.test(c) && contrast(c, deep) >= 4.5) ?? on;
  return { deep, on, pop: mode === "dark" ? pop : [p.soft, p.glow, on].find((c) => /^#[0-9a-f]{6}$/i.test(c) && contrast(c, deep) >= 4.5) ?? on };
}

/**
 * The theme's colour for a link (a link button) on a dark box and on a light one: its strong colour, else its accent,
 * else the words' colour there (wordsOn), whichever first reads (3 : 1) on any box pageTree/css.ts toneOf calls so
 * (dark: light no more than 0.18, light: at least 0.5); white or black when none does. Many themes' strong colour is
 * their ink, so their links were ink on the dark boxes too (a header's name on its coloured bar, "explore" on a band).
 */
export function linksOn(p: Palette, mode: "light" | "dark"): { dark: string; light: string } {
  const on = wordsOn(p, mode);
  const light = (c: string) => contrast(c, "#000000") * 0.05 - 0.05;
  const ok = (c: string) => /^#[0-9a-f]{6}$/i.test(c);
  return {
    dark: [p.strong, p.accent, on.dark].find((c) => ok(c) && (light(c) + 0.05) / (0.18 + 0.05) >= 3) ?? "#ffffff",
    light: [p.strong, p.accent, on.light].find((c) => ok(c) && (0.5 + 0.05) / (light(c) + 0.05) >= 3) ?? "#000000",
  };
}

/** Page-tree tokens are scoped inside ThemeWrap, whose inline variables otherwise win over the theme. */
export function treeThemeVars(theme: StoreTheme, mode?: "light" | "dark" | null): CSSProperties {
  const { palette: p, mode: resolved } = themePalette(theme, mode);
  const on = wordsOn(p, resolved);
  const links = linksOn(p, resolved);
  const deep = deepOf(p, resolved);
  return {
    "--deep": deep.deep, "--on-deep": deep.on, "--deep-pop": deep.pop,
    "--bg": p.bg, "--surface": p.surface, "--text": p.ink, "--muted": p.muted,
    "--accent": p.strong, "--accent-soft": p.soft, "--accent-contrast": p.onStrong, "--border": p.line,
    "--pt-on-dark": on.dark, "--pt-on-light": on.light, "--pt-link-on-dark": links.dark, "--pt-link-on-light": links.light,
    "--pt-font-heading": stack(theme.fonts.display), fontFamily: stack(theme.fonts.text),
    backgroundColor: p.bg, color: p.ink, colorScheme: resolved,
  } as CSSProperties;
}

/** Global regions follow the same live preview variables as the customer page. */
export const liveTreeThemeVars = {
  "--deep": "var(--th-deep)", "--on-deep": "var(--th-on-deep)", "--deep-pop": "var(--th-deep-pop)",
  "--bg": "var(--th-bg)", "--surface": "var(--th-surface)", "--text": "var(--th-ink)", "--muted": "var(--th-muted)",
  "--accent": "var(--th-strong)", "--accent-soft": "var(--th-soft)", "--accent-contrast": "var(--th-on-strong)", "--border": "var(--th-line)",
  "--pt-on-dark": "var(--th-on-dark)", "--pt-on-light": "var(--th-on-light)", "--pt-link-on-dark": "var(--th-link-on-dark)", "--pt-link-on-light": "var(--th-link-on-light)",
  "--pt-font-heading": "var(--th-display)", fontFamily: "var(--th-text)", backgroundColor: "var(--th-bg)", color: "var(--th-ink)", colorScheme: "var(--th-mode)",
} as CSSProperties;

export function themeCss(theme: StoreTheme, mode?: "light" | "dark" | null): string {
  const { palette: p, mode: m } = themePalette(theme, mode);
  const rose = remapRose(ROSE_COLOURS, p);
  const [shadow, shadowLift] = SHADOW[theme.shadow](p);
  const on = wordsOn(p, m);
  const links = linksOn(p, m);
  const deep = deepOf(p, m);
  const vars: Record<string, string> = {
    ...Object.fromEntries(Object.entries(rose).map(([hex, to]) => [`--st-${hex}`, to])),
    "--st-font-display": stack(theme.fonts.display),
    "--st-font-text": stack(theme.fonts.text),
    "--st-round": String(theme.round),
    "--st-pill": theme.pill,
    "--th-bg": p.bg,
    "--th-mode": m,
    "--th-surface": p.surface,
    "--th-soft": p.soft,
    "--th-line": p.line,
    "--th-glow": p.glow,
    "--th-muted": p.muted,
    "--th-accent": p.accent,
    "--th-strong": p.strong,
    "--th-ink": p.ink,
    "--th-on-strong": p.onStrong,
    "--th-on-dark": on.dark,
    "--th-on-light": on.light,
    "--th-link-on-dark": links.dark,
    "--th-link-on-light": links.light,
    "--th-deep": deep.deep,
    "--th-on-deep": deep.on,
    "--th-deep-pop": deep.pop,
    "--deep": "var(--th-deep)",
    "--on-deep": "var(--th-on-deep)",
    "--deep-pop": "var(--th-deep-pop)",
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
  return `${googleImport([...theme.fonts.display, ...theme.fonts.text])}${fontFaces([...theme.fonts.display, ...theme.fonts.text])}
:root[data-store-theme="${theme.id}"]{${body};color-scheme:${m}}
:root[data-store-theme="${theme.id}"] body{background:${p.bg};color:${p.ink}}`;
}
