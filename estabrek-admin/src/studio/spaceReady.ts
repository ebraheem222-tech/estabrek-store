/**
 * Ready sections for the 3D layouts (the shop's pageTree/Space3D.tsx): eight cards on a ring that turns and is turned by
 * hand, a book of six pages, and a phone of three screens that turns as the page scrolls. Every card, page and screen
 * is the owner's own box, edited as usual.
 */
import type { PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { say } from "./say";

type Ids = (prefix: string) => string;
const words = (lang: Lang, t: string) => {
  const [ar, en, he] = t.split("|");
  return { [lang]: { ar, en, he: he ?? en }[lang] };
};
const heading = (ids: Ids, lang: Lang, t: string, level: number, base: Record<string, unknown> = {}): PageTreeNode => ({ id: ids("h"), type: "heading", props: { level, text: words(lang, t) }, style: { base } });
const text = (ids: Ids, lang: Lang, t: string, base: Record<string, unknown> = {}): PageTreeNode => ({ id: ids("t"), type: "text", props: { text: words(lang, t) }, style: { base } });
const box = (ids: Ids, base: Record<string, unknown>, children: PageTreeNode[]): PageTreeNode => ({ id: ids("card"), type: "stack", props: {}, style: { base }, children });

/** Ready: eight cards on a ring that turns by itself and by hand. */
export function readyRing3d(lang: Lang, ids: Ids): PageTreeNode {
  const tones = ["#4f46e5", "#db2777", "#0891b2", "#ca8a04", "#16a34a", "#9333ea", "#ea580c", "#0f766e"];
  const names = ["البداية|The start|ההתחלה", "الفكرة|The idea|הרעיון", "الرسم|The sketch|הסקיצה", "الصنعة|The making|העשייה", "التجربة|The test|הניסוי", "الإطلاق|The launch|ההשקה", "الناس|The people|האנשים", "الحكاية|The story|הסיפור"];
  const card = (i: number) => box(ids, { width: "200px", height: "260px", radius: 18, bg: tones[i], pad: [18, 18, 18, 18], justify: "end", gap: 4 }, [
    text(ids, lang, `0${i + 1}|0${i + 1}|0${i + 1}`, { color: "white", size: 13 }),
    heading(ids, lang, names[i], 3, { color: "white", size: 26 }),
  ]);
  return {
    id: ids("sec"),
    type: "section",
    name: say("حلقة كروت 3D|3D ring of cards|טבעת קלפים בתלת ממד"),
    props: { contained: true },
    children: [
      heading(ids, lang, "شغلنا، بتلفّه بإيدك|Our work, turned by hand|העבודה שלנו, מסובבים ביד", 2, { textAlign: "center", size: 40, sizeMin: 28 }),
      { id: ids("ring"), type: "stack", props: { space: { kind: "ring" } }, style: { base: { width: "100%" } }, children: tones.map((_, i) => card(i)) },
    ],
  };
}

/** Ready: a book of six pages (three leaves, front and back), turned with a click, a swipe or the arrow keys. */
export function readyBook3d(lang: Lang, ids: Ids): PageTreeNode {
  const pages = [
    ["الفصل الأول|Chapter one|פרק ראשון", "كل قصة بتبلّش بصفحة بيضا.|Every story starts with a white page.|כל סיפור מתחיל בדף לבן."],
    ["الطريق|The road|הדרך", "اقلب الصفحة لتكمّل.|Turn the page to go on.|הפכו את הדף כדי להמשיך."],
    ["الفصل التاني|Chapter two|פרק שני", "هون بتحط صورك وكلامك.|Here go your pictures and words.|כאן הולכות התמונות והמילים שלכם."],
    ["التفاصيل|The details|הפרטים", "كل صفحة صندوق بتعدّله متل أي صندوق.|Each page is a box you edit like any other.|כל דף הוא קופסה שעורכים כמו כל קופסה."],
    ["الفصل الأخير|The last chapter|הפרק האחרון", "قرّبنا نخلص.|Nearly there.|כמעט שם."],
    ["النهاية|The end|הסוף", "شكراً إنك قريت.|Thanks for reading.|תודה שקראתם."],
  ];
  const page = (i: number) => box(ids, { pad: [36, 32, 36, 32], gap: 12, bg: i % 2 ? "#efe7da" : "#f7f2ea", justify: "center" }, [
    heading(ids, lang, pages[i][0], 3, { size: 30, color: "#292524" }),
    text(ids, lang, pages[i][1], { color: "#57534e" }),
  ]);
  return {
    id: ids("sec"),
    type: "section",
    name: say("كتاب بتقلب صفحاته|A book whose pages turn|ספר שדפיו מתהפכים"),
    props: { contained: true },
    children: [
      heading(ids, lang, "اقلب الصفحات|Turn the pages|הפכו את הדפים", 2, { textAlign: "center", size: 40, sizeMin: 28 }),
      { id: ids("book"), type: "stack", props: { space: { kind: "book" } }, style: { base: { width: "100%" } }, children: pages.map((_, i) => page(i)) },
    ],
  };
}

/** Ready: a phone of three screens that turns as the page scrolls past it. */
export function readyPhone3d(lang: Lang, ids: Ids): PageTreeNode {
  const screens = [
    ["#0ea5e9", "صوّر|Capture|צלמו", "كل شي بمكان واحد.|Everything in one place.|הכול במקום אחד."],
    ["#8b5cf6", "رتّب|Organise|סדרו", "مجلدات بترتّب حالها.|Folders that sort themselves.|תיקיות שמסתדרות לבד."],
    ["#ec4899", "شارك|Share|שתפו", "رابط واحد للكل.|One link for everyone.|קישור אחד לכולם."],
  ];
  const screen = (i: number) => box(ids, { bg: screens[i][0], pad: [48, 20, 20, 20], gap: 10, justify: "center", align: "center" }, [
    heading(ids, lang, screens[i][1], 3, { color: "white", size: 34, textAlign: "center" }),
    text(ids, lang, screens[i][2], { color: "white", textAlign: "center" }),
  ]);
  return {
    id: ids("sec"),
    type: "section",
    name: say("موبايل بيلف مع التمرير|A phone turning as you scroll|טלפון שמסתובב בגלילה"),
    props: { contained: true },
    children: [
      heading(ids, lang, "تطبيقك بإيدك|Your app in your hand|האפליקציה שלכם ביד", 2, { textAlign: "center", size: 40, sizeMin: 28 }),
      { id: ids("phone"), type: "stack", props: { space: { kind: "phone" } }, style: { base: { width: "100%" } }, children: screens.map((_, i) => screen(i)) },
    ],
  };
}
