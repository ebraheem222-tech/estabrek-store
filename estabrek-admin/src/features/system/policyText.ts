// Plain-Arabic labels and small helpers for the security rules page. Pure (tested).
import type { SecurityPolicy } from "../../api/system.api";

export const FIELD_LABELS: Record<string, string> = {
  "login.maxFailed": "محاولات الدخول الغلط قبل القفل",
  "login.lockMinutes": "مدة القفل",
  "session.lifetimeDays": "أقصى مدة للجلسة",
  "session.idleHours": "تسجيل خروج الجهاز غير المستخدم",
  "session.accessMinutes": "صلاحية رمز الدخول",
  "twoFactor.required": "التحقق بخطوتين",
  "otp.ttlMinutes": "صلاحية كود الـ SMS",
  "otp.maxAttempts": "محاولات الكود",
  "alerts.newDevice": "تنبيه الدخول من جهاز جديد",
  "rateLimit.windowSeconds": "نافذة العدّ",
  "rateLimit.perPath": "طلبات لنفس الرابط",
  "rateLimit.perIp": "كل الطلبات من IP واحد",
  "rateLimit.authWindowSeconds": "نافذة عدّ الدخول",
  "rateLimit.auth": "محاولات الدخول من IP واحد",
  "ip.adminAllow": "IPs المسموح لها بلوحة الإدارة",
  "ip.adminBlock": "IPs ممنوعة من لوحة الإدارة",
  "ip.siteBlock": "IPs ممنوعة من كل الموقع",
  "pressure.mode": "حماية الضغط (الوضع)",
  "pressure.halfLifeSeconds": "سرعة هدوء الضغط",
  "pressure.capacity": "سعة التحمّل",
  "pressure.slowAt": "بداية التبطيء",
  "pressure.blockAt": "حد الحظر",
  "pressure.blockMinutes": "مدة الحظر الأولى",
  "pressure.maxBlockHours": "أقصى مدة حظر",
  "pressure.weightRead": "وزن فتح صفحة",
  "pressure.weightWrite": "وزن تعديل/طلب",
  "pressure.weightAuth": "وزن محاولة دخول",
  "pressure.weightFail": "وزن الطلب الفاشل",
  "pressure.allow": "IPs ما بتنحسب",
};

export function describeChanged(changed: string[]): string {
  if (!changed.length) return "بدون تغيير";
  const names = changed.map((k) => FIELD_LABELS[k] ?? k);
  return names.length > 3 ? `${names.slice(0, 3).join("، ")} و${names.length - 3} غيرها` : names.join("، ");
}

/** One rule per line (commas also work), trimmed, without repeats. */
export function parseIpLines(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/[\n,]+/)) {
    const v = part.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

export function ipLines(list: string[]): string {
  return list.join("\n");
}

/** Only the sections that differ, ready to send. */
export function policyPatch(draft: SecurityPolicy, saved: SecurityPolicy): Partial<SecurityPolicy> {
  const out: Partial<SecurityPolicy> = {};
  for (const key of Object.keys(draft) as Array<keyof SecurityPolicy>) {
    if (JSON.stringify(draft[key]) !== JSON.stringify(saved[key])) (out as any)[key] = draft[key];
  }
  return out;
}

/** Field paths whose value is outside its allowed range. */
export function outOfRange(draft: SecurityPolicy, limits: Record<string, { min: number; max: number }>): string[] {
  const bad: string[] = [];
  for (const [path, { min, max }] of Object.entries(limits)) {
    const [section, field] = path.split(".");
    const v = (draft as any)[section]?.[field];
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) bad.push(path);
  }
  return bad;
}

/** "15 دقيقة" / "ساعتين" / "3 أيام" style, for hints. */
export function humanMinutes(mins: number): string {
  if (mins < 60) return `${mins} دقيقة`;
  if (mins < 1440) {
    const h = Math.round(mins / 60);
    return h === 1 ? "ساعة" : h === 2 ? "ساعتين" : `${h} ساعات`;
  }
  const d = Math.round(mins / 1440);
  return d === 1 ? "يوم" : d === 2 ? "يومين" : `${d} أيام`;
}

export const ALERT_TEXT: Record<string, string> = {
  NEW_DEVICE_LOGIN: "دخول من جهاز أو مكان جديد",
  ACCOUNT_LOCKED: "انقفل الحساب (محاولات غلط كثيرة)",
  LOGIN_FAILURE: "محاولة دخول بكلمة مرور غلط",
};

/** "login.maxFailed"-style paths whose value differs. */
export function changedPaths(draft: SecurityPolicy, saved: SecurityPolicy): string[] {
  const out: string[] = [];
  for (const key of Object.keys(draft) as Array<keyof SecurityPolicy>) {
    const a = draft[key] as Record<string, unknown>;
    const b = saved[key] as Record<string, unknown>;
    for (const f of Object.keys(a)) if (JSON.stringify(a[f]) !== JSON.stringify(b?.[f])) out.push(`${key}.${f}`);
  }
  return out;
}
