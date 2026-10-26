// The wizard's choices as the backend's setup request (POST /admin/setup/apply). Pure (tested).
import { TYPE_TEMPLATES } from "../catalog/types/typeTemplates";
import { HOME_NAME, homeSections, packMenu, type Pack, type W } from "./packs";

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
};

export type SetupRequest = {
  industry: string;
  audience: "women" | "everyone";
  name?: Partial<W>;
  theme: { id: string | null; mode: "light" | "dark" | null };
  categories: Pack["categories"];
  types: Array<Record<string, unknown>>;
  pages: Array<{ slug: string; name: W; seoTitle?: Partial<W>; sections: Array<{ type: string; data: Record<string, unknown> }> }>;
  menu: Array<{ label: W; href: string }>;
  replaceHome: boolean;
};

const filled = (v: W): Partial<W> | undefined => {
  const out = Object.fromEntries(Object.entries(v).filter(([, x]) => x.trim())) as Partial<W>;
  return Object.keys(out).length ? out : undefined;
};

export function buildSetup(c: SetupChoices): SetupRequest {
  const { pack, include } = c;
  const name = filled(c.name);
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
    theme: { id: c.themeId, mode: c.themeId ? c.mode : null },
    categories: include.categories ? pack.categories : [],
    types,
    pages: include.home ? [{ slug: "/", name: HOME_NAME, ...(name ? { seoTitle: name } : {}), sections }] : [],
    menu: include.menu ? menu : [],
    replaceHome: include.home && c.replaceHome,
  };
}
