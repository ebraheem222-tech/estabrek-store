/**
 * Ready sections for the scroll tricks (the shop plays them: pageTree/TreeMotion.tsx, TreeScenes.tsx,
 * TreePage.tsx): words in a ring that turns while it's held, numbers that count with the scroll, a
 * picture opening through a round window, and a section that colours the whole page.
 */
import type { PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { say } from "./say";

type Ids = (prefix: string) => string;
const words = (lang: Lang, t: string) => {
  const [ar, en, he] = t.split("|");
  return { [lang]: { ar, en, he: he ?? en }[lang] };
};
const heading = (ids: Ids, lang: Lang, t: string, level = 2, base: Record<string, unknown> = {}): PageTreeNode => ({ id: ids("h"), type: "heading", props: { level, text: words(lang, t) }, style: { base: { textAlign: "center", ...base } } });
const text = (ids: Ids, lang: Lang, t: string, base: Record<string, unknown> = {}): PageTreeNode => ({ id: ids("t"), type: "text", props: { text: words(lang, t) }, style: { base: { textAlign: "center", ...base } } });

/** Ready: six round cards in a ring that turns a whole way round while the page holds it. */
export function readyOrbit(lang: Lang, ids: Ids): PageTreeNode {
  const tones = ["#c86b98", "#7d2448", "#e0a458", "#3d5a80", "#6a994e", "#9d4edd"];
  const names = ["ناعم|Soft|רך", "جريء|Bold|נועז", "دافي|Warm|חם", "هادي|Calm|רגוע", "طازة|Fresh|רענן", "ساحر|Dreamy|חלומי"];
  const card = (i: number): PageTreeNode => ({
    id: ids("card"),
    type: "stack",
    props: {},
    style: { base: { width: "150px", height: "150px", radius: 999, bg: tones[i], justify: "center", align: "center", pad: [12, 12, 12, 12] } },
    children: [heading(ids, lang, names[i], 3, { color: "white", size: 22 })],
  });
  return {
    id: ids("sec"),
    type: "section",
    name: say("حلقة بتلف مع السكرول|Ring that turns with the scroll|טבעת שמסתובבת בגלילה"),
    props: { contained: true },
    children: [
      heading(ids, lang, "إختاري مزاجك|Pick your mood|בחרי מצב רוח", 2, { size: 44, sizeMin: 28 }),
      { id: ids("ring"), type: "stack", props: {}, style: { base: { width: "100%" } }, motion: { scroll: { kind: "orbit", orbit: { shape: "circle", radius: 70, turn: 1 }, length: 150 } }, children: tones.map((_, i) => card(i)) },
    ],
  };
}

/** Ready: three numbers that count up with the scroll, each with its line. */
export function readyCounters(lang: Lang, ids: Ids): PageTreeNode {
  const stat = (n: string, line: string): PageTreeNode => ({
    id: ids("stat"),
    type: "stack",
    props: {},
    style: { base: { align: "center", gap: 6 } },
    children: [
      { ...heading(ids, lang, `${n}|${n}|${n}`, 3, { size: 64, sizeMin: 40 }), motion: { scroll: { kind: "count" } } },
      text(ids, lang, line, { color: "muted" }),
    ],
  });
  return {
    id: ids("sec"),
    type: "section",
    name: say("أرقام بتعدّ مع السكرول|Numbers that count with the scroll|מספרים שסופרים בגלילה"),
    props: { contained: true },
    children: [
      { id: ids("grid"), type: "grid", props: {}, style: { base: { columns: 3, gap: 32 }, mobile: { columns: 1 } }, children: [
        stat("1200", "زبونة مبسوطة|Happy customers|לקוחות מרוצות"),
        stat("98", "% بيرجعوا يشتروا|% come back to buy|% חוזרות לקנות"),
        stat("24", "ساعة توصيل|Hour delivery|שעות משלוח"),
      ] },
    ],
  };
}

/** Ready: a picture that opens through a round window as the page scrolls, then its words. */
export function readyPortal(lang: Lang, ids: Ids, src?: string): PageTreeNode {
  return {
    id: ids("sec"),
    type: "section",
    props: { contained: false },
    style: { base: { pad: [0, 0, 0, 0] } },
    children: [{
      id: ids("scene"),
      type: "scrollScene",
      name: say("صورة من شبّاك بيكبر|Picture through a growing window|תמונה מבעד לחלון שגדל"),
      props: { media: { kind: src ? "image" : "none", ...(src ? { src } : {}) }, mode: "pin", length: 3, chapters: 6, smooth: 0.35, fps: 30, window: { shape: "circle", from: 0, to: 65 }, dim: { from: 60, to: 100, opacity: 0.4 }, progress: "none" },
      children: [
        { ...heading(ids, lang, "إفتحي الشبّاك|Open the window|פתחי את החלון", 1, { color: "white", size: 64, sizeMin: 34 }), motion: { cue: { from: 65, to: 100, in: "up", out: "stay" } } },
      ],
    }],
  };
}

/** Ready: a section that turns the whole page deep blue while it's in the middle of the screen. */
export function readyPaint(lang: Lang, ids: Ids): PageTreeNode {
  return {
    id: ids("sec"),
    type: "section",
    name: say("قسم بيلوّن الصفحة|Section that colours the page|מקטע שצובע את הדף"),
    props: { contained: true, paint: "#1b2a78" },
    style: { base: { minHeight: "90vh", justify: "center" } },
    children: [
      { ...heading(ids, lang, "الليل إلو لون تاني|The night has its own colour|ללילה יש צבע משלו", 2, { color: "white", size: 56, sizeMin: 32 }), motion: { scroll: { kind: "words" } } },
      text(ids, lang, "كمّلي السكرول وشوفي الصفحة كيف بتتلوّن.|Keep scrolling and watch the page change colour.|המשיכי לגלול וראי איך הדף משנה צבע.", { color: "white", maxWidth: "560px" }),
    ],
  };
}
