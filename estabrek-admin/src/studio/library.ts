/**
 * The owner's theme library's pieces as the editor knows them (the shop's src/library/manifest.gen.ts, read by
 * path: plain data): the Add panel's kinds, a new piece on the page, and their names. The piece's panel is
 * LibraryPanel.tsx.
 */
import type { PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { adminLang } from "../lib/lang";
import { LIB_MANIFEST, type LibItemMeta } from "../../../estabrek-storefront/src/library/manifest.gen";

type Ids = (prefix: string) => string;
export type { LibItemMeta };

export const LIB_ITEMS: readonly LibItemMeta[] = LIB_MANIFEST;
export const libItemOf = (id: unknown) => (typeof id === "string" ? LIB_ITEMS.find((i) => i.id === id) ?? null : null);

/** A library piece as the Add panel offers it. */
export type LibKind = `lib:${string}`;
export const isLibKind = (kind: string): kind is LibKind => kind.startsWith("lib:") && Boolean(libItemOf(kind.slice(4)));
export const LIB_KINDS = LIB_ITEMS.map((i) => `lib:${i.id}` as LibKind);
export const libName = (i: LibItemMeta) => i.name[adminLang()] || i.name.en;

/** A new piece on the page, named for the layers list in the language being edited. */
export function makeLibNode(kind: string, lang: Lang, ids: Ids): PageTreeNode | null {
  const item = isLibKind(kind) ? libItemOf(kind.slice(4)) : null;
  if (!item) return null;
  return { id: ids("lib"), type: "lib", name: (item.name[lang] || item.name.en).slice(0, 40), props: { item: item.id } };
}

/** What a kind of piece is called in the Add panel's groups. */
export const LIB_GROUP_NAME: Record<string, string> = {
  site: "مواقع كاملة|Whole websites|אתרים שלמים",
  navbar: "أشرطة|Bars|סרגלים",
  hero: "افتتاحيات|Openings|פתיחים",
  features: "ميزات|Features|יתרונות",
  cards: "كروت|Cards|כרטיסים",
  pricing: "أسعار|Pricing|מחירים",
  testimonials: "آراء|Reviews|המלצות",
  faq: "أسئلة|Questions|שאלות",
  cta: "دعوات|Calls to action|קריאות לפעולה",
  contact: "تواصل|Contact|יצירת קשר",
  footer: "فوترات|Footers|פוטרים",
};
