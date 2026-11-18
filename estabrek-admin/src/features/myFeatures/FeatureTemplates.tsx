// ميزاتي → templates (stage 4). A feature goes out as one file (its tables without their rows, its
// logic with what starts it, its pages) and comes into a store as a draft: the feature switched off,
// its functions unpublished, its pages drafts, until the owner has looked at them. And a feature
// leaves with everything it holds, its tables' rows kept or deleted, as the owner says.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import * as FeaturesAPI from "../../api/myFeatures.api";
import type { Feature, Removal, TemplateNote, TemplatePreview } from "../../api/myFeatures.api";
import { tableName } from "../functions/fnDraft";
import { apiLine, rowsText } from "./featuresText";
import { KEY, VERSION, fileName, movedText, nextMinor, noteText, problemText, readJson, stepsText, triggerKindText } from "./templatesText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-9 min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white";
const onError = (e: unknown) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) });

/** Saves the file on the owner's device, as it is (no byte-order mark: other tools read it too). */
function saveJson(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------------- A feature from a template file ---------------- */

export function TemplateInstall() {
  const lang = adminLang();
  const go = useNavigate();
  const qc = useQueryClient();
  const [file, setFile] = useState<unknown>(null);
  const [bad, setBad] = useState<string | null>(null);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const look = useMutation({ mutationFn: (template: unknown) => FeaturesAPI.previewTemplate(template), onSuccess: setPreview, onError });
  const install = useMutation({
    mutationFn: () => FeaturesAPI.installTemplate(file, lang),
    onSuccess: (f: Feature) => {
      qc.setQueryData(["my-features", f.id], f);
      void qc.invalidateQueries({ queryKey: ["my-features"], exact: true });
      toast.success(say("انثبّتت كمسودة|Installed as a draft|הותקנה כטיוטה"));
      go(`/admin/my-features/${f.id}`);
    },
    onError,
  });
  const pick = async (f: File | undefined) => {
    setPreview(null);
    setBad(null);
    if (!f) return;
    const json = readJson(await f.text());
    if (json === null) return setBad(say("هاد الملف مش JSON. ملف القالب بينتهي بـ .feature.json|This file isn't JSON. A template file ends in .feature.json|הקובץ הזה אינו JSON. קובץ תבנית מסתיים ב-.feature.json"));
    setFile(json);
    look.mutate(json);
  };
  return (
    <section className={box} data-testid="template-install">
      <h2 className="font-medium">{say("ميزة من قالب|A feature from a template|תכונה מתבנית")}</h2>
      <p className="mt-1 text-xs text-white/60">
        {say(
          "عندك ملف قالب ميزة (.feature.json)؟ بتشوف شو رح ينضاف قبل ما ينكتب شي. بيتثبّت كمسودة: الميزة موقّفة، الـ functions مش منشورة، والصفحات مسودات، لحد ما تراجعهم.|Got a feature template file (.feature.json)? You see what it would add before anything is written. It is installed as a draft: the feature off, its functions unpublished, its pages drafts, until you have looked at them.|יש לכם קובץ תבנית תכונה (.feature.json)? רואים מה יתווסף לפני שנכתב משהו. היא מותקנת כטיוטה: התכונה כבויה, הפונקציות לא מפורסמות והעמודים טיוטות, עד שבודקים אותם.",
        )}
      </p>
      <input type="file" accept=".json,application/json" className="mt-3 block max-w-full text-sm text-white/80" onChange={(e) => void pick(e.target.files?.[0])} data-testid="template-file" />
      {bad ? <p className="mt-2 text-sm text-red-300" data-testid="template-bad">{bad}</p> : null}
      {look.isPending ? <p className="mt-2 text-sm text-white/60">{say("عم نقرأ الملف…|Reading the file…|קוראים את הקובץ…")}</p> : null}
      {preview ? <PreviewView preview={preview} lang={lang} /> : null}
      {preview?.ok ? (
        <div className="mt-4">
          <Button size="sm" variant="primary" isLoading={install.isPending} onClick={() => install.mutate()} data-testid="template-install-go">
            {say("ثبّتها كمسودة|Install it as a draft|התקנה כטיוטה")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function PreviewView({ preview, lang }: { preview: TemplatePreview; lang: "ar" | "en" | "he" }) {
  const problems = preview.problems.length ? (
    <ul className="mt-3 space-y-1 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200" data-testid="template-problems">
      <li className="font-medium">{say("ما بتنثبّت هيك:|It can't be installed like this:|אי אפשר להתקין אותה כך:")}</li>
      {preview.problems.map((p, k) => (
        <li key={k}>
          {problemText(p, lang)}
          {p.at ? (
            <bdi dir="ltr" className="ms-2 text-xs text-red-200/70">
              {p.at}
            </bdi>
          ) : null}
        </li>
      ))}
    </ul>
  ) : null;
  if (!preview.template) return problems;
  const t = preview.template;
  const moved = (was: string | null, now: string | null) => (was && now ? <div className="text-xs text-amber-200">{movedText(was, now, lang)}</div> : null);
  return (
    <div className="mt-4 space-y-3" data-testid="template-preview" data-ok={preview.ok}>
      <div>
        <div className="font-medium" data-testid="template-name">
          {t.name[lang] || t.name.ar || t.name.en || t.name.he}{" "}
          <bdi dir="ltr" className="text-xs text-white/60">
            {t.key} · {t.version}
          </bdi>
        </div>
        {t.note ? <div className="text-sm text-white/70">{t.note[lang] || t.note.ar || t.note.en || t.note.he}</div> : null}
      </div>
      {preview.installed.length ? (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200" data-testid="template-again">
          {say("هالقالب متثبّت من قبل («{name}»، نسخة {v}). تثبيته كمان مرة بيعمل نسخة تانية بعناوين جديدة.|This template is installed already (“{name}”, version {v}). Installing it again makes a second copy under new addresses.|התבנית הזאת כבר מותקנת («{name}», גרסה {v}). התקנה נוספת יוצרת עותק שני בכתובות חדשות.")
            .replace("{name}", preview.installed[0].name)
            .replace("{v}", preview.installed[0].version ?? "?")}
        </p>
      ) : null}
      {problems}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 p-3" data-testid="template-tables">
          <div className="text-sm font-medium">{say("الجداول|Tables|טבלאות")}</div>
          <ul className="mt-1 space-y-2 text-sm">
            {preview.tables.map((x) => (
              <li key={x.key}>
                <div>
                  {tableName({ name: x.name, slug: x.slug }, lang)}{" "}
                  <bdi dir="ltr" className="text-xs text-white/60">
                    {x.slug}
                  </bdi>
                </div>
                <div className="text-xs text-white/60">{apiLine(x.api, lang)}</div>
                {moved(x.was, x.slug)}
              </li>
            ))}
          </ul>
          {!preview.tables.length ? <div className="text-xs text-white/60">{say("ما في|None|אין")}</div> : null}
        </div>
        <div className="rounded-xl border border-white/10 p-3" data-testid="template-functions">
          <div className="text-sm font-medium">{say("المنطق|Logic|לוגיקה")}</div>
          <ul className="mt-1 space-y-2 text-sm">
            {preview.functions.map((x) => (
              <li key={x.key}>
                <div>{x.name}</div>
                <div className="text-xs text-white/60">
                  {stepsText(x.steps, lang)}
                  {x.triggers.length ? ` · ${x.triggers.map((tr) => triggerKindText(tr.kind, lang) + (tr.slug ? ` (${tr.slug})` : "")).join("، ")}` : ""}
                </div>
                {x.triggers.map((tr, k) => (
                  <div key={k}>{moved(tr.was, tr.slug)}</div>
                ))}
              </li>
            ))}
          </ul>
          {!preview.functions.length ? <div className="text-xs text-white/60">{say("ما في|None|אין")}</div> : null}
        </div>
        <div className="rounded-xl border border-white/10 p-3" data-testid="template-pages">
          <div className="text-sm font-medium">{say("الصفحات|Pages|עמודים")}</div>
          <ul className="mt-1 space-y-2 text-sm">
            {preview.pages.map((x) => (
              <li key={x.key}>
                <div>
                  {x.name}{" "}
                  <bdi dir="ltr" className="text-xs text-white/60">
                    {x.slug}
                  </bdi>
                </div>
                {moved(x.was, x.slug)}
              </li>
            ))}
          </ul>
          {!preview.pages.length ? <div className="text-xs text-white/60">{say("ما في|None|אין")}</div> : null}
        </div>
      </div>
      {preview.needs.secrets.length || preview.needs.sites.length ? (
        <div className="rounded-xl border border-white/10 p-3 text-sm" data-testid="template-needs">
          <div className="font-medium">{say("بدها من متجرك|It needs from your store|היא צריכה מהחנות שלך")}</div>
          <p className="text-xs text-white/60">{say("الأسرار ما بتيجي مع القالب، بس أساميها: بتضيفها إنت من «الاتصالات والأسرار».|Secrets don't come with a template, only their names: you add them in “Connections and secrets”.|סודות לא מגיעים עם תבנית, רק השמות שלהם: מוסיפים אותם ב«חיבורים וסודות».")}</p>
          <ul className="mt-1 space-y-1">
            {preview.needs.secrets.map((s) => (
              <li key={s.name} data-testid={`template-need-secret-${s.name}`} data-have={s.kept}>
                {say("سر|Secret|סוד")} <bdi dir="ltr">{s.name}</bdi>: {s.kept ? say("موجود ✓|kept here ✓|קיים כאן ✓") : say("مش موجود لسا|not here yet|עדיין לא כאן")}
              </li>
            ))}
            {preview.needs.sites.map((s) => (
              <li key={s.host} data-testid={`template-need-site-${s.host}`} data-have={s.allowed}>
                {say("موقع|Site|אתר")} <bdi dir="ltr">{s.host}</bdi>: {s.allowed ? say("مسموح ✓|allowed ✓|מותר ✓") : say("مش مسموح لسا|not allowed yet|עדיין לא מותר")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- The feature as a template file ---------------- */

export function TemplateExport({ feature }: { feature: Feature }) {
  const lang = adminLang();
  const [key, setKey] = useState(feature.template?.key ?? "");
  const [version, setVersion] = useState(feature.template ? nextMinor(feature.template.version) : "1.0.0");
  const [notes, setNotes] = useState<TemplateNote[] | null>(null);
  const ok = (!key || KEY.test(key)) && VERSION.test(version);
  const out = useMutation({
    mutationFn: () => FeaturesAPI.exportFeature(feature.id, { key: key.trim() || undefined, version, lang }),
    onSuccess: (r) => {
      saveJson(fileName(r.template.key, r.template.version), r.template);
      setNotes(r.notes);
      if (!key) setKey(r.template.key);
    },
    onError,
  });
  return (
    <section className={box} data-testid="feature-export">
      <h2 className="font-medium">{say("نزّلها كقالب|Download it as a template|הורדה כתבנית")}</h2>
      <p className="mt-1 text-xs text-white/60">
        {say(
          "ملف واحد فيه جداولها (بدون سطورها)، منطقها مع شو بيشغّله، وصفحاتها. بتحطه بمتجر تاني من «ميزاتي ← ميزة من قالب». الأسرار ما بتطلع: بس أساميها.|One file with its tables (without their rows), its logic with what starts it, and its pages. Put it into another store from “My features → A feature from a template”. Secrets don't go out: only their names.|קובץ אחד עם הטבלאות שלה (בלי השורות), הלוגיקה עם מה שמפעיל אותה, והעמודים. מכניסים אותו לחנות אחרת מ«התכונות שלי ← תכונה מתבנית». סודות לא יוצאים: רק השמות שלהם.",
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input className={`${field} w-48 ${key && !KEY.test(key) ? "border-red-400/60" : ""}`} dir="ltr" value={key} maxLength={41} placeholder={say("اسمه بالملف: help-desk|its key: help-desk|המפתח: help-desk")} onChange={(e) => setKey(e.target.value.trim())} aria-label={say("اسم القالب بالملف|The template's key|מפתח התבנית")} data-testid="feature-export-key" />
        <input className={`${field} w-24 ${!VERSION.test(version) ? "border-red-400/60" : ""}`} dir="ltr" value={version} maxLength={14} onChange={(e) => setVersion(e.target.value.trim())} aria-label={say("النسخة|Version|גרסה")} data-testid="feature-export-version" />
        <Button size="sm" variant="secondary" disabled={!ok} isLoading={out.isPending} onClick={() => out.mutate()} data-testid="feature-export-go">
          {say("نزّل الملف|Download the file|הורדת הקובץ")}
        </Button>
      </div>
      {feature.template ? <p className="mt-2 text-xs text-white/60">{say("نفس الاسم بنسخة أعلى: المتجر اللي ثبّت النسخة القديمة بيعرفها ترقية.|The same key with a higher version: a store that installed the older one knows it as an upgrade.|אותו מפתח בגרסה גבוהה יותר: חנות שהתקינה את הישנה מזהה אותה כשדרוג.")}</p> : null}
      {notes ? (
        notes.length ? (
          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200" data-testid="feature-export-notes">
            <div className="font-medium">{say("نزل الملف. هدول ما انحطوا فيه:|The file is saved. These aren't in it:|הקובץ נשמר. אלה לא בתוכו:")}</div>
            <ul className="mt-1 list-disc space-y-1 ps-5">
              {notes.map((n, k) => (
                <li key={k}>{noteText(n, lang)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-sm text-emerald-300" data-testid="feature-export-notes">
            {say("نزل الملف، وكل شي بالميزة فيه.|The file is saved, with everything in the feature.|הקובץ נשמר, עם כל מה שבתכונה.")}
          </p>
        )
      ) : null}
    </section>
  );
}

/* ---------------- Removing the feature with everything in it ---------------- */

export function FeatureRemove({ feature }: { feature: Feature }) {
  const lang = adminLang();
  const go = useNavigate();
  const qc = useQueryClient();
  const [what, setWhat] = useState<Removal | null>(null);
  const [rows, setRows] = useState<"keep" | "delete">("keep");
  const look = useMutation({ mutationFn: () => FeaturesAPI.removalOf(feature.id, lang), onSuccess: setWhat, onError });
  const remove = useMutation({
    mutationFn: () => FeaturesAPI.removeFeature(feature.id, rows, lang),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["my-features", feature.id] });
      void qc.invalidateQueries({ queryKey: ["my-features"], exact: true });
      toast.success(say("انحذفت الميزة مع اللي فيها|The feature is removed with what it held|התכונה הוסרה עם מה שהיה בה"));
      go("/admin/my-features");
    },
    onError,
  });
  if (!what)
    return (
      <Button size="sm" variant="ghost" isLoading={look.isPending} onClick={() => look.mutate()} data-testid="feature-remove">
        {say("احذفها مع كل اللي فيها…|Remove it with everything in it…|הסרה עם כל מה שבה…")}
      </Button>
    );
  const rowsAll = what.tables.reduce((n, t) => n + t.rows, 0);
  const blocked = what.blockers.called.length > 0 || (rows === "delete" && what.blockers.linked.length > 0);
  return (
    <div className="mt-2 space-y-3 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm" data-testid="feature-remove-panel">
      <div className="font-medium">{say("رح ينحذف:|This goes:|זה יוסר:")}</div>
      <ul className="list-disc space-y-1 ps-5 text-white/80">
        {what.functions.map((f) => (
          <li key={f.id}>{say("function «{n}» مع مشغّلاتها ونسخها|the function “{n}” with its triggers and versions|הפונקציה «{n}» עם המפעילים והגרסאות שלה").replace("{n}", f.name)}</li>
        ))}
        {what.pages.map((p) => (
          <li key={p.id}>
            {say("صفحة «{n}»|the page “{n}”|העמוד «{n}»").replace("{n}", p.name)} <bdi dir="ltr">{p.slug}</bdi>
          </li>
        ))}
        {!what.functions.length && !what.pages.length ? <li>{say("ولا function ولا صفحة|no function and no page|אף פונקציה ואף עמוד")}</li> : null}
      </ul>
      {what.tables.length ? (
        <fieldset className="space-y-2" data-testid="feature-remove-rows">
          <legend className="font-medium">
            {say("وجداولها ({tables}، فيهم {rows}):|And its tables ({tables}, holding {rows}):|והטבלאות שלה ({tables}, עם {rows}):")
              .replace("{tables}", what.tables.map((t) => t.name).join("، "))
              .replace("{rows}", rowsText(rowsAll, lang))}
          </legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="rows" checked={rows === "keep"} onChange={() => setRows("keep")} data-testid="feature-remove-keep" />
            <span>{say("خلّي الجداول وسطورها: بيضلوا بصفحة الجداول، بدون ميزة.|Keep the tables and their rows: they stay on the tables page, in no feature.|להשאיר את הטבלאות והשורות: הן נשארות בעמוד הטבלאות, בלי תכונה.")}</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="rows" checked={rows === "delete"} onChange={() => setRows("delete")} data-testid="feature-remove-delete" />
            <span className={rows === "delete" ? "text-red-200" : ""}>{say("احذف الجداول مع سطورها، للأبد ({rows}).|Delete the tables with their rows, for good ({rows}).|למחוק את הטבלאות עם השורות, לתמיד ({rows}).").replace("{rows}", rowsText(rowsAll, lang))}</span>
          </label>
        </fieldset>
      ) : null}
      {what.blockers.called.length ? (
        <div className="rounded-lg border border-red-400/40 p-2 text-red-200" data-testid="feature-remove-called">
          {what.blockers.called.map((c, k) => (
            <div key={k}>{say("«{by}» (برّا الميزة) بتنادي «{fn}»: شيل هالخطوة منها أول.|“{by}” (outside the feature) calls “{fn}”: take that step out of it first.|«{by}» (מחוץ לתכונה) קוראת ל«{fn}»: קודם להוציא ממנה את השלב הזה.").replace("{by}", c.by).replace("{fn}", c.fn)}</div>
          ))}
        </div>
      ) : null}
      {rows === "delete" && what.blockers.linked.length ? (
        <div className="rounded-lg border border-red-400/40 p-2 text-red-200" data-testid="feature-remove-linked">
          {what.blockers.linked.map((l, k) => (
            <div key={k}>{say("جدول «{by}» (برّا الميزة) بيربط «{table}» بحقل «{field}»: سطوره ما بتنحذف وهو رابطها. خلّيها، أو شيل الربط أول.|The table “{by}” (outside the feature) links “{table}” in its field “{field}”: its rows can't go while it does. Keep them, or take the relation out first.|הטבלה «{by}» (מחוץ לתכונה) מקשרת את «{table}» בשדה «{field}»: אי אפשר למחוק את השורות כל עוד היא מקשרת. להשאיר אותן, או קודם להוציא את הקשר.").replace("{by}", l.by).replace("{table}", l.table).replace("{field}", l.field)}</div>
          ))}
        </div>
      ) : null}
      {(rows === "delete" && what.uses.functions.length) || what.uses.pages.length ? (
        <div className="rounded-lg border border-amber-400/30 p-2 text-amber-200" data-testid="feature-remove-uses">
          {rows === "delete" && what.uses.functions.length ? <div>{say("functions برّا الميزة بتستعمل جداولها، وبعد الحذف بيقولولك وين: {names}|Functions outside the feature use its tables; after this they say where: {names}|פונקציות מחוץ לתכונה משתמשות בטבלאות שלה; אחרי זה הן יגידו איפה: {names}").replace("{names}", what.uses.functions.join("، "))}</div> : null}
          {what.uses.pages.length ? <div>{say("صفحات برّا الميزة بتعرض جداولها أو بتشغّل منطقها: {names}|Pages outside the feature show its tables or run its logic: {names}|עמודים מחוץ לתכונה מציגים את הטבלאות שלה או מפעילים את הלוגיקה שלה: {names}").replace("{names}", what.uses.pages.join("، "))}</div> : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="danger" disabled={blocked} isLoading={remove.isPending} onClick={() => remove.mutate()} data-testid="feature-remove-go">
          {rows === "delete" && what.tables.length ? say("احذف كل شي|Delete everything|למחוק הכול") : say("احذفها|Remove it|הסרה")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setWhat(null)} data-testid="feature-remove-cancel">
          {say("لا، خلّيها|No, keep it|לא, להשאיר")}
        </Button>
      </div>
    </div>
  );
}

/** Where an installed feature came from, and what is left to do before it is on. */
export function TemplateLine({ feature }: { feature: Feature }) {
  const lang = adminLang();
  if (!feature.template) return null;
  const t = feature.template;
  return (
    <div className="mt-3 space-y-1 text-xs text-white/60" data-testid="feature-template">
      <div>
        {say("من قالب «{name}»، نسخة {v}، انثبّت {at}|From the template “{name}”, version {v}, installed {at}|מהתבנית «{name}», גרסה {v}, הותקנה {at}")
          .replace("{name}", t.name[lang] || t.name.ar || t.name.en || t.name.he || t.key)
          .replace("{v}", t.version)
          .replace("{at}", new Date(t.installedAt).toLocaleDateString(lang === "en" ? "en-GB" : lang))}
      </div>
      {!feature.enabled ? (
        <div className="text-amber-200" data-testid="feature-template-next">
          {say("انثبّتت كمسودة. قبل ما تشغّلها: افتح كل function، شوف شو ناقصها هون (جدول، اتصال)، جرّبها وانشرها؛ صمّم الصفحات وانشرها؛ وبعدين شغّل الميزة من فوق.|Installed as a draft. Before switching it on: open each function, see what it lacks here (a table, a connection), try it and publish it; design the pages and publish them; then switch the feature on above.|הותקנה כטיוטה. לפני שמפעילים: לפתוח כל פונקציה, לראות מה חסר לה כאן (טבלה, חיבור), לנסות ולפרסם; לעצב את העמודים ולפרסם; ואז להפעיל את התכונה למעלה.")}
        </div>
      ) : null}
    </div>
  );
}
