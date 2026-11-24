// الـ Functions: what starts one (F3). A row of a table added, changed or deleted; a schedule;
// something that happened in the store; a call to its own address (a shopper's button, a program
// with a key, anyone); a webhook. Each is saved as it is changed: triggers aren't part of the
// draft. They fire only while the function is published and switched on.
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { env } from "../../config/env";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import * as FnAPI from "../../api/functions.api";
import type { FnFull, FnInput, FnTable, FnTrigger, TriggerKind, TriggerMeta } from "../../api/functions.api";
import { fullUrl } from "../api/apiText";
import { tableName } from "./fnDraft";
import { CALL_WHO_NAME, EVENT_NAME, ROUTE_STATUS_NAME, ROW_EVENT_NAME, TRIGGER_KIND_NAME, firedText, handsMissing, routeRefusal, triggerLine } from "./fnText";
import { RolePicker, useShopperRoles } from "../customers/rolesUi";

const ROUTE_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const ROUTE_STATUS = [200, 201, 202, 204];

const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const label = "text-xs text-white/60";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(say("انتسخ|Copied|הועתק"));
  } catch {
    toast.error(say("ما قدر ينسخ؛ حدّده وانسخه بإيدك|Couldn't copy; select it and copy by hand|ההעתקה נכשלה; סמנו והעתיקו ידנית"));
  }
}

/** What a new trigger of a kind starts with. */
export function newTrigger(kind: TriggerKind, ctx: { tables: FnTable[]; events: string[]; taken: string[]; name: string; /** This function's own addresses ("POST orders"), so a new one starts on a free path. */ paths?: string[] }): { kind: TriggerKind; config: Record<string, unknown>; slug?: string } {
  if (kind === "row") return { kind, config: { table: ctx.tables[0]?.id ?? "", on: ["added"] } };
  if (kind === "schedule") return { kind, config: { everyMinutes: 60 } };
  if (kind === "event") return { kind, config: { event: ctx.events[0] ?? "order.created" } };
  if (kind === "webhook") return { kind, config: {} };
  // A call's address: from the function's name where it has Latin letters, else "fn"; with a number when it is taken.
  const base = ctx.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "fn";
  if (kind === "route") {
    // An own address starts as a program's POST to the function's name; the owner makes it theirs.
    let path = base;
    for (let n = 2; (ctx.paths ?? []).includes(`POST ${path}`); n++) path = `${base}-${n}`;
    return { kind, config: { method: "POST", path, who: "key" } };
  }
  let slug = base.length < 2 ? `${base}-fn` : base;
  for (let n = 2; ctx.taken.includes(slug); n++) slug = `${base}-${n}`;
  return { kind, config: { who: "customer" }, slug };
}

export function FnTriggers({ fn, tables, meta, canWrite, inputs, onAddInputs }: { fn: FnFull; tables: FnTable[]; meta: TriggerMeta; canWrite: boolean; /** The draft's inputs, to say which a trigger hands that the function doesn't take yet. */ inputs: FnInput[]; onAddInputs: (names: string[]) => void }) {
  const qc = useQueryClient();
  const lang = adminLang();
  const took = (saved: FnFull) => qc.setQueryData(["functions", fn.id], saved);
  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: routeRefusal(getApiErrorMessage(e), lang) });
  const add = useMutation({ mutationFn: (body: ReturnType<typeof newTrigger>) => FnAPI.addTrigger(fn.id, body), onSuccess: took, onError });
  const save = useMutation({ mutationFn: ({ id, ...body }: { id: string; config?: Record<string, unknown>; slug?: string; enabled?: boolean }) => FnAPI.saveTrigger(fn.id, id, body), onSuccess: took, onError });
  const remove = useMutation({ mutationFn: (id: string) => FnAPI.deleteTrigger(fn.id, id), onSuccess: took, onError });
  const live = fn.published && fn.enabled;

  return (
    <div className="space-y-3" data-testid="fn-triggers">
      {!live && fn.triggers.length ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200" data-testid="fn-triggers-asleep">
          {fn.published
            ? say("الـ function موقّفة: ولا مشغّل بيشغّلها لحد ما تشغّلها.|The function is switched off: nothing starts it until it is switched on.|הפונקציה כבויה: שום דבר לא מפעיל אותה עד שתופעל.")
            : say("الـ function مش منشورة لسا: المشغّلات بتبلّش تشتغل بعد النشر.|The function isn't published yet: its triggers start working once it is.|הפונקציה עוד לא פורסמה: המפעילים יתחילו לעבוד אחרי הפרסום.")}
        </p>
      ) : null}
      {fn.triggers.length ? (
        <ul className="space-y-2">
          {fn.triggers.map((t) => (
            <TriggerCard key={t.kind === "route" ? `${t.id}:${String(t.config.path)}` : t.id} t={t} tables={tables} meta={meta} canWrite={canWrite} busy={save.isPending || remove.isPending} missing={handsMissing(t, inputs)} onAddInputs={onAddInputs} onSave={(body) => save.mutate({ id: t.id, ...body })} onRemove={() => remove.mutate(t.id)} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/60" data-testid="fn-triggers-empty">
          {say("ما في شي بيشغّلها لحالها لسا: بتشتغل بس لما تشغّلها إنت من «جرّبها».|Nothing starts it by itself yet: it runs only when you run it from “Try it”.|עדיין שום דבר לא מפעיל אותה מעצמו: היא רצה רק כשמריצים אותה מ«ניסיון».")}
        </p>
      )}
      {canWrite ? (
        <select
          className={`${field} text-white/80`}
          value=""
          aria-label={say("أضف مشغّل|Add a trigger|הוספת מפעיל")}
          disabled={add.isPending}
          onChange={(e) => {
            const kind = e.target.value as TriggerKind;
            if (kind) add.mutate(newTrigger(kind, { tables, events: meta.events, taken: fn.triggers.map((t) => t.slug ?? ""), name: fn.name, paths: fn.triggers.filter((t) => t.kind === "route").map((t) => `${String(t.config.method)} ${String(t.config.path)}`) }));
          }}
          data-testid="fn-triggers-add"
        >
          <option value="">{say("＋ أضف مشغّل|＋ Add a trigger|＋ הוספת מפעיל")}</option>
          {meta.kinds.map((k) => (
            <option key={k} value={k}>
              {say(TRIGGER_KIND_NAME[k])}
            </option>
          ))}
        </select>
      ) : null}
      <span className="sr-only">{fn.triggers.map((t) => triggerLine(t, tables, lang)).join(" · ")}</span>
    </div>
  );
}

/** A door's settings without its roles (a door for everyone or for a key has none). */
const withoutRoles = (c: Record<string, unknown>) => {
  const rest = { ...c };
  delete rest.roles;
  return rest;
};

function TriggerCard({ t, tables, meta, canWrite, busy, missing, onAddInputs, onSave, onRemove }: { t: FnTrigger; tables: FnTable[]; meta: TriggerMeta; canWrite: boolean; busy: boolean; missing: string[]; onAddInputs: (names: string[]) => void; onSave: (body: { config?: Record<string, unknown>; slug?: string; enabled?: boolean }) => void; onRemove: () => void }) {
  const lang = adminLang();
  const c = t.config as Record<string, unknown>;
  // What is typed is sent when the box is left, not at every letter.
  const [slug, setSlug] = useState(t.slug ?? "");
  const [every, setEvery] = useState(String(c.everyMinutes ?? 60));
  const [at, setAt] = useState(String(c.at ?? "09:00"));
  const [perMinute, setPerMinute] = useState(c.perMinute === undefined ? "" : String(c.perMinute));
  const [path, setPath] = useState(String(c.path ?? ""));
  useEffect(() => setSlug(t.slug ?? ""), [t.slug]);
  // (An own address's path as the server kept it: the card is drawn afresh when it changes.)
  // An own address's settings, all sent together (the server checks them as one).
  const route = (more: Record<string, unknown>) => {
    const next: Record<string, unknown> = { method: c.method, path: c.path, who: c.who, ...(c.perMinute !== undefined ? { perMinute: c.perMinute } : {}), ...(c.status !== undefined ? { status: c.status } : {}), ...(Array.isArray(c.roles) && c.roles.length ? { roles: c.roles } : {}), ...more };
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    onSave({ config: next });
  };
  const url = t.address ? fullUrl(t.address, env.VITE_API_BASE_URL, window.location.origin) : "";
  const fired = firedText(t, lang);
  // A door for signed-in shoppers can be for some roles only (الزبائن → الأدوار والمجموعات).
  const shopperRoles = useShopperRoles();
  const doorRoles = Array.isArray(c.roles) ? (c.roles as string[]) : [];
  const rolesRow = (save: (roles: string[] | undefined) => void) =>
    String(c.who ?? "") === "customer" && (shopperRoles.data?.roles.length || doorRoles.length) ? (
      <div className="flex w-full flex-wrap items-center gap-2" data-testid={`trigger-${t.id}-roles`}>
        <span className={label}>{say("بس لهالأدوار (فاضي = أي زبون):|Only these roles (none = any shopper):|רק לתפקידים האלה (ריק = כל לקוח):")}</span>
        <RolePicker roles={shopperRoles.data?.roles ?? []} value={doorRoles} disabled={!canWrite} onChange={(next) => save(next.length ? next : undefined)} testid={`trigger-${t.id}-roles-pick`} />
      </div>
    ) : null;
  const daily = "at" in c;

  return (
    <li className="rounded-xl border border-white/10 bg-white/3 p-3" data-testid={`trigger-${t.id}`} data-kind={t.kind}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{say(TRIGGER_KIND_NAME[t.kind])}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-white/60" data-testid={`trigger-${t.id}-line`}>
          {triggerLine(t, tables, lang)}
        </span>
        <ToggleSwitch checked={t.enabled} label={say("شغّال|On|פועל")} disabled={!canWrite || busy} onChange={(enabled) => onSave({ enabled })} />
        {canWrite ? (
          <button type="button" className="h-8 w-8 text-white/60 hover:text-red-300" onClick={onRemove} disabled={busy} aria-label={say("شيل المشغّل|Remove the trigger|הסרת המפעיל")} data-testid={`trigger-${t.id}-remove`}>
            ✕
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {t.kind === "row" ? (
          <>
            <select className={`${field} max-w-[16rem]`} value={String(c.table ?? "")} disabled={!canWrite} onChange={(e) => onSave({ config: { ...c, table: e.target.value } })} data-testid={`trigger-${t.id}-table`}>
              {!tables.some((x) => x.id === c.table) ? <option value={String(c.table ?? "")}>{say("جدول انحذف|A deleted table|טבלה שנמחקה")}</option> : null}
              {tables.map((x) => (
                <option key={x.id} value={x.id}>
                  {tableName(x, lang)}
                </option>
              ))}
            </select>
            {(Object.keys(ROW_EVENT_NAME) as Array<keyof typeof ROW_EVENT_NAME>).map((ev) => {
              const on = (c.on as string[] | undefined) ?? [];
              return (
                <label key={ev} className="flex items-center gap-1.5 text-sm text-white/80">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-current"
                    checked={on.includes(ev)}
                    // The last one stays ticked: a trigger that waits for nothing isn't one.
                    disabled={!canWrite || (on.length === 1 && on.includes(ev))}
                    onChange={(e) => onSave({ config: { ...c, on: e.target.checked ? [...on, ev] : on.filter((x) => x !== ev) } })}
                    data-testid={`trigger-${t.id}-on-${ev}`}
                  />
                  {say(ROW_EVENT_NAME[ev])}
                </label>
              );
            })}
          </>
        ) : null}

        {t.kind === "schedule" ? (
          <>
            <select className={field} value={daily ? "at" : "every"} disabled={!canWrite} onChange={(e) => onSave({ config: e.target.value === "at" ? { at } : { everyMinutes: Number(every) || 60 } })} data-testid={`trigger-${t.id}-mode`}>
              <option value="every">{say("كل كم دقيقة|Every so many minutes|כל כמה דקות")}</option>
              <option value="at">{say("كل يوم الساعة|Every day at|כל יום בשעה")}</option>
            </select>
            {daily ? (
              <input type="time" className={`${field} w-28`} value={at} disabled={!canWrite} onChange={(e) => setAt(e.target.value)} onBlur={() => at !== c.at && /^\d\d:\d\d$/.test(at) && onSave({ config: { at } })} data-testid={`trigger-${t.id}-at`} />
            ) : (
              <input
                type="number"
                min={meta.limits.everyMinutes.min}
                max={meta.limits.everyMinutes.max}
                className={`${field} w-24`}
                value={every}
                disabled={!canWrite}
                onChange={(e) => setEvery(e.target.value)}
                onBlur={() => {
                  const n = Math.max(meta.limits.everyMinutes.min, Math.min(meta.limits.everyMinutes.max, Math.round(Number(every) || 60)));
                  setEvery(String(n));
                  if (n !== c.everyMinutes) onSave({ config: { everyMinutes: n } });
                }}
                data-testid={`trigger-${t.id}-every`}
              />
            )}
            {daily ? <span className={label}>{say("على ساعة المتجر|on the store's clock|לפי שעון החנות")}</span> : null}
          </>
        ) : null}

        {t.kind === "event" ? (
          <select className={field} value={String(c.event ?? "")} disabled={!canWrite} onChange={(e) => onSave({ config: { event: e.target.value } })} data-testid={`trigger-${t.id}-event`}>
            {meta.events.map((ev) => (
              <option key={ev} value={ev}>
                {say(EVENT_NAME[ev] ?? ev)}
              </option>
            ))}
          </select>
        ) : null}

        {t.kind === "call" ? (
          <>
            <select className={field} value={String(c.who ?? "customer")} disabled={!canWrite} onChange={(e) => onSave({ config: { ...withoutRoles(c), who: e.target.value, ...(e.target.value === "customer" && doorRoles.length ? { roles: doorRoles } : {}) } })} data-testid={`trigger-${t.id}-who`}>
              {(Object.keys(CALL_WHO_NAME) as Array<keyof typeof CALL_WHO_NAME>).map((w) => (
                <option key={w} value={w}>
                  {say(CALL_WHO_NAME[w])}
                </option>
              ))}
            </select>
            <span className={label}>{say("العنوان|Address|כתובת")}</span>
            <input className={`${field} w-40`} dir="ltr" value={slug} disabled={!canWrite} onChange={(e) => setSlug(e.target.value.trim().toLowerCase())} onBlur={() => slug && slug !== t.slug && onSave({ slug })} data-testid={`trigger-${t.id}-slug`} />
            <span className={label}>{say("بالدقيقة|a minute|בדקה")}</span>
            <input
              type="number"
              min={1}
              max={600}
              className={`${field} w-20`}
              value={perMinute}
              placeholder={String(meta.callPerMinute[String(c.who ?? "customer")] ?? "")}
              disabled={!canWrite}
              onChange={(e) => setPerMinute(e.target.value)}
              onBlur={() => {
                const n = perMinute.trim() === "" ? undefined : Math.max(1, Math.min(600, Math.round(Number(perMinute) || 1)));
                if (n !== c.perMinute) onSave({ config: { who: c.who, ...(n ? { perMinute: n } : {}), ...(doorRoles.length ? { roles: doorRoles } : {}) } });
              }}
              data-testid={`trigger-${t.id}-per-minute`}
            />
            {rolesRow((roles) => onSave({ config: { who: c.who, ...(c.perMinute !== undefined ? { perMinute: c.perMinute } : {}), ...(roles ? { roles } : {}) } }))}
          </>
        ) : null}

        {t.kind === "route" ? (
          <>
            <select className={field} value={String(c.method ?? "POST")} disabled={!canWrite} onChange={(e) => route({ method: e.target.value })} aria-label="Method" data-testid={`trigger-${t.id}-method`}>
              {ROUTE_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className={label} dir="ltr">
              /v1/api/
            </span>
            <input
              className={`${field} w-56`}
              dir="ltr"
              value={path}
              placeholder="orders/:id"
              disabled={!canWrite}
              onChange={(e) => setPath(e.target.value.trim())}
              onBlur={() => path && path !== c.path && route({ path })}
              aria-label={say("المسار|The path|הנתיב")}
              data-testid={`trigger-${t.id}-path`}
            />
            <select className={field} value={String(c.who ?? "key")} disabled={!canWrite} onChange={(e) => route({ who: e.target.value, perMinute: undefined, roles: e.target.value === "customer" && doorRoles.length ? doorRoles : undefined })} data-testid={`trigger-${t.id}-who`}>
              {(Object.keys(CALL_WHO_NAME) as Array<keyof typeof CALL_WHO_NAME>).map((w) => (
                <option key={w} value={w}>
                  {say(CALL_WHO_NAME[w])}
                </option>
              ))}
            </select>
            <span className={label}>{say("بالدقيقة|a minute|בדקה")}</span>
            <input
              type="number"
              min={1}
              max={600}
              className={`${field} w-20`}
              value={perMinute}
              placeholder={String(meta.callPerMinute[String(c.who ?? "key")] ?? "")}
              disabled={!canWrite}
              onChange={(e) => setPerMinute(e.target.value)}
              onBlur={() => {
                const n = perMinute.trim() === "" ? undefined : Math.max(1, Math.min(600, Math.round(Number(perMinute) || 1)));
                if (n !== c.perMinute) route({ perMinute: n });
              }}
              data-testid={`trigger-${t.id}-per-minute`}
            />
            {rolesRow((roles) => route({ roles }))}
            <span className={label}>{say("الجواب|Answer|תשובה")}</span>
            <select className={field} value={String(c.status ?? 200)} disabled={!canWrite} onChange={(e) => route({ status: Number(e.target.value) === 200 ? undefined : Number(e.target.value) })} data-testid={`trigger-${t.id}-status`}>
              {ROUTE_STATUS.map((s) => (
                <option key={s} value={s}>
                  {say(ROUTE_STATUS_NAME[s])}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      {t.kind === "call" || t.kind === "webhook" || t.kind === "route" ? (
        url ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <code dir="ltr" className="min-w-0 break-all rounded-lg bg-black/30 px-2 py-1 text-xs" data-testid={`trigger-${t.id}-address`}>
              {t.kind === "route" ? String(c.method) : "POST"} {url}
            </code>
            <button type="button" className="text-xs underline" onClick={() => void copy(url)} data-testid={`trigger-${t.id}-copy`}>
              {say("انسخ|Copy|העתקה")}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-white/60">{say("عنوان الـ webhook بيبين بس للّي مسموحله يعدّل الـ functions.|A webhook's address is shown only to who may change functions.|כתובת ה-webhook מוצגת רק למי שרשאי לשנות פונקציות.")}</p>
        )
      ) : null}

      <p className="mt-2 text-xs text-white/60" data-testid={`trigger-${t.id}-hint`}>
        {t.kind === "call" ? (
          <>
            {say("اللي بينادي بيبعت|The caller sends|הקורא שולח")} <bdi dir="ltr">{"{ input: { … } }"}</bdi> {say("وبيرجعله جواب الـ function. مين نادى اسمه|and gets the function's answer back. Who called is|ומקבל את תשובת הפונקציה. מי שקרא הוא")} <bdi dir="ltr">{"{{caller}}"}</bdi> <bdi dir="ltr">(id, name, email, kind)</bdi>.{" "}
            {say("طلب معه ترويسة|A request sent with an|בקשה שנשלחת עם כותרת")} <bdi dir="ltr">Idempotency-Key</bdi>{" "}
            {say("ما بيشتغل مرتين: نفس المفتاح مرة تانية بياخد جواب الأولى. والجواب بيحمل رقم التشغيل بالسجل (|header isn't run twice: the same key again gets the first answer. The answer carries the run's number in the log (|לא רצה פעמיים: אותו מפתח שוב מקבל את התשובה הראשונה. התשובה נושאת את מספר ההרצה ביומן (")}
            <bdi dir="ltr">X-Run-Id</bdi>).
          </>
        ) : t.kind === "webhook" ? (
          say("أي نظام بيعرف هالعنوان بيقدر يشغّلها، فخلّيه سر. الطلب بينقبل فوراً والـ function بتشتغل بعده.|Any system that knows this address can start it, so keep it secret. The request is taken in at once and the function runs after it.|כל מערכת שמכירה את הכתובת יכולה להפעיל אותה, לכן שמרו עליה בסוד. הבקשה מתקבלת מיד והפונקציה רצה אחריה.")
        ) : t.kind === "route" ? (
          <span data-testid={`trigger-${t.id}-route-help`}>
            {say("الـ function بتاخد مدخلاتها بأساميها من الـ query ومن جسم الطلب (JSON)، ومن أجزاء المسار اللي بتبلّش بـ «:»، والمسار بيغلب. قبل ما تشتغل بتنفحص المدخلات بقواعدها: إذا في غلط بيرجع 400 مع كل غلطة. وجوابها بيرجع متل ما هو. إذا وقفت بيرجع 422. ونفس الترويسات: |The function takes its inputs by their names from the query, the request's body (JSON) and the path's parts that start with “:” (the path wins). Before it runs, the inputs are checked by their rules: what isn't right answers 400 with every problem. Its answer is sent as it is; a run that stops answers 422. Same headers: |הפונקציה מקבלת את הקלטים לפי שמם מה-query, מגוף הבקשה (JSON) ומחלקי הנתיב שמתחילים ב-«:» (הנתיב גובר). לפני שהיא רצה הקלטים נבדקים לפי הכללים שלהם: מה שלא תקין עונה 400 עם כל הבעיות. התשובה נשלחת כמו שהיא; הרצה שנעצרת עונה 422. אותן כותרות: ")}
            <bdi dir="ltr">Idempotency-Key</bdi>, <bdi dir="ltr">X-Run-Id</bdi>.
          </span>
        ) : null}
        {t.hands.length ? (
          <>
            {t.kind === "webhook" || t.kind === "route" ? " " : ""}
            {t.kind === "route" ? say("أجزاء المسار:|The path's parts:|חלקי הנתיב:") : say("بتعطي الـ function:|It hands the function:|היא מוסרת לפונקציה:")} <bdi dir="ltr">{t.hands.join(", ")}</bdi>.
          </>
        ) : null}
        {fired ? ` ${fired}` : ""}
      </p>
      {canWrite && missing.length ? (
        <button type="button" className="mt-1 text-xs underline" onClick={() => onAddInputs(missing)} data-testid={`trigger-${t.id}-add-inputs`}>
          {say("＋ ضيف المدخلات الناقصة: {names}|＋ Add the inputs it doesn't take yet: {names}|＋ הוספת הקלטים החסרים: {names}").replace("{names}", missing.join(", "))}
        </button>
      ) : null}
    </li>
  );
}
