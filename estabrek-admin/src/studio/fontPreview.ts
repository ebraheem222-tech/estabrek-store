/**
 * The font picker's previews: each family's name drawn in its own letters. A family the
 * shop keeps itself comes from the shop's files ("th-<slug>"); one from the library comes
 * from Google Fonts, cut down to the few letters the picker shows, under a name of its own
 * ("pv-<slug>"), so it never mixes with the admin's own fonts of the same family.
 */
import type { TreeFontInfo } from "./storeThemes";

/** The letters the picker draws: every name, and a sample in each script. */
export const SAMPLE: Record<string, string> = { arabic: "أبجد هوز", hebrew: "אבגד", latin: "Aa Bb" };
export const previewFamily = (f: Pick<TreeFontInfo, "slug" | "source">) => (f.source === "google" ? `"pv-${f.slug}"` : `"th-${f.slug}"`);

/** Each family's first face file in a Google Fonts stylesheet, by family name. */
export function faceFiles(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const family = /font-family:\s*['"]([^'"]+)['"]/.exec(m[1])?.[1];
    const url = /src:\s*url\(([^)]+)\)/.exec(m[1])?.[1]?.replace(/^['"]|['"]$/g, "");
    if (family && url && /^https:\/\/fonts\.gstatic\.com\//.test(url) && !out.has(family)) out.set(family, url);
  }
  return out;
}

/** The asks to Google for the families' previews, a few dozen families at a time. */
export function previewAsks(fonts: TreeFontInfo[], per = 30): Array<{ url: string; fonts: TreeFontInfo[] }> {
  const lib = fonts.filter((f) => f.source === "google" && f.q);
  if (!lib.length) return [];
  const letters = [...new Set([...lib.map((f) => f.name).join(""), ...Object.values(SAMPLE).join("")].filter((c) => c.trim()))].sort().join("");
  const asks = [];
  for (let i = 0; i < lib.length; i += per) {
    const part = lib.slice(i, i + per);
    asks.push({ url: `https://fonts.googleapis.com/css2?${part.map((f) => `family=${f.q}`).join("&")}&text=${encodeURIComponent(letters)}&display=swap`, fonts: part });
  }
  return asks;
}

const asked = new Set<string>();
/** Adds the library families' preview faces (each one loads when it's first drawn). */
export async function loadPreviews(fonts: TreeFontInfo[]): Promise<void> {
  if (typeof FontFace === "undefined" || !document.fonts) return;
  const todo = fonts.filter((f) => !asked.has(f.slug));
  todo.forEach((f) => asked.add(f.slug));
  await Promise.all(
    previewAsks(todo).map(async ({ url, fonts: part }) => {
      try {
        const files = faceFiles(await (await fetch(url)).text());
        for (const f of part) {
          const file = files.get(f.name);
          if (file) document.fonts.add(new FontFace(`pv-${f.slug}`, `url(${file})`, { display: "swap" }));
        }
      } catch {
        // Without the previews the names show in the admin's own font.
        part.forEach((f) => asked.delete(f.slug));
      }
    }),
  );
}
