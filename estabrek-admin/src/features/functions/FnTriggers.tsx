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
import { CALL_WHO_NAME, EVENT_NAME, ROW_EVENT_NAME, TRIGGER_KIND_NAME, firedText, handsMissing, triggerLine } from "./fnText";

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
export function newTrigger(kind: TriggerKind, ctx: { tables: FnTable[]; events: string[]; taken: string[]; name: string }): { kind: TriggerKind; config: Record<string, unknown>; slug?: string } {
  if (kind === "row") return { kind, config: { table: ctx.tables[0]?.id ?? "", on: ["added"] } };
  if (kind === "schedule") return { kind, config: { everyMinutes: 60 } };
  if (kind === "event") return { kind, config: { event: ctx.events[0] ?? "order.created" } };
  if (kind === "webhook") return { kind, config: {} };
  // A call's address: from the function's name where it has Latin letters, else "fn"; with a number when it is taken.
  const base = ctx.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "fn";
  let slug = base.length < 2 ? `${base}-fn` : base;
  for (let n = 2; ctx.taken.includes(slug); n++) slug = `${base}-${n}`;
  return { kind, config: { who: "customer" }, slug };
}

export function FnTriggers({ fn, tables, meta, canWrite, inputs, onAddInputs }: { fn: FnFull; tables: FnTable[]; meta: TriggerMeta; canWrite: boolean; /** The draft's inputs, to say which a trigger hands that the function doesn't take yet. */ inputs: FnInput[]; onAddInputs: (names: string[]) => void }) {
  const qc = useQueryClient();
  const lang = adminLang();
  const took = (saved: FnFull) => qc.setQueryData(["functions", fn.id], saved);
  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });
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
            <TriggerCard key={t.id} t={t} tables={tables} meta={meta} canWrite={canWrite} busy={save.isPending || remove.isPending} missing={handsMissing(t, inputs)} onAddInputs={onAddInputs} onSave={(body) => save.mutate({ id: t.id, ...body })} onRemove={() => remove.mutate(t.id)} />
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
            if (kind) add.mutate(newTrigger(kind, { tables, events: meta.events, taken: fn.triggers.map((t) => t.slug ?? ""), name: fn.name }));
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

function TriggerCard({ t, tables, meta, canWrite, busy, missing, onAddInputs, onSave, onRemove }: { t: FnTrigger; tables: FnTable[]; meta: TriggerMeta; canWrite: boolean; busy: boolean; missing: string[]; onAddInputs: (names: string[]) => void; onSave: (body: { config?: Record<string, unknown>; slug?: string; enabled?: boolean }) => void; onRemove: () => void }) {
  const lang = adminLang();
  const c = t.config as Record<string, unknown>;
  // What is typed is sent when the box is left, not at every letter.
  const [slug, setSlug] = useState(t.slug ?? "");
  const [every, setEvery] = useState(String(c.everyMinutes ?? 60));
  const [at, setAt] = useState(String(c.at ?? "09:00"));
  const [perMinute, setPerMinute] = useState(c.perMinute === undefined ? "" : String(c.perMinute));
  useEffect(() => setSlug(t.slug ?? ""), [t.slug]);
  const url = t.address ? fullUrl(t.address, env.VITE_API_BASE_URL, window.location.origin) : "";
  const fired = firedText(t, lang);
  const daily = "at" in c;

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`trigger-${t.id}`} data-kind={t.kind}>
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
            <select className={field} value={String(c.who ?? "customer")} disabled={!canWrite} onChange={(e) => onSave({ config: { ...c, who: e.target.value } })} data-testid={`trigger-${t.id}-who`}>
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
                if (n !== c.perMinute) onSave({ config: { who: c.who, ...(n ? { perMinute: n } : {}) } });
              }}
              data-testid={`trigger-${t.id}-per-minute`}
            />
          </>
        ) : null}
      </div>

      {t.kind === "call" || t.kind === "webhook" ? (
        url ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <code dir="ltr" className="min-w-0 break-all rounded-lg bg-black/30 px-2 py-1 text-xs" data-testid={`trigger-${t.id}-address`}>
              POST {url}
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
            {say("اللي بينادي بيبعت|The caller sends|הקורא שולח")} <bdi dir="ltr">{"{ input: { … } }"}</bdi> {say("وبيرجعله جواب الـ function. مين نادى اسمه|and gets the function's answer back. Who called is|ומקבל את תשובת הפונקציה. מי שקרא הוא")} <bdi dir="ltr">{"{{caller}}"}</bdi> <bdi dir="ltr">(id, name, email, kind)</bdi>.
          </>
        ) : t.kind === "webhook" ? (
          say("أي نظام بيعرف هالعنوان بيقدر يشغّلها، فخلّيه سر. الطلب بينقبل فوراً والـ function بتشتغل بعده.|Any system that knows this address can start it, so keep it secret. The request is taken in at once and the function runs after it.|כל מערכת שמכירה את הכתובת יכולה להפעיל אותה, לכן שמרו עליה בסוד. הבקשה מתקבלת מיד והפונקציה רצה אחריה.")
        ) : null}
        {t.hands.length ? (
          <>
            {t.kind === "webhook" ? " " : ""}
            {say("بتعطي الـ function:|It hands the function:|היא מוסרת לפונקציה:")} <bdi dir="ltr">{t.hands.join(", ")}</bdi>.
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
