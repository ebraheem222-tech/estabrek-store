/**
 * The product card's moving parts as the editor names them, and ready card designs that set
 * them all at once (the shop draws them: estabrek-storefront/src/components/ConfiguredProductCard).
 */
import type { CardDesign } from "../../../../estabrek-storefront/src/lib/visualControls";

type Named = [key: string, name: string][];
export const CARD_HOVER_NAMES: Named = [
  ["none", "بلا حركة|Still|ללא תנועה"],
  ["swap", "تتبدّل لصورة تانية|Turns into a second picture|מתחלפת לתמונה שנייה"],
  ["slide", "التانية بتنزلق لجوّا|The second slides in|השנייה מחליקה פנימה"],
  ["zoomSwap", "تانية مع تقريب|Second picture with a zoom|שנייה עם זום"],
  ["flip", "بتنقلب على ضهرها|Flips over|מתהפכת"],
  ["curtain", "ستارة بتنزل|A curtain comes down|וילון יורד"],
  ["circle", "دائرة بتكبر|A circle opens|עיגול נפתח"],
  ["cycle", "كل الصور ورا بعض|All its pictures in turn|כל התמונות ברצף"],
  ["zoom", "تقريب|Zoom|זום"],
  ["pan", "بتمشي ببطء|Slow pan|תנועה איטית"],
  ["grayscale", "أبيض وأسود ← ألوان|Black & white to colour|שחור-לבן לצבע"],
  ["blur", "ضبابية|Blur|טשטוש"],
];
export const CARD_LIFT_NAMES: Named = [
  ["none", "بلا حركة|Still|ללא תנועה"],
  ["lift", "بترتفع|Lifts|מתרומם"],
  ["shadow", "ظل أعمق|Deeper shadow|צל עמוק"],
  ["glow", "توهّج|Glow|זוהר"],
  ["border", "إطار ملوّن|Coloured border|מסגרת צבעונית"],
  ["scale", "بتكبر شوي|Grows a little|גדל מעט"],
  ["tilt", "بتميل مع الماوس|Tilts toward the pointer|נוטה אל הסמן"],
];
export const CARD_ENTER_NAMES: Named = [
  ["none", "بلا دخول|No entrance|ללא כניסה"],
  ["fade", "بتبيّن بهدوء|Fades in|נכנס בדעיכה"],
  ["up", "بتطلع لفوق|Rises|עולה"],
  ["zoom", "بتكبر|Grows in|גדל פנימה"],
  ["blur", "من الضبابية|Out of a blur|מתוך טשטוש"],
  ["flip", "بتنقلب لقدّام|Flips forward|מתהפך קדימה"],
  ["side", "من الجنب|From the side|מהצד"],
];
export const CARD_BUTTON_NAMES: Named = [
  ["full", "زر عريض|Full button|כפתור רחב"],
  ["pill", "كبسولة|Pill|גלולה"],
  ["outline", "إطار|Outline|קו מתאר"],
  ["text", "كلمة تحتها خط|Underlined word|מילה עם קו"],
  ["icon", "أيقونة شنطة|Bag icon|אייקון תיק"],
  ["hover", "بيطلع فوق الصورة|Appears over the picture|מופיע על התמונה"],
];
export const CARD_BADGE_NAMES: Named = [
  ["pill", "كبسولة|Pill|גלולה"],
  ["corner", "بالزاوية|In the corner|בפינה"],
  ["circle", "دائرة|Circle|עיגול"],
  ["ribbon", "شريطة مايلة|Ribbon|סרט"],
];
export const CARD_RATIO_NAMES: Named = [
  ["portrait", "3:4"], ["square", "1:1"], ["landscape", "4:3"], ["tall", "2:3"], ["wide", "16:9"],
].map(([k, n]) => [k, `${n}|${n}|${n}`]) as Named;

/** Ready card designs: one click sets the card's shape, picture, motion and button. */
export const CARD_PRESETS: { key: string; name: string; design: CardDesign }[] = [
  { key: "boutique", name: "بوتيك|Boutique|בוטיק", design: { radius: 24, padding: 10, gap: 10, imageRatio: "tall", hover: "zoomSwap", cardHover: "lift", enter: "up", buttonStyle: "hover", align: "center", shadow: "soft", showBadge: true, badgeStyle: "pill", titleLines: 2 } },
  { key: "minimal", name: "بسيط|Minimal|מינימלי", design: { radius: 0, padding: 0, gap: 8, imageRatio: "portrait", hover: "swap", cardHover: "none", enter: "fade", buttonStyle: "text", shadow: "none", titleLines: 1, showCategory: false } },
  { key: "bold", name: "جريء|Bold|נועז", design: { radius: 8, padding: 14, gap: 12, imageRatio: "square", hover: "slide", cardHover: "glow", enter: "zoom", buttonStyle: "full", shadow: "deep", showBadge: true, badgeStyle: "corner", titleSize: 20 } },
  { key: "luxury", name: "فخم|Luxury|יוקרה", design: { radius: 0, padding: 16, gap: 14, imageRatio: "portrait", hover: "curtain", cardHover: "border", enter: "fade", buttonStyle: "outline", align: "center", shadow: "none", titleSize: 16, background: "#111111", textColor: "#f3e9d2", borderColor: "#3a332a", buttonColor: "#c9a96e", buttonTextColor: "#111111" } },
  { key: "playful", name: "مرح|Playful|שובב", design: { radius: 28, padding: 12, gap: 10, imageRatio: "square", hover: "circle", cardHover: "tilt", enter: "flip", buttonStyle: "pill", align: "center", shadow: "soft", showBadge: true, badgeStyle: "circle" } },
  { key: "gallery", name: "معرض صور|Gallery|גלריה", design: { radius: 14, padding: 0, gap: 10, imageRatio: "tall", hover: "cycle", cardHover: "scale", enter: "blur", buttonStyle: "icon", shadow: "none", showCategory: false } },
  { key: "editorial", name: "مجلة|Editorial|מגזין", design: { radius: 0, padding: 0, gap: 10, imageRatio: "tall", hover: "grayscale", cardHover: "none", enter: "side", buttonStyle: "text", titleSize: 19, showSwatches: false } },
  { key: "compact", name: "مدمج|Compact|קומפקטי", design: { layout: "horizontal", radius: 14, padding: 10, gap: 10, imageRatio: "square", hover: "zoom", cardHover: "shadow", enter: "up", buttonStyle: "icon", titleLines: 2 } },
  { key: "cinema", name: "سينمائي|Cinematic|קולנועי", design: { radius: 20, padding: 0, gap: 12, imageRatio: "wide", hover: "pan", cardHover: "lift", enter: "up", buttonStyle: "hover", shadow: "deep" } },
  { key: "flip", name: "بطاقة بتنقلب|Flip card|כרטיס מתהפך", design: { radius: 18, padding: 10, gap: 10, imageRatio: "portrait", hover: "flip", enter: "zoom", buttonStyle: "pill", align: "center", shadow: "soft" } },
];

const COLOURS = ["background", "textColor", "borderColor", "buttonColor", "buttonTextColor"] as const;
/** A ready design over the current one: its own colours win, else the merchant's colours stay. */
export function withPreset(current: CardDesign | null | undefined, preset: CardDesign): CardDesign {
  const kept: CardDesign = {};
  for (const k of COLOURS) if (current?.[k] && !preset[k]) kept[k] = current[k];
  return { ...kept, ...preset };
}
