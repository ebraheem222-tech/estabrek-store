import { ALL_WEBSITE_THEMES } from "./websiteThemes";
import { GALLERY_THEME_SPECS } from "./galleryThemeSpecs";

export type WebsiteThemeGalleryItem = {
  id: number;
  name: string;
  category: string;
  websiteThemeId: string;
};

const EXTRA_THEME_PREFIX = "theme-gallery-";
const EXTRA_THEME_META_BY_ID = new Map(
  GALLERY_THEME_SPECS.map((spec) => [`${EXTRA_THEME_PREFIX}${String(spec.id).padStart(2, "0")}`, spec])
);

const FALLBACK_CATEGORY_BY_THEME: Record<string, string> = {
  dark: "Dark",
  light: "Light",
  luxury: "Luxury",
  gradient: "Gradient",
  modern: "Modern",
};

// Build gallery from real registry so the picker never hides themes due ID mismatch.
export const WEBSITE_THEME_GALLERY: WebsiteThemeGalleryItem[] = ALL_WEBSITE_THEMES.map((theme, idx) => {
  const extraMeta = EXTRA_THEME_META_BY_ID.get(theme.id);
  return {
    id: idx + 1,
    name: extraMeta?.name ?? theme.name,
    category: extraMeta?.category ?? (FALLBACK_CATEGORY_BY_THEME[theme.category] ?? theme.category),
    websiteThemeId: theme.id,
  };
});

export const WEBSITE_THEME_GALLERY_CATEGORIES: string[] = [
  "All",
  ...new Set(WEBSITE_THEME_GALLERY.map((item) => item.category)),
];

export const WEBSITE_THEME_GALLERY_CATEGORY_LABELS_AR: Record<string, string> = {
  All: "الكل",
  Glass: "زجاجي",
  Candy: "كاندي",
  Aurora: "اورورا",
  Space: "فضاء",
  Gaming: "العاب",
  Cyberpunk: "سايبربنك",
  Luxury: "فاخر",
  Nature: "طبيعة",
  Abstract: "تجريدي",
  Modern: "حديث",
  Effects: "مؤثرات",
  Tech: "تقني",
  Minimal: "بسيط",
  Dark: "داكن",
  Light: "فاتح",
  Gradient: "متدرج",
};
