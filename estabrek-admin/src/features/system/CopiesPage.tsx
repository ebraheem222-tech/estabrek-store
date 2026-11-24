// نسخ الزباين (platform plan, stage 6.1): a client's copy of this store, a whole store of its own (database,
// server, shop, admin) in the owner's own Neon, Railway, Vercel and Cloudflare accounts, built from the same
// code. The page shows what making one will do and asks each service whether what it needs is there; then, when
// the owner says so, the server makes it (lib/pressMake.ts) and the page follows it step by step (CopyRuns.tsx).
// Only the store's owner sees it (the server says the same).
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { useAuthStore } from "../../store/auth.store";
import { say } from "../../studio/say";
import * as API from "../../api/copies.api";
import { PRESS_KINDS, type CopyPlan, type PlanAsk, type PressKind } from "../../api/copies.api";
import { kindName } from "../connections/readyText";
import { checkName, factName, fromText, makeRefusedText, refusedText, startSiteName, stepName, tidyName, whyText } from "./copiesText";
import { adminLang } from "../../lib/lang";
import { SITES, SITE_FIELDS, type SiteField } from "../../studio/templates/sites";
import { siteKindName } from "../setup/siteSetup";
import { CopyRuns } from "./CopyRuns";
import { SiteAsks } from "./SiteAsks";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm";
const label = "text-xs text-white/70";

/** What each service's token must be allowed to do, for a copy to be made with it. */
const MAY: Record<PressKind, string> = {
  neon: "مفتاح شخصي أو مفتاح منظمة (مش مفتاح مشروع واحد)|A personal or an organization key (not one project's)|מפתח אישי או מפתח ארגון (לא של פרויקט אחד)",
  railway: "توكن حسابك أو توكن workspace (مش توكن مشروع)|Your account's or a workspace's token (not a project's)|טוקן של החשבון שלך או של workspace (לא של פרויקט)",
  vercel: "توكن بصلاحية كاملة على الفريق اللي رح تنعمل فيه المشاريع|A token with full access to the team the projects go in|טוקן עם גישה מלאה לצוות שבו ייווצרו הפרויקטים",
  cloudflare: "توكن فيه Account ← Cloudflare Pages ← Edit، ومعه Account ID|A token with Account → Cloudflare Pages → Edit, and an Account ID|טוקן עם Account ← Cloudflare Pages ← Edit, ו-Account ID",
};

export default function CopiesPage() {
  const admin = useAuthStore((s) => s.admin);
  const owner = admin?.owner === true || admin?.role === "SUPERADMIN";
  const view = useQuery({ queryKey: ["copies"], queryFn: API.getCopies, enabled: owner });
  const [name, setName] = useState("");
  const [server, setServer] = useState("");
  const [site, setSite] = useState("");
  const [region, setRegion] = useState("aws-eu-central-1");
  // The whole site the client's first setup opens on ("": they pick it there, an online store or a site).
  const [startSite, setStartSite] = useState("");
  const [repo, setRepo] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [via, setVia] = useState<Partial<Record<PressKind, string>>>({});
  const [plan, setPlan] = useState<CopyPlan | null>(null);
  const [asked, setAsked] = useState<PlanAsk | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const planning = useMutation({
    mutationFn: (body: PlanAsk) => API.planCopy(body),
    onMutate: (body) => {
      setRefused(null);
      setAsked(body);
    },
    onSuccess: setPlan,
    onError: (e) => {
      setPlan(null);
      const data = (e as { response?: { data?: { error?: string; message?: string; details?: { at?: string } } } })?.response?.data;
      setRefused(refusedText(data) ?? getApiErrorMessage(e));
    },
  });

  if (!owner)
    return (
      <div className={box} data-testid="copies-page">
        <h1 className="text-lg font-semibold">{say("نسخ الزباين|Client copies|עותקי לקוחות")}</h1>
        <p className="mt-2 text-sm text-white/60" data-testid="copies-owner-only">
          {say("هاي الصفحة لصاحب المتجر بس: منها بتنعمل متاجر كاملة بحساباته.|This page is the store owner's alone: whole stores are made from it, in their accounts.|העמוד הזה הוא של בעל החנות בלבד: ממנו נוצרות חנויות שלמות, בחשבונות שלו.")}
        </p>
      </div>
    );
  if (view.isLoading) return <Spinner />;
  if (view.isError || !view.data) return <div className="text-sm text-red-200">{getApiErrorMessage(view.error)}</div>;
  const v = view.data;
  const serverName = tidyName(server);
  const siteName = tidyName(site);
  const repoNow = repo ?? v.repo?.repo ?? "";
  const branchNow = branch ?? v.repo?.branch ?? "main";
  const picked = (k: PressKind) => via[k] ?? (v.connections[k].length === 1 ? v.connections[k][0].id : "");
  const can = !!name.trim() && serverName.length >= v.limits.name.min && siteName.length >= v.limits.name.min && !!repoNow.trim();

  return (
    <div className="space-y-4 pb-10" data-testid="copies-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("نسخ الزباين|Client copies|עותקי לקוחות")}</h1>
        <p className="mt-1 text-sm text-white/70">
          {say(
            "نسخة لزبون هي متجر كامل إله لحاله: قاعدة بياناته وسيرفره ومتجره ولوحة إدارته، بحساباتك إنت على Neon و Railway و Vercel و Cloudflare، ومن نفس الكود. كل دمج بيوصلها لحالها، وأول نشر بيجهّز قاعدتها الفاضية. كل نسخة بتزيد مصروف شهري على حساباتك.|A client's copy is a whole store of its own: its database, server, shop and admin, in your own Neon, Railway, Vercel and Cloudflare accounts, built from the same code. Every merge reaches it by itself, and its first deploy sets up its empty database. Each copy adds a monthly cost to your accounts.|עותק ללקוח הוא חנות שלמה משלו: מסד הנתונים, השרת, החנות ולוח הניהול שלו, בחשבונות Neon, Railway, Vercel ו-Cloudflare שלך, מאותו קוד. כל מיזוג מגיע אליו מעצמו, והפריסה הראשונה מכינה את מסד הנתונים הריק שלו. כל עותק מוסיף עלות חודשית לחשבונות שלך.",
          )}
        </p>
        <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80" data-testid="copies-how">
          {say(
            "أول شي بتشوف شو رح ينعمل، وكل خدمة بتنسأل إذا الأسماء فاضية: هاد ما بيعمل ولا شي. بعدين، لما تكتب إيميل صاحب المتجر الجديد وكلمة سره وتأكّد، السيرفر بيعمل النسخة خطوة خطوة وإنت بتتابع: القاعدة، السيرفر (وعنوانه أول ما يجهز)، حساب صاحب المتجر، المتجر، والإدارة.|First you see what would be made, and each service is asked whether the names are free: that makes nothing. Then, once you type the new store owner's email and password and confirm, the server makes the copy step by step while you watch: the database, the server (its address as soon as it has one), the owner's account, the shop, and the admin.|קודם רואים מה ייווצר, וכל שירות נשאל אם השמות פנויים: זה לא יוצר כלום. אחר כך, כשכותבים את האימייל והסיסמה של הבעלים החדשים ומאשרים, השרת יוצר את העותק שלב אחר שלב ואתם עוקבים: מסד הנתונים, השרת (והכתובת שלו ברגע שיש לו), החשבון של הבעלים, החנות, והניהול.",
          )}
        </p>
      </section>

      <SiteAsks via={Object.fromEntries(PRESS_KINDS.map((k) => [k, picked(k)]).filter(([, id]) => !!id))} regions={v.regions} onMade={setOpen} />
      <CopyRuns open={open} onOpen={setOpen} />

      <section className={box} data-testid="copies-connections">
        <h2 className="font-semibold">{say("بأي حسابات|In which accounts|באילו חשבונות")}</h2>
        <p className="mt-1 text-xs text-white/70">
          {say("كل خدمة بتنعمل باتصالها الجاهز. التوكن لازم يكون مسموحله يعمل مشاريع، مش بس يقرأ:|Each service is made through its ready connection. Its token must be allowed to make projects, not only to read:|כל שירות נוצר דרך החיבור המוכן שלו. הטוקן שלו צריך הרשאה ליצור פרויקטים, לא רק לקרוא:")}{" "}
          <Link to="/admin/connections" className="underline">
            {say("الاتصالات والأسرار|Connections & secrets|חיבורים וסודות")}
          </Link>
        </p>
        <ul className="mt-3 divide-y divide-white/10">
          {PRESS_KINDS.map((k) => {
            const list = v.connections[k];
            return (
              <li key={k} className="flex flex-wrap items-center justify-between gap-2 py-2" data-testid={`copies-conn-${k}`} data-count={list.length}>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{kindName(k)}</div>
                  <div className="text-xs text-white/60">{say(MAY[k])}</div>
                </div>
                {list.length === 0 ? (
                  <Link to="/admin/connections" className="text-sm text-amber-300 underline" data-testid={`copies-conn-${k}-none`}>
                    {say("مش موصول: وصّله|Not connected: connect it|לא מחובר: חברו אותו")}
                  </Link>
                ) : list.length === 1 ? (
                  <bdi className="text-sm">{list[0].name}</bdi>
                ) : (
                  <select className={`${field} w-auto`} value={picked(k)} onChange={(e) => setVia({ ...via, [k]: e.target.value })} aria-label={kindName(k)} data-testid={`copies-via-${k}`}>
                    <option value="">{say("اختار اتصال…|Pick a connection…|בחרו חיבור…")}</option>
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <form
        className={`${box} space-y-3`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!can) return;
          const chosen = Object.fromEntries(PRESS_KINDS.map((k) => [k, picked(k)]).filter(([, id]) => id));
          planning.mutate({ label: name.trim(), server: serverName, site: siteName, region, repo: repoNow.trim(), branch: branchNow.trim() || "main", ...(startSite ? { startSite } : {}), via: chosen });
        }}
        data-testid="copies-form"
      >
        <h2 className="font-semibold">{say("النسخة الجديدة|The new copy|העותק החדש")}</h2>
        <label className="block space-y-1">
          <span className={label}>{say("اسم الزبون أو المتجر|The client's or the store's name|השם של הלקוח או החנות")}</span>
          <input className={field} dir="auto" value={name} maxLength={v.limits.label} onChange={(e) => setName(e.target.value)} placeholder={say("متجر الورد|Rose store|חנות הוורדים")} data-testid="copies-label" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className={label}>{say("اسم السيرفر|The server's name|שם השרת")}</span>
            <input className={field} dir="ltr" value={server} onChange={(e) => setServer(e.target.value)} placeholder="rose-api" data-testid="copies-server" />
            <span className="block text-xs text-white/60" data-testid="copies-server-url">
              {serverName ? <bdi dir="ltr">{`https://${serverName}.up.railway.app`}</bdi> : say("حروف إنجليزي صغيرة وأرقام و -|small letters, digits and -|אותיות לועזיות קטנות, ספרות ו-")}
            </span>
          </label>
          <label className="block space-y-1">
            <span className={label}>{say("اسم الموقع|The site's name|שם האתר")}</span>
            <input className={field} dir="ltr" value={site} onChange={(e) => setSite(e.target.value)} placeholder="rose" data-testid="copies-site" />
            <span className="block text-xs text-white/60" data-testid="copies-site-url">
              {siteName ? (
                <>
                  {say("المتجر:|The shop:|החנות:")} <bdi dir="ltr">{`https://${siteName}.vercel.app`}</bdi> · {say("الإدارة:|The admin:|הניהול:")} <bdi dir="ltr">{`https://${siteName}-admin.pages.dev`}</bdi>
                </>
              ) : (
                say("حروف إنجليزي صغيرة وأرقام و -|small letters, digits and -|אותיות לועזיות קטנות, ספרות ו-")
              )}
            </span>
          </label>
        </div>
        <StartSitePicker value={startSite} onChange={setStartSite} />
        <label className="block space-y-1">
          <span className={label}>{say("منطقة قاعدة البيانات|The database's region|האזור של מסד הנתונים")}</span>
          <select className={field} dir="ltr" value={region} onChange={(e) => setRegion(e.target.value)} data-testid="copies-region">
            {v.regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <details className="rounded-xl border border-white/10 p-3" open={!v.repo}>
          <summary className="cursor-pointer text-sm">{say("من وين بتنبنى|What it is built from|ממה הוא נבנה")}</summary>
          <p className="mt-1 text-xs text-white/60">{say("نفس المستودع والفرع تبع هالمتجر، فكل دمج بيوصل للنسخة لحاله.|The same repository and branch as this store, so every merge reaches the copy by itself.|אותו מאגר וענף כמו של החנות הזו, כך שכל מיזוג מגיע לעותק מעצמו.")}</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className={label}>{say("المستودع على GitHub|The GitHub repository|המאגר ב-GitHub")}</span>
              <input className={field} dir="ltr" value={repoNow} onChange={(e) => setRepo(e.target.value)} placeholder="owner/name" data-testid="copies-repo" />
            </label>
            <label className="block space-y-1">
              <span className={label}>{say("الفرع|The branch|הענף")}</span>
              <input className={field} dir="ltr" value={branchNow} onChange={(e) => setBranch(e.target.value)} data-testid="copies-branch" />
            </label>
          </div>
        </details>
        <Button type="submit" variant="primary" disabled={!can} isLoading={planning.isPending} data-testid="copies-plan-ask">
          {say("شوف شو رح ينعمل|See what would be made|לראות מה ייווצר")}
        </Button>
        {refused ? (
          <p className="text-sm text-red-300" role="alert" data-testid="copies-refused">
            {refused}
          </p>
        ) : null}
      </form>

      {plan ? (
        <PlanView
          plan={plan}
          ask={asked}
          onChecks={(checks) => {
            // A service said no since the plan: its check shown again, and why nothing was made.
            setPlan({ ...plan, checks, ready: checks.every((c) => c.ok) });
            setRefused(makeRefusedText({ error: "COPY_NOT_READY" }));
          }}
          onMade={(id) => {
            setPlan(null);
            setOpen(id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : null}
    </div>
  );
}

/** What the client's first setup opens on: they pick it there (an online store or a whole site), or a site picked now. */
function StartSitePicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const lang = adminLang();
  const fields = (Object.keys(SITE_FIELDS) as SiteField[]).filter((f) => SITES.some((s) => s.field === f));
  return (
    <label className="block space-y-1">
      <span className={label}>{say("شو بيكون موقع الزبون؟|What will the client's site be?|מה יהיה האתר של הלקוח?")}</span>
      <select className={field} value={value} onChange={(e) => onChange(e.target.value)} data-testid="copies-start-site">
        <option value="">{say("بيختاره هو بأول إعداد (متجر أونلاين أو موقع كامل)|They pick it at their first setup (an online store or a whole site)|הוא יבחר בהגדרה הראשונה (חנות אונליין או אתר שלם)")}</option>
        {fields.map((f) => (
          <optgroup key={f} label={SITE_FIELDS[f][lang]}>
            {SITES.filter((s) => s.field === f).map((s) => (
              <option key={s.key} value={s.key}>
                {siteKindName(s, lang)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="block text-xs text-white/60" data-testid="copies-start-site-note">
        {value
          ? say("أول إعداد إله بيفتح على هالموقع مختار، وهو بيكتب تفاصيله (الاسم، التلفون…) وبيقدر يغيّره.|Their first setup opens with this site picked; they type their own details (name, phone…) and may still change it.|ההגדרה הראשונה שלו נפתחת עם האתר הזה בחור; הוא כותב את הפרטים שלו (שם, טלפון…) ועדיין יכול לשנות.")
          : say("أول إعداد إله بيسأله «شو نوع موقعك؟».|Their first setup asks them «What kind of site is it?».|ההגדרה הראשונה שלו שואלת «איזה סוג אתר זה?».")}
      </span>
    </label>
  );
}

function PlanView({ plan, ask, onChecks, onMade }: { plan: CopyPlan; ask: PlanAsk | null; onChecks: (checks: CopyPlan["checks"]) => void; onMade: (id: string) => void }) {
  return (
    <section className={`${box} space-y-4`} data-testid="copies-plan">
      <div>
        <h2 className="font-semibold">
          {say("شو رح ينعمل لـ|What would be made for|מה ייווצר עבור")} <bdi>{plan.input.label}</bdi>
        </h2>
        <p className={`mt-1 text-sm ${plan.ready ? "text-emerald-300" : "text-amber-300"}`} data-testid="copies-ready" data-ready={plan.ready}>
          {plan.ready ? say("كل خدمة جاوبت إنه كل شي جاهز.|Every service answered that all is ready.|כל שירות ענה שהכול מוכן.") : say("في أشياء لازم تتصلّح قبل ما تنعمل النسخة:|Some things need mending before the copy can be made:|יש דברים שצריך לתקן לפני שאפשר ליצור את העותק:")}
        </p>
        <ul className="mt-2 space-y-1">
          {plan.checks.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 text-sm" data-testid={`copies-check-${c.id}`} data-ok={c.ok}>
              <span aria-hidden className={c.ok ? "text-emerald-300" : "text-red-300"}>
                {c.ok ? "✓" : "✗"}
              </span>
              <span>{checkName(c.id)}</span>
              {!c.ok && c.why ? <span className="text-xs text-red-200">{whyText(c.why)}</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <ol className="space-y-3">
        {plan.steps.map((s, i) => (
          <li key={s.id} className="rounded-xl border border-white/10 p-3" data-testid={`copies-step-${s.id}`}>
            <h3 className="text-sm font-semibold">
              {i + 1}. {stepName(s.id)}
            </h3>
            <dl className="mt-1 grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[max-content_1fr]">
              {s.facts.map(([k, val]) => (
                <div key={k} className="contents">
                  <dt className="text-white/60">{factName(k)}</dt>
                  <dd>
                    {k === "opens" ? <bdi data-testid="copies-opens">{startSiteName(val)}</bdi> : <bdi dir={k === "project" ? "auto" : "ltr"}>{val}</bdi>}
                  </dd>
                </div>
              ))}
            </dl>
            {s.variables?.length ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-white/80">{say(`المتغيرات (${s.variables.length})|Variables (${s.variables.length})|משתנים (${s.variables.length})`)}</summary>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {s.variables.map((x) => (
                    <li key={x.name} className="flex flex-wrap gap-x-2" data-testid={`copies-var-${s.id}-${x.name}`}>
                      <bdi dir="ltr" className="font-mono text-white/90">
                        {x.name}
                      </bdi>
                      {x.value !== undefined ? (
                        <bdi dir="ltr" className="break-all text-white/70">
                          {x.value}
                        </bdi>
                      ) : (
                        <span className="text-white/60">{fromText(x.from)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </li>
        ))}
      </ol>
      {plan.ready && ask ? <MakeBox plan={plan} ask={ask} onChecks={onChecks} onMade={onMade} /> : null}
    </section>
  );
}

/**
 * Making it: the new store's owner (made on its server once it answers), and a yes in so many words (it costs
 * money every month); then begun, and the page follows it above.
 */
function MakeBox({ plan, ask, onChecks, onMade }: { plan: CopyPlan; ask: PlanAsk; onChecks: (checks: CopyPlan["checks"]) => void; onMade: (id: string) => void }) {
  const qc = useQueryClient();
  const [agree, setAgree] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [shown, setShown] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim());
  const longEnough = password.length >= 10;
  const same = password === again;
  const can = agree && !!ownerName.trim() && emailOk && longEnough && same;
  const making = useMutation({
    mutationFn: () => API.makeCopy({ ...ask, via: plan.via, owner: { name: ownerName.trim(), email: ownerEmail.trim(), password } }),
    onMutate: () => setRefused(null),
    onSuccess: (copy) => {
      setPassword("");
      setAgain("");
      qc.setQueryData(["copy-made", copy.id], copy);
      void qc.invalidateQueries({ queryKey: ["copies-made"] });
      onMade(copy.id);
    },
    onError: (e) => {
      const data = (e as { response?: { data?: { error?: string; details?: { checks?: CopyPlan["checks"] } } } })?.response?.data;
      if (data?.error === "COPY_NOT_READY" && data.details?.checks) return onChecks(data.details.checks);
      setRefused(makeRefusedText(data) ?? getApiErrorMessage(e));
    },
  });
  return (
    <div className="space-y-3 rounded-xl border border-accent-400/30 bg-accent-500/5 p-3" data-testid="copies-make">
      <fieldset className="space-y-2" data-testid="copies-owner">
        <legend className="text-sm font-semibold">{say("صاحب المتجر الجديد|The new store's owner|הבעלים של החנות החדשה")}</legend>
        <p className="text-xs text-white/60">
          {say(
            "حسابه بينعمل على السيرفر الجديد أول ما يشتغل (بعد أول نشر إله، كم دقيقة)، وبعدين بيفوت فيه على لوحة إدارته. كلمة السر بتنحفظ مقفولة لحد ما ينعمل الحساب، وبعدها بتنمسح.|Their account is made on the new server as soon as it runs (after its first deploy, a few minutes), then they sign in with it on their admin. The password is kept sealed until the account is made, then wiped.|החשבון שלו נוצר בשרת החדש ברגע שהוא עולה (אחרי הפריסה הראשונה, כמה דקות), ואז הוא נכנס איתו ללוח הניהול שלו. הסיסמה נשמרת נעולה עד שהחשבון נוצר, ואז נמחקת.",
          )}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className={label}>{say("الاسم|Name|שם")}</span>
            <input className={field} dir="auto" value={ownerName} maxLength={80} onChange={(e) => setOwnerName(e.target.value)} autoComplete="off" data-testid="copies-owner-name" />
          </label>
          <label className="block space-y-1">
            <span className={label}>{say("الإيميل|Email|אימייל")}</span>
            <input className={field} dir="ltr" type="email" value={ownerEmail} maxLength={254} onChange={(e) => setOwnerEmail(e.target.value)} autoComplete="off" data-testid="copies-owner-email" />
          </label>
          <label className="block space-y-1">
            <span className={label}>{say("كلمة السر (10 حروف عالأقل)|Password (at least 10 letters)|סיסמה (לפחות 10 תווים)")}</span>
            <input className={field} dir="ltr" type={shown ? "text" : "password"} value={password} maxLength={200} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" data-testid="copies-owner-password" />
          </label>
          <label className="block space-y-1">
            <span className={label}>{say("كلمة السر مرة تانية|The password again|הסיסמה שוב")}</span>
            <input className={field} dir="ltr" type={shown ? "text" : "password"} value={again} maxLength={200} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" data-testid="copies-owner-again" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" checked={shown} onChange={(e) => setShown(e.target.checked)} data-testid="copies-owner-show" />
          {say("إظهار كلمة السر|Show the password|הצגת הסיסמה")}
        </label>
        {password && !longEnough ? <p className="text-xs text-amber-300" data-testid="copies-owner-short">{say("كلمة السر 10 حروف عالأقل.|The password is at least 10 letters.|הסיסמה היא לפחות 10 תווים.")}</p> : null}
        {again && !same ? <p className="text-xs text-amber-300" data-testid="copies-owner-differ">{say("كلمتين السر مش متل بعض.|The two passwords differ.|שתי הסיסמאות שונות.")}</p> : null}
      </fieldset>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-testid="copies-agree" />
        <span>
          {say(
            "بعرف إنه هيك بتنعمل مشاريع حقيقية بحساباتي على Neon و Railway و Vercel و Cloudflare، وإنها بتزيد مصروف شهري.|I know this makes real projects in my Neon, Railway, Vercel and Cloudflare accounts, and that they add a monthly cost.|אני יודע/ת שזה יוצר פרויקטים אמיתיים בחשבונות Neon, Railway, Vercel ו-Cloudflare שלי, ושהם מוסיפים עלות חודשית.",
          )}
        </span>
      </label>
      <Button type="button" variant="primary" disabled={!can} isLoading={making.isPending} onClick={() => making.mutate()} data-testid="copies-make-go">
        {say("اعمل النسخة|Make the copy|ליצור את העותק")}
      </Button>
      {refused ? (
        <p className="text-sm text-red-300" role="alert" data-testid="copies-make-refused">
          {refused}
        </p>
      ) : null}
    </div>
  );
}
