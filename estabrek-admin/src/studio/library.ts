/**
 * The owner's theme library's pieces as the editor knows them (the shop's src/library, made by its
 * scripts/library/convert.mjs, read by path: plain data): the list (index.gen.ts: kind, category, name, height),
 * a piece's details (the words, colour families and colours its panel offers: one small file each, loaded when
 * its panel opens), new pieces on the page, and the names of kinds and categories. The panel is LibraryPanel.tsx,
 * the browser LibraryBrowser.tsx.
 */
import type { PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { LIB_INDEX, type LibItem } from "../../../estabrek-storefront/src/library/index.gen";

type Ids = (prefix: string) => string;
export type { LibItem };
export type LibDetails = { words: string[]; families: string[]; hexes: string[] };

export const LIB_ITEMS: readonly LibItem[] = LIB_INDEX;
const BY_ID = new Map(LIB_INDEX.map((i) => [i.id, i]));
export const libItemOf = (id: unknown): LibItem | null => (typeof id === "string" ? BY_ID.get(id) ?? null : null);

/** A library piece as the Add panel offers it. */
export type LibKind = `lib:${string}`;
export const isLibKind = (kind: string): kind is LibKind => kind.startsWith("lib:") && BY_ID.has(kind.slice(4));
/** A piece's own name, as the library wrote it (a design's name, like a font's). */
export const libName = (i: LibItem) => i.name;

/** A new piece on the page, named for the layers list. */
export function makeLibNode(kind: string, _lang: Lang, ids: Ids): PageTreeNode | null {
  const item = isLibKind(kind) ? libItemOf(kind.slice(4)) : null;
  if (!item) return null;
  return { id: ids("lib"), type: "lib", name: item.name.slice(0, 40), props: { item: item.id } };
}

/** The kinds of pieces, in the browser's order, and what each is called (say()). */
export const LIB_KINDS: ReadonlyArray<[string, string]> = [
  ["site", "مواقع كاملة|Whole websites|אתרים שלמים"],
  ["hero", "افتتاحيات|Openings (heroes)|פתיחים"],
  ["premium", "أقسام بريميوم: WebGL و3D وفيزياء|Premium: WebGL, 3D and physics|פרימיום: WebGL, תלת ממד ופיזיקה"],
  ["navbar", "أشرطة تنقّل|Navigation bars|סרגלי ניווט"],
  ["banner", "بانرات وإعلانات|Banners and notices|באנרים והודעות"],
  ["features", "ميزات|Features|יתרונות"],
  ["cards", "كروت|Cards|כרטיסים"],
  ["pricing", "أسعار وباقات|Pricing|מחירים"],
  ["testimonials", "آراء الزباين|Reviews|המלצות"],
  ["team", "الفريق|Team|צוות"],
  ["faq", "أسئلة شائعة|Questions|שאלות נפוצות"],
  ["cta", "دعوات للعمل|Calls to action|קריאות לפעולה"],
  ["contact", "تواصل ونماذج|Contact and forms|יצירת קשר וטפסים"],
  ["login", "تسجيل دخول|Sign in and sign up|התחברות והרשמה"],
  ["footer", "فوترات|Footers|פוטרים"],
];
export const LIB_KIND_NAME: Record<string, string> = Object.fromEntries(LIB_KINDS);

/** A whole website's category (say()). */
export const LIB_SITE_CATS: Record<string, string> = {
  Diamond: "ماسي: WebGL و3D حقيقي|Diamond: real WebGL and 3D|יהלום: WebGL ותלת ממד אמיתי",
  Shopping: "تسوّق ومتاجر|Shopping|קניות",
  Gaming: "ألعاب|Gaming|גיימינג",
  FiveM: "سيرفرات FiveM|FiveM servers|שרתי FiveM",
  Media: "ميديا|Media|מדיה",
  Lifestyle: "لايف ستايل|Lifestyle|לייף סטייל",
  Platforms: "منصات كبيرة|Big platforms|פלטפורמות",
  Social: "سوشال|Social|רשתות",
  Food: "أكل ومطاعم|Food|אוכל",
  Services: "خدمات وحجوزات|Services and booking|שירותים והזמנות",
  AI: "ذكاء اصطناعي|AI|בינה מלאכותית",
  Beauty: "تجميل|Beauty|יופי",
  Business: "أعمال|Business|עסקים",
  Finance: "مالية|Finance|פיננסים",
  Productivity: "إنتاجية|Productivity|פרודוקטיביות",
  Education: "تعليم|Education|חינוך",
  Developers: "مطوّرين|Developers|מפתחים",
};

type Load = () => Promise<LibDetails>;
const DETAILS = import.meta.glob<LibDetails>("../../../estabrek-storefront/src/library/details/*.json", { import: "default" }) as Record<string, Load>;
const loaded = new Map<string, Promise<LibDetails | null>>();
/** A piece's details (its words, colour families and colours), fetched once. */
export function libDetails(id: string): Promise<LibDetails | null> {
  let p = loaded.get(id);
  if (!p) {
    const load = DETAILS[`../../../estabrek-storefront/src/library/details/${id}.json`];
    p = load ? load().catch(() => null) : Promise.resolve(null);
    loaded.set(id, p);
  }
  return p;
}

/** A piece's picture (the admin's public/library/thumbs, made by the shop's scripts/library/thumbs.mjs). */
export const libThumb = (id: string) => `${import.meta.env.BASE_URL}library/thumbs/${id}.webp`;
