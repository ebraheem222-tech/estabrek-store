/**
 * Ready scroll effects for a section (or any element): it comes in as it scrolls into view
 * (from a look back to its own, between two heights of the screen), moves slower or faster
 * than the page (parallax), holds while the page scrolls (pin), or lights its words up.
 * Each is one `motion.scroll` (the shop plays it with GSAP ScrollTrigger: pageTree/TreeMotion.tsx).
 */
import { adminLang } from "../lib/lang";
import type { Motion } from "./look";

type Scroll = NonNullable<Motion["scroll"]>;
export type ScrollGroup = "enter" | "turn" | "parallax" | "pin" | "words";
export type ScrollEffect = { key: string; group: ScrollGroup; name: () => string; scroll: Scroll; only?: ReadonlySet<string> };

const say = (t: string) => () => { const [ar, en, he] = t.split("|"); return { ar, en, he: he ?? en }[adminLang()]; };
const keys = (from: NonNullable<Scroll["from"]>, start = 100, end = 40, ease?: string): Scroll => ({ kind: "keys", from, to: Object.fromEntries(Object.keys(from).map((k) => [k, k === "scale" || k === "opacity" ? 1 : 0])), start, end, ...(ease ? { ease } : {}) });
const S = (key: string, group: ScrollGroup, name: string, scroll: Scroll, only?: ReadonlySet<string>): ScrollEffect => ({ key, group, name: say(name), scroll, ...(only ? { only } : {}) });
const SECTION = new Set(["section"]);
const WORDY = new Set(["heading", "text", "button"]);

export const SCROLL_EFFECTS: ScrollEffect[] = [
  S("fade-up", "enter", "يطلع ويوضح|Fades up into view|עולה ומתבהר", keys({ opacity: 0, y: 80 })),
  S("fade-down", "enter", "ينزل ويوضح|Fades down into view|יורד ומתבהר", keys({ opacity: 0, y: -80 })),
  S("fade-in", "enter", "يوضح بهدوء|Fades in|מתבהר בעדינות", keys({ opacity: 0 }, 100, 50)),
  S("zoom-in", "enter", "يكبر لمكانه|Zooms in|מתקרב", keys({ opacity: 0, scale: 0.8 })),
  S("zoom-out", "enter", "يصغر لمكانه|Zooms out to place|מתרחק למקומו", keys({ opacity: 0, scale: 1.2 })),
  S("slide-left", "enter", "يدخل من اليسار|Slides in from the left|נכנס משמאל", keys({ opacity: 0, x: -140 })),
  S("slide-right", "enter", "يدخل من اليمين|Slides in from the right|נכנס מימין", keys({ opacity: 0, x: 140 })),
  S("rise-big", "enter", "يطلع من بعيد|Rises from far below|עולה מלמטה", keys({ opacity: 0, y: 220 }, 100, 25, "strong")),
  S("pop", "enter", "يقفز لمكانه|Pops into place|קופץ למקומו", keys({ opacity: 0, scale: 0.5 }, 100, 45, "back")),
  S("grow-slow", "enter", "يكبر شوي شوي|Grows gently|גדל לאט", keys({ scale: 0.92 }, 100, 0)),
  S("drift-in", "enter", "ينزلق بخفة|Drifts in gently|גולש בעדינות", keys({ x: -60 }, 100, 30)),
  S("depth", "enter", "يطلع من العمق|Comes up from depth|עולה מהעומק", keys({ opacity: 0.3, scale: 0.85, y: 40 })),
  S("card-stack", "enter", "متل كرت بينسحب|Like a card pulled up|כמו קלף שנשלף", keys({ y: 120, scale: 0.9, rx: 10 }, 100, 30)),
  S("tilt-up", "turn", "مايل وبيتعدّل|Tilted, straightens up|נטוי ומתיישר", keys({ rx: 28, scale: 0.88, y: 60 }, 100, 35)),
  S("tilt-down", "turn", "مايل لتحت وبيتعدّل|Tilted down, straightens|נטוי למטה ומתיישר", keys({ rx: -24, scale: 0.9, y: -40 }, 100, 35)),
  S("turn-y", "turn", "يلف من الجنب|Turns in from the side|מסתובב מהצד", keys({ opacity: 0, ry: 35 })),
  S("turn-y-back", "turn", "يلف من الجنب التاني|Turns in from the other side|מסתובב מהצד השני", keys({ opacity: 0, ry: -35 })),
  S("rotate-in", "turn", "يدور شوي ويطلع|Turns slightly as it rises|מסתובב מעט ועולה", keys({ opacity: 0, rz: -8, y: 60 })),
  S("rotate-in-back", "turn", "يدور للجهة التانية|Turns the other way as it rises|מסתובב לצד השני ועולה", keys({ opacity: 0, rz: 8, y: 60 })),
  S("flip-up", "turn", "ينقلب لفوق|Flips up into place|מתהפך למעלה", keys({ opacity: 0, rx: 90 }, 100, 45)),
  S("swing", "turn", "يتأرجح لمكانه|Swings into place|מתנדנד למקומו", keys({ opacity: 0, rx: -60 }, 100, 45, "back")),
  S("spin-in", "turn", "يدور ويكبر|Spins and grows in|מסתובב וגדל", keys({ opacity: 0, rz: -180, scale: 0.3 }, 100, 40, "strong")),
  S("parallax-slow", "parallax", "أبطأ بشوي من الصفحة|A little slower than the page|מעט איטי מהדף", { kind: "parallax", speed: 0.2 }),
  S("parallax", "parallax", "أبطأ من الصفحة|Slower than the page|איטי מהדף", { kind: "parallax", speed: 0.4 }),
  S("parallax-fast", "parallax", "أبطأ بكتير|Much slower|איטי בהרבה", { kind: "parallax", speed: 0.8 }),
  S("parallax-reverse", "parallax", "أسرع من الصفحة|Faster than the page|מהיר מהדף", { kind: "parallax", speed: -0.4 }),
  S("parallax-reverse-fast", "parallax", "أسرع بكتير|Much faster|מהיר בהרבה", { kind: "parallax", speed: -0.8 }),
  S("pin-half", "pin", "يثبت نص شاشة|Holds for half a screen|נעצר לחצי מסך", { kind: "pin", length: 50 }, SECTION),
  S("pin", "pin", "يثبت شاشة كاملة|Holds for a screen|נעצר למסך שלם", { kind: "pin", length: 100 }, SECTION),
  S("pin-long", "pin", "يثبت شاشتين|Holds for two screens|נעצר לשני מסכים", { kind: "pin", length: 200 }, SECTION),
  S("sideways", "pin", "يمشي بالعرض مع التمرير (معرض أفقي)|Slides sideways as you scroll (horizontal gallery)|זז הצידה בגלילה (גלריה אופקית)", { kind: "sideways" }, new Set(["stack"])),
  S("words-light", "words", "الكلمات تضوي مع التمرير|Words light up as you scroll|המילים נדלקות בגלילה", { kind: "words" }, WORDY),
];

export const SCROLL_GROUPS: Array<[ScrollGroup, () => string]> = [
  ["enter", say("يدخل مع التمرير|Comes in as you scroll|נכנס בגלילה")],
  ["turn", say("يلف ويميل|Turns and tilts|מסתובב ונוטה")],
  ["parallax", say("عمق (بارالاكس)|Depth (parallax)|עומק (פרלקסה)")],
  ["pin", say("يثبت مكانه|Holds in place|נעצר במקום")],
  ["words", say("الكلام|The words|המילים")],
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** The ready scroll effect an element carries now, if any. */
export const scrollEffectOf = (m: Motion | undefined) => SCROLL_EFFECTS.find((e) => same(m?.scroll, e.scroll))?.key;
/** The effects that suit an element of this type. */
export const scrollEffectsFor = (type: string) => SCROLL_EFFECTS.filter((e) => !e.only || e.only.has(type));
/** Its motion with this scroll effect (or none), the rest of its motion kept. */
export function withScroll(m: Motion | undefined, scroll: Scroll | null): Motion | null {
  const next: Motion = { ...(m ?? {}) };
  if (scroll) next.scroll = scroll; else delete next.scroll;
  return Object.keys(next).length ? next : null;
}
