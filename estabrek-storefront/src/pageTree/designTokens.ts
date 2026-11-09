/**
 * The store's design variables (the API's lib/designTokens.ts): named colours, fonts, spaces,
 * corners and shadows an element takes by name ("$brand"). Drawn once as CSS variables on :root
 * (--tk-c-<id>, --tk-f-<id>, --tk-s-<id>, --tk-r-<id>, --tk-sh-<id>), so changing one changes every
 * page; css.ts writes `$id` in a style as var(--tk-…-id). Pure.
 */
import { fontFaceCss, fontStack } from "./fonts";

export type TokenName = { ar?: string; en?: string; he?: string };
export type DesignTokens = {
  version: 1;
  colors: { id: string; name?: TokenName; value: string }[];
  fonts: { id: string; name?: TokenName; family: string }[];
  spaces: { id: string; name?: TokenName; value: number }[];
  radii: { id: string; name?: TokenName; value: number }[];
  shadows: { id: string; name?: TokenName; x: number; y: number; blur: number; spread?: number; color: string }[];
};
export const TOKEN_GROUPS = ["colors", "fonts", "spaces", "radii", "shadows"] as const;
export type TokenGroup = (typeof TOKEN_GROUPS)[number];
/** Each group's CSS variable prefix. */
export const TOKEN_PREFIX: Record<TokenGroup, string> = { colors: "c", fonts: "f", spaces: "s", radii: "r", shadows: "sh" };

const ID = /^[a-z][a-z0-9-]{0,30}$/;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FAMILY = /^[a-z0-9][a-z0-9-]{0,40}$/;
const REF = /^\$[a-z][a-z0-9-]{0,30}$/;
const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max).filter((x) => x && typeof x === "object" && ID.test(String((x as { id?: unknown }).id))) : []) as Record<string, any>[];
const nameOf = (v: unknown): TokenName | undefined => (v && typeof v === "object" ? (v as TokenName) : undefined);

/** A style's `$id` as the CSS variable of its group (anything else: undefined). */
export const tokenVar = (v: unknown, group: TokenGroup): string | undefined => (typeof v === "string" && REF.test(v) ? `var(--tk-${TOKEN_PREFIX[group]}-${v.slice(1)})` : undefined);
export const isTokenRef = (v: unknown): v is string => typeof v === "string" && REF.test(v);

/** Only what's valid: unknown or broken entries are left out. */
export function designTokensOf(raw: unknown): DesignTokens | null {
  if (!raw || typeof raw !== "object" || (raw as { version?: unknown }).version !== 1) return null;
  const r = raw as Record<string, unknown>;
  return {
    version: 1,
    colors: list(r.colors, 40).filter((t) => HEX.test(String(t.value))).map((t) => ({ id: t.id, name: nameOf(t.name), value: String(t.value) })),
    fonts: list(r.fonts, 12).filter((t) => FAMILY.test(String(t.family))).map((t) => ({ id: t.id, name: nameOf(t.name), family: String(t.family) })),
    spaces: list(r.spaces, 20).filter((t) => num(t.value, 0, 400) !== undefined).map((t) => ({ id: t.id, name: nameOf(t.name), value: t.value })),
    radii: list(r.radii, 20).filter((t) => num(t.value, 0, 999) !== undefined).map((t) => ({ id: t.id, name: nameOf(t.name), value: t.value })),
    shadows: list(r.shadows, 20)
      .filter((t) => num(t.x, -100, 100) !== undefined && num(t.y, -100, 100) !== undefined && num(t.blur, 0, 200) !== undefined && HEX.test(String(t.color)))
      .map((t) => ({ id: t.id, name: nameOf(t.name), x: t.x, y: t.y, blur: t.blur, spread: num(t.spread, -100, 100), color: String(t.color) })),
  };
}

/** The variables as CSS on :root ("" without any). */
export function tokensCss(t: DesignTokens | null | undefined): string {
  if (!t) return "";
  const d: string[] = [];
  for (const c of t.colors) d.push(`--tk-c-${c.id}:${c.value}`);
  for (const f of t.fonts) { const stack = fontStack(f.family); if (stack) d.push(`--tk-f-${f.id}:${stack}`); }
  for (const s of t.spaces) d.push(`--tk-s-${s.id}:${s.value}px`);
  for (const r of t.radii) d.push(`--tk-r-${r.id}:${r.value}px`);
  for (const s of t.shadows) d.push(`--tk-sh-${s.id}:${s.x}px ${s.y}px ${s.blur}px ${s.spread ?? 0}px ${s.color}`);
  // The theme families its fonts name are fetched like the page's own.
  return d.length ? `${fontFaceCss(t.fonts.map((f) => f.family))}:root{${d.join(";")}}` : "";
}

/** The font families the variables use (to be loaded with the page's own). */
export const tokenFamilies = (t: DesignTokens | null | undefined): string[] => (t ? t.fonts.map((f) => f.family) : []);
