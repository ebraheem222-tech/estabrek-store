// المشروع كملف (stage 3): the whole project (tables, functions, pages, shoppers' roles and groups, features; never
// a table's rows) as one file. It is written out to keep or to take to another copy, brought in after a look at
// what it would do piece by piece, and every bring-in keeps the project as it was first, so going back is one
// click. Only the store's owner sees this page's buttons (the server says the same).
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useConfirm } from "../../components/useConfirm";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuthStore } from "../../store/auth.store";
import { loc } from "../../lib/lang";
import { say } from "../../studio/say";
import * as ProjectAPI from "../../api/project.api";
import type { DiffItem, ProjectPreview, ProjectSize, Snapshot } from "../../api/project.api";

import { ACTION_NAME, ACTION_TONE, KINDS, KIND_GROUP, REASON_NAME, bytesText, impactText, iso, listText, partsText, reasonText, sizeText } from "./projectText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm";

/** What is being looked at: a file brought from this computer, or a saved copy to go back to. */
type Looking = { kind: "file"; file: unknown; name: string } | { kind: "back"; snapshot: Snapshot };

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
/** A picked file's words (FileReader where a browser has no Blob.text). */
function readText(f: File): Promise<string> {
  if (typeof f.text === "function") return f.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsText(f);
  });
}
const when = (at: string) => new Date(at).toLocaleString(loc("ar"), { dateStyle: "medium", timeStyle: "short" });
const sizeLine = (s: ProjectSize) => sizeText(s);

export default function ProjectPage() {
  const admin = useAuthStore((s) => s.admin);
  const owner = admin?.owner === true || admin?.role === "SUPERADMIN";
  const qc = useQueryClient();
  const view = useQuery({ queryKey: ["project"], queryFn: ProjectAPI.getProject, enabled: owner });
  const [looking, setLooking] = useState<Looking | null>(null);
  const [label, setLabel] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const download = useMutation({
    mutationFn: (id?: string) => ProjectAPI.downloadProject(id),
    onSuccess: ({ blob, name }) => {
      saveBlob(blob, name);
      toast.success(say("نزل ملف المشروع على جهازك|The project file is on your computer|קובץ הפרויקט ירד למחשב שלך"));
    },
    onError: (e) => toast.error(say("ما زبط التنزيل|The download didn't work|ההורדה לא הצליחה"), { description: getApiErrorMessage(e) }),
  });
  const save = useMutation({
    mutationFn: (l: string) => ProjectAPI.saveSnapshot(l),
    onSuccess: () => {
      setLabel("");
      toast.success(say("انحفظت نسخة من المشروع|A copy of the project is saved|עותק של הפרויקט נשמר"));
      void qc.invalidateQueries({ queryKey: ["project"] });
    },
    onError: (e) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });

  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      const file = JSON.parse(await readText(f));
      setLooking({ kind: "file", file, name: f.name });
    } catch {
      toast.error(say("هاد الملف مش ملف مشروع (مش JSON)|This file isn't a project file (not JSON)|הקובץ הזה אינו קובץ פרויקט (לא JSON)"));
    }
    if (input.current) input.current.value = "";
  };

  if (!owner)
    return (
      <div className={box} data-testid="project-page">
        <h1 className="text-lg font-semibold">{say("المشروع كملف|The project as a file|הפרויקט כקובץ")}</h1>
        <p className="mt-2 text-sm text-white/60" data-testid="project-owner-only">
          {say("هاي الصفحة لصاحب المتجر بس: منها بيطلع المشروع كله وبيرجع بكبسة.|This page is the store owner's alone: the whole project goes out and comes back from here.|העמוד הזה הוא של בעל החנות בלבד: מכאן כל הפרויקט יוצא וחוזר.")}
        </p>
      </div>
    );

  return (
    <div className="space-y-4 pb-10" data-testid="project-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("المشروع كملف|The project as a file|הפרויקט כקובץ")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "كل المشروع بملف واحد: الجداول (حقولها والـ API تبعها، بدون سطورها)، الـ functions (المسودة والمنشور واختباراتها وشو بيشغّلها)، الصفحات، أدوار ومجموعات الزباين، والميزات. بتنزّله لتحفظه أو لتنقله لنسخة تانية، وبتجيب ملف بعد ما تشوف شو رح يتغيّر. قبل كل ملف بيجي، بتنحفظ نسخة من المشروع زي ما هو، فبترجع لها بكبسة. الأسرار والاتصالات ما بتطلع بالملف: كل نسخة إلها تبعها.|The whole project in one file: the tables (their fields and API, never their rows), the functions (draft, what is published, their tests and what starts them), the pages, shoppers' roles and groups, and the features. Download it to keep it or take it to another copy, and bring a file in after seeing what it would change. Before any file comes in, the project as it is is saved, so you go back in one click. Secrets and connections never go in the file: each copy keeps its own.|כל הפרויקט בקובץ אחד: הטבלאות (השדות וה-API שלהן, בלי השורות), הפונקציות (טיוטה, מה שפורסם, הבדיקות ומה מפעיל אותן), העמודים, תפקידי וקבוצות הלקוחות, והפיצ'רים. הורידו אותו כדי לשמור או להעביר לעותק אחר, והכניסו קובץ אחרי שתראו מה הוא ישנה. לפני שקובץ נכנס, הפרויקט נשמר כמו שהוא, כך שחוזרים בלחיצה. סודות וחיבורים לא נכנסים לקובץ: לכל עותק יש משלו.",
          )}
        </p>
        {view.data ? (
          <p className="mt-2 text-sm" data-testid="project-size">
            {say("هلأ فيه:|It holds now:|יש בו עכשיו:")} {sizeLine(view.data.size)}
          </p>
        ) : view.isLoading ? (
          <div className="mt-2 flex items-center gap-2 text-sm"><Spinner /> {say("عم يحمّل…|Loading…|טוען…")}</div>
        ) : view.isError ? (
          <p className="mt-2 text-sm text-red-200">{getApiErrorMessage(view.error)}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => download.mutate(undefined)} isLoading={download.isPending && download.variables === undefined} data-testid="project-download">
            {say("نزّل المشروع|Download the project|הורדת הפרויקט")}
          </Button>
          <Button variant="secondary" onClick={() => input.current?.click()} data-testid="project-pick">
            {say("جيب ملف مشروع…|Bring in a project file…|הכנסת קובץ פרויקט…")}
          </Button>
          <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} data-testid="project-file" />
        </div>
      </section>

      {looking ? <Look key={looking.kind === "file" ? `file:${looking.name}` : `back:${looking.snapshot.id}`} looking={looking} onDone={() => setLooking(null)} /> : null}

      <section className={box}>
        <h2 className="font-semibold">{say("نسخ المشروع|Saved copies|עותקים שמורים")}</h2>
        <p className="mt-1 text-sm text-white/60">
          {say(`بتنحفظ لحالها قبل كل ملف بيجي، وإنت بتحفظ وحدة قبل أي تغيير كبير. بيضل آخر ${view.data?.limits.snapshots ?? 20}.|One is kept by itself before any file comes in, and you save one before any big change. The last ${view.data?.limits.snapshots ?? 20} are kept.|עותק נשמר מעצמו לפני שקובץ נכנס, ואתם שומרים אחד לפני כל שינוי גדול. ${view.data?.limits.snapshots ?? 20} האחרונים נשמרים.`)}
        </p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (label.trim()) save.mutate(label.trim());
          }}
        >
          <input className={`${field} min-w-0 flex-1`} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} placeholder={say("اسم النسخة، متل «قبل العروض»|A name, like “Before the sale”|שם, למשל «לפני המבצע»")} aria-label={say("اسم النسخة|The copy's name|שם העותק")} data-testid="project-label" />
          <Button type="submit" variant="secondary" disabled={!label.trim()} isLoading={save.isPending} data-testid="project-save">
            {say("احفظ نسخة هلأ|Save a copy now|שמירת עותק עכשיו")}
          </Button>
        </form>
        <Snapshots list={view.data?.snapshots ?? []} onBack={(s) => setLooking({ kind: "back", snapshot: s })} onDownload={(id) => download.mutate(id)} downloading={download.isPending ? download.variables : undefined} />
      </section>
    </div>
  );
}

function Snapshots({ list, onBack, onDownload, downloading }: { list: Snapshot[]; onBack: (s: Snapshot) => void; onDownload: (id: string) => void; downloading?: string }) {
  const qc = useQueryClient();
  const [confirm, dialog] = useConfirm();
  const remove = useMutation({
    mutationFn: (id: string) => ProjectAPI.deleteSnapshot(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["project"] }),
    onError: (e) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }),
  });
  if (!list.length) return <p className="mt-3 text-sm text-white/60" data-testid="project-no-snapshots">{say("لسا ما في نسخ.|No copies yet.|עדיין אין עותקים.")}</p>;
  return (
    <>
      {dialog}
      <ul className="mt-3 divide-y divide-white/[0.06]" data-testid="project-snapshots">
        {list.map((s) => (
          <li key={s.id} className="flex flex-wrap items-start gap-3 py-3" data-testid={`snapshot-${s.id}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <bdi className="font-medium">{s.label}</bdi>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">{say(REASON_NAME[s.reason])}</span>
              </div>
              <div className="mt-1 text-xs text-white/60">
                {iso(when(s.createdAt))} · {sizeLine(s.size)} · <bdi dir="ltr">{bytesText(s.bytes)}</bdi>
                {s.byEmail ? <> · <bdi dir="ltr">{s.byEmail}</bdi></> : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => onBack(s)} data-testid={`snapshot-${s.id}-back`}>
                {say("رجّع المشروع لهون…|Go back to this…|חזרה לכאן…")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDownload(s.id)} isLoading={downloading === s.id} data-testid={`snapshot-${s.id}-download`}>
                {say("نزّلها|Download|הורדה")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const yes = await confirm({ title: say("محي النسخة|Delete the copy|מחיקת העותק"), message: say(`«${s.label}» بتنمحى، وما بتقدر ترجع لها بعدين.|“${s.label}” is deleted, and you can't go back to it after.|«${s.label}» יימחק, ולא תוכלו לחזור אליו אחר כך.`), confirmText: say("امحيها|Delete it|מחיקה"), variant: "danger" });
                  if (yes) remove.mutate(s.id);
                }}
                isLoading={remove.isPending && remove.variables === s.id}
                data-testid={`snapshot-${s.id}-delete`}
              >
                {say("امحيها|Delete|מחיקה")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** A file (or a saved copy) looked at before it comes in: piece by piece, with what to tick. */
function Look({ looking, onDone }: { looking: Looking; onDone: () => void }) {
  const qc = useQueryClient();
  const [confirm, dialog] = useConfirm();
  const [remove, setRemove] = useState<Set<string>>(new Set());
  const [accept, setAccept] = useState<Set<string>>(new Set());
  const [seeded, setSeeded] = useState(looking.kind === "file");
  const ticks = { remove: [...remove].sort(), accept: [...accept].sort() };
  const id = looking.kind === "file" ? `file:${looking.name}` : `back:${looking.snapshot.id}`;
  const look = useQuery({
    queryKey: ["project-look", id, ticks],
    queryFn: () => (looking.kind === "file" ? ProjectAPI.previewProject(looking.file, ticks) : ProjectAPI.previewBack(looking.snapshot.id, ticks)),
    placeholderData: (prev) => prev,
    staleTime: Infinity,
  });
  // Going back: what was made since goes too (a table with rows only if ticked).
  useEffect(() => {
    if (!seeded && look.data?.suggested) {
      setSeeded(true);
      if (look.data.suggested.length) setRemove(new Set(look.data.suggested));
    }
  }, [seeded, look.data]);
  const apply = useMutation({
    // The copy kept first is named in the admin's language.
    mutationFn: () =>
      looking.kind === "file"
        ? ProjectAPI.applyProject(looking.file, ticks, say(`قبل ملف «${looking.name}»|Before the file “${looking.name}”|לפני הקובץ «${looking.name}»`))
        : ProjectAPI.goBack(looking.snapshot.id, ticks, say(`قبل الرجوع لـ«${looking.snapshot.label}»|Before going back to “${looking.snapshot.label}”|לפני החזרה ל«${looking.snapshot.label}»`)),
    onSuccess: (r) => {
      toast.success(say(`انعمل: ${r.made} جديد، ${r.changed} تغيّر، ${r.removed} راح.|Done: ${r.made} made, ${r.changed} changed, ${r.removed} gone.|בוצע: ${r.made} נוצרו, ${r.changed} השתנו, ${r.removed} הוסרו.`), {
        description: r.snapshot ? say("المشروع زي ما كان انحفظ بـ«نسخ المشروع»: بترجع له من هناك.|The project as it was is in “Saved copies”: go back to it from there.|הפרויקט כפי שהיה נשמר ב«עותקים שמורים»: חוזרים אליו משם.") : undefined,
      });
      void qc.invalidateQueries({ queryKey: ["project"] });
      void qc.invalidateQueries({ queryKey: ["project-look"] });
      onDone();
    },
    onError: (e) => toast.error(say("ما انعمل|It wasn't done|זה לא בוצע"), { description: getApiErrorMessage(e) }),
  });

  const p: ProjectPreview | undefined = look.data;
  const toggle = (set: Set<string>, put: (s: Set<string>) => void, ref: string, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(ref);
    else next.delete(ref);
    put(next);
  };
  const changing = p ? (p.counts?.add ?? 0) + (p.counts?.change ?? 0) + remove.size : 0;
  const go = async () => {
    const yes = await confirm({
      title: looking.kind === "file" ? say("جيب الملف|Bring the file in|הכנסת הקובץ") : say("رجّع المشروع|Go back|חזרה"),
      message: say(`${changing} شغلة رح تتغيّر بالمشروع الحي، والمنشور منها بيبيّن بالمتجر فوراً. قبلها بتنحفظ نسخة من المشروع زي ما هو.|${changing} things change in the live project, and the published ones show in the shop at once. The project as it is is saved first.|${changing} דברים ישתנו בפרויקט החי, ומה שמפורסם יופיע בחנות מיד. קודם הפרויקט נשמר כמו שהוא.`),
      confirmText: say("أيوا، طبّق|Yes, do it|כן, לבצע"),
      variant: "warning",
    });
    if (yes) apply.mutate();
  };

  return (
    <section className={box} data-testid="project-look">
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold">
            {looking.kind === "file" ? say(`شو رح يعمل الملف «${looking.name}»|What the file “${looking.name}” would do|מה הקובץ «${looking.name}» יעשה`) : say(`الرجوع لـ«${looking.snapshot.label}»|Going back to “${looking.snapshot.label}”|חזרה ל«${looking.snapshot.label}»`)}
          </h2>
          {p?.project ? (
            <p className="mt-1 text-xs text-white/60">
              {[p.project.name ? iso(p.project.name) : null, p.project.exportedAt ? iso(when(p.project.exportedAt)) : null, sizeLine(p.project.size)].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <Button size="sm" variant="ghost" onClick={onDone} data-testid="project-look-close">{say("سكّر|Close|סגירה")}</Button>
      </div>

      {look.isLoading ? (
        <div className="mt-3 flex items-center gap-2 text-sm"><Spinner /> {say("عم يقارن…|Comparing…|משווה…")}</div>
      ) : look.isError ? (
        <p className="mt-3 text-sm text-red-200">{getApiErrorMessage(look.error)}</p>
      ) : p ? (
        <>
          {p.counts ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs" data-testid="project-counts">
              {(["add", "change", "only", "clash", "same"] as const).map((a) => (
                <span key={a} className={`rounded-full px-2.5 py-1 ${ACTION_TONE[a]}`}>{say(ACTION_NAME[a])}: {p.counts![a]}</span>
              ))}
            </div>
          ) : null}

          {p.problems.length ? (
            <ul className="mt-3 space-y-1 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100" data-testid="project-problems">
              {p.problems.map((x, i) => (
                <li key={i}>{reasonText(x.message)}{x.at && !x.at.includes(":") ? <span className="ms-1 text-xs text-red-200/70" dir="ltr">({x.at})</span> : null}</li>
              ))}
            </ul>
          ) : null}

          {p.waits.length ? (
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm" data-testid="project-waits">
              <p className="font-medium text-amber-100">{say("بدها موافقتك: تغيير حقول بيحط قيم على جنب|Needs your OK: field changes that set values aside|דרוש אישור: שינויי שדות ששמים ערכים בצד")}</p>
              {p.waits.map((w) => (
                <label key={w.ref} className="mt-2 flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={accept.has(w.ref)} onChange={(e) => toggle(accept, setAccept, w.ref, e.target.checked)} data-testid={`accept-${w.ref}`} />
                  <span>
                    <bdi className="font-medium">{w.name}</bdi>
                    {w.impacts.map((i, k) => <span key={k} className="block text-xs text-white/70">{impactText(i)}</span>)}
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          {/* Accepted ones stay listed so they can be un-ticked. */}
          {!p.waits.length && accept.size ? (
            <p className="mt-3 text-xs text-white/60">{say(`وافقت على ${accept.size} تغيير حقول.|You accepted ${accept.size} field changes.|אישרת ${accept.size} שינויי שדות.`)} <button type="button" className="underline" onClick={() => setAccept(new Set())}>{say("ارجع عنها|Undo|ביטול")}</button></p>
          ) : null}

          <Needs p={p} />

          <div className="mt-3 space-y-3">
            {KINDS.map((k) => <KindList key={k} kind={k} items={p.items.filter((i) => i.kind === k)} remove={remove} onRemove={(ref, on) => toggle(remove, setRemove, ref, on)} />)}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={!p.ok || !changing || look.isFetching} isLoading={apply.isPending} onClick={() => void go()} data-testid="project-apply">
              {looking.kind === "file" ? say("طبّق الملف|Bring it in|הכנסת הקובץ") : say("رجّع المشروع لهون|Go back to this|חזרה לכאן")}
            </Button>
            {!changing && p.ok ? <span className="text-sm text-white/60" data-testid="project-nothing">{say("ما في شي يتغيّر: المشروع زي الملف.|Nothing would change: the project is as the file.|שום דבר לא ישתנה: הפרויקט כמו הקובץ.")}</span> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function Needs({ p }: { p: ProjectPreview }) {
  const missing = useMemo(
    () => ({
      secrets: (p.needs?.secrets ?? []).filter((s) => !s.kept).map((s) => s.name),
      sites: (p.needs?.sites ?? []).filter((s) => !s.allowed).map((s) => s.host),
      connections: (p.needs?.connections ?? []).filter((c) => !c.here).map((c) => c.name),
    }),
    [p.needs],
  );
  if (!missing.secrets.length && !missing.sites.length && !missing.connections.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm" data-testid="project-needs">
      <p className="font-medium">{say("الـ functions بتحتاج شغلات كل نسخة إلها تبعها:|The functions need things each copy keeps for itself:|הפונקציות צריכות דברים שלכל עותק יש משלו:")}</p>
      {missing.secrets.length ? <p className="mt-1 text-xs text-white/70">{say("أسرار مش موجودة هون:|Secrets not here:|סודות שאין כאן:")} <bdi dir="ltr">{missing.secrets.join(", ")}</bdi></p> : null}
      {missing.sites.length ? <p className="mt-1 text-xs text-white/70">{say("مواقع مش مسموحة هون:|Sites not allowed here:|אתרים שלא מותרים כאן:")} <bdi dir="ltr">{missing.sites.join(", ")}</bdi></p> : null}
      {missing.connections.length ? <p className="mt-1 text-xs text-white/70">{say("اتصالات جاهزة لازم توصلها هون:|Ready connections to connect here:|חיבורים מוכנים לחבר כאן:")} {listText(missing.connections)}</p> : null}
      <p className="mt-1 text-xs text-white/50">{say("بتضيفهم من «الاتصالات والأسرار» بعدين: الملف بيدخل بدونهم.|Add them in “Connections & secrets” after: the file comes in without them.|הוסיפו אותם ב«חיבורים וסודות» אחר כך: הקובץ נכנס בלעדיהם.")}</p>
    </div>
  );
}

function KindList({ kind, items, remove, onRemove }: { kind: DiffItem["kind"]; items: DiffItem[]; remove: Set<string>; onRemove: (ref: string, on: boolean) => void }) {
  const [showSame, setShowSame] = useState(false);
  if (!items.length) return null;
  const same = items.filter((i) => i.action === "same");
  const shown = items.filter((i) => i.action !== "same" || showSame);
  return (
    <div data-testid={`project-kind-${kind}`}>
      <h3 className="text-sm font-semibold text-white/80">{say(KIND_GROUP[kind])}</h3>
      {shown.length ? (
        <ul className="mt-1 divide-y divide-white/[0.06]">
          {shown.map((i) => (
            <li key={i.ref} className="flex flex-wrap items-start gap-2 py-2 text-sm" data-testid={`look-${i.ref}`} data-action={i.action}>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${ACTION_TONE[i.action]}`}>{say(ACTION_NAME[i.action])}</span>
              <div className="min-w-0 flex-1">
                <bdi className="font-medium">{i.name}</bdi>
                {i.parts?.length ? <span className="ms-2 text-xs text-white/60">{partsText(i.parts)}</span> : null}
                {i.fields ? (
                  <span className="block text-xs text-white/60">
                    {[
                      i.fields.added.length ? say(`حقول جديدة: ${i.fields.added.join("، ")}|New fields: ${i.fields.added.join(", ")}|שדות חדשים: ${i.fields.added.join(", ")}`) : "",
                      i.fields.removed.length ? say(`بتروح: ${i.fields.removed.join("، ")}|Going: ${i.fields.removed.join(", ")}|יוסרו: ${i.fields.removed.join(", ")}`) : "",
                      i.fields.changed.length ? say(`بتتغيّر: ${i.fields.changed.join("، ")}|Changing: ${i.fields.changed.join(", ")}|משתנים: ${i.fields.changed.join(", ")}`) : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : null}
                {i.clash ? <span className="block text-xs text-red-200">{say(`«${i.clash.word}» محجوز هون لـ«${i.clash.by}»|“${i.clash.word}” is held here by “${i.clash.by}”|«${i.clash.word}» תפוס כאן על ידי «${i.clash.by}»`)}</span> : null}
              </div>
              {i.action === "only" ? (
                <label className="flex shrink-0 items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={remove.has(i.ref)} onChange={(e) => onRemove(i.ref, e.target.checked)} data-testid={`remove-${i.ref}`} />
                  {i.kind === "table" && i.rows ? say(`امحيه مع ${i.rows} سطر|Delete it with its ${i.rows} rows|מחיקה עם ${i.rows} השורות`) : say("امحيه|Delete it|מחיקה")}
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {same.length ? (
        <button type="button" className="mt-1 text-xs text-white/60 underline" onClick={() => setShowSame((v) => !v)} data-testid={`project-same-${kind}`}>
          {showSame ? say("خبّي اللي ما بيتغيّر|Hide the unchanged|הסתרת מה שלא משתנה") : say(`${same.length} متل ما هم|${same.length} unchanged|${same.length} ללא שינוי`)}
        </button>
      ) : null}
    </div>
  );
}
