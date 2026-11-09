/**
 * Scroll scenes in the editor (the shop plays them: pageTree/TreeScenes.tsx): a clip that plays as
 * the page scrolls, or a picture held still, split into chapters (10 = every 10 %); anything can be
 * added at a chapter, and each thing shows from its moment to its moment (its motion.cue), coming
 * in and going out its own way. "flow" lets what it holds scroll over a held picture instead.
 * Here: new scenes and the ready sections made of them, chapters, and the cue changes.
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { motionOp, type Motion } from "./look";
import { say } from "./say";

type Ids = (prefix: string) => string;
export type Cue = { from: number; to: number; in?: string; out?: string; soft?: number };
export type SceneProps = {
  media?: { kind: "video" | "image" | "none"; src?: string; phone?: string; poster?: string; fit?: "cover" | "contain"; focus?: { x: number; y: number }; label?: Record<string, string> };
  mode?: "pin" | "flow";
  length?: number;
  chapters?: number;
  smooth?: number;
  fps?: number;
  blur?: { from: number; to: number; amount: number };
  dim?: { from: number; to: number; opacity: number; color?: string };
  zoom?: { from: number; to: number; scale: number };
  progress?: "none" | "bar" | "dots" | "line";
};

export const CUE_KINDS: Array<[string, () => string]> = [
  ["fade", () => say("يوضح|Fade|דהייה")],
  ["up", () => say("من تحت|From below|מלמטה")],
  ["down", () => say("من فوق|From above|מלמעלה")],
  ["start", () => say("من البداية|From the start|מההתחלה")],
  ["end", () => say("من النهاية|From the end|מהסוף")],
  ["zoom", () => say("يكبر|Zoom in|זום פנימה")],
  ["shrink", () => say("يصغر|Shrink in|מתכווץ")],
  ["blur", () => say("من الضباب|From a blur|מטשטוש")],
  ["turn", () => say("يلف|Turn|סיבוב")],
  ["flip", () => say("ينقلب|Flip|היפוך")],
  ["wipe", () => say("مسحة|Wipe|מחיקה")],
  ["none", () => say("فجأة|At once|מיד")],
];

/** Chapter `i` (0-based) of `n`: its start and end, in %. */
export const chapterRange = (n: number, i: number): [number, number] => [Math.round((100 * i) / n), Math.round((100 * (i + 1)) / n)];
/** The chapter a moment falls in. */
export const chapterAt = (n: number, at: number) => Math.max(0, Math.min(n - 1, Math.floor((Math.max(0, Math.min(99.999, at)) * n) / 100)));
export const cueOfNode = (n: PageTreeNode): Cue | undefined => (n.motion as Motion | undefined)?.cue as Cue | undefined;

/** Its motion with this moment in the scene (or none). */
export function withCue(m: Motion | undefined, cue: Cue | null): Motion | null {
  const next: Motion = { ...(m ?? {}) };
  if (cue && cue.to > cue.from) next.cue = { ...cue, from: Math.max(0, Math.min(99, Math.round(cue.from))), to: Math.max(1, Math.min(100, Math.round(cue.to))) };
  else delete next.cue;
  return Object.keys(next).length ? next : null;
}
export const cueOp = (n: PageTreeNode, cue: Cue | null): PageDraftOp => motionOp(n, withCue(n.motion as Motion | undefined, cue));
export const sceneOp = (n: PageTreeNode, patch: Partial<SceneProps>): PageDraftOp => {
  const props: Record<string, unknown> = { ...n.props, ...patch };
  for (const [k, v] of Object.entries(patch)) if (v === undefined || v === null) delete props[k];
  return { op: "setProps", nodeId: n.id, props };
};

const words = (lang: Lang, t: string) => {
  const [ar, en, he] = t.split("|");
  return { [lang]: { ar, en, he: he ?? en }[lang] };
};
const heading = (ids: Ids, lang: Lang, t: string, cue: Cue, level = 2, color = "white"): PageTreeNode => ({ id: ids("h"), type: "heading", props: { level, text: words(lang, t) }, style: { base: { color, textAlign: "center", size: level === 1 ? 64 : 44, sizeMin: level === 1 ? 34 : 26, weight: 700 } }, motion: { cue } });
const text = (ids: Ids, lang: Lang, t: string, cue: Cue, color = "white"): PageTreeNode => ({ id: ids("t"), type: "text", props: { text: words(lang, t) }, style: { base: { color, textAlign: "center", size: 18, maxWidth: "560px" } }, motion: { cue } });
const button = (ids: Ids, lang: Lang, t: string, cue: Cue): PageTreeNode => ({ id: ids("b"), type: "button", props: { label: words(lang, t), href: "/shop", variant: "solid" }, motion: { cue } });

/**
 * A new scroll scene: the clip (or picture) with ten chapters and three things on it at their
 * moments — words at the start, a line in the middle, a button at the end that stays.
 */
export function newScrollScene(lang: Lang, ids: Ids, src?: string, kind: "video" | "image" = "video"): PageTreeNode {
  return {
    id: ids("scene"),
    type: "scrollScene",
    name: say("مشهد تمرير|Scroll scene|סצנת גלילה"),
    props: { media: { kind: src ? kind : "none", ...(src ? { src } : {}) }, mode: "pin", length: 4, chapters: 10, smooth: 0.35, fps: 30, dim: { from: 0, to: 100, opacity: 0.35 }, progress: "bar" },
    children: [
      heading(ids, lang, "كل تمريرة بتحكي|Every scroll tells a story|כל גלילה מספרת סיפור", { from: 0, to: 30, in: "up", out: "fade" }, 1),
      text(ids, lang, "الصورة بتتحرك معك، والكلام بيطلع بوقته.|The picture moves with you, and the words arrive on cue.|התמונה זזה איתך, והמילים מגיעות בזמן.", { from: 35, to: 65, in: "blur", out: "up" }),
      button(ids, lang, "تسوّقي الآن|Shop now|לקנייה", { from: 75, to: 100, in: "zoom", out: "stay" }),
    ],
  };
}

/** A section across the whole width with no padding: the home of a scroll scene. */
const fullSection = (ids: Ids, child: PageTreeNode): PageTreeNode => ({ id: ids("sec"), type: "section", props: { contained: false }, style: { base: { pad: [0, 0, 0, 0] } }, children: [child] });

/** Ready: a scroll video with its chapters. */
export const readyScrollVideo = (lang: Lang, ids: Ids, src?: string) => fullSection(ids, newScrollScene(lang, ids, src, "video"));

/**
 * Ready: a picture held still while cards scroll over it; it blurs and darkens as they come,
 * and moves on once the last one has passed.
 */
export function readyScrollStory(lang: Lang, ids: Ids, src?: string): PageTreeNode {
  const card = (t: string, b: string): PageTreeNode => ({
    id: ids("card"),
    type: "stack",
    props: {},
    style: { base: { width: "520px", maxWidth: "100%", pad: [28, 28, 28, 28], gap: 10, radius: 24, bg: "#ffffffd9", backdrop: { blur: 14 } } },
    motion: { enter: { kind: "up", duration: 0.9, distance: 60 } },
    children: [
      { id: ids("h"), type: "heading", props: { level: 3, text: words(lang, t) } },
      { id: ids("t"), type: "text", props: { text: words(lang, b) } },
    ],
  });
  const scene: PageTreeNode = {
    id: ids("scene"),
    type: "scrollScene",
    name: say("قصة صورة ثابتة|Held picture story|סיפור תמונה קבועה"),
    props: { media: { kind: src ? "image" : "none", ...(src ? { src } : {}) }, mode: "flow", length: 4, chapters: 4, smooth: 0.3, fps: 30, blur: { from: 8, to: 30, amount: 10 }, dim: { from: 8, to: 30, opacity: 0.35 }, progress: "line" },
    children: [
      card("الفكرة|The idea|הרעיון", "كل قطعة بتبلّش بقصة.|Every piece starts with a story.|כל פריט מתחיל בסיפור."),
      card("الخامة|The material|החומר", "اخترنا الأقمشة بعناية لتكون مريحة.|Fabrics chosen with care, made for comfort.|בדים שנבחרו בקפידה, לנוחות."),
      card("إلك|For you|בשבילך", "قطعة بتحكي عنك.|A piece that speaks of you.|פריט שמספר עלייך."),
    ],
  };
  return fullSection(ids, scene);
}

/** Ready: a picture that zooms and darkens while a title comes in, then a line and a button. */
export function readyScrollZoom(lang: Lang, ids: Ids, src?: string): PageTreeNode {
  const scene: PageTreeNode = {
    id: ids("scene"),
    type: "scrollScene",
    name: say("تقريب مع التمرير|Zoom with the scroll|זום בגלילה"),
    props: { media: { kind: src ? "image" : "none", ...(src ? { src } : {}) }, mode: "pin", length: 3, chapters: 6, smooth: 0.4, fps: 30, zoom: { from: 0, to: 100, scale: 1.35 }, dim: { from: 10, to: 60, opacity: 0.5 }, blur: { from: 60, to: 100, amount: 6 }, progress: "dots" },
    children: [
      heading(ids, lang, "قرّبي أكتر|Come closer|תתקרבי", { from: 5, to: 50, in: "zoom", out: "blur" }, 1),
      text(ids, lang, "التفاصيل هي الحكاية.|The details are the story.|הפרטים הם הסיפור.", { from: 45, to: 80, in: "up", out: "fade" }),
      button(ids, lang, "شوفي المجموعة|See the collection|לקולקציה", { from: 75, to: 100, in: "up", out: "stay" }),
    ],
  };
  return fullSection(ids, scene);
}

/** A new thing at a chapter of the scene, from that chapter's start to its end, coming up and fading out. */
export function atChapter(node: PageTreeNode, chapters: number, i: number): PageTreeNode {
  const [from, to] = chapterRange(chapters, i);
  const m = (node.motion ?? {}) as Motion;
  const { enter: _enter, ...rest } = m;
  return { ...node, motion: { ...rest, cue: { from, to, in: "up", out: "fade" } } };
}
