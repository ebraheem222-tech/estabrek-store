/**
 * Triggers in the editor (the shop runs them: pageTree/TreeTriggers.tsx): when something happens
 * to an element, what to do, one action after another. Here: the events and actions with their
 * names, a fresh action of each kind, and ready triggers to start from.
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { say } from "./say";

export type TriggerEvent = "click" | "dblclick" | "hover" | "leave" | "view" | "leaveView" | "load" | "scrolled" | "timer";
export type Words = Record<string, string>;
export type Action =
  | { act: "play"; target: string; what: string; mode?: "play" | "reverse" | "toggle" | "restart" }
  | { act: "visible"; target: string; value: "show" | "hide" | "toggle" }
  | { act: "scrollTo"; target: string; offset?: number }
  | { act: "scene"; target: string; at: number }
  | { act: "link"; href: string; newTab?: boolean }
  | { act: "popup"; target: string; value: "open" | "close" }
  | { act: "video"; target: string; value: "play" | "pause" | "toggle" | "restart" | "mute" | "unmute" }
  | { act: "burst"; kind: string; color?: string; amount?: number }
  | { act: "copy"; text: Words; note?: Words }
  | { act: "toast"; text: Words }
  | { act: "sound"; kind: string; volume?: number }
  | { act: "vibrate" }
  | { act: "wait"; seconds: number };
export type Trigger = { on: TriggerEvent; at?: number; once?: boolean; do: Action[] };
export type ActKind = Action["act"];

export const EVENTS: Array<[TriggerEvent, () => string]> = [
  ["click", () => say("كبسة|Click|לחיצה")],
  ["dblclick", () => say("كبستين|Double click|לחיצה כפולה")],
  ["hover", () => say("الماوس بيجي عليه|Mouse comes over|העכבר נכנס")],
  ["leave", () => say("الماوس بيطلع عنه|Mouse leaves|העכבר יוצא")],
  ["view", () => say("بيبين بالشاشة|Comes into view|נכנס לתצוגה")],
  ["leaveView", () => say("بيختفي من الشاشة|Leaves the view|יוצא מהתצוגה")],
  ["load", () => say("الصفحة بتفتح (بعد ثواني)|Page opens (after seconds)|העמוד נפתח (אחרי שניות)")],
  ["scrolled", () => say("الصفحة انمرّرت لـ %|Page scrolled to %|העמוד נגלל ל־%")],
  ["timer", () => say("بعد وقت على الصفحة|After time on the page|אחרי זמן בעמוד")],
];
export const ACTS: Array<[ActKind, () => string]> = [
  ["play", () => say("شغّل حركة|Play a motion|הפעלת תנועה")],
  ["visible", () => say("أظهر / أخفي عنصر|Show / hide an element|הצגה / הסתרה של רכיב")],
  ["scrollTo", () => say("روح لعنصر|Scroll to an element|גלילה לרכיב")],
  ["scene", () => say("روح للحظة بمشهد تمرير|Go to a scroll scene moment|מעבר לרגע בסצנת גלילה")],
  ["link", () => say("افتح رابط|Open a link|פתיחת קישור")],
  ["popup", () => say("افتح / سكّر نافذة|Open / close a popup|פתיחה / סגירה של חלון")],
  ["video", () => say("تحكّم بفيديو|Control a video|שליטה בווידאו")],
  ["burst", () => say("انفجار احتفال (كونفيتي…)|Celebration burst (confetti…)|פרץ חגיגה (קונפטי…)")],
  ["copy", () => say("انسخ كود (كوبون)|Copy a code (coupon)|העתקת קוד (קופון)")],
  ["toast", () => say("رسالة صغيرة|A small message|הודעה קטנה")],
  ["sound", () => say("صوت|A sound|צליל")],
  ["vibrate", () => say("هزّة للموبايل|Phone buzz|רטט בטלפון")],
  ["wait", () => say("استنّى|Wait|המתנה")],
];
export const PLAY_WHAT: Array<[string, () => string]> = [
  ["keys", () => say("حركته بالمفاتيح (0–100%)|Its keyframes (0–100%)|הקיפריימים שלו (0–100%)")],
  ["bounce", () => say("ينط|Bounce|קפיצה")], ["shake", () => say("يهتز|Shake|רעידה")], ["pulse", () => say("ينبض|Pulse|פעימה")],
  ["wiggle", () => say("يتمايل|Wiggle|נענוע")], ["jello", () => say("جيلي|Jello|ג'לי")], ["rubber", () => say("مطاط|Rubber band|גומי")],
  ["heartbeat", () => say("نبض قلب|Heartbeat|דופק")], ["swing", () => say("أرجوحة|Swing|נדנדה")], ["flip", () => say("ينقلب|Flip|היפוך")],
  ["spin", () => say("يلف|Spin|סיבוב")], ["pop", () => say("يقفز|Pop|קפיצה קטנה")], ["flash", () => say("يومض|Flash|הבהוב")], ["tada", () => say("تادا!|Tada!|טה-דה!")],
];
export const BURSTS: Array<[string, () => string]> = [
  ["confetti", () => say("كونفيتي|Confetti|קונפטי")], ["hearts", () => say("قلوب|Hearts|לבבות")], ["stars", () => say("نجوم|Stars|כוכבים")],
  ["sparkles", () => say("لمعات|Sparkles|ניצוצות")], ["snow", () => say("تلج|Snow|שלג")], ["bubbles", () => say("فقاعات|Bubbles|בועות")],
];
export const SOUNDS: Array<[string, () => string]> = [
  ["click", () => say("كليك|Click|קליק")], ["pop", () => say("بوب|Pop|פופ")], ["chime", () => say("جرس|Chime|צלצול")],
  ["whoosh", () => say("ووش|Whoosh|ווש")], ["success", () => say("نجاح|Success|הצלחה")],
];

/** A fresh action of this kind, aimed at the element itself where it needs a target. */
export function newAction(act: ActKind, lang: string): Action {
  switch (act) {
    case "play": return { act, target: "self", what: "pulse", mode: "play" };
    case "visible": return { act, target: "self", value: "toggle" };
    case "scrollTo": return { act, target: "self", offset: 80 };
    case "scene": return { act, target: "self", at: 50 };
    case "link": return { act, href: "/shop" };
    case "popup": return { act, target: "self", value: "open" };
    case "video": return { act, target: "self", value: "toggle" };
    case "burst": return { act, kind: "confetti", amount: 70 };
    case "copy": return { act, text: { [lang]: "WELCOME10" }, note: { [lang]: say("انسخ الكود!|Code copied!|הקוד הועתק!") } };
    case "toast": return { act, text: { [lang]: say("أهلا وسهلا!|Welcome!|ברוכים הבאים!") } };
    case "sound": return { act, kind: "pop", volume: 0.35 };
    case "vibrate": return { act };
    case "wait": return { act, seconds: 0.5 };
  }
}

export type TriggerPreset = { key: string; name: () => string; make: (lang: string) => Trigger };
export const TRIGGER_PRESETS: TriggerPreset[] = [
  { key: "confetti", name: () => say("كبسة ← كونفيتي وصوت|Click → confetti and a pop|לחיצה ← קונפטי וצליל"), make: () => ({ on: "click", do: [{ act: "burst", kind: "confetti", amount: 80 }, { act: "sound", kind: "pop", volume: 0.35 }] }) },
  { key: "coupon", name: () => say("كبسة ← نسخ كوبون ورسالة|Click → copy a coupon with a note|לחיצה ← העתקת קופון והודעה"), make: (lang) => ({ on: "click", do: [newAction("copy", lang), { act: "burst", kind: "sparkles", amount: 40 }] }) },
  { key: "hearts", name: () => say("كبسة ← قلوب|Click → hearts|לחיצה ← לבבות"), make: () => ({ on: "click", do: [{ act: "play", target: "self", what: "heartbeat" }, { act: "burst", kind: "hearts", amount: 30, color: "#f43f5e" }] }) },
  { key: "hover-keys", name: () => say("الماوس ← حركته بالمفاتيح|Hover → its keyframes|ריחוף ← הקיפריימים שלו"), make: () => ({ on: "hover", do: [{ act: "play", target: "self", what: "keys", mode: "play" }] }) },
  { key: "view-tada", name: () => say("لما يبين ← تادا|In view → tada|בתצוגה ← טה-דה"), make: () => ({ on: "view", once: true, do: [{ act: "play", target: "self", what: "tada" }] }) },
  { key: "toggle", name: () => say("كبسة ← أظهر/أخفي عنصر|Click → show/hide an element|לחיצה ← הצגה/הסתרה"), make: () => ({ on: "click", do: [{ act: "visible", target: "self", value: "toggle" }] }) },
  { key: "welcome", name: () => say("بعد 4 ثواني ← رسالة ترحيب|After 4 s → a welcome note|אחרי 4 שניות ← הודעת ברוכים הבאים"), make: (lang) => ({ on: "timer", at: 4, once: true, do: [newAction("toast", lang), { act: "sound", kind: "chime", volume: 0.25 }] }) },
  { key: "half-page", name: () => say("نص الصفحة ← نجوم|Halfway down → stars|באמצע העמוד ← כוכבים"), make: () => ({ on: "scrolled", at: 50, once: true, do: [{ act: "burst", kind: "stars", amount: 50 }] }) },
];

export const triggersOf = (n: PageTreeNode): Trigger[] => (Array.isArray(n.props?.triggers) ? (n.props.triggers as Trigger[]) : []);
/** Its props with these triggers (none = the key comes out). */
export function triggersOp(n: PageTreeNode, list: Trigger[]): PageDraftOp {
  const props = { ...n.props };
  if (list.length) props.triggers = JSON.parse(JSON.stringify(list.slice(0, 8)));
  else delete props.triggers;
  return { op: "setProps", nodeId: n.id, props };
}
