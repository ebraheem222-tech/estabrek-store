/**
 * The fonts a page tree's words can take by name (ScreenStyle.family): the families
 * downloaded to public/fonts/themes (storeThemes/fonts.gen.ts). Only the families a page
 * uses get their @font-face, each script's file loading only when its letters show.
 * The admin lists them from /api/store-themes, so it never keeps a copy.
 */
import { THEME_FONT_FILES } from "../storeThemes/fonts.gen";

export type FontKind = "sans" | "serif" | "display" | "script";
export type TreeFont = { slug: string; name: string; kind: FontKind; scripts: Array<"arabic" | "hebrew" | "latin">; weights: [number, number] };

// What each family looks like, for the picker's groups and the fallback when its file hasn't loaded.
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
const FALLBACK: Record<FontKind, string> = { sans: "system-ui,sans-serif", serif: "Georgia,serif", display: "system-ui,sans-serif", script: "Georgia,serif" };

export const TREE_FONTS: TreeFont[] = (() => {
  const by = new Map<string, TreeFont>();
  for (const f of THEME_FONT_FILES) {
    const [lo, hi = lo] = f.weight.split(" ").map(Number);
    const had = by.get(f.slug);
    if (!had) {
      by.set(f.slug, { slug: f.slug, name: f.family, kind: KIND[f.slug] ?? "sans", scripts: [f.subset], weights: [lo, hi] });
      continue;
    }
    if (!had.scripts.includes(f.subset)) had.scripts.push(f.subset);
    had.weights = [Math.min(had.weights[0], lo), Math.max(had.weights[1], hi)];
  }
  return [...by.values()];
})();
const KNOWN = new Map(TREE_FONTS.map((f) => [f.slug, f]));

/** The families with their files, for the editor's picker to draw each name in its own font. */
export const editorFonts = () =>
  TREE_FONTS.map((f) => ({ ...f, faces: THEME_FONT_FILES.filter((x) => x.slug === f.slug).map((x) => ({ file: x.file, weight: x.weight, range: x.unicodeRange })) }));

/** A family's CSS stack by its name, or undefined for one the shop doesn't have. */
export function fontStack(slug: unknown): string | undefined {
  const f = typeof slug === "string" ? KNOWN.get(slug) : undefined;
  return f ? `"th-${f.slug}",${FALLBACK[f.kind]}` : undefined;
}

/** The @font-face rules of the families named (the same names the store themes use, so a family is fetched once). */
export function fontFaceCss(slugs: Iterable<string>): string {
  const want = new Set([...slugs].filter((s) => KNOWN.has(s)));
  if (!want.size) return "";
  return THEME_FONT_FILES.filter((f) => want.has(f.slug))
    .map((f) => `@font-face{font-family:"th-${f.slug}";src:url("${f.file}") format("woff2");font-weight:${f.weight};font-display:swap;unicode-range:${f.unicodeRange}}`)
    .join("");
}
