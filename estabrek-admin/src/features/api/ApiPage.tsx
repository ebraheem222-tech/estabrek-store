// الـ API والمفاتيح (B4): every table the owner opens gets an API of its own, with no code.
// Here: which tables the outside reaches and for what (closed until opened, act by act), ready
// requests to copy, and the keys (made here, shown once, revoked here).
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { adminLang } from "../../lib/lang";
import { env } from "../../config/env";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as API from "../../api/dataApi.api";
import type { Act, ApiKey, ApiPage as Page, ApiTable, TableAccess, Who } from "../../api/dataApi.api";
import { ACTS, ACT_NAME, ACT_RIGHT, STATE, WHO_NAME, accessLine, accessWarnings, agoWords, draftBody, draftOf, draftProblem, examples, fullUrl, nameOf, newDraft, scopesLine, whoChoices, type KeyDraft } from "./apiText";
import { dateText } from "../data/dataText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const KEY = ["data-api"];
const field = "h-10 rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(say("انتسخ|Copied|הועתק"));
  } catch {
    toast.error(say("ما قدر ينسخ؛ حدّده وانسخه بإيدك|Couldn't copy; select it and copy by hand|ההעתקה נכשלה; סמנו והעתיקו ידנית"));
  }
}

export default function ApiPage() {
  const qc = useQueryClient();
  const lang = adminLang();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("api:write");
  const q = useQuery({ queryKey: KEY, queryFn: API.getApi });
  const [confirm, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState<ApiKey | "new" | null>(null);
  const [secret, setSecret] = useState<{ name: string; secret: string } | null>(null);
  const onError = (e: unknown) => toast.error(say("ما زبط|That didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });
  const patch = (change: (page: Page) => Page) => qc.setQueryData<Page>(KEY, (page) => (page ? change(page) : page));
  const putKey = (key: ApiKey) => patch((page) => ({ ...page, keys: page.keys.some((k) => k.id === key.id) ? page.keys.map((k) => (k.id === key.id ? key : k)) : [key, ...page.keys] }));

  const access = useMutation({
    mutationFn: (v: { id: string; access: TableAccess }) => API.setAccess(v.id, v.access),
    onSuccess: (table) => {
      patch((page) => ({ ...page, tables: page.tables.map((t) => (t.id === table.id ? table : t)) }));
      toast.success(say("انحفظ|Saved|נשמר"), { description: accessLine(table.access, lang) });
    },
    onError,
  });
  const revoke = useMutation({ mutationFn: API.revokeKey, onSuccess: ({ key }) => putKey(key), onError });
  const remove = useMutation({ mutationFn: API.deleteKey, onSuccess: (_ok, id) => patch((page) => ({ ...page, keys: page.keys.filter((k) => k.id !== id) })), onError });

  const url = useMemo(() => (q.data ? fullUrl(q.data.base, env.VITE_API_BASE_URL, window.location.origin) : ""), [q.data]);

  if (!q.data) return <div className={box}>{q.isError ? <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div> : <Spinner />}</div>;
  const d = q.data;

  const askRevoke = async (key: ApiKey) => {
    const yes = await confirm({
      title: say("إلغاء المفتاح؟|Revoke the key?|לבטל את המפתח?"),
      message: say("«{name}» بيوقف عن الشغل فوراً، وما بيرجع. أي برنامج بيستعمله بيصير ينرفض.|“{name}” stops working at once and can't be brought back. Anything using it will be refused.|«{name}» יפסיק לעבוד מיד ולא ניתן להחזירו. כל מה שמשתמש בו יידחה.").replace("{name}", key.name),
      confirmText: say("إلغاء المفتاح|Revoke|ביטול המפתח"),
    });
    if (yes) revoke.mutate(key.id);
  };
  const askRemove = async (key: ApiKey) => {
    const yes = await confirm({
      title: say("حذف المفتاح؟|Delete the key?|למחוק את המפתח?"),
      message: say("«{name}» بينشال من القائمة وبيوقف عن الشغل.|“{name}” leaves the list and stops working.|«{name}» יוסר מהרשימה ויפסיק לעבוד.").replace("{name}", key.name),
    });
    if (yes) remove.mutate(key.id);
  };

  return (
    <div className="space-y-4 pb-24" data-testid="api-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("الـ API والمفاتيح|API & keys|API ומפתחות")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "كل جدول بتفتحه من هون بيصير إله API لحاله، بدون ولا سطر كود: قراءة مع فلترة وترتيب، إضافة، تعديل، وحذف. كل الجداول مسكّرة لحد ما تفتحها. البرامج التانية بتدخل بمفتاح بتعمله من هون.|Every table you open here gets an API of its own, with no code: reading with filters and sorting, adding, changing and deleting. Every table is closed until you open it. Other programs get in with a key you make here.|כל טבלה שתפתחו כאן מקבלת API משלה, בלי קוד: קריאה עם סינון ומיון, הוספה, עריכה ומחיקה. כל הטבלאות סגורות עד שתפתחו אותן. תוכנות אחרות נכנסות עם מפתח שיוצרים כאן.",
          )}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/60">{say("عنوان الـ API:|The API's address:|כתובת ה-API:")}</span>
          <bdi dir="ltr" className="break-all font-mono text-white/90" data-testid="api-base">
            {url}
          </bdi>
          <Button size="sm" variant="ghost" onClick={() => void copy(url)}>
            {say("انسخ|Copy|העתקה")}
          </Button>
        </div>
        <p className="mt-2 text-xs text-white/50">
          {say(
            "المفتاح بينبعت بالترويسة X-Api-Key، مش بالعنوان. وحدود السيرفر العامة لكل IP (من «حماية السيرفر») بتضل شغّالة فوق حد كل مفتاح.|A key is sent in the X-Api-Key header, never in the address. The server's own limits per IP (Server protection) still apply on top of each key's limit.|המפתח נשלח בכותרת X-Api-Key, לא בכתובת. מגבלות השרת הכלליות לכל IP (הגנת השרת) ממשיכות לחול מעל המגבלה של כל מפתח.",
          )}
        </p>
      </section>

      <section className={box} data-testid="api-tables">
        <h2 className="font-semibold">{say("الجداول|Tables|טבלאות")}</h2>
        {d.tables.length ? (
          <ul className="mt-3 space-y-3">
            {d.tables.map((t) => (
              <TableCard key={t.id} table={t} url={url} limits={d.limits} canWrite={canWrite} busy={access.isPending && access.variables?.id === t.id} onChange={(next) => access.mutate({ id: t.id, access: next })} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/60">{say("ما في جداول لسا. اعمل جدول من «المجموعات» وبيبيّن هون.|No tables yet. Make one in Collections and it shows here.|עדיין אין טבלאות. צרו טבלה ב«אוספים» והיא תופיע כאן.")}</p>
        )}
      </section>

      <section className={box} data-testid="api-keys">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{say("المفاتيح|Keys|מפתחות")}</h2>
          <Button size="sm" variant="primary" disabled={!canWrite || d.keys.length >= d.limits.keys} onClick={() => setEditing("new")} data-testid="key-new">
            {say("مفتاح جديد|New key|מפתח חדש")}
          </Button>
        </div>
        {d.keys.length ? (
          <ul className="mt-3 divide-y divide-white/10">
            {d.keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-start justify-between gap-3 py-3" data-testid={`key-${k.id}`}>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{k.name}</span>
                    <bdi dir="ltr" className="font-mono text-xs text-white/60">{`${k.prefix}…`}</bdi>
                    <Badge variant={STATE[k.state].variant} size="sm">
                      <span data-testid={`key-state-${k.id}`}>{say(STATE[k.state].name)}</span>
                    </Badge>
                  </div>
                  <div className="text-sm text-white/70" data-testid={`key-scopes-${k.id}`}>
                    {scopesLine(k.scopes, d.tables, lang)}
                  </div>
                  <div className="text-xs text-white/50">
                    {[
                      say("{n} طلب بالدقيقة|{n} requests a minute|{n} בקשות בדקה").replace("{n}", String(k.perMinute)),
                      `${say("آخر استعمال|Last used|שימוש אחרון")}: ${agoWords(k.lastUsedAt, d.now, lang)}`,
                      k.expiresAt ? `${say("بيخلص|Ends|מסתיים")}: ${dateText(k.expiresAt, lang)}` : say("ما إله مدة|No end date|ללא תאריך סיום"),
                      k.createdBy ? `${say("عمله|Made by|נוצר על ידי")}: ${k.createdBy}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {k.state !== "revoked" ? (
                    <>
                      <Button size="sm" variant="secondary" disabled={!canWrite} onClick={() => setEditing(k)} data-testid={`key-edit-${k.id}`}>
                        {say("تعديل|Edit|עריכה")}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={!canWrite} onClick={() => void askRevoke(k)} data-testid={`key-revoke-${k.id}`}>
                        {say("إلغاء|Revoke|ביטול")}
                      </Button>
                    </>
                  ) : null}
                  <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => void askRemove(k)} data-testid={`key-delete-${k.id}`}>
                    {say("حذف|Delete|מחיקה")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/60" data-testid="keys-empty">
            {say("ما في مفاتيح لسا. الجداول المفتوحة «للجميع» بتشتغل بدون مفتاح؛ الباقي بدو مفتاح.|No keys yet. Tables open to everyone work without one; the rest need a key.|עדיין אין מפתחות. טבלאות שפתוחות לכולם עובדות בלי מפתח; השאר צריכות מפתח.")}
          </p>
        )}
      </section>

      {editing ? (
        <KeyDialog
          value={editing}
          page={d}
          onClose={() => setEditing(null)}
          onSaved={(key, made) => {
            putKey(key);
            setEditing(null);
            if (made) setSecret({ name: key.name, secret: made });
            else toast.success(say("انحفظ|Saved|נשמר"));
          }}
        />
      ) : null}

      <Modal
        open={Boolean(secret)}
        title={say("هاد مفتاحك: انسخه هلّق|This is your key: copy it now|זה המפתח שלכם: העתיקו אותו עכשיו")}
        onClose={() => setSecret(null)}
        closeText={say("إغلاق|Close|סגירה")}
        disableBackdropClose
        footer={
          <Button variant="primary" onClick={() => setSecret(null)} data-testid="secret-done">
            {say("نسخته|I copied it|העתקתי")}
          </Button>
        }
      >
        <div className="space-y-3" data-testid="secret-dialog">
          <p className="text-sm text-amber-300">
            {say(
              "ما رح تشوفه مرة تانية: السيرفر ما بيحفظ المفتاح نفسه. إذا ضاع، الغيه واعمل واحد جديد.|You won't see it again: the server doesn't keep the key itself. If it's lost, revoke it and make a new one.|לא תראו אותו שוב: השרת לא שומר את המפתח עצמו. אם הוא אבד, בטלו אותו וצרו חדש.",
            )}
          </p>
          <div className="flex items-center gap-2">
            <bdi dir="ltr" className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-sm" data-testid="secret-value">
              {secret?.secret}
            </bdi>
            <Button size="sm" variant="secondary" onClick={() => secret && void copy(secret.secret)} data-testid="secret-copy">
              {say("انسخ|Copy|העתקה")}
            </Button>
          </div>
        </div>
      </Modal>
      {confirmDialog}
    </div>
  );
}

function TableCard({ table, url, limits, canWrite, busy, onChange }: { table: ApiTable; url: string; limits: Page["limits"]; canWrite: boolean; busy: boolean; onChange: (next: TableAccess) => void }) {
  const lang = adminLang();
  const [open, setOpen] = useState(false);
  const warnings = accessWarnings(table.access, limits, lang);
  const list = examples(table, url, lang);
  return (
    <li className="rounded-xl border border-white/10 p-4" data-testid={`table-${table.slug}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{nameOf(table.name, table.slug, lang)}</div>
          <bdi dir="ltr" className="break-all font-mono text-xs text-white/60">{`${url}/${table.slug}`}</bdi>
        </div>
        <Badge variant={table.open ? "success" : "default"} size="sm">
          <span data-testid={`table-open-${table.slug}`}>{table.open ? say("مفتوح|Open|פתוחה") : say("مسكّر|Closed|סגורה")}</span>
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {ACTS.map((act: Act) => (
          <label key={act} className="space-y-1 text-xs text-white/60">
            <span>{say(ACT_NAME[act])}</span>
            <select
              className={`${field} w-full`}
              value={table.access[act]}
              disabled={!canWrite || busy}
              onChange={(e) => onChange({ ...table.access, [act]: e.target.value as Who })}
              data-testid={`access-${table.slug}-${act}`}
            >
              {whoChoices(act).map((who) => (
                <option key={who} value={who} style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}>
                  {say(WHO_NAME[who])}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {warnings.map((w) => (
        <p key={w} className="mt-2 text-xs text-amber-300" data-testid={`table-warning-${table.slug}`}>
          {w}
        </p>
      ))}
      {table.open ? (
        <div className="mt-3">
          <button type="button" className="text-xs text-white/70 underline" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid={`examples-${table.slug}`}>
            {open ? say("خبّي الأمثلة|Hide the examples|הסתרת הדוגמאות") : say("كيف بتناديه؟ (أمثلة جاهزة)|How to call it (ready examples)|איך קוראים לזה? (דוגמאות מוכנות)")}
          </button>
          {open ? (
            <div className="mt-3 space-y-3" data-testid={`examples-list-${table.slug}`}>
              {list.map((ex) => (
                <div key={ex.id}>
                  <div className="flex items-center justify-between gap-2 text-xs text-white/60">
                    <span>{ex.title}</span>
                    <button type="button" className="underline" onClick={() => void copy(ex.code)}>
                      {say("انسخ|Copy|העתקה")}
                    </button>
                  </div>
                  <pre dir="ltr" className="mt-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-left text-xs" data-testid={`example-${table.slug}-${ex.id}`}>
                    {ex.code}
                  </pre>
                </div>
              ))}
              <div className="text-xs text-white/60">
                <div>{say("حقول الجدول (الإسم اللي بينكتب بالطلب ونوعه):|The table's fields (the name a request uses, and its kind):|שדות הטבלה (השם שנכתב בבקשה והסוג):")}</div>
                <bdi dir="ltr" className="mt-1 block break-words font-mono text-white/80" data-testid={`fields-${table.slug}`}>
                  {table.fields.map((f) => `${f.id}${f.required ? "*" : ""}: ${f.type}`).join(" · ")}
                </bdi>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function KeyDialog({ value, page, onClose, onSaved }: { value: ApiKey | "new"; page: Page; onClose: () => void; onSaved: (key: ApiKey, secret?: string) => void }) {
  const lang = adminLang();
  const isNew = value === "new";
  const [draft, setDraft] = useState<KeyDraft>(() => (isNew ? newDraft(page.limits) : draftOf(value)));
  const [error, setError] = useState("");
  const set = (change: Partial<KeyDraft>) => {
    setDraft((was) => ({ ...was, ...change }));
    setError("");
  };
  const save = useMutation({
    mutationFn: async () => (isNew ? API.createKey(draftBody(draft)) : { ...(await API.updateKey(value.id, draftBody(draft))), secret: undefined }),
    onSuccess: (out) => onSaved(out.key, out.secret),
    onError: (e) => setError(getApiErrorMessage(e)),
  });
  const submit = () => {
    const problem = draftProblem(draft, page.limits, new Date().toISOString().slice(0, 10), lang);
    if (problem) setError(problem);
    else save.mutate();
  };
  const toggle = <T,>(list: T[], item: T, on: boolean) => (on ? [...new Set([...list, item])] : list.filter((x) => x !== item));

  return (
    <Modal
      open
      title={isNew ? say("مفتاح جديد|New key|מפתח חדש") : say("تعديل المفتاح|Edit the key|עריכת המפתח")}
      onClose={onClose}
      closeText={say("إلغاء|Cancel|ביטול")}
      footer={
        <Button variant="primary" onClick={submit} isLoading={save.isPending} data-testid="key-save">
          {isNew ? say("اعمل المفتاح|Make the key|יצירת המפתח") : say("حفظ|Save|שמירה")}
        </Button>
      }
    >
      <div className="space-y-4" data-testid="key-dialog">
        <Input label={say("إسم المفتاح (لمين هو؟)|The key's name (who is it for?)|שם המפתח (למי הוא?)")} value={draft.name} maxLength={page.limits.name} onValueChange={(v) => set({ name: v })} data-testid="key-name" />

        <fieldset className="rounded-xl border border-white/10 p-3">
          <legend className="px-1 text-sm font-medium">{say("شو بيقدر يعمل|What it may do|מה מותר לו")}</legend>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
            {ACTS.map((act) => (
              <label key={act} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-current" checked={draft.acts.includes(act)} onChange={(e) => set({ acts: toggle(draft.acts, act, e.target.checked) })} data-testid={`key-act-${act}`} />
                {say(ACT_RIGHT[act])}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-white/10 p-3">
          <legend className="px-1 text-sm font-medium">{say("على أي جداول|On which tables|על אילו טבלאות")}</legend>
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-current" checked={draft.all} onChange={(e) => set({ all: e.target.checked })} data-testid="key-all" />
            {say("كل الجداول (والجداول اللي بتنعمل بعدين)|Every table (and those made later)|כל הטבלאות (וגם אלה שייווצרו בהמשך)")}
          </label>
          {!draft.all ? (
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2" data-testid="key-tables">
              {page.tables.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-current" checked={draft.tables.includes(t.id)} onChange={(e) => set({ tables: toggle(draft.tables, t.id, e.target.checked) })} data-testid={`key-table-${t.slug}`} />
                  {nameOf(t.name, t.slug, lang)}
                </label>
              ))}
            </div>
          ) : null}
          <p className="mt-2 text-xs text-white/50">{say("المفتاح بيوصل بس للجداول المفتوحة «بمفتاح» أو «للجميع» من فوق.|A key only reaches tables opened above, to keys or to everyone.|המפתח מגיע רק לטבלאות שנפתחו למעלה, למפתחות או לכולם.")}</p>
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={say("طلبات بالدقيقة|Requests a minute|בקשות בדקה")}
            type="number"
            min={page.limits.perMinute.min}
            max={page.limits.perMinute.max}
            value={draft.perMinute}
            onValueChange={(v) => set({ perMinute: v })}
            data-testid="key-per-minute"
          />
          <Input label={say("بيخلص يوم (اختياري)|Ends on (optional)|מסתיים ביום (לא חובה)")} type="date" value={draft.expires} onValueChange={(v) => set({ expires: v })} data-testid="key-expires" />
        </div>
        {error ? (
          <p className="text-sm text-red-300" data-testid="key-error">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
