// Plain-Arabic text for the Team & permissions pages. Pure functions (tested).
import type { ActivityRow, MemberStatus, PermissionGroup } from "../../api/staff.api";

/** Admin areas as the activity log names them. */
export const AREA_LABELS: Record<string, string> = {
  orders: "الطلبات",
  customers: "الزبائن",
  catalog: "المنتجات",
  "product-types": "أنواع المنتجات",
  tickets: "التذاكر",
  razan: "رزان",
  requests: "الطلبات الخاصة",
  "requests-settings": "إعدادات الطلبات الخاصة",
  quiz: "سؤال وجواب",
  ai: "الذكاء الاصطناعي",
  "ai-catalog": "الذكاء الاصطناعي (منتجات)",
  "ai-orders": "الذكاء الاصطناعي (طلبات)",
  "ai-ask": "اسأل عن متجرك",
  inventory: "المخزون",
  "stock-alerts": "تنبيهات التوفّر",
  coupons: "الكوبونات",
  ugc: "التقييمات والتعليقات",
  pages: "الصفحات",
  nav: "القوائم",
  uploads: "الوسائط",
  chatbot: "مساعد المتجر",
  outbox: "الرسائل",
  settings: "الإعدادات",
  features: "الميزات",
  staff: "الفريق",
  account: "الحساب",
  admin: "الإدارة",
};

const VERB_LABELS: Record<string, string> = {
  create: "أضاف",
  update: "عدّل",
  delete: "حذف",
  action: "نفّذ إجراء على",
};

/** Some paths say more than "edited X". */
const PATH_LABELS: Array<[RegExp, string]> = [
  [/^\/orders\/:id\/status$/, "غيّر حالة طلب"],
  [/^\/staff\/members$/, "دعا عضو جديد للفريق"],
  [/^\/staff\/members\/:id\/link$/, "أنشأ رابط دخول لعضو"],
  [/^\/staff\/members\/:id\/sessions\/revoke$/, "سجّل خروج عضو من كل الأجهزة"],
  [/^\/staff\/roles$/, "أنشأ دور جديد"],
  [/^\/settings\/revisions\/:id\/restore$/, "استرجع نسخة قديمة من الإعدادات"],
  [/^\/pages\/:id\/revisions\/:id\/restore$/, "استرجع نسخة قديمة من صفحة"],
  [/^\/uploads/, "رفع ملف"],
  [/^\/account\/sessions/, "أنهى جلسة دخول"],
  [/^\/account\/profile$/, "عدّل ملفه الشخصي"],
];

export function describeActivity(row: Pick<ActivityRow, "area" | "verb" | "path" | "method">): string {
  const special = PATH_LABELS.find(([re]) => re.test(row.path));
  if (special) {
    if (row.path.startsWith("/uploads") && row.method === "DELETE") return "حذف ملف من الوسائط";
    return special[1];
  }
  const area = AREA_LABELS[row.area] ?? row.area;
  const verb = VERB_LABELS[row.verb] ?? "غيّر";
  return `${verb} في ${area}`;
}

/** Field names the activity log keeps (never values), in a short readable list. */
export function describeFields(fields: string[] | undefined, max = 4): string {
  const list = (fields ?? []).filter(Boolean);
  if (!list.length) return "";
  const shown = list.slice(0, max).join("، ");
  return list.length > max ? `${shown} و${list.length - max} غيرها` : shown;
}

export const STATUS_TEXT: Record<MemberStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  ACTIVE: { label: "فعّال", variant: "success" },
  INVITED: { label: "بانتظار الانضمام", variant: "warning" },
  SUSPENDED: { label: "موقوف", variant: "danger" },
};

/** "Chrome · Windows" from a user agent, good enough to recognise a device. */
export function describeDevice(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  if (!ua) return "جهاز غير معروف";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "متصفح";
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

/** The link a member opens to join (invite) or choose a new password (reset). */
export function memberLinkUrl(origin: string, token: string, kind: "invite" | "reset"): string {
  const base = origin.replace(/\/+$/, "");
  const q = new URLSearchParams({ token });
  if (kind === "invite") q.set("invite", "1");
  return `${base}/login/reset?${q.toString()}`;
}

export function shareMessage(name: string, url: string, kind: "invite" | "reset"): string {
  return kind === "invite"
    ? `أهلاً ${name}، هذا رابط الانضمام للوحة إدارة المتجر. افتحه واختر كلمة مرور (صالح لمدة 7 أيام):\n${url}`
    : `أهلاً ${name}، هذا رابط لاختيار كلمة مرور جديدة للوحة إدارة المتجر (صالح لمدة 24 ساعة):\n${url}`;
}

export function whatsappUrl(text: string, phone?: string | null): string {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** How many permissions of a group a role has: "2 من 3". */
export function groupCount(group: PermissionGroup, selected: Set<string>): { on: number; total: number } {
  const total = group.permissions.length;
  const on = group.permissions.filter((p) => selected.has(p.key)).length;
  return { on, total };
}

/**
 * Picking "write" without "read" makes no sense in the admin (you can't edit
 * what you can't open), so ticking a write permission also ticks its read.
 */
export function togglePermission(selected: Set<string>, key: string, on: boolean, groups: PermissionGroup[]): Set<string> {
  const next = new Set(selected);
  if (on) {
    next.add(key);
    const [area, action] = key.split(":");
    if (action && action !== "read") {
      const group = groups.find((g) => g.permissions.some((p) => p.key === key));
      const read = group?.permissions.find((p) => p.key === `${area}:read`);
      if (read) next.add(read.key);
    }
  } else {
    next.delete(key);
    // Turning read off turns off what depends on it in the same area.
    const [area, action] = key.split(":");
    if (action === "read") for (const k of [...next]) if (k.startsWith(`${area}:`)) next.delete(k);
  }
  return next;
}

export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "لم يدخل بعد";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const mins = Math.max(0, Math.round((now - t) / 60_000));
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "أمس" : `قبل ${days} يوم`;
  return new Date(t).toLocaleDateString("ar", { dateStyle: "medium" });
}
