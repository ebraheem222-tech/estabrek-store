/** Bounded readers for old drafts and untrusted saved schedule/comparison data. */
import { safeHref, type TreeText } from "./tree";

/** `source`: its place in the saved list (the editor writes its words there). */
export type ScheduleItem = { day: TreeText; time: string; title: TreeText; text: TreeText; speaker: TreeText; location: TreeText; href?: string; source: number };
export type ScheduleSpec = { label: TreeText; items: ScheduleItem[]; layout: "cards" | "table" | "timeline"; filterDays: boolean; showLocation: boolean };
export type ComparisonColumn = { title: TreeText; subtitle: TreeText; highlight: boolean; href?: string; cta: TreeText; source: number };
export type ComparisonCell = { text: TreeText; state: "yes" | "no" | "text" };
export type ComparisonRow = { label: TreeText; values: ComparisonCell[]; source: number };
export type ComparisonSpec = { label: TreeText; columns: ComparisonColumn[]; rows: ComparisonRow[]; caption: TreeText; stickyHeader: boolean };

const object = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const words = (value: unknown, max: number): TreeText => {
  const input = object(value), result: TreeText = {};
  for (const lang of ["ar", "en", "he"] as const) {
    const raw = input?.[lang];
    if (typeof raw === "string") {
      const text = raw.trim().slice(0, max);
      if (text) result[lang] = text;
    }
  }
  return result;
};
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const link = (value: unknown) => typeof value === "string" && value.length <= 500 ? safeHref(value.trim()) ?? undefined : undefined;

export function scheduleOf(raw: unknown): ScheduleSpec {
  const props = object(raw) ?? {};
  const items: ScheduleItem[] = [];
  for (const [source, value] of (Array.isArray(props.items) ? props.items : []).entries()) {
    if (items.length >= 40) break;
    const item = object(value);
    if (!item) continue;
    items.push({ day: words(item.day, 80), time: text(item.time, 80), title: words(item.title, 160), text: words(item.text, 1200), speaker: words(item.speaker, 160), location: words(item.location, 160), href: link(item.href), source });
  }
  return { label: words(props.label, 160), items, layout: props.layout === "table" || props.layout === "timeline" ? props.layout : "cards", filterDays: props.filterDays === true, showLocation: props.showLocation !== false };
}

/** Filter by exactly the same localized day a shopper sees. null is the all-days choice. */
export function scheduleDays(items: ScheduleItem[], say: (value: TreeText) => string): string[] {
  return [...new Set(items.map(item => say(item.day)).filter(Boolean))];
}
export function filterScheduleItems(items: ScheduleItem[], day: string | null, say: (value: TreeText) => string): ScheduleItem[] {
  return day === null ? items : items.filter(item => say(item.day) === day);
}

export function comparisonOf(raw: unknown): ComparisonSpec {
  const props = object(raw) ?? {};
  const columns: ComparisonColumn[] = [], indices: number[] = [];
  for (const [index, value] of (Array.isArray(props.columns) ? props.columns : []).entries()) {
    if (columns.length >= 6) break;
    const column = object(value);
    if (!column) continue;
    indices.push(index);
    columns.push({ title: words(column.title, 160), subtitle: words(column.subtitle, 300), cta: words(column.cta, 60), href: link(column.href), highlight: column.highlight === true, source: index });
  }
  const rows: ComparisonRow[] = [];
  for (const [source, value] of (Array.isArray(props.rows) ? props.rows : []).entries()) {
    if (rows.length >= 20) break;
    const row = object(value);
    if (!row) continue;
    rows.push({ label: words(row.label, 160), values: indices.map(index => {
      const cell = object(Array.isArray(row.values) ? row.values[index] : null);
      return { text: words(cell?.text, 600), state: cell?.state === "yes" || cell?.state === "no" ? cell.state : "text" };
    }), source });
  }
  return { label: words(props.label, 160), columns, rows, caption: words(props.caption, 1200), stickyHeader: props.stickyHeader === true };
}
