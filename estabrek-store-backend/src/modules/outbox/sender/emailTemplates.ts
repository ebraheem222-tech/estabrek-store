/**
 * Emails the store sends itself. Each template turns a payload into subject + html +
 * text. Templates not listed here are only logged (see email.ts), so nothing
 * half-written reaches a customer.
 *
 * Emails to shoppers come in their language (Arabic, English, Hebrew: the one they
 * used in the shop) and in the store's way of speaking (admin → هوية المتجر: to women,
 * to men, or to everyone). Emails to the store's team are in Arabic.
 */
import type { ContentLang } from "../../../lib/translations.js";
import type { Audience, Industry } from "../../identity/identity.js";

export type RenderedEmail = { subject: string; html: string; text: string };

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** One plain, readable layout for every email (works in Gmail/Outlook/phones). */
function layout(opts: { siteName: string; title: string; body: string; footer?: string; lang?: ContentLang }) {
  const lang = opts.lang ?? "ar";
  const rtl = lang !== "en";
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const ignore = lang === "en" ? "If you didn't ask for this email, ignore it." : lang === "he" ? "אם לא ביקשת את ההודעה הזאת, אפשר להתעלם ממנה." : "إذا ما طلبت هالرسالة، تجاهلها.";
  return `<!doctype html>
<html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;background:#f7f1f3;font-family:Tahoma,Arial,sans-serif;color:#2b1a22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1f3;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px;text-align:${align}" dir="${dir}">
<tr><td style="font-size:20px;font-weight:bold;color:#7a2346;padding-bottom:16px">${esc(opts.siteName)}</td></tr>
<tr><td style="font-size:16px;line-height:1.8">${opts.body}</td></tr>
<tr><td style="font-size:12px;line-height:1.7;color:#8a7680;padding-top:24px">${opts.footer ?? ignore}</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (url: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(url)}" style="display:inline-block;background:#7a2346;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:bold">${esc(label)}</a></p>
<p style="font-size:12px;color:#8a7680;direction:ltr;text-align:left;word-break:break-all">${esc(url)}</p>`;

type Payload = Record<string, any>;
type Ctx = { siteName: string; lang: ContentLang; audience: Audience; industry: Industry };
type Template = (p: Payload & Ctx) => RenderedEmail;

/* ---------- how the store speaks Arabic: to her, to him, or to everyone (plural) ---------- */

const AR = {
  women: { hi: "أهلاً بكِ،", k: "كِ", because: "لأنكِ", asked: "طلبتِ", see: "شوفي", open: "افتحي", get: "نزّلي", hurry: "لا تتأخري", tried: "حاولتِ", ignore: "تجاهلي", share: "هالرابط خاص فيكِ، لا تشاركيه مع حدا.", door: "ورّي الكود (أو الـ QR من صفحة الطلب) على الباب.", itF: "طلبتيها", itM: "طلبتيه" },
  men: { hi: "أهلاً بك،", k: "ك", because: "لأنك", asked: "طلبت", see: "شوف", open: "افتح", get: "نزّل", hurry: "لا تتأخر", tried: "حاولت", ignore: "تجاهل", share: "هالرابط خاص فيك، لا تشاركه مع حدا.", door: "على الباب: الكود أو الـ QR من صفحة الطلب.", itF: "طلبتها", itM: "طلبته" },
  everyone: { hi: "أهلاً وسهلاً،", k: "كم", because: "لأنكم", asked: "طلبتوا", see: "شوفوا", open: "افتحوا", get: "نزّلوا", hurry: "لا تتأخروا", tried: "حاولتوا", ignore: "تجاهلوا", share: "هالرابط خاص فيكم، لا تشاركوه مع حدا.", door: "على الباب: الكود أو الـ QR من صفحة الطلب.", itF: "طلبتوها", itM: "طلبتوه" },
} as const;

/** Clothes, shoes and jewellery are «قطعة» (feminine); anything else «منتج» (masculine). */
const dressed = (i: Industry) => i === "fashion" || i === "shoes" || i === "jewelry";
function arPiece(p: Ctx) {
  const f = dressed(p.industry);
  const a = AR[p.audience];
  return {
    the: f ? "القطعة" : "المنتج",
    back: f ? "رجعت متوفرة" : "رجع متوفر",
    about: f ? "عنها" : "عنه",
    liked: f ? `عاجبت${a.k}` : `عاجب${a.k}`,
    likedFound: f ? `عجبت${a.k}` : `عجب${a.k}`,
    returns: f ? "ترجع القطعة" : "يرجع المنتج",
    isHere: f ? "صارت عنا" : "صار عنا",
    askedIt: f ? a.itF : a.itM,
    a,
  };
}
const enPiece = (p: Ctx) => (dressed(p.industry) ? "piece" : "item");

const STOP: Record<ContentLang, [string, string]> = {
  ar: ["إيقاف تنبيهاتي", "إيقاف التنبيهات"],
  en: ["Stop my alerts", "Stop alerts"],
  he: ["הפסקת ההתראות שלי", "הפסקת ההתראות"],
};

export const EMAIL_TEMPLATES: Record<string, Template> = {
  /** To the owner, from an automation (التلقائيات): its subject and text, and a link into the admin. */
  OWNER_ALERT: (p) => ({
    subject: String(p.subject || "تنبيه من المتجر"),
    html: layout({
      siteName: p.siteName,
      title: String(p.subject || "تنبيه"),
      body: `<p style="white-space:pre-line">${esc(p.text)}</p>${p.url ? button(String(p.url), "افتح بلوحة الإدارة") : ""}`,
      footer: "وصلتك لأنك عامل تلقائية بلوحة الإدارة (التلقائيات). بتقدر توقّفها من هناك.",
    }),
    text: `${p.text}${p.url ? `
${p.url}` : ""}`,
  }),

  /** Customer sign-in: a 6-digit code. */
  CUSTOMER_LOGIN_CODE: (p) => {
    const code = `<p style="font-size:32px;font-weight:bold;letter-spacing:8px;direction:ltr;text-align:center;margin:20px 0;color:#7a2346">${esc(p.code)}</p>`;
    if (p.lang === "en")
      return {
        subject: `Your sign-in code: ${p.code}`,
        html: layout({
          lang: "en",
          siteName: p.siteName,
          title: "Sign-in code",
          body: `<p>Hello,</p><p>Here is the sign-in code for your account at ${esc(p.siteName)}:</p>${code}<p>It works for ${esc(p.minutes)} minutes, once.</p>`,
          footer: "If you didn't try to sign in, ignore this email. Nobody can get into your account without the code.",
        }),
        text: `Your sign-in code for ${p.siteName}: ${p.code}\nIt works for ${p.minutes} minutes.`,
      };
    if (p.lang === "he")
      return {
        subject: `קוד הכניסה: ${p.code}`,
        html: layout({
          lang: "he",
          siteName: p.siteName,
          title: "קוד כניסה",
          body: `<p>שלום,</p><p>זה קוד הכניסה לחשבון ב־${esc(p.siteName)}:</p>${code}<p>הקוד בתוקף ל־${esc(p.minutes)} דקות, לשימוש אחד.</p>`,
          footer: "אם לא ניסית להתחבר, אפשר להתעלם מההודעה. אי אפשר להיכנס לחשבון בלי הקוד.",
        }),
        text: `קוד הכניסה לחשבון ב־${p.siteName}: ${p.code}\nבתוקף ל־${p.minutes} דקות.`,
      };
    const a = AR[p.audience];
    return {
      subject: `كود الدخول: ${p.code}`,
      html: layout({
        siteName: p.siteName,
        title: "كود الدخول",
        body: `<p>${a.hi}</p><p>هذا كود الدخول لحساب${a.k} في ${esc(p.siteName)}:</p>
${code}
<p>الكود صالح لمدة ${esc(p.minutes)} دقائق، ولمرة واحدة.</p>`,
        footer: `إذا ما ${a.tried} تسجيل الدخول، ${a.ignore} هالرسالة. ما حدا بيقدر يفوت على حساب${a.k} بدون الكود.`,
      }),
      text: `كود الدخول لحساب${a.k} في ${p.siteName}: ${p.code}\nصالح لمدة ${p.minutes} دقائق.`,
    };
  },

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
    const img = p.imageUrl ? `<p style="text-align:center;margin:16px 0"><img src="${esc(p.imageUrl)}" alt="${esc(p.productTitle)}" width="220" style="max-width:100%;border-radius:12px"></p>` : "";
    const [stopHtml, stopText] = STOP[p.lang as ContentLang] ?? STOP.ar;
    const stopLink = `<a href="${esc(p.stopUrl)}" style="color:#8a7680">${stopHtml}</a>`;
    if (p.lang === "en") {
      const piece = enPiece(p);
      const what = [p.colorName, p.sizeName ? `size ${p.sizeName}` : ""].filter(Boolean).join(", ");
      return {
        subject: `Back in stock: ${p.productTitle}`,
        html: layout({
          lang: "en",
          siteName: p.siteName,
          title: "Back in stock",
          body: `<p>Hello,</p><p>The ${piece} you asked us about is back in stock:</p>${img}
<p style="font-size:18px;font-weight:bold;margin:8px 0">${esc(p.productTitle)}</p>${what ? `<p style="margin:0;color:#5c4450">${esc(what)}</p>` : ""}
<p>There are only a few, so don't wait too long.</p>
${button(p.url, `See the ${piece}`)}`,
          footer: `You got this email because you asked us to tell you when it's back. It's a one-time alert. ${stopLink}`,
        }),
        text: `Back in stock: ${p.productTitle}${what ? ` (${what})` : ""}\n${p.url}\n\n${stopText}: ${p.stopUrl}`,
      };
    }
    if (p.lang === "he") {
      const what = [p.colorName, p.sizeName ? `מידה ${p.sizeName}` : ""].filter(Boolean).join(", ");
      return {
        subject: `חזר למלאי: ${p.productTitle}`,
        html: layout({
          lang: "he",
          siteName: p.siteName,
          title: "חזר למלאי",
          body: `<p>שלום,</p><p>הפריט שביקשת שנעדכן עליו חזר למלאי:</p>${img}
<p style="font-size:18px;font-weight:bold;margin:8px 0">${esc(p.productTitle)}</p>${what ? `<p style="margin:0;color:#5c4450">${esc(what)}</p>` : ""}
<p>הכמות מוגבלת, כדאי לא לחכות.</p>
${button(p.url, "לצפייה בפריט")}`,
          footer: `ההודעה נשלחה כי ביקשת התראה כשהפריט יחזור. זו התראה חד־פעמית. ${stopLink}`,
        }),
        text: `חזר למלאי: ${p.productTitle}${what ? ` (${what})` : ""}\n${p.url}\n\n${stopText}: ${p.stopUrl}`,
      };
    }
    const w = arPiece(p);
    const what = [p.colorName, p.sizeName ? `مقاس ${p.sizeName}` : ""].filter(Boolean).join("، ");
    return {
      subject: `${w.back}: ${p.productTitle}`,
      html: layout({
        siteName: p.siteName,
        title: w.back,
        body: `<p>${w.a.hi}</p><p>${w.the} اللي ${w.a.asked} نخبّر${w.a.k} ${w.about} ${w.back}:</p>
${img}
<p style="font-size:18px;font-weight:bold;margin:8px 0">${esc(p.productTitle)}</p>${what ? `<p style="margin:0;color:#5c4450">${esc(what)}</p>` : ""}
<p>الكمية قليلة، فإذا ${w.liked} ${w.a.hurry}.</p>
${button(p.url, `${w.a.see} ${w.the}`)}`,
        footer: `وصلت${w.a.k} هالرسالة ${w.a.because} ${w.a.asked} تنبيه لما ${w.returns}. هذا تنبيه لمرة وحدة. ${stopLink}`,
      }),
      text: `${w.back}: ${p.productTitle}${what ? ` (${what})` : ""}\n${p.url}\n\n${stopText}: ${p.stopUrl}`,
    };
  },
};

/** Digital files, tickets and codes are ready: the private order page link, ticket codes and file names (codes only as a count: they stay on the page). */
EMAIL_TEMPLATES.ORDER_DELIVERY = (p) => {
  const tickets: Array<{ code: string; title: string; label?: string | null; when?: string | null; location?: string | null }> = Array.isArray(p.tickets) ? p.tickets : [];
  const files: Array<{ name: string; productTitle: string }> = Array.isArray(p.files) ? p.files : [];
  const codes = Number(p.codes ?? 0);
  const licences = Number(p.licences ?? 0);
  const ticketsHtml = tickets
    .map(
      (t) => `<tr><td style="padding:12px;border:1px solid #eadde3;border-radius:12px">
<div style="font-weight:bold">${esc(t.title)}${t.label ? ` · ${esc(t.label)}` : ""}</div>
${t.when ? `<div style="color:#5c4450;font-size:14px">${esc(t.when)}</div>` : ""}${t.location ? `<div style="color:#5c4450;font-size:14px">${esc(t.location)}</div>` : ""}
<div style="font-size:22px;font-weight:bold;letter-spacing:3px;direction:ltr;color:#7a2346;margin-top:6px">${esc(t.code)}</div>
</td></tr><tr><td style="height:8px"></td></tr>`,
    )
    .join("");
  const ticketsTable = tickets.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ticketsHtml}</table>` : "";
  const onlyTickets = tickets.length && !files.length && !codes;
  const onlyFiles = files.length && !tickets.length && !codes;
  const onlyCodes = codes && !files.length && !tickets.length;
  const fileList = (pad: "right" | "left") => `<ul style="padding-${pad}:18px;margin:8px 0">${files.map((f) => `<li>${esc(f.name)} <span style="color:#8a7680">(${esc(f.productTitle)})</span></li>`).join("")}</ul>`;
  const ticketLines = tickets.map((t) => `${t.title}${t.label ? ` · ${t.label}` : ""}: ${t.code}${t.when ? ` — ${t.when}` : ""}`).join("\n");
  const fileLines = files.map((f) => `- ${f.name}`).join("\n");

  if (p.lang === "en") {
    const what = [files.length || licences ? "files" : "", tickets.length ? (tickets.length > 1 ? "tickets" : "ticket") : "", codes ? (codes > 1 ? "codes" : "code") : ""].filter(Boolean);
    const whatText = what.length ? `Your ${what.join(" and ")}` : "Your order";
    const ready = what.length === 1 && (what[0] === "ticket" || what[0] === "code") ? "is ready" : what.length ? "are ready" : "is ready";
    return {
      subject: `${whatText} ${ready} - order ${p.orderNo}`,
      html: layout({
        lang: "en",
        siteName: p.siteName,
        title: `${whatText} ${ready}`,
        body: `<p>Hello ${esc(p.name)},</p><p>Thank you for your order. ${esc(whatText)} ${ready}:</p>
${ticketsTable}${tickets.length ? `<p style="font-size:13px;color:#5c4450">At the door: the code, or the QR from the order page.</p>` : ""}
${files.length ? `${fileList("left")}<p style="font-size:13px;color:#5c4450">Each file can be downloaded up to ${esc(p.maxDownloads)} times.</p>` : ""}
${codes ? `<p>${codes > 1 ? `${esc(codes)} codes are` : "The code is"} on your private order page (we don't email codes, to keep them safe).</p>` : ""}
${licences ? `<p>🔒 ${licences > 1 ? `${esc(licences)} protected copies` : "The protected copy"}: the serial (password) and the download are on your private order page, for a limited time.</p>` : ""}
${button(p.url, onlyTickets ? "Open the tickets" : onlyFiles ? "Download the files" : onlyCodes ? (codes > 1 ? "See the codes" : "See the code") : "Open the order page")}`,
        footer: "This link is yours alone. Please don't share it.",
      }),
      text: `Hello ${p.name}, ${whatText.toLowerCase()} ${ready} (order ${p.orderNo}).\n${ticketLines}\n${fileLines}${codes ? `\n${codes > 1 ? `${codes} codes are` : "The code is"} on the order page.` : ""}${licences ? `\nThe serial and the protected download are on the order page, for a limited time.` : ""}\n${p.url}`,
    };
  }

  if (p.lang === "he") {
    const what = [files.length || licences ? "הקבצים" : "", tickets.length ? (tickets.length > 1 ? "הכרטיסים" : "הכרטיס") : "", codes ? (codes > 1 ? "הקודים" : "הקוד") : ""].filter(Boolean);
    const whatText = what.length ? what.join(" ו") : "ההזמנה";
    const ready = what.length === 1 && (what[0] === "הכרטיס" || what[0] === "הקוד") ? "מוכן" : what.length ? "מוכנים" : "מוכנה";
    return {
      subject: `${whatText} ${ready} - הזמנה ${p.orderNo}`,
      html: layout({
        lang: "he",
        siteName: p.siteName,
        title: `${whatText} ${ready}`,
        body: `<p>שלום ${esc(p.name)},</p><p>תודה על ההזמנה. ${esc(whatText)} ${ready}:</p>
${ticketsTable}${tickets.length ? `<p style="font-size:13px;color:#5c4450">בכניסה: הקוד, או ה־QR מעמוד ההזמנה.</p>` : ""}
${files.length ? `${fileList("right")}<p style="font-size:13px;color:#5c4450">אפשר להוריד כל קובץ עד ${esc(p.maxDownloads)} פעמים.</p>` : ""}
${codes ? `<p>${codes > 1 ? `${esc(codes)} הקודים נמצאים` : "הקוד נמצא"} בעמוד ההזמנה הפרטי (לא שולחים קודים במייל, בשביל האבטחה).</p>` : ""}
${licences ? `<p>🔒 ${licences > 1 ? `${esc(licences)} עותקים מוגנים` : "העותק המוגן"}: הסיריאל (הסיסמה) וההורדה בעמוד ההזמנה הפרטי, לזמן מוגבל.</p>` : ""}
${button(p.url, onlyTickets ? "לכרטיסים" : onlyFiles ? "להורדת הקבצים" : onlyCodes ? (codes > 1 ? "לקודים" : "לקוד") : "לעמוד ההזמנה")}`,
        footer: "הקישור הזה אישי, עדיף לא לשתף אותו.",
      }),
      text: `שלום ${p.name}, ${whatText} ${ready} (הזמנה ${p.orderNo}).\n${ticketLines}\n${fileLines}${codes ? `\n${codes > 1 ? `${codes} קודים` : "הקוד"} בעמוד ההזמנה.` : ""}${licences ? `\nהסיריאל וההורדה המוגנת בעמוד ההזמנה, לזמן מוגבל.` : ""}\n${p.url}`,
    };
  }

  const a = AR[p.audience as Audience] ?? AR.women;
  const what = [files.length || licences ? `ملفات${a.k}` : "", tickets.length ? (tickets.length > 1 ? `تذاكر${a.k}` : `تذكرت${a.k}`) : "", codes ? (codes > 1 ? `أكواد${a.k}` : `كود${a.k}`) : ""].filter(Boolean);
  const whatText = what.length ? what.join(" و") : `طلب${a.k}`;
  // «طلب» and one «كود» are masculine; the rest (and more than one thing) take «جاهزة».
  const ready = !what.length || (what.length === 1 && what[0] === `كود${a.k}`) ? "جاهز" : "جاهزة";
  return {
    subject: `${whatText} ${ready} - طلب ${p.orderNo}`,
    html: layout({
      siteName: p.siteName,
      title: `${whatText} ${ready}`,
      body: `<p>أهلاً ${esc(p.name)}،</p><p>شكراً لطلب${a.k}. ${esc(whatText)} ${ready}:</p>
${ticketsTable}${tickets.length ? `<p style="font-size:13px;color:#5c4450">${a.door}</p>` : ""}
${files.length ? `${fileList("right")}<p style="font-size:13px;color:#5c4450">كل ملف بينزل لحد ${esc(p.maxDownloads)} مرات.</p>` : ""}
${codes ? `<p>${codes > 1 ? `${esc(codes)} أكواد` : "الكود"} بصفحة طلب${a.k} الخاصة (ما منبعت الأكواد بالإيميل، لأمانها).</p>` : ""}
${licences ? `<p>🔒 ${licences > 1 ? `${esc(licences)} نسخ محمية` : "النسخة المحمية"}: السيريال (كلمة السر) والتنزيل بصفحة طلب${a.k} الخاصة، لمدة محدودة.</p>` : ""}
${button(p.url, onlyTickets ? `${a.open} التذاكر` : onlyFiles ? `${a.get} الملفات` : onlyCodes ? (codes > 1 ? `${a.see} الأكواد` : `${a.see} الكود`) : `${a.open} صفحة الطلب`)}`,
      footer: a.share,
    }),
    text: `أهلاً ${p.name}، ${whatText} ${ready} (طلب ${p.orderNo}).\n${ticketLines}\n${fileLines}${codes ? `\n${codes > 1 ? `${codes} أكواد` : "الكود"} بصفحة الطلب.` : ""}${licences ? `\nالسيريال والتنزيل المحمي بصفحة الطلب، لمدة محدودة.` : ""}\n${p.url}`,
  };
};

/** «اطلبي قطعتكِ»: what she asked for is here. Also the WhatsApp text the owner sends (requests.service.ts). */
export function requestFoundText(p: Ctx & { name: string; productTitle: string; url?: string | null }) {
  if (p.lang === "en") return `Hello ${p.name} 🌸\nWe found what you asked for: ${p.productTitle}${p.url ? `\n${p.url}` : ""}\nThere are only a few, so don't wait too long.`;
  if (p.lang === "he") return `שלום ${p.name} 🌸\nמצאנו את מה שביקשת: ${p.productTitle}${p.url ? `\n${p.url}` : ""}\nהכמות מוגבלת, כדאי לא לחכות.`;
  const w = arPiece(p);
  return `أهلاً ${p.name} 🌸\nلقينا اللي ${FOUND[p.audience]}: ${p.productTitle}${p.url ? `\n${p.url}` : ""}\nالكمية قليلة، فإذا ${w.likedFound} ${w.a.hurry}.`;
}

/** «اللي طلبتيه»: what she / he / they asked for. */
const FOUND: Record<Audience, string> = { women: "طلبتيه", men: "طلبته", everyone: "طلبتوه" };

EMAIL_TEMPLATES.REQUEST_FOUND = (p) => {
  if (p.lang === "en") {
    const piece = enPiece(p);
    return {
      subject: `We found what you asked for: ${p.productTitle}`,
      html: layout({
        lang: "en",
        siteName: p.siteName,
        title: "We found it",
        body: `<p>Hello ${esc(p.name)},</p><p>The ${piece} you asked for is here:</p>
<p style="font-size:18px;font-weight:bold;margin:8px 0">${esc(p.productTitle)}</p>
<p>There are only a few, so don't wait too long.</p>
${button(p.url, `See the ${piece}`)}`,
        footer: `You got this email because you asked us to look for a ${piece} for you.`,
      }),
      text: `We found what you asked for: ${p.productTitle}\n${p.url}`,
    };
  }
  if (p.lang === "he")
    return {
      subject: `מצאנו את מה שביקשת: ${p.productTitle}`,
      html: layout({
        lang: "he",
        siteName: p.siteName,
        title: "מצאנו",
        body: `<p>שלום ${esc(p.name)},</p><p>הפריט שביקשת הגיע אלינו:</p>
<p style="font-size:18px;font-weight:bold;margin:8px 0">${esc(p.productTitle)}</p>
<p>הכמות מוגבלת, כדאי לא לחכות.</p>
${button(p.url, "לצפייה בפריט")}`,
        footer: "ההודעה נשלחה כי ביקשת שנחפש בשבילך פריט.",
      }),
      text: `מצאנו את מה שביקשת: ${p.productTitle}\n${p.url}`,
    };
  const w = arPiece(p);
  const found = FOUND[p.audience];
  return {
    subject: `لقينا اللي ${found}: ${p.productTitle}`,
    html: layout({
      siteName: p.siteName,
      title: `لقينا اللي ${found}`,
      body: `<p>أهلاً ${esc(p.name)}،</p><p>${w.the} اللي ${w.askedIt} ${w.isHere}:</p>
<p style="font-size:18px;font-weight:bold;margin:8px 0">${esc(p.productTitle)}</p>
<p>الكمية قليلة، فإذا ${w.likedFound} ${w.a.hurry}.</p>
${button(p.url, `${w.a.see} ${w.the}`)}`,
      footer: `وصلت${w.a.k} هالرسالة ${w.a.because} ${w.a.asked} منا ندوّرل${w.a.k} على ${dressed(p.industry) ? "قطعة" : "منتج"}.`,
    }),
    text: `لقينا اللي ${found}: ${p.productTitle}\n${p.url}`,
  };
};

export function renderEmail(
  template: string | null | undefined,
  payload: Payload,
  siteName: string,
  ctx: Partial<Omit<Ctx, "siteName">> = {},
): RenderedEmail | null {
  const t = template ? EMAIL_TEMPLATES[template] : undefined;
  return t ? t({ ...payload, siteName, lang: ctx.lang ?? "ar", audience: ctx.audience ?? "women", industry: ctx.industry ?? "fashion" }) : null;
}
