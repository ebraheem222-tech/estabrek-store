// The wizard's choices as the backend's setup request (POST /admin/setup/apply). Pure (tested).
import { TYPE_TEMPLATES } from "../catalog/types/typeTemplates";
import { HOME_NAME, homeSections, packMenu, type Pack, type W } from "./packs";
import type { PageTree } from "../../api/pages.api";
import type { ImportedDesign } from "../../api/storeTemplates.api";

const w = (ar: string, en: string, he: string): W => ({ ar, en, he });

/** The ready-made product types' names in the other languages (their fields stay in Arabic until translated). */
const TEMPLATE_NAMES: Record<string, W> = {
  clothes: w("ملابس", "Clothing", "ביגוד"),
  shoes: w("أحذية", "Shoes", "נעליים"),
  bags: w("شنط", "Bags", "תיקים"),
  jewellery: w("مجوهرات", "Jewellery", "תכשיטים"),
  phones: w("موبايلات", "Phones", "טלפונים"),
  laptops: w("لابتوبات", "Laptops", "לפטופים"),
  audio: w("سماعات وصوتيات", "Audio", "שמע"),
  wearables: w("ساعات وأجهزة يد", "Watches & wearables", "שעונים וגאדג'טים"),
  accessories: w("إكسسوارات", "Accessories", "אביזרים"),
  perfume: w("عطور", "Perfume", "בשמים"),
  cosmetics: w("مكياج وعناية", "Make-up & care", "איפור וטיפוח"),
  furniture: w("أثاث", "Furniture", "רהיטים"),
  kitchen: w("مطبخ وأجهزة", "Kitchen & appliances", "מטבח ומכשירים"),
  decor: w("ديكور", "Decor", "עיצוב"),
  toys: w("ألعاب", "Toys", "צעצועים"),
  baby: w("مواليد", "Baby", "תינוקות"),
  books: w("كتب", "Books", "ספרים"),
  sports: w("رياضة", "Sport", "ספורט"),
  pets: w("حيوانات أليفة", "Pets", "חיות מחמד"),
  food: w("أكل", "Food", "אוכל"),
  video_games: w("ألعاب فيديو", "Video games", "משחקי וידאו"),
  game_keys: w("بطاقات وأكواد", "Cards & codes", "כרטיסים וקודים"),
  software: w("برامج", "Software", "תוכנה"),
};

export type SetupChoices = {
  pack: Pack;
  name: W;
  themeId: string | null;
  mode: "light" | "dark" | null;
  include: { categories: boolean; types: boolean; home: boolean; menu: boolean };
  replaceHome: boolean;
  logoUrl?: string;
  templateTree?: PageTree;
  design?: ImportedDesign;
};

export type SetupRequest = {
  industry: string;
  audience: "women" | "everyone";
  name?: Partial<W>;
  logoUrl?: string | null;
  theme: { id: string | null; mode: "light" | "dark" | null };
  categories: Pack["categories"];
  types: Array<Record<string, unknown>>;
  pages: Array<{ slug: string; name: W; seoTitle?: Partial<W>; sections: Array<{ type: string; data: Record<string, unknown> }>; tree?: PageTree }>;
  menu: Array<{ label: W; href: string }>;
  replaceHome: boolean;
  design?: ImportedDesign;
};

const filled = (v: W): Partial<W> | undefined => {
  const out = Object.fromEntries(Object.entries(v).filter(([, x]) => x.trim())) as Partial<W>;
  return Object.keys(out).length ? out : undefined;
};

export function buildSetup(c: SetupChoices): SetupRequest {
  const { pack, include } = c;
  const name = filled(c.name);
  const personalise = (value: unknown, lang?: keyof W): unknown => {
    if (typeof value === "string") return value.replaceAll("{{store.name}}", (lang && c.name[lang]) || c.name.ar || c.name.en || c.name.he);
    if (Array.isArray(value)) return value.map((v) => personalise(v, lang));
    if (value && typeof value === "object") {
      const node = value as Record<string, any>;
      if (node.name === "Store logo" && c.logoUrl?.trim()) return { ...node, type: "image", props: { src: c.logoUrl.trim(), alt: c.name, href: "/" }, style: { base: { width: "150px", maxWidth: "100%", height: "64px", fit: "contain" } } };
      if (node.name === "Store logo") return { ...node, type: "button", props: { label: c.name, href: "/", variant: "link" } };
      if (node.type === "menu") return { ...node, props: { ...node.props, items: packMenu(pack).filter((m) => include.categories || !m.href.startsWith("/c/")).map((m) => ({ label: m.label, href: m.href })) } };
      return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, personalise(v, ["ar", "en", "he"].includes(key) ? key as keyof W : lang)]));
    }
    return value;
  };
  const templateTree = c.templateTree ? personalise(c.templateTree) as PageTree : undefined;
  const design = c.design && include.home ? { ...c.design, theme: { ...structuredClone(c.design.theme), id: "store-design", name: { ar: c.name.ar || c.name.en || c.name.he, en: c.name.en || c.name.ar || c.name.he, he: c.name.he || c.name.ar || c.name.en } }, header: personalise(c.design.header) as PageTree, footer: personalise(c.design.footer) as PageTree } : undefined;
  const types = include.types
    ? pack.types
        .map((id) => TYPE_TEMPLATES.find((t) => t.id === id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .map((t) => ({
          slug: t.id.replace(/_/g, "-"),
          name: t.type.name,
          names: TEMPLATE_NAMES[t.id] ?? w(t.type.name, t.type.name, t.type.name),
          ...(t.type.description ? { description: t.type.description } : {}),
          fields: t.type.fields,
          colorLabel: t.type.colorLabel,
          sizeLabel: t.type.sizeLabel,
          showColor: t.type.showColor,
          showSize: t.type.showSize,
          fulfillment: t.type.fulfillment,
        }))
    : [];
  // Without the categories, nothing points at them: no tiles on the home page, no menu links.
  const sections = homeSections(pack).filter((s) => include.categories || s.type !== "COLLECTIONS_GRID");
  const menu = packMenu(pack).filter((m) => include.categories || !m.href.startsWith("/c/"));
  return {
    industry: pack.industry,
    audience: pack.audience,
    ...(name ? { name } : {}),
    ...(c.logoUrl !== undefined ? { logoUrl: c.logoUrl.trim() || null } : {}),
    theme: { id: design?.theme.id ?? c.themeId, mode: design ? c.mode ?? design.theme.mode : c.themeId ? c.mode : null },
    ...(design ? { design } : {}),
    categories: include.categories ? pack.categories : [],
    types,
    pages: include.home ? [{ slug: "/", name: HOME_NAME, ...(name ? { seoTitle: name } : {}), sections: templateTree ? [] : sections, ...(templateTree ? { tree: templateTree } : {}) }] : [],
    menu: include.menu ? menu : [],
    replaceHome: include.home && c.replaceHome,
  };
}
