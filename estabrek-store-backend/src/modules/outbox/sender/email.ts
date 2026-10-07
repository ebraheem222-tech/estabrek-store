// Email sender. With RESEND_API_KEY and EMAIL_FROM set, the store's own emails
// (see emailTemplates.ts) go out through Resend (https://resend.com). Without
// them, or for templates the store doesn't know, the email is only logged.
import { env } from "../../../config/env.js";
import { prisma } from "../../../lib/prisma.js";
import { renderEmail } from "./emailTemplates.js";

let siteNameCache: { v: string; at: number } | null = null;
async function siteName() {
  if (siteNameCache && Date.now() - siteNameCache.at < 5 * 60_000) return siteNameCache.v;
  const s = await prisma.siteSettings.findFirst({ select: { siteName: true } }).catch(() => null);
  const v = s?.siteName?.trim() || "استبرق";
  siteNameCache = { v, at: Date.now() };
  return v;
}

export const emailConfigured = () => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

export async function sendEmail(params: {
  to: string;
  template?: string | null;
  payload?: any;
  /** Same key within 24 h = sent once (Resend). */
  idempotencyKey?: string;
}): Promise<{ ok: true; providerId: string } | { ok: false; error: string }> {
  const rendered = renderEmail(params.template, params.payload ?? {}, await siteName());

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
