/**
 * A store's own changes to its theme (admin → ثيمات المتجر → تخصيص, header.storeTheme.custom),
 * the way a Shopify theme's settings work: its colours per mode, its two fonts, its corners,
 * buttons and shadows. Everything not changed stays the theme's own. Checked here because it
 * comes from the settings (and, in the admin's preview, from the address).
 */
import { mix, type Palette } from "./colour";
import { FONTS } from "./themes/kit";
import type { StoreTheme } from "./types";

export type FontPreset = keyof typeof FONTS;
export const FONT_PRESETS = Object.keys(FONTS) as FontPreset[];
export const PALETTE_KEYS = ["bg", "surface", "soft", "line", "glow", "muted", "accent", "strong", "ink", "onStrong"] as const satisfies ReadonlyArray<keyof Palette>;
export const BUTTON_SHAPES = { square: "0px", soft: "10px", round: "999px" } as const;
export type ButtonShape = keyof typeof BUTTON_SHAPES;
const SHADOWS = ["flat", "soft", "deep", "glow"] as const;

export type ThemeCustom = {
  /** Colours the store changed, per mode. */
  palette?: { light?: Partial<Palette>; dark?: Partial<Palette> };
  fonts?: { display?: FontPreset; text?: FontPreset };
  /** Corners: 0 square … 2 very round. */
  round?: number;
  button?: ButtonShape;
  shadow?: StoreTheme["shadow"];
};

const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : undefined);

function cleanPalette(raw: unknown): Partial<Palette> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Partial<Palette> = {};
  for (const k of PALETTE_KEYS) {
    const v = hex((raw as Record<string, unknown>)[k]);
    if (v) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** The store's changes, checked: known colours as #rrggbb, known fonts, numbers in range. Nothing usable = null. */
export function cleanCustom(raw: unknown): ThemeCustom | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;
  const out: ThemeCustom = {};
  const light = cleanPalette(r.palette?.light);
  const dark = cleanPalette(r.palette?.dark);
  if (light || dark) out.palette = { ...(light ? { light } : {}), ...(dark ? { dark } : {}) };
  const display = FONT_PRESETS.includes(r.fonts?.display) ? (r.fonts.display as FontPreset) : undefined;
  const text = FONT_PRESETS.includes(r.fonts?.text) ? (r.fonts.text as FontPreset) : undefined;
  if (display || text) out.fonts = { ...(display ? { display } : {}), ...(text ? { text } : {}) };
  if (typeof r.round === "number" && Number.isFinite(r.round)) out.round = Math.round(Math.min(2, Math.max(0, r.round)) * 20) / 20;
  if (r.button in BUTTON_SHAPES) out.button = r.button as ButtonShape;
  if ((SHADOWS as readonly string[]).includes(r.shadow)) out.shadow = r.shadow;
  return Object.keys(out).length ? out : null;
}

/**
 * One mode's colours with the store's changes. When the page, text or brand colours change and
 * the tints that follow them don't, the tints are worked out again so they still match.
 */
export function customPalette(base: Palette, change: Partial<Palette> | undefined): Palette {
  if (!change) return base;
  const p = { ...base, ...change };
  const moved = ["bg", "ink", "accent", "strong"].some((k) => k in change);
  if (moved) {
    if (!change.soft) p.soft = mix(p.accent, p.bg, 0.86);
    if (!change.line) p.line = mix(p.ink, p.bg, 0.86);
    if (!change.glow) p.glow = mix(p.accent, p.bg, 0.45);
  }
  return p;
}

/** The theme as the store changed it. */
export function applyCustom(theme: StoreTheme, custom: ThemeCustom | null | undefined): StoreTheme {
  if (!custom) return theme;
  const palettes = { ...theme.palettes };
  for (const mode of ["light", "dark"] as const) {
    const base = theme.palettes[mode];
    if (base) palettes[mode] = customPalette(base, custom.palette?.[mode]);
  }
  return {
    ...theme,
    palettes,
    fonts: {
      display: custom.fonts?.display ? [...FONTS[custom.fonts.display]] : theme.fonts.display,
      text: custom.fonts?.text ? [...FONTS[custom.fonts.text]] : theme.fonts.text,
    },
    round: custom.round ?? theme.round,
    pill: custom.button ? BUTTON_SHAPES[custom.button] : theme.pill,
    shadow: custom.shadow ?? theme.shadow,
  };
}

/** The address form of a store's changes for the admin's preview (?themeCustom=…), and back. */
export const customToParam = (c: ThemeCustom) => encodeURIComponent(JSON.stringify(c));
export function customFromParam(v: string | null): ThemeCustom | null {
  if (!v || v.length > 4000) return null;
  try {
    return cleanCustom(JSON.parse(v));
  } catch {
    return null;
  }
}
