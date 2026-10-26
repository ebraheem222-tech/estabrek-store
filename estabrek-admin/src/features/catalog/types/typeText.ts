// Helpers for product types and their fields (أنواع المنتجات). Pure (tested).
import type { FieldKind, TypeField } from "../../../api/productTypes.api";
import { tr } from "@/lib/words";

export const KIND_LABELS: Record<FieldKind, { label: string; hint: string }> = {
  text: { label: tr("نص قصير", "Short text"), hint: tr("مثلاً: اسم المصمم، بلد الصنع", "e.g. designer's name, country of origin") },
  longtext: { label: tr("نص طويل", "Long text"), hint: tr("مثلاً: تعليمات الغسيل", "e.g. washing instructions") },
  number: { label: tr("رقم", "Number"), hint: tr("مثلاً: الطول بالسم، عدد الساعات", "e.g. length in cm, number of hours") },
  select: { label: tr("اختيار واحد", "One choice"), hint: tr("من قائمة: القماش", "From a list: fabric") },
  multiselect: { label: tr("أكثر من اختيار", "Several choices"), hint: tr("من قائمة: المناسبات", "From a list: occasions") },
  boolean: { label: tr("نعم / لا", "Yes / no"), hint: tr("مثلاً: مبطّن؟", "e.g. lined?") },
  date: { label: tr("تاريخ", "Date"), hint: tr("مثلاً: تاريخ الرحلة", "e.g. the trip's date") },
  url: { label: tr("رابط", "Link"), hint: tr("مثلاً: رابط الكورس", "e.g. the course link") },
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
    if (!f.label.trim()) out[f.key] = tr("لازم يكون للحقل اسم", "Give the field a name");
    else if (hasOptions(f.kind) && !(f.options ?? []).length) out[f.key] = tr("لازم يكون في اختيار واحد على الأقل", "Add at least one choice");
  }
  return out;
}

/** How a kind reaches the shopper. */
export const FULFILLMENT: Record<"SHIPPING" | "DIGITAL" | "BOOKING", { label: string; icon: string; hint: string }> = {
  SHIPPING: { label: tr("شحن", "Shipping"), icon: "📦", hint: tr("قطعة بتنبعت بالتوصيل (مثل الملابس).", "A piece sent by delivery (like clothes).") },
  DIGITAL: { label: tr("رقمي (ملفات أو أكواد)", "Digital (files or codes)"), icon: "⬇️", hint: tr("ملفات بينزّلها الزبون، أو أكواد (ألعاب، بطاقات هدايا) بتنباع وحدة وحدة. بتوصله بعد الدفع أو لما ينقبل الطلب. ما في عنوان.", "Files the customer downloads, or codes (games, gift cards) sold one by one. They arrive after payment or once the order is accepted. No address.") },
  BOOKING: { label: tr("حجز بتذكرة", "Booking with a ticket"), icon: "🎟️", hint: tr("موعد ومكان، والكمية = عدد المقاعد. كل مقعد إله تذكرة بكود بيتشيّك على الباب.", "A time and place; the quantity is the number of seats. Each seat has a ticket with a code checked at the door.") },
};

type Delivery = { shipsFrom?: string | null; minDays?: number | null; maxDays?: number | null };

const dayWord = (n: number) => (n === 1 ? tr("يوم", "1 day") : n === 2 ? tr("يومين", "2 days") : tr(n <= 10 ? `${n} أيام` : `${n} يوم`, "{0} days", [n]));

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
    min == null || max == null ? ""
    : max === 0 ? tr("بيوصل بنفس اليوم", "Arrives the same day")
    : min === max ? tr(`بيوصل خلال ${dayWord(max)}`, "Arrives within {0}", [dayWord(max)])
    : tr(`بيوصل خلال ${min}–${max} ${max <= 10 ? "أيام" : "يوم"}`, "Arrives within {0}–{1} days", [min, max]);
  const parts = [when, from ? tr(`بينشحن من ${from}`, "Ships from {0}", [from]) : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
