import type { RequestKind, RequestStatus } from "../../api/requests.api";

export const KIND_LABELS: Record<RequestKind, string> = {
  SIZE: "مقاس مش موجود",
  COLOR: "لون مش موجود",
  NEW_PIECE: "قطعة جديدة",
  CALLBACK: "بدها حدا يحكيها",
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: "جديد",
  SEARCHING: "عم ندوّر",
  FOUND: "لقيناها",
  UNAVAILABLE: "مش متوفرة",
  DONE: "خلص",
};

export const STATUS_VARIANT: Record<RequestStatus, "warning" | "info" | "success" | "danger" | "default"> = {
  NEW: "warning",
  SEARCHING: "info",
  FOUND: "success",
  UNAVAILABLE: "danger",
  DONE: "default",
};

export const SOURCE_LABELS: Record<string, string> = {
  PRODUCT: "من صفحة القطعة",
  SEARCH: "من البحث",
  IMAGE_SEARCH: "من البحث بالصورة",
  PAGE: "من صفحة «اطلبي قطعتكِ»",
  RAZAN_HELP: "من رزان",
};

/** One line saying what she wants: "XL · عباية كريب" / "زيتي" / the start of her words. */
export function wantLine(r: { kind: RequestKind; wantedSize: string | null; wantedColor: string | null; details: string | null; product: { title: string } | null }) {
  const want = r.kind === "SIZE" ? r.wantedSize && `مقاس ${r.wantedSize}` : r.kind === "COLOR" ? r.wantedColor && `لون ${r.wantedColor}` : null;
  const words = r.details ? (r.details.length > 60 ? `${r.details.slice(0, 60)}…` : r.details) : null;
  return [want, r.product?.title, r.kind === "NEW_PIECE" || r.kind === "CALLBACK" ? words : null, r.kind === "NEW_PIECE" && r.wantedColor ? r.wantedColor : null]
    .filter(Boolean)
    .join(" · ") || KIND_LABELS[r.kind];
}

/** The WhatsApp opener for a request still being looked at (not "found" — that one comes from the server). */
export function askText(name: string, kind: RequestKind) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return kind === "CALLBACK"
    ? `مرحباً ${first} 🌸 معكِ استبرق، طلبتِ نساعدكِ بطلبيتكِ. كيف فينا نساعدكِ؟`
    : `مرحباً ${first} 🌸 معكِ استبرق، وصلنا طلبكِ وعم ندوّرلكِ عليه.`;
}
