/**
 * A section's live background from the theme library (a WebGL shader, shaderGlsl.ts, or a physics or generative
 * canvas, fxEngines.ts), as its settings hold it:
 * the shader, its colours (a theme colour's name or a #hex; empty: the shader's own), its rainbow (for the ones
 * drawn in one), its speed, whether it follows the pointer, its film grain, and a veil that keeps words on it
 * readable. Safe, bounded data; the shop draws it (ShaderView.tsx), the admin's panel sets it.
 */
export const SHADER_KIND_LIST = [
  "aurora", "plasma", "ocean", "ink", "caustic", "chrome", "hole", "portal", "synth", "terrain", "rift",
  "sun", "mesh", "dither", "bubbles", "cells", "kaleido", "mandel", "oil", "raymarch", "tunnel",
  // Physics and generative canvases (fxEngines.ts), drawn in 2D.
  "cloth", "murmuration", "sand", "magnetic", "newton", "flow", "arcs", "constellation", "galaxy", "koi",
] as const;
export type ShaderKind = (typeof SHADER_KIND_LIST)[number];
export type ShaderSpec = {
  kind: ShaderKind;
  bg?: string; c1?: string; c2?: string; c3?: string;
  /** Unset: the shader's own way (a rainbow for the ones drawn in one). */
  rainbow?: boolean;
  speed: number;
  mouse: boolean;
  grain: number;
  veil: number;
};
const TOKENS = ["text", "muted", "accent", "accent-soft", "accent-contrast", "bg", "surface", "border", "white", "black"];
const safeColor = (raw: unknown) => (typeof raw === "string" && (TOKENS.includes(raw.trim()) || /^#[0-9a-f]{6}$/i.test(raw.trim())) ? raw.trim() : undefined);
const num = (raw: unknown, min: number, max: number, fallback: number) => (typeof raw === "number" && Number.isFinite(raw) && raw >= min && raw <= max ? raw : fallback);

export function shaderOf(raw: unknown): ShaderSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!(SHADER_KIND_LIST as readonly unknown[]).includes(r.kind)) return null;
  const out: ShaderSpec = { kind: r.kind as ShaderKind, speed: num(r.speed, 0, 3, 1), mouse: r.mouse !== false, grain: num(r.grain, 0, 0.4, 0), veil: num(r.veil, 0, 0.85, 0) };
  for (const k of ["bg", "c1", "c2", "c3"] as const) {
    const c = safeColor(r[k]);
    if (c) out[k] = c;
  }
  if (typeof r.rainbow === "boolean") out.rainbow = r.rainbow;
  return out;
}
