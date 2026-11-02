/**
 * The fonts a page tree's words can take by name (ScreenStyle.family): the store themes'
 * families, downloaded to public/fonts/themes (storeThemes/fonts.gen.ts), and the library
 * from Google Fonts (fontLibrary.gen.ts). Only the families a page uses load: a theme
 * family's @font-face (each script's file only when its letters show), a library family
 * from Google's servers (one stylesheet for the page). When both have a family, the
 * theme's own copy wins. The admin lists them from /api/store-themes, so it never keeps a copy.
 */
import { THEME_FONT_FILES } from "../storeThemes/fonts.gen";
import { LIBRARY_FONTS } from "./fontLibrary.gen";

export type FontKind = "sans" | "serif" | "display" | "script" | "mono";
export type TreeFont = {
  slug: string;
  name: string;
  kind: FontKind;
  scripts: Array<"arabic" | "hebrew" | "latin">;
  weights: [number, number];
  /** "theme" = this shop's own files; "google" = Google Fonts, `q` being its ask. */
  source: "theme" | "google";
  italic?: boolean;
  q?: string;
};

// What each theme family looks like, for the picker's groups and the fallback when its file hasn't loaded.
const KIND: Record<string, FontKind> = {
  amiri: "serif",
  "frank-ruhl-libre": "serif",
  "el-messiri": "serif",
  "aref-ruqaa": "script",
  "reem-kufi": "display",
  lalezar: "display",
  marhey: "display",
  changa: "display",
  "secular-one": "display",
};
const FALLBACK: Record<FontKind, string> = { sans: "system-ui,sans-serif", serif: "Georgia,serif", display: "system-ui,sans-serif", script: "Georgia,serif", mono: "ui-monospace,monospace" };

const THEME_FONTS: TreeFont[] = (() => {
  const by = new Map<string, TreeFont>();
  for (const f of THEME_FONT_FILES) {
    const [lo, hi = lo] = f.weight.split(" ").map(Number);
    const had = by.get(f.slug);
    if (!had) {
      by.set(f.slug, { slug: f.slug, name: f.family, kind: KIND[f.slug] ?? "sans", scripts: [f.subset], weights: [lo, hi], source: "theme" });
      continue;
    }
    if (!had.scripts.includes(f.subset)) had.scripts.push(f.subset);
    had.weights = [Math.min(had.weights[0], lo), Math.max(had.weights[1], hi)];
  }
  return [...by.values()];
})();
const THEME_SLUGS = new Set(THEME_FONTS.map((f) => f.slug));

export const TREE_FONTS: TreeFont[] = [...THEME_FONTS, ...LIBRARY_FONTS.filter((f) => !THEME_SLUGS.has(f.slug)).map((f): TreeFont => ({ ...f, source: "google" }))];
const KNOWN = new Map(TREE_FONTS.map((f) => [f.slug, f]));

/** Every family for the editor's picker: a theme family with its files, a library one with its ask to Google. */
export const editorFonts = () =>
  TREE_FONTS.map((f) => (f.source === "theme" ? { ...f, faces: THEME_FONT_FILES.filter((x) => x.slug === f.slug).map((x) => ({ file: x.file, weight: x.weight, range: x.unicodeRange })) } : f));

/** A family's CSS stack by its name, or undefined for one the shop doesn't have. */
export function fontStack(slug: unknown): string | undefined {
  const f = typeof slug === "string" ? KNOWN.get(slug) : undefined;
  if (!f) return undefined;
  return f.source === "theme" ? `"th-${f.slug}",${FALLBACK[f.kind]}` : `"${f.name}",${FALLBACK[f.kind]}`;
}

/** The @font-face rules of the theme families named (the same names the store themes use, so a family is fetched once). */
export function fontFaceCss(slugs: Iterable<string>): string {
  const want = new Set([...slugs].filter((s) => KNOWN.get(s)?.source === "theme"));
  if (!want.size) return "";
  return THEME_FONT_FILES.filter((f) => want.has(f.slug))
    .map((f) => `@font-face{font-family:"th-${f.slug}";src:url("${f.file}") format("woff2");font-weight:${f.weight};font-display:swap;unicode-range:${f.unicodeRange}}`)
    .join("");
}

export const GOOGLE_FONTS = "https://fonts.googleapis.com";
/** One stylesheet from Google Fonts for the library families named, or null when there are none. */
export function googleFontsHref(slugs: Iterable<string>): string | null {
  const qs = [...new Set(slugs)]
    .map((s) => KNOWN.get(s))
    .filter((f): f is TreeFont => f?.source === "google" && typeof f.q === "string")
    .map((f) => f.q!)
    .sort();
  return qs.length ? `${GOOGLE_FONTS}/css2?${qs.map((q) => `family=${q}`).join("&")}&display=swap` : null;
}
