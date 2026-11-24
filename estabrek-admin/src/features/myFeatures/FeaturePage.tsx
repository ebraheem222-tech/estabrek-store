// ميزاتي: one feature. Its three parts in the order a feature is built: its tables (where its data
// is kept), its logic (functions: what happens, in steps), its pages in the shop. Each part lists
// what the feature holds as it is now, with the way into its own builder; a thing can be added
// from what exists or made new here. The whole feature is switched on or off at the top.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as FeaturesAPI from "../../api/myFeatures.api";
import type { Feature, FeatureKind } from "../../api/myFeatures.api";
import { createCollection } from "../../api/collections.api";
import { createFunction } from "../../api/functions.api";
import { tableName } from "../functions/fnDraft";
import { STATE_NAME, stateOf } from "../functions/fnText";
import { OFF_TEXT, PAGE_STATUS, SLUG, STEPS, apiLine, fieldsText, rowsText, slugFrom, stepsDone, triggersText } from "./featuresText";
import { FeatureRemove, TemplateExport, TemplateLine } from "./FeatureTemplates";
import { FeatureUpgrade } from "./FeatureUpgrade";
import { SiteHome } from "./SiteHome";
import { SiteSettings } from "./SiteSettings";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const FN_BADGE = { draft: "default", changed: "warning", live: "success", off: "default" } as const;
const PAGE_BADGE = { DRAFT: "default", PUBLISHED: "success", ARCHIVED: "default" } as const;

export default function FeaturePage() {
  const { id = "" } = useParams();
  const lang = adminLang();
  const qc = useQueryClient();
  const go = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("features:write");
  // A template's work reaches the functions and pages too.
  const canExport = hasPermission("functions:read") && hasPermission("pages:read");
  const canRemoveAll = canWrite && hasPermission("functions:write") && hasPermission("pages:write");
  const [confirm, dialog] = useConfirm();
  const q = useQuery({ queryKey: ["my-features", id], queryFn: () => FeaturesAPI.getFeature(id), enabled: !!id });
  const f = q.data;

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!f) return;
    setName(f.name);
    setNote(f.note ?? "");
  }, [f?.id, f?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const took = (saved: Feature) => {
    qc.setQueryData(["my-features", id], saved);
    void qc.invalidateQueries({ queryKey: ["my-features"], exact: true });
    void qc.invalidateQueries({ queryKey: ["site-panels"] });
  };
  const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });
  const save = useMutation({ mutationFn: (body: { name?: string; note?: string | null; enabled?: boolean }) => FeaturesAPI.saveFeature(id, body), onSuccess: took, onError });
  const add = useMutation({ mutationFn: ({ kind, refId }: { kind: FeatureKind; refId: string }) => FeaturesAPI.addFeatureItem(id, kind, refId), onSuccess: took, onError });
  const remove = useMutation({ mutationFn: ({ kind, refId }: { kind: FeatureKind; refId: string }) => FeaturesAPI.removeFeatureItem(id, kind, refId), onSuccess: took, onError });
  const drop = useMutation({
    mutationFn: () => FeaturesAPI.deleteFeature(id),
    onSuccess: () => {
      // It is gone: its own page isn't asked for again, the list is.
      qc.removeQueries({ queryKey: ["my-features", id] });
      void qc.invalidateQueries({ queryKey: ["my-features"], exact: true });
      void qc.invalidateQueries({ queryKey: ["site-panels"] });
      go("/admin/my-features");
    },
    onError,
  });
  // Made here: the thing is made where it lives (the tables, the functions), then joins the feature.
  const newTable = useMutation({
    mutationFn: async ({ title, slug }: { title: string; slug: string }) => {
      const made = await createCollection({ slug, name: { ar: title, en: title, he: title }, fields: [{ id: "title", type: "text", name: { ar: "العنوان", en: "Title", he: "כותרת" }, required: true }] });
      return FeaturesAPI.addFeatureItem(id, "table", made.id);
    },
    onSuccess: (saved) => {
      took(saved);
      void qc.invalidateQueries({ queryKey: ["functions"] });
    },
    onError,
  });
  const newFn = useMutation({
    mutationFn: async (title: string) => FeaturesAPI.addFeatureItem(id, "function", (await createFunction({ name: title })).id),
    onSuccess: (saved) => {
      took(saved);
      void qc.invalidateQueries({ queryKey: ["functions"] });
    },
    onError,
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError || !f) return <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>;

  const dirty = name.trim() !== f.name || note.trim() !== (f.note ?? "");
  const done = stepsDone(f);
  const busy = add.isPending || remove.isPending;
  const leave = (kind: FeatureKind, refId: string) => (
    <button type="button" className="h-8 shrink-0 px-2 text-xs text-white/60 underline hover:text-red-300" disabled={busy} onClick={() => remove.mutate({ kind, refId })} data-testid={`feature-${kind}-${refId}-remove`}>
      {say("شيله من الميزة|Take it out of the feature|להוציא מהתכונה")}
    </button>
  );

  return (
    <div className="space-y-4 pb-24" data-testid="feature-page" data-on={f.enabled}>
      <section className={box}>
        <Link to="/admin/my-features" className="text-xs text-white/60 underline">
          {say("← كل الميزات|← All features|← כל התכונות")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input className={`${field} h-10 flex-1 text-base font-semibold`} value={name} disabled={!canWrite} maxLength={80} onChange={(e) => setName(e.target.value)} aria-label={say("اسم الميزة|The feature's name|שם התכונה")} data-testid="feature-name" />
          <label className="flex items-center gap-2 text-sm">
            <ToggleSwitch checked={f.enabled} label={say("الميزة شغّالة|The feature is on|התכונה פועלת")} disabled={!canWrite} busy={save.isPending} onChange={(enabled) => save.mutate({ enabled })} />
            <span data-testid="feature-state">{f.enabled ? say("شغّالة|On|פועלת") : say("موقّفة|Off|כבויה")}</span>
          </label>
        </div>
        <input className={`${field} mt-2 w-full`} value={note} disabled={!canWrite} maxLength={300} placeholder={say("شو بتعمل هالميزة؟ (ملاحظة إلك)|What does this feature do? (a note for you)|מה התכונה הזאת עושה? (הערה בשבילך)")} onChange={(e) => setNote(e.target.value)} data-testid="feature-note" />
        <TemplateLine feature={f} />
        {canWrite && dirty ? (
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={() => save.mutate({ name: name.trim() || f.name, note: note.trim() || null })} isLoading={save.isPending} data-testid="feature-save">
              {say("احفظ الاسم|Save the name|שמירת השם")}
            </Button>
          </div>
        ) : null}
        {!f.enabled ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200" data-testid="feature-off">
            {say(OFF_TEXT)}
          </p>
        ) : null}
        {/* The order a feature is built in, and how far this one is. */}
        <ol className="mt-4 grid gap-2 sm:grid-cols-3" data-testid="feature-steps">
          {STEPS.map((s, k) => (
            <li key={s.kind} className="rounded-xl border border-white/10 p-3" data-testid={`feature-step-${s.kind}`} data-done={done[s.kind]}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${done[s.kind] ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10"}`}>{done[s.kind] ? "✓" : k + 1}</span>
                {say(s.title)}
              </div>
              <div className="mt-1 text-xs text-white/60">{say(s.what)}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- 1. Its tables ---------------- */}
      {/* A whole site: its first page as the store's home. */}
      {f.panel?.length ? (
        <section className={`${box} flex flex-wrap items-center justify-between gap-3`} data-testid="feature-panel">
          <div>
            <h2 className="font-medium">{say("لوحة الموقع|The site's panel|לוח האתר")}</h2>
            <p className="mt-1 text-sm text-white/70">{say("صفحاته بقائمة الإدارة تحت اسمه: شغل اليوم، القوائم، والإعدادات.|Its own pages in the admin's menu, under its name: today's work, its lists and its settings.|העמודים שלו בתפריט הניהול, תחת השם שלו: העבודה של היום, הרשימות וההגדרות.")}</p>
          </div>
          <Link className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15" to={`/admin/site/${encodeURIComponent(f.id)}/${encodeURIComponent(f.panel[0].key)}`} data-testid="feature-panel-open">
            {say("افتح لوحة الموقع|Open the site's panel|לפתוח את לוח האתר")}
          </Link>
        </section>
      ) : null}
      <SiteHome feature={f} />
      <SiteSettings feature={f} />

      <section className={box} data-testid="feature-tables">
        <h2 className="font-medium">{say("١. الجداول|1. Tables|1. טבלאות")}</h2>
        <p className="mt-1 text-xs text-white/60">{say("البيانات اللي بتحفظها الميزة: كل جدول بحقوله وسطوره. ومن «الـ API» بتحدد مين بيقرأ وبيكتب فيه (مثلاً: الزبون سطوره هو بس).|The data the feature keeps: each table with its fields and rows. From “the API” you say who reads and writes it (for one, a shopper their own rows only).|הנתונים שהתכונה שומרת: כל טבלה עם השדות והשורות שלה. מ«ה-API» קובעים מי קורא וכותב בה (למשל: לקוח רק את השורות שלו).")}</p>
        <ul className="mt-3 divide-y divide-white/10">
          {f.tables.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3" data-testid={`feature-table-${t.id}`}>
              <div className="min-w-0 space-y-0.5">
                <div className="font-medium">{tableName(t, lang)}</div>
                <div className="text-xs text-white/60">
                  {rowsText(t.rows, lang)} · {fieldsText(t.fields, lang)} · <span data-testid={`feature-table-${t.id}-api`}>{apiLine(t.api, lang)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Link to={`/admin/data?table=${encodeURIComponent(t.slug)}`} className="underline">
                  {say("السطور|Rows|שורות")}
                </Link>
                <Link to="/admin/collections" className="underline">
                  {say("الحقول|Fields|שדות")}
                </Link>
                <Link to="/admin/data-api" className="underline">
                  API
                </Link>
                {canWrite ? leave("table", t.id) : null}
              </div>
            </li>
          ))}
        </ul>
        {!f.tables.length ? <p className="text-sm text-white/60">{say("ما في جداول بهالميزة لسا.|No tables in this feature yet.|עדיין אין טבלאות בתכונה הזאת.")}</p> : null}
        {canWrite ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AddExisting kind="table" options={f.free.tables.map((t) => ({ id: t.id, label: tableName(t, lang) }))} busy={busy} onPick={(refId) => add.mutate({ kind: "table", refId })} />
            {hasPermission("pages:write") ? <NewTable busy={newTable.isPending} onMake={(title, slug) => newTable.mutate({ title, slug })} /> : null}
          </div>
        ) : null}
      </section>

      {/* ---------------- 2. Its logic ---------------- */}
      <section className={box} data-testid="feature-functions">
        <h2 className="font-medium">{say("٢. المنطق|2. Logic|2. לוגיקה")}</h2>
        <p className="mt-1 text-xs text-white/60">{say("الـ functions: شو بيصير، بخطوات بدون كود. كل وحدة بتتجرّب وبتنتشر من صفحتها، وهناك بتحدد شو بيشغّلها (سطر انضاف، وقت، زر بالمتجر…).|Functions: what happens, in steps with no code. Each is tried and published on its own page, where you also say what starts it (a row added, a schedule, a shop button…).|פונקציות: מה קורה, בשלבים בלי קוד. כל אחת מנוסה ומתפרסמת בדף שלה, ושם קובעים מה מפעיל אותה (שורה שנוספה, לוח זמנים, כפתור בחנות…).")}</p>
        <ul className="mt-3 divide-y divide-white/10">
          {f.functions.map((x) => {
            const state = stateOf(x);
            return (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3" data-testid={`feature-function-${x.id}`} data-state={state}>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/admin/functions/${x.id}`} className="font-medium hover:underline">
                      {x.name}
                    </Link>
                    <Badge variant={FN_BADGE[state]} size="sm">
                      {say(STATE_NAME[state])}
                    </Badge>
                  </div>
                  {x.note ? <div className="wrap-break-word text-sm text-white/70">{x.note}</div> : null}
                  <div className="text-xs text-white/60">
                    {triggersText(x.triggers, lang)}
                    {x.runs ? ` · ${say("اشتغلت {n} مرة|ran {n} times|רצה {n} פעמים").replace("{n}", x.runs.toLocaleString("en"))}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Link to={`/admin/functions/${x.id}`} className="underline">
                    {say("خطواتها|Its steps|השלבים שלה")}
                  </Link>
                  {canWrite ? leave("function", x.id) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {!f.functions.length ? <p className="text-sm text-white/60">{say("ما في functions بهالميزة لسا.|No functions in this feature yet.|עדיין אין פונקציות בתכונה הזאת.")}</p> : null}
        {canWrite ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AddExisting kind="function" options={f.free.functions.map((x) => ({ id: x.id, label: x.name }))} busy={busy} onPick={(refId) => add.mutate({ kind: "function", refId })} />
            {hasPermission("functions:write") ? <NewNamed kind="function" placeholder={say("اسم function جديدة|A new function's name|שם לפונקציה חדשה")} button={say("＋ function جديدة|＋ New function|＋ פונקציה חדשה")} busy={newFn.isPending} onMake={(title) => newFn.mutate(title)} /> : null}
          </div>
        ) : null}
      </section>

      {/* ---------------- 3. Its pages ---------------- */}
      <section className={box} data-testid="feature-pages">
        <h2 className="font-medium">{say("٣. الصفحات|3. Pages|3. עמודים")}</h2>
        <p className="mt-1 text-xs text-white/60">
          {say("وين بيشوف الزبون الميزة بالمتجر. الصفحة بتنعمل وبتتصمّم من «الصفحات»، وهون بتربطها بالميزة لتلاقيها معها، ولتتخبّى معها لما توقّف الميزة.|Where the shopper sees the feature in the shop. A page is made and designed in “Pages”; here you put it with the feature so it is found with it, and hides with it when the feature is switched off.|איפה הלקוח רואה את התכונה בחנות. עמוד נוצר ומעוצב ב«עמודים»; כאן משייכים אותו לתכונה כדי למצוא אותו איתה, והוא מוסתר איתה כשהתכונה כבויה.")}{" "}
          <Link to="/admin/pages" className="underline">
            {say("الصفحات|Pages|עמודים")}
          </Link>
        </p>
        <ul className="mt-3 divide-y divide-white/10">
          {f.pages.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3" data-testid={`feature-page-${p.id}`}>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/pages/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <Badge variant={PAGE_BADGE[p.status]} size="sm">
                    {say(PAGE_STATUS[p.status])}
                  </Badge>
                  {p.hidden ? (
                    <span data-testid={`feature-page-hidden-${p.id}`}>
                      <Badge variant="warning" size="sm">
                        {say("مخبّاة عن المتجر|Hidden from the shop|מוסתר מהחנות")}
                      </Badge>
                    </span>
                  ) : null}
                  {p.hasDraft ? <span className="text-xs text-white/60">{say("فيها تعديلات مش منشورة|has changes not published|יש שינויים שלא פורסמו")}</span> : null}
                </div>
                <bdi dir="ltr" className="block text-xs text-white/60">
                  {p.slug}
                </bdi>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Link to={`/admin/pages/${p.id}`} className="underline">
                  {say("صمّمها|Design it|עיצוב")}
                </Link>
                {canWrite ? leave("page", p.id) : null}
              </div>
            </li>
          ))}
        </ul>
        {!f.pages.length ? <p className="text-sm text-white/60">{say("ما في صفحات بهالميزة لسا.|No pages in this feature yet.|עדיין אין עמודים בתכונה הזאת.")}</p> : null}
        {canWrite ? (
          <div className="mt-3">
            <AddExisting kind="page" options={f.free.pages.map((p) => ({ id: p.id, label: `${p.name} (${p.slug})` }))} busy={busy} onPick={(refId) => add.mutate({ kind: "page", refId })} />
          </div>
        ) : null}
      </section>

      {canExport ? <TemplateExport key={`export:${f.id}:${f.template?.version ?? ""}`} feature={f} /> : null}

      {f.template && canRemoveAll ? <FeatureUpgrade key={`upgrade:${f.id}:${f.template.version}`} feature={f} /> : null}

      {canWrite ? (
        <section className={box}>
          <h2 className="font-medium">{say("حذف الميزة|Delete the feature|מחיקת התכונה")}</h2>
          <p className="mt-1 text-xs text-white/60">{say("بينحذف الاسم بس. الجداول والـ functions والصفحات بتضل وين ما هي، وبيرجعوا يشتغلوا إذا كانت الميزة موقّفة.|Only the name is deleted. The tables, functions and pages stay where they are, and work again if the feature was off.|רק השם נמחק. הטבלאות, הפונקציות והעמודים נשארים במקומם, וחוזרים לפעול אם התכונה הייתה כבויה.")}</p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="ghost"
              isLoading={drop.isPending}
              onClick={async () => {
                if (await confirm({ title: say("حذف الميزة|Delete the feature|מחיקת התכונה"), message: say("«{name}» بتنحذف كاسم بس؛ اللي تحتها بيضل.|“{name}” is deleted as a name only; what is under it stays.|«{name}» תימחק רק כשם; מה שתחתיה נשאר.").replace("{name}", f.name), confirmText: say("احذف|Delete|מחיקה"), variant: "danger" })) drop.mutate();
              }}
              data-testid="feature-delete"
            >
              {say("احذف الاسم بس|Delete the name only|למחוק רק את השם")}
            </Button>
          </div>
          {canRemoveAll ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs text-white/60">{say("أو شيلها مع كل اللي فيها: الـ functions والصفحات، والجداول مع سطورها أو بدونها (بتختار). بتشوف شو رح ينحذف قبل.|Or take it away with everything in it: its functions and pages, and its tables with or without their rows (you choose). You see what goes first.|או להסיר אותה עם כל מה שבה: הפונקציות והעמודים, והטבלאות עם השורות או בלעדיהן (לבחירתך). רואים קודם מה יוסר.")}</p>
              <div className="mt-2">
                <FeatureRemove feature={f} />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
      {dialog}
    </div>
  );
}

/** What exists and is in no feature yet, to put in this one. */
function AddExisting({ kind, options, busy, onPick }: { kind: FeatureKind; options: Array<{ id: string; label: string }>; busy: boolean; onPick: (id: string) => void }) {
  if (!options.length) return null;
  return (
    <select
      className={`${field} max-w-[18rem] text-white/80`}
      value=""
      disabled={busy}
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value);
      }}
      data-testid={`feature-${kind}-add`}
    >
      <option value="">{kind === "table" ? say("＋ جدول موجود|＋ A table that exists|＋ טבלה קיימת") : kind === "function" ? say("＋ function موجودة|＋ A function that exists|＋ פונקציה קיימת") : say("＋ صفحة موجودة|＋ A page that exists|＋ עמוד קיים")}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A new thing by its name alone (a function). */
function NewNamed({ kind, placeholder, button, busy, onMake }: { kind: FeatureKind; placeholder: string; button: string; busy: boolean; onMake: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onMake(title.trim());
        setTitle("");
      }}
    >
      <input className={`${field} w-48`} value={title} maxLength={80} placeholder={placeholder} onChange={(e) => setTitle(e.target.value)} data-testid={`feature-${kind}-new-name`} />
      <Button type="submit" size="sm" variant="secondary" disabled={!title.trim()} isLoading={busy} data-testid={`feature-${kind}-new`}>
        {button}
      </Button>
    </form>
  );
}

/** A new table: its name, and its address (small Latin letters: it is in the API's address and the grid's). */
function NewTable({ busy, onMake }: { busy: boolean; onMake: (title: string, slug: string) => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  // The address follows the name until the owner types one of their own.
  const [own, setOwn] = useState(false);
  const address = own ? slug : slugFrom(title);
  const ok = !!title.trim() && SLUG.test(address);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        onMake(title.trim(), address);
        setTitle("");
        setSlug("");
        setOwn(false);
      }}
    >
      <input className={`${field} w-44`} value={title} maxLength={60} placeholder={say("اسم جدول جديد|A new table's name|שם לטבלה חדשה")} onChange={(e) => setTitle(e.target.value)} data-testid="feature-table-new-name" />
      <input
        className={`${field} w-40 ${address && !SLUG.test(address) ? "border-red-400/60" : ""}`}
        dir="ltr"
        value={address}
        maxLength={40}
        placeholder={say("عنوانه: friend-requests|its address: friend-requests|הכתובת: friend-requests")}
        title={say("حروف إنجليزية صغيرة، أرقام و -|Small Latin letters, digits and -|אותיות קטנות באנגלית, ספרות ו-")}
        onChange={(e) => {
          setOwn(true);
          setSlug(e.target.value.trim().toLowerCase());
        }}
        data-testid="feature-table-new-slug"
      />
      <Button type="submit" size="sm" variant="secondary" disabled={!ok} isLoading={busy} data-testid="feature-table-new">
        {say("＋ جدول جديد|＋ New table|＋ טבלה חדשה")}
      </Button>
    </form>
  );
}
