/**
 * Ready effects for words: each one a set of the word keys the page already has (outline,
 * gradient paint, shadows, glow, a line under), so the shop draws them with no new CSS.
 * Picking one replaces the words' paint; `look` ones (capitals, weight, spacing) can't be
 * a state's (a state never changes size or letters).
 */
import { tr } from "../lib/words";
import { adminLang } from "../lib/lang";

type Obj = Record<string, unknown>;
/** The keys an effect paints with; picking one clears the others. */
export const PAINT_KEYS = ["stroke", "fill", "shadows", "glow", "decoration"] as const;
const shade = (x: number, y: number, blur: number, color: string) => ({ x, y, blur, color });

export type EffectGroup = "gradient" | "metal" | "neon" | "shadow" | "outline" | "line" | "retro" | "type";
export type TextEffect = { key: string; name: () => string; paint: Obj; look?: Obj; group?: EffectGroup };
export const TEXT_EFFECTS: TextEffect[] = [
  { key: "outline", group: "outline", name: () => tr("مفرّغ", "Outline"), paint: { stroke: { width: 1.5, color: "accent" }, fill: { color: "transparent", to: "transparent" } } },
  { key: "outline-shadow", group: "outline", name: () => tr("مفرّغ بظل", "Outline with shadow"), paint: { stroke: { width: 1.5, color: "text" }, fill: { color: "transparent", to: "transparent" }, shadows: [shade(4, 4, 0, "accent")] } },
  { key: "gradient", group: "gradient", name: () => tr("تدرّج المتجر", "Store gradient"), paint: { fill: { color: "accent", to: "#f59e0b", angle: 90 } } },
  { key: "sunset", group: "gradient", name: () => tr("غروب", "Sunset"), paint: { fill: { color: "#f43f5e", via: "#f97316", to: "#facc15", angle: 90 } } },
  { key: "ocean", group: "gradient", name: () => tr("بحر", "Ocean"), paint: { fill: { color: "#06b6d4", via: "#3b82f6", to: "#8b5cf6", angle: 90 } } },
  { key: "chrome", group: "metal", name: () => tr("كروم", "Chrome"), paint: { fill: { color: "#f3f4f6", via: "#6b7280", to: "#f9fafb", angle: 180 }, shadows: [shade(0, 1, 0, "#00000033")] } },
  { key: "gold", group: "metal", name: () => tr("ذهبي", "Gold"), paint: { fill: { color: "#fde68a", via: "#b45309", to: "#fcd34d", angle: 180 }, shadows: [shade(0, 1, 1, "#78350f55")] } },
  { key: "neon", group: "neon", name: () => tr("نيون", "Neon"), paint: { shadows: [shade(0, 0, 2, "#ffffff"), shade(0, 0, 8, "accent"), shade(0, 0, 20, "accent")], glow: { color: "accent", size: 16 } } },
  { key: "glow", group: "neon", name: () => tr("توهّج ناعم", "Soft glow"), paint: { glow: { color: "accent-soft", size: 24 } } },
  { key: "raised", group: "shadow", name: () => tr("بارز 3D", "Raised 3D"), paint: { shadows: [1, 2, 3, 4].map((i) => shade(i, i, 0, `#000000${["55", "44", "33", "22"][i - 1]}`)) } },
  { key: "long", group: "shadow", name: () => tr("ظل طويل", "Long shadow"), paint: { shadows: [shade(3, 3, 0, "accent-soft"), shade(6, 6, 0, "accent-soft"), shade(9, 9, 0, "#00000014"), shade(12, 12, 0, "#0000000d")] } },
  { key: "emboss", group: "shadow", name: () => tr("محفور", "Pressed in"), paint: { shadows: [shade(0, 1, 0, "#ffffffcc"), shade(0, -1, 0, "#00000040")] } },
  { key: "fire", group: "neon", name: () => tr("نار", "Fire"), paint: { shadows: [shade(0, -2, 4, "#facc15"), shade(0, -4, 10, "#f97316"), shade(0, -8, 20, "#ef4444")] } },
  { key: "ice", group: "neon", name: () => tr("ثلج", "Ice"), paint: { shadows: [shade(0, 0, 6, "#a5f3fc"), shade(0, 0, 14, "#38bdf8")] } },
  { key: "split", group: "retro", name: () => tr("ألوان مزاحة", "Split colours"), paint: { shadows: [shade(-2, 0, 0, "#ff0050"), shade(2, 0, 0, "#00e5ff")] } },
  { key: "marker", group: "line", name: () => tr("قلم تظليل", "Highlighter"), paint: { decoration: { line: "underline", style: "solid", color: "accent-soft", width: 12, offset: -8 } } },
  { key: "wavy", group: "line", name: () => tr("خط متموّج", "Wavy line"), paint: { decoration: { line: "underline", style: "wavy", color: "accent", width: 2, offset: 6 } } },
  { key: "double", group: "line", name: () => tr("خطين تحت", "Double line"), paint: { decoration: { line: "underline", style: "double", color: "accent", width: 3, offset: 6 } } },
  { key: "comic", group: "retro", name: () => tr("كوميك", "Comic"), paint: { stroke: { width: 2, color: "black" }, shadows: [shade(3, 3, 0, "black")] }, look: { weight: 900, caps: "upper" } },
  { key: "spaced", group: "type", name: () => tr("أحرف متباعدة", "Spaced capitals"), paint: {}, look: { caps: "upper", letterSpacing: 4 } },
];

/* ------------------------------------------------------------------------- eighty more */

const say = (t: string) => () => { const [ar, en, he] = t.split("|"); return { ar, en, he: he ?? en }[adminLang()]; };
const E = (key: string, group: EffectGroup, name: string, paint: Obj, look?: Obj): TextEffect => ({ key, group, name: say(name), paint, ...(look ? { look } : {}) });
const grad = (color: string, to: string, via?: string, angle = 90): Obj => ({ fill: { color, to, ...(via ? { via } : {}), angle } });
const neon = (color: string): Obj => ({ shadows: [shade(0, 0, 2, "#ffffff"), shade(0, 0, 8, color), shade(0, 0, 18, color), shade(0, 0, 36, color)] });
const mark = (color: string): Obj => ({ decoration: { line: "underline", style: "solid", color, width: 12, offset: -8 } });

TEXT_EFFECTS.push(
  // Gradients (25)
  E("rainbow", "gradient", "قوس قزح|Rainbow|קשת", grad("#ef4444", "#8b5cf6", "#f59e0b", 90)),
  E("candy", "gradient", "حلوى|Candy|ממתק", grad("#ec4899", "#8b5cf6")),
  E("mint", "gradient", "نعنع|Mint|נענע", grad("#14b8a6", "#22c55e")),
  E("peach", "gradient", "خوخ|Peach|אפרסק", grad("#fb923c", "#f472b6")),
  E("lavender", "gradient", "خزامى|Lavender|לבנדר", grad("#a78bfa", "#f0abfc")),
  E("forest", "gradient", "غابة|Forest|יער", grad("#166534", "#0d9488")),
  E("berry", "gradient", "توت|Berry|פירות יער", grad("#be185d", "#6d28d9")),
  E("flame", "gradient", "لهب|Flame|להבה", grad("#dc2626", "#facc15", "#f97316", 0)),
  E("sky", "gradient", "سماء|Sky|שמיים", grad("#38bdf8", "#2563eb")),
  E("dusk", "gradient", "مغيب|Dusk|דמדומים", grad("#4338ca", "#f472b6")),
  E("lemon", "gradient", "ليمون|Lemon|לימון", grad("#eab308", "#84cc16")),
  E("aqua", "gradient", "مائي|Aqua|אקווה", grad("#06b6d4", "#3b82f6")),
  E("rose", "gradient", "ورد|Rose|ורד", grad("#fb7185", "#be123c")),
  E("coral", "gradient", "مرجان|Coral|אלמוג", grad("#f97316", "#f43f5e")),
  E("deep-sea", "gradient", "أعماق|Deep sea|מעמקים", grad("#1e3a8a", "#0f766e")),
  E("aurora", "gradient", "شفق|Aurora|זוהר", grad("#22c55e", "#a855f7", "#3b82f6")),
  E("sunrise", "gradient", "شروق|Sunrise|זריחה", grad("#facc15", "#ec4899", "#fb923c")),
  E("mocha", "gradient", "موكا|Mocha|מוקה", grad("#78350f", "#d6a76c")),
  E("olive", "gradient", "زيتوني|Olive|זית", grad("#4d7c0f", "#a3a635")),
  E("plum", "gradient", "برقوقي|Plum|שזיף", grad("#701a75", "#c026d3")),
  E("neon-pop", "gradient", "نيون حاد|Neon pop|ניאון חד", grad("#d946ef", "#06b6d4")),
  E("pastel", "gradient", "باستيل|Pastel|פסטל", grad("#f9a8d4", "#93c5fd")),
  E("cherry", "gradient", "كرز|Cherry|דובדבן", grad("#9f1239", "#f43f5e")),
  E("cobalt", "gradient", "كوبالت|Cobalt|קובלט", grad("#1d4ed8", "#7c3aed")),
  E("store-fade", "gradient", "لون المتجر يخفت|Store colour fade|צבע החנות דוהה", grad("accent", "accent-soft", undefined, 180)),
  // Metals (6)
  E("silver", "metal", "فضّي|Silver|כסף", { ...grad("#f8fafc", "#e2e8f0", "#64748b", 180), shadows: [shade(0, 1, 0, "#0000002e")] }),
  E("rose-gold", "metal", "ذهبي وردي|Rose gold|זהב ורוד", { ...grad("#fbcfe8", "#f9a8d4", "#b76e79", 180), shadows: [shade(0, 1, 1, "#7f1d1d40")] }),
  E("bronze", "metal", "برونزي|Bronze|ארד", { ...grad("#fcd9a8", "#d6a76c", "#7c4a1d", 180), shadows: [shade(0, 1, 1, "#45210a55")] }),
  E("copper", "metal", "نحاسي|Copper|נחושת", { ...grad("#fdba74", "#fb923c", "#9a3412", 180), shadows: [shade(0, 1, 1, "#43140755")] }),
  E("platinum", "metal", "بلاتيني|Platinum|פלטינה", { ...grad("#ffffff", "#d4d4d8", "#a1a1aa", 180), shadows: [shade(0, 1, 0, "#00000033"), shade(0, 0, 8, "#ffffff80")] }),
  E("titanium", "metal", "تيتانيوم|Titanium|טיטניום", { ...grad("#cbd5e1", "#93c5fd", "#334155", 180), shadows: [shade(0, 1, 0, "#0000003d")] }),
  // Neon (9)
  E("neon-pink", "neon", "نيون زهري|Pink neon|ניאון ורוד", neon("#ec4899")),
  E("neon-blue", "neon", "نيون أزرق|Blue neon|ניאון כחול", neon("#3b82f6")),
  E("neon-green", "neon", "نيون أخضر|Green neon|ניאון ירוק", neon("#22c55e")),
  E("neon-yellow", "neon", "نيون أصفر|Yellow neon|ניאון צהוב", neon("#facc15")),
  E("neon-purple", "neon", "نيون بنفسجي|Purple neon|ניאון סגול", neon("#a855f7")),
  E("neon-red", "neon", "نيون أحمر|Red neon|ניאון אדום", neon("#ef4444")),
  E("neon-white", "neon", "نيون أبيض|White neon|ניאון לבן", neon("#e0f2fe")),
  E("neon-orange", "neon", "نيون برتقالي|Orange neon|ניאון כתום", neon("#f97316")),
  E("neon-cyan", "neon", "نيون سماوي|Cyan neon|ניאון תכלת", neon("#06b6d4")),
  // Shadows (10)
  E("soft-drop", "shadow", "ظل ناعم|Soft shadow|צל רך", { shadows: [shade(0, 4, 12, "#00000033")] }),
  E("hard-drop", "shadow", "ظل حاد|Hard shadow|צל חד", { shadows: [shade(4, 4, 0, "#00000059")] }),
  E("floating", "shadow", "طايرة|Floating|מרחף", { shadows: [shade(0, 12, 22, "#0000002e")] }),
  E("lifted", "shadow", "مرفوعة|Lifted|מורם", { shadows: [shade(0, -1, 0, "#ffffffcc"), shade(0, 6, 12, "#00000033")] }),
  E("retro-stack", "shadow", "ظلال مكدّسة|Stacked shadows|צללים מוערמים", { shadows: [shade(2, 2, 0, "accent"), shade(4, 4, 0, "accent-soft"), shade(6, 6, 0, "#00000022")] }),
  E("duotone", "shadow", "ظل بلونين|Two-tone shadow|צל דו־גוני", { shadows: [shade(3, 3, 0, "#f43f5e"), shade(6, 6, 0, "#3b82f6")] }),
  E("deep-3d", "shadow", "ثلاثي الأبعاد عميق|Deep 3D|תלת־ממד עמוק", { shadows: [1, 2, 3, 4].map((i) => shade(i, i, 0, "accent")) }),
  E("ghost", "shadow", "شبح|Ghost|רוח", { shadows: [shade(0, 0, 6, "text"), shade(0, 0, 14, "#00000026")] }),
  E("shadow-left", "shadow", "ظل جانبي|Shadow to the side|צל לצד", { shadows: [shade(-4, 4, 0, "#00000047")] }),
  E("halo", "shadow", "هالة|Halo|הילה", { shadows: [shade(0, 0, 10, "#ffffff"), shade(0, 0, 24, "accent-soft")] }),
  // Outlines (8)
  E("outline-thick", "outline", "مفرّغ عريض|Thick outline|קו מתאר עבה", { stroke: { width: 3, color: "accent" }, fill: { color: "transparent", to: "transparent" } }),
  E("outline-white", "outline", "مفرّغ أبيض|White outline|קו מתאר לבן", { stroke: { width: 2, color: "white" }, fill: { color: "transparent", to: "transparent" } }),
  E("outline-dark", "outline", "مفرّغ غامق|Dark outline|קו מתאר כהה", { stroke: { width: 2, color: "text" }, fill: { color: "transparent", to: "transparent" } }),
  E("double-outline", "outline", "مفرّغ مزدوج|Double outline|קו מתאר כפול", { stroke: { width: 1.5, color: "accent" }, fill: { color: "transparent", to: "transparent" }, shadows: [shade(3, 3, 0, "accent-soft")] }),
  E("outline-gradient", "outline", "مفرّغ بتدرّج|Outlined gradient|מתאר עם מעבר צבע", { stroke: { width: 1.5, color: "text" }, ...grad("#f472b6", "#60a5fa") }),
  E("outline-glow", "outline", "مفرّغ متوهّج|Glowing outline|מתאר זוהר", { stroke: { width: 1.5, color: "accent" }, fill: { color: "transparent", to: "transparent" }, glow: { color: "accent", size: 14 } }),
  E("two-tone", "outline", "لون بإطار|Colour with a frame|צבע עם מסגרת", { stroke: { width: 1.5, color: "black" }, fill: { color: "accent", to: "accent" } }),
  E("sticker", "outline", "ملصق|Sticker|מדבקה", { stroke: { width: 3, color: "white" }, shadows: [shade(0, 3, 6, "#00000040")] }),
  // Lines (8)
  E("underline-thick", "line", "خط تحت عريض|Thick underline|קו תחתון עבה", { decoration: { line: "underline", style: "solid", color: "accent", width: 5, offset: 6 } }),
  E("underline-dotted", "line", "خط منقّط|Dotted underline|קו מנוקד", { decoration: { line: "underline", style: "dotted", color: "accent", width: 3, offset: 6 } }),
  E("underline-dashed", "line", "خط متقطّع|Dashed underline|קו מקווקו", { decoration: { line: "underline", style: "dashed", color: "accent", width: 3, offset: 6 } }),
  E("strike", "line", "مشطوب|Struck through|קו חוצה", { decoration: { line: "through", style: "solid", color: "accent", width: 3, offset: 0 } }),
  E("overline", "line", "خط فوق|Line above|קו עליון", { decoration: { line: "overline", style: "solid", color: "accent", width: 3, offset: 0 } }),
  E("marker-yellow", "line", "تظليل أصفر|Yellow highlighter|מרקר צהוב", mark("#fde04780")),
  E("marker-mint", "line", "تظليل نعنعي|Mint highlighter|מרקר נענע", mark("#86efac80")),
  E("marker-pink", "line", "تظليل زهري|Pink highlighter|מרקר ורוד", mark("#f9a8d480")),
  // Retro and fun (10)
  E("retro-80s", "retro", "ثمانينات|Eighties|שנות השמונים", { ...grad("#f472b6", "#fb923c", undefined, 180), shadows: [shade(3, 3, 0, "#6d28d9")] }, { weight: 900, italic: true }),
  E("vaporwave", "retro", "فيبرويف|Vaporwave|ווייפורווייב", { ...grad("#22d3ee", "#e879f9", undefined, 180), shadows: [shade(4, 4, 0, "#f472b680")] }),
  E("pop-art", "retro", "بوب آرت|Pop art|פופ ארט", { stroke: { width: 2, color: "black" }, fill: { color: "#facc15", to: "#facc15" }, shadows: [shade(4, 4, 0, "black")] }, { weight: 900 }),
  E("arcade", "retro", "أركيد|Arcade|ארקייד", { fill: { color: "#4ade80", to: "#4ade80" }, shadows: [shade(0, 0, 8, "#22c55e"), shade(3, 3, 0, "#14532d")] }, { caps: "upper", letterSpacing: 2 }),
  E("cartoon", "retro", "كرتون|Cartoon|מצויר", { stroke: { width: 3, color: "black" }, shadows: [shade(0, 5, 0, "accent")] }, { weight: 900 }),
  E("glitch-heavy", "retro", "خلل قوي|Heavy glitch|תקלה חזקה", { shadows: [shade(-4, 0, 0, "#ff0050"), shade(4, 0, 0, "#00e5ff"), shade(0, 2, 0, "#00000055")] }),
  E("anaglyph", "retro", "نظارات ثلاثية|Anaglyph 3D|תלת־ממד אנגליף", { shadows: [shade(-3, -1, 0, "#ff000099"), shade(3, 1, 0, "#00ffff99")] }),
  E("chalk", "retro", "طباشير|Chalk|גיר", { fill: { color: "#f8fafc", to: "#e2e8f0" }, shadows: [shade(0, 0, 2, "#ffffffaa"), shade(1, 1, 3, "#0000004d")] }),
  E("letterpress", "retro", "طباعة محفورة|Letterpress|הדפס בלט", { shadows: [shade(0, 1, 0, "#ffffffb3"), shade(0, -1, 1, "#00000059")] }),
  E("embossed-gold", "retro", "ذهب بارز|Embossed gold|זהב מובלט", { ...grad("#fde68a", "#fcd34d", "#a16207", 180), shadows: [shade(1, 1, 0, "#78350f"), shade(2, 2, 0, "#78350f80"), shade(0, -1, 0, "#fffbebcc")] }),
  // Type styles (4)
  E("wide-caps", "type", "أحرف عريضة متباعدة|Wide light capitals|אותיות רחבות דקות", {}, { caps: "upper", letterSpacing: 8, weight: 300 }),
  E("heavy-caps", "type", "أحرف ثقيلة|Heavy capitals|אותיות כבדות", {}, { caps: "upper", weight: 900 }),
  E("light-elegant", "type", "خفيف أنيق|Light and elegant|קליל ואלגנטי", {}, { weight: 200, letterSpacing: 2 }),
  E("tight-bold", "type", "عريض متلاصق|Tight and bold|צפוף ומודגש", {}, { weight: 800, letterSpacing: -1 }),
);
/** The effects' groups, in the order they show. */
export const EFFECT_GROUPS: Array<[EffectGroup, () => string]> = [
  ["gradient", say("تدرّجات|Gradients|מעברי צבע")],
  ["metal", say("معادن|Metals|מתכות")],
  ["neon", say("نيون وتوهّج|Neon and glow|ניאון וזוהר")],
  ["shadow", say("ظلال|Shadows|צללים")],
  ["outline", say("إطارات|Outlines|קווי מתאר")],
  ["line", say("خطوط وتظليل|Lines and highlights|קווים והדגשות")],
  ["retro", say("ريترو ومرح|Retro and fun|רטרו וכיף")],
  ["type", say("شكل الأحرف|Letter styles|סגנונות אותיות")],
];

/** What picking an effect changes: its paint (the others cleared) and, outside a state, its look. */
export function effectPatch(e: TextEffect, inState: boolean): Obj {
  const patch: Obj = Object.fromEntries(PAINT_KEYS.map((k) => [k, e.paint[k] ?? null]));
  return inState ? patch : { ...patch, ...e.look };
}
/** The effect the words carry now, if their paint is exactly one. */
export function effectOf(look: (k: string) => unknown): string | undefined {
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  return TEXT_EFFECTS.find((e) => PAINT_KEYS.every((k) => same(look(k), e.paint[k])) && Object.keys(e.paint).length)?.key;
}

// How the theme's colours look in the editor's previews (the rose design's).
const SHOWN: Record<string, string> = { text: "#3b2530", muted: "#8d7380", accent: "#c86b98", "accent-soft": "#f6d6e4", "accent-contrast": "#ffffff", bg: "#fff8f4", surface: "#ffffff", border: "#e7d6dd", white: "#ffffff", black: "#000000", transparent: "transparent" };
const c = (v: unknown) => SHOWN[String(v)] ?? String(v);
/** An effect as inline CSS for its button in the editor. */
export function effectPreview(e: TextEffect): Record<string, string> {
  const p = e.paint as Record<string, Obj & Obj[]>;
  const css: Record<string, string> = {};
  if (p.stroke) css.WebkitTextStroke = `${p.stroke.width}px ${c(p.stroke.color)}`;
  if (p.fill) {
    css.backgroundImage = `linear-gradient(${p.fill.angle ?? 90}deg,${[p.fill.color, p.fill.via, p.fill.to].filter(Boolean).map(c).join(",")})`;
    css.WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.WebkitTextFillColor = "transparent";
  }
  const shadows = [...((p.shadows as unknown as Obj[]) ?? []).map((s) => `${s.x}px ${s.y}px ${s.blur}px ${c(s.color)}`), ...(p.glow ? [`0 0 ${p.glow.size}px ${c(p.glow.color)}`] : [])];
  if (shadows.length) css.textShadow = shadows.join(",");
  if (p.decoration) {
    css.textDecoration = `underline ${p.decoration.style} ${c(p.decoration.color)} ${p.decoration.width}px`;
    css.textUnderlineOffset = `${p.decoration.offset}px`;
  }
  if (e.look?.weight) css.fontWeight = String(e.look.weight);
  if (e.look?.caps === "upper") css.textTransform = "uppercase";
  if (e.look?.letterSpacing) css.letterSpacing = `${e.look.letterSpacing}px`;
  if (e.look?.italic) css.fontStyle = "italic";
  return css;
}
