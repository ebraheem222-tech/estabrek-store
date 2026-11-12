/**
 * Triggers in the editor (the shop runs them: pageTree/TreeTriggers.tsx): when something happens
 * to an element, what to do, one action after another. Here: the events and actions with their
 * names, a fresh action of each kind, and ready triggers to start from.
 *
 * They are recipes (phase 3, the interactions engine): when → if → do, else. Conditions (a
 * variable, how many times it ran, the device, the time of day, the language), steps that are
 * groups (at once, repeated, one at random), waiting until a variable holds, changing a variable.
 * Variables last for the visit; a text shows one with {{name}}.
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
export type VarValue = number | string | boolean;
export type VarCmp = "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "set" | "unset";
export type CountCmp = "eq" | "gte" | "lte" | "every";
export type Condition =
  | { if: "var"; name: string; cmp: VarCmp; value?: VarValue }
  | { if: "count"; cmp: CountCmp; value: number }
  | { if: "device"; value: "phone" | "tablet" | "desktop" }
  | { if: "time"; from: number; to: number }
  | { if: "lang"; value: "ar" | "en" | "he" };
export type ConditionKind = Condition["if"];
export type PlainStep =
  | Action
  | { act: "set"; name: string; op: "set" | "add" | "toggle"; value?: VarValue }
  | { act: "waitUntil"; name: string; cmp: VarCmp; value?: VarValue; seconds?: number };
export type GroupStep = { act: "together" | "random"; do: PlainStep[] } | { act: "repeat"; times: number; do: PlainStep[] };
export type Step = PlainStep | GroupStep;
export type Trigger = { on: TriggerEvent; at?: number; once?: boolean; name?: string; if?: Condition[]; do: Step[]; else?: Step[] };
export type ActKind = Action["act"];
export type PlainKind = PlainStep["act"];
export type StepKind = Step["act"];
export const isGroup = (s: Step): s is GroupStep => s.act === "together" || s.act === "repeat" || s.act === "random";
/** How many: steps in a recipe (and its else), steps in a group, conditions. */
export const MAX_STEPS = 16;
export const MAX_GROUP = 8;
export const MAX_IF = 6;

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
/** Steps beyond the actions: variables and waiting, then the groups (only in a recipe's own list). */
export const FLOW_ACTS: Array<[PlainKind, () => string]> = [
  ["set", () => say("غيّر متغيّر|Change a variable|שינוי משתנה")],
  ["waitUntil", () => say("استنّى لحد ما متغيّر…|Wait until a variable…|המתנה עד שמשתנה…")],
];
export const GROUP_ACTS: Array<[GroupStep["act"], () => string]> = [
  ["together", () => say("كذا شغلة مع بعض|Several at once|כמה ביחד")],
  ["repeat", () => say("كرّر|Repeat|חזרה")],
  ["random", () => say("وحدة عشوائية منهم|One of them at random|אחד מהם באקראי")],
];
export const CONDITIONS: Array<[ConditionKind, () => string]> = [
  ["var", () => say("متغيّر|A variable|משתנה")],
  ["count", () => say("كم مرة اشتغل|How many times it ran|כמה פעמים זה רץ")],
  ["device", () => say("الجهاز|The device|המכשיר")],
  ["time", () => say("ساعة اليوم|Time of day|שעה ביום")],
  ["lang", () => say("لغة الصفحة|The page's language|שפת העמוד")],
];
export const VAR_CMPS: Array<[VarCmp, () => string]> = [
  ["eq", () => say("بيساوي|equals|שווה ל")], ["ne", () => say("مش|is not|אינו")],
  ["gt", () => say("أكتر من|more than|יותר מ")], ["lt", () => say("أقل من|less than|פחות מ")],
  ["gte", () => say("على الأقل|at least|לפחות")], ["lte", () => say("على الأكتر|at most|לכל היותר")],
  ["set", () => say("إله قيمة|has a value|יש לו ערך")], ["unset", () => say("لسا ما إله قيمة|has no value yet|עדיין אין לו ערך")],
];
export const COUNT_CMPS: Array<[CountCmp, () => string]> = [
  ["eq", () => say("بالضبط|exactly|בדיוק")], ["gte", () => say("على الأقل|at least|לפחות")],
  ["lte", () => say("على الأكتر|at most|לכל היותר")], ["every", () => say("كل كم مرة|every Nth time|כל פעם N")],
];
export const VAR_OPS: Array<["set" | "add" | "toggle", () => string]> = [
  ["set", () => say("خلّيه|Make it|הגדרה ל")], ["add", () => say("زيد عليه (ناقص = نقّص)|Add to it (minus = take away)|הוספה (מינוס = הפחתה)")],
  ["toggle", () => say("اقلبه نعم/لا|Flip yes/no|היפוך כן/לא")],
];
/** A variable's name: letters, digits and _, starting with a letter. */
export const VAR_NAME = /^[A-Za-z][A-Za-z0-9_]{0,23}$/;
/** What the owner typed, as a value: yes/no, a number, or words. */
export function valueOf(text: string): VarValue {
  const t = text.trim();
  if (t === "true" || t === "false") return t === "true";
  if (t !== "" && Number.isFinite(Number(t))) return Number(t);
  return t.slice(0, 80);
}
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

/** A fresh step of any kind (a group starts with two or three steps in it). */
export function newStep(kind: StepKind, lang: string): Step {
  switch (kind) {
    case "set": return { act: "set", name: "count", op: "add", value: 1 };
    case "waitUntil": return { act: "waitUntil", name: "count", cmp: "gte", value: 3, seconds: 10 };
    case "together": return { act: "together", do: [{ act: "burst", kind: "confetti", amount: 60 }, { act: "sound", kind: "pop", volume: 0.35 }] };
    case "repeat": return { act: "repeat", times: 3, do: [{ act: "play", target: "self", what: "pulse", mode: "play" }, { act: "wait", seconds: 0.4 }] };
    case "random": return { act: "random", do: [{ act: "burst", kind: "confetti", amount: 60 }, { act: "burst", kind: "hearts", amount: 30 }, { act: "burst", kind: "stars", amount: 40 }] };
    default: return newAction(kind, lang);
  }
}
export function newCondition(kind: ConditionKind): Condition {
  switch (kind) {
    case "var": return { if: "var", name: "count", cmp: "gte", value: 3 };
    case "count": return { if: "count", cmp: "every", value: 3 };
    case "device": return { if: "device", value: "phone" };
    case "time": return { if: "time", from: 9, to: 17 };
    case "lang": return { if: "lang", value: "ar" };
  }
}

/** The variables a page's recipes use, by name (for the pickers). */
export function varsIn(nodes: Iterable<PageTreeNode>): string[] {
  const names = new Set<string>();
  const step = (s: Step) => {
    if (s.act === "set" || s.act === "waitUntil") names.add(s.name);
    if (isGroup(s)) s.do.forEach(step);
  };
  for (const n of nodes) {
    for (const t of triggersOf(n)) {
      (t.if ?? []).forEach((c) => { if (c.if === "var") names.add(c.name); });
      [...t.do, ...(t.else ?? [])].forEach(step);
    }
  }
  return [...names].filter((n) => VAR_NAME.test(n)).sort();
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
  // Recipes: conditions, else, groups and variables.
  { key: "counter", name: () => say("عدّاد: كل كبسة +1 ورسالة بالعدد|Counter: each click +1, a note with the count|מונה: כל לחיצה +1 והודעה עם המספר"), make: (lang) => ({ on: "click", do: [{ act: "set", name: "clicks", op: "add", value: 1 }, { act: "toast", text: { [lang]: say("كبستي {{clicks}} مرات|You clicked {{clicks}} times|לחצת {{clicks}} פעמים") } }] }) },
  { key: "every-third", name: () => say("كل تالت كبسة ← كونفيتي، وإلا نبضة|Every 3rd click → confetti, else a pulse|כל לחיצה שלישית ← קונפטי, אחרת פעימה"), make: () => ({ on: "click", if: [{ if: "count", cmp: "every", value: 3 }], do: [{ act: "burst", kind: "confetti", amount: 90 }, { act: "sound", kind: "success", volume: 0.3 }], else: [{ act: "play", target: "self", what: "pulse", mode: "play" }] }) },
  { key: "first-visit", name: () => say("أول زيارة بس ← رسالة ترحيب|First visit only → a welcome note|רק בביקור הראשון ← הודעת ברוכים הבאים"), make: (lang) => ({ on: "load", at: 2, if: [{ if: "var", name: "welcomed", cmp: "unset" }], do: [newAction("toast", lang), { act: "set", name: "welcomed", op: "set", value: true }] }) },
  { key: "surprise", name: () => say("كبسة ← مفاجأة عشوائية|Click → a random surprise|לחיצה ← הפתעה אקראית"), make: () => ({ on: "click", do: [newStep("random", "en"), { act: "play", target: "self", what: "tada", mode: "play" }] }) },
  { key: "like-toggle", name: () => say("كبسة ← أعجبني/مش معجب (بيتذكّر)|Click → like/unlike (remembered)|לחיצה ← אהבתי/ביטול (נזכר)"), make: (lang) => ({ on: "click", if: [{ if: "var", name: "liked", cmp: "eq", value: true }], do: [{ act: "set", name: "liked", op: "set", value: false }, { act: "toast", text: { [lang]: say("انشال من المفضلة|Removed from your favourites|הוסר מהמועדפים") } }], else: [{ act: "set", name: "liked", op: "set", value: true }, { act: "together", do: [{ act: "burst", kind: "hearts", amount: 30, color: "#f43f5e" }, { act: "play", target: "self", what: "heartbeat", mode: "play" }] }, { act: "toast", text: { [lang]: say("انحفظ بالمفضلة|Saved to your favourites|נשמר במועדפים") } }] }) },
  { key: "phone-buzz", name: () => say("عالموبايل بس ← هزّة مع الكبسة|On phones only → a buzz with the click|רק בטלפון ← רטט עם הלחיצה"), make: () => ({ on: "click", if: [{ if: "device", value: "phone" }], do: [{ act: "vibrate" }, { act: "play", target: "self", what: "rubber", mode: "play" }] }) },
];

/** A recipe as saved: no empty conditions or else, no else without conditions. */
function clean(t: Trigger): Trigger {
  const out: Trigger = { ...t };
  if (!out.if?.length) { delete out.if; delete out.else; }
  else if (!out.else?.length) delete out.else;
  if (!out.name?.trim()) delete out.name;
  return out;
}
export const triggersOf = (n: PageTreeNode): Trigger[] => (Array.isArray(n.props?.triggers) ? (n.props.triggers as Trigger[]) : []);
/** Its props with these triggers (none = the key comes out). */
export function triggersOp(n: PageTreeNode, list: Trigger[]): PageDraftOp {
  const props = { ...n.props };
  if (list.length) props.triggers = JSON.parse(JSON.stringify(list.slice(0, 8).map(clean)));
  else delete props.triggers;
  return { op: "setProps", nodeId: n.id, props };
}
