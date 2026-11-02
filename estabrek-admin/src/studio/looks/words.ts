/**
 * Ready type and word effects (phase 10): families from the shop's font library in a few
 * weights, typographic styles (display, airy, spaced capitals, labels…), and effects that
 * paint the words (gradients in every palette, outlines, shadows, neon, lines under).
 */
import { tr } from "../../lib/words";
import { TEXT_EFFECTS } from "../textEffects";
import { PALETTES, both, type Ready, type Style } from "./core";

const W: Record<string, () => string> = {
  family: () => tr("عائلات خطوط", "Font families"),
  style: () => tr("أساليب", "Styles"),
  gradient: () => tr("تدرّجات", "Gradients"),
  outline: () => tr("مفرّغ", "Outlines"),
  shadow: () => tr("ظلال", "Shadows"),
  neon: () => tr("نيون", "Neon"),
  line: () => tr("خطوط تحت", "Lines under"),
  classic: () => tr("كلاسيكية", "Classics"),
};
export const WORD_GROUPS = Object.keys(W).map((k) => [k, W[k]] as const);

/** Families of the shop's library that write Arabic (and most Hebrew and Latin), with their names. */
const FAMILIES: Array<[string, () => string]> = [
  ["cairo", () => tr("القاهرة", "Cairo")],
  ["tajawal", () => tr("تجوال", "Tajawal")],
  ["almarai", () => tr("المراعي", "Almarai")],
  ["alexandria", () => tr("الإسكندرية", "Alexandria")],
  ["readex-pro", () => tr("ريدكس", "Readex Pro")],
  ["ibm-plex-sans-arabic", () => tr("بلكس عربي", "IBM Plex Sans Arabic")],
  ["noto-kufi-arabic", () => tr("نوتو كوفي", "Noto Kufi Arabic")],
  ["reem-kufi", () => tr("ريم كوفي", "Reem Kufi")],
  ["el-messiri", () => tr("المسيري", "El Messiri")],
  ["changa", () => tr("تشانجا", "Changa")],
  ["kufam", () => tr("كوفام", "Kufam")],
  ["mada", () => tr("مدى", "Mada")],
  ["amiri", () => tr("أميري", "Amiri")],
  ["noto-naskh-arabic", () => tr("نوتو نسخ", "Noto Naskh Arabic")],
  ["scheherazade-new", () => tr("شهرزاد", "Scheherazade")],
  ["lateef", () => tr("لطيف", "Lateef")],
  ["aref-ruqaa", () => tr("عارف رقعة", "Aref Ruqaa")],
  ["lalezar", () => tr("لاله‌زار", "Lalezar")],
  ["marhey", () => tr("مرحي", "Marhey")],
  ["lemonada", () => tr("ليمونادا", "Lemonada")],
  ["rakkas", () => tr("رقّاص", "Rakkas")],
  ["blaka", () => tr("بلاكا", "Blaka")],
  ["jomhuria", () => tr("جمهورية", "Jomhuria")],
  ["vibes", () => tr("فايبز", "Vibes")],
  ["baloo-bhaijaan-2", () => tr("بالو بهيجان", "Baloo Bhaijaan")],
  ["harmattan", () => tr("هرمتان", "Harmattan")],
];
/** Display families that only come in one heavy weight. */
const ONE_WEIGHT = new Set(["lalezar", "rakkas", "blaka", "jomhuria", "vibes", "aref-ruqaa", "marhey"]);
const out: Ready[] = [];
const type = (id: string, group: string, name: () => string, style: Style) => out.push({ id: `type-${id}`, kind: "type", group, name, style });
const paint = (id: string, group: string, name: () => string, style: Style) => out.push({ id: `paint-${id}`, kind: "paint", group, name, style });

for (const [slug, fn] of FAMILIES) {
  if (ONE_WEIGHT.has(slug)) {
    type(`${slug}`, "family", fn, { family: slug, weight: 400 });
    continue;
  }
  type(`${slug}-bold`, "family", both(fn, () => tr("عريض", "Bold")), { family: slug, weight: 700, lineHeight: 1.2 });
  type(`${slug}-regular`, "family", both(fn, () => tr("عادي", "Regular")), { family: slug, weight: 400 });
  if (["cairo", "tajawal", "alexandria", "readex-pro", "ibm-plex-sans-arabic", "noto-kufi-arabic", "changa", "almarai"].includes(slug))
    type(`${slug}-light`, "family", both(fn, () => tr("خفيف", "Light")), { family: slug, weight: 300, letterSpacing: 0.3 });
}
for (const [id, name, style] of [
  ["display", () => tr("عرض عريض", "Bold display"), { font: "heading", weight: 800, lineHeight: 1.05, letterSpacing: -1 }],
  ["display-black", () => tr("أسود ضخم", "Heavy black"), { font: "heading", weight: 900, lineHeight: 1, letterSpacing: -1.5 }],
  ["airy", () => tr("خفيف وواسع", "Light and airy"), { font: "body", weight: 300, lineHeight: 1.6, letterSpacing: 1 }],
  ["spaced-caps", () => tr("حروف كبيرة متباعدة", "Spaced capitals"), { caps: "upper", letterSpacing: 4, weight: 600 }],
  ["kicker", () => tr("عنوان صغير فوق", "A small kicker"), { caps: "upper", letterSpacing: 3, weight: 700, font: "sans" }],
  ["serif-elegant", () => tr("سيريف أنيق", "Elegant serif"), { font: "serif", weight: 400, lineHeight: 1.15 }],
  ["serif-italic", () => tr("سيريف مائل", "Italic serif"), { font: "serif", italic: true, weight: 400 }],
  ["mono-label", () => tr("ملصق آلة كاتبة", "Typewriter label"), { font: "mono", caps: "upper", letterSpacing: 2, weight: 500 }],
  ["tight", () => tr("متلاصق", "Tight"), { weight: 800, letterSpacing: -2, lineHeight: 0.95 }],
  ["readable", () => tr("مريح للقراءة", "Easy reading"), { font: "body", weight: 400, lineHeight: 1.8, wordSpacing: 1 }],
  ["small-caps", () => tr("حروف صغيرة كبيرة", "Small capitals"), { caps: "small", letterSpacing: 1, weight: 600 }],
  ["title-case", () => tr("أول حرف كبير", "Title case"), { caps: "title", weight: 700 }],
] as const)
  type(id, "style", name, style as Style);

for (const p of PALETTES) paint(`grad-${p.id}`, "gradient", both(W.gradient, p.name), { fill: { color: p.from, ...(p.via ? { via: p.via } : {}), to: p.to, angle: 90 } });
for (const [c, cn] of [["accent", () => tr("بلون المتجر", "In the store colour")], ["text", () => tr("بلون الكلام", "In the words' colour")], ["white", () => tr("أبيض", "White")]] as const)
  for (const w of [1, 2] as const) paint(`outline-${c}-${w}`, "outline", both(W.outline, both(cn, () => (w === 1 ? tr("رفيع", "Thin") : tr("عريض", "Thick")))), { stroke: { width: w === 1 ? 1 : 2, color: c }, fill: { color: "transparent", to: "transparent" } });
const sh = (x: number, y: number, blur: number, color: string) => ({ x, y, blur, color });
for (const [id, name, shadows] of [
  ["soft", () => tr("ظل ناعم", "Soft shadow"), [sh(0, 2, 10, "#00000033")]],
  ["drop", () => tr("ظل تحت", "Drop shadow"), [sh(0, 4, 4, "#00000040")]],
  ["hard", () => tr("ظل حاد", "Hard shadow"), [sh(3, 3, 0, "text")]],
  ["accent-hard", () => tr("ظل حاد بلون المتجر", "Hard store-colour shadow"), [sh(3, 3, 0, "accent")]],
  ["retro", () => tr("ريترو", "Retro"), [sh(2, 2, 0, "#f59e0b"), sh(4, 4, 0, "#ef4444")]],
  ["retro-cool", () => tr("ريترو بارد", "Cool retro"), [sh(2, 2, 0, "#22d3ee"), sh(4, 4, 0, "#8b5cf6")]],
  ["stack", () => tr("طبقات", "Stacked"), [sh(2, 2, 0, "accent-soft"), sh(4, 4, 0, "accent"), sh(6, 6, 0, "text")]],
  ["blur-glow", () => tr("هالة ضبابية", "Hazy halo"), [sh(0, 0, 18, "accent-soft")]],
  ["lift", () => tr("مرفوع", "Lifted"), [sh(0, 8, 18, "#00000026")]],
  ["engraved", () => tr("محفور غامق", "Engraved"), [sh(0, -1, 0, "#00000059"), sh(0, 1, 0, "#ffffff80")]],
  ["glitch", () => tr("غليتش", "Glitch"), [sh(-3, 0, 0, "#ff0050"), sh(3, 0, 0, "#00e5ff"), sh(0, 2, 0, "#00000033")]],
  ["anaglyph", () => tr("ثلاثي بنظارة", "Anaglyph"), [sh(-2, 0, 0, "#ef4444b3"), sh(2, 0, 0, "#3b82f6b3")]],
] as const)
  paint(`shadow-${id}`, "shadow", name, { shadows });
for (const [id, c, cn] of [
  ["store", "accent", () => tr("بلون المتجر", "In the store colour")],
  ["cyan", "#22d3ee", () => tr("سماوي", "Cyan")],
  ["pink", "#f472b6", () => tr("زهري", "Pink")],
  ["lime", "#a3e635", () => tr("أخضر فاقع", "Lime")],
  ["violet", "#a78bfa", () => tr("بنفسجي", "Violet")],
  ["amber", "#fbbf24", () => tr("كهرماني", "Amber")],
] as const)
  paint(`neon-${id}`, "neon", both(W.neon, cn), { color: "#ffffff", shadows: [sh(0, 0, 2, "#ffffff"), sh(0, 0, 8, c), sh(0, 0, 18, c), sh(0, 0, 36, c)] });
for (const [id, name, decoration] of [
  ["line", () => tr("خط بسيط", "A simple line"), { line: "underline", width: 2, offset: 6 }],
  ["thick", () => tr("خط عريض بلون المتجر", "A thick store-colour line"), { line: "underline", color: "accent", width: 4, offset: 8 }],
  ["dotted", () => tr("خط منقّط", "A dotted line"), { line: "underline", style: "dotted", color: "accent", width: 3, offset: 8 }],
  ["dashed", () => tr("خط متقطّع", "A dashed line"), { line: "underline", style: "dashed", color: "accent", width: 2, offset: 8 }],
  ["through", () => tr("خط بالنص", "Struck through"), { line: "through", color: "accent", width: 2 }],
  ["over", () => tr("خط فوق", "A line over"), { line: "overline", color: "accent", width: 3, offset: 4 }],
] as const)
  paint(`line-${id}`, "line", name, { decoration });
for (const e of TEXT_EFFECTS) if (Object.keys(e.paint).length) paint(`fx-${e.key}`, "classic", e.name, e.paint);

/** Every ready type style and word effect. */
export const WORD_LOOKS: Ready[] = out;
