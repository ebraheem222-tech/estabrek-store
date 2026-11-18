// ميزاتي → upgrading a feature made from a template: the words for each piece's outcome, apart from
// the page so they can be tested. Written in the three languages side by side ("عربي|English|עברית").
import type { UpgradeAction, UpgradeItem } from "../../api/myFeatures.api";
import type { Lang } from "./featuresText";

const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};

/** Each outcome: its short name, and what it means. */
export const ACTION: Record<UpgradeAction, { name: string; means: string }> = {
  add: { name: "جديد|New|חדש", means: "جديد بالنسخة، رح ينعمل.|New in this version: it will be made.|חדש בגרסה: ייווצר." },
  update: { name: "بيتحدّث|Updated|מתעדכן", means: "القالب غيّره وإنت ما غيّرته: بياخد النسخة الجديدة.|The template changed it and you didn't: it takes the new version.|התבנית שינתה ואתם לא: מקבל את הגרסה החדשה." },
  conflict: { name: "تعديلك بيضل|Yours stays|השינוי שלכם נשאר", means: "إنت والقالب غيّرتوه: تعديلك بيضل، إلا إذا اخترت نسخة القالب.|You and the template both changed it: yours stays, unless you choose the template's.|גם אתם וגם התבנית שיניתם: שלכם נשאר, אלא אם בוחרים את של התבנית." },
  taken: { name: "نسخة القالب|The template's|של התבנית", means: "اخترت نسخة القالب: تعديلك عليها بيروح.|You chose the template's: your change to it goes.|בחרתם את של התבנית: השינוי שלכם יוחלף." },
  dropped: { name: "بيضل|Stays|נשאר", means: "النسخة الجديدة ما فيها هالشي: بيضل عندك متل ما هو.|The new version doesn't have it: it stays here as it is.|בגרסה החדשה אין אותו: הוא נשאר כמו שהוא." },
  gone: { name: "شلته إنت|You removed it|הסרתם", means: "شلته من الميزة: ما رح يرجع.|You took it out of the feature: it won't come back.|הוצאתם מהתכונה: הוא לא יחזור." },
  waits: { name: "بيستناك|Waits for you|ממתין לכם", means: "هالتغيير بيحط قيم على جنب: ما رح ينعمل لحاله. اعمله من صفحة الجدول وإنت شايف أي قيم.|This change would set values aside: it isn't made by itself. Make it from the table's page, seeing which values.|השינוי הזה יעביר ערכים הצידה: הוא לא נעשה מעצמו. עשו אותו מעמוד הטבלה, כשרואים אילו ערכים." },
};
export const actionName = (a: UpgradeAction, lang: Lang) => part(ACTION[a].name, lang);
export const actionMeans = (a: UpgradeAction, lang: Lang) => part(ACTION[a].means, lang);

const KIND: Record<UpgradeItem["kind"], string> = {
  table: "جدول|Table|טבלה",
  field: "حقل|Field|שדה",
  function: "خطوات function|A function's steps|שלבי פונקציה",
  triggers: "شو بيشغّل function|What starts a function|מה מפעיל פונקציה",
  page: "صفحة|Page|עמוד",
};
export const kindName = (k: UpgradeItem["kind"], lang: Lang) => part(KIND[k], lang);

/** The order pieces are listed in: what needs the owner first. */
const ORDER: UpgradeAction[] = ["conflict", "taken", "waits", "update", "add", "dropped", "gone"];
export const inOrder = (items: UpgradeItem[]) => [...items].sort((a, b) => ORDER.indexOf(a.action) - ORDER.indexOf(b.action));

/** What the owner's choices make of a piece: a conflict they chose the template's for is "taken". */
export const withChoices = (items: UpgradeItem[], take: ReadonlySet<string>): UpgradeItem[] => items.map((i) => (i.action === "conflict" && take.has(i.id) ? { ...i, action: "taken" } : i));

/** The outcomes in a line: "2 جديد · 3 بيتحدّث · 1 تعديلك بيضل". */
export function summaryLine(items: UpgradeItem[], lang: Lang): string {
  return ORDER.map((a) => [a, items.filter((i) => i.action === a).length] as const)
    .filter(([, n]) => n > 0)
    .map(([a, n]) => `${n} ${actionName(a, lang)}`)
    .join(" · ");
}

/** Which version is newer: below 0 when `a` is older than `b`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let k = 0; k < 3; k += 1) if ((pa[k] ?? 0) !== (pb[k] ?? 0)) return (pa[k] ?? 0) - (pb[k] ?? 0);
  return 0;
}
