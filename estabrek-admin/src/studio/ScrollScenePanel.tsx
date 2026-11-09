/**
 * The scroll scene's panels: the scene itself (its clip or picture, pin or flow, how long it
 * lasts, how softly it follows the scroll, the clip's frames a second, the picture's blur, dark
 * and zoom between two moments, its progress marks) with a timeline of chapters — a moment
 * slider that scrolls the preview there, each chapter's things, anything added at a chapter —
 * and, for something inside a scene, its own moment: from when to when, and how it comes and goes.
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { newElement, type NewKind } from "./columns";
import { Range } from "./LookPanels";
import { MediaSlot } from "./StudioPanels";
import { ColourPick } from "./StudioTreePanels";
import { say } from "./say";
import { atChapter, chapterAt, chapterRange, cueOfNode, cueOp, CUE_KINDS, sceneOp, type Cue, type SceneProps } from "./scrollScene";
import { typeLabel } from "./treeIndex";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const chip = (on: boolean) => `rounded-lg border px-2 py-1 text-[11px] disabled:opacity-40 ${on ? "border-accent-400/70 bg-accent-500/15 text-white" : "border-white/[0.08] text-white/70 hover:bg-white/[0.05]"}`;
const sel = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white";

function Picks<T extends string>({ label, value, options, busy, onPick, testId }: { label: string; value: T; options: Array<[T, string]>; busy: boolean; onPick: (v: T) => void; testId?: string }) {
  return (
    <div className="text-[11px] text-white/55">
      {label}
      <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={label} data-testid={testId}>
        {options.map(([k, name]) => (
          <button key={k} type="button" className={chip(value === k)} aria-pressed={value === k} disabled={busy} onClick={() => value !== k && onPick(k)} data-value={k}>{name}</button>
        ))}
      </div>
    </div>
  );
}
const toggle = (label: string, on: boolean, busy: boolean, set: (v: boolean) => void, testId: string) => (
  <label className="flex items-center justify-between gap-2 text-[11px] text-white/70">
    <span>{label}</span>
    <input type="checkbox" checked={on} disabled={busy} onChange={(e) => set(e.target.checked)} data-testid={testId} />
  </label>
);

/** From when to when (two ranges, the second never before the first). */
function Between({ from, to, busy, onSave, testId }: { from: number; to: number; busy: boolean; onSave: (from: number, to: number) => void; testId: string }) {
  return (
    <div className="grid grid-cols-2 gap-2" data-testid={testId}>
      <Range label={say("من|From|מ־")} min={0} max={100} unit="%" busy={busy} value={from} onSave={(v) => onSave(Math.min(v, to - 1), to)} />
      <Range label={say("لـ|To|עד")} min={0} max={100} unit="%" busy={busy} value={to} onSave={(v) => onSave(from, Math.max(v, from + 1))} />
    </div>
  );
}

/** What can be added at a chapter in one click (pictures and the rest through the Add panel). */
const QUICK: NewKind[] = ["heading", "text", "button", "icon", "stack", "svg"];

export function ScrollScenePanel({ node, lang, busy, ids, onOps, onSeek, onSelect }: {
  node: PageTreeNode;
  lang: Lang;
  busy: boolean;
  ids: (prefix: string) => string;
  onOps: Ops;
  /** Scrolls the preview to this moment of the scene (0–100 %). */
  onSeek: (at: number) => void;
  onSelect: (id: string) => void;
}) {
  const p = node.props as SceneProps;
  const media = p.media ?? { kind: "none" as const };
  const chapters = p.chapters ?? 10;
  const pin = (p.mode ?? "pin") === "pin";
  const kids = node.children ?? [];
  const [at, setAt] = useState(0);
  const [chapter, setChapter] = useState(0);
  const save = (label: string, patch: Partial<SceneProps>) => onOps(label, [sceneOp(node, patch)]);
  const L = say("مشهد التمرير|Scroll scene|סצנת גלילה");
  const seek = (v: number) => {
    setAt(v);
    setChapter(chapterAt(chapters, v));
    onSeek(v);
  };
  const inChapter = (i: number) => {
    const [a, b] = chapterRange(chapters, i);
    return kids.filter((k) => {
      const c = cueOfNode(k);
      return c ? c.from < b && (c.out === "stay" ? 100 : c.to) > a : false;
    });
  };
  const add = (kind: NewKind) => {
    const made = atChapter(newElement(kind, lang, ids), chapters, chapter);
    onOps(`${L}: ${say("إضافة بالفصل|Add at the chapter|הוספה בפרק")} ${chapter + 1}`, [{ op: "insert", parentId: node.id, index: kids.length, node: made }]);
  };
  const effect = <K extends "blur" | "dim" | "zoom">(key: K, on: Partial<SceneProps>[K]) => save(L, { [key]: on } as Partial<SceneProps>);

  return (
    <div className={box} data-testid="studio-scroll-scene">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">{say("مشهد تمرير: فيديو أو صورة مع السكرول|Scroll scene: video or picture with the scroll|סצנת גלילה: וידאו או תמונה עם הגלילה")}</div>
        <span className="text-[10px] text-white/40">{pin ? say("مثبّت|Pinned|מוצמד") : say("انسياب|Flow|זרימה")}</span>
      </div>

      <Picks label={say("الخلفية|Background|רקע")} value={media.kind} busy={busy} testId="scene-media-kind"
        options={[["video", say("فيديو بيمشي مع التمرير|Video scrubbed by scroll|וידאו שזז עם הגלילה")], ["image", say("صورة ثابتة|Held picture|תמונה קבועה")], ["none", say("بلا|None|ללא")]]}
        onPick={(kind) => save(L, { media: { ...media, kind } })} />
      {media.kind !== "none" ? (
        <MediaSlot kind={media.kind} value={media.src ?? ""} busy={busy} onSet={(src) => save(L, { media: { ...media, ...(src ? { src } : { src: undefined }) } })} />
      ) : null}
      {media.kind === "video" ? (
        <>
          <label className="block text-[11px] text-white/55">
            {say("فيديو أخف للموبايل (اختياري)|A lighter clip for phones (optional)|סרטון קל יותר לטלפון (לא חובה)")}
            <input dir="ltr" className={sel} defaultValue={media.phone ?? ""} placeholder="https://…/clip-phone.mp4" disabled={busy}
              onBlur={(e) => { const v = e.target.value.trim(); if (v !== (media.phone ?? "") && (!v || /^(\/(?!\/)|https:\/\/)\S+$/.test(v))) save(L, { media: { ...media, phone: v || undefined } }); }} data-testid="scene-phone" />
          </label>
          <Picks label={say("فريمات الفيديو بالثانية (FPS)|The clip's frames a second (FPS)|פריימים לשנייה של הסרטון (FPS)")} value={String(p.fps ?? 30)} busy={busy} testId="scene-fps"
            options={(["24", "25", "30", "50", "60", "120"] as const).map((f) => [f, f])} onPick={(f) => save(L, { fps: Number(f) })} />
          <p className="text-[10px] leading-4 text-white/40">{say("للأنعم: فيديو قصير (≤ 10 ثواني، ≤ 30MB) بفريمات مفتاحية كتير. بينحمّل مرة وحدة بالذاكرة فالتقديم والترجيع ما بيعلّق.|Smoothest: a short clip (≤ 10 s, ≤ 30 MB) with many keyframes. It loads once into memory, so scrubbing never stalls.|הכי חלק: סרטון קצר (≤ 10 שניות, ≤ 30MB) עם הרבה פריימי מפתח. הוא נטען פעם אחת לזיכרון, כך שהגלילה לא נתקעת.")}</p>
        </>
      ) : null}
      {media.kind !== "none" ? (
        <Picks label={say("ملء الشاشة|Filling|מילוי")} value={media.fit ?? "cover"} busy={busy} options={[["cover", say("يغطي كلها|Cover|כיסוי")], ["contain", say("يبين كله|Show all|הצגה מלאה")]]} onPick={(fit) => save(L, { media: { ...media, fit } })} />
      ) : null}

      <Picks label={say("طريقة المشهد|How it plays|איך הסצנה מתנגנת")} value={p.mode ?? "pin"} busy={busy} testId="scene-mode"
        options={[["pin", say("مثبّت: الأشياء بتطلع بلحظاتها|Pinned: things appear at their moments|מוצמד: דברים מופיעים ברגעים שלהם")], ["flow", say("انسياب: الأشياء بتمر فوق صورة ثابتة|Flow: things scroll over a held picture|זרימה: דברים גוללים מעל תמונה קבועה")]]}
        onPick={(mode) => save(L, { mode })} />
      {pin ? <Range label={say("طوله (كم شاشة تمرير)|Its length (screens of scrolling)|אורך (מסכי גלילה)")} min={1} max={12} step={0.5} busy={busy} value={p.length ?? 4} onSave={(length) => save(L, { length })} testId="scene-length" /> : null}
      <Range label={say("نعومة اللحاق بالتمرير|How softly it follows the scroll|כמה רך הוא עוקב אחרי הגלילה")} min={0} max={1} step={0.05} busy={busy} value={p.smooth ?? 0.35} onSave={(smooth) => save(L, { smooth })} testId="scene-smooth" />

      <div className="space-y-2 rounded-lg bg-white/[0.03] p-2">
        <div className="text-[11px] font-medium text-white/60">{say("الخلفية مع التمرير|The background with the scroll|הרקע עם הגלילה")}</div>
        {toggle(say("ضبابية (blur)|Blur|טשטוש"), Boolean(p.blur), busy, (on) => effect("blur", on ? { from: 20, to: 60, amount: 10 } : undefined), "scene-blur")}
        {p.blur ? <>
          <Range label={say("قوة الضبابية|Blur amount|עוצמת טשטוש")} min={0} max={40} unit="px" busy={busy} value={p.blur.amount} onSave={(amount) => effect("blur", { ...p.blur!, amount })} />
          <Between from={p.blur.from} to={p.blur.to} busy={busy} onSave={(from, to) => effect("blur", { ...p.blur!, from, to })} testId="scene-blur-range" />
        </> : null}
        {toggle(say("تغميق|Darken|הכהיה"), Boolean(p.dim), busy, (on) => effect("dim", on ? { from: 0, to: 100, opacity: 0.45 } : undefined), "scene-dim")}
        {p.dim ? <>
          <Range label={say("قوة التغميق|How dark|כמה כהה")} min={0} max={0.95} step={0.05} busy={busy} value={p.dim.opacity} onSave={(opacity) => effect("dim", { ...p.dim!, opacity })} />
          <ColourPick label={say("لون التغميق|Darkening colour|צבע ההכהיה")} value={p.dim.color} busy={busy} onPick={(c) => effect("dim", { ...p.dim!, color: c ?? undefined })} />
          <Between from={p.dim.from} to={p.dim.to} busy={busy} onSave={(from, to) => effect("dim", { ...p.dim!, from, to })} testId="scene-dim-range" />
        </> : null}
        {toggle(say("تقريب (zoom)|Zoom|זום"), Boolean(p.zoom), busy, (on) => effect("zoom", on ? { from: 0, to: 100, scale: 1.3 } : undefined), "scene-zoom")}
        {p.zoom ? <>
          <Range label={say("لأي حجم|To what size|לאיזה גודל")} min={0.5} max={3} step={0.05} unit="×" busy={busy} value={p.zoom.scale} onSave={(scale) => effect("zoom", { ...p.zoom!, scale })} />
          <Between from={p.zoom.from} to={p.zoom.to} busy={busy} onSave={(from, to) => effect("zoom", { ...p.zoom!, from, to })} testId="scene-zoom-range" />
        </> : null}
        <Picks label={say("علامة التقدّم|Progress mark|סימן התקדמות")} value={p.progress ?? "none"} busy={busy}
          options={[["none", say("بلا|None|ללא")], ["bar", say("شريط فوق|Top bar|פס עליון")], ["line", say("خط عالجنب|Side line|קו בצד")], ["dots", say("نقاط الفصول|Chapter dots|נקודות פרקים")]]}
          onPick={(progress) => save(L, { progress })} />
      </div>

      <div className="space-y-2 rounded-lg bg-white/[0.03] p-2" data-testid="scene-timeline">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-medium text-white/60">{say("الخط الزمني|Timeline|ציר זמן")}</div>
          <label className="flex items-center gap-1 text-[10px] text-white/45">
            {say("فصول|Chapters|פרקים")}
            <select className="rounded border border-white/[0.1] bg-surface-925 px-1 text-[11px] text-white" value={chapters} disabled={busy} onChange={(e) => save(L, { chapters: Number(e.target.value) })} data-testid="scene-chapters">
              {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <Range label={say("معاينة اللحظة (بتمرّر المعاينة لهون)|Preview moment (scrolls the preview here)|תצוגה מקדימה של הרגע (גוללת לכאן)")} min={0} max={100} unit="%" busy={false} value={at} onLive={seek} onSave={seek} testId="scene-seek" />
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(chapters, 10)}, minmax(0, 1fr))` }}>
          {Array.from({ length: chapters }, (_, i) => {
            const n = inChapter(i).length;
            const [a, b] = chapterRange(chapters, i);
            return (
              <button key={i} type="button" className={`rounded-md border px-0.5 py-1 text-center text-[10px] ${chapter === i ? "border-accent-400/70 bg-accent-500/20 text-white" : "border-white/[0.08] text-white/60 hover:bg-white/[0.06]"}`}
                title={`${a}% – ${b}%`} onClick={() => seek(Math.round((a + b) / 2))} data-chapter={i + 1}>
                {a}%{n ? <span className="block text-accent-300">● {n}</span> : <span className="block text-white/25">·</span>}
              </button>
            );
          })}
        </div>
        {pin ? (
          <div className="space-y-1.5">
            <div className="text-[10px] text-white/45">{say(`إضافة بالفصل ${chapter + 1} (${chapterRange(chapters, chapter).join("–")}%):|Add at chapter ${chapter + 1} (${chapterRange(chapters, chapter).join("–")}%):|הוספה בפרק ${chapter + 1} (${chapterRange(chapters, chapter).join("–")}%):`)}</div>
            <div className="flex flex-wrap gap-1">
              {QUICK.map((k) => <button key={k} type="button" className={btn} disabled={busy} onClick={() => add(k)} data-testid={`scene-add-${k}`}>+ {typeLabel(k)}</button>)}
            </div>
            <p className="text-[10px] leading-4 text-white/35">{say("أي عنصر تاني (صورة، فيديو، موديل 3D…) من لوحة الإضافة جوّا المشهد، وبعدين حدّد لحظته.|Anything else (a picture, a clip, a 3D model…) from the Add panel inside the scene, then set its moment.|כל דבר אחר (תמונה, וידאו, מודל תלת ממד…) מלוח ההוספה בתוך הסצנה, ואז לקבוע את הרגע שלו.")}</p>
          </div>
        ) : (
          <p className="text-[10px] leading-4 text-white/40">{say("بالانسياب الأشياء بتمر فوق الصورة بترتيبها، والصورة بتضل ثابتة لآخر واحد وبعدين بتكمّل.|In flow, things scroll over the picture in order; the picture holds until the last one passes, then moves on.|בזרימה הדברים גוללים מעל התמונה לפי הסדר; התמונה נשארת עד שהאחרון עובר, ואז ממשיכה.")}</p>
        )}
        <ul className="space-y-1" data-testid="scene-objects">
          {kids.map((k) => {
            const c = cueOfNode(k);
            const end = c ? (c.out === "stay" ? 100 : c.to) : 100;
            return (
              <li key={k.id} className="rounded-lg border border-white/[0.06] p-1.5">
                <button type="button" className="flex w-full items-center justify-between gap-2 text-start text-[11px] text-white/75 hover:text-white" onClick={() => { onSelect(k.id); if (c && pin) seek(Math.round((c.from + end) / 2)); }}>
                  <span className="truncate">{k.name || typeLabel(k.type)}</span>
                  <span dir="ltr" className="shrink-0 tabular-nums text-white/40">{c && pin ? `${c.from}–${end}%` : "—"}</span>
                </button>
                {pin ? (
                  <div className="relative mt-1 h-1.5 rounded-full bg-white/[0.06]" aria-hidden="true">
                    {c ? <span className="absolute inset-y-0 rounded-full bg-accent-400/70" style={{ insetInlineStart: `${c.from}%`, width: `${end - c.from}%` }} /> : null}
                    <span className="absolute inset-y-[-3px] w-px bg-white/70" style={{ insetInlineStart: `${at}%` }} />
                  </div>
                ) : null}
                {pin && !c ? (
                  <button type="button" className={`${btn} mt-1`} disabled={busy} onClick={() => onOps(L, [cueOp(k, { from: chapterRange(chapters, chapter)[0], to: chapterRange(chapters, chapter)[1], in: "up", out: "fade" })])}>
                    {say("حطّه بهالفصل|Put it in this chapter|לשים בפרק הזה")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Something inside a scroll scene: from when to when it shows, and how it comes and goes. */
export function CuePanel({ node, scene, busy, onOps, onSeek }: { node: PageTreeNode; scene: PageTreeNode; busy: boolean; onOps: Ops; onSeek: (at: number) => void }) {
  const cue = cueOfNode(node);
  const chapters = ((scene.props as SceneProps).chapters ?? 10);
  const pin = ((scene.props as SceneProps).mode ?? "pin") === "pin";
  const L = say("لحظته بالمشهد|Its moment in the scene|הרגע שלו בסצנה");
  const save = (next: Cue | null) => onOps(L, [cueOp(node, next)]);
  if (!pin) return <div className={box}><p className="text-[11px] text-white/45">{say("المشهد على وضع الانسياب: هالعنصر بيمر فوق الصورة بترتيبه.|The scene is in flow: this element scrolls over the picture in its order.|הסצנה במצב זרימה: הרכיב גולל מעל התמונה לפי הסדר.")}</p></div>;
  return (
    <div className={box} data-testid="studio-cue">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">{L}</div>
        {cue ? <button type="button" className={btn} onClick={() => onSeek(cue.from + 1)}>{say("شوف بدايته|See its start|לראות את ההתחלה")}</button> : null}
      </div>
      {!cue ? (
        <button type="button" className="w-full rounded-lg bg-accent-500/80 px-2 py-1.5 text-[11px] text-white disabled:opacity-40" disabled={busy} onClick={() => save({ from: 0, to: 30, in: "up", out: "fade" })} data-testid="cue-on">
          {say("خليه يطلع بلحظة معيّنة|Show it at a chosen moment|להציג אותו ברגע מסוים")}
        </button>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: chapters }, (_, i) => {
              const [a, b] = chapterRange(chapters, i);
              return <button key={i} type="button" className={chip(cue.from === a && cue.to === b)} disabled={busy} onClick={() => { save({ ...cue, from: a, to: b }); onSeek(a + 1); }}>{i + 1}</button>;
            })}
          </div>
          <Between from={cue.from} to={cue.to} busy={busy} onSave={(from, to) => save({ ...cue, from, to })} testId="cue-range" />
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] text-white/55">{say("كيف بيجي|How it comes|איך הוא נכנס")}
              <select className={sel} value={cue.in ?? "fade"} disabled={busy} onChange={(e) => save({ ...cue, in: e.target.value })} data-testid="cue-in">
                {CUE_KINDS.map(([k, n]) => <option key={k} value={k}>{n()}</option>)}
              </select>
            </label>
            <label className="block text-[11px] text-white/55">{say("كيف بيروح|How it goes|איך הוא יוצא")}
              <select className={sel} value={cue.out ?? "fade"} disabled={busy} onChange={(e) => save({ ...cue, out: e.target.value })} data-testid="cue-out">
                <option value="stay">{say("بيضل للآخر|Stays to the end|נשאר עד הסוף")}</option>
                {CUE_KINDS.map(([k, n]) => <option key={k} value={k}>{n()}</option>)}
              </select>
            </label>
          </div>
          <Range label={say("قديش بياخد المجي والروحة (% من وقته)|How long coming and going take (% of its time)|כמה זמן לוקחים הכניסה והיציאה (% מהזמן שלו)")} min={0} max={50} unit="%" busy={busy} value={cue.soft ?? 20} onSave={(soft) => save({ ...cue, soft })} />
          <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(null)}>{say("بيبين على طول|Always shown|מוצג תמיד")}</button>
        </>
      )}
    </div>
  );
}
