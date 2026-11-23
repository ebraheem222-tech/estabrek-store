// A whole site's panel in words (sites wave 1.2): a cell as the panel shows it, and a number against the window before it.
import { loc } from "../../lib/lang";
import { money } from "../../lib/money";
import { say } from "../../studio/say";
import type { PanelColumn, PanelPerson1 } from "../../api/sitePanels.api";

type Lang = "ar" | "en" | "he";
type Local = Partial<Record<Lang, string>>;

/** Words in this language, else another. */
export const inLang = (w: Local | undefined | null, lang: Lang) => (w ? w[lang] || w.ar || w.en || w.he || "" : "");

const STATUS: Record<string, string> = { DRAFT: "مسودة|Draft|טיוטה", PUBLISHED: "منشور|Published|מפורסם", ARCHIVED: "بالأرشيف|Archived|בארכיון" };
const day = (v: string, withTime: boolean) => {
  const at = new Date(v);
  if (Number.isNaN(at.getTime())) return v;
  return withTime ? at.toLocaleString(loc(), { dateStyle: "medium", timeStyle: "short" }) : at.toLocaleDateString(loc(), { dateStyle: "medium" });
};

/** A cell as the panel shows it: words in this language, a choice by its name, a date as a date, money as money. */
export function cellText(col: PanelColumn, v: unknown, lang: Lang): string {
  if (v === null || v === undefined || v === "") return "";
  if (col.type === "$status") return say(STATUS[String(v)] ?? String(v));
  // Who added the row through the shop: their name and email, and the game accounts they linked.
  if (col.type === "$person") {
    if (typeof v !== "object" || Array.isArray(v)) return "";
    const p = v as PanelPerson1;
    return [p.name, p.email, p.discordId ? `Discord ${p.discordId}` : "", p.steamId ? `Steam ${p.steamId}` : ""].filter(Boolean).join(" · ");
  }
  if (col.type === "$date" || col.type === "datetime") return typeof v === "string" ? day(v, true) : "";
  if (col.type === "date") return typeof v === "string" ? day(v, false) : "";
  if (col.type === "boolean") return v === true ? "✓" : "";
  if (col.type === "money" && typeof v === "number") return money(v, col.currency);
  if (col.type === "select") {
    const o = col.options?.find((x) => x.id === v);
    return o ? inLang(o.name, lang) || o.id : String(v);
  }
  if (col.type === "multiSelect" && Array.isArray(v)) return v.map((id) => inLang(col.options?.find((x) => x.id === id)?.name, lang) || String(id)).join("، ");
  if (typeof v === "object" && !Array.isArray(v)) {
    const words = inLang(v as Local, lang);
    if (words) return words;
  }
  if (typeof v === "object") return "";
  return String(v);
}

/** Each kind of part by its name (a part with no title of its own on the owner's list). */
export const KIND_NAME: Record<string, string> = {
  numbers: "أرقام|Numbers|מספרים",
  queue: "طابور|Queue|תור",
  view: "جدول|Table|טבלה",
  settings: "الإعدادات|Settings|הגדרות",
  actions: "كبسات سريعة|Quick actions|פעולות מהירות",
  chart: "رسم|Chart|גרף",
  kanban: "لوح|Board|לוח",
  calendar: "تقويم|Calendar|לוח שנה",
  people: "صفحة زبون|A customer's page|דף לקוח",
  report: "تقرير|Report|דוח",
  map: "خريطة|Map|מפה",
  scanner: "ماسح|Scanner|סורק",
  game: "حالة السيرفر|Server status|מצב השרת",
};

const BEFORE: Record<string, string> = {
  today: "مبارح|yesterday|אתמול",
  week: "الأسبوع اللي قبل|the week before|השבוע שלפני",
  month: "الشهر اللي قبل|the month before|החודש שלפני",
};
/** A number against the window before it: "+3 عن الأسبوع اللي قبل", "نفس الأسبوع اللي قبل". */
export function changeText(now: number | null, before: number | null | undefined, window?: string): string {
  if (now === null || before === null || before === undefined) return "";
  const when = say(BEFORE[window ?? "week"] ?? BEFORE.week);
  if (now === before) return say("نفس {when}|Same as {when}|כמו {when}").replace("{when}", when);
  const diff = now - before;
  return say("{n} عن {when}|{n} on {when}|{n} לעומת {when}").replace("{n}", `${diff > 0 ? "+" : "−"}${Math.abs(diff)}`).replace("{when}", when);
}
