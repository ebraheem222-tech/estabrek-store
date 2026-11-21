import { randomBytes } from "node:crypto";
import type { Prisma, SiteSettings } from "@prisma/client";
import { env } from "../../config/env.js";
import { emailConfigured } from "../outbox/sender/email.js";
import { isCloudinaryEnabled } from "../../lib/cloudinary.js";
import { razanOf } from "../razan/razan.settings.js";
import { requestsOf } from "../requests/requests.settings.js";
import { quizOf } from "../quiz/quiz.settings.js";
import { aiOf, type AiFeature } from "../ai/ai.settings.js";
import { aiImageEditReady, aiTextReady, aiVisionReady } from "../ai/ai.client.js";

/**
 * Store features ("modules") the owner turns on and off from one admin page
 * (الميزات). Each entry says where its switch lives (a SiteSettings column or a
 * key under header.storefront), what it needs before it can work, and where its
 * details are set. New features are added here once by the developer; owners
 * switch them on themselves.
 */

export type FeatureGroup = "customers" | "contact" | "experience" | "ai" | "system";

export const FEATURE_GROUPS: Array<{ key: FeatureGroup; title: string }> = [
  { key: "customers", title: "الزبائن والطلبات" },
  { key: "contact", title: "التواصل مع الزبائن" },
  { key: "experience", title: "تجربة المتجر" },
  { key: "ai", title: "الذكاء الاصطناعي" },
  { key: "system", title: "النظام" },
];

/** Something a feature needs. `required` ones block turning it on; the others only warn. */
export type FeatureNeed = { label: string; ok: boolean; required?: boolean };

export type FeatureDef = {
  key: string;
  group: FeatureGroup;
  title: string;
  description: string;
  /** Admin page where its details are set. */
  link?: string;
  get: (s: SiteSettings) => boolean;
  /** The settings change that turns it on/off. */
  set: (s: SiteSettings, on: boolean) => Prisma.SiteSettingsUpdateInput;
  needs?: (s: SiteSettings) => FeatureNeed[];
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});

/** A switch under header.storefront (the storefront's own settings); `def` = the storefront's default. */
function storefrontFlag(key: string, def: boolean) {
  return {
    get: (s: SiteSettings) => {
      const v = obj(obj(s.header).storefront)[key];
      return typeof v === "boolean" ? v : def;
    },
    set: (s: SiteSettings, on: boolean): Prisma.SiteSettingsUpdateInput => {
      const header = obj(s.header);
      return { header: { ...header, storefront: { ...obj(header.storefront), [key]: on } } as Prisma.InputJsonValue };
    },
  };
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const emailNeed = (): FeatureNeed => ({ label: "إرسال الإيميل (Resend) مضبوط بالسيرفر", ok: emailConfigured() });

export const FEATURES: FeatureDef[] = [
  {
    key: "customerAccounts",
    group: "customers",
    title: "حسابات الزبائن",
    description: "الزبونة بتفوت بكود على إيميلها، بتشوف طلباتها، وبتحفظ المفضلة وعناوينها. الشراء كضيفة بيضل شغّال.",
    link: "/admin/customers",
    get: (s) => s.customerAccountsEnabled === true,
    set: (_s, on) => ({ customerAccountsEnabled: on }),
    needs: () => [emailNeed()],
  },
  {
    key: "stockAlerts",
    group: "customers",
    title: "تنبيه «رجعت متوفرة»",
    description: "على المقاسات اللي نفدت، الزبونة بتترك إيميلها وبيوصلها إيميل واحد أول ما ترجع القطعة. ما بدها حساب.",
    link: "/admin/inventory/back-in-stock",
    get: (s) => s.stockAlertsEnabled === true,
    set: (_s, on) => ({ stockAlertsEnabled: on }),
    needs: () => [emailNeed(), { label: "عنوان المتجر STOREFRONT_URL مضبوط بالسيرفر", ok: Boolean(env.STOREFRONT_URL) }],
  },
  {
    key: "requests",
    group: "customers",
    title: "«اطلبي قطعتكِ» — طلبات خاصة",
    description: "الزبونة بتطلب مقاس أو لون مش موجود، أو قطعة جديدة مع صور، وإنتَ بتدوّرلها وبتبلّغها لما تلاقيها.",
    link: "/admin/requests",
    get: (s) => requestsOf(s.header).enabled,
    set: (s, on) => {
      const header = obj(s.header);
      return { header: { ...header, requests: { ...obj(header.requests), enabled: on } } as Prisma.InputJsonValue };
    },
    needs: () => [{ label: "Cloudinary مضبوط بالسيرفر (لحفظ صور الطلبات)", ok: isCloudinaryEnabled() }],
  },
  {
    key: "quiz",
    group: "experience",
    title: "«سؤال وجواب» — كوبون للي بتجاوب صح",
    description: "زوار قليلين (1، 3، 7، 15…) بتعرضلهم رزان أسئلة دينية من السهل للصعب؛ اللي بتجاوب كلها صح بتربح كوبون لمرة وحدة لرقمها. بتشتغل لما توافق على الأسئلة.",
    link: "/admin/quiz",
    get: (s) => quizOf(s.header).enabled,
    set: (s, on) => {
      const header = obj(s.header);
      return { header: { ...header, quiz: { ...obj(header.quiz), enabled: on } } as Prisma.InputJsonValue };
    },
    needs: (s) => [{ label: "رزان ظاهرة بالمتجر (هي اللي بتعرض الأسئلة)", ok: razanOf(s.header).enabled }],
  },
  {
    key: "announcement",
    group: "contact",
    title: "شريط الإعلان فوق الموقع",
    description: "سطر قصير فوق كل الصفحات، مثلاً عرض أو توصيل مجاني، مع رابط اختياري.",
    link: "/admin/settings",
    get: (s) => s.announcementIsActive === true,
    set: (_s, on) => ({ announcementIsActive: on }),
    needs: (s) => [{ label: "نص الإعلان مكتوب بالإعدادات", ok: Boolean(text(s.announcementText)), required: true }],
  },
  {
    key: "whatsapp",
    group: "contact",
    title: "زر واتساب",
    description: "زر عائم بيفتح محادثة واتساب مع المتجر من أي صفحة.",
    link: "/admin/settings",
    ...storefrontFlag("whatsappEnabled", false),
    needs: (s) => [{ label: "رقم واتساب الزر مكتوب بإعدادات المتجر", ok: Boolean(text(obj(obj(s.header).storefront).whatsappNumber)), required: true }],
  },
  {
    key: "razan",
    group: "experience",
    title: "رزان، دليلة المتجر",
    description: "الشخصية اللي بتمشي مع الزبونة بالمتجر: بترحّب، بتتفاعل، وبتساعد. كل تصرفاتها وكلامها ولبسها بتنضبط من صفحة «رزان».",
    link: "/admin/razan",
    get: (s) => razanOf(s.header).enabled,
    set: (s, on) => {
      const header = obj(s.header);
      return { header: { ...header, razan: { ...obj(header.razan), enabled: on } } as Prisma.InputJsonValue };
    },
  },
  {
    key: "chatbot",
    group: "contact",
    title: "مساعد المتجر (روز)",
    description: "روز بتجاوب الزبونات عن القطع والمقاسات والتوصيل.",
    link: "/admin/chatbot",
    ...storefrontFlag("chatbotEnabled", true),
  },
  {
    key: "recentlyViewed",
    group: "experience",
    title: "«شاهدتِ مؤخراً»",
    description: "شريط صغير بيرجّع للزبونة آخر القطع اللي شافتها.",
    ...storefrontFlag("recentPurchasesPopup", false),
  },
  {
    key: "darkMode",
    group: "experience",
    title: "الوضع الداكن",
    description: "الزبونة بتقدر تبدّل بين الفاتح والداكن.",
    ...storefrontFlag("darkModeEnabled", true),
  },
  {
    key: "scrollAnimations",
    group: "experience",
    title: "حركات التمرير",
    description: "العناصر بتظهر بحركة ناعمة وقت النزول بالصفحة. إطفاؤها بيخفّف على الأجهزة الضعيفة.",
    ...storefrontFlag("scrollAnimationsEnabled", true),
  },
  {
    key: "accessibilityTools",
    group: "experience",
    title: "أدوات سهولة الوصول",
    description: "زر بيكبّر الخط ويزيد التباين للي بيحتاجوه.",
    ...storefrontFlag("accessibilityToolsEnabled", true),
  },
  {
    key: "maintenance",
    group: "system",
    title: "وضع الصيانة",
    description: "الموقع بيعرض شاشة «راجعين قريباً» للزوار، والطلبات بتوقف لحتى تطفيه. إنتَ بتقدر تشوف الموقع برابط المعاينة. الأدمن بيضل شغّال.",
    link: "/admin/system/traffic",
    get: (s) => s.maintenanceMode === true,
    // The preview key is made once and kept, so the owner's preview link keeps working.
    set: (s, on) => ({ maintenanceMode: on, ...(on && !s.maintenanceKey ? { maintenanceKey: randomBytes(12).toString("base64url") } : {}) }),
  },
  {
    key: "backups",
    group: "system",
    title: "نسخة احتياطية يومية",
    description: "كل يوم بالليل بتنحفظ نسخة مشفّرة من كل الداتا (منتجات، طلبات، زبائن، إعدادات) برّا السيرفر. آخر 14 نسخة بيضلّوا.",
    link: "/admin/system/backups",
    get: (s) => s.backupsEnabled !== false,
    set: (_s, on) => ({ backupsEnabled: on }),
    needs: () => [
      { label: "Cloudinary مضبوط بالسيرفر (مكان حفظ النسخ)", ok: isCloudinaryEnabled() },
      { label: "مفتاح تشفير خاص BACKUP_ENCRYPTION_KEY محفوظ عندك", ok: Boolean(env.BACKUP_ENCRYPTION_KEY) },
    ],
  },
  aiFeature("productWriter", "«اكتبيلي من الصور» — كتابة صفحة المنتج", "بتحمّل صور القطعة وبتكتبلك العنوان والوصف وكلمات جوجل وحقول النوع. إنتِ بتراجعي قبل الحفظ.", (st) => [{ label: "نموذج بيقرأ الصور: مفتاح OPENAI_API_KEY، أو سيرفر خاص نموذجه بيقرأ الصور", ok: aiVisionReady(st.header), required: true }]),
  aiFeature("smartSearch", "بحث بكلام الزبونة", "«بدي فستان سهرة خمري لحد 300» بيصير بحث مع فلاتر جاهزة.", (st) => [aiNeed(st)]),
  aiFeature("shopTheLook", "«كمّلي اللبسة»", "بصفحة القطعة: 3 قطع بتلبق معها (حجاب لعباية مثلاً) مع السبب.", (st) => [aiNeed(st)]),
  aiFeature("sizeAdvice", "نصيحة المقاس", "الزبونة بتكتب طولها ووزنها وبتطلعلها نصيحة مقاس للقطعة. ما بينحفظ إشي عنها.", (st) => [aiNeed(st)]),
  aiFeature("reviewSummary", "ملخص التقييمات", "بصفحة القطعة: شو بيحكوا الزبونات بجملتين، عربي وإنجليزي (لما يكون في 3 تقييمات وأكثر).", (st) => [aiNeed(st)]),
  aiFeature("adminAsk", "اسأل عن متجرك", "سؤال بكلامك («شو أكثر قطعة بعنا هالشهر؟») وجواب من أرقام متجرك.", (st) => [aiNeed(st)]),
  aiFeature("replySuggest", "اقتراحات ردود واتساب", "بصفحة الطلب: 3 ردود جاهزة للزبونة حسب حالة الطلب ورسالتها.", (st) => [aiNeed(st)]),
  aiFeature("photoStudio", "استوديو الصور", "خلفية نظيفة لصورة القطعة بكبسة — بتنضاف كصورة جديدة، الأصلية بتضل.", () => [{ label: "مفتاح OPENAI_API_KEY مضبوط بالسيرفر (الصور بتنعمل عند OpenAI بس)", ok: aiImageEditReady(), required: true }, { label: "Cloudinary مضبوط (لحفظ الصورة الجديدة)", ok: isCloudinaryEnabled(), required: true }]),
  aiFeature("translate", "ترجمة المتجر", "بصفحة كل منتج وقسم ونوع: مسودة بالإنجليزي أو العبري من النص العربي، بتراجعيها وبتعدّليها قبل الحفظ.", (st) => [aiNeed(st)]),
  aiFeature("pageWriter", "كاتب الصفحات (بمحرّر الصفحات)", "بمحرّر الصفحات: اقتراحات لكلام عنوان أو نص أو زر (كتابة، تحسين، تقصير، تطويل، ترجمة)، ووصف للصورة. إنتِ بتختاري وبتعدّلي.", (st) => [aiNeed(st)]),
  aiFeature("shopAgent", "مساعد المتجر الذكي", "شات المتجر بيصير مساعد حقيقي: بيتذكّر الحكي، بيلاقي القطع من متجرك وبيعرضها، بيعرف القطعة اللي الزبونة عم تتفرّج عليها، بيحكي بصوت، وبيحوّل لواتساب لما يلزم. الأسئلة اللي ما عرف يجاوبها بتطلعلك بصفحة مساعد المتجر.", (st) => [aiNeed(st)]),
  aiFeature("socialPosts", "منشورات السوشال", "من قطعة أو عرض: منشورات جاهزة لإنستغرام وفيسبوك وتيك توك وستوري واتساب وX، مع هاشتاغات ورابط القطعة، وخطة أسبوع كاملة.", (st) => [aiNeed(st)]),
  aiFeature("seoDoctor", "طبيب جوجل (SEO)", "بيفحص كل المنتجات: عنوان جوجل ناقص أو طويل، وصف ضعيف، صور بدون وصف، عناوين مكرّرة — وبيكتب مسودات أحسن بتراجعيها قبل الحفظ.", (st) => [aiNeed(st)]),
  aiFeature("orderFlags", "طلبات بدها انتباه", "تنبيه بصفحة الطلب لما يكون في إشي غريب (نفس الرقم كذا مرة، كمية كبيرة…). قواعد بسيطة، ما بتحتاج مفتاح.", () => []),
];

export function featureByKey(key: string) {
  return FEATURES.find((f) => f.key === key) ?? null;
}

export function describeFeatures(s: SiteSettings) {
  return FEATURE_GROUPS.map((g) => ({
    ...g,
    features: FEATURES.filter((f) => f.group === g.key).map((f) => {
      const needs = f.needs?.(s) ?? [];
      return {
        key: f.key,
        title: f.title,
        description: f.description,
        link: f.link ?? null,
        enabled: f.get(s),
        needs,
        ready: needs.every((n) => n.ok),
      };
    }),
  })).filter((g) => g.features.length);
}

/** One AI switch under header.ai (link: the AI page). */
/** What an AI feature needs, said for the features page: a model for words (OpenAI or the own server), one that reads pictures, or OpenAI. */
function aiNeed(s: SiteSettings): { label: string; ok: boolean; required: true } {
  return { label: "نموذج ذكاء اصطناعي: مفتاح OPENAI_API_KEY بالسيرفر، أو سيرفر نماذج خاص (صفحة الذكاء الاصطناعي)", ok: aiTextReady(s.header), required: true };
}

function aiFeature(key: AiFeature, title: string, description: string, needs: FeatureDef["needs"]): FeatureDef {
  return {
    key: `ai-${key}`,
    group: "ai",
    title,
    description,
    link: "/admin/ai",
    get: (s) => aiOf(s.header)[key],
    set: (s, on) => {
      const header = obj(s.header);
      return { header: { ...header, ai: { ...aiOf(header), [key]: on } } as Prisma.InputJsonValue };
    },
    needs,
  };
}
