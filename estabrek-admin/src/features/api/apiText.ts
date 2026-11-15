// الـ API والمفاتيح: the page's words and small sums, apart from the page so they can be tested.
// Words are written in the three languages side by side ("عربي|English|עברית") and said by `say`.
import type { Lang } from "../../api/data.api";
import type { Local } from "../../api/collections.api";
import type { Act, ApiField, ApiKey, ApiTable, KeyBody, KeyState, Scopes, TableAccess, Who } from "../../api/dataApi.api";

export const ACTS: Act[] = ["read", "create", "update", "delete"];
export const ACT_NAME: Record<Act, string> = { read: "القراءة|Reading|קריאה", create: "الإضافة|Adding|הוספה", update: "التعديل|Changing|עריכה", delete: "الحذف|Deleting|מחיקה" };
/** The same acts as a key's rights ("may read"). */
export const ACT_RIGHT: Record<Act, string> = { read: "يقرأ|read|לקרוא", create: "يضيف|add|להוסיף", update: "يعدّل|change|לערוך", delete: "يحذف|delete|למחוק" };
export const WHO_NAME: Record<Who, string> = { off: "مسكّر|Closed|סגור", key: "بمفتاح|With a key|עם מפתח", public: "للجميع|Everyone|לכולם" };
export const STATE: Record<KeyState, { name: string; variant: "success" | "danger" | "warning" }> = {
  active: { name: "شغّال|Active|פעיל", variant: "success" },
  revoked: { name: "ملغي|Revoked|בוטל", variant: "danger" },
  expired: { name: "خلصت مدته|Expired|פג תוקף", variant: "warning" },
};

const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};

/** Who can be chosen for an act: changing and deleting are never for everyone. */
export const whoChoices = (act: Act): Who[] => (act === "read" || act === "create" ? ["off", "key", "public"] : ["off", "key"]);

export const nameOf = (name: Local | null | undefined, fallback: string, lang: Lang): string => name?.[lang]?.trim() || name?.ar?.trim() || name?.en?.trim() || name?.he?.trim() || fallback;

/** What the outside can do with a table, in a line. */
export function accessLine(access: TableAccess, lang: Lang): string {
  const open = ACTS.filter((act) => access[act] !== "off");
  if (!open.length) return part("مسكّر: ما حدا من برّا بيوصله|Closed: nothing outside reaches it|סגור: שום דבר מבחוץ לא מגיע אליה", lang);
  return open.map((act) => `${part(ACT_NAME[act], lang)}: ${part(WHO_NAME[access[act]], lang)}`).join(" · ");
}

/** What the owner should know before leaving a table like this. */
export function accessWarnings(access: TableAccess, limits: { publicWritesPerMinute: number }, lang: Lang): string[] {
  const out: string[] = [];
  if (access.read === "public") out.push(part("أي حدا بيقدر يقرأ كل حقول السطور المنشورة بهالجدول، بدون مفتاح.|Anyone can read every field of this table's published rows, without a key.|כל אחד יכול לקרוא את כל השדות של השורות שפורסמו בטבלה, בלי מפתח.", lang));
  if (access.create === "public")
    out.push(
      part("أي حدا بيقدر يضيف سطور بدون مفتاح. بتنزل مسودات، ولحد {n} بالدقيقة من نفس المكان.|Anyone can add rows without a key. They arrive as drafts, up to {n} a minute from one place.|כל אחד יכול להוסיף שורות בלי מפתח. הן נכנסות כטיוטות, עד {n} בדקה מאותו מקום.", lang).replace("{n}", String(limits.publicWritesPerMinute)),
    );
  return out;
}

/** What a key reaches, in a line: "كل الجداول: يقرأ، يضيف". */
export function scopesLine(scopes: Scopes, tables: Array<Pick<ApiTable, "id" | "slug" | "name">>, lang: Lang): string {
  const acts = ACTS.filter((a) => scopes.acts.includes(a)).map((a) => part(ACT_RIGHT[a], lang)).join(lang === "en" ? ", " : "، ");
  if (scopes.tables === "*") return `${part("كل الجداول|Every table|כל הטבלאות", lang)}: ${acts}`;
  const known = scopes.tables.map((id) => tables.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  const gone = scopes.tables.length - known.length;
  const names = known.map((t) => nameOf(t.name, t.slug, lang));
  if (gone) names.push(part("جدول انحذف|a deleted table|טבלה שנמחקה", lang) + (gone > 1 ? ` ×${gone}` : ""));
  return `${names.join(lang === "en" ? ", " : "، ") || part("ولا جدول|No table|אף טבלה", lang)}: ${acts}`;
}

/** The whole address of the routes: the server's own address and where they start on it. */
export function fullUrl(base: string, apiBase: string, origin: string): string {
  try {
    return new URL(base, new URL(apiBase, origin)).href.replace(/\/$/, "");
  } catch {
    return base;
  }
}

/* ---------------- "How to call it" ---------------- */

/** A value to show in an example, as its kind of field takes it. */
export function sampleValue(f: ApiField): unknown {
  switch (f.type) {
    case "text":
    case "longText":
      return "…";
    case "number":
    case "money":
      return 10;
    case "boolean":
      return true;
    case "date":
      return "2026-12-31";
    case "datetime":
      return "2026-12-31T10:00";
    case "select":
      return f.options?.[0]?.id ?? "…";
    case "multiSelect":
      return f.options?.[0] ? [f.options[0].id] : [];
    case "email":
      return "name@example.com";
    case "phone":
      return "+970599000001";
    case "color":
      return "#c86b98";
    case "json":
      return {};
    case "location":
      return { lat: 31.77, lng: 35.21 };
    case "relation":
      return ["row-address"];
    default:
      return "https://example.com/file";
  }
}

export type Example = { id: Act | "one"; title: string; code: string };
const KEY_HEADER = '-H "X-Api-Key: ek_…"';

/** Ready requests for what the table lets the outside do (a key's header where one is needed). */
export function examples(table: Pick<ApiTable, "slug" | "access" | "fields">, url: string, lang: Lang): Example[] {
  const at = `${url}/${table.slug}`;
  const key = (act: Act) => (table.access[act] === "key" ? ` ${KEY_HEADER}` : "");
  // The required fields, or the first two: enough for a row the table takes.
  const wanted = table.fields.filter((f) => f.required);
  const shown = (wanted.length ? wanted : table.fields.slice(0, 2)).slice(0, 4);
  const values = JSON.stringify({ values: Object.fromEntries(shown.map((f) => [f.id, sampleValue(f)])) });
  const first = table.fields.find((f) => f.type !== "relation") ?? table.fields[0];
  const out: Example[] = [];
  if (table.access.read !== "off") {
    out.push({ id: "read", title: part("صفحة سطور (فلترة وترتيب من العنوان)|A page of rows (filtered and sorted from the address)|עמוד שורות (סינון ומיון מהכתובת)", lang), code: `curl "${at}?pageSize=10&sort=-createdAt${first ? `&${first.id}[notEmpty]=1` : ""}"${key("read")}` });
    out.push({ id: "one", title: part("سطر واحد، بعنوانه أو برقمه|One row, by its address or id|שורה אחת, לפי הכתובת או המזהה", lang), code: `curl "${at}/row-address"${key("read")}` });
  }
  if (table.access.create !== "off") out.push({ id: "create", title: part("سطر جديد|A new row|שורה חדשה", lang), code: `curl -X POST "${at}" -H "Content-Type: application/json"${key("create")} -d '${values}'` });
  if (table.access.update !== "off") out.push({ id: "update", title: part("تعديل بعض قيم سطر|Change some of a row|שינוי חלק מהשורה", lang), code: `curl -X PATCH "${at}/row-address" -H "Content-Type: application/json"${key("update")} -d '${values}'` });
  if (table.access.delete !== "off") out.push({ id: "delete", title: part("حذف سطر (بيروح عالسلة)|Delete a row (it goes to the trash)|מחיקת שורה (עוברת לסל)", lang), code: `curl -X DELETE "${at}/row-address"${key("delete")}` });
  return out;
}

/* ---------------- A key's form ---------------- */

export type KeyDraft = { name: string; all: boolean; tables: string[]; acts: Act[]; perMinute: string; /** A day like 2026-12-31, or "" = never. */ expires: string };

export const newDraft = (limits: { perMinute: { default: number } }): KeyDraft => ({ name: "", all: true, tables: [], acts: ["read"], perMinute: String(limits.perMinute.default), expires: "" });
export const draftOf = (key: Pick<ApiKey, "name" | "scopes" | "perMinute" | "expiresAt">): KeyDraft => ({
  name: key.name,
  all: key.scopes.tables === "*",
  tables: key.scopes.tables === "*" ? [] : [...key.scopes.tables],
  acts: ACTS.filter((a) => key.scopes.acts.includes(a)),
  perMinute: String(key.perMinute),
  expires: key.expiresAt ? key.expiresAt.slice(0, 10) : "",
});

/** What's wrong with the form, or null when it can be saved. */
export function draftProblem(d: KeyDraft, limits: { name: number; perMinute: { min: number; max: number } }, today: string, lang: Lang): string | null {
  if (!d.name.trim()) return part("اكتب إسم للمفتاح (مثلاً: برنامج المحاسبة)|Give the key a name (the accounting program, say)|תנו שם למפתח (למשל: תוכנת הנהלת החשבונות)", lang);
  if (d.name.trim().length > limits.name) return part("الإسم طويل|The name is too long|השם ארוך מדי", lang);
  if (!d.acts.length) return part("اختار شو بيقدر يعمل المفتاح|Choose what the key may do|בחרו מה המפתח רשאי לעשות", lang);
  if (!d.all && !d.tables.length) return part("اختار جدول واحد عالأقل، أو «كل الجداول»|Choose at least one table, or every table|בחרו טבלה אחת לפחות, או את כל הטבלאות", lang);
  const n = Number(d.perMinute);
  if (!Number.isInteger(n) || n < limits.perMinute.min || n > limits.perMinute.max)
    return part("عدد الطلبات بالدقيقة: رقم من {a} لـ {b}|Requests a minute: a number from {a} to {b}|בקשות בדקה: מספר מ-{a} עד {b}", lang).replace("{a}", String(limits.perMinute.min)).replace("{b}", String(limits.perMinute.max));
  if (d.expires && d.expires <= today) return part("يوم انتهاء المفتاح لازم يكون بعد اليوم|The day the key ends has to be after today|יום סיום המפתח חייב להיות אחרי היום", lang);
  return null;
}

export const draftBody = (d: KeyDraft): KeyBody => ({ name: d.name.trim(), scopes: { tables: d.all ? "*" : d.tables, acts: ACTS.filter((a) => d.acts.includes(a)) }, perMinute: Number(d.perMinute), expiresAt: d.expires || null });

/** "قبل 5 دقايق" in the three languages, for when a key was last used. */
export function agoWords(iso: string | null, now: number, lang: Lang): string {
  if (!iso) return part("لسا ما انستعمل|Never used|עוד לא נעשה בו שימוש", lang);
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (!Number.isFinite(s)) return "";
  if (s < 90) return part("هلّق|Just now|ממש עכשיו", lang);
  const [n, unit] = s < 3600 ? [Math.round(s / 60), "دقيقة|min|דק׳"] : s < 86_400 ? [Math.round(s / 3600), "ساعة|h|שע׳"] : [Math.round(s / 86_400), "يوم|d|ימים"];
  return part("قبل {n} {u}|{n} {u} ago|לפני {n} {u}", lang).replace("{n}", String(n)).replace("{u}", part(unit, lang));
}
