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
  DIGITAL: { label: "تنزيل رقمي", icon: "⬇️", hint: "ملفات بتنزّلها الزبونة بعد الدفع أو لما تقبلي الطلب. ما في كميات ولا عنوان." },
  BOOKING: { label: "حجز بتذكرة", icon: "🎟️", hint: "موعد ومكان، والكمية = عدد المقاعد. كل مقعد إله تذكرة بكود تشيّكيه على الباب." },
};
