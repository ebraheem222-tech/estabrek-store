import { STYLES, type Style } from "../styles";
import { t } from "../tree";
import type { Composition } from "./catalogStyles";

type Voice = { density: Style["density"]; radius: number; scale: number; weight: number; frame?: Style["img"]["frame"]; serif?: boolean; outline?: boolean };
const voice = (base: string, id: string, name: string, v: Voice): Style => {
  const source = STYLES[base];
  return {
    ...source, id, name: t(name), density: v.density,
    head: { ...source.head, scale: v.scale, weight: v.weight, caps: false, line: v.serif ? 1.06 : 1.1 },
    img: { radius: v.radius, frame: v.frame ?? "none" },
    button: { radius: v.radius, variant: v.outline ? "outline" : "solid", caps: false },
    fonts: v.serif ? { display: ["cormorant-garamond", "amiri", "frank-ruhl-libre"], text: ["jost", "readex-pro", "assistant"] } : source.fonts,
    theme: { ...source.theme, round: Math.min(2, v.radius / 14), pill: `${v.radius}px`, card: v.radius > 20 ? "round" : v.frame === "line" ? "frame" : "minimal" },
  };
};
const edition = (id: string, name: string, base: string, header: Composition["header"], footer: Composition["footer"], tags: string[], v: Voice): Composition => ({
  id, name: t(name), header, footer, tags, style: voice(base, id, name, v),
});

/** Each edition has a named opening in catalogOpenings.ts and its own visual treatment. */
export const CATALOG_EDITIONS: Composition[] = [
  edition("spotlight", "تحت الضوء|Spotlight|זרקור", "runner", "bar", "columns", ["split", "modern"], { density: "normal", radius: 8, scale: 1.25, weight: 700 }),
  edition("horizon", "امتداد|Horizon|אופק", "trail", "minimal", "line", ["landscape", "airy"], { density: "airy", radius: 0, scale: 1.15, weight: 500, serif: true }),
  edition("mosaic", "فسيفساء|Mosaic|פסיפס", "playground", "bar", "giant", ["collage", "colourful"], { density: "dense", radius: 20, scale: 1.2, weight: 600 }),
  edition("boutique", "بوتيك|Boutique|בוטיק", "atelier", "centered", "columns", ["luxury", "portrait"], { density: "airy", radius: 120, scale: 1.1, weight: 500, serif: true, outline: true }),
  edition("archive", "أرشيف|Archive|ארכיון", "edit", "minimal", "line", ["editorial", "index"], { density: "dense", radius: 0, scale: 1.3, weight: 500, frame: "line", serif: true }),
  edition("capsule", "تشكيلة|Capsule|קפסולה", "quiet", "centered", "line", ["minimal", "triptych"], { density: "airy", radius: 4, scale: 1.05, weight: 500 }),
  edition("duet", "ثنائي|Duet|דואט", "runner", "bar", "columns", ["split", "gallery"], { density: "normal", radius: 16, scale: 1.25, weight: 600, outline: true }),
  edition("canvas", "لوحة|Canvas|קנבס", "atelier", "minimal", "giant", ["art", "collage"], { density: "airy", radius: 0, scale: 1.4, weight: 500, serif: true }),
  edition("journal", "يوميّات|Journal|יומן", "edit", "centered", "columns", ["editorial", "story"], { density: "normal", radius: 0, scale: 1.1, weight: 600, frame: "line", serif: true }),
  edition("portrait", "بورتريه|Portrait|דיוקן", "quiet", "minimal", "line", ["portrait", "minimal"], { density: "airy", radius: 32, scale: 1.2, weight: 500, outline: true }),
  edition("terrace", "شرفة|Terrace|מרפסת", "trail", "bar", "columns", ["natural", "gallery"], { density: "normal", radius: 12, scale: 1.1, weight: 600 }),
  edition("loft", "مساحة|Loft|לופט", "lab", "minimal", "line", ["grid", "architectural"], { density: "dense", radius: 0, scale: 1.35, weight: 600, frame: "line" }),
  edition("prism", "منشور|Prism|מנסרה", "night", "bar", "giant", ["dark", "mosaic"], { density: "normal", radius: 24, scale: 1.15, weight: 700 }),
  edition("atlas", "أطلس|Atlas|אטלס", "lab", "ticker", "columns", ["guide", "index"], { density: "dense", radius: 0, scale: 1.1, weight: 500, outline: true }),
  edition("bloom", "تفتّح|Bloom|פריחה", "playground", "centered", "giant", ["organic", "round"], { density: "airy", radius: 48, scale: 1.15, weight: 600 }),
  edition("orbit", "مدار|Orbit|מסלול", "night", "minimal", "columns", ["dark", "round"], { density: "normal", radius: 28, scale: 1.3, weight: 600, frame: "glow" }),
  edition("avenue", "جادة|Avenue|שדרה", "street", "bar", "giant", ["bold", "triptych"], { density: "dense", radius: 0, scale: 1.4, weight: 500 }),
  edition("mono", "خط واحد|Mono|מונו", "lab", "minimal", "line", ["minimal", "lines"], { density: "airy", radius: 0, scale: 1.25, weight: 500, frame: "line", outline: true }),
  edition("craft", "حرفة|Craft|מלאכה", "atelier", "centered", "columns", ["details", "natural"], { density: "normal", radius: 8, scale: 1.15, weight: 500, serif: true, outline: true }),
  edition("lounge", "ركن هادئ|Lounge|טרקלין", "quiet", "bar", "columns", ["calm", "soft"], { density: "airy", radius: 24, scale: 1.05, weight: 500 }),
  edition("pulse", "نبض|Pulse|דופק", "runner", "ticker", "giant", ["active", "bold"], { density: "dense", radius: 12, scale: 1.45, weight: 700 }),
  edition("vista", "إطلالة|Vista|תצפית", "trail", "minimal", "line", ["panorama", "gallery"], { density: "airy", radius: 0, scale: 1.3, weight: 500, serif: true }),
  edition("balance", "توازن|Balance|איזון", "quiet", "centered", "columns", ["symmetric", "minimal"], { density: "normal", radius: 16, scale: 1.1, weight: 600 }),
  edition("summit", "قمّة|Summit|פסגה", "trail", "bar", "giant", ["outdoor", "guide"], { density: "normal", radius: 4, scale: 1.35, weight: 700 }),
  edition("ripple", "تموّج|Ripple|אדווה", "playground", "minimal", "line", ["soft", "collage"], { density: "airy", radius: 36, scale: 1.1, weight: 500 }),
  edition("meadow", "مرج|Meadow|אחו", "trail", "centered", "columns", ["natural", "editorial"], { density: "airy", radius: 18, scale: 1.2, weight: 500, serif: true }),
  edition("gridline", "شبكة|Gridline|רשת", "lab", "bar", "line", ["grid", "catalog"], { density: "dense", radius: 2, scale: 1.15, weight: 600, frame: "line" }),
  edition("narrative", "رواية|Narrative|סיפור", "edit", "centered", "giant", ["story", "serif"], { density: "airy", radius: 0, scale: 1.4, weight: 500, serif: true }),
  edition("form", "تكوين|Form|צורה", "quiet", "minimal", "line", ["gallery", "minimal"], { density: "normal", radius: 80, scale: 1.2, weight: 500, outline: true }),
  edition("pavilion", "جناح|Pavilion|ביתן", "atelier", "centered", "columns", ["landscape", "luxury"], { density: "airy", radius: 0, scale: 1.15, weight: 500, frame: "line", serif: true }),
  edition("nook", "زاوية|Nook|פינה", "retro", "bar", "columns", ["compact", "warm"], { density: "dense", radius: 18, scale: 1.1, weight: 500 }),
  edition("stage", "منصّة|Stage|במה", "night", "minimal", "giant", ["cinematic", "dark"], { density: "airy", radius: 0, scale: 1.45, weight: 700 }),
  edition("coast", "شاطئ|Coast|חוף", "quiet", "bar", "line", ["airy", "natural"], { density: "airy", radius: 12, scale: 1.15, weight: 500 }),
  edition("rhythm", "إيقاع|Rhythm|קצב", "retro", "ticker", "giant", ["bold", "grid"], { density: "normal", radius: 8, scale: 1.3, weight: 600, frame: "offset" }),
  edition("aura", "هالة|Aura|הילה", "atelier", "centered", "columns", ["soft", "luxury"], { density: "airy", radius: 28, scale: 1.25, weight: 500, serif: true, outline: true }),
];
