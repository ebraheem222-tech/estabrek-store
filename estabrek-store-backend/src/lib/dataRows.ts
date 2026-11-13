/**
 * A table's rows in and out (admin → الجداول): values as they come from a spreadsheet or a cell
 * turned into what the table's fields hold, a row's address made when none is given, and a row
 * written as one CSV line. Pure: no database here (the controller reads and writes).
 */
import { randomBytes } from "node:crypto";
import { checkItemData, ITEM_SLUG, type ItemIssue } from "./collections.js";
import type { Field } from "./collectionTree.js";
import type { GridRow } from "./dataQuery.js";
import { momentOf } from "./storeTime.js";

export const LANGS = ["ar", "en", "he"] as const;
export type Lang = (typeof LANGS)[number];
export type Issue = ItemIssue;

const TRUE = new Set(["true", "1", "yes", "y", "نعم", "اه", "כן"]);
const FALSE = new Set(["false", "0", "no", "n", "لا", "לא"]);

/** A spreadsheet guards cells that start a formula with a quote: taken off again on the way in. */
const unguard = (s: string) => (/^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s);

/** "13/11/2026", "13.11.2026" or "2026-11-13…" as 2026-11-13 (day first, as written here); else as given. */
function dateOf(v: string): string {
  const s = v.trim();
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s);
  if (!dmy) return s;
  const [, d, m, y] = dmy;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** A choice by its id or its name in any language (letter case aside); what isn't one comes back as written. */
function choiceOf(field: Field, written: string): string {
  const k = written.toLowerCase();
  return field.options?.find((o) => o.id === written || o.id.toLowerCase() === k || LANGS.some((l) => o.name?.[l]?.trim().toLowerCase() === k))?.id ?? written;
}

/** One value as its field holds it; what can't be turned is left for the check to refuse. */
export function coerceValue(field: Field, raw: unknown, lang: Lang): unknown {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "string") {
    const s = unguard(raw.trim());
    if (!s) return undefined;
    switch (field.type) {
      case "text":
      case "longText":
        return { [lang]: s };
      case "number": {
        const n = Number(s.replace(/[\s,٬]/g, "").replace(/٫/g, "."));
        return Number.isFinite(n) ? n : s;
      }
      case "boolean": {
        const k = s.toLowerCase();
        return TRUE.has(k) ? true : FALSE.has(k) ? false : s;
      }
      case "date":
        return dateOf(s);
      case "select":
        return choiceOf(field, s);
      case "multiSelect":
        // "new, sale" (or with ; | ،): each by its id or its name; what isn't a choice stays, for the check to refuse.
        return s.split(/[,;|،]/).map((part) => part.trim()).filter(Boolean).map((part) => choiceOf(field, part));
      case "money": {
        // "₪1,200.50", "1200 ILS": the number without its currency's sign.
        const n = Number(s.replace(/^[^\d.-]+|[^\d.]+$/g, "").replace(/[\s,٬]/g, "").replace(/٫/g, "."));
        return Number.isFinite(n) && /\d/.test(s) ? n : s;
      }
      case "datetime":
        // Without a zone it's the store's wall clock; what can't be read stays, for the check to refuse.
        return momentOf(s) ?? s;
      case "json":
        try {
          return JSON.parse(s);
        } catch {
          // Not JSON: plain words are a JSON value too.
          return s;
        }
      case "location": {
        // "31.77, 35.21" or "31.77, 35.21, The old city".
        const [lat, lng, ...label] = s.split(",").map((part) => part.trim());
        const at = { lat: Number(lat), lng: Number(lng) };
        return lat !== "" && lng !== undefined && lng !== "" && Number.isFinite(at.lat) && Number.isFinite(at.lng) ? { ...at, ...(label.join(", ") ? { label: label.join(", ") } : {}) } : s;
      }
      default:
        return s;
    }
  }
  return raw;
}

/**
 * Loose values by column ("title", "title.en", "price") as an item's data, not yet checked. A text
 * field may come once per language; a plain "title" goes to `lang`. Unknown columns are named, not
 * dropped silently.
 */
export function looseData(fields: Field[], values: unknown, lang: Lang): { data: Record<string, unknown>; issues: Issue[] } {
  const src = values && typeof values === "object" && !Array.isArray(values) ? (values as Record<string, unknown>) : {};
  const byId = new Map(fields.map((f) => [f.id, f]));
  const data: Record<string, unknown> = {};
  const issues: Issue[] = [];
  for (const [key, raw] of Object.entries(src)) {
    const [id, suffix, more] = key.split(".");
    const field = byId.get(id);
    const textual = field?.type === "text" || field?.type === "longText";
    if (!field || more !== undefined || (suffix !== undefined && (!textual || !(LANGS as readonly string[]).includes(suffix)))) {
      issues.push({ field: key, message: "No such column" });
      continue;
    }
    const v = coerceValue(field, raw, (suffix as Lang | undefined) ?? lang);
    if (v === undefined) continue;
    // The languages of one text field arrive as separate columns: together again.
    if (textual && v && typeof v === "object" && !Array.isArray(v)) data[id] = { ...(data[id] as object | undefined), ...(v as object) };
    else data[id] = v;
  }
  return { data, issues };
}

/** The same, checked against the table's fields (a new row's values). */
export function rowData(fields: Field[], values: unknown, lang: Lang): { ok: true; data: Record<string, unknown> } | { ok: false; issues: Issue[] } {
  const loose = looseData(fields, values, lang);
  const checked = checkItemData(fields, loose.data);
  const issues = [...loose.issues, ...(checked.ok ? [] : checked.issues)];
  return issues.length || !checked.ok ? { ok: false, issues } : { ok: true, data: checked.data };
}

/**
 * Some of a row's values changed (a cell, or a few): each is checked by its own field, the rest
 * of the row stays as it was, even where an older value wouldn't pass today. null or "" empties.
 */
export function patchData(fields: Field[], was: Record<string, unknown>, patch: unknown, lang: Lang): { ok: true; data: Record<string, unknown> } | { ok: false; issues: Issue[] } {
  const src = patch && typeof patch === "object" && !Array.isArray(patch) ? (patch as Record<string, unknown>) : {};
  const byId = new Map(fields.map((f) => [f.id, f]));
  const data = { ...was };
  const issues: Issue[] = [];
  for (const [id, raw] of Object.entries(src)) {
    const field = byId.get(id);
    if (!field) {
      issues.push({ field: id, message: "No such column" });
      continue;
    }
    const value = coerceValue(field, raw, lang);
    // Sent back as it was (a whole row's form sends every field): not checked again, so an older value
    // that a newer rule wouldn't take doesn't hold up the rest.
    if (same(value, was[id])) continue;
    const checked = checkItemData([field], { [id]: value });
    if (!checked.ok) issues.push(...checked.issues);
    else if (id in checked.data) data[id] = checked.data[id];
    else delete data[id];
  }
  return issues.length ? { ok: false, issues } : { ok: true, data };
}

/** The same value? (Words per language compare whatever their order; nothing and "" are the same nothing.) */
export function same(a: unknown, b: unknown): boolean {
  const empty = (v: unknown) => v === undefined || v === null || v === "";
  if (empty(a) || empty(b)) return empty(a) && empty(b);
  if (typeof a === "object" && typeof b === "object") {
    const [x, y] = [a as Record<string, unknown>, b as Record<string, unknown>];
    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
    return [...keys].every((k) => same(x[k], y[k]));
  }
  return a === b;
}

/** A row's address from its words ("Spring Sale" → spring-sale); other scripts get a short random one. */
export function slugFrom(fields: Field[], data: Record<string, unknown>): string {
  const title = fields.find((f) => f.type === "text");
  const v = title ? (data[title.id] as Record<string, string> | undefined) : undefined;
  const text = v?.en || v?.ar || v?.he || "";
  // Accents off first ("é" is e), then everything that isn't a letter or digit is a dash.
  const slug = text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  return ITEM_SLUG.test(slug) ? slug : `row-${randomBytes(4).toString("hex")}`;
}

/** `slug`, or `slug-2`, `slug-3`… until it's free. */
export function freeSlug(slug: string, taken: Set<string>): string {
  if (!taken.has(slug)) return slug;
  for (let n = 2; n < 10_000; n++) {
    const next = `${slug.slice(0, 74)}-${n}`;
    if (!taken.has(next)) return next;
  }
  return `row-${randomBytes(6).toString("hex")}`;
}

/* ---------------- CSV out ---------------- */

/** The export's columns: the address, the status, then each field (a text field once per language). */
export function exportColumns(fields: Field[]): string[] {
  return ["slug", "status", ...fields.flatMap((f) => (f.type === "text" || f.type === "longText" ? LANGS.map((l) => `${f.id}.${l}`) : [f.id]))];
}

/** One cell: quoted when it must be; words that would start a formula in a spreadsheet get a quote in front. */
export function csvCell(v: unknown, guard = false): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v);
  if (guard && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvLine(fields: Field[], row: Pick<GridRow, "slug" | "status" | "data">): string {
  const cells: string[] = [csvCell(row.slug), csvCell(row.status)];
  for (const f of fields) {
    const v = row.data?.[f.id];
    if (f.type === "text" || f.type === "longText") {
      const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
      for (const l of LANGS) cells.push(csvCell(typeof o[l] === "string" ? o[l] : "", true));
    } else if (f.type === "multiSelect") cells.push(csvCell(Array.isArray(v) ? v.join(", ") : ""));
    else if (f.type === "location") {
      const at = v && typeof v === "object" ? (v as { lat?: unknown; lng?: unknown; label?: unknown }) : null;
      cells.push(csvCell(at && typeof at.lat === "number" && typeof at.lng === "number" ? [at.lat, at.lng, ...(typeof at.label === "string" && at.label ? [at.label] : [])].join(", ") : "", true));
    } else if (f.type === "json") cells.push(csvCell(v === undefined || v === null ? "" : JSON.stringify(v), true));
    else cells.push(csvCell(v, typeof v === "string" && f.type !== "date" && f.type !== "datetime"));
  }
  return cells.join(",");
}
