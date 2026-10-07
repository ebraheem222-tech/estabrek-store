// src/api/http.ts
import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { AxiosInstance } from "axios";
import { env } from "../config/env";
import { ENDPOINTS } from "./endpoints";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "../lib/storage";

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
  NO_PRODUCT: "اربطي القطعة اللي لقيتيها أول، بعدين خبّريها.",
  AI_KEY_MISSING: "لازم تضيف مفتاح OPENAI_API_KEY بالسيرفر (Railway) أول.",
  AI_FAILED: "الذكاء الاصطناعي ما جاوب هالمرة. جرّب كمان شوي.",
  AI_OFF: "الذكاء الاصطناعي مش مضبوط بالسيرفر.",
  CLOUDINARY_NOT_CONFIGURED: "لازم Cloudinary يكون مضبوط بالسيرفر.",
  BAD_IMAGE: "ما قدرنا نفتح الصورة.",
  NOT_ENOUGH_QUESTIONS: "ما في أسئلة موافق عليها كفاية. وافق على أسئلة أكثر أو قلّل عدد الأسئلة.",
  COUPON_PHONE: "هالكوبون لرقم هاتف تاني.",
  PRODUCT_NOT_FOUND: "القطعة مش موجودة.",
  FEATURE_OFF: "هالميزة مطفية. شغّليها من صفحتها أو من الميزات.",
  KIND_OFF: "هالنوع من الطلبات مطفي.",
  TOO_MANY_REQUESTS: "طلبات كتير بوقت قصير. استني شوي وجربي.",
  PHOTO_TOO_BIG: "الصورة أكبر من 8MB.",
  BAD_PHOTO: "ما قدرنا نقرأ الصورة.",
  PERMISSION_DENIED: "ما عندك صلاحية لهالعملية. اطلب من صاحب المتجر.",
  ACCOUNT_SUSPENDED: "هذا الحساب موقوف. تواصل مع صاحب المتجر.",
  ACCOUNT_NOT_FOUND: "الحساب غير موجود.",
  CANNOT_GRANT: "بتقدر تعطي بس الصلاحيات اللي عندك أنت.",
  OWN_ROLE: "ما بتقدر تعدّل الدور تبعك أنت.",
  SELF_CHANGE: "حسابك أنت بتعدّله من صفحة الملف الشخصي.",
  OWNERS_ONLY: "هاي العملية لصاحب المتجر بس.",
  LAST_OWNER: "لازم يضل صاحب متجر واحد فعّال على الأقل.",
  ROLE_IN_USE: "في أعضاء على هالدور. انقلهم لدور ثاني أول.",
  ROLE_NAME_TAKEN: "في دور بنفس الاسم.",
  ROLE_REQUIRED: "اختر دور للعضو.",
  ROLE_NOT_FOUND: "الدور مش موجود.",
  EMAIL_TAKEN: "هذا الإيميل إله حساب من قبل.",
  USE_SUSPEND: "هذا العضو انضم. أوقف الحساب بدل الحذف.",
  USE_REMOVE: "الدعوة ما انستخدمت. احذفها بدل الإيقاف.",
  SUSPENDED: "الحساب موقوف. شغّله أول.",
  MFA_SETUP_REQUIRED: "لازم تفعّل التحقق بخطوتين لحسابك أول.",
  MFA_REQUIRED_BY_POLICY: "قواعد الأمان بالمتجر بتطلب التحقق بخطوتين لهذا الحساب، فما بينطفى.",
  ENABLE_2FA_FIRST: "فعّل التحقق بخطوتين لحسابك أنت أول، بعدين اطلبه من الباقي.",
  BLOCKS_YOUR_IP: "هالقائمة بتحظر الـ IP تبعك أنت، فرح تنقفل برّا لوحة الإدارة. شيله من القائمة.",
  NOT_IN_ALLOWLIST: "الـ IP تبعك مش بقائمة المسموح، فرح تنقفل برّا لوحة الإدارة. ضيفه للقائمة.",
  RATE_LIMIT: "طلبات كثيرة بوقت قصير. استنى شوي وجرّب كمان مرة.",
  // Digital products and tickets
  FILE_TOO_BIG: "الملف أكبر من المسموح للرفع. ضيفيه كرابط (مثلاً Google Drive) بدل الرفع.",
  FILE_TYPE_BLOCKED: "هالنوع من الملفات ممنوع يتباع كتنزيل (برامج وسكربتات).",
  STORAGE_NOT_READY: "تخزين الملفات (Cloudinary) مش مضبوط بالسيرفر.",
  NO_FILE: "اختاري ملف.",
  NOTHING_TO_DELIVER: "ما في بهالطلب منتجات رقمية أو حجوزات.",
  ORDER_CLOSED: "الطلب ملغي أو مرفوض أو مسترجع.",
  NOT_RELEASED: "الملفات/التذاكر لسا ما انسلّمت. اقبلي الطلب أو سلّميها يدوياً.",
  NO_EMAIL: "ما في إيميل على هالطلب. اكتبيه أول.",
  NO_STOREFRONT_URL: "لازم تضيف STOREFRONT_URL بمتغيرات السيرفر (Railway) عشان الرابط يوصل بالإيميل.",
  SEND_FAILED: "مزوّد الإيميل رفض الرسالة. تأكدي من إعدادات Resend.",
  TICKET_NOT_FOUND: "ما في تذكرة بهالكود.",
  BAD_CODE: "كود التذكرة 8 حروف/أرقام (مثل ABCD-2345).",
  ALREADY_USED: "هالتذكرة انستخدمت من قبل.",
  TICKET_CANCELLED: "هالتذكرة ملغية (الطلب انلغى).",
  NOT_USED: "هالتذكرة مش مسجّلة دخول.",
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
