// Email sender. With RESEND_API_KEY and EMAIL_FROM set, the store's own emails
// (see emailTemplates.ts) go out through Resend (https://resend.com). Without
// them, or for templates the store doesn't know, the email is only logged.
import { env } from "../../../config/env.js";
import { prisma } from "../../../lib/prisma.js";
import { renderEmail } from "./emailTemplates.js";
import { identityOf, storeName, type Audience, type Industry } from "../../identity/identity.js";
import type { ContentLang } from "../../../lib/translations.js";

type Store = { name: Record<ContentLang, string>; audience: Audience; industry: Industry };
let storeCache: { v: Store; at: number } | null = null;
async function store(): Promise<Store> {
  if (storeCache && Date.now() - storeCache.at < 5 * 60_000) return storeCache.v;
  const s = await prisma.siteSettings.findFirst({ select: { siteName: true, header: true } }).catch(() => null);
  // The store's own name (admin → هوية المتجر), never the platform's; and how it speaks.
  const id = identityOf(s);
  const v = { name: { ar: storeName(s, "ar"), en: storeName(s, "en"), he: storeName(s, "he") }, audience: id.audience, industry: id.industry };
  storeCache = { v, at: Date.now() };
  return v;
}
/** Tests change the store between emails. */
export const forgetEmailStore = () => {
  storeCache = null;
};

export const emailConfigured = () => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

export async function sendEmail(params: {
  to: string;
  template?: string | null;
  payload?: any;
  /** Same key within 24 h = sent once (Resend). */
  idempotencyKey?: string;
  /** The shopper's language (emails to the team are Arabic). */
  lang?: ContentLang;
}): Promise<{ ok: true; providerId: string } | { ok: false; error: string }> {
  const s = await store();
  // Queued emails (outbox) carry it in the payload.
  const lang: ContentLang = params.lang ?? (["ar", "en", "he"].includes(params.payload?.lang) ? params.payload.lang : "ar");
  const rendered = renderEmail(params.template, params.payload ?? {}, s.name[lang], { lang, audience: s.audience, industry: s.industry });

  if (!rendered || !emailConfigured()) {
    // Not one of ours, or no provider set up yet: log only (never print codes in production).
    const safe = env.NODE_ENV === "production" ? "(payload hidden)" : params.payload;
    console.log("[EMAIL] →", params.to, "template:", params.template, "payload:", safe);
    return { ok: true as const, providerId: "dev-email-123" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(params.idempotencyKey ? { "Idempotency-Key": params.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [params.to],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        ...(env.EMAIL_REPLY_TO ? { reply_to: env.EMAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      console.error("[EMAIL] Resend refused:", res.status, data?.name ?? "", data?.message ?? "");
      return { ok: false as const, error: `resend_${res.status}` };
    }
    return { ok: true as const, providerId: data.id ?? "resend" };
  } catch (e) {
    console.error("[EMAIL] Resend request failed:", (e as Error)?.message);
    return { ok: false as const, error: "resend_request_failed" };
  }
}
