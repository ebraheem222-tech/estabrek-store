// "جرّب طلب" and "الوثائق" on the API page: a request put together from the form, as the outside
// would send it, and the small things the two panels say. Apart from the panels so they can be tested.
import type { Lang } from "../../api/data.api";
import type { Act, ApiTable } from "../../api/dataApi.api";
import { sampleValue } from "./apiText";

/** What can be tried: reading is a page of rows or one row. */
export type PlayAct = "list" | "one" | "create" | "update" | "delete";
export const PLAY_ACTS: PlayAct[] = ["list", "one", "create", "update", "delete"];
export const PLAY_NAME: Record<PlayAct, string> = {
  list: "صفحة سطور|A page of rows|עמוד שורות",
  one: "سطر واحد|One row|שורה אחת",
  create: "سطر جديد|A new row|שורה חדשה",
  update: "تعديل سطر|Change a row|שינוי שורה",
  delete: "حذف سطر|Delete a row|מחיקת שורה",
};
const ACT_OF: Record<PlayAct, Act> = { list: "read", one: "read", create: "create", update: "update", delete: "delete" };
const METHOD: Record<PlayAct, "GET" | "POST" | "PATCH" | "DELETE"> = { list: "GET", one: "GET", create: "POST", update: "PATCH", delete: "DELETE" };
export const actOf = (act: PlayAct): Act => ACT_OF[act];
export const methodOf = (act: PlayAct) => METHOD[act];
export const needsRow = (act: PlayAct) => act === "one" || act === "update" || act === "delete";
export const needsBody = (act: PlayAct) => act === "create" || act === "update";
export const writes = (act: PlayAct) => act !== "list" && act !== "one";

const part = (words: string, lang: Lang) => {
  const [ar, en, he] = words.split("|");
  return { ar, en: en ?? ar, he: he ?? en ?? ar }[lang];
};

/** The tables that can be tried (a closed one has nothing to call), and what each lets the outside do. */
export const playTables = (tables: ApiTable[]) => tables.filter((t) => t.open);
export const playActs = (table: Pick<ApiTable, "access">): PlayAct[] => PLAY_ACTS.filter((act) => table.access[ACT_OF[act]] !== "off");
/** Does this need a key, for this table? */
export const keyNeeded = (table: Pick<ApiTable, "access">, act: PlayAct) => table.access[ACT_OF[act]] === "key";
/** Is this a signed-in shopper's, for this table (their token gets in, or a key)? */
export const shopperNeeded = (table: Pick<ApiTable, "access">, act: PlayAct) => table.access[ACT_OF[act]] === "customer";
/** Has the table an act that is a shopper's (so trying it as one says something)? */
export const shopperMatters = (table: Pick<ApiTable, "access">) => Object.values(table.access).includes("customer");

/** A body to start from: the fields a row needs (or the first two), with a value of each one's kind. */
export function sampleBody(table: Pick<ApiTable, "fields">): string {
  // (A computed field is never written.)
  const written = table.fields.filter((f) => f.type !== "formula" && f.type !== "rollup");
  const wanted = written.filter((f) => f.required);
  const shown = (wanted.length ? wanted : written.slice(0, 2)).slice(0, 4);
  return JSON.stringify({ values: Object.fromEntries(shown.map((f) => [f.id, sampleValue(f)])) }, null, 2);
}

export type PlayDraft = { act: PlayAct; /** A row's id or address. */ row: string; /** What comes after "?" in a list's address. */ query: string; /** JSON. */ body: string; key: string; /** A signed-in shopper's token, to try as one. */ token?: string };
export type PlayRequest = { method: string; url: string; headers: Record<string, string>; body?: string };

/** The request the form describes, or what's missing from it. */
export function playRequest(table: Pick<ApiTable, "slug" | "access">, draft: PlayDraft, url: string, lang: Lang): { request: PlayRequest } | { problem: string } {
  const key = draft.key.trim();
  const token = (draft.token ?? "").trim();
  if (keyNeeded(table, draft.act) && !key) return { problem: part("هالطلب بدو مفتاح: الصق مفتاح من مفاتيحك|This needs a key: paste one of your keys|לבקשה הזו נדרש מפתח: הדביקו אחד מהמפתחות", lang) };
  if (shopperNeeded(table, draft.act) && !key && !token) return { problem: part("هالطلب للزبون المسجّل دخوله: الصق توكن زبون، أو مفتاح|This is a signed-in shopper's: paste a shopper's token, or a key|הבקשה הזו של לקוח מחובר: הדביקו אסימון לקוח, או מפתח", lang) };
  const row = draft.row.trim();
  if (needsRow(draft.act) && !row) return { problem: part("اكتب عنوان السطر أو رقمه|Write the row's address or id|כתבו את כתובת השורה או המזהה", lang) };
  let body: string | undefined;
  if (needsBody(draft.act)) {
    try {
      const parsed: unknown = JSON.parse(draft.body);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      body = JSON.stringify(parsed);
    } catch {
      return { problem: part('القيم لازم تكون JSON، متل {"values": {…}}|The values have to be JSON, like {"values": {…}}|הערכים חייבים להיות JSON, כמו {"values": {…}}', lang) };
    }
  }
  const query = draft.act === "list" ? draft.query.trim().replace(/^\?/, "") : "";
  const at = `${url}/${table.slug}${needsRow(draft.act) ? `/${encodeURIComponent(row)}` : ""}${query ? `?${query}` : ""}`;
  return { request: { method: METHOD[draft.act], url: at, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(key ? { "X-Api-Key": key } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body } : {}) } };
}

/** The same request for a terminal; neither the key nor a shopper's token is written out. */
export function curlOf(request: PlayRequest): string {
  const headers = Object.entries(request.headers).map(([name, value]) => ` -H "${name}: ${name === "X-Api-Key" ? "ek_…" : name === "Authorization" ? "Bearer SHOPPER_TOKEN" : value}"`);
  return `curl${request.method === "GET" ? "" : ` -X ${request.method}`} "${request.url}"${headers.join("")}${request.body ? ` -d '${request.body.replace(/'/g, "'\\''")}'` : ""}`;
}

/** An answer's body, laid out to read when it is JSON. */
export function prettyBody(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** What a status says, in a word. */
export function statusWords(status: number, lang: Lang): string {
  if (status >= 200 && status < 300) return part("تمام|OK|תקין", lang);
  if (status === 400) return part("الطلب أو القيم فيها غلط|The request or its values are wrong|הבקשה או הערכים שגויים", lang);
  if (status === 401) return part("بدو مفتاح أو دخول زبون، أو اللي انبعت ما بيشتغل|A key or a signed-in shopper is needed, or what was sent doesn't work|נדרש מפתח או לקוח מחובר, או שמה שנשלח לא עובד", lang);
  if (status === 403) return part("مش مسموح: الجدول مش مفتوح لهالشي أو المفتاح ما بيوصله|Not allowed: the table isn't open for this, or the key doesn't reach it|אסור: הטבלה לא פתוחה לזה או שהמפתח לא מגיע אליה", lang);
  if (status === 404) return part("ما في جدول أو سطر هيك|No such table or row|אין טבלה או שורה כזו", lang);
  if (status === 409) return part("العنوان مستعمل، أو في سطور ماسكة هالسطر|The address is taken, or other rows hold this one|הכתובת תפוסה, או ששורות אחרות מחזיקות בשורה", lang);
  if (status === 429) return part("طلبات كتير: استنى شوي|Too many requests: wait a little|יותר מדי בקשות: המתינו מעט", lang);
  return part("السيرفر ما قدر يجاوب|The server couldn't answer|השרת לא הצליח לענות", lang);
}

/** A document to keep: the OpenAPI as the server made it, with the API's whole address in it. */
export function openApiFile(openapi: unknown, url: string): string {
  const doc = openapi && typeof openapi === "object" ? (openapi as Record<string, unknown>) : {};
  return `${JSON.stringify({ ...doc, servers: [{ url }] }, null, 2)}\n`;
}
