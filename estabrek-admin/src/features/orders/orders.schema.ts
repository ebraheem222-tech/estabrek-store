// src/features/orders/orders.schema.ts
import type { OrderReqStatus } from "../../types/orders";

export const ORDER_STATUSES: Array<{ value: OrderReqStatus; label: string }> = [
  { value: "NEW", label: "جديد" },
  { value: "CONTACTED", label: "تم التواصل" },
  { value: "ACCEPTED", label: "مقبول" },
  { value: "REJECTED", label: "مرفوض" },
  { value: "SHIPPED", label: "تم الشحن" },
  { value: "CLOSED", label: "مغلق" },
];

export function validateStatusChange(input: { toStatus: OrderReqStatus; note?: string }) {
  if (!input.toStatus) return { ok: false as const, error: "اختر حالة جديدة" };
  if (input.note && input.note.length > 500) return { ok: false as const, error: "الملاحظة طويلة" };
  return { ok: true as const };
}

export function validateSendMessage(input: {
  channel: "WHATSAPP" | "SMS" | "EMAIL";
  to: string;
  template?: string;
  payloadJson?: any;
}) {
  if (!input.channel) return { ok: false as const, error: "اختر قناة الإرسال" };

  const to = (input.to ?? "").trim();
  if (!to) return { ok: false as const, error: "المستلم مطلوب" };

  if (input.channel !== "EMAIL") {
    // simple phone check
    if (!/^[+\d][\d\s-]{6,}$/.test(to)) return { ok: false as const, error: "رقم الهاتف غير صحيح" };
  } else {
    if (!/^\S+@\S+\.\S+$/.test(to)) return { ok: false as const, error: "البريد غير صحيح" };
  }

  return { ok: true as const };
}
