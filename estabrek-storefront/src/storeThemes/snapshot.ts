import { z } from "zod";
import type { StoreTheme } from "./types";

// Keep the wire contract aligned with backend/lib/designTheme.ts; import tests cover every template.
const words = z.object({ ar: z.string().max(1000), en: z.string().max(1000), he: z.string().max(1000) });
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const palette = z.object({ bg: hex, surface: hex, soft: hex, line: hex, glow: hex, muted: hex, accent: hex, strong: hex, ink: hex, onStrong: hex });
const font = z.string().regex(/^[\p{L}\p{N} ._-]{1,80}$/u);
export const ThemeSnapshotSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/), name: words, blurb: words,
  family: z.enum(["fashion", "shoes", "electronics", "gaming", "beauty", "jewelry", "books", "art", "home", "food", "kids", "sports", "pets", "flowers", "music", "general"]),
  mode: z.enum(["light", "dark"]), palettes: z.object({ light: palette.optional(), dark: palette.optional() }),
  fonts: z.object({ display: z.array(font).min(1).max(10), text: z.array(font).min(1).max(10) }),
  round: z.number().min(0).max(2), pill: z.string().regex(/^\d{1,3}px$/), shadow: z.enum(["flat", "soft", "deep", "glow"]),
  hero: z.enum(["editorial", "spotlight", "glitch", "bloom", "playful", "gallery", "split", "mono", "stage"]),
  motion: z.enum(["editorial", "precise", "arcade", "soft", "bouncy", "luxe", "sporty"]),
  svg: z.enum(["deco", "circuit", "neon", "organic", "candy", "pixel", "arena", "synth", "fantasy", "space", "glitch", "zen", "frost", "ember", "brush", "ink", "silk", "facet", "wave", "botanic", "steam", "paw", "track", "vinyl", "arabesque", "cloud", "mono"]),
  card: z.enum(["portrait", "spec", "angled", "arch", "sticker", "pixel", "frame", "book", "minimal", "tile", "overlay", "list", "polaroid", "round"]),
  copy: z.object({ eyebrow: words, title: words, subtitle: words, cta: words, productsTitle: words, collectionsTitle: words, marquee: z.array(words).max(20) }),
}).refine((t) => Boolean(t.palettes[t.mode]), "The selected mode needs its palette");

export function readThemeSnapshot(value: unknown): StoreTheme | null {
  const parsed = ThemeSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function copyTheme(theme: StoreTheme): StoreTheme {
  return ThemeSnapshotSchema.parse(theme);
}
export function independentDesign(header: unknown): boolean {
  return (header as { storeDesign?: { mode?: unknown } } | null)?.storeDesign?.mode === "cms";
}
export const cinematicEnabled = (header: unknown, homeMode?: string) => !independentDesign(header) && homeMode !== "cms";
