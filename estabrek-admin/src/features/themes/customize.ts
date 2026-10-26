// The theme customizer's logic (ThemeCustomizer.tsx): the store's own colours, fonts,
// corners, buttons and shadows on top of a theme, saved at header.storeTheme.custom and
// read by the shop (storeThemes/custom.ts there, which checks it again). Pure (tested).
import { tr } from "../../lib/words";

export type PaletteKey = "bg" | "surface" | "soft" | "line" | "glow" | "muted" | "accent" | "strong" | "ink" | "onStrong";
export type Palette = Record<PaletteKey, string>;
export type ThemeCustom = {
  palette?: { light?: Partial<Palette>; dark?: Partial<Palette> };
  fonts?: { display?: string; text?: string };
  round?: number;
  button?: "square" | "soft" | "round";
  shadow?: "flat" | "soft" | "deep" | "glow";
};

/** The colours the owner sees and changes (the tints follow on the shop). */
export const EDITABLE_COLOURS: Array<{ key: PaletteKey; label: () => string }> = [
  { key: "bg", label: () => tr("خلفية الصفحة", "Page background") },
  { key: "surface", label: () => tr("البطاقات", "Cards") },
  { key: "ink", label: () => tr("النص", "Text") },
  { key: "muted", label: () => tr("النص الهادئ", "Quiet text") },
  { key: "accent", label: () => tr("اللون المميز", "Accent") },
  { key: "strong", label: () => tr("لون الأزرار", "Buttons") },
  { key: "onStrong", label: () => tr("كلام الأزرار", "Button text") },
];

/** The shop's font pairs (storeThemes/themes/kit.ts FONTS), by the name the owner sees. */
export const FONT_CHOICES: Array<{ id: string; label: () => string }> = [
  { id: "amiri", label: () => tr("أميري: كلاسيكي للكتب والفخامة", "Amiri: classic, for books and luxury") },
  { id: "ruqaa", label: () => tr("رقعة: خط يد عربي", "Ruqaa: Arabic handwriting") },
  { id: "messiri", label: () => tr("المسيري: أنيق", "El Messiri: elegant") },
  { id: "kufi", label: () => tr("ريم كوفي: هندسي حديث", "Reem Kufi: modern geometric") },
  { id: "cairo", label: () => tr("القاهرة: واضح وعصري", "Cairo: clear and modern") },
  { id: "alexandria", label: () => tr("الإسكندرية: ناعم", "Alexandria: soft") },
  { id: "readex", label: () => tr("ريدكس: تقني", "Readex: technical") },
  { id: "changa", label: () => tr("تشانغا: رياضي", "Changa: sporty") },
  { id: "lalezar", label: () => tr("لاله‌زار: عريض وجريء", "Lalezar: bold") },
  { id: "marhey", label: () => tr("مرحي: مرح للأطفال", "Marhey: playful") },
  { id: "tajawal", label: () => tr("تجوال: بسيط للنصوص", "Tajawal: simple, for text") },
  { id: "rubik", label: () => tr("روبيك: لاتيني دائري", "Rubik: rounded Latin") },
];

const hex = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** WCAG contrast of two #rrggbb colours (1 … 21). */
export function contrast(a: string, b: string): number {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  if (!hex(a) || !hex(b)) return 21;
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** What reads badly with these colours, in the owner's words. */
export function readabilityIssues(p: Palette): string[] {
  const out: string[] = [];
  if (contrast(p.ink, p.bg) < 4.5) out.push(tr("النص صعب يتقرا على خلفية الصفحة", "The text is hard to read on the page background"));
  if (contrast(p.ink, p.surface) < 4.5) out.push(tr("النص صعب يتقرا على البطاقات", "The text is hard to read on the cards"));
  if (contrast(p.muted, p.bg) < 3) out.push(tr("النص الهادئ باهت كتير", "The quiet text is too faint"));
  if (contrast(p.onStrong, p.strong) < 4.5) out.push(tr("كلام الأزرار صعب يتقرا على لونها", "The button text is hard to read on the buttons"));
  return out;
}

/** The changes without anything that says nothing (a colour equal to the theme's, an empty font). */
export function tidyCustom(c: ThemeCustom, base: { palettes?: { light?: Record<string, string>; dark?: Record<string, string> } }): ThemeCustom | null {
  const out: ThemeCustom = {};
  for (const mode of ["light", "dark"] as const) {
    const change = c.palette?.[mode];
    if (!change) continue;
    const kept = Object.fromEntries(Object.entries(change).filter(([k, v]) => hex(v) && v!.toLowerCase() !== base.palettes?.[mode]?.[k]?.toLowerCase()));
    if (Object.keys(kept).length) out.palette = { ...out.palette, [mode]: kept };
  }
  if (c.fonts?.display || c.fonts?.text) out.fonts = { ...(c.fonts.display ? { display: c.fonts.display } : {}), ...(c.fonts.text ? { text: c.fonts.text } : {}) };
  if (typeof c.round === "number") out.round = Math.min(2, Math.max(0, c.round));
  if (c.button) out.button = c.button;
  if (c.shadow) out.shadow = c.shadow;
  return Object.keys(out).length ? out : null;
}

/** The preview address part the shop reads (?themeCustom=…, storeThemes/custom.ts customFromParam). */
export const customParam = (c: ThemeCustom | null) => (c ? `&themeCustom=${encodeURIComponent(JSON.stringify(c))}` : "");
