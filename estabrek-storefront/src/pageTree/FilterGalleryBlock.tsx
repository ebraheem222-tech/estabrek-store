import type { ReactNode } from "react";
import { FilterGalleryView, type GalleryWords } from "./FilterGalleryView";
import { galleryOf } from "./gallery";
import type { TreeLang } from "./tree";

const WORDS: Record<TreeLang, GalleryWords> = {
  ar: { gallery: "معرض الصور", all: "الكل", search: "بحث في المعرض", empty: "لا توجد عناصر مطابقة", open: "فتح الصورة:", preview: "معاينة:", close: "إغلاق", previous: "الصورة السابقة", next: "الصورة التالية", view: "عرض التفاصيل", results: "عناصر" },
  en: { gallery: "Gallery", all: "All", search: "Search gallery", empty: "No matching items", open: "Open image:", preview: "Preview:", close: "Close", previous: "Previous image", next: "Next image", view: "View details", results: "items" },
  he: { gallery: "גלריה", all: "הכול", search: "חיפוש בגלריה", empty: "אין פריטים מתאימים", open: "פתיחת תמונה:", preview: "תצוגה מקדימה:", close: "סגירה", previous: "התמונה הקודמת", next: "התמונה הבאה", view: "לפרטים", results: "פריטים" },
};

export function FilterGalleryBlock({ props, className, mark, say, link, lang, decoration }: { decoration?: ReactNode; props: Record<string, unknown>; className: string; mark: Record<string, string>; say: (value: unknown) => string; link: (value: unknown) => string | null; lang: TreeLang }) {
  const spec = galleryOf(props);
  if (!spec) return null;
  const words = WORDS[lang] ?? WORDS.ar;
  const items = spec.items.map((item) => ({ title: say(item.title), text: say(item.text), category: say(item.category), image: item.image, href: link(item.href) ?? undefined, cta: say(item.cta) || words.view, source: item.source, ownCta: Boolean(say(item.cta)) }));
  return <FilterGalleryView decoration={decoration} {...spec} items={items} label={say(spec.label) || words.gallery} lang={lang} words={words} className={className} mark={mark} />;
}
