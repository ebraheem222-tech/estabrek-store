// src/features/outbox/outbox.schema.ts
import type { OutboxChannel, OutboxStatus } from "../../api/outbox.api";

export const OUTBOX_STATUSES: Array<{ value: OutboxStatus; label: string }> = [
  { value: "QUEUED", label: "معلق (Queued)" },
  { value: "SENT", label: "تم الإرسال (Sent)" },
  { value: "FAILED", label: "فشل (Failed)" },
];

export const OUTBOX_CHANNELS: Array<{ value: OutboxChannel; label: string }> = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SMS", label: "SMS" },
  { value: "EMAIL", label: "Email" },
];

export function validateCancel(input: { reason?: string }) {
  const r = (input.reason ?? "").trim();
  if (r.length > 300) return { ok: false as const, error: "سبب الإلغاء طويل" };
  return { ok: true as const };
}
