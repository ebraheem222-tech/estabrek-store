/**
 * Each kind of field between the value a row keeps and the words in a box (pure, tested): the
 * grid's cells, the row's window, the fields editor's defaults and the older item form all write
 * and read values through here, so a kind behaves the same wherever it's edited.
 *
 * Words per language (text, long text) are not here: their boxes are one per language.
 */
import type { CollectionField, FieldType, Local } from "../../api/collections.api";

export type Lang = "ar" | "en" | "he";
export const WORD_KINDS: FieldType[] = ["text", "longText"];

export const KIND_NAME: Record<FieldType, string> = {
  text: "كلام قصير|Short words|טקסט קצר",
  longText: "نص طويل|Long text|טקסט ארוך",
  image: "صورة|Picture|תמונה",
  number: "رقم|Number|מספר",
  date: "تاريخ|Date|תאריך",
  link: "رابط|Link|קישור",
  boolean: "نعم/لا|Yes/no|כן/לא",
  select: "اختيار واحد|One choice|בחירה אחת",
  color: "لون|Colour|צבע",
  email: "إيميل|Email|אימייל",
  phone: "رقم تلفون|Phone number|מספר טלפון",
  datetime: "تاريخ ووقت|Date and time|תאריך ושעה",
  money: "مبلغ (عملة)|Money|סכום (מטבע)",
  multiSelect: "عدة اختيارات|Several choices|כמה בחירות",
  file: "ملف|File|קובץ",
  video: "فيديو|Video|וידאו",
  model3d: "موديل 3D|3D model|מודל תלת־ממד",
  json: "JSON|JSON|JSON",
  location: "موقع (خريطة)|A place (map)|מיקום (מפה)",
};

const pad = (n: number) => String(n).padStart(2, "0");
/** A moment as a date-and-time box holds it (this browser's own clock): "2026-11-13T14:30". */
export function localInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A place as its three boxes' words: "31.778, 35.235, The old city". */
export function placeDraft(v: unknown): string {
  const at = v && typeof v === "object" ? (v as { lat?: unknown; lng?: unknown; label?: unknown }) : null;
  if (!at || typeof at.lat !== "number" || typeof at.lng !== "number") return "";
  return [at.lat, at.lng, ...(typeof at.label === "string" && at.label ? [at.label] : [])].join(", ");
}
/** The three parts of a place's words (the label may hold commas). */
export function placeParts(draft: string): { lat: string; lng: string; label: string } {
  const [lat = "", lng = "", ...label] = draft.split(",").map((part) => part.trim());
  return { lat, lng, label: label.join(", ") };
}
export const placeJoin = (p: { lat: string; lng: string; label: string }) => (p.lat === "" && p.lng === "" && p.label === "" ? "" : [p.lat, p.lng, ...(p.label ? [p.label] : [])].join(", "));

/** A value as the words in its box (not for words per language). */
export function draftFrom(field: Pick<CollectionField, "type">, v: unknown): string {
  if (v === undefined || v === null) return "";
  switch (field.type) {
    case "boolean":
      return v === true ? "true" : v === false ? "false" : "";
    case "datetime":
      return typeof v === "string" ? localInput(v) : "";
    case "multiSelect":
      return Array.isArray(v) ? v.join(",") : "";
    case "json":
      return JSON.stringify(v, null, 2);
    case "location":
      return placeDraft(v);
    default:
      return typeof v === "object" ? "" : String(v);
  }
}

/** Why a box's words can't be sent as they are (said to the person, in the three languages), or null. */
export function draftProblem(field: Pick<CollectionField, "type">, draft: string): string | null {
  if (draft.trim() === "") return null;
  if (field.type === "json") {
    try {
      JSON.parse(draft);
    } catch {
      return "JSON مش صحيح (فاصلة أو قوس ناقص؟)|This isn't valid JSON (a missing comma or bracket?)|זה לא JSON תקין";
    }
  }
  if (field.type === "datetime" && Number.isNaN(new Date(draft).getTime())) return "تاريخ ووقت مش مفهوم|The date and time can't be read|התאריך והשעה אינם ברורים";
  return null;
}

/**
 * The box's words as the value to send; null empties the field. Sent typed where the admin knows
 * best (a number, yes/no, a moment on this browser's clock, a list, JSON); what it can't turn goes
 * as written, and the server says what's wrong with it.
 */
export function valueFrom(field: Pick<CollectionField, "type">, draft: string): unknown {
  const s = draft.trim();
  if (s === "") return null;
  switch (field.type) {
    case "number":
    case "money":
      return Number.isFinite(Number(s)) ? Number(s) : s;
    case "boolean":
      return s === "true";
    case "datetime": {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? s : d.toISOString();
    }
    case "multiSelect": {
      const ids = s.split(",").map((x) => x.trim()).filter(Boolean);
      return ids.length ? ids : null;
    }
    case "json":
      try {
        return JSON.parse(s);
      } catch {
        return s;
      }
    case "location": {
      const p = placeParts(s);
      const [lat, lng] = [Number(p.lat), Number(p.lng)];
      return p.lat !== "" && p.lng !== "" && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, ...(p.label ? { label: p.label } : {}) } : s;
    }
    default:
      return s;
  }
}

const local = (v: Local | undefined, lang: Lang) => v?.[lang] || v?.ar || v?.en || v?.he || "";
export const choiceName = (field: Pick<CollectionField, "options">, id: string, lang: Lang) => {
  const o = field.options?.find((x) => x.id === id);
  return o ? local(o.name, lang) || o.id : id;
};

/** Money as it reads ("US$1,250.50"); a currency the browser doesn't know: the number and its letters. */
export function moneyText(amount: number, currency: string | undefined, lang: Lang): string {
  const code = currency || "ILS";
  try {
    return amount.toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB", { style: "currency", currency: code, maximumFractionDigits: 2, numberingSystem: "latn" });
  } catch {
    return `${amount.toLocaleString("en")} ${code}`;
  }
}

/** A value as the words a cell shows (not for words per language). */
export function shownText(field: Pick<CollectionField, "type" | "options" | "currency">, v: unknown, lang: Lang): string {
  if (v === undefined || v === null || v === "") return "";
  switch (field.type) {
    case "number":
      return typeof v === "number" ? v.toLocaleString("en") : "";
    case "money":
      return typeof v === "number" ? moneyText(v, field.currency, lang) : "";
    case "boolean":
      return v === true ? "✓" : "";
    case "select":
      return choiceName(field, String(v), lang);
    case "multiSelect":
      return Array.isArray(v) ? v.map((id) => choiceName(field, String(id), lang)).join(lang === "ar" ? "، " : ", ") : "";
    case "datetime": {
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB", { dateStyle: "medium", timeStyle: "short", numberingSystem: "latn" });
    }
    case "json": {
      const text = JSON.stringify(v);
      return text.length > 60 ? `${text.slice(0, 57)}…` : text;
    }
    case "location": {
      const at = v as { lat?: unknown; lng?: unknown; label?: unknown };
      return typeof at.label === "string" && at.label ? at.label : typeof at.lat === "number" && typeof at.lng === "number" ? `${at.lat}, ${at.lng}` : "";
    }
    case "file":
    case "video":
    case "model3d": {
      // The file's own name, not its whole address.
      const name = String(v).split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "";
      try {
        return decodeURIComponent(name) || String(v);
      } catch {
        return name || String(v);
      }
    }
    default:
      return typeof v === "object" ? "" : String(v);
  }
}

/** A place's page on the map, or null. */
export function mapLink(v: unknown): string | null {
  const at = v && typeof v === "object" ? (v as { lat?: unknown; lng?: unknown }) : null;
  return at && typeof at.lat === "number" && typeof at.lng === "number" ? `https://www.google.com/maps/search/?api=1&query=${at.lat},${at.lng}` : null;
}
