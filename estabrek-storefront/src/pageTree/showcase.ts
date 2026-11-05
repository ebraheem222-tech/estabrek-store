/** Defensive read of a showcase, including old drafts that have not passed the current schema. */
import { safeHref, safeSrc, type TreeText } from "./tree";

export type ShowcaseItem = { title: TreeText; text: TreeText; cta: TreeText; image?: string; href?: string };
export type ShowcaseSpec = { items: ShowcaseItem[]; label: TreeText; look?: "clay"; layout: "horizontal" | "vertical"; activation: "click" | "hover"; initial: number; ratio: number; height: number; duration: number; overlay: number };
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
const number = (value: unknown, min: number, max: number, fallback: number, integer = false): number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)) ? value : fallback;

export function showcaseOf(props: Record<string, unknown>): ShowcaseSpec | null {
  const items: ShowcaseItem[] = [];
  for (const raw of Array.isArray(props.items) ? props.items : []) {
    const item = object(raw);
    if (!item || items.length >= 8) continue;
    items.push({ title: words(item.title, 160), text: words(item.text, 1200), cta: words(item.cta, 60), image: typeof item.image === "string" && item.image.length <= 1000 ? safeSrc(item.image) ?? undefined : undefined, href: typeof item.href === "string" && item.href.length <= 500 ? safeHref(item.href) ?? undefined : undefined });
  }
  if (!items.length) return null;
  const initial = typeof props.initial === "number" && Number.isFinite(props.initial) ? Math.trunc(props.initial) : 0;
  return { items, label: words(props.label, 160), ...(props.look === "clay" ? { look: "clay" as const } : {}), layout: props.layout === "vertical" ? "vertical" : "horizontal", activation: props.activation === "hover" ? "hover" : "click", initial: Math.max(0, Math.min(items.length - 1, initial)), ratio: number(props.ratio, 2, 6, 4), height: number(props.height, 240, 800, 480, true), duration: number(props.duration, 0, 1.5, 0.55), overlay: number(props.overlay, 0, 0.9, 0.5) };
}
