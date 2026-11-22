// ميزاتي → مواقع كاملة: the whole sites' words and filter, apart from the page so they can be tested.
import type { SiteBlueprint, SiteField } from "../../studio/templates/sites";
import { siteCounts } from "../../studio/templates/sites";
import type { Lang } from "./featuresText";

/** Arabic counts: one, two, three to ten (plural), eleven and more (singular). */
const arabic = (n: number, one: string, two: string, few: string, many = one) => (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`);

/** What a site holds, in a line: "7 صفحات · 8 جداول · 24 سطر جاهز". */
export function siteLine(spec: SiteBlueprint, lang: Lang): string {
  const c = siteCounts(spec);
  if (lang === "ar") return [arabic(c.pages, "صفحة", "صفحتين", "صفحات"), arabic(c.tables, "جدول", "جدولين", "جداول"), `${arabic(c.rows, "سطر", "سطرين", "سطور")} جاهز${c.rows >= 3 && c.rows <= 10 ? "ة" : ""}`].join(" · ");
  if (lang === "he") return [`${c.pages} עמודים`, `${c.tables} טבלאות`, `${c.rows} שורות מוכנות`].join(" · ");
  return [`${c.pages} pages`, `${c.tables} tables`, `${c.rows} ready rows`].join(" · ");
}

/** A table's ready rows, under its name in the install's preview. */
export function readyRowsText(n: number, lang: Lang): string {
  if (lang === "ar") return n === 1 ? "سطر جاهز" : n === 2 ? "سطرين جاهزين" : n <= 10 ? `${n} سطور جاهزة` : `${n} سطر جاهز`;
  if (lang === "he") return n === 1 ? "שורה מוכנה אחת" : `${n} שורות מוכנות`;
  return n === 1 ? "1 ready row" : `${n} ready rows`;
}

/** Does the site hold what was searched for (its name, note, field, business or its list's sections, in any language)? */
export function siteMatches(spec: SiteBlueprint, search: string, fields: Record<SiteField, Record<Lang, string>>): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const hay = [spec.key, ...Object.values(spec.name), ...Object.values(spec.note), ...Object.values(spec.biz.name), ...Object.values(fields[spec.field]), ...(spec.modules.offers ? [...Object.values(spec.modules.offers.title), ...spec.modules.offers.groups.flatMap(([, name]) => Object.values(name))] : [])].join(" ").toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}
