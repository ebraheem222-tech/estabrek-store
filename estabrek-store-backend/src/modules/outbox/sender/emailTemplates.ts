/**
 * Emails the store sends itself (Arabic, right-to-left). Each template turns a
 * payload into subject + html + text. Templates not listed here are only logged
 * (see email.ts), so nothing half-written reaches a customer.
 */

export type RenderedEmail = { subject: string; html: string; text: string };

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** One plain, readable layout for every email (works in Gmail/Outlook/phones). */
function layout(opts: { siteName: string; title: string; body: string; footer?: string }) {
  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;background:#f7f1f3;font-family:Tahoma,Arial,sans-serif;color:#2b1a22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1f3;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px;text-align:right" dir="rtl">
<tr><td style="font-size:20px;font-weight:bold;color:#7a2346;padding-bottom:16px">${esc(opts.siteName)}</td></tr>
<tr><td style="font-size:16px;line-height:1.8">${opts.body}</td></tr>
<tr><td style="font-size:12px;line-height:1.7;color:#8a7680;padding-top:24px">${opts.footer ?? "إذا ما طلبت هالرسالة، تجاهلها."}</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (url: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(url)}" style="display:inline-block;background:#7a2346;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:bold">${esc(label)}</a></p>
<p style="font-size:12px;color:#8a7680;direction:ltr;text-align:left;word-break:break-all">${esc(url)}</p>`;

type Payload = Record<string, any>;
type Template = (p: Payload & { siteName: string }) => RenderedEmail;

export const EMAIL_TEMPLATES: Record<string, Template> = {
  /** Customer sign-in: a 6-digit code. */
  CUSTOMER_LOGIN_CODE: (p) => ({
    subject: `كود الدخول: ${p.code}`,
    html: layout({
      siteName: p.siteName,
      title: "كود الدخول",
      body: `<p>أهلاً بكِ،</p><p>هذا كود الدخول لحسابكِ في ${esc(p.siteName)}:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px;direction:ltr;text-align:center;margin:20px 0;color:#7a2346">${esc(p.code)}</p>
<p>الكود صالح لمدة ${esc(p.minutes)} دقائق، ولمرة واحدة.</p>`,
      footer: "إذا ما حاولتِ تسجيل الدخول، تجاهلي هالرسالة. ما حدا بيقدر يفوت على حسابكِ بدون الكود.",
    }),
    text: `كود الدخول لحسابكِ في ${p.siteName}: ${p.code}\nصالح لمدة ${p.minutes} دقائق.`,
  }),

  /** Admin team invite: a link to choose a password. */
  ADMIN_INVITE: (p) => ({
    subject: `دعوة للوحة إدارة ${p.siteName}`,
    html: layout({
      siteName: p.siteName,
      title: "دعوة للفريق",
      body: `<p>أهلاً ${esc(p.name)}،</p><p>انضفت لفريق لوحة إدارة ${esc(p.siteName)}. افتح الرابط واختر كلمة مرور لحسابك:</p>
${button(p.url, "الانضمام واختيار كلمة المرور")}<p>الرابط صالح لمدة 7 أيام ولمرة واحدة.</p>`,
    }),
    text: `أهلاً ${p.name}، انضفت لفريق لوحة إدارة ${p.siteName}. افتح الرابط واختر كلمة مرور (صالح 7 أيام):\n${p.url}`,
  }),

  /** Admin password reset link. */
  ADMIN_PASSWORD_RESET: (p) => ({
    subject: `اختيار كلمة مرور جديدة - ${p.siteName}`,
    html: layout({
      siteName: p.siteName,
      title: "كلمة مرور جديدة",
      body: `<p>أهلاً ${esc(p.name)}،</p><p>هذا رابط لاختيار كلمة مرور جديدة للوحة الإدارة:</p>
${button(p.url, "اختيار كلمة مرور جديدة")}<p>الرابط صالح لمدة ${esc(p.hours ?? 1)} ساعة ولمرة واحدة. بعد التغيير بتطلع من كل الأجهزة.</p>`,
      footer: "إذا ما طلبت تغيير كلمة المرور، تجاهل هالرسالة وكلمة مرورك ما بتتغيّر.",
    }),
    text: `رابط اختيار كلمة مرور جديدة (صالح ${p.hours ?? 1} ساعة):\n${p.url}`,
  }),

  /** Admin signed in from an IP never used before. */
  ADMIN_NEW_DEVICE: (p) => ({
    subject: `دخول جديد لحسابك في ${p.siteName}`,
    html: layout({
      siteName: p.siteName,
      title: "دخول من جهاز جديد",
      body: `<p>أهلاً ${esc(p.name)}،</p><p>صار دخول لحسابك بلوحة الإدارة من مكان أول مرة بنشوفه:</p>
<ul style="padding-right:18px"><li>الجهاز: ${esc(p.device)}</li><li dir="ltr" style="text-align:right">IP: ${esc(p.ip)}</li><li>الوقت: ${esc(p.time)}</li></ul>
<p>إذا هاد أنت، ما في شي لازم تعمله. إذا مش أنت، غيّر كلمة المرور فوراً وفعّل التحقق بخطوتين، وطلّع باقي الأجهزة من صفحة الأمان.</p>`,
      footer: "هالتنبيه بيوصل لما يكون تنبيه الدخول من جهاز جديد مفعّل بصفحة حماية السيرفر.",
    }),
    text: `دخول جديد لحسابك: ${p.device}، IP ${p.ip}، ${p.time}. إذا مش أنت غيّر كلمة المرور فوراً.`,
  }),

  /** Back-in-stock alert: the size she asked about is available again. */
  STOCK_BACK_IN: (p) => {
    const what = [p.colorName, p.sizeName ? `مقاس ${p.sizeName}` : ""].filter(Boolean).join("، ");
    return {
      subject: `رجعت متوفرة: ${p.productTitle}`,
      html: layout({
        siteName: p.siteName,
        title: "رجعت متوفرة",
        body: `<p>أهلاً بكِ،</p><p>القطعة اللي طلبتِ نخبّركِ عنها رجعت متوفرة:</p>
${p.imageUrl ? `<p style="text-align:center;margin:16px 0"><img src="${esc(p.imageUrl)}" alt="${esc(p.productTitle)}" width="220" style="max-width:100%;border-radius:12px"></p>` : ""}
<p style="font-size:18px;font-weight:bold;margin:8px 0">${esc(p.productTitle)}</p>${what ? `<p style="margin:0;color:#5c4450">${esc(what)}</p>` : ""}
<p>الكمية قليلة، فإذا عاجبتكِ لا تتأخري.</p>
${button(p.url, "شوفي القطعة")}`,
        footer: `وصلتكِ هالرسالة لأنكِ طلبتِ تنبيه لما ترجع القطعة. هذا تنبيه لمرة وحدة. <a href="${esc(p.stopUrl)}" style="color:#8a7680">إيقاف تنبيهاتي</a>`,
      }),
      text: `رجعت متوفرة: ${p.productTitle}${what ? ` (${what})` : ""}\n${p.url}\n\nإيقاف التنبيهات: ${p.stopUrl}`,
    };
  },
};

/** Digital files and tickets are ready: the private order page link, ticket codes and file names. */
EMAIL_TEMPLATES.ORDER_DELIVERY = (p) => {
  const tickets: Array<{ code: string; title: string; label?: string | null; when?: string | null; location?: string | null }> = Array.isArray(p.tickets) ? p.tickets : [];
  const files: Array<{ name: string; productTitle: string }> = Array.isArray(p.files) ? p.files : [];
  const what = [files.length ? "ملفاتكِ" : "", tickets.length ? (tickets.length > 1 ? "تذاكركِ" : "تذكرتكِ") : ""].filter(Boolean).join(" و");
  const ticketsHtml = tickets
    .map(
      (t) => `<tr><td style="padding:12px;border:1px solid #eadde3;border-radius:12px">
<div style="font-weight:bold">${esc(t.title)}${t.label ? ` · ${esc(t.label)}` : ""}</div>
${t.when ? `<div style="color:#5c4450;font-size:14px">${esc(t.when)}</div>` : ""}${t.location ? `<div style="color:#5c4450;font-size:14px">${esc(t.location)}</div>` : ""}
<div style="font-size:22px;font-weight:bold;letter-spacing:3px;direction:ltr;text-align:right;color:#7a2346;margin-top:6px">${esc(t.code)}</div>
</td></tr><tr><td style="height:8px"></td></tr>`,
    )
    .join("");
  const filesHtml = files.length
    ? `<ul style="padding-right:18px;margin:8px 0">${files.map((f) => `<li>${esc(f.name)} <span style="color:#8a7680">(${esc(f.productTitle)})</span></li>`).join("")}</ul>
<p style="font-size:13px;color:#5c4450">كل ملف بينزل لحد ${esc(p.maxDownloads)} مرات.</p>`
    : "";
  return {
    subject: `${what || "طلبكِ"} جاهزة - طلب ${p.orderNo}`,
    html: layout({
      siteName: p.siteName,
      title: `${what} جاهزة`,
      body: `<p>أهلاً ${esc(p.name)}،</p><p>شكراً لطلبكِ. ${esc(what || "طلبكِ")} جاهزة:</p>
${tickets.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ticketsHtml}</table><p style="font-size:13px;color:#5c4450">ورّي الكود (أو الـ QR من صفحة الطلب) على الباب.</p>` : ""}
${filesHtml}
${button(p.url, tickets.length && !files.length ? "افتحي التذاكر" : files.length && !tickets.length ? "نزّلي الملفات" : "افتحي صفحة الطلب")}`,
      footer: "هالرابط خاص فيكِ، لا تشاركيه مع حدا.",
    }),
    text: `أهلاً ${p.name}، ${what || "طلبكِ"} جاهزة (طلب ${p.orderNo}).\n${tickets.map((t) => `${t.title}${t.label ? ` · ${t.label}` : ""}: ${t.code}${t.when ? ` — ${t.when}` : ""}`).join("\n")}\n${files.map((f) => `- ${f.name}`).join("\n")}\n${p.url}`,
  };
};

/** «اطلبي قطعتكِ»: the piece she asked for is here. */
EMAIL_TEMPLATES.REQUEST_FOUND = (p) => ({
  subject: `لقينا اللي طلبتيه: ${p.productTitle}`,
  html: layout({
    siteName: p.siteName,
    title: "لقينا اللي طلبتيه",
    body: `<p>أهلاً ${esc(p.name)}،</p><p>القطعة اللي طلبتيها صارت عنا:</p>
<p style="font-size:18px;font-weight:bold;margin:8px 0">${esc(p.productTitle)}</p>
<p>الكمية قليلة، فإذا عجبتكِ لا تتأخري.</p>
${button(p.url, "شوفي القطعة")}`,
    footer: "وصلتكِ هالرسالة لأنكِ طلبتِ منا ندوّرلكِ على قطعة.",
  }),
  text: `لقينا اللي طلبتيه: ${p.productTitle}\n${p.url}`,
});

export function renderEmail(template: string | null | undefined, payload: Payload, siteName: string): RenderedEmail | null {
  const t = template ? EMAIL_TEMPLATES[template] : undefined;
  return t ? t({ ...payload, siteName }) : null;
}
