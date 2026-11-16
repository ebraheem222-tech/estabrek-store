// الاتصالات والأسرار (F5): what the owner's functions may reach outside the store.
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
import type { Connections, Secret } from "../../api/connections.api";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const note = "text-xs text-white/70";

/** A site as it is typed: small letters, no "https://", nothing after the name. */
export const tidySite = (raw: string) => raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
/** Whether it is a site's name ("api.example.com", or "*.example.com" for every name under it). */
export const siteOk = (host: string) => host.length <= 200 && /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(host);
/** A secret's name as it is typed: capitals, digits and _. */
export const tidySecretName = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+/, "").slice(0, 40);
export const secretNameOk = (name: string) => /^[A-Z][A-Z0-9_]{1,39}$/.test(name);
/** Why the server refused, in the page's words. */
export function refusalText(e: unknown): string {
  const data = (e as { response?: { data?: { error?: string; details?: { functions?: string[] } } } })?.response?.data;
  if (data?.error === "SITE_INVALID") return say("الموقع بينكتب باسمه: api.example.com، أو ‎*.example.com لكل الأسماء تحته|A site is written by its name: api.example.com, or *.example.com for every name under it|אתר נכתב בשמו: api.example.com, או ‎*.example.com לכל השמות שמתחתיו");
  if (data?.error === "SECRET_TAKEN") return say("في سر بهالاسم. غيّر قيمته من سطره|A secret has this name already. Give it a new value on its own line|כבר יש סוד בשם הזה. אפשר לתת לו ערך חדש בשורה שלו");
  if (data?.error === "SECRET_USED") return `${say("في functions بتستعمله:|Functions use it:|פונקציות משתמשות בו:")} ${(data.details?.functions ?? []).join("، ")}`;
  return getApiErrorMessage(e);
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

export default function ConnectionsPage() {
  const qc = useQueryClient();
  const canWrite = useAuth().hasPermission("connections:write");
  const [confirm, dialog] = useConfirm();
  const q = useQuery({ queryKey: ["connections"], queryFn: API.getConnections });
  const [host, setHost] = useState("");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

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
              change.mutate(() => API.addSite({ host: tidy }));
              setHost("");
            }}
          >
            <input className={`${field} min-w-[14rem] flex-1`} dir="ltr" value={host} placeholder="api.telegram.org" onChange={(e) => setHost(e.target.value)} aria-label={say("اسم الموقع|The site's name|שם האתר")} data-testid="site-new" />
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
                change.mutate(() => API.addSecret({ name: secretName, value, sites: picked }));
                setName("");
                setValue("");
                setPicked([]);
              }}
              data-testid="secret-form"
            >
              <div className="text-sm font-medium">{say("سر جديد|A new secret|סוד חדש")}</div>
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${field} w-56 font-mono`} dir="ltr" value={name} placeholder="TELEGRAM_TOKEN" onChange={(e) => setName(e.target.value)} aria-label={say("اسم السر|The secret's name|שם הסוד")} data-testid="secret-new-name" />
                <input className={`${field} min-w-[14rem] flex-1`} type="password" autoComplete="new-password" dir="ltr" value={value} maxLength={limits.value} placeholder={say("القيمة (بتنكتب وما بتنعرض بعدها)|The value (written, never shown again)|הערך (נכתב ולא מוצג שוב)")} onChange={(e) => setValue(e.target.value)} aria-label={say("قيمة السر|The secret's value|ערך הסוד")} data-testid="secret-new-value" />
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
