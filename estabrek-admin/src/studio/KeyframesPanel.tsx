/**
 * Keyframes for the selected element (keyframes.ts): when they play, how long, how they ease, how
 * often and from which point they turn; then its pieces as tabs — itself, its layer behind
 * (before), its layer in front (after), its inside (words or picture) — each with a 0–100 %
 * timeline of moments; a moment opens to everything it can change (move, turn, size, stretch,
 * slant, see-through, blur, light, hue, colours, corners, a cut). A layer's own look sits with its
 * tab. Ready animations come first. Also here: what happens to what sticks out (overflow).
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode, TreeScreen } from "../api/pages.api";
import { styleOp } from "./columns";
import { shownLook } from "./look";
import { Range } from "./LookPanels";
import { ColourPick, SCREEN_LABEL } from "./StudioTreePanels";
import { say } from "./say";
import { EaseChoice } from "./EaseChoice";
import {
  addFrame, dropFrame, FIELD_REST, FRAME_FIELDS, keysOf, keysOp, layersOf, layersOp, ORIGIN_NAME, PART_NAME, partsFor, PRESET_GROUPS, presetOps, presetsFor, setFrame, starterKeys, TRIGGER_NAME,
  type KeyFrame, type KeyPart, type Keys, type KeyTrigger, type Layer,
} from "./keyframes";

type Ops = (label: string, ops: PageDraftOp[]) => void;
const box = "space-y-2.5 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const sel = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white";
const EASES: Array<[string, () => string]> = [
  ["smooth", () => say("ناعم|Smooth|חלק")], ["soft", () => say("هادي|Gentle|עדין")], ["strong", () => say("قوي|Strong|חזק")], ["back", () => say("يرجع شوي|Overshoots|חורג וחוזר")],
  ["elastic", () => say("مطاطي|Elastic|אלסטי")], ["bounce", () => say("ينط|Bouncy|קופצני")], ["linear", () => say("ثابت|Steady|אחיד")], ["fall", () => say("بيتسارع|Speeds up|מאיץ")],
];
const L = () => say("حركة بالمفاتيح|Keyframes|קיפריימים");

function Select({ label, value, options, busy, onPick, testId }: { label: string; value: string; options: Array<[string, () => string]>; busy: boolean; onPick: (v: string) => void; testId?: string }) {
  return (
    <label className="block text-[11px] text-white/55">{label}
      <select className={sel} value={value} disabled={busy} onChange={(e) => onPick(e.target.value)} data-testid={testId}>
        {options.map(([k, n]) => <option key={k} value={k}>{n()}</option>)}
      </select>
    </label>
  );
}

/** A layer's own look: colour or gradient, where it sits, its corners, see-through, mixing, blur, frame, in front or behind. */
function LayerLook({ part, layer, busy, onSave }: { part: "before" | "after"; layer: Layer | undefined; busy: boolean; onSave: (l: Layer | null) => void }) {
  const l = layer ?? {};
  const set = (patch: Partial<Layer>) => {
    const next: Record<string, unknown> = { ...l, ...patch };
    for (const [k, v] of Object.entries(next)) if (v === undefined) delete next[k];
    onSave(Object.keys(next).length ? (next as Layer) : null);
  };
  const inset = l.inset ?? [0, 0, 0, 0];
  const at = l.at ?? "fill";
  return (
    <div className="space-y-2 rounded-lg bg-white/[0.03] p-2" data-testid={`layer-${part}`}>
      <div className="text-[11px] font-medium text-white/60">{say("شكل الطبقة|The layer's look|מראה השכבה")}</div>
      <ColourPick label={say("لونها|Its colour|הצבע שלה")} value={l.bg} busy={busy} onPick={(c) => set({ bg: c ?? undefined })} testId={`layer-${part}-bg`} />
      <ColourPick label={say("لون تاني (تدرّج)|Second colour (gradient)|צבע שני (מעבר)")} value={l.to} busy={busy} onPick={(c) => set({ to: c ?? undefined })} />
      {l.to ? <Range label={say("زاوية التدرّج|Gradient angle|זווית המעבר")} min={0} max={360} unit="°" busy={busy} value={l.angle ?? 90} onSave={(angle) => set({ angle })} /> : null}
      <Select label={say("وين بتقعد|Where it sits|איפה היא יושבת")} value={at} busy={busy} onPick={(v) => set({ at: v as Layer["at"] })}
        options={[["fill", () => say("فوق كل العنصر|Over all of it|על כולו")], ["bottom", () => say("شريط تحت|A band at the bottom|פס למטה")], ["top", () => say("شريط فوق|A band at the top|פס למעלה")], ["start", () => say("شريط بالبداية|A band at the start|פס בהתחלה")], ["end", () => say("شريط بالنهاية|A band at the end|פס בסוף")], ["center", () => say("صندوق بالنص|A box in the middle|קופסה באמצע")]]} />
      {at === "top" || at === "bottom" || at === "center" ? <Range label={say("الطول|Height|גובה")} min={0} max={800} unit="px" busy={busy} value={l.h ?? 4} onSave={(h) => set({ h })} /> : null}
      {at === "start" || at === "end" || at === "center" ? <Range label={say("العرض|Width|רוחב")} min={0} max={1200} unit="px" busy={busy} value={l.w ?? 40} onSave={(w) => set({ w })} /> : null}
      <div className="grid grid-cols-2 gap-x-2">
        {([0, 1, 2, 3] as const).map((i) => (
          <Range key={i} label={[say("بُعد فوق|Inset top|היסט למעלה"), say("بُعد النهاية|Inset end|היסט בסוף"), say("بُعد تحت|Inset bottom|היסט למטה"), say("بُعد البداية|Inset start|היסט בהתחלה")][i]} min={-100} max={100} unit="px" busy={busy} value={inset[i]}
            onSave={(v) => { const next = [...inset] as Layer["inset"] & number[]; next[i] = v; set({ inset: next as [number, number, number, number] }); }} />
        ))}
      </div>
      <Range label={say("الزوايا|Corners|פינות")} min={0} max={999} unit="px" busy={busy} value={l.radius ?? 0} onSave={(radius) => set({ radius })} />
      <Range label={say("الوضوح|Opacity|אטימות")} min={0} max={1} step={0.05} busy={busy} value={l.opacity ?? 1} onSave={(opacity) => set({ opacity })} />
      <Range label={say("ضبابية|Blur|טשטוש")} min={0} max={60} unit="px" busy={busy} value={l.blur ?? 0} onSave={(blur) => set({ blur: blur || undefined })} />
      <Select label={say("الدمج مع اللي تحتها|Blending|מיזוג")} value={l.blend ?? "normal"} busy={busy} onPick={(blend) => set({ blend: blend === "normal" ? undefined : blend })}
        options={[["normal", () => say("عادي|Normal|רגיל")], ["multiply", () => "Multiply"], ["screen", () => "Screen"], ["overlay", () => "Overlay"], ["soft-light", () => "Soft light"], ["color", () => "Color"], ["luminosity", () => "Luminosity"]]} />
      <Range label={say("سماكة الإطار|Frame width|עובי מסגרת")} min={0} max={12} unit="px" busy={busy} value={l.border?.width ?? 0} onSave={(width) => set({ border: width ? { width, color: l.border?.color ?? "accent" } : undefined })} />
      {l.border ? <ColourPick label={say("لون الإطار|Frame colour|צבע מסגרת")} value={l.border.color} busy={busy} onPick={(c) => c && set({ border: { ...l.border!, color: c } })} /> : null}
      <label className="flex items-center justify-between gap-2 text-[11px] text-white/70">
        <span>{say("قدّام الكلام (مش ورا)|In front of the content (not behind)|לפני התוכן (לא מאחור)")}</span>
        <input type="checkbox" checked={l.front === true} disabled={busy} onChange={(e) => set({ front: e.target.checked || undefined })} />
      </label>
      <button type="button" className={`${btn} text-red-300`} disabled={busy || !layer} onClick={() => onSave(null)}>{say("شيل الطبقة|Remove the layer|הסרת השכבה")}</button>
    </div>
  );
}

/** One moment: its time, how it gets here, and each thing it changes (a tick turns it on). */
function FrameEditor({ frame, busy, onSave, onDrop, canDrop }: { frame: KeyFrame; busy: boolean; onSave: (patch: Partial<KeyFrame>) => void; onDrop: () => void; canDrop: boolean }) {
  return (
    <div className="space-y-1.5 rounded-lg bg-white/[0.03] p-2" data-testid="key-frame">
      <div className="grid grid-cols-2 gap-2">
        <Range label={say("الوقت|Time|זמן")} min={0} max={100} unit="%" busy={busy} value={frame.at} onSave={(at) => onSave({ at })} testId="key-frame-at" />
        <EaseChoice label={say("الوصول لهون|Getting here|ההגעה לכאן")} value={frame.ease} none={say("حسب الكل|As the whole|כמו הכלל")} names={EASES.map(([k, name]): [string, string] => [k, name()])} busy={busy} onPick={(ease) => onSave({ ease })} testId="key-frame-ease" />
      </div>
      {FRAME_FIELDS.map(([k, name, min, max, step, unit]) => {
        const v = frame[k] as number | undefined;
        return (
          <div key={k} className="flex items-start gap-2">
            <input type="checkbox" className="mt-1" checked={v !== undefined} disabled={busy} aria-label={name()} onChange={(e) => onSave({ [k]: e.target.checked ? (FIELD_REST[k] ?? 0) : undefined })} data-testid={`key-field-${k}`} />
            {v !== undefined ? <div className="flex-1"><Range label={name()} min={min} max={max} step={step} unit={unit} busy={busy} value={v} onSave={(n) => onSave({ [k]: n })} /></div> : <span className="text-[11px] text-white/40">{name()}</span>}
          </div>
        );
      })}
      <ColourPick label={say("لون الكلام|Text colour|צבע טקסט")} value={frame.color} busy={busy} onPick={(c) => onSave({ color: c ?? undefined })} />
      <ColourPick label={say("لون الخلفية|Background colour|צבע רקע")} value={frame.bg} busy={busy} onPick={(c) => onSave({ bg: c ?? undefined })} />
      <div className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={Boolean(frame.clip)} disabled={busy} onChange={(e) => onSave({ clip: e.target.checked ? [0, 0, 0, 0] : undefined })} aria-label={say("قص|Cut|חיתוך")} />
        {frame.clip ? (
          <div className="grid flex-1 grid-cols-2 gap-x-2">
            {([0, 1, 2, 3] as const).map((i) => (
              <Range key={i} label={[say("قص فوق|Cut top|חיתוך למעלה"), say("قص النهاية|Cut end|חיתוך בסוף"), say("قص تحت|Cut bottom|חיתוך למטה"), say("قص البداية|Cut start|חיתוך בהתחלה")][i]} min={0} max={100} unit="%" busy={busy} value={frame.clip![i]}
                onSave={(n) => { const c = [...frame.clip!] as [number, number, number, number]; c[i] = n; onSave({ clip: c }); }} />
            ))}
          </div>
        ) : <span className="text-[11px] text-white/40">{say("قص (يكشف أو يخبّي)|Cut (reveals or hides)|חיתוך (חושף או מסתיר)")}</span>}
      </div>
      <button type="button" className={`${btn} text-red-300`} disabled={busy || !canDrop} onClick={onDrop}>{say("شيل هاللحظة|Remove this moment|הסרת הרגע")}</button>
    </div>
  );
}

export function KeyframesPanel({ node, busy, onOps, onPlay }: { node: PageTreeNode; busy: boolean; onOps: Ops; onPlay: () => void }) {
  const keys = keysOf(node);
  const layers = layersOf(node);
  const parts = partsFor(node.type);
  const [part, setPart] = useState<KeyPart>("self");
  const [frameAt, setFrameAt] = useState(0);
  const [showPresets, setShowPresets] = useState(!keys);
  const save = (next: Keys | null) => onOps(L(), [keysOp(node, next)]);
  const shown = parts.includes(part) ? part : "self";
  const frames = keys?.parts[shown] ?? [];
  const i = Math.min(frameAt, Math.max(0, frames.length - 1));
  const setFrames = (list: KeyFrame[] | null) => {
    const base = keys ?? starterKeys();
    const nextParts = { ...base.parts };
    if (list && list.length >= 2) nextParts[shown] = list;
    else delete nextParts[shown];
    save(Object.keys(nextParts).length ? { ...base, parts: nextParts } : null);
  };
  const set = (patch: Partial<Keys>) => keys && save({ ...keys, ...patch });
  const presets = presetsFor(node.type);
  return (
    <div className={box} data-testid="studio-keyframes">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">{say("حركة بالمفاتيح 0% ← 100%|Keyframes 0% → 100%|קיפריימים 0% ← 100%")}</div>
        <div className="flex gap-1">
          {keys ? <button type="button" className={btn} onClick={onPlay} data-testid="keys-play">▶ {say("جرّب|Try|נסה")}</button> : null}
          <button type="button" className={btn} onClick={() => setShowPresets((v) => !v)} data-testid="keys-presets-toggle">{say("جاهزة|Ready|מוכנים")}</button>
        </div>
      </div>

      {showPresets ? (
        <div className="space-y-2" data-testid="keys-presets">
          {PRESET_GROUPS.map(([group, title]) => {
            const list = presets.filter((p) => p.group === group);
            if (!list.length) return null;
            return (
              <div key={group}>
                <div className="mb-1 text-[10px] font-medium text-white/50">{title()}</div>
                <div className="grid grid-cols-2 gap-1">
                  {list.map((p) => (
                    <button key={p.key} type="button" disabled={busy} className="truncate rounded-lg border border-white/[0.08] px-2 py-1.5 text-start text-[11px] text-white/75 hover:bg-white/[0.05] disabled:opacity-40" title={p.name()} data-key-preset={p.key}
                      onClick={() => { onOps(`${L()}: ${p.name()}`, presetOps(node, p)); setPart((Object.keys(p.keys.parts)[0] as KeyPart) ?? "self"); setFrameAt(0); setShowPresets(false); onPlay(); }}>
                      {p.name()}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {!keys ? (
        <button type="button" className="w-full rounded-lg bg-accent-500/80 px-2 py-1.5 text-[11px] text-white disabled:opacity-40" disabled={busy} onClick={() => save(starterKeys())} data-testid="keys-start">
          {say("ابدأ من الصفر (لحظتين: 0% و 100%)|Start from scratch (two moments: 0% and 100%)|להתחיל מאפס (שני רגעים: 0% ו־100%)")}
        </button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Select label={say("إمتى بتشتغل|When it plays|מתי הוא מתנגן")} value={keys.on} busy={busy} onPick={(on) => set({ on: on as KeyTrigger })} options={Object.entries(TRIGGER_NAME) as Array<[string, () => string]>} testId="keys-on" />
            <EaseChoice label={say("السلاسة|Easing|האטה")} value={keys.ease ?? "smooth"} names={EASES.map(([k, name]): [string, string] => [k, name()])} busy={busy} onPick={(ease) => set({ ease })} testId="keys-ease" />
          </div>
          {keys.on !== "scroll" && keys.on !== "scene" ? (
            <div className="grid grid-cols-2 gap-x-2">
              <Range label={say("المدة|Duration|משך")} min={0.1} max={20} step={0.1} unit="s" busy={busy} value={keys.duration ?? 1} onSave={(duration) => set({ duration })} testId="keys-duration" />
              <Range label={say("تأخير|Delay|השהיה")} min={0} max={10} step={0.1} unit="s" busy={busy} value={keys.delay ?? 0} onSave={(delay) => set({ delay: delay || undefined })} />
              <Range label={say("كم مرة يعيد (-1 للأبد)|Repeats (-1 = forever)|חזרות (-1 = לנצח)")} min={-1} max={20} busy={busy} value={keys.repeat ?? (keys.on === "loop" ? -1 : 0)} onSave={(repeat) => set({ repeat })} />
              <label className="flex items-center gap-2 pt-4 text-[11px] text-white/70"><input type="checkbox" checked={keys.yoyo === true} disabled={busy} onChange={(e) => set({ yoyo: e.target.checked || undefined })} />{say("رايح جاي (yoyo)|Back and forth (yoyo)|הלוך ושוב (yoyo)")}</label>
            </div>
          ) : null}
          {keys.on === "scroll" ? (
            <div className="grid grid-cols-3 gap-x-2">
              <Range label={say("يبلّش لما فوقه عند|Starts when its top is at|מתחיל כשהחלק העליון ב־")} min={0} max={100} unit="%" busy={busy} value={keys.start ?? 90} onSave={(start) => set({ start })} />
              <Range label={say("يخلص عند|Ends at|מסתיים ב־")} min={0} max={100} unit="%" busy={busy} value={keys.end ?? 30} onSave={(end) => set({ end })} />
              <Range label={say("لحاق ناعم|Soft catch-up|השגה רכה")} min={0} max={3} step={0.1} unit="s" busy={busy} value={keys.scrub ?? 0.6} onSave={(scrub) => set({ scrub })} />
            </div>
          ) : null}
          {keys.on === "scene" ? <p className="text-[10px] text-white/40">{say("بيمشي مع لحظة مشهد التمرير اللي هو فيه (أو لحظته هو إذا إلها وقت).|It follows the scroll scene it's in (or its own moment there, if it has one).|הוא עוקב אחרי סצנת הגלילה שהוא בה (או הרגע שלו שם, אם יש).")}</p> : null}
          <Select label={say("بيلف ويكبر من|Turns and grows from|מסתובב וגדל מ־")} value={keys.origin ?? "center"} busy={busy} onPick={(origin) => set({ origin: origin === "center" ? undefined : origin })} options={ORIGIN_NAME} />

          <div className="flex flex-wrap gap-1" role="tablist" aria-label={say("القطع|Pieces|חלקים")}>
            {parts.map((pt) => (
              <button key={pt} type="button" role="tab" aria-selected={shown === pt} onClick={() => { setPart(pt); setFrameAt(0); }} data-part={pt}
                className={`rounded-lg border px-2 py-1 text-[11px] ${shown === pt ? "border-accent-400/70 bg-accent-500/15 text-white" : "border-white/[0.08] text-white/60 hover:bg-white/[0.05]"}`}>
                {PART_NAME[pt]()}{keys.parts[pt] ? " ●" : ""}
              </button>
            ))}
          </div>

          {frames.length >= 2 ? (
            <>
              <div className="relative h-8 rounded-lg bg-white/[0.05]" data-testid="key-timeline"
                onDoubleClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const rtl = getComputedStyle(e.currentTarget).direction === "rtl"; const at = ((rtl ? r.right - e.clientX : e.clientX - r.left) / r.width) * 100; setFrames(addFrame(frames, at)); }}>
                {[0, 25, 50, 75, 100].map((t) => <span key={t} className="absolute top-0 h-full w-px bg-white/10" style={{ insetInlineStart: `${t}%` }} />)}
                {frames.map((f, j) => (
                  <button key={`${f.at}-${j}`} type="button" title={`${f.at}%`} onClick={() => setFrameAt(j)} data-frame={f.at}
                    className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 rounded-[3px] border ${j === i ? "border-white bg-accent-400" : "border-white/60 bg-white/30"}`} style={{ insetInlineStart: `calc(${f.at}% - 8px)` }} />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-white/45">
                <span>{say("دبل كليك عالخط بيضيف لحظة، أو:|Double-click the line to add a moment, or:|לחיצה כפולה על הקו מוסיפה רגע, או:")}</span>
                {[25, 50, 75].map((t) => <button key={t} type="button" className={btn} disabled={busy || frames.some((f) => f.at === t)} onClick={() => { setFrames(addFrame(frames, t)); }}>+ {t}%</button>)}
              </div>
              <FrameEditor frame={frames[i]} busy={busy} canDrop={frames.length > 2} onSave={(patch) => setFrames(setFrame(frames, i, patch))} onDrop={() => { setFrames(dropFrame(frames, i)); setFrameAt(Math.max(0, i - 1)); }} />
              {shown !== "self" || Object.keys(keys.parts).length > 1 ? (
                <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => setFrames(null)}>{say("شيل حركة هالقطعة|Remove this piece's motion|הסרת התנועה של החלק הזה")}</button>
              ) : null}
            </>
          ) : (
            <button type="button" className={btn} disabled={busy} onClick={() => setFrames([{ at: 0 }, { at: 100, ...(shown === "self" ? { y: -8 } : { opacity: 1 }) }])} data-testid="key-part-start">
              + {say("حركة لهالقطعة|Motion for this piece|תנועה לחלק הזה")}
            </button>
          )}

          {shown === "before" || shown === "after" ? (
            <LayerLook part={shown} layer={layers?.[shown]} busy={busy} onSave={(l) => onOps(say("طبقة العنصر|The element's layer|שכבת הרכיב"), [layersOp(node, { ...(layers ?? {}), [shown]: l ?? undefined })])} />
          ) : null}
          {shown === "inner" && (node.type === "image" || node.type === "video") ? <p className="text-[10px] text-white/40">{say("الصورة بتتحرك جوّا إطارها: خلّي الإطار يقص (overflow) لتبين الحركة جوّاه بس.|The picture moves inside its frame: let the frame cut (overflow) so the motion stays inside.|התמונה זזה בתוך המסגרת: יש לחתוך (overflow) כדי שהתנועה תישאר בפנים.")}</p> : null}

          <button type="button" className={`${btn} text-red-300`} disabled={busy} onClick={() => save(null)} data-testid="keys-remove">{say("شيل كل الحركة بالمفاتيح|Remove all keyframes|הסרת כל הקיפריימים")}</button>
        </>
      )}
    </div>
  );
}

/** What happens to what sticks out of it, on this screen: shown, cut, cut but sticky-friendly, or scrolled. */
export function OverflowPanel({ node, screen, busy, onOps }: { node: PageTreeNode; screen: TreeScreen; busy: boolean; onOps: Ops }) {
  const KINDS: Array<[string, () => string]> = [
    ["", () => say("حسب الأصل|As it is|כמו שהוא")], ["visible", () => say("يبين (visible)|Shown (visible)|מוצג (visible)")], ["hidden", () => say("ينقص (hidden)|Cut (hidden)|חתוך (hidden)")],
    ["clip", () => say("ينقص والتثبيت بيضل شغّال (clip)|Cut, sticky still works (clip)|חתוך, sticky עדיין עובד (clip)")], ["auto", () => say("سكرول لما يلزم (auto)|Scroll when needed (auto)|גלילה כשצריך (auto)")], ["scroll", () => say("سكرول دايماً (scroll)|Always scroll (scroll)|גלילה תמיד (scroll)")],
  ];
  const save = (key: "overflow" | "overflowX" | "overflowY", v: string) => onOps(say("اللي بيطلع برّا (overflow)|What sticks out (overflow)|מה שבולט החוצה (overflow)"), [styleOp(node, screen, { [key]: v || null })]);
  const now = (k: string) => String(shownLook(node, screen, k) ?? "");
  return (
    <div className={box} data-testid="studio-overflow">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/70">{say("اللي بيطلع برّا العنصر (overflow)|What sticks out (overflow)|מה שבולט החוצה (overflow)")}</div>
        <span className="text-[10px] text-white/40">{SCREEN_LABEL[screen]()}</span>
      </div>
      <Select label={say("بالاتجاهين|Both ways|בשני הכיוונים")} value={now("overflow")} busy={busy} onPick={(v) => save("overflow", v)} options={KINDS} testId="overflow-both" />
      <div className="grid grid-cols-2 gap-2">
        <Select label={say("بالعرض|Across (x)|לרוחב (x)")} value={now("overflowX")} busy={busy} onPick={(v) => save("overflowX", v)} options={KINDS} testId="overflow-x" />
        <Select label={say("بالطول|Down (y)|לאורך (y)")} value={now("overflowY")} busy={busy} onPick={(v) => save("overflowY", v)} options={KINDS} testId="overflow-y" />
      </div>
    </div>
  );
}
