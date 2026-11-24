// Webhooks طالعة (F6): the store's events sent to the owner's own addresses.
// - An endpoint: a name, an https address, the events it wants, and a signing secret that is made
//   on the server and shown here once (when it is made, and when it is renewed).
// - A delivery is signed; one that isn't taken is tried again by itself; every delivery is in the
//   endpoint's log, where it can be read and sent again.
// Looking takes connections:read, changing connections:write.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as API from "../../api/webhooks.api";
import type { Delivery, Endpoint, EndpointBody, Webhooks } from "../../api/webhooks.api";
import { STATE_NAME, VERIFY_SNIPPET, deliveryState, errorText, eventName, refusalText, stateOf, tablesText, totalWait, urlProblem, waitText, type Lang } from "./webhookText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const note = "text-xs text-white/70";
const chip = "rounded-full bg-white/10 px-2 py-0.5 text-[11px]";
const when = (iso: string | null, lang: Lang) => (iso ? new Date(iso).toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he" : "en", { dateStyle: "medium", timeStyle: "short" }) : "");
const failed = (e: unknown) => say(refusalText(e, getApiErrorMessage(e)));

/** The form of an endpoint, new or being changed. */
function EndpointForm({ page, start, busy, onSave, onCancel, testid }: { page: Webhooks; start?: Endpoint; busy: boolean; onSave: (body: EndpointBody) => void; onCancel?: () => void; testid: string }) {
  const lang = adminLang() as Lang;
  const [name, setName] = useState(start?.name ?? "");
  const [url, setUrl] = useState(start?.url ?? "");
  const [events, setEvents] = useState<string[]>(start?.events ?? []);
  const [some, setSome] = useState(!!start?.tables.length);
  const [tables, setTables] = useState<string[]>(start?.tables ?? []);
  const rows = events.some((e) => e.startsWith("row."));
  const problem = urlProblem(url);
  const ready = !!name.trim() && !!url.trim() && !problem && events.length > 0 && (!rows || !some || tables.length > 0);
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const group = (title: string, ids: string[]) => (
    <fieldset className="space-y-1.5">
      <legend className={note}>{title}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {ids.map((id) => (
          <label key={id} className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={events.includes(id)} onChange={() => setEvents((l) => toggle(l, id))} data-testid={`${testid}-event-${id}`} />
            {say(eventName(id))}
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <form
      className="space-y-4"
      data-testid={testid}
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSave({ name: name.trim(), url: url.trim(), events, tables: rows && some ? tables : [] });
      }}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        <label className="block text-xs text-white/70">
          {say("الإسم|Name|שם")}
          <input className={`${field} mt-1 w-full`} value={name} maxLength={page.limits.name} onChange={(e) => setName(e.target.value)} placeholder={say("مثلاً: نظام المحاسبة|For example: the accounts system|לדוגמה: מערכת הנהלת החשבונות")} data-testid={`${testid}-name`} />
        </label>
        <label className="block text-xs text-white/70">
          {say("العنوان اللي بينبعتله|The address it is sent to|הכתובת שאליה נשלח")}
          <input className={`${field} mt-1 w-full`} dir="ltr" value={url} maxLength={page.limits.url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/store" data-testid={`${testid}-url`} />
          {problem ? (
            <span className="mt-1 block text-xs text-amber-300" data-testid={`${testid}-url-problem`}>
              {say(problem)}
            </span>
          ) : null}
        </label>
      </div>
      {group(say("سطور جداولك|Rows of your tables|שורות בטבלאות שלך"), page.events.rows)}
      {rows ? (
        <div className="space-y-1.5 rounded-xl bg-white/3 p-3" data-testid={`${testid}-tables`}>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={!some} onChange={() => setSome(false)} data-testid={`${testid}-tables-all`} />
              {say("كل جداولك|Every table of yours|כל הטבלאות שלך")}
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={some} onChange={() => setSome(true)} data-testid={`${testid}-tables-some`} />
              {say("جداول محددة|Chosen tables|טבלאות נבחרות")}
            </label>
          </div>
          {some ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
              {page.tables.length ? (
                page.tables.map((t) => (
                  <label key={t.id} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={tables.includes(t.id)} onChange={() => setTables((l) => toggle(l, t.id))} data-testid={`${testid}-table-${t.slug}`} />
                    <bdi>{t.name[lang] || t.name.ar || t.name.en || t.name.he || t.slug}</bdi>
                  </label>
                ))
              ) : (
                <span className={note}>{say("ما في جداول لسا.|No tables yet.|אין עדיין טבלאות.")}</span>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {group(say("أحداث المتجر|The store's events|אירועי החנות"), page.events.store)}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" type="submit" disabled={!ready} isLoading={busy} data-testid={`${testid}-save`}>
          {start ? say("احفظ|Save|שמור") : say("ضيف العنوان|Add the endpoint|הוסף כתובת")}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="ghost" type="button" onClick={onCancel} data-testid={`${testid}-cancel`}>
            {say("إلغاء|Cancel|ביטול")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** An endpoint's deliveries, the newest first: how each went, what was sent, and a way to send it again. */
function DeliveryLog({ endpoint, canWrite }: { endpoint: Endpoint; canWrite: boolean }) {
  const lang = adminLang() as Lang;
  const qc = useQueryClient();
  const key = ["webhooks", "deliveries", endpoint.id];
  const q = useQuery({ queryKey: key, queryFn: () => API.getDeliveries(endpoint.id) });
  const [older, setOlder] = useState<{ list: Delivery[]; next: string | null } | null>(null);
  const [open, setOpen] = useState<{ id: string; body: string } | null>(null);
  const more = useMutation({ mutationFn: (before: string) => API.getDeliveries(endpoint.id, before), onSuccess: (out) => setOlder((o) => ({ list: [...(o?.list ?? []), ...out.deliveries], next: out.next })), onError: (e) => toast.error(failed(e)) });
  const look = useMutation({ mutationFn: (id: string) => API.getDelivery(endpoint.id, id), onSuccess: (d) => setOpen({ id: d.id, body: d.body }), onError: (e) => toast.error(failed(e)) });
  const again = useMutation({
    mutationFn: (id: string) => API.resendDelivery(endpoint.id, id),
    onSuccess: () => {
      toast.success(say("رجع للدور: رح ينبعت هلأ|Back in the queue: it is being sent|חזר לתור: נשלח כעת"));
      setOlder(null);
      void qc.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (e) => toast.error(failed(e)),
  });
  const list = [...(q.data?.deliveries ?? []), ...(older?.list ?? [])];
  const next = older ? older.next : q.data?.next ?? null;
  const pretty = (body: string) => {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  };
  return (
    <div className="mt-4 space-y-2 border-t border-white/10 pt-4" data-testid={`log-${endpoint.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{say("سجل التسليم|Delivery log|יומן המסירות")}</div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOlder(null);
            void q.refetch();
          }}
          data-testid={`log-refresh-${endpoint.id}`}
        >
          {say("حدّث|Refresh|רענן")}
        </Button>
      </div>
      {q.isLoading ? <Spinner /> : null}
      {q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : null}
      {q.data && !list.length ? (
        <div className={note} data-testid={`log-empty-${endpoint.id}`}>
          {say("ما انبعت شي لسا. جرّب بزر «جرّب» فوق.|Nothing was sent yet. Try it with “Try” above.|עדיין לא נשלח דבר. נסה עם ״נסה״ למעלה.")}
        </div>
      ) : null}
      {list.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="text-start text-xs text-white/55">
                <th className="px-2 py-1 text-start font-medium">{say("إمتى|When|מתי")}</th>
                <th className="px-2 py-1 text-start font-medium">{say("الحدث|Event|אירוע")}</th>
                <th className="px-2 py-1 text-start font-medium">{say("شو صار|How it went|מה קרה")}</th>
                <th className="px-2 py-1 text-start font-medium">{say("محاولات|Tries|ניסיונות")}</th>
                <th className="px-2 py-1 text-start font-medium">{say("الجواب|Answer|תשובה")}</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className="border-t border-white/6 align-top" data-testid={`delivery-${d.id}`} data-status={d.status}>
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs text-white/70">{when(d.createdAt, lang)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{say(eventName(d.event))}</td>
                  <td className="px-2 py-1.5">
                    <span className={`${chip} ${d.status === "sent" ? "bg-emerald-500/20 text-emerald-200" : d.status === "failed" ? "bg-red-500/20 text-red-200" : "bg-amber-500/20 text-amber-200"}`}>{say(deliveryState(d))}</span>
                    {d.error ? <span className="mt-1 block max-w-md whitespace-normal wrap-break-word text-xs text-white/65">{errorText(d.error, lang)}</span> : null}
                    {d.status === "waiting" && d.nextAt ? <span className="mt-1 block text-xs text-white/55">{`${say("المحاولة الجاية|Next try|הניסיון הבא")}: ${when(d.nextAt, lang)}`}</span> : null}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{d.attempts}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs tabular-nums text-white/70" dir="ltr">
                    {d.code ?? "—"}
                    {d.ms !== null ? ` · ${d.ms} ms` : ""}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <Button size="sm" variant="ghost" onClick={() => (open?.id === d.id ? setOpen(null) : look.mutate(d.id))} data-testid={`delivery-body-${d.id}`}>
                      {open?.id === d.id ? say("سكّر|Close|סגור") : say("شو انبعت|What was sent|מה נשלח")}
                    </Button>
                    {canWrite && d.status !== "waiting" ? (
                      <Button size="sm" variant="ghost" onClick={() => again.mutate(d.id)} disabled={again.isPending || !endpoint.enabled} data-testid={`delivery-resend-${d.id}`}>
                        {say("ابعته مرة ثانية|Send again|שלח שוב")}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {open ? (
        <pre className="max-h-72 overflow-auto rounded-xl bg-black/40 p-3 text-xs" dir="ltr" data-testid="delivery-sent">
          {pretty(open.body)}
        </pre>
      ) : null}
      {next ? (
        <Button size="sm" variant="ghost" onClick={() => more.mutate(next)} isLoading={more.isPending} data-testid={`log-more-${endpoint.id}`}>
          {say("الأقدم|Older|ישנים יותר")}
        </Button>
      ) : null}
    </div>
  );
}

export default function WebhooksPage() {
  const lang = adminLang() as Lang;
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("connections:write");
  const [confirm, dialog] = useConfirm();
  const q = useQuery({ queryKey: ["webhooks", "page"], queryFn: API.getWebhooks });
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [logOf, setLogOf] = useState<string | null>(null);
  /** The secret that was just made: on screen until it is put away, never asked for again. */
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ["webhooks"] });
  const onError = (e: unknown) => toast.error(failed(e));

  const add = useMutation({
    mutationFn: (body: EndpointBody) => API.addEndpoint(body),
    onSuccess: (out) => {
      setSecret({ name: out.endpoint.name, value: out.secret });
      setFormKey((k) => k + 1);
      refresh();
    },
    onError,
  });
  const change = useMutation({
    mutationFn: (v: { id: string; body: Parameters<typeof API.changeEndpoint>[1] }) => API.changeEndpoint(v.id, v.body),
    onSuccess: () => {
      setEditing(null);
      refresh();
    },
    onError,
  });
  const renew = useMutation({
    mutationFn: (id: string) => API.renewSecret(id),
    onSuccess: (out) => {
      setSecret({ name: out.endpoint.name, value: out.secret });
      refresh();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => API.removeEndpoint(id),
    onSuccess: (_out, id) => {
      // Its log (if open) goes with it: only the list is read again, never the deliveries of what is gone.
      setLogOf((open) => (open === id ? null : open));
      void qc.invalidateQueries({ queryKey: ["webhooks", "page"] });
    },
    onError,
  });
  const ping = useMutation({
    mutationFn: (id: string) => API.pingEndpoint(id),
    onSuccess: (out, id) => {
      if (out.ok) toast.success(say("وصلت التجربة|The test arrived|הבדיקה הגיעה"), { description: `${out.code} · ${out.ms} ms` });
      else toast.error(say("التجربة ما وصلت|The test didn't arrive|הבדיקה לא הגיעה"), { description: errorText(out.error, lang) });
      setLogOf(id);
      refresh();
    },
    onError,
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError || !q.data) return <div className="p-6 text-sm text-red-200">{getApiErrorMessage(q.error)}</div>;
  const page = q.data;
  const names = new Map(page.tables.map((t) => [t.id, t.name[lang] || t.name.ar || t.name.en || t.name.he || t.slug]));
  const waits = page.limits.waits;

  return (
    <div className="space-y-5 p-4 md:p-6" data-testid="webhooks-page">
      <header>
        <h1 className="text-xl font-semibold">{say("Webhooks طالعة|Outgoing webhooks|Webhooks יוצאים")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-white/60">
          {say(
            "لما يصير شي بالمتجر (سطر انضاف بجدول، طلب جديد…) المتجر بيبعت الخبر لعنوان من عندك: نظام محاسبة، شركة شحن، أو أي برنامج ثاني. كل رسالة موقّعة عشان اللي بيستقبلها يتأكد إنها من متجرك، واللي ما توصل بتنعاد لحالها.|When something happens in the store (a row added to a table, a new order…) the store sends word to an address of yours: an accounts system, a shipping company, any other program. Each message is signed, so whoever receives it can be sure it is from your store, and one that doesn't arrive is tried again by itself.|כשמשהו קורה בחנות (שורה נוספה לטבלה, הזמנה חדשה…) החנות שולחת הודעה לכתובת שלך: מערכת הנהלת חשבונות, חברת משלוחים, או כל תוכנה אחרת. כל הודעה חתומה, כך שהמקבל יכול לוודא שהיא מהחנות שלך, והודעה שלא הגיעה נשלחת שוב מעצמה.",
          )}
        </p>
      </header>

      {/* The secret, once. */}
      {secret ? (
        <section className="rounded-2xl border border-accent-500/50 bg-accent-500/8 p-5" data-testid="secret-box">
          <div className="text-sm font-medium">{`${say("مفتاح التوقيع لـ|The signing secret of|סוד החתימה של")} «${secret.name}»`}</div>
          <p className="mt-1 text-xs text-white/75">
            {say(
              "انسخه هلأ وحطّه عند اللي بيستقبل: هاي المرة الوحيدة اللي بيبين فيها. إذا ضاع، جدّده من زر «مفتاح جديد».|Copy it now and give it to the receiver: this is the only time it is shown. If it is lost, renew it with “New secret”.|העתק אותו עכשיו ותן אותו למקבל: זו הפעם היחידה שהוא מוצג. אם אבד, חדש אותו עם ״סוד חדש״.",
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input className={`${field} w-full max-w-xl font-mono`} dir="ltr" readOnly value={secret.value} onFocus={(e) => e.currentTarget.select()} data-testid="secret-value" />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(secret.value).then(
                  () => toast.success(say("انتسخ|Copied|הועתק")),
                  () => toast.error(say("ما انتسخ: حدّده وانسخه بإيدك|Not copied: select it and copy it yourself|לא הועתק: סמן והעתק ידנית")),
                );
              }}
              data-testid="secret-copy"
            >
              {say("انسخ|Copy|העתק")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSecret(null)} data-testid="secret-done">
              {say("نسخته، سكّر|I copied it, close|העתקתי, סגור")}
            </Button>
          </div>
        </section>
      ) : null}

      {/* The endpoints. */}
      <section className={box} data-testid="endpoints">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{say("العناوين|Endpoints|כתובות")}</h2>
          <span className={note}>{`${page.endpoints.length} / ${page.limits.endpoints}`}</span>
        </div>
        {!page.endpoints.length ? (
          <div className={note} data-testid="endpoints-empty">
            {say("ما في عناوين لسا. ضيف أول واحد تحت.|No endpoints yet. Add the first one below.|אין עדיין כתובות. הוסף את הראשונה למטה.")}
          </div>
        ) : null}
        <ul className="space-y-3">
          {page.endpoints.map((e) => {
            const state = stateOf(e);
            return (
              <li key={e.id} className="rounded-xl border border-white/10 bg-white/3 p-4" data-testid={`endpoint-${e.id}`} data-state={state}>
                {editing === e.id ? (
                  <EndpointForm page={page} start={e} busy={change.isPending} testid="edit" onCancel={() => setEditing(null)} onSave={(body) => change.mutate({ id: e.id, body })} />
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 basis-72">
                        <div className="flex flex-wrap items-center gap-2">
                          <bdi className="font-medium">{e.name}</bdi>
                          <span className={`${chip} ${state === "on" ? "bg-emerald-500/20 text-emerald-200" : state === "paused" ? "bg-red-500/20 text-red-200" : ""}`} data-testid={`state-${e.id}`}>
                            {say(STATE_NAME[state])}
                          </span>
                          {e.waiting ? <span className={`${chip} bg-amber-500/20 text-amber-200`}>{`${e.waiting} ${say("بيستنوا|waiting|ממתינות")}`}</span> : null}
                        </div>
                        {/* (The address reads left to right, and still sits where the card's lines begin.) */}
                        <div className="mt-1 break-all font-mono text-xs text-white/70">
                          <bdi dir="ltr">{e.url}</bdi>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {e.events.map((id) => (
                            <span key={id} className={chip}>
                              {say(eventName(id))}
                            </span>
                          ))}
                        </div>
                        {tablesText(e, names, lang) ? <div className={`${note} mt-1.5`}>{`${say("الجداول|Tables|טבלאות")}: ${tablesText(e, names, lang)}`}</div> : null}
                        <div className={`${note} mt-1.5`}>
                          {`${say("المفتاح بيخلص بـ|The secret ends in|הסוד מסתיים ב־")} `}
                          <span className="font-mono" dir="ltr">{`…${e.hint}`}</span>
                          {e.lastOkAt ? ` · ${say("آخر وصول|Last arrived|הגיע לאחרונה")}: ${when(e.lastOkAt, lang)}` : ""}
                        </div>
                        {e.lastError && (!e.lastOkAt || (e.lastErrorAt ?? "") > e.lastOkAt) ? (
                          <div className="mt-1.5 wrap-break-word text-xs text-red-200" data-testid={`error-${e.id}`}>
                            {`${say("آخر مشكلة|Last problem|הבעיה האחרונה")} (${when(e.lastErrorAt, lang)}): ${errorText(e.lastError, lang)}`}
                          </div>
                        ) : null}
                        {state === "paused" ? (
                          <div className="mt-1.5 text-xs text-red-200">
                            {say(
                              `${page.limits.pauseAfter} تسليمات ورا بعض فشلت للآخر، فتوقّف وما بينبعتله شي. لما يرجع العنوان يجاوب، اكبس «شغّل».|${page.limits.pauseAfter} deliveries in a row failed for good, so it was paused and nothing is sent to it. When the address answers again, press “Switch on”.|${page.limits.pauseAfter} מסירות ברצף נכשלו סופית, ולכן הושהה ולא נשלח אליו דבר. כשהכתובת תחזור לענות, לחץ ״הפעל״.`,
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {canWrite ? (
                          <Button size="sm" variant="secondary" onClick={() => ping.mutate(e.id)} isLoading={ping.isPending && ping.variables === e.id} data-testid={`ping-${e.id}`}>
                            {say("جرّب|Try|נסה")}
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => setLogOf(logOf === e.id ? null : e.id)} aria-expanded={logOf === e.id} data-testid={`log-open-${e.id}`}>
                          {say("السجل|Log|יומן")}
                        </Button>
                        {canWrite ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(e.id)} data-testid={`edit-${e.id}`}>
                              {say("عدّل|Edit|ערוך")}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => change.mutate({ id: e.id, body: { enabled: !e.enabled } })} data-testid={`toggle-${e.id}`}>
                              {e.enabled ? say("وقّف|Switch off|כבה") : say("شغّل|Switch on|הפעל")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (
                                  await confirm({
                                    title: say("مفتاح جديد|A new secret|סוד חדש"),
                                    message: say(
                                      `المفتاح القديم لـ «${e.name}» بيبطل يوقّع فوراً: اللي بيستقبل لازم ياخد الجديد، وإلا رح يرفض الرسائل.|The old secret of “${e.name}” stops signing at once: the receiver has to take the new one, or it will refuse the messages.|הסוד הישן של ״${e.name}״ מפסיק לחתום מיד: המקבל צריך לקבל את החדש, אחרת ידחה את ההודעות.`,
                                    ),
                                    confirmText: say("جدّد المفتاح|Renew the secret|חדש את הסוד"),
                                    variant: "warning",
                                  })
                                )
                                  renew.mutate(e.id);
                              }}
                              data-testid={`renew-${e.id}`}
                            >
                              {say("مفتاح جديد|New secret|סוד חדש")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (await confirm({ title: say("حذف العنوان|Delete the endpoint|מחיקת הכתובת"), message: say(`«${e.name}» بينحذف مع سجل تسليمه، وما بينبعتله شي بعدها.|“${e.name}” is deleted with its delivery log, and nothing is sent to it after that.|״${e.name}״ יימחק יחד עם יומן המסירות שלו, ולא יישלח אליו דבר לאחר מכן.`) })) remove.mutate(e.id);
                              }}
                              data-testid={`remove-${e.id}`}
                            >
                              {say("احذف|Delete|מחק")}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {logOf === e.id ? <DeliveryLog endpoint={e} canWrite={canWrite} /> : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {canWrite ? (
        <section className={box}>
          <h2 className="mb-3 text-base font-semibold">{say("عنوان جديد|A new endpoint|כתובת חדשה")}</h2>
          {page.endpoints.length >= page.limits.endpoints ? (
            <div className={note}>{say("وصلت لأكتر عدد من العناوين.|That is as many endpoints as there can be.|זה מספר הכתובות המרבי.")}</div>
          ) : (
            <EndpointForm key={formKey} page={page} busy={add.isPending} testid="new" onSave={(body) => add.mutate(body)} />
          )}
        </section>
      ) : null}

      {/* What a receiver needs to know. */}
      <section className={box} data-testid="how">
        <h2 className="text-base font-semibold">{say("للي بيستقبل: كيف بيتأكد وشو بيوصله|For the receiver: how to check, and what arrives|למקבל: איך לבדוק ומה מגיע")}</h2>
        <ul className={`${note} mt-2 list-disc space-y-1 ps-5`}>
          <li>{say("كل رسالة طلب POST فيه JSON: رقم الحدث (id)، اسمه (event)، وقته (at)، وبياناته (data).|Each message is a POST with JSON: the event's id, its name (event), its time (at) and its data.|כל הודעה היא POST עם JSON: מזהה האירוע (id), שמו (event), זמנו (at) והנתונים (data).")}</li>
          <li>{say("جاوب بـ 2xx بسرعة (خلال 8 ثواني) لنعتبرها وصلت. أي جواب ثاني أو ما في جواب = بتنعاد.|Answer 2xx quickly (within 8 seconds) for it to count as arrived. Any other answer, or none, and it is tried again.|ענה 2xx במהירות (תוך 8 שניות) כדי שייחשב שהגיע. כל תשובה אחרת, או אין תשובה, והיא נשלחת שוב.")}</li>
          <li data-testid="how-retries">
            {`${say("المحاولات|Tries|ניסיונות")}: ${page.limits.tries}. ${say("الانتظار بينها|The waits between them|ההמתנות ביניהן")}: ${waits.map((s) => waitText(s, lang)).join(lang === "ar" ? "، " : ", ")} (${say("المجموع حوالي|about|בערך")} ${waitText(totalWait(waits), lang)}).`}
          </li>
          <li>{say("نفس الرسالة ممكن توصل مرتين (إعادة بعد جواب ضاع): ميّزها برقمها بترويسة webhook-id واعملها مرة وحدة.|The same message may arrive twice (a retry after an answer that got lost): tell it by its webhook-id header and act on it once.|אותה הודעה עשויה להגיע פעמיים (ניסיון חוזר אחרי תשובה שאבדה): זהה אותה לפי הכותרת webhook-id ופעל פעם אחת.")}</li>
          <li>{say(`سجل التسليم بينحفظ ${page.limits.keepDays} يوم.|The delivery log is kept ${page.limits.keepDays} days.|יומן המסירות נשמר ${page.limits.keepDays} ימים.`)}</li>
        </ul>
        <div className={`${note} mt-3`}>{say("التحقق من التوقيع (Node؛ نفس الخطوات بأي لغة):|Checking the signature (Node; the same steps in any language):|בדיקת החתימה (Node; אותם שלבים בכל שפה):")}</div>
        <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-black/40 p-3 text-xs" dir="ltr" data-testid="verify-snippet">
          {VERIFY_SNIPPET}
        </pre>
      </section>
      {dialog}
    </div>
  );
}
