/**
 * What a team member may do in the admin. Owners (role SUPERADMIN) have all of
 * them; team members (role STAFF) get the ones their StaffRole lists.
 *
 * The keys match the admin app (src/lib/authz.ts there), so the same names hide
 * menu items and pages on the client and are enforced here.
 */

export const PERMISSION_GROUPS = [
  { key: "dashboard", label: "لوحة التحكم", permissions: [{ key: "dashboard:read", label: "مشاهدة الأرقام" }] },
  {
    key: "orders",
    label: "الطلبات",
    permissions: [
      { key: "orders:read", label: "مشاهدة الطلبات" },
      { key: "orders:write", label: "تغيير حالة الطلبات وتعديلها" },
    ],
  },
  {
    key: "customers",
    label: "الزبائن",
    permissions: [
      { key: "customers:read", label: "مشاهدة الحسابات وطلباتها" },
      { key: "customers:write", label: "إيقاف وتشغيل الحسابات" },
    ],
  },
  {
    key: "catalog",
    label: "المنتجات والتصنيفات",
    permissions: [
      { key: "catalog:read", label: "مشاهدة" },
      { key: "catalog:write", label: "إضافة وتعديل وحذف" },
    ],
  },
  {
    key: "inventory",
    label: "المخزون",
    permissions: [
      { key: "inventory:read", label: "مشاهدة الكميات" },
      { key: "inventory:write", label: "تعديل الكميات" },
    ],
  },
  {
    key: "discounts",
    label: "الكوبونات",
    permissions: [
      { key: "discounts:read", label: "مشاهدة" },
      { key: "discounts:write", label: "إضافة وتعديل" },
    ],
  },
  {
    key: "ugc",
    label: "التقييمات والتعليقات",
    permissions: [
      { key: "ugc:read", label: "مشاهدة" },
      { key: "ugc:write", label: "قبول ورفض وحذف" },
    ],
  },
  {
    key: "pages",
    label: "الصفحات",
    permissions: [
      { key: "pages:read", label: "مشاهدة" },
      { key: "pages:write", label: "تعديل المسودات" },
      { key: "pages:publish", label: "نشر على الموقع" },
    ],
  },
  {
    key: "nav",
    label: "القوائم",
    permissions: [
      { key: "nav:read", label: "مشاهدة" },
      { key: "nav:write", label: "تعديل" },
    ],
  },
  {
    key: "media",
    label: "الوسائط",
    permissions: [
      { key: "media:read", label: "مشاهدة" },
      { key: "media:write", label: "رفع وحذف" },
    ],
  },
  {
    key: "chatbot",
    label: "مساعد المتجر",
    permissions: [
      { key: "chatbot:read", label: "مشاهدة" },
      { key: "chatbot:write", label: "تعديل الإجابات" },
    ],
  },
  {
    key: "outbox",
    label: "الرسائل الصادرة",
    permissions: [
      { key: "outbox:read", label: "مشاهدة" },
      { key: "outbox:write", label: "إعادة الإرسال" },
    ],
  },
  {
    key: "settings",
    label: "الإعدادات",
    permissions: [
      { key: "settings:read", label: "مشاهدة" },
      { key: "settings:write", label: "تعديل" },
      { key: "payments:write", label: "مفاتيح الدفع (Stripe و PayPal)" },
    ],
  },
  {
    key: "staff",
    label: "الفريق",
    permissions: [
      { key: "staff:read", label: "مشاهدة الفريق والأدوار" },
      { key: "staff:write", label: "دعوة أعضاء وتعديل الأدوار" },
      { key: "activity:read", label: "سجل نشاط الجميع" },
    ],
  },
  {
    key: "system",
    label: "حماية السيرفر",
    permissions: [
      { key: "system:read", label: "مشاهدة قواعد الأمان والتنبيهات" },
      { key: "system:write", label: "تغيير قواعد الأمان وقوائم IP" },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

const PERMISSION_SET = new Set<string>(ALL_PERMISSIONS);

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && PERMISSION_SET.has(value);
}

/** Known keys only, without repeats, in catalogue order. */
export function cleanPermissions(values: unknown): Permission[] {
  const wanted = new Set(Array.isArray(values) ? values.filter(isPermission) : []);
  return ALL_PERMISSIONS.filter((p) => wanted.has(p));
}

/**
 * Every signed-in member can see and change their own account (profile, password,
 * two-step login, own sessions). These are not part of a role.
 */
export const OWN_ACCOUNT_PERMISSIONS = [
  "account:read",
  "account:write",
  "security:read",
  "security:write",
  "audit:read",
] as const;
