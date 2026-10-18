// Helpers for product types and their fields (أنواع المنتجات). Pure (tested).
import type { FieldKind, TypeField } from "../../../api/productTypes.api";

export const KIND_LABELS: Record<FieldKind, { label: string; hint: string }> = {
  text: { label: "نص قصير", hint: "مثلاً: اسم المصمم، بلد الصنع" },
  longtext: { label: "نص طويل", hint: "مثلاً: تعليمات الغسيل" },
  number: { label: "رقم", hint: "مثلاً: الطول بالسم، عدد الساعات" },
  select: { label: "اختيار واحد", hint: "من قائمة: القماش" },
  multiselect: { label: "أكثر من اختيار", hint: "من قائمة: المناسبات" },
  boolean: { label: "نعم / لا", hint: "مثلاً: مبطّن؟" },
  date: { label: "تاريخ", hint: "مثلاً: تاريخ الرحلة" },
  url: { label: "رابط", hint: "مثلاً: رابط الكورس" },
};

export const hasOptions = (k: FieldKind) => k === "select" || k === "multiselect";
export const canFilter = (k: FieldKind) => k === "select" || k === "multiselect" || k === "boolean";

/** A new field id: short, lowercase, not used yet ("f" + 5 letters/digits). */
export function newFieldKey(used: string[], rand: () => number = Math.random) {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (;;) {
    let k = "f";
    for (let i = 0; i < 5; i++) k += abc[Math.floor(rand() * abc.length)];
    if (!used.includes(k)) return k;
  }
}

/** Choices typed one per line (or separated by commas), trimmed, without repeats. */
export function parseOptions(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/[\n,،]+/)) {
    const v = part.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

/** The values to send: only this type's fields, empty ones left out, numbers as numbers. */
export function tidyAttributes(fields: TypeField[], values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.key];
    if (isEmpty(v)) continue;
    if (f.kind === "number") {
      const n = Number(String(v).replace(",", "."));
      out[f.key] = Number.isFinite(n) ? n : v;
    } else if (f.kind === "boolean") out[f.key] = v === true;
    else if (typeof v === "string") out[f.key] = v.trim();
    else out[f.key] = v;
  }
  return out;
}

/** Required fields still empty. */
export function missingRequired(fields: TypeField[], values: Record<string, unknown>): string[] {
  return fields.filter((f) => f.required && f.kind !== "boolean" && isEmpty(values[f.key])).map((f) => f.key);
}

/** Problems in a type's fields before saving (shown next to the field). */
export function fieldProblems(fields: TypeField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (!f.label.trim()) out[f.key] = "اكتبي اسم الحقل";
    else if (hasOptions(f.kind) && !(f.options ?? []).length) out[f.key] = "أضيفي اختيار واحد على الأقل";
  }
  return out;
}

/** How a kind reaches the shopper. */
export const FULFILLMENT: Record<"SHIPPING" | "DIGITAL" | "BOOKING", { label: string; icon: string; hint: string }> = {
  SHIPPING: { label: "شحن", icon: "📦", hint: "قطعة بتنبعت بالتوصيل (مثل الملابس)." },
  DIGITAL: { label: "رقمي (ملفات أو أكواد)", icon: "⬇️", hint: "ملفات بتنزّلها الزبونة، أو أكواد (ألعاب، بطاقات هدايا) بتنباع وحدة وحدة. بتوصلها بعد الدفع أو لما تقبلي الطلب. ما في عنوان." },
  BOOKING: { label: "حجز بتذكرة", icon: "🎟️", hint: "موعد ومكان، والكمية = عدد المقاعد. كل مقعد إله تذكرة بكود تشيّكيه على الباب." },
};

type Delivery = { shipsFrom?: string | null; minDays?: number | null; maxDays?: number | null };

const dayWord = (n: number) => (n === 1 ? "يوم" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يوم`);

/**
 * What the shop shows under the price ("بيوصل خلال 3–5 أيام · بينشحن من رام الله").
 * The product's own days/place, else the type's (like the server's deliveryOf).
 */
export function deliveryLine(own: Delivery, type?: Delivery | null): string | null {
  const from = (own.shipsFrom ?? "").trim() || (type?.shipsFrom ?? "").trim();
  const mine = own.minDays != null || own.maxDays != null;
  let min = (mine ? own.minDays : type?.minDays) ?? null;
  let max = (mine ? own.maxDays : type?.maxDays) ?? null;
  if (min == null) min = max;
  if (max == null) max = min;
  if (min != null && max != null && max < min) [min, max] = [max, min];
  const when =
    min == null || max == null ? "" : max === 0 ? "بيوصل بنفس اليوم" : min === max ? `بيوصل خلال ${dayWord(max)}` : `بيوصل خلال ${min}–${max} ${max <= 10 ? "أيام" : "يوم"}`;
  const parts = [when, from ? `بينشحن من ${from}` : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
