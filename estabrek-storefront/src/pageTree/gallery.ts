/** Defensive gallery reads also protect previews of older, unsaved drafts. */
import { safeHref, safeSrc, type TreeText } from "./tree";

export type GalleryItem = { title: TreeText; text: TreeText; category: TreeText; cta: TreeText; image: string; href?: string };
export type GallerySpec = { items: GalleryItem[]; label: TreeText; layout: "grid" | "masonry" | "split" | "bento"; presentation?: "cards" | "index"; initial?: number; filters?: boolean; showCount?: boolean; columns: number; gap: number; hoverEffect: "none" | "zoom" | "tilt" | "reveal"; lightbox: boolean; searchable: boolean; activation: "click" | "hover" };
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const words = (value: unknown, max: number): TreeText => {
  const input = object(value);
  const result: TreeText = {};
  for (const lang of ["ar", "en", "he"] as const) if (typeof input?.[lang] === "string") {
    const text = (input[lang] as string).trim().slice(0, max);
    if (text) result[lang] = text;
  }
  return result;
};
const number = (value: unknown, min: number, max: number, fallback: number, integer = false) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)) ? value : fallback;

export function galleryOf(props: Record<string, unknown>): GallerySpec | null {
  const items: GalleryItem[] = [];
  for (const raw of Array.isArray(props.items) ? props.items : []) {
    const item = object(raw);
    const image = typeof item?.image === "string" && item.image.length <= 1000 ? safeSrc(item.image.trim()) : null;
    if (!item || !image || items.length >= 40) continue;
    items.push({ title: words(item.title, 160), text: words(item.text, 1200), category: words(item.category, 80), cta: words(item.cta, 60), image, href: typeof item.href === "string" && item.href.length <= 500 ? safeHref(item.href.trim()) ?? undefined : undefined });
  }
  if (!items.length) return null;
  return { items, label: words(props.label, 160), layout: props.layout === "split" || props.layout === "masonry" || props.layout === "bento" ? props.layout : "grid", presentation: props.presentation === "index" ? "index" : "cards", initial: number(props.initial, -1, 39, 0, true), filters: props.filters !== false, showCount: props.showCount !== false, columns: number(props.columns, 1, 6, 3, true), gap: number(props.gap, 0, 48, 20), hoverEffect: props.hoverEffect === "zoom" || props.hoverEffect === "tilt" || props.hoverEffect === "reveal" ? props.hoverEffect : "none", lightbox: props.lightbox === true, searchable: props.searchable === true, activation: props.activation === "hover" ? "hover" : "click" };
}

/** Search exactly what is displayed, including a localized category. */
export function filterGalleryItems<T extends { title: string; text: string; category: string }>(items: T[], category: string, query: string, lang: string): T[] {
  const needle = query.trim().toLocaleLowerCase(lang);
  return items.filter((item) => (!category || item.category === category) && (!needle || `${item.title}\n${item.text}\n${item.category}`.toLocaleLowerCase(lang).includes(needle)));
}
