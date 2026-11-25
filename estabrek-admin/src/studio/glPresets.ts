/**
 * Ready WebGL scenes to start from (the shop's pageTree/glScene.ts): the theme library's particle tricks — words in
 * dots, a morphing word, a galaxy, a dotted globe, DNA, code rain, fireworks, a warp… — each a whole scene the owner
 * then changes in the builder (GlScenePanel.tsx). Words in the shop's three languages. Pure data, and a maker of a
 * new scene at random from the same parts.
 */
import { GL_BG_SHADERS, GL_FLOWS, GL_FORMS, type GlShape } from "../../../estabrek-storefront/src/pageTree/glScene";

type Obj = Record<string, unknown>;
export type GlPreset = { id: string; name: string; gl: Obj };
const W = (ar: string, en: string, he: string) => ({ ar, en, he });
const L = (shapes: GlShape[], more: Obj = {}): Obj => ({ shapes, ...more });

export const GL_PRESETS: GlPreset[] = [
  {
    id: "word", name: "كلامك من نجوم بتهرب من الماوس|Your words in stars that flee the pointer|המילים שלך מכוכבים שבורחים מהעכבר",
    gl: { bg: { kind: "radial", c1: "#1b1145", c2: "#05050b" }, layers: [L(["text"], { text: W("أهلاً وسهلاً", "WELCOME", "ברוכים הבאים"), count: 7000, size: 2.2, colouring: "blend", c1: "#c4b5fd", c2: "#22d3ee", spin: 0, wander: 0.08, twinkle: 0.2 })], pointer: { mode: "repel", radius: 0.2, strength: 1.4 }, click: "burst" },
  },
  {
    id: "morph", name: "كرة بتصير كلام وبعدين قلب|A sphere that becomes words, then a heart|כדור שהופך למילים ואז ללב",
    gl: { bg: { kind: "shader", shader: "aurora", speed: 0.6 }, layers: [L(["sphere", "text", "heart"], { text: W("مرحبا", "HELLO", "שלום"), count: 6000, size: 2.3, colouring: "rainbow", spin: 0.3 })], morph: { by: "auto", hold: 1.8, time: 1.6 }, pointer: { mode: "swirl", radius: 0.25, strength: 1 }, click: "next" },
  },
  {
    id: "galaxy", name: "مجرّة بتلف (اسحبها لتلفّها)|A turning galaxy (drag to turn it)|גלקסיה מסתובבת (גררו לסובב)",
    gl: { bg: { kind: "color", c1: "#04040a" }, camera: { tilt: 55, spin: 0.35, depth: 0.6, drag: true }, layers: [L(["galaxy"], { count: 16000, size: 1.6, colouring: "three", c1: "#fde68a", c2: "#f472b6", c3: "#6366f1", spin: 0.25, twinkle: 0.3 })], pointer: { mode: "none" } },
  },
  {
    id: "globe", name: "كرة أرضية منقّطة ونجوم بتدور حولها|A dotted world with stars going round it|כדור ארץ מנוקד וכוכבים סביבו",
    gl: { bg: { kind: "gradient", c1: "#020617", c2: "#0c1a3a" }, camera: { tilt: 14, spin: 0.45, drag: true }, layers: [L(["globe"], { count: 9000, size: 1.8, colouring: "one", c1: "#38bdf8", twinkle: 0.1 }), L(["orbit"], { count: 500, size: 2.6, sprite: "spark", colouring: "one", c1: "#fbbf24" })], pointer: { mode: "none" } },
  },
  {
    id: "dna", name: "حمض نووي DNA|A DNA helix|סליל DNA",
    gl: { bg: { kind: "radial", c1: "#0f2a2a", c2: "#020607" }, camera: { tilt: 0, spin: 0.6 }, layers: [L(["helix"], { count: 5000, size: 2.4, colouring: "blend", c1: "#34d399", c2: "#60a5fa", wander: 0.05 })], pointer: { mode: "bulge", radius: 0.25 } },
  },
  {
    id: "knot", name: "عقدة ضو بتلف|A turning knot of light|קשר אור מסתובב",
    gl: { bg: { kind: "color", c1: "#07040f" }, camera: { tilt: 20, spin: 0.3, depth: 0.7 }, layers: [L(["knot"], { count: 9000, size: 1.8, colouring: "three", c1: "#f0abfc", c2: "#a78bfa", c3: "#22d3ee", spin: 0.4 })], trails: 0.5 },
  },
  {
    id: "wave", name: "بحر نقاط بيموج|A sea of dots in waves|ים של נקודות בגלים",
    gl: { bg: { kind: "gradient", c1: "#04111f", c2: "#000000" }, camera: { tilt: 28, depth: 0.8, zoom: 1.2 }, layers: [L(["wave"], { count: 12000, size: 1.8, sprite: "dot", colouring: "blend", c1: "#22d3ee", c2: "#a78bfa", wave: 0.8, speed: 1, spin: 0, wander: 0 })], pointer: { mode: "bulge", radius: 0.3, strength: 1.2 } },
  },
  {
    id: "breathe", name: "كرة بتتنفّس وبتنتفخ تحت الماوس|A breathing sphere that swells under the pointer|כדור נושם שמתנפח מתחת לעכבר",
    gl: { bg: { kind: "radial", c1: "#3b0a2a", c2: "#090208" }, layers: [L(["sphere"], { count: 8000, size: 2, colouring: "blend", c1: "#fb7185", c2: "#fde047", pulse: 0.8, spin: 0.25 })], pointer: { mode: "bulge", radius: 0.3, strength: 1.5 }, click: "shock" },
  },
  {
    id: "planet", name: "كوكب وحلقاته|A planet and its rings|כוכב לכת וטבעותיו",
    gl: { bg: { kind: "color", c1: "#030308" }, camera: { tilt: 22, spin: 0.2, depth: 0.6, drag: true }, layers: [L(["rings"], { count: 14000, size: 1.6, colouring: "three", c1: "#fde68a", c2: "#fb923c", c3: "#a16207", spin: 0.2, twinkle: 0.15 })] },
  },
  {
    id: "tornado", name: "إعصار|A tornado|טורנדו",
    gl: { bg: { kind: "gradient", c1: "#111827", c2: "#030712" }, layers: [L(["cone"], { count: 9000, size: 1.8, colouring: "blend", c1: "#e5e7eb", c2: "#60a5fa", spin: 1.6, wander: 0.25 })], trails: 0.6, pointer: { mode: "swirl", radius: 0.3, strength: 1.5 } },
  },
  {
    id: "heart", name: "قلب نابض|A beating heart|לב פועם",
    gl: { bg: { kind: "radial", c1: "#4c0519", c2: "#0a0204" }, layers: [L(["heart"], { count: 6000, size: 2.2, colouring: "blend", c1: "#fb7185", c2: "#f43f5e", pulse: 1, speed: 1.6, spin: 0 })], pointer: { mode: "repel", radius: 0.2, strength: 1.2 }, click: "burst" },
  },
  {
    id: "code", name: "مطر أكواد|Code rain|גשם קוד",
    gl: { bg: { kind: "color", c1: "#000000" }, trails: 0.85, layers: [L(["rain"], { count: 900, size: 14, sprite: "glyph", glyphs: "01アイウエオカキクケコ", colouring: "one", c1: "#22c55e", twinkle: 0, depth: 0.2 })], pointer: { mode: "repel", radius: 0.12 } },
  },
  {
    id: "snow", name: "تلج ناعم|Soft snow|שלג רך",
    gl: { bg: { kind: "gradient", c1: "#1e3a5f", c2: "#0b1220" }, layers: [L(["snow"], { count: 1600, size: 3.2, colouring: "one", c1: "#ffffff", opacity: 0.85, depth: 1.2, twinkle: 0.1 })], pointer: { mode: "repel", radius: 0.18 } },
  },
  {
    id: "fireflies", name: "يراعات بالليل|Fireflies at night|גחליליות בלילה",
    gl: { bg: { kind: "radial", c1: "#1c2a12", c2: "#040603" }, layers: [L(["fireflies"], { count: 260, size: 7, colouring: "blend", c1: "#fde68a", c2: "#a3e635", depth: 0.6 })], pointer: { mode: "attract", radius: 0.3, strength: 0.8 } },
  },
  {
    id: "fireworks", name: "ألعاب نارية|Fireworks|זיקוקים",
    gl: { bg: { kind: "color", c1: "#05030a" }, trails: 0.82, layers: [L(["fireworks"], { count: 3000, size: 2.4, colouring: "random", c1: "#f472b6", c2: "#fde047", c3: "#60a5fa", twinkle: 0 })], pointer: { mode: "none" } },
  },
  {
    id: "warp", name: "سفر بسرعة الضو|Travelling at light speed|מסע במהירות האור",
    gl: { bg: { kind: "color", c1: "#000000" }, trails: 0.6, layers: [L(["warp"], { count: 2600, size: 2, colouring: "blend", c1: "#ffffff", c2: "#a5b4fc", speed: 1.4, twinkle: 0 })], pointer: { mode: "none" } },
  },
  {
    id: "vortex", name: "دوّامة|A whirlpool|מערבולת",
    gl: { bg: { kind: "radial", c1: "#1e1b4b", c2: "#020205" }, camera: { tilt: 50 }, layers: [L(["vortex"], { count: 7000, size: 1.8, colouring: "three", c1: "#fef3c7", c2: "#f472b6", c3: "#6366f1", speed: 1.2 })], trails: 0.55 },
  },
  {
    id: "fountain", name: "نافورة ضو|A fountain of light|מזרקת אור",
    gl: { bg: { kind: "gradient", c1: "#0c0a1f", c2: "#000000" }, layers: [L(["fountain"], { count: 3500, size: 2.4, colouring: "blend", c1: "#67e8f9", c2: "#ffffff", twinkle: 0 })], trails: 0.5, pointer: { mode: "repel", radius: 0.2 } },
  },
  {
    id: "flow", name: "خطوط منسابة|Flowing lines|קווים זורמים",
    gl: { bg: { kind: "color", c1: "#0b0b10" }, trails: 0.93, layers: [L(["flow"], { count: 3000, size: 1.6, sprite: "dot", colouring: "three", c1: "#fb923c", c2: "#f472b6", c3: "#818cf8", opacity: 0.6, twinkle: 0 })], pointer: { mode: "swirl", radius: 0.25, strength: 1.5 } },
  },
  {
    id: "network", name: "شبكة متصلة|A connected network|רשת מחוברת",
    gl: { bg: { kind: "color", c1: "#0a0f1f" }, layers: [L(["cloud"], { count: 240, size: 4, sprite: "dot", links: 0.8, colouring: "one", c1: "#93c5fd", wander: 1, speed: 0.6, scale: 2.2, twinkle: 0 })], pointer: { mode: "attract", radius: 0.3 } },
  },
  {
    id: "atom", name: "ذرّة|An atom|אטום",
    gl: { bg: { kind: "radial", c1: "#0b2530", c2: "#020507" }, camera: { tilt: 10, spin: 0.2, drag: true }, layers: [L(["ball"], { count: 1200, size: 2.6, colouring: "blend", c1: "#fef08a", c2: "#fb923c", scale: 0.25, pulse: 0.5 }), L(["orbit"], { count: 1800, size: 2.2, sprite: "spark", colouring: "one", c1: "#67e8f9" })] },
  },
  {
    id: "sunflower", name: "زهرة دوّار الشمس بألوان قوس قزح|A rainbow sunflower|חמנייה בצבעי הקשת",
    gl: { bg: { kind: "color", c1: "#07070d" }, layers: [L(["spiral"], { count: 5000, size: 2.4, sprite: "dot", colouring: "rainbow", spin: 0, wave: 0.2 })], camera: { spin: 0 }, pointer: { mode: "swirl", radius: 0.3, strength: 1.2 } },
  },
  {
    id: "scroll", name: "كلام بيتجمّع مع السكرول|Words that gather as you scroll|מילים שמתאספות בגלילה",
    gl: { bg: { kind: "radial", c1: "#172554", c2: "#020617" }, scroll: "scatter", layers: [L(["text"], { text: W("أهلاً فيك", "HELLO", "שלום"), count: 7000, size: 2.2, colouring: "blend", c1: "#ffffff", c2: "#93c5fd", spin: 0, wander: 0.05 })], pointer: { mode: "repel", radius: 0.18 } },
  },
  // Maths and physics (the shop's glPhysics.ts and its maths forms).
  {
    id: "lorenz", name: "فراشة لورنز: الفوضى بعينها|Lorenz's butterfly: chaos itself|הפרפר של לורנץ: הכאוס עצמו",
    gl: { bg: { kind: "color", c1: "#04040a" }, camera: { spin: 0.18, tilt: 8, drag: true }, bloom: 0.55, layers: [L(["lorenz"], { count: 12000, size: 1.5, colouring: "three", c1: "#fde68a", c2: "#f472b6", c3: "#6366f1", twinkle: 0, wander: 0 })] },
  },
  {
    id: "aizawa", name: "جاذب أيزاوا|The Aizawa attractor|מושך אייזאווה",
    gl: { bg: { kind: "radial", c1: "#0f1b2d", c2: "#020308" }, camera: { spin: 0.25, tilt: 14, drag: true }, bloom: 0.45, layers: [L(["aizawa"], { count: 12000, size: 1.5, colouring: "three", c1: "#67e8f9", c2: "#a78bfa", c3: "#f0abfc", twinkle: 0 })] },
  },
  {
    id: "thomas", name: "جاذب توماس بيلف|The turning Thomas attractor|מושך תומאס מסתובב",
    gl: { bg: { kind: "color", c1: "#050308" }, camera: { spin: 0.3, drag: true }, layers: [L(["thomas"], { count: 12000, size: 1.5, scale: 1.4, colouring: "rainbow", twinkle: 0 })], trails: 0.4 },
  },
  {
    id: "flock", name: "سرب طيور بيهرب من الماوس|A flock that flees the pointer|להקה שבורחת מהעכבר",
    gl: { bg: { kind: "gradient", c1: "#fb923c", c2: "#3b0764" }, layers: [L(["flock"], { count: 1100, size: 2.6, sprite: "dot", colouring: "one", c1: "#1c1917", glow: false, twinkle: 0 })], pointer: { mode: "repel", radius: 0.3 } },
  },
  {
    id: "gravity", name: "شموس وجاذبية: حط الماوس وصير شمس|Suns and gravity: your pointer is a sun too|שמשות וכבידה: העכבר הוא שמש",
    gl: { bg: { kind: "color", c1: "#030308" }, trails: 0.85, bloom: 0.5, layers: [L(["gravity"], { count: 3500, size: 1.8, colouring: "three", c1: "#fef3c7", c2: "#fb923c", c3: "#6366f1", twinkle: 0 })], pointer: { mode: "gravity" } },
  },
  {
    id: "pendulum", name: "بندولات الفوضى: فرق شعرة بيصير عالم|Chaos pendulums: a hair apart becomes a world apart|מטוטלות כאוס: שערה הופכת לעולם",
    gl: { bg: { kind: "color", c1: "#05050a" }, trails: 0.9, bloom: 0.35, layers: [L(["pendulum"], { count: 1600, size: 2, colouring: "rainbow", twinkle: 0 })], click: "none" },
  },
  {
    id: "field", name: "خطوط الحقل الكهربائي (الماوس شحنة)|Electric field lines (the pointer is a charge)|קווי שדה חשמלי (העכבר הוא מטען)",
    gl: { bg: { kind: "color", c1: "#04060c" }, trails: 0.92, layers: [L(["charge"], { count: 3000, size: 1.4, colouring: "blend", c1: "#38bdf8", c2: "#f472b6", twinkle: 0 })], pointer: { mode: "repel", radius: 0.1, strength: 0.4 } },
  },
  {
    id: "cloth", name: "قماش بالهوا (ادفعه بالماوس)|Cloth in the wind (push it)|בד ברוח (דחפו אותו)",
    gl: { bg: { kind: "radial", c1: "#2a1036", c2: "#07030a" }, layers: [L(["cloth"], { count: 2400, size: 2.4, sprite: "dot", colouring: "blend", c1: "#f9a8d4", c2: "#7c3aed", twinkle: 0 })], pointer: { mode: "repel", radius: 0.22, strength: 1.6 }, click: "burst" },
  },
  {
    id: "pond", name: "بركة بتموج تحت الماوس والمطر|A pond rippling under the pointer and rain|בריכה שמגלגלת מתחת לעכבר ולגשם",
    gl: { bg: { kind: "gradient", c1: "#020617", c2: "#0c1a3a" }, camera: { tilt: 28 }, layers: [L(["pond"], { count: 8000, size: 1.8, sprite: "dot", colouring: "blend", c1: "#67e8f9", c2: "#1e40af", twinkle: 0 })] },
  },
  {
    id: "hopf", name: "ألياف هوبف: دواير بأربع أبعاد|The Hopf fibration: circles in four dimensions|סיבי הופף: מעגלים בארבעה ממדים",
    gl: { bg: { kind: "color", c1: "#05050b" }, camera: { spin: 0.2, tilt: 20, drag: true }, layers: [L(["hopf"], { count: 10000, size: 1.3, colouring: "rainbow", twinkle: 0 })] },
  },
  {
    id: "maths", name: "كلاين ← موبيوس ← صيغة خارقة ← ليساجو|Klein → Möbius → superformula → Lissajous|קליין ← מביוס ← נוסחת־על ← ליסז'ו",
    gl: { bg: { kind: "radial", c1: "#1e1b4b", c2: "#05050b" }, camera: { spin: 0.25, tilt: 22, drag: true }, layers: [L(["klein", "mobius", "supershape", "lissajous"], { count: 9000, size: 1.6, colouring: "three", c1: "#fde68a", c2: "#f472b6", c3: "#6366f1" })], morph: { by: "auto", hold: 2, time: 1.6 }, click: "next" },
  },
  {
    id: "nature", name: "سرخس ← هرم سيربنسكي ← وردة (فراكتالات)|Fern → Sierpiński → rose (fractals)|שרך ← שרפינסקי ← ורד (פרקטלים)",
    gl: { bg: { kind: "color", c1: "#04080a" }, layers: [L(["fern", "sierpinski", "rose", "gyroid"], { count: 10000, size: 1.5, colouring: "blend", c1: "#86efac", c2: "#0ea5e9", spin: 0.1 })], morph: { by: "auto", hold: 2.2, time: 1.6 }, click: "next" },
  },
  {
    id: "emoji", name: "إيموجي بألوانه من نقاط|Emoji in their own colours, in dots|אמוג'י בצבעים שלהם מנקודות",
    gl: { bg: { kind: "radial", c1: "#2e1065", c2: "#05030a" }, layers: [L(["text"], { text: W("🌸✨🦋", "🌸✨🦋", "🌸✨🦋"), count: 9000, size: 2.2, colouring: "picture", spin: 0, wander: 0.05 })], pointer: { mode: "repel", radius: 0.2, strength: 1.4 }, click: "burst" },
  },
  {
    id: "bokeh", name: "ضو مغبّش متل عدسة كاميرا|Soft bokeh, like a camera lens|בוקה רך, כמו עדשת מצלמה",
    gl: { bg: { kind: "radial", c1: "#3b0a2a", c2: "#05020a" }, camera: { spin: 0.15, depth: 0.9, focus: 0.3, blur: 0.8 }, chroma: 0.5, layers: [L(["ball"], { count: 2000, size: 2.6, scale: 1.7, colouring: "three", c1: "#fde68a", c2: "#fb7185", c3: "#a78bfa", twinkle: 0.4 })], pointer: { mode: "gravity" } },
  },
  // Words or a picture read like a picture: outlines, stipple, blobs, corners (the shop's glPicture.ts).
  {
    id: "outline", name: "كلامك بخطوط حوافه بتتحرك متل الفرشاة|Your words in their outlines, moving like a brush|המילים בקווי המתאר, זזות כמו מכחול",
    gl: { bg: { kind: "radial", c1: "#0f172a", c2: "#020617" }, bloom: 0.5, layers: [L(["text"], { text: W("استوديو", "STUDIO", "סטודיו"), pictureModes: ["edges"], strokes: 0.5, count: 6000, size: 1.6, colouring: "blend", c1: "#67e8f9", c2: "#f0abfc", spin: 0, wander: 0, twinkle: 0 })], pointer: { mode: "repel", radius: 0.2, strength: 1.2 }, click: "burst" },
  },
  {
    id: "ink", name: "كلامك منقّط بالحبر عورق|Your words stippled in ink on paper|המילים בנקודות דיו על נייר",
    gl: { bg: { kind: "color", c1: "#f5efe6" }, layers: [L(["text"], { text: W("حبر", "INK", "דיו"), pictureModes: ["stipple"], count: 5000, size: 2.2, sprite: "dot", glow: false, colouring: "one", c1: "#1c1917", spin: 0, wander: 0.04, twinkle: 0 })], pointer: { mode: "repel", radius: 0.15 } },
  },
  {
    id: "blobs", name: "إيموجي من بقع ملوّنة بأحجامها|Emoji in coloured blobs of their own sizes|אמוג'י מכתמים צבעוניים בגדלים שלהם",
    gl: { bg: { kind: "radial", c1: "#1e1b4b", c2: "#05030a" }, layers: [L(["text"], { text: W("🌸🍉🦋", "🌸🍉🦋", "🌸🍉🦋"), pictureModes: ["blobs"], count: 5000, size: 1.6, colouring: "picture", spin: 0, wander: 0.06, twinkle: 0.2 })], pointer: { mode: "swirl", radius: 0.25 }, click: "burst" },
  },
  {
    id: "constellation-word", name: "زوايا كلامك نجوم موصولة|The corners of your words as linked stars|פינות המילים ככוכבים מחוברים",
    gl: { bg: { kind: "color", c1: "#05070f" }, layers: [L(["text"], { text: W("نجوم", "STARS", "כוכבים"), pictureModes: ["features"], links: 0.7, count: 3000, size: 1.6, sprite: "spark", colouring: "one", c1: "#bfdbfe", spin: 0, wander: 0.05, twinkle: 0.5 })], pointer: { mode: "attract", radius: 0.25 } },
  },
  {
    id: "read", name: "كلامك: نقاط ← خطوط ← بقع ← حبر|Your words: dots → outlines → blobs → ink|המילים: נקודות ← קווים ← כתמים ← דיו",
    gl: { bg: { kind: "radial", c1: "#2a1036", c2: "#07030a" }, layers: [L(["text", "text", "text", "text"], { text: W("سحر", "MAGIC", "קסם"), pictureModes: ["pixels", "edges", "blobs", "stipple"], count: 6000, size: 1.8, colouring: "three", c1: "#fde68a", c2: "#f472b6", c3: "#818cf8", spin: 0, wander: 0.04, twinkle: 0 })], morph: { by: "auto", hold: 1.6, time: 1.4 }, click: "next" },
  },
  {
    id: "aurora-stars", name: "شفق ونجوم بتلمع|Aurora and twinkling stars|זוהר וכוכבים מנצנצים",
    gl: { bg: { kind: "shader", shader: "aurora", speed: 0.5 }, layers: [L(["cloud"], { count: 900, size: 2.6, sprite: "star", colouring: "one", c1: "#ffffff", scale: 2.6, twinkle: 0.9, wander: 0.1, speed: 0.5, spin: 0 })], pointer: { mode: "none" } },
  },
];

/** A new scene at random from the same parts: a background, one or two layers, colours that go together. */
const PALETTES = [
  ["#c4b5fd", "#22d3ee", "#f472b6"], ["#fde68a", "#fb923c", "#ef4444"], ["#34d399", "#60a5fa", "#a78bfa"],
  ["#ffffff", "#93c5fd", "#1d4ed8"], ["#fbcfe8", "#f472b6", "#9d174d"], ["#fef08a", "#a3e635", "#16a34a"],
];
const BGS: Obj[] = [
  { kind: "radial", c1: "#1b1145", c2: "#05050b" }, { kind: "color", c1: "#05050a" }, { kind: "gradient", c1: "#04111f", c2: "#000000" },
  ...["aurora", "ink", "mesh", "plasma", "tunnel", "oil"].filter((k) => (GL_BG_SHADERS as readonly string[]).includes(k)).map((shader) => ({ kind: "shader", shader, speed: 0.6 })),
];
export function randomScene(rand: () => number = Math.random): Obj {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const forms = GL_FORMS.filter((f) => f !== "image" && f !== "text" && f !== "grid");
  const palette = pick(PALETTES);
  const flowFirst = rand() < 0.35;
  const main: Obj = flowFirst
    ? L([pick(GL_FLOWS.filter((f) => f !== "fountain"))], { count: 2500, size: 2.4 })
    : L(rand() < 0.5 ? [pick(forms)] : [pick(forms), pick(forms), pick(forms)].filter((v, i, a) => a.indexOf(v) === i), { count: 7000, size: 2, spin: Math.round((rand() * 0.8 - 0.2) * 10) / 10 });
  Object.assign(main, { colouring: pick(["blend", "three", "rainbow", "random"]), c1: palette[0], c2: palette[1], c3: palette[2], sprite: pick(["soft", "soft", "dot", "spark", "star"]) });
  const layers = [main];
  if (rand() < 0.4) layers.push(L(["fireflies"], { count: 160, size: 5, colouring: "one", c1: palette[0] }));
  return {
    bg: pick(BGS),
    layers,
    camera: { tilt: Math.round(rand() * 40), spin: Math.round(rand() * 5) / 10, drag: true },
    pointer: { mode: pick(["repel", "swirl", "bulge", "attract"]), radius: 0.22 },
    click: pick(["burst", "shock", "next"]),
    morph: { by: "auto", hold: 2, time: 1.6 },
    ...(rand() < 0.3 ? { trails: 0.6 } : {}),
  };
}
