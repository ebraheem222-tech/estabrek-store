/**
 * The store's design variables (W2): named colours, fonts, spaces, corners and shadows that any
 * element takes by name ("$brand"), so changing one changes every page. Kept in the settings
 * header like the site styles: `designTokens` is what the shop shows, `designTokensDraft` the
 * editor's changes until they're published. The shop draws them as CSS variables on :root
 * (--tk-c-<id>, --tk-f-<id>, --tk-s-<id>, --tk-r-<id>, --tk-sh-<id>).
 */
import { z } from "zod";

export const TOKEN_ID = /^[a-z][a-z0-9-]{0,30}$/;
/** A reference to a variable from an element's style: "$" and its id. */
export const TOKEN_REF = /^\$[a-z][a-z0-9-]{0,30}$/;
export const TOKEN_LIMITS = { colors: 40, fonts: 12, spaces: 20, radii: 20, shadows: 20 } as const;

const hex = z.string().trim().regex(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i, "A colour like #c86b98");
const id = z.string().regex(TOKEN_ID, "An id is small letters, digits and -");
const name = z.object({ ar: z.string().trim().max(60).optional(), en: z.string().trim().max(60).optional(), he: z.string().trim().max(60).optional() }).strict().optional();
const n = (min: number, max: number) => z.number().finite().min(min).max(max);

export const TokenColor = z.object({ id, name, value: hex }).strict();
export const TokenFont = z.object({ id, name, family: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,40}$/) }).strict();
export const TokenSpace = z.object({ id, name, value: n(0, 400) }).strict();
export const TokenRadius = z.object({ id, name, value: n(0, 999) }).strict();
export const TokenShadow = z.object({ id, name, x: n(-100, 100), y: n(-100, 100), blur: n(0, 200), spread: n(-100, 100).optional(), color: hex }).strict();

const unique = <T extends { id: string }>(list: T[]) => new Set(list.map((t) => t.id)).size === list.length;
export const DesignTokens = z.object({
  version: z.literal(1),
  colors: z.array(TokenColor).max(TOKEN_LIMITS.colors).default([]).refine(unique, "Two colours with one id"),
  fonts: z.array(TokenFont).max(TOKEN_LIMITS.fonts).default([]).refine(unique, "Two fonts with one id"),
  spaces: z.array(TokenSpace).max(TOKEN_LIMITS.spaces).default([]).refine(unique, "Two spaces with one id"),
  radii: z.array(TokenRadius).max(TOKEN_LIMITS.radii).default([]).refine(unique, "Two corners with one id"),
  shadows: z.array(TokenShadow).max(TOKEN_LIMITS.shadows).default([]).refine(unique, "Two shadows with one id"),
}).strict();
export type DesignTokens = z.infer<typeof DesignTokens>;
export const EMPTY_TOKENS: DesignTokens = { version: 1, colors: [], fonts: [], spaces: [], radii: [], shadows: [] };

export function checkDesignTokens(raw: unknown): { ok: true; tokens: DesignTokens } | { ok: false; issues: { path: string; message: string }[] } {
  const r = DesignTokens.safeParse(raw);
  if (r.success) return { ok: true, tokens: r.data };
  return { ok: false, issues: r.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })) };
}

/** What's kept in the header, if it's still valid (else nothing: the shop then shows no variables). */
export function storedDesignTokens(raw: unknown): DesignTokens | null {
  if (raw === undefined || raw === null) return null;
  const r = DesignTokens.safeParse(raw);
  return r.success ? r.data : null;
}
