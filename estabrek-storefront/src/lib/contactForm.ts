"use client";

import type { FormEvent } from "react";
import { apiBaseClient } from "./apiClient";

export type ContactSubmitPayload = {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  fields?: Record<string, string>;
  pageUrl?: string;
  source?: string;
};

const FIELD_HINTS: Array<{ key: string; terms: string[] }> = [
  { key: "name", terms: ["name", "اسم"] },
  { key: "email", terms: ["email", "e-mail", "بريد"] },
  { key: "phone", terms: ["phone", "tel", "mobile", "جوال", "هاتف", "رقم"] },
  { key: "subject", terms: ["subject", "topic", "عنوان", "موضوع"] },
  { key: "company", terms: ["company", "organization", "شركة", "مؤسسة"] },
  { key: "message", terms: ["message", "رسالة", "تفاصيل", "ملاحظات"] },
];

function guessFieldKey(el: HTMLElement, index: number) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const name = (el.getAttribute("name") || "").trim();
    if (name) return name;
  }

  const hint = [
    el.getAttribute("aria-label"),
    el.getAttribute("placeholder"),
    el.getAttribute("title"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const entry of FIELD_HINTS) {
    if (entry.terms.some((term) => hint.includes(term))) return entry.key;
  }

  return `field_${index + 1}`;
}

export function collectContactFormData(form: HTMLFormElement) {
  const data: Record<string, string> = {};
  const elements = Array.from(form.elements) as Array<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >;
  elements.forEach((el, idx) => {
    if (!el || (el as any).disabled) return;
    if (el instanceof HTMLInputElement && (el.type === "submit" || el.type === "button")) return;
    const value = typeof (el as any).value === "string" ? (el as any).value.trim() : "";
    if (!value) return;
    const key = guessFieldKey(el, idx);
    if (!data[key]) data[key] = value;
    else data[`${key}_${idx}`] = value;
  });
  return data;
}

export async function submitContactMessage(payload: ContactSubmitPayload) {
  const base = apiBaseClient();
  const res = await fetch(`${base}/ugc/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.message || (data as any)?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as { ok: boolean; queued?: boolean; messageId?: string };
}

export function createContactSubmitHandler(opts?: {
  onSubmit?: (data: Record<string, string>) => void;
  source?: string;
}) {
  return async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = collectContactFormData(e.currentTarget);
    opts?.onSubmit?.(data);

    const payload: ContactSubmitPayload = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
      fields: data,
      pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
      source: opts?.source ?? "contact_form",
    };

    try {
      await submitContactMessage(payload);
      e.currentTarget.reset();
    } catch (err) {
      console.error("[contact] submit failed", err);
    }
  };
}
