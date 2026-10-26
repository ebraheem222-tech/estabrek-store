import type { RequestKind, RequestStatus } from "../../api/requests.api";
import type { Audience } from "../../lib/storeIdentity";
import { adminLang, isLang, type Lang } from "@/lib/lang";
import { tr } from "@/lib/words";

export const KIND_LABELS: Record<RequestKind, string> = {
  SIZE: tr("مقاس مش موجود", "Size not there"),
  COLOR: tr("لون مش موجود", "Colour not there"),
  NEW_PIECE: tr("قطعة جديدة", "New piece"),
  CALLBACK: tr("بدهم حدا يحكي معهم", "Wants a call back"),
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: tr("جديد", "New"),
  SEARCHING: tr("عم ندوّر", "Looking"),
  FOUND: tr("لقيناها", "Found"),
  UNAVAILABLE: tr("مش متوفرة", "Not available"),
  DONE: tr("خلص", "Done"),
};

export const STATUS_VARIANT: Record<RequestStatus, "warning" | "info" | "success" | "danger" | "default"> = {
  NEW: "warning",
  SEARCHING: "info",
  FOUND: "success",
  UNAVAILABLE: "danger",
  DONE: "default",
};

export const SOURCE_LABELS: Record<string, string> = {
  PRODUCT: tr("من صفحة القطعة", "From the product page"),
  SEARCH: tr("من البحث", "From search"),
  IMAGE_SEARCH: tr("من البحث بالصورة", "From image search"),
  PAGE: tr("من صفحة طلب قطعة", "From the “Request a piece” page"),
  RAZAN_HELP: tr("من رزان", "From Razan"),
};

/** One line saying what they want: "مقاس XL · عباية كريب" / "زيتي" / the start of their words. */
export function wantLine(r: { kind: RequestKind; wantedSize: string | null; wantedColor: string | null; details: string | null; product: { title: string } | null }) {
  const want =
    r.kind === "SIZE" ? r.wantedSize && tr(`مقاس ${r.wantedSize}`, "size {0}", [r.wantedSize])
    : r.kind === "COLOR" ? r.wantedColor && tr(`لون ${r.wantedColor}`, "colour {0}", [r.wantedColor])
    : null;
  const words = r.details ? (r.details.length > 60 ? `${r.details.slice(0, 60)}…` : r.details) : null;
  return [want, r.product?.title, r.kind === "NEW_PIECE" || r.kind === "CALLBACK" ? words : null, r.kind === "NEW_PIECE" && r.wantedColor ? r.wantedColor : null]
    .filter(Boolean)
    .join(" · ") || KIND_LABELS[r.kind];
}

/**
 * The WhatsApp opener for a request still being looked at (not "found" — that one
 * comes from the server), in the language the shopper asked in.
 */
export function askText(name: string, kind: RequestKind, opts: { storeName?: string; audience?: Audience; lang?: string | null } = {}) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const lang: Lang = isLang(opts.lang) ? opts.lang : adminLang();
  const her = (opts.audience ?? "women") === "women";
  if (lang === "en") {
    const store = opts.storeName || "the store";
    return kind === "CALLBACK"
      ? `Hi ${first} ${her ? "🌸" : "👋"} this is ${store}: you asked us to help with your order. How can we help?`
      : `Hi ${first} ${her ? "🌸" : "👋"} this is ${store}: we got your request and we're looking for it.`;
  }
  if (lang === "he") {
    const store = opts.storeName || "החנות";
    return kind === "CALLBACK"
      ? `היי ${first} ${her ? "🌸" : "👋"} כאן ${store}, ביקשת עזרה בהזמנה. איך אפשר לעזור?`
      : `היי ${first} ${her ? "🌸" : "👋"} כאן ${store}, קיבלנו את הבקשה ואנחנו מחפשים.`;
  }
  const store = opts.storeName || "المتجر";
  if (her) {
    return kind === "CALLBACK"
      ? `مرحباً ${first} 🌸 معكِ ${store}، طلبتِ نساعدكِ بطلبيتكِ. كيف فينا نساعدكِ؟`
      : `مرحباً ${first} 🌸 معكِ ${store}، وصلنا طلبكِ وعم ندوّرلكِ عليه.`;
  }
  return kind === "CALLBACK"
    ? `مرحباً ${first} 👋 معك ${store}، طلبت نساعدك بطلبيتك. كيف فينا نساعدك؟`
    : `مرحباً ${first} 👋 معك ${store}، وصلنا طلبك وعم ندوّرلك عليه.`;
}
