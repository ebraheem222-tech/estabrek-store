// src/api/http.ts
import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { AxiosInstance } from "axios";
import { env } from "../config/env";
import { ENDPOINTS } from "./endpoints";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../lib/storage";
import { tr } from "@/lib/words";

export { getAccessToken, getRefreshToken, setTokens, clearTokens };

/**
 * Axios instance used for normal API calls (has interceptors)
 */
export const api: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Backward-compat alias (some pages import { http })
export const http = api;

/**
 * Raw instance (NO interceptors) used only for refresh to avoid loops.
 */
const raw: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh (prevents 10 parallel refresh calls)
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

async function refreshTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  const rt = getRefreshToken();
  if (!rt) {
    clearTokens();
    throw new Error("NO_REFRESH_TOKEN");
  }

  // Backend expects: { refreshToken }
  const res = await raw.post(ENDPOINTS.auth.refresh, { refreshToken: rt });
  const tokens = res.data as { accessToken: string; refreshToken: string };
  setTokens(tokens);
  return tokens;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const errCode = (error.response?.data as any)?.error as string | undefined;

    // If we don't have original request, just throw
    if (!original) throw error;

    // Do not retry refresh/login/logout itself
    const url = original.url ?? "";
    const isAuthEndpoint =
      url.includes(ENDPOINTS.auth.refresh) ||
      url.includes(ENDPOINTS.auth.login) ||
      url.includes(ENDPOINTS.auth.logout) ||
      url.includes(ENDPOINTS.auth.mfaFinalize);

    const authError = errCode === "NO_TOKEN" || errCode === "INVALID_TOKEN" || errCode === "TOKEN_EXPIRED" || errCode === "UNAUTHORIZED";
    // If backend signals auth error (even if status is wrong), force re-login.
    if (authError) {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login?reason=expired";
      }
      throw error;
    }

    // The store requires two-step sign-in and this account hasn't turned it on yet.
    if (errCode === "MFA_SETUP_REQUIRED" && typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/account/security")) {
      window.location.href = "/admin/account/security?setup=2fa";
      throw error;
    }

    // The account was turned off (or removed) by the store owner: sign out now.
    if ((errCode === "ACCOUNT_SUSPENDED" || errCode === "ACCOUNT_NOT_FOUND") && !isAuthEndpoint) {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login?reason=suspended";
      }
      throw error;
    }

    if (status !== 401 || original._retry || isAuthEndpoint) {
      throw error;
    }

    // If no refresh token, force re-login.
    if (!getRefreshToken()) {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login?reason=expired";
      }
      throw error;
    }

    original._retry = true;

    try {
      if (!refreshPromise) refreshPromise = refreshTokens();
      await refreshPromise;
      refreshPromise = null;

      // retry original request with new access token (request interceptor will attach it)
      return api.request(original);
    } catch (e) {
      refreshPromise = null;
      clearTokens();
      throw error;
    }
  }
);

/**
 * Optional: normalize backend error shape into something consistent.
 */
/** Team & permissions answers, in plain Arabic. */
const CODE_MESSAGES: Record<string, string> = {
  NO_PRODUCT: tr("يرجى ربط القطعة اللي انلقت أول، وبعدها إرسال الخبر.", "Link the piece you found first, then let them know."),
  AI_KEY_MISSING: tr("لازم يكون مفتاح OPENAI_API_KEY مضاف بالسيرفر (Railway) أول.", "Add the OPENAI_API_KEY key on the server (Railway) first."),
  AI_FAILED: tr("الذكاء الاصطناعي ما جاوب هالمرة. يرجى المحاولة بعد شوي.", "The AI didn't answer this time. Try again in a moment."),
  AI_OFF: tr("الذكاء الاصطناعي مش مضبوط بالسيرفر.", "AI isn't set up on the server."),
  CLOUDINARY_NOT_CONFIGURED: tr("لازم Cloudinary يكون مضبوط بالسيرفر.", "Cloudinary needs to be set up on the server."),
  BAD_IMAGE: tr("ما قدرنا نفتح الصورة.", "We couldn't open the image."),
  NOT_ENOUGH_QUESTIONS: tr("ما في أسئلة موافق عليها كفاية. يرجى الموافقة على أسئلة أكثر أو تقليل عدد الأسئلة.", "Not enough approved questions. Approve more or ask fewer."),
  COUPON_PHONE: tr("هالكوبون لرقم هاتف تاني.", "This coupon belongs to another phone number."),
  PRODUCT_NOT_FOUND: tr("القطعة مش موجودة.", "That item doesn't exist."),
  FEATURE_OFF: tr("هالميزة مطفية. بتنشغّل من صفحتها أو من صفحة الميزات.", "This feature is off. Turn it on from its page or from Features."),
  KIND_OFF: tr("هالنوع من الطلبات مطفي.", "This kind of request is off."),
  TOO_MANY_REQUESTS: tr("طلبات كتير بوقت قصير. يرجى الانتظار شوي والمحاولة من جديد.", "Too many requests at once. Wait a moment and try again."),
  PHOTO_TOO_BIG: tr("الصورة أكبر من 8MB.", "The image is over 8 MB."),
  BAD_PHOTO: tr("ما قدرنا نقرأ الصورة.", "We couldn't read the image."),
  PERMISSION_DENIED: tr("ما في صلاحية لهالعملية. يرجى الطلب من صاحب المتجر.", "You don't have permission for this. Ask the store owner."),
  ACCOUNT_SUSPENDED: tr("هذا الحساب موقوف. يرجى التواصل مع صاحب المتجر.", "This account is suspended. Contact the store owner."),
  ACCOUNT_NOT_FOUND: tr("الحساب غير موجود.", "The account doesn't exist."),
  CANNOT_GRANT: tr("بتنعطى بس الصلاحيات الموجودة بحسابك.", "You can only give permissions you have yourself."),
  OWN_ROLE: tr("دور حسابك ما بيتعدّل من هون.", "You can't change your own role."),
  SELF_CHANGE: tr("حسابك بيتعدّل من صفحة الملف الشخصي.", "Edit your own account from the Profile page."),
  OWNERS_ONLY: tr("هاي العملية لصاحب المتجر بس.", "Only the store owner can do this."),
  LAST_OWNER: tr("لازم يضل صاحب متجر واحد فعّال على الأقل.", "At least one active store owner must remain."),
  ROLE_IN_USE: tr("في أعضاء على هالدور. لازم ينتقلوا لدور ثاني أول.", "Members still have this role. Move them to another role first."),
  ROLE_NAME_TAKEN: tr("في دور بنفس الاسم.", "A role with this name already exists."),
  ROLE_REQUIRED: tr("لازم يكون للعضو دور.", "Choose a role for the member."),
  ROLE_NOT_FOUND: tr("الدور مش موجود.", "The role doesn't exist."),
  EMAIL_TAKEN: tr("هذا الإيميل إله حساب من قبل.", "This email already has an account."),
  USE_SUSPEND: tr("هذا العضو انضم. الأفضل إيقاف الحساب بدل الحذف.", "This member has joined. Suspend the account instead of deleting it."),
  USE_REMOVE: tr("الدعوة ما انستخدمت. الأفضل حذفها بدل الإيقاف.", "The invite wasn't used. Delete it instead of suspending it."),
  SUSPENDED: tr("الحساب موقوف. لازم يتشغّل أول.", "The account is suspended. Turn it back on first."),
  MFA_SETUP_REQUIRED: tr("لازم يكون التحقق بخطوتين شغّال بحسابك أول.", "Turn on two-step sign-in for your account first."),
  MFA_REQUIRED_BY_POLICY: tr("قواعد الأمان بالمتجر بتطلب التحقق بخطوتين لهذا الحساب، فما بينطفى.", "The store's security rules require two-step sign-in for this account, so it can't be turned off."),
  ENABLE_2FA_FIRST: tr("لازم يكون التحقق بخطوتين شغّال بحسابك أول، بعدها بينطلب من الباقي.", "Turn on two-step sign-in for your own account first, then require it for the others."),
  BLOCKS_YOUR_IP: tr("هالقائمة بتحظر الـ IP تبعك، فلوحة الإدارة رح تنقفل بوجهك. يرجى شيله من القائمة.", "This list blocks your own IP, which would lock you out of the admin. Remove it from the list."),
  NOT_IN_ALLOWLIST: tr("الـ IP تبعك مش بقائمة المسموح، فلوحة الإدارة رح تنقفل بوجهك. يرجى إضافته للقائمة.", "Your IP isn't on the allowed list, which would lock you out of the admin. Add it to the list."),
  RATE_LIMIT: tr("طلبات كثيرة بوقت قصير. يرجى الانتظار شوي والمحاولة كمان مرة.", "Too many requests at once. Wait a moment and try again."),
  // Digital products and tickets
  FILE_TOO_BIG: tr("الملف أكبر من المسموح للرفع. ممكن إضافته كرابط (مثلاً Google Drive) بدل الرفع.", "The file is bigger than the upload limit. Add it as a link (e.g. Google Drive) instead."),
  FILE_TYPE_BLOCKED: tr("هالنوع من الملفات ممنوع يتباع كتنزيل (برامج وسكربتات).", "This kind of file can't be sold as a download (programs and scripts)."),
  STORAGE_NOT_READY: tr("تخزين الملفات (Cloudinary) مش مضبوط بالسيرفر.", "File storage (Cloudinary) isn't set up on the server."),
  NO_FILE: tr("يرجى اختيار ملف.", "Choose a file."),
  NOTHING_TO_DELIVER: tr("ما في بهالطلب منتجات رقمية أو حجوزات.", "This order has no digital products or bookings."),
  ORDER_CLOSED: tr("الطلب ملغي أو مرفوض أو مسترجع.", "The order is cancelled, rejected or refunded."),
  NOT_RELEASED: tr("الملفات/التذاكر لسا ما انسلّمت. بتنسلّم لما ينقبل الطلب أو يدوياً.", "The files/tickets haven't been delivered yet. Accept the order or deliver them by hand."),
  NO_EMAIL: tr("ما في إيميل على هالطلب. لازم ينكتب أول.", "This order has no email. Add one first."),
  NO_STOREFRONT_URL: tr("لازم يكون STOREFRONT_URL مضاف بمتغيرات السيرفر (Railway) عشان الرابط يوصل بالإيميل.", "Add STOREFRONT_URL to the server's variables (Railway) so the link can go in the email."),
  SEND_FAILED: tr("مزوّد الإيميل رفض الرسالة. يرجى مراجعة إعدادات Resend.", "The email provider refused the message. Check the Resend settings."),
  TICKET_NOT_FOUND: tr("ما في تذكرة بهالكود.", "No ticket has this code."),
  BAD_CODE: tr("كود التذكرة 8 حروف/أرقام (مثل ABCD-2345).", "A ticket code is 8 letters/digits (like ABCD-2345)."),
  ALREADY_USED: tr("هالتذكرة انستخدمت من قبل.", "This ticket was already used."),
  TICKET_CANCELLED: tr("هالتذكرة ملغية (الطلب انلغى).", "This ticket is cancelled (the order was cancelled)."),
  NOT_USED: tr("هالتذكرة مش مسجّلة دخول.", "This ticket isn't checked in."),
};

export function getApiErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Unknown error";

  const ax = err as AxiosError<any>;
  const data = ax.response?.data;

  const code = typeof (data as any)?.error === "string" ? (data as any).error : "";
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  // Common validation shapes: { errors: [...] } or { errors: { field: [..] } }
  const errors = (data as any)?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join(" | ");
  }
  if (errors && typeof errors === "object") {
    const parts: string[] = [];
    Object.keys(errors).forEach((k) => {
      const val = (errors as any)[k];
      if (Array.isArray(val)) {
        parts.push(`${k}: ${val.join(", ")}`);
      } else if (typeof val === "string") {
        parts.push(`${k}: ${val}`);
      }
    });
    if (parts.length) return parts.join(" | ");
  }

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof ax.message === "string") return ax.message;

  return "Request failed";
}
