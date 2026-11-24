// الاتصالات والأسرار (F5): what the owner's functions may reach outside the store.
// - Ready connections: a service connected once (Telegram, Slack, Google Sheets), which a step then picks from
//   a menu. No address and no key is written in a function.
// - The sites a function's "call a site" step may call. Nothing else is called.
// - The keys of outside services. A key is written here and never shown again: a step names it
//   ({{secret.TELEGRAM_TOKEN}}) and the server puts it into the request, only to the sites it is for.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as API from "../../api/connections.api";
import type { Connections, Ready, ReadyKind, ReadyLook, ReadyTry, Secret } from "../../api/connections.api";
import { failText } from "../functions/fnText";
import { choiceName, keyFileAccount, keyLooks, keyName, kindHow, kindName, settingHint, settingName } from "./readyText";
import { LookView } from "./LookView";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const note = "text-xs text-white/70";

/** What a setting should be, by where the server says it isn't ("settings.base"). */
const SETTING_SAID: Record<string, string> = {
  "settings.base": "العنوان الأساسي لازم يكون https:// واسم موقع، بدون ? ولا # ولا رقم منفذ (متل https://erp.example.com/api)|The base address is https:// and a site's name, with no ?, # or port (like https://erp.example.com/api)|הכתובת הבסיסית היא https:// ושם אתר, בלי ?, # או פורט (כמו https://erp.example.com/api)",
  "settings.auth": "اختار طريقة المفتاح من القائمة|Pick how the key is sent from the list|בחר מהרשימה איך המפתח נשלח",
  "settings.header": "اسم الترويسة حروف وأرقام و - بس (متل X-API-Key)|A header's name is letters, digits and - (like X-API-Key)|שם כותרת הוא אותיות, ספרות ו- (כמו X-API-Key)",
  "settings.check": "مسار التجربة بيجي بعد العنوان الأساسي (متل /me)|The path to try comes after the base address (like /me)|נתיב הבדיקה בא אחרי הכתובת הבסיסית (כמו /me)",
  "settings.sheet": "حط رابط الشيت متل ما هو بالمتصفح|Give the sheet's link as the browser shows it|הזן את הקישור לגיליון כפי שהדפדפן מציג אותו",
  "settings.org": "الـ id تبع المنظمة بيبلّش بـ org- (بتلاقيه بـ Organization settings)|An organization's id starts with org- (it is in Organization settings)|המזהה של ארגון מתחיל ב-org- (הוא מופיע ב-Organization settings)",
  "settings.project": "الـ id تبع المشروع حروف وأرقام و - (متل cool-sky-12345678)|A project's id is letters, digits and - (like cool-sky-12345678)|מזהה של פרויקט הוא אותיות, ספרות ו- (כמו cool-sky-12345678)",
  "settings.workspace": "الـ id تبع الـ workspace حروف وأرقام و - بس|A workspace's id is letters, digits and - only|מזהה של workspace הוא רק אותיות, ספרות ו-",
  "settings.team": "الفريق هو الـ id تبعه (team_…) أو الاسم اللي بعنوانه|A team is its id (team_…) or the name in its address|צוות הוא המזהה שלו (team_…) או השם שבכתובת שלו",
  "settings.account": "رقم الحساب 32 حرف ورقم (بتلاقيه بصفحة الحساب الرئيسية)|An Account ID is 32 letters and digits (it is on the account's home page)|Account ID הוא 32 אותיות וספרות (הוא מופיע בעמוד הבית של החשבון)",
};
const SETTING_NEEDED: Record<string, string> = {
  "settings.base": "لازم العنوان الأساسي للنظام (متل https://erp.example.com/api)|The system's base address is needed (like https://erp.example.com/api)|נדרשת הכתובת הבסיסית של המערכת (כמו https://erp.example.com/api)",
};

/** A site as it is typed: small letters, no "https://", nothing after the name. */
export const tidySite = (raw: string) => raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
/** Whether it is a site's name ("api.example.com", or "*.example.com" for every name under it). */
export const siteOk = (host: string) => host.length <= 200 && /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(host);
/** A secret's name as it is typed: capitals, digits and _. */
export const tidySecretName = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+/, "").slice(0, 40);
export const secretNameOk = (name: string) => /^[A-Z][A-Z0-9_]{1,39}$/.test(name);
/** Why the server refused, in the page's words. */
export function refusalText(e: unknown): string {
  const data = (e as { response?: { data?: { error?: string; message?: string; details?: { functions?: string[]; at?: string } } } })?.response?.data;
  // A setting that isn't right: which one, and what it should be.
  if (data?.error === "SETTING_INVALID" && data.details?.at && SETTING_SAID[data.details.at]) {
    const needed = /is needed$/.test(data.message ?? "");
    return say(needed ? (SETTING_NEEDED[data.details.at] ?? SETTING_SAID[data.details.at]) : SETTING_SAID[data.details.at]);
  }
  if (data?.error === "SITE_INVALID") return say("الموقع بينكتب باسمه: api.example.com، أو ‎*.example.com لكل الأسماء تحته|A site is written by its name: api.example.com, or *.example.com for every name under it|אתר נכתב בשמו: api.example.com, או ‎*.example.com לכל השמות שמתחתיו");
  if (data?.error === "SECRET_TAKEN") return say("في سر بهالاسم. غيّر قيمته من سطره|A secret has this name already. Give it a new value on its own line|כבר יש סוד בשם הזה. אפשר לתת לו ערך חדש בשורה שלו");
  if (data?.error === "SECRET_USED") return `${say("في functions بتستعمله:|Functions use it:|פונקציות משתמשות בו:")} ${(data.details?.functions ?? []).join("، ")}`;
  if (data?.error === "CONNECTION_USED") return `${say("في functions بتستعمله:|Functions use it:|פונקציות משתמשות בו:")} ${(data.details?.functions ?? []).join("، ")}`;
  if (data?.error === "CONNECTION_TAKEN") return say("في اتصال بهالاسم. اختار اسم تاني|A connection has this name already. Pick another name|כבר יש חיבור בשם הזה. בחרו שם אחר");
  if (data?.error === "KEY_INVALID") return say("المفتاح مش بالشكل اللي بتعطيه هالخدمة. انسخه متل ما هو، بدون زيادة|The key doesn't look like the one this service gives. Copy it as it is, with nothing added|המפתח לא נראה כמו זה שהשירות הזה נותן. העתיקו אותו כמו שהוא, בלי תוספות");
  if (data?.error === "SETTING_INVALID") return say("الإعداد قيمة قصيرة عادية، بدون {{ }}|A setting is a short plain value, with no {{ }} in it|הגדרה היא ערך קצר ורגיל, בלי {{ }}");
  if (data?.error === "TOO_MANY_CONNECTIONS") return say("وصلت لأكتر عدد من الاتصالات الجاهزة|That is as many ready connections as there can be|זה מספר החיבורים המוכנים המרבי");
  return getApiErrorMessage(e);
}

/** What trying a connection's key came to, in a line. */
export function triedText(out: ReadyTry): string {
  const lang = adminLang();
  if (out.ok) return out.said ? `${say("شغّال:|It works:|עובד:")} ${out.said}` : out.sends ? say("انبعتت رسالة تجربة: شوفها هناك|A test line was sent: look for it there|נשלחה שורת ניסיון: חפשו אותה שם") : say("شغّال|It works|עובד");
  const why = out.why ? failText(out.why, lang) : "";
  // The service's own word for it ("Unauthorized", "no_team") says little: what it means for the owner.
  // Google: the sheet wasn't shared with the service account (or the key can't reach it).
  if (out.status === 403) return `${say("ما زبط|It didn't work|זה לא הצליח")} (403)${why ? `: ${why}.` : "."} ${say("الخدمة رفضت: إذا هاد Google Sheets، شارك الشيت مع إيميل حساب الخدمة كـ Editor.|The service refused: for Google Sheets, share the sheet with the service account's email as an Editor.|השירות סירב: ב-Google Sheets, שתף את הגיליון עם האימייל של חשבון השירות כ-Editor.")}`;
  const unknown = out.status === 401 || out.status === 404 ? ` ${say("الخدمة ما بتعرف هالمفتاح: تأكد إنه منسوخ كامل وما انلغى.|The service doesn't know this key: check that it was copied whole and wasn't revoked.|השירות לא מכיר את המפתח הזה: בדקו שהוא הועתק במלואו ולא בוטל.")}` : "";
  return `${say("ما زبط|It didn't work|זה לא הצליח")}${out.status ? ` (${out.status})` : ""}${why ? `: ${why}.` : "."}${unknown}`;
}

function SitesPick({ sites, value, onChange, disabled, testid }: { sites: string[]; value: string[]; onChange: (next: string[]) => void; disabled?: boolean; testid: string }) {
  return (
    <div className="flex flex-wrap gap-2" data-testid={testid}>
      {sites.map((host) => (
        <label key={host} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-sm">
          <input type="checkbox" checked={value.includes(host)} disabled={disabled} onChange={(e) => onChange(e.target.checked ? [...value, host] : value.filter((h) => h !== host))} data-testid={`${testid}-${host}`} />
          <bdi dir="ltr">{host}</bdi>
        </label>
      ))}
    </div>
  );
}

function SecretRow({ secret, sites, canWrite, busy, onSave, onRemove }: { secret: Secret; sites: string[]; canWrite: boolean; busy: boolean; onSave: (body: { value?: string; sites?: string[] }) => void; onRemove: () => void }) {
  const lang = adminLang();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState(secret.sites);
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB", { dateStyle: "medium", timeStyle: "short" }) : null);
  // A site it was for that is no longer allowed is still shown, so it can be unticked.
  const offered = [...new Set([...sites, ...secret.sites])];
  return (
    <li className="space-y-2 py-3" data-testid={`secret-${secret.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="min-w-0 space-y-0.5">
          <bdi dir="ltr" className="block font-mono text-sm font-medium">
            {secret.name}
          </bdi>
          <div className={note}>
            {say("بيروح بس على:|It goes only to:|נשלח רק אל:")} <bdi dir="ltr">{secret.sites.join(", ")}</bdi>
          </div>
          <div className={note} data-testid={`secret-${secret.name}-used`}>
            {secret.usedBy.length ? `${say("بتستعمله:|Used by:|בשימוש על ידי:")} ${secret.usedBy.join("، ")}` : say("ولا function بتستعمله لسا|No function uses it yet|אף פונקציה עוד לא משתמשת בו")}
            {" · "}
            {secret.lastUsedAt ? `${say("آخر مرة انبعت:|Last sent:|נשלח לאחרונה:")} ${when(secret.lastUsedAt)}` : say("ما انبعت ولا مرة|Never sent|מעולם לא נשלח")}
          </div>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <button type="button" className="underline" onClick={() => setOpen(!open)} data-testid={`secret-${secret.name}-edit`}>
              {say("غيّر قيمته أو مواقعه|Change its value or its sites|שינוי הערך או האתרים")}
            </button>
            <button type="button" className="text-red-300 underline" onClick={onRemove} data-testid={`secret-${secret.name}-remove`}>
              {say("احذفه|Delete it|מחיקה")}
            </button>
          </div>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-2 rounded-xl border border-white/10 p-3">
          <p className={note}>{say("القيمة الموجودة ما بتنعرض لحدا. اكتب قيمة جديدة لتبدّلها، أو اتركها فاضية لتضل متل ما هي.|The value that is kept is shown to nobody. Write a new one to replace it, or leave this empty to keep it.|הערך השמור לא מוצג לאף אחד. כתבו ערך חדש כדי להחליף אותו, או השאירו ריק כדי לשמור עליו.")}</p>
          <input className={`${field} w-full`} type="password" autoComplete="new-password" dir="ltr" value={value} placeholder={say("قيمة جديدة|A new value|ערך חדש")} onChange={(e) => setValue(e.target.value)} data-testid={`secret-${secret.name}-value`} />
          <SitesPick sites={offered} value={picked} onChange={setPicked} testid={`secret-${secret.name}-sites`} />
          <Button
            size="sm"
            variant="secondary"
            isLoading={busy}
            disabled={!picked.length}
            onClick={() => {
              onSave({ ...(value ? { value } : {}), sites: picked });
              setValue("");
              setOpen(false);
            }}
            data-testid={`secret-${secret.name}-save`}
          >
            {say("احفظ|Save|שמירה")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/** A file picked on this device, as its words (a key file is a couple of thousand letters). */
function fileText(file: File): Promise<string> {
  return new Promise((done, fail) => {
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result ?? ""));
    reader.onerror = () => fail(reader.error);
    reader.readAsText(file);
  });
}

/**
 * A connection's key: typed (a token, an address), or for a kind whose key is a file (Google's
 * service account) picked from this device. The file is read here only to say whose it is.
 */
function KeyInput({ kind, value, onChange, placeholder, testid }: { kind: ReadyKind; value: string; onChange: (key: string) => void; placeholder?: string; testid: string }) {
  if (!kind.keyFile)
    return <input className={`${field} min-w-48 flex-1`} type="password" autoComplete="new-password" dir="ltr" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} data-testid={testid} />;
  const account = value ? keyFileAccount(value) : null;
  return (
    <span className="flex min-w-48 flex-1 flex-col items-start gap-1">
      {/* The browser's own picker says its words in its own language: a button in the page's words opens it. */}
      <label className="cursor-pointer rounded-lg border border-white/15 bg-white/[0.07] px-3 py-1.5 text-sm hover:bg-white/12 focus-within:ring-2 focus-within:ring-white/40">
        {value ? say("اختار ملف تاني…|Pick another file…|בחר קובץ אחר…") : say("اختار ملف المفتاح…|Pick the key file…|בחר את קובץ המפתח…")}
        <input
          type="file"
          accept={`${kind.keyFile},application/json`}
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 20_000) return onChange("not a key file");
            onChange((await fileText(file)).trim());
          }}
          data-testid={testid}
        />
      </label>
      {value ? (
        <span className={`text-xs ${account ? "text-emerald-300" : "text-red-300"}`} data-testid={`${testid}-read`}>
          {account ? `${say("انقرأ الملف، حساب الخدمة:|The file was read; the service account:|הקובץ נקרא; חשבון השירות:")} ${account}` : say("هاد مش ملف مفتاح حساب خدمة (JSON من Google Cloud)|This isn't a service account's key file (a JSON from Google Cloud)|זה לא קובץ מפתח של חשבון שירות (JSON מ-Google Cloud)")}
        </span>
      ) : placeholder ? (
        <span className={note}>{placeholder}</span>
      ) : null}
    </span>
  );
}

/** A kind's settings as inputs: each a short plain value. */
function SettingsInputs({ kind, value, onChange, testid }: { kind: ReadyKind; value: Record<string, string>; onChange: (next: Record<string, string>) => void; testid: string }) {
  return (
    <>
      {kind.settings
        // One asked only for a choice of another (a header's name, while the key goes in a header).
        .filter((s) => !s.shownWhen || (value[s.shownWhen[0]] || kind.settings.find((x) => x.id === s.shownWhen![0])?.choices?.[0]) === s.shownWhen[1])
        .map((s) => (
          <label key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-36 shrink-0 text-xs text-white/70">
              {settingName(kind.kind, s.id)}
              {s.required ? " *" : ""}
            </span>
            {s.choices ? (
              <select className={`${field} min-w-48 flex-1`} value={value[s.id] || s.choices[0]} onChange={(e) => onChange({ ...value, [s.id]: e.target.value })} data-testid={`${testid}-${s.id}`}>
                {s.choices.map((c) => (
                  <option key={c} value={c}>
                    {choiceName(kind.kind, s.id, c)}
                  </option>
                ))}
              </select>
            ) : (
              <input className={`${field} min-w-48 flex-1`} dir="ltr" value={value[s.id] ?? ""} maxLength={s.max} placeholder={settingHint(kind.kind, s.id)} onChange={(e) => onChange({ ...value, [s.id]: e.target.value })} data-testid={`${testid}-${s.id}`} />
            )}
          </label>
        ))}
    </>
  );
}

function ReadyRow({ ready, kind, canWrite, busy, onSave, onRemove }: { ready: Ready; kind: ReadyKind | undefined; canWrite: boolean; busy: boolean; onSave: (body: { name?: string; key?: string; settings?: Record<string, string> }) => void; onRemove: () => void }) {
  const lang = adminLang();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(ready.name);
  const [key, setKey] = useState("");
  const [settings, setSettings] = useState(ready.settings);
  const [tried, setTried] = useState<ReadyTry | null>(null);
  const trying = useMutation({
    mutationFn: () => API.tryReady(ready.id, say("✅ المتجر صار موصول بهالقناة.|✅ The store is now connected to this channel.|✅ החנות מחוברת עכשיו לערוץ הזה.")),
    onSuccess: setTried,
    onError: (e) => setTried({ ok: false, status: 0, said: null, why: getApiErrorMessage(e), sends: !!kind?.test.sends }),
  });
  // What is there (a hosting service's projects), read when asked.
  const [seen, setSeen] = useState<ReadyLook | null>(null);
  const looking = useMutation({
    mutationFn: () => API.lookReady(ready.id),
    onSuccess: setSeen,
    onError: (e) => setSeen({ ok: false, status: 0, why: getApiErrorMessage(e), who: null, groups: [], missed: 0 }),
  });
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB", { dateStyle: "medium", timeStyle: "short" }) : null);
  // The kind's own settings in its order; what is worked out from the key on a line of its own (it is something to do).
  const derived = kind?.derived ?? [];
  const order = [...(kind?.settings.map((s) => s.id) ?? []), ...Object.keys(ready.settings)];
  const kept = [...new Set(order)].filter((id) => ready.settings[id] && !derived.includes(id)).map((id) => [id, ready.settings[id]] as const);
  const worked = derived.filter((id) => ready.settings[id]).map((id) => [id, ready.settings[id]] as const);
  const t = `ready-${ready.id}`;
  return (
    <li className="space-y-2 py-3" data-testid={t} data-kind={ready.kind} data-name={ready.name}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs">{kindName(ready.kind, kind?.label)}</span>
            <bdi>{ready.name}</bdi>
          </div>
          {kept.length ? (
            <div className={note}>
              {kept.map(([id, v]) => (
                <span key={id}>
                  {/* A choice by its name ("In a header of yours"), not as it is kept ("header"). */}
                  {settingName(ready.kind, id)}: {kind?.settings.find((s) => s.id === id)?.choices ? choiceName(ready.kind, id, v) : <bdi dir="ltr">{v}</bdi>}{" "}
                </span>
              ))}
            </div>
          ) : null}
          {worked.map(([id, v]) => (
            <div key={id} className="text-xs text-white/90" data-testid={`${t}-${id}`}>
              {settingName(ready.kind, id)}: <bdi className="select-all font-mono" dir="ltr">{v}</bdi>
            </div>
          ))}
          <div className={note} data-testid={`${t}-used`}>
            {ready.usedBy.length ? `${say("بتستعمله:|Used by:|בשימוש על ידי:")} ${ready.usedBy.join("، ")}` : say("ولا function بتستعمله لسا|No function uses it yet|אף פונקציה עוד לא משתמשת בו")}
            {" · "}
            {/* A service that is only read (a hosting one) isn't sent to: a function used it. */}
            {kind?.look
              ? ready.lastUsedAt
                ? `${say("آخر مرة قرأته function:|Last read by a function:|נקרא לאחרונה על ידי פונקציה:")} ${when(ready.lastUsedAt)}`
                : say("ولا function قرأته لسا|No function has read it yet|אף פונקציה עוד לא קראה אותו")
              : ready.lastUsedAt
                ? `${say("آخر مرة انبعت:|Last sent:|נשלח לאחרונה:")} ${when(ready.lastUsedAt)}`
                : say("ما انبعت ولا مرة|Never sent|מעולם לא נשלח")}
          </div>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {kind?.look ? (
              <button type="button" className="font-medium underline disabled:opacity-60" disabled={looking.isPending} onClick={() => looking.mutate()} data-testid={`${t}-look-open`}>
                {looking.isPending ? say("عم يقرأ…|Reading…|קורא…") : seen?.ok ? say("اقرأ من جديد|Read again|קריאה מחדש") : say("شو في هناك؟|What's there?|מה יש שם?")}
              </button>
            ) : null}
            <button type="button" className="underline disabled:opacity-60" disabled={trying.isPending} onClick={() => trying.mutate()} data-testid={`${t}-try`}>
              {kind?.test.sends ? say("ابعت رسالة تجربة|Send a test line|שליחת שורת ניסיון") : say("جرّب المفتاح|Try the key|בדיקת המפתח")}
            </button>
            <button type="button" className="underline" onClick={() => setOpen(!open)} data-testid={`${t}-edit`}>
              {say("غيّره|Change it|שינוי")}
            </button>
            <button type="button" className="text-red-300 underline" onClick={onRemove} data-testid={`${t}-remove`}>
              {say("احذفه|Delete it|מחיקה")}
            </button>
          </div>
        ) : null}
      </div>
      {tried ? (
        <div className={`text-sm ${tried.ok ? "text-emerald-300" : "text-red-300"}`} role="status" data-testid={`${t}-tried`} data-ok={tried.ok}>
          {/* What the service said about itself is its own words ("@my_bot"): kept whole in a right-to-left line. */}
          {tried.ok && tried.said ? (
            <>
              {say("شغّال:|It works:|עובד:")} <bdi>{tried.said}</bdi>
            </>
          ) : (
            triedText(tried)
          )}
        </div>
      ) : null}
      {seen ? (
        <div className="space-y-1">
          <LookView look={seen} t={`${t}-look`} />
          <button type="button" className="text-xs underline" onClick={() => setSeen(null)} data-testid={`${t}-look-close`}>
            {say("سكّر|Close|סגירה")}
          </button>
        </div>
      ) : null}
      {open && kind ? (
        <div className="space-y-2 rounded-xl border border-white/10 p-3">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-36 shrink-0 text-xs text-white/70">{say("اسمه عندك|Your name for it|השם שלו אצלך")}</span>
            <input className={`${field} min-w-48 flex-1`} dir="auto" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-testid={`${t}-name`} />
          </label>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-36 shrink-0 text-xs text-white/70">{keyName(kind.kind)}</span>
            <KeyInput kind={kind} value={key} placeholder={say("فاضي = بيضل متل ما هو|empty = it stays as it is|ריק = נשאר כמו שהוא")} onChange={setKey} testid={`${t}-key`} />
          </label>
          <SettingsInputs kind={kind} value={settings} onChange={setSettings} testid={`${t}-setting`} />
          <Button
            size="sm"
            variant="secondary"
            isLoading={busy}
            disabled={!name.trim()}
            onClick={() => {
              onSave({ ...(name.trim() !== ready.name ? { name: name.trim() } : {}), ...(key.trim() ? { key: key.trim() } : {}), settings });
              setKey("");
              setOpen(false);
              setTried(null);
            }}
            data-testid={`${t}-save`}
          >
            {say("احفظ|Save|שמירה")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export default function ConnectionsPage() {
  const qc = useQueryClient();
  const canWrite = useAuth().hasPermission("connections:write");
  const [confirm, dialog] = useConfirm();
  const q = useQuery({ queryKey: ["connections"], queryFn: API.getConnections });
  const [host, setHost] = useState("");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  // A new ready connection, as it is being written.
  const [newKind, setNewKind] = useState("");
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newSettings, setNewSettings] = useState<Record<string, string>>({});

  const took = (data: Connections) => {
    qc.setQueryData(["connections"], data);
    // The function builder offers these names.
    void qc.invalidateQueries({ queryKey: ["functions"] });
  };
  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: refusalText(e) });
  const change = useMutation({ mutationFn: (run: () => Promise<Connections>) => run(), onSuccess: took, onError });

  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>;
  const { sites, secrets, limits } = q.data;
  // (A server from before ready connections says nothing of them: the page shows the rest.)
  const ready = q.data.ready ?? [];
  const kinds = q.data.kinds ?? [];
  const kind = kinds.find((k) => k.kind === newKind) ?? kinds[0];
  const hosts = sites.map((s) => s.host);
  const tidy = tidySite(host);
  const secretName = tidySecretName(name);

  return (
    <div className="space-y-4 pb-24" data-testid="connections-page">
      <div>
        <h1 className="text-xl font-semibold">{say("الاتصالات والأسرار|Connections & secrets|חיבורים וסודות")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-white/70">
          {say(
            "وين مسموح للـ functions تبعتك تتصل برّا المتجر، وبأي مفاتيح. خطوة «اتصال بموقع» ما بتتصل إلا بموقع مكتوب هون، والمفتاح ما بيطلع إلا للموقع اللي إله.|Where your functions may reach outside the store, and with which keys. A “call a site” step calls only a site written here, and a key leaves only for the site it is for.|לאן מותר לפונקציות שלך לפנות מחוץ לחנות, ועם אילו מפתחות. שלב «קריאה לאתר» פונה רק לאתר שכתוב כאן, ומפתח יוצא רק לאתר שהוא מיועד לו.",
          )}{" "}
          <Link to="/admin/functions" className="underline">
            {say("الـ Functions|Functions|פונקציות")}
          </Link>
        </p>
      </div>

      {kinds.length ? (
        <section className={box} data-testid="connections-ready">
          <h2 className="font-medium">{say("اتصالات جاهزة|Ready connections|חיבורים מוכנים")}</h2>
          {/* Railway, Neon, Vercel, Cloudflare and Cloudinary, each in its own card with its how-to: admin → الاستضافة. */}
          <Link to="/admin/system/hosting" className="mt-1 inline-block text-sm text-accent-300 underline" data-testid="connections-hosting-link">
            {say("إعدادات Railway وNeon وVercel وCloudflare وCloudinary بمكان واحد ← الاستضافة|Railway, Neon, Vercel, Cloudflare and Cloudinary settings in one place → Hosting|ההגדרות של Railway, Neon, Vercel, Cloudflare ו-Cloudinary במקום אחד ← אחסון")}
          </Link>
          <p className={`mt-1 ${note}`}>
            {say(
              "خدمة بتوصلها مرة وحدة بمفتاحها، وبعدها أي function بتختارها من قائمة بخطوة «ابعت باتصال جاهز»: بدون عنوان ولا مفتاح بالخطوة. المفتاح بينكتب مرة وما بينعرض بعدها لحدا.|A service you connect once with its key; after that any function picks it from a menu in a “send through a connection” step, with no address and no key in the step. The key is written once and shown to nobody after that.|שירות שמחברים פעם אחת עם המפתח שלו; אחר כך כל פונקציה בוחרת אותו מתפריט בשלב «שליחה דרך חיבור מוכן», בלי כתובת ובלי מפתח בשלב. המפתח נכתב פעם אחת ולא מוצג אחר כך לאף אחד.",
            )}
          </p>
          <ul className="mt-3 divide-y divide-white/10">
            {ready.map((c) => (
              <ReadyRow
                key={c.id}
                ready={c}
                kind={kinds.find((k) => k.kind === c.kind)}
                canWrite={canWrite}
                busy={change.isPending}
                onSave={(body) => change.mutate(() => API.saveReady(c.id, body))}
                onRemove={async () => {
                  if (await confirm({ title: say("حذف الاتصال|Delete the connection|מחיקת החיבור"), message: say(`«${c.name}» بينحذف، ومفتاحه ما بيرجع.|“${c.name}” is deleted, and its key can't be brought back.|«${c.name}» יימחק, ואת המפתח שלו לא ניתן לשחזר.`), confirmText: say("احذفه|Delete it|מחיקה"), variant: "danger" })) change.mutate(() => API.removeReady(c.id));
                }}
              />
            ))}
          </ul>
          {!ready.length ? <p className="mt-2 text-sm text-white/70" data-testid="ready-empty">{say("ما في اتصالات جاهزة لسا.|No ready connections yet.|עדיין אין חיבורים מוכנים.")}</p> : null}
          {canWrite && kind ? (
            <form
              className="mt-3 space-y-2 rounded-xl border border-white/10 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName.trim() || !newKey.trim()) return;
                const settings = Object.fromEntries(Object.entries(newSettings).filter(([id, v]) => v.trim() && kind.settings.some((s) => s.id === id)));
                // Refused (a key that isn't one, a name that is taken): what was typed stays, to be mended.
                change.mutate(() => API.addReady({ kind: kind.kind, name: newName.trim(), key: newKey.trim(), settings }), {
                  onSuccess: () => {
                    setNewName("");
                    setNewKey("");
                    setNewSettings({});
                  },
                });
              }}
              data-testid="ready-form"
            >
              <div className="text-sm font-medium">{say("اتصال جديد|A new connection|חיבור חדש")}</div>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={say("الخدمة|The service|השירות")}>
                {kinds.map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    role="radio"
                    aria-checked={k.kind === kind.kind}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${k.kind === kind.kind ? "border-white/40 bg-white/10" : "border-white/10"}`}
                    onClick={() => {
                      setNewKind(k.kind);
                      setNewKey("");
                      setNewSettings({});
                    }}
                    data-testid={`ready-new-kind-${k.kind}`}
                  >
                    {kindName(k.kind, k.label)}
                  </button>
                ))}
              </div>
              <p className={note} data-testid="ready-new-how">
                {kindHow(kind.kind)}
              </p>
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-36 shrink-0 text-xs text-white/70">{say("اسمه عندك|Your name for it|השם שלו אצלך")}</span>
                <input className={`${field} min-w-48 flex-1`} dir="auto" value={newName} maxLength={60} placeholder={say("تنبيهات المتجر|Store alerts|התראות החנות")} onChange={(e) => setNewName(e.target.value)} data-testid="ready-new-name" />
              </label>
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-36 shrink-0 text-xs text-white/70">{keyName(kind.kind)}</span>
                <KeyInput kind={kind} value={newKey} placeholder={kind.keyFile ? undefined : keyLooks(kind.kind)} onChange={setNewKey} testid="ready-new-key" />
              </label>
              <SettingsInputs kind={kind} value={newSettings} onChange={setNewSettings} testid="ready-new-setting" />
              <Button size="sm" variant="secondary" type="submit" disabled={!newName.trim() || !newKey.trim() || (!!kind.keyFile && !keyFileAccount(newKey)) || kind.settings.some((s) => s.required && !newSettings[s.id]?.trim()) || ready.length >= (limits.ready ?? 20)} isLoading={change.isPending} data-testid="ready-add">
                {say("＋ وصّل الخدمة|＋ Connect the service|＋ חיבור השירות")}
              </Button>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className={box} data-testid="connections-sites">
        <h2 className="font-medium">{say("المواقع المسموحة|Allowed sites|אתרים מותרים")}</h2>
        <p className={`mt-1 ${note}`}>
          {say(
            "الموقع بينكتب باسمه بس (api.telegram.org)، أو ‎*.example.com لكل الأسماء تحته. الاتصال دايماً https، وعنوان داخلي أو بالأرقام ما بينتصل فيه أبداً.|A site is written by its name only (api.telegram.org), or *.example.com for every name under it. A call is always https, and an address inside the network or in numbers is never called.|אתר נכתב רק בשמו (api.telegram.org), או ‎*.example.com לכל השמות שמתחתיו. הקריאה תמיד ב-https, וכתובת פנימית או במספרים לעולם לא נקראת.",
          )}
        </p>
        <ul className="mt-3 divide-y divide-white/10">
          {sites.map((s) => (
            <li key={s.host} className="flex flex-wrap items-center justify-between gap-2 py-2" data-testid={`site-${s.host}`}>
              <bdi dir="ltr" className="font-mono text-sm">
                {s.host}
              </bdi>
              {canWrite ? (
                <button
                  type="button"
                  className="text-sm text-red-300 underline"
                  onClick={async () => {
                    if (await confirm({ title: say("شيل الموقع|Take the site out|הסרת האתר"), message: say(`الـ functions ما رح تقدر تتصل بـ ${s.host} بعدها.|Functions won't be able to call ${s.host} after this.|פונקציות לא יוכלו לפנות אל ${s.host} אחרי זה.`), confirmText: say("شيله|Take it out|הסרה"), variant: "danger" })) change.mutate(() => API.removeSite(s.host));
                  }}
                  data-testid={`site-${s.host}-remove`}
                >
                  {say("شيله|Take it out|הסרה")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {!sites.length ? <p className="mt-2 text-sm text-white/70" data-testid="sites-empty">{say("ولا موقع مسموح لسا: الـ functions ما بتتصل بولا مكان.|No site is allowed yet: functions call nowhere.|עדיין אין אתר מותר: פונקציות לא פונות לשום מקום.")}</p> : null}
        {canWrite ? (
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!siteOk(tidy)) return;
              // What was typed stays until the server took it.
              change.mutate(() => API.addSite({ host: tidy }), { onSuccess: () => setHost("") });
            }}
          >
            <input className={`${field} min-w-56 flex-1`} dir="ltr" value={host} placeholder="api.telegram.org" onChange={(e) => setHost(e.target.value)} aria-label={say("اسم الموقع|The site's name|שם האתר")} data-testid="site-new" />
            <Button size="sm" variant="secondary" type="submit" disabled={!siteOk(tidy) || sites.length >= limits.sites} isLoading={change.isPending} data-testid="site-add">
              {say("＋ اسمح بالموقع|＋ Allow the site|＋ התרת האתר")}
            </Button>
            {host && !siteOk(tidy) ? <span className="text-xs text-amber-300" data-testid="site-new-bad">{say("اسم موقع بس، متل api.example.com|A site's name only, like api.example.com|רק שם של אתר, כמו api.example.com")}</span> : null}
          </form>
        ) : null}
      </section>

      <section className={box} data-testid="connections-secrets">
        <h2 className="font-medium">{say("الأسرار (مفاتيح الخدمات)|Secrets (services' keys)|סודות (מפתחות של שירותים)")}</h2>
        <p className={`mt-1 ${note}`}>
          {say(
            "السر بينكتب مرة وما بينعرض بعدها لحدا، ولا إلك. بتسمّيه بخطوة «اتصال بموقع» هيك: {{secret.الاسم}}، والسيرفر بيحطه بالطلب وهو طالع، وبس للمواقع اللي اخترتها إله.|A secret is written once and shown to nobody after that, not to you either. A “call a site” step names it like this: {{secret.NAME}}, and the server puts it into the request as it leaves, only to the sites you chose for it.|סוד נכתב פעם אחת ולא מוצג אחר כך לאף אחד, גם לא לך. שלב «קריאה לאתר» קורא לו כך: {{secret.NAME}}, והשרת מכניס אותו לבקשה ביציאה, רק לאתרים שבחרת עבורו.",
          )}
        </p>
        <ul className="mt-3 divide-y divide-white/10">
          {secrets.map((s) => (
            <SecretRow
              key={s.id}
              secret={s}
              sites={hosts}
              canWrite={canWrite}
              busy={change.isPending}
              onSave={(body) => change.mutate(() => API.saveSecret(s.id, body))}
              onRemove={async () => {
                if (await confirm({ title: say("حذف السر|Delete the secret|מחיקת הסוד"), message: say(`${s.name} بينحذف، وقيمته ما بترجع.|${s.name} is deleted, and its value can't be brought back.|${s.name} יימחק, ואת הערך שלו לא ניתן לשחזר.`), confirmText: say("احذفه|Delete it|מחיקה"), variant: "danger" })) change.mutate(() => API.removeSecret(s.id));
              }}
            />
          ))}
        </ul>
        {!secrets.length ? <p className="mt-2 text-sm text-white/70" data-testid="secrets-empty">{say("ما في أسرار لسا.|No secrets yet.|עדיין אין סודות.")}</p> : null}
        {canWrite ? (
          sites.length ? (
            <form
              className="mt-3 space-y-2 rounded-xl border border-white/10 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!secretNameOk(secretName) || !value || !picked.length) return;
                change.mutate(() => API.addSecret({ name: secretName, value, sites: picked }), {
                  onSuccess: () => {
                    setName("");
                    setValue("");
                    setPicked([]);
                  },
                });
              }}
              data-testid="secret-form"
            >
              <div className="text-sm font-medium">{say("سر جديد|A new secret|סוד חדש")}</div>
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${field} w-56 font-mono`} dir="ltr" value={name} placeholder="TELEGRAM_TOKEN" onChange={(e) => setName(e.target.value)} aria-label={say("اسم السر|The secret's name|שם הסוד")} data-testid="secret-new-name" />
                <input className={`${field} min-w-56 flex-1`} type="password" autoComplete="new-password" dir="ltr" value={value} maxLength={limits.value} placeholder={say("القيمة (بتنكتب وما بتنعرض بعدها)|The value (written, never shown again)|הערך (נכתב ולא מוצג שוב)")} onChange={(e) => setValue(e.target.value)} aria-label={say("قيمة السر|The secret's value|ערך הסוד")} data-testid="secret-new-value" />
              </div>
              {name && secretName !== name.trim() ? (
                <div className={note} data-testid="secret-new-as">
                  {say("رح ينحفظ باسم:|It will be kept as:|יישמר בשם:")} <bdi dir="ltr" className="font-mono">{secretName || "—"}</bdi>
                </div>
              ) : null}
              <div className={note}>{say("لأي مواقع مسموح يروح؟|Which sites may it go to?|לאילו אתרים מותר לו לצאת?")}</div>
              <SitesPick sites={hosts} value={picked} onChange={setPicked} testid="secret-new-sites" />
              <Button size="sm" variant="secondary" type="submit" disabled={!secretNameOk(secretName) || !value || !picked.length || secrets.length >= limits.secrets} isLoading={change.isPending} data-testid="secret-add">
                {say("＋ احفظ السر|＋ Keep the secret|＋ שמירת הסוד")}
              </Button>
            </form>
          ) : (
            <p className={`mt-3 ${note}`} data-testid="secret-needs-site">{say("اسمح بموقع أول: السر لازم يكون إله موقع يروح عليه.|Allow a site first: a secret needs a site to go to.|קודם התירו אתר: סוד צריך אתר לצאת אליו.")}</p>
          )
        ) : null}
      </section>
      {dialog}
    </div>
  );
}
